import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { LoggerAdapter } from "./adapters/logger-adapter.ts";
import {
  StorageQuotaExceededError,
  type StorageAdapter,
} from "./adapters/storage-adapter.ts";
import { Buffer } from "./buffer.ts";
import { Mutex } from "./mutex.ts";
import type { Event } from "./types.ts";
import { calculateBackoff, delay, DelayAbortedError } from "./utils.ts";

/**
 * Configuration for the Dispatcher.
 */
export type DispatcherConfig = {
  /**
   * API key for authentication
   */
  apiKey: string;
  /**
   * Header name for API key
   */
  apiKeyHeader: string;
  /**
   * API endpoint URL
   */
  endpoint: string;
  /**
   * Interval in milliseconds between automatic flushes
   */
  flushInterval: number;
  /**
   * Maximum number of events before auto-flush
   */
  maxBatchSize: number;
  /**
   * Maximum retry attempts for failed requests
   */
  maxRetries: number;
  /**
   * Logger for internal logging
   */
  loggerAdapter: LoggerAdapter;
  /**
   * Maximum size of the in-memory event buffer (optional).
   * When limit is exceeded, oldest events are evicted using FIFO policy.
   */
  maxBufferSize: number;
};

/**
 * Manages event queuing, batching, flushing, and retry logic.
 * Automatically flushes events based on batch size or time interval.
 * Implements exponential backoff with jitter for retries.
 *
 * @template TMetadata The type of metadata attached to events
 */
