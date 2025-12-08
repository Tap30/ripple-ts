import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";
import { Mutex } from "./mutex.ts";
import { Queue } from "./queue.ts";
import type { DispatcherConfig, Event } from "./types.ts";
import { calculateBackoff, delay } from "./utils.ts";

/**
 * Manages event queuing, batching, flushing, and retry logic.
 * Automatically flushes events based on batch size or time interval.
 * Implements exponential backoff with jitter for retries.
 *
 * @template TContext The type of context attached to events
 */
export class Dispatcher<TContext extends Record<string, unknown>> {
  private _queue = new Queue<Event<TContext>>();
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _flushMutex = new Mutex();

  private readonly _config: DispatcherConfig;
  private readonly _httpAdapter: HttpAdapter;
  private readonly _storageAdapter: StorageAdapter;

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
  }

  /**
   * Add an event to the queue.
   * Triggers auto-flush if batch size threshold is reached.
   *
   * @param event The event to enqueue
   */
  public async enqueue(event: Event<TContext>): Promise<void> {
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
    events: Event<TContext>[],
    attempt: number = 0,
  ): Promise<void> {
    try {
      const response = await this._httpAdapter.send(
        this._config.endpoint,
        events,
      );

      if (response.ok) {
        await this._storageAdapter.clear();
      } else if (attempt < this._config.maxRetries) {
        await delay(calculateBackoff(attempt));
        await this._sendWithRetry(events, attempt + 1);
      } else {
        const currentQueue = this._queue.toArray();

        this._queue.fromArray([...events, ...currentQueue]);
        await this._storageAdapter.save(this._queue.toArray());
      }
    } catch {
      if (attempt < this._config.maxRetries) {
        await delay(calculateBackoff(attempt));
        await this._sendWithRetry(events, attempt + 1);
      } else {
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

    this._queue.fromArray(stored as Event<TContext>[]);
  }

  /**
   * Clean up resources and cancel scheduled flushes.
   * Should be called when disposing the client.
   */
  public dispose(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
}
