import { type HttpAdapter } from "./adapters/http-adapter.ts";
import { LogLevel, type LoggerAdapter } from "./adapters/logger-adapter.ts";
import { type StorageAdapter } from "./adapters/storage-adapter.ts";
import { Dispatcher, type DispatcherConfig } from "./dispatcher.ts";
import { ConsoleLoggerAdapter } from "./logger.ts";
import { MetadataManager } from "./metadata-manager.ts";
import { Mutex } from "./mutex.ts";
import type { Event, EventPayload, Platform } from "./types.ts";

/**
 * Configuration for the Ripple client.
 */
export type ClientConfig = {
  /**
   * API key for authentication
   */
  apiKey: string;
  /**
   * API endpoint URL
   */
  endpoint: string;
  /**
   * Header name for API key (default: `"X-API-Key"`)
   */
  apiKeyHeader?: string;
  /**
   * Interval in milliseconds between automatic flushes (default: `5000`)
   */
  flushInterval?: number;
  /**
   * Maximum number of events before auto-flush (default: `10`)
   */
  maxBatchSize?: number;
  /**
   * Maximum retry attempts for failed requests (default: `3`)
   */
  maxRetries?: number;
  /**
   * Maximum number of events to persist to storage (optional).
   * When limit is exceeded, oldest events are evicted using FIFO policy.
   */
  maxBufferSize?: number;
  /**
   * HTTP adapter for sending events
   */
  httpAdapter: HttpAdapter;
  /**
   * Storage adapter for persisting events
   */
  storageAdapter: StorageAdapter;
  /**
   * Logger adapter for SDK internal logging (default: `ConsoleLoggerAdapter` with `WARN` level)
   */
  loggerAdapter?: LoggerAdapter;
};

/**
 * Abstract base class for Ripple SDK clients.
 * Provides core event tracking functionality with type-safe metadata management.
 *
 * @template TEvents The type definition mapping event names to their payloads
 * @template TMetadata The type definition for metadata
 */
export abstract class Client<
  TEvents extends Record<string, EventPayload> = Record<string, EventPayload>,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  protected readonly _metadataManager: MetadataManager<TMetadata>;
  protected readonly _dispatcher: Dispatcher<TMetadata>;
  protected readonly _logger: LoggerAdapter;

  private readonly _initMutex = new Mutex();

  private _sessionId: string | null = null;
  private _initialized = false;
  private _disposed = false;

  /**
   * Create a new Client instance.
   *
   * @param config Client configuration including adapters
   */
  constructor(config: ClientConfig) {
    if (!config.httpAdapter || !config.storageAdapter) {
      throw new Error(
        "Both `httpAdapter` and `storageAdapter` must be provided in `config`.",
      );
    }

    if (!config.apiKey) {
      throw new Error("`apiKey` must be provided in `config`.");
    }

    if (!config.endpoint) {
      throw new Error("`endpoint` must be provided in `config`.");
    }

    if (config.flushInterval !== undefined && config.flushInterval <= 0) {
      throw new Error("`flushInterval` must be a positive number.");
    }

    if (config.maxBatchSize !== undefined && config.maxBatchSize <= 0) {
      throw new Error("`maxBatchSize` must be a positive number.");
    }

    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      throw new Error("`maxRetries` must be a non-negative number.");
    }

    if (config.maxBufferSize !== undefined && config.maxBufferSize <= 0) {
      throw new Error("`maxBufferSize` must be a positive number.");
    }

    this._logger =
      config.loggerAdapter ?? new ConsoleLoggerAdapter(LogLevel.WARN);
    this._metadataManager = new MetadataManager<TMetadata>();

    const dispatcherConfig: DispatcherConfig = {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiKeyHeader: config.apiKeyHeader ?? "X-API-Key",
      flushInterval: config.flushInterval ?? 5000,
      maxBatchSize: config.maxBatchSize ?? 10,
      maxRetries: config.maxRetries ?? 3,
      maxBufferSize: config.maxBufferSize ?? Number.MAX_SAFE_INTEGER,
      loggerAdapter: this._logger,
    };

    this._dispatcher = new Dispatcher<TMetadata>(
      dispatcherConfig,
      config.httpAdapter,
      config.storageAdapter,
    );
  }

  /**
   * Get platform information for the current runtime.
   * Must be implemented by runtime-specific clients.
   *
   * @returns Platform information or null
   */
  protected abstract _getPlatform(): Platform | null;

  /**
   * Track an event.
   * Automatically initializes the client if not already initialized.
   *
   * @param name Event name/identifier
   * @param payload Event data payload
   * @param metadata Event-specific metadata
   */
  public async track<K extends keyof TEvents>(
    name: K,
    payload?: TEvents[K],
    metadata?: Partial<TMetadata>,
  ): Promise<void> {
    if (this._disposed) {
      this._logger.warn("Cannot track event: Client has been disposed");

      return Promise.resolve();
    }

    await this.init();

    const event: Event<TMetadata> = {
      name: name as string,
      metadata: this._metadataManager.merge(metadata),
      payload: payload ?? null,
      issuedAt: Date.now(),
      sessionId: this._sessionId,
      platform: this._getPlatform(),
    };

    await this._dispatcher.enqueue(event);
  }

  /**
   * Set a shared metadata value.
   * This metadata will be attached to all subsequent events.
   *
   * @template K The metadata key type
   * @param key The metadata key
   * @param value The value to set
   */
  public setMetadata<K extends keyof TMetadata>(
    key: K,
    value: TMetadata[K],
  ): void {
    this._metadataManager.set(key, value);
  }

  /**
   * Get all current metadata.
   *
   * @returns All metadata or empty object if none set
   */
  public getMetadata(): Partial<TMetadata> {
    return this._metadataManager.getAll();
  }

  /**
   * Get the current session ID.
   *
   * @returns Current session ID or null if not set
   */
  public getSessionId(): string | null {
    return this._sessionId;
  }

  /**
   * Set the session ID.
   * Default implementation for base client - runtime packages can override.
   *
   * @param sessionId The session ID to set
   */
  protected _setSessionId(sessionId: string): void {
    this._sessionId = sessionId;
  }

  /**
   * Immediately flush all queued events.
   */
  public async flush(): Promise<void> {
    await this._dispatcher.flush();
  }

  /**
   * Initialize the client and restore persisted events.
   * Must be called before tracking events.
   */
  public async init(): Promise<void> {
    if (this._initialized) return await Promise.resolve();

    if (this._disposed) this._initMutex.reset();

    await this._initMutex.runAtomic(async () => {
      if (this._initialized) {
        return await Promise.resolve();
      }

      await this._dispatcher.restore();

      this._disposed = false;
      this._initialized = true;
    });
  }

  /**
   * Dispose the client and clean up resources.
   * Cancels scheduled flushes and clears all references for memory cleanup.
   */
  public dispose(): void {
    this._dispatcher.dispose();
    this._metadataManager.clear();
    this._initMutex.release();
    this._disposed = true;
    this._sessionId = null;
    this._initialized = false;
  }
}
