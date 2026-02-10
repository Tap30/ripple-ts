import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { LoggerAdapter } from "./adapters/logger-adapter.ts";
import {
  StorageQuotaExceededError,
  type StorageAdapter,
} from "./adapters/storage-adapter.ts";
import { Mutex } from "./mutex.ts";
import { Queue } from "./queue.ts";
import type { Event } from "./types.ts";
import { calculateBackoff, delay } from "./utils.ts";

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
  maxBufferSize?: number;
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
  private _queue = new Queue<Event<TMetadata>>();
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _flushMutex = new Mutex();

  private readonly _config: DispatcherConfig;
  private readonly _httpAdapter: HttpAdapter;
  private readonly _storageAdapter: StorageAdapter;
  private readonly _logger: LoggerAdapter;

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
    this._config = config;
    this._httpAdapter = httpAdapter;
    this._storageAdapter = storageAdapter;
    this._logger = config.loggerAdapter;

    // Validate configuration
    if (
      config.maxBufferSize !== undefined &&
      config.maxBufferSize < config.maxBatchSize
    ) {
      this._logger.warn(
        `Configuration warning: maxBufferSize (${config.maxBufferSize}) is less than maxBatchSize (${config.maxBatchSize}). ` +
          `This means the batch size will never be reached and events will be dropped unnecessarily. ` +
          `Consider setting maxBufferSize >= maxBatchSize.`,
      );
    }
  }

  /**
   * Add an event to the queue.
   * Triggers auto-flush if batch size threshold is reached.
   *
   * @param event The event to enqueue
   */
  public async enqueue(event: Event<TMetadata>): Promise<void> {
    this._queue.enqueue(event);

    try {
      const eventsToSave = this._applyQueueLimit(this._queue.toArray());

      await this._storageAdapter.save(eventsToSave);
    } catch (err) {
      if (err instanceof StorageQuotaExceededError) {
        this._logger.warn(err.message);
      } else {
        this._logger.error("Failed to persist events to storage", {
          error: err instanceof Error ? err.message : String(err),
          queueSize: this._queue.size(),
        });
      }
    }

    if (this._queue.size() >= this._config.maxBatchSize) {
      await this.flush();
    } else {
      this._scheduleFlush();
    }
  }

  /**
   * Immediately flush all queued events.
   * Cancels any scheduled flush.
   * Uses mutex to prevent concurrent flush operations.
   * Events are sent in batches according to `maxBatchSize` (dynamic rebatching).
   */
  public async flush(): Promise<void> {
    await this._flushMutex.runAtomic(async () => {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }

      if (this._queue.isEmpty()) return;

      const allEvents = this._queue.toArray();

      this._queue.clear();

      for (let i = 0; i < allEvents.length; i += this._config.maxBatchSize) {
        const batch = allEvents.slice(i, i + this._config.maxBatchSize);

        await this._sendWithRetry(batch);
      }
    });
  }

  /**
   * Apply persisted queue limit using FIFO eviction.
   *
   * @param events Events to apply limit to
   * @returns Events after applying limit
   */
  private _applyQueueLimit(events: Event<TMetadata>[]): Event<TMetadata>[] {
    if (
      this._config.maxBufferSize !== undefined &&
      events.length > this._config.maxBufferSize
    ) {
      return events.slice(-this._config.maxBufferSize);
    }

    return events;
  }

  /**
   * Send events with exponential backoff retry logic.
   *
   * @param events Events to send
   * @param attempt Current retry attempt number
   */
  private async _sendWithRetry(
    events: Event<TMetadata>[],
    attempt: number = 0,
  ): Promise<void> {
    try {
      const response = await this._httpAdapter.send(
        this._config.endpoint,
        events,
        {
          [this._config.apiKeyHeader]: this._config.apiKey,
          "Content-Type": "application/json",
        },
        this._config.apiKeyHeader,
      );

      await this._handleResponse(response, events, attempt);
    } catch (err) {
      await this._handleNetworkError(err, events, attempt);
    }
  }

  /**
   * Handle HTTP response based on status code.
   *
   * @param response HTTP response
   * @param events Events that were sent
   * @param attempt Current retry attempt
   */
  private async _handleResponse(
    response: { status: number },
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<void> {
    if (response.status >= 200 && response.status < 300) {
      await this._clearStorage("Failed to clear storage after successful send");
    } else if (response.status >= 400 && response.status < 500) {
      this._logger.warn("4xx client error, dropping events", {
        status: response.status,
        eventsCount: events.length,
      });

      await this._clearStorage("Failed to clear storage after 4xx error");
    } else if (response.status >= 500) {
      await this._handleServerError(response.status, events, attempt);
    } else {
      // 1xx, 3xx: Unexpected status codes, treat as client error and drop
      this._logger.warn("Unexpected status code, dropping events", {
        status: response.status,
        eventsCount: events.length,
      });

      await this._clearStorage(
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
  private async _handleServerError(
    status: number,
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<void> {
    if (attempt < this._config.maxRetries) {
      this._logger.warn("5xx server error, retrying", {
        status,
        attempt: attempt + 1,
        maxRetries: this._config.maxRetries,
      });

      await delay(calculateBackoff(attempt));
      await this._sendWithRetry(events, attempt + 1);
    } else {
      this._logger.error("5xx server error, max retries reached", {
        status,
        maxRetries: this._config.maxRetries,
        eventsCount: events.length,
      });

      await this._requeueEvents(
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
  private async _handleNetworkError(
    err: unknown,
    events: Event<TMetadata>[],
    attempt: number,
  ): Promise<void> {
    this._logger.error("Network error occurred", { err });

    if (attempt < this._config.maxRetries) {
      this._logger.warn("Network error, retrying", {
        attempt: attempt + 1,
        maxRetries: this._config.maxRetries,
        error: err instanceof Error ? err.message : String(err),
      });

      await delay(calculateBackoff(attempt));
      await this._sendWithRetry(events, attempt + 1);
    } else {
      this._logger.error("Network error, max retries reached", {
        maxRetries: this._config.maxRetries,
        eventsCount: events.length,
        error: err instanceof Error ? err.message : String(err),
      });

      await this._requeueEvents(
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
  private async _clearStorage(errorMessage: string): Promise<void> {
    try {
      await this._storageAdapter.clear();
    } catch (err) {
      this._logger.error(errorMessage, {
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
  private async _requeueEvents(
    events: Event<TMetadata>[],
    errorMessage: string,
  ): Promise<void> {
    const currentQueue = this._queue.toArray();

    this._queue.fromArray([...events, ...currentQueue]);

    try {
      const eventsToSave = this._applyQueueLimit(this._queue.toArray());

      await this._storageAdapter.save(eventsToSave);
    } catch (err) {
      if (err instanceof StorageQuotaExceededError) {
        this._logger.warn(err.message);
      } else {
        this._logger.error(errorMessage, {
          error: err instanceof Error ? err.message : String(err),
          eventsCount: this._queue.size(),
        });
      }
    }
  }

  /**
   * Schedule an automatic flush after the configured interval.
   * Does nothing if a flush is already scheduled.
   */
  private _scheduleFlush(): void {
    if (this._timer) return;

    this._timer = setTimeout(() => {
      void this.flush();
    }, this._config.flushInterval);
  }

  /**
   * Restore persisted events from storage.
   * Called during initialization to recover unsent events.
   */
  public async restore(): Promise<void> {
    try {
      const stored = await this._storageAdapter.load();
      const limited = this._applyQueueLimit(stored as Event<TMetadata>[]);

      this._queue.fromArray(limited);

      if (this._queue.size() > 0) {
        this._scheduleFlush();
      }
    } catch (err) {
      this._logger.error("Failed to restore events from storage", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Clean up resources, cancel scheduled flushes, and clear all references for memory cleanup.
   * Should be called when disposing the client.
   */
  public dispose(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    this._queue.clear();
    this._flushMutex.release();
  }
}
