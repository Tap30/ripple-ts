import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { LoggerAdapter } from "./adapters/logger-adapter.ts";
import {
  StorageQuotaExceededError,
  type StorageAdapter,
} from "./adapters/storage-adapter.ts";
import { Buffer } from "./buffer.ts";
import { Mutex } from "./mutex.ts";
import type { TelemetryHooks } from "./telemetry.ts";
import type { Event } from "./types.ts";
import { calculateBackoff, delay, DelayAbortedError } from "./utils.ts";

/**
 * Batching configuration.
 */
export type BatchOptions = {
  /**
   * Interval in milliseconds between automatic flushes (default: `10000`).
   */
  interval?: number;
  /**
   * Maximum number of events per batch before auto-flush (default: `10`).
   */
  size?: number;
  /**
   * Maximum total serialized payload size in bytes per batch before auto-flush (default: `65536` — 64 KB).
   */
  maxPayloadSize?: number;
};

/**
 * Retry configuration.
 */
export type RetryOptions = {
  /**
   * Maximum number of retry attempts per request (default: `3`).
   */
  maxAttempts?: number;
  /**
   * Minimum delay in milliseconds before the first retry (default: `1000`).
   */
  minDelay?: number;
  /**
   * Maximum delay in milliseconds between retries (default: `360000`).
   */
  maxDelay?: number;
  /**
   * Multiplicative factor applied to the delay on each retry (default: `2`).
   */
  backoffFactor?: number;
};

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
   * Batching options
   */
  batchOptions: Required<BatchOptions>;
  /**
   * Retry options
   */
  retryOptions: Required<RetryOptions>;
  /**
   * Logger for internal logging
   */
  logger: LoggerAdapter;
  /**
   * Maximum size of the in-memory event buffer (optional).
   * When limit is exceeded, oldest events are evicted using FIFO policy.
   */
  maxBufferSize: number;
  /**
   * Per-event time-to-live in milliseconds.
   * Events older than this are filtered out at flush time.
   * `null` means no expiry.
   */
  eventTTL: number | null;
  /**
   * Telemetry hooks for monitoring.
   */
  hooks: TelemetryHooks;
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
  #flushMutex = new Mutex();
  #retryAbortController = new AbortController();

  #timer: ReturnType<typeof setTimeout> | null = null;

  #disposed = false;

  readonly #config: DispatcherConfig;
  readonly #httpClient: HttpAdapter;
  readonly #storage: StorageAdapter;
  readonly #logger: LoggerAdapter;

  /**
   * Create a new Dispatcher instance.
   *
   * @param config Dispatcher configuration
   * @param httpClient HTTP adapter for sending events
   * @param storage Storage adapter for persisting events
   */
  constructor(
    config: DispatcherConfig,
    httpClient: HttpAdapter,
    storage: StorageAdapter,
  ) {
    // Validate configuration
    if (config.maxBufferSize < config.batchOptions.size) {
      throw new Error(
        `Invalid configuration: maxBufferSize (${config.maxBufferSize}) must be >= batchOptions.size (${config.batchOptions.size}). ` +
          `The batch size will never be reached and events will be dropped unnecessarily.`,
      );
    }

    this.#config = config;
    this.#httpClient = httpClient;
    this.#storage = storage;
    this.#logger = config.logger;
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
    this.#config.hooks.onEnqueue?.({ bufferSize: this.#buffer.size() });

    try {
      const eventsToSave = this.#applyBufferLimit(this.#buffer.toArray());

      await this.#storage.save(eventsToSave);
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

    if (this.#buffer.size() >= this.#config.batchOptions.size) {
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

      const events = this.#filterExpired(allEvents);
      const droppedCount = allEvents.length - events.length;

      if (droppedCount > 0) {
        this.#config.hooks.onDrop?.({
          eventCount: droppedCount,
          reason: "expired",
        });
      }

      if (events.length === 0) return;

      const batches = this.#createBatches(events);

      this.#config.hooks.onFlush?.({
        eventCount: events.length,
        batchCount: batches.length,
      });

      for (let i = 0; i < batches.length; i++) {
        const success = await this.#sendWithRetry(batches[i]!);

        if (!success) {
          const remaining = batches.slice(i).flat();

          await this.#requeueEvents(
            remaining,
            "Failed to persist remaining events after send failure",
          );

          return;
        }
      }
    });
  }

  /**
   * Apply persisted buffer limit using FIFO eviction.
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
   * Split events into batches respecting both count and payload size limits.
   *
   * @param events Events to batch
   * @returns Array of event batches
   */
  #createBatches(events: Event<TMetadata>[]): Event<TMetadata>[][] {
    const { size, maxPayloadSize } = this.#config.batchOptions;
    const batches: Event<TMetadata>[][] = [];

    let currentBatch: Event<TMetadata>[] = [];
    let currentSize = 0;

    for (const event of events) {
      const eventSize = JSON.stringify(event).length;

      if (
        currentBatch.length > 0 &&
        (currentBatch.length >= size ||
          currentSize + eventSize > maxPayloadSize)
      ) {
        batches.push(currentBatch);

        currentBatch = [];
        currentSize = 0;
      }

      currentBatch.push(event);
      currentSize += eventSize;
    }

    /* v8 ignore next -- @preserve */
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Filter out events that have exceeded the configured eventTTL.
   *
   * @param events Events to filter
   * @returns Events that are still within TTL
   */
  #filterExpired(events: Event<TMetadata>[]): Event<TMetadata>[] {
    if (this.#config.eventTTL === null) return events;

    const now = Date.now();

    return events.filter(
      event => now - event.issuedAt <= this.#config.eventTTL!,
    );
  }

  /**
   * Send events with exponential backoff retry logic.
   *
   * @param events Events to send
   * @param attempt Current retry attempt number
   * @returns Whether the send was successful (or non-retryable)
   */
  async #sendWithRetry(
    events: Event<TMetadata>[],
    attempt: number = 0,
  ): Promise<boolean> {
    try {
      const response = await this.#httpClient.send({
        events,
        endpoint: this.#config.endpoint,
        headers: {
          [this.#config.apiKeyHeader]: this.#config.apiKey,
          "Content-Type": "application/json",
        },
        apiKeyHeader: this.#config.apiKeyHeader,
      });

      return await this.#handleResponse(response, events, attempt);
    } catch (err) {
      return await this.#handleNetworkError(err, events, attempt);
    }
  }

  /**
   * Handle HTTP response based on status code.
   *
   * @param response HTTP response
   * @param events Events that were sent
   * @param attempt Current retry attempt
   * @returns Whether the request was successful (or non-retryable)
   */
  async #handleResponse(
    response: { status: number },
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<boolean> {
    if (response.status >= 200 && response.status < 300) {
      await this.#clearStorage("Failed to clear storage after successful send");
      this.#config.hooks.onSendSuccess?.({
        batchSize: events.length,
        status: response.status,
      });

      return true;
    } else if (response.status >= 400 && response.status < 500) {
      this.#logger.warn("4xx client error, dropping events", {
        status: response.status,
        eventsCount: events.length,
      });

      await this.#clearStorage("Failed to clear storage after 4xx error");
      this.#config.hooks.onDrop?.({
        eventCount: events.length,
        reason: "client_error",
      });

      return true;
    } else if (response.status >= 500) {
      return await this.#handleServerError(response.status, events, attempt);
    } else {
      // 1xx, 3xx: Unexpected status codes, treat as client error and drop
      this.#logger.warn("Unexpected status code, dropping events", {
        status: response.status,
        eventsCount: events.length,
      });

      await this.#clearStorage(
        "Failed to clear storage after unexpected status",
      );

      return true;
    }
  }

  /**
   * Handle 5xx server errors with retry logic.
   *
   * @param status HTTP status code
   * @param events Events to retry
   * @param attempt Current retry attempt
   * @returns Whether the retry eventually succeeded
   */
  async #handleServerError(
    status: number,
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<boolean> {
    if (attempt < this.#config.retryOptions.maxAttempts) {
      this.#logger.warn("5xx server error, retrying", {
        status,
        attempt: attempt + 1,
        maxRetries: this.#config.retryOptions.maxAttempts,
      });

      try {
        const backoffDelay = calculateBackoff(
          attempt,
          this.#config.retryOptions.minDelay,
          this.#config.retryOptions.maxDelay,
          this.#config.retryOptions.backoffFactor,
        );

        this.#config.hooks.onRetry?.({
          attempt: attempt + 1,
          delay: backoffDelay,
        });

        await delay(backoffDelay, this.#retryAbortController.signal);

        return await this.#sendWithRetry(events, attempt + 1);
      } catch (err) {
        /* v8 ignore next -- @preserve */
        if (err instanceof DelayAbortedError) return false;

        /* v8 ignore next -- @preserve */
        throw err;
      }
    } else {
      this.#logger.error("5xx server error, max retries reached", {
        status,
        maxRetries: this.#config.retryOptions.maxAttempts,
        eventsCount: events.length,
      });

      this.#config.hooks.onSendFailure?.({
        batchSize: events.length,
        error: `5xx: ${status}`,
        attempt,
      });

      return false;
    }
  }

  /**
   * Handle network errors with retry logic.
   *
   * @param err Error that occurred
   * @param events Events to retry
   * @param attempt Current retry attempt
   * @returns Whether the retry eventually succeeded
   */
  async #handleNetworkError(
    err: unknown,
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<boolean> {
    /* v8 ignore next -- @preserve */
    if (err instanceof DelayAbortedError) return false;

    this.#logger.error("Network error occurred", { err });

    if (attempt < this.#config.retryOptions.maxAttempts) {
      this.#logger.warn("Network error, retrying", {
        attempt: attempt + 1,
        maxRetries: this.#config.retryOptions.maxAttempts,
        error: err instanceof Error ? err.message : String(err),
      });

      try {
        const backoffDelay = calculateBackoff(
          attempt,
          this.#config.retryOptions.minDelay,
          this.#config.retryOptions.maxDelay,
          this.#config.retryOptions.backoffFactor,
        );

        this.#config.hooks.onRetry?.({
          attempt: attempt + 1,
          delay: backoffDelay,
        });

        await delay(backoffDelay, this.#retryAbortController.signal);

        return await this.#sendWithRetry(events, attempt + 1);
      } catch (delayErr) {
        /* v8 ignore next -- @preserve */
        if (delayErr instanceof DelayAbortedError) return false;

        /* v8 ignore next -- @preserve */
        throw delayErr;
      }
    } else {
      this.#logger.error("Network error, max retries reached", {
        maxRetries: this.#config.retryOptions.maxAttempts,
        eventsCount: events.length,
        /* v8 ignore next -- @preserve */
        error: err instanceof Error ? err.message : String(err),
      });

      this.#config.hooks.onSendFailure?.({
        batchSize: events.length,
        error: err instanceof Error ? err.message : String(err),
        attempt,
      });

      return false;
    }
  }

  /**
   * Clear storage and log errors if clearing fails.
   *
   * @param errorMessage Error message to log on failure
   */
  async #clearStorage(errorMessage: string): Promise<void> {
    try {
      await this.#storage.clear();
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

      await this.#storage.save(eventsToSave);
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
    }, this.#config.batchOptions.interval);
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
      const stored = await this.#storage.load();
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
    void this.#storage.close();
  }
}
