import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { LoggerAdapter } from "./adapters/logger-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";
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
  }

  /**
   * Add an event to the queue.
   * Triggers auto-flush if batch size threshold is reached.
   *
   * @param event The event to enqueue
   */
  public async enqueue(event: Event<TMetadata>): Promise<void> {
    this._queue.enqueue(event);

    await this._storageAdapter.save(this._queue.toArray());

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
   */
  public async flush(): Promise<void> {
    await this._flushMutex.runAtomic(async () => {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }

      if (this._queue.isEmpty()) return;

      const batch = this._queue.toArray();

      this._queue.clear();

      await this._sendWithRetry(batch);
    });
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

      if (response.ok) {
        await this._storageAdapter.clear();
      } else if (response.status >= 400 && response.status < 500) {
        // 4xx: Client error, no retry - immediately re-queue and persist

        this._logger.warn("4xx client error, not retrying", {
          status: response.status,
          eventsCount: events.length,
        });
        const currentQueue = this._queue.toArray();

        this._queue.fromArray([...events, ...currentQueue]);
        await this._storageAdapter.save(this._queue.toArray());
      } else if (response.status >= 500 && attempt < this._config.maxRetries) {
        // 5xx: Server error, retry with backoff

        this._logger.warn("5xx server error, retrying", {
          status: response.status,
          attempt: attempt + 1,
          maxRetries: this._config.maxRetries,
        });
        await delay(calculateBackoff(attempt));
        await this._sendWithRetry(events, attempt + 1);
      } else {
        // 5xx: Max retries reached, re-queue and persist

        this._logger.error("5xx server error, max retries reached", {
          status: response.status,
          maxRetries: this._config.maxRetries,
          eventsCount: events.length,
        });

        const currentQueue = this._queue.toArray();

        this._queue.fromArray([...events, ...currentQueue]);
        await this._storageAdapter.save(this._queue.toArray());
      }
    } catch (err) {
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

        const currentQueue = this._queue.toArray();

        this._queue.fromArray([...events, ...currentQueue]);
        await this._storageAdapter.save(this._queue.toArray());
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
    const stored = await this._storageAdapter.load();

    this._queue.fromArray(stored as Event<TMetadata>[]);

    if (this._queue.size() > 0) {
      this._scheduleFlush();
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