export class Dispatcher<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  #buffer = new Buffer<Event<TMetadata>>();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #flushMutex = new Mutex();
  #disposed = false;
  #retryAbortController = new AbortController();

  readonly #config: DispatcherConfig;
  readonly #httpAdapter: HttpAdapter;
  readonly #storageAdapter: StorageAdapter;
  readonly #logger: LoggerAdapter;

  /**
   * Create a new Dispatcher instance.
   *
   * @param config Dispatcher configuration
   * @param httpAdapter HTTP adapter for sending events
   * @param storageAdapter Storage adapter for persisting events
   */
  constructor(
    config: DispatcherConfig,
    httpAdapter: HttpAdapter,
    storageAdapter: StorageAdapter,
  ) {
    // Validate configuration
    if (config.maxBufferSize < config.maxBatchSize) {
      throw new Error(
        `Invalid configuration: maxBufferSize (${config.maxBufferSize}) must be >= maxBatchSize (${config.maxBatchSize}). ` +
          `The batch size will never be reached and events will be dropped unnecessarily.`,
      );
    }

    this.#config = config;
    this.#httpAdapter = httpAdapter;
    this.#storageAdapter = storageAdapter;
    this.#logger = config.loggerAdapter;
  }

  /**
   * Add an event to the buffer.
   * Triggers auto-flush if batch size threshold is reached.
   *
   * @param event The event to enqueue
   */
  public async enqueue(event: Event<TMetadata>): Promise<void> {
    if (this.#disposed) {
      this.#logger.warn("Cannot enqueue event: Dispatcher has been disposed");

      return Promise.resolve();
    }

    this.#buffer.enqueue(event);

    try {
      const eventsToSave = this.#applyBufferLimit(this.#buffer.toArray());

      await this.#storageAdapter.save(eventsToSave);
    } catch (err) {
      if (err instanceof StorageQuotaExceededError) {
        this.#logger.warn(err.message);
      } else {
        this.#logger.error("Failed to persist events to storage", {
          error: err instanceof Error ? err.message : String(err),
          queueSize: this.#buffer.size(),
        });
      }
    }

    if (this.#buffer.size() >= this.#config.maxBatchSize) {
      await this.flush();
    } else {
      this.#scheduleFlush();
    }
  }

  /**
   * Immediately flush all queued events.
   * Cancels any scheduled flush.
   * Uses mutex to prevent concurrent flush operations.
   * Events are sent in batches according to `maxBatchSize` (dynamic rebatching).
   */
  public async flush(): Promise<void> {
    await this.#flushMutex.runAtomic(async () => {
      if (this.#timer) {
        clearTimeout(this.#timer);
        this.#timer = null;
      }

      if (this.#buffer.isEmpty()) return;

      const allEvents = this.#buffer.toArray();

      this.#buffer.clear();

      for (let i = 0; i < allEvents.length; i += this.#config.maxBatchSize) {
        const batch = allEvents.slice(i, i + this.#config.maxBatchSize);

        await this.#sendWithRetry(batch);
      }
    });
  }

  /**
   * Apply persisted buffer limit using FIFO eviction.
   *
   * Note: With the validation requiring maxBufferSize >= maxBatchSize,
   * this limit is primarily enforced during restore() when loading
   * persisted events that may exceed the buffer limit.
   *
   * @param events Events to apply limit to
   * @returns Events after applying limit
   */
  #applyBufferLimit(events: Event<TMetadata>[]): Event<TMetadata>[] {
    if (events.length > this.#config.maxBufferSize) {
      return events.slice(-this.#config.maxBufferSize);
    }

    return events;
  }

  /**
   * Send events with exponential backoff retry logic.
   *
   * @param events Events to send
   * @param attempt Current retry attempt number
   */
  async #sendWithRetry(
    events: Event<TMetadata>[],
    attempt: number = 0,
  ): Promise<void> {
    try {
      const response = await this.#httpAdapter.send({
        events,
        endpoint: this.#config.endpoint,
        headers: {
          [this.#config.apiKeyHeader]: this.#config.apiKey,
          "Content-Type": "application/json",
        },
        apiKeyHeader: this.#config.apiKeyHeader,
      });

      await this.#handleResponse(response, events, attempt);
    } catch (err) {
      await this.#handleNetworkError(err, events, attempt);
    }
  }

  /**
   * Handle HTTP response based on status code.
   *
   * @param response HTTP response
   * @param events Events that were sent
   * @param attempt Current retry attempt
   */
  async #handleResponse(
    response: { status: number },
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<void> {
    if (response.status >= 200 && response.status < 300) {
      await this.#clearStorage("Failed to clear storage after successful send");
    } else if (response.status >= 400 && response.status < 500) {
      this.#logger.warn("4xx client error, dropping events", {
        status: response.status,
        eventsCount: events.length,
      });

      await this.#clearStorage("Failed to clear storage after 4xx error");
    } else if (response.status >= 500) {
      await this.#handleServerError(response.status, events, attempt);
    } else {
      // 1xx, 3xx: Unexpected status codes, treat as client error and drop
      this.#logger.warn("Unexpected status code, dropping events", {
        status: response.status,
        eventsCount: events.length,
      });

      await this.#clearStorage(
        "Failed to clear storage after unexpected status",
      );
    }
  }

  /**
   * Handle 5xx server errors with retry logic.
   *
   * @param status HTTP status code
   * @param events Events to retry
   * @param attempt Current retry attempt
   */
  async #handleServerError(
    status: number,
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<void> {
    if (attempt < this.#config.maxRetries) {
      this.#logger.warn("5xx server error, retrying", {
        status,
        attempt: attempt + 1,
        maxRetries: this.#config.maxRetries,
      });

      try {
        await delay(
          calculateBackoff(attempt),
          this.#retryAbortController.signal,
        );
        await this.#sendWithRetry(events, attempt + 1);
      } catch (err) {
        /* v8 ignore next -- @preserve */
        if (err instanceof DelayAbortedError) return;

        /* v8 ignore next -- @preserve */
        throw err;
      }
    } else {
      this.#logger.error("5xx server error, max retries reached", {
        status,
        maxRetries: this.#config.maxRetries,
        eventsCount: events.length,
      });

      await this.#requeueEvents(
        events,
        "Failed to persist events after max retries",
      );
    }
  }

  /**
   * Handle network errors with retry logic.
   *
   * @param err Error that occurred
   * @param events Events to retry
   * @param attempt Current retry attempt
   */
  async #handleNetworkError(
    err: unknown,
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<void> {
    /* v8 ignore next -- @preserve */
    if (err instanceof DelayAbortedError) return;

    this.#logger.error("Network error occurred", { err });

    if (attempt < this.#config.maxRetries) {
      this.#logger.warn("Network error, retrying", {
        attempt: attempt + 1,
        maxRetries: this.#config.maxRetries,
        error: err instanceof Error ? err.message : String(err),
      });

      try {
        await delay(
          calculateBackoff(attempt),
          this.#retryAbortController.signal,
        );
        await this.#sendWithRetry(events, attempt + 1);
      } catch (delayErr) {
        /* v8 ignore next -- @preserve */
        if (delayErr instanceof DelayAbortedError) return;

        /* v8 ignore next -- @preserve */
        throw delayErr;
      }
    } else {
      this.#logger.error("Network error, max retries reached", {
        maxRetries: this.#config.maxRetries,
        eventsCount: events.length,
        /* v8 ignore next -- @preserve */
        error: err instanceof Error ? err.message : String(err),
      });

      await this.#requeueEvents(
        events,
        "Failed to persist events after network error",
      );
    }
  }

  /**
   * Clear storage and log errors if clearing fails.
   *
   * @param errorMessage Error message to log on failure
   */
  async #clearStorage(errorMessage: string): Promise<void> {
    try {
      await this.#storageAdapter.clear();
    } catch (err) {
      this.#logger.error(errorMessage, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Re-queue events and persist to storage.
   *
   * @param events Events to re-queue
   * @param errorMessage Error message to log if save fails
   */
  async #requeueEvents(
    events: Event<TMetadata>[],
    errorMessage: string,
  ): Promise<void> {
    const currentBuffer = this.#buffer.toArray();

    this.#buffer.fromArray([...events, ...currentBuffer]);

    try {
      const eventsToSave = this.#applyBufferLimit(this.#buffer.toArray());

      await this.#storageAdapter.save(eventsToSave);
    } catch (err) {
      if (err instanceof StorageQuotaExceededError) {
        this.#logger.warn(err.message);
      } else {
        this.#logger.error(errorMessage, {
          /* v8 ignore next -- @preserve */
          error: err instanceof Error ? err.message : String(err),
          eventsCount: this.#buffer.size(),
        });
      }
    }
  }

  /**
   * Schedule an automatic flush after the configured interval.
   * Does nothing if a flush is already scheduled.
   */
  #scheduleFlush(): void {
    if (this.#disposed || this.#timer) return;

    this.#timer = setTimeout(() => {
      void this.flush();
    }, this.#config.flushInterval);
  }

  /**
   * Reset internal state for reinitialization after disposal.
   */
  #reset(): void {
    this.#disposed = false;
    this.#flushMutex.reset();
    this.#retryAbortController = new AbortController();
  }

  /**
   * Restore persisted events from storage.
   * Called during initialization to recover unsent events.
   */
  public async restore(): Promise<void> {
    this.#reset();

    try {
      const stored = await this.#storageAdapter.load();
      const limited = this.#applyBufferLimit(stored as Event<TMetadata>[]);

      this.#buffer.fromArray(limited);

      if (this.#buffer.size() > 0) {
        this.#scheduleFlush();
      }
    } catch (err) {
      this.#logger.error("Failed to restore events from storage", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Clean up resources, cancel scheduled flushes, and clear all references for memory cleanup.
   * Should be called when disposing the client.
   */
  public dispose(): void {
    this.#disposed = true;
    this.#retryAbortController.abort();

    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }

    this.#buffer.clear();
    this.#flushMutex.release();
    void this.#storageAdapter.close();
  }
}
