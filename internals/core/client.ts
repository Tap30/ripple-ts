import { type HttpAdapter } from "./adapters/http-adapter.ts";
import { LogLevel, type LoggerAdapter } from "./adapters/logger-adapter.ts";
import { type StorageAdapter } from "./adapters/storage-adapter.ts";
import { Dispatcher, type DispatcherConfig } from "./dispatcher.ts";
import { ConsoleLoggerAdopter } from "./logger.ts";
import { MetadataManager } from "./metadata-manager.ts";
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
   * Custom adapters for HTTP, storage, and logging
   */
  adapters: {
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

  private _sessionId: string | null = null;
  private _initialized = false;

  /**
   * Create a new Client instance.
   *
   * @param config Client configuration including adapters
   */
  constructor(config: ClientConfig) {
    if (!config.adapters?.httpAdapter || !config.adapters?.storageAdapter) {
      throw new Error(
        "Both `httpAdapter` and `storageAdapter` must be provided in `config.adapters`.",
      );
    }

    if (!config.apiKey) {
      throw new Error("`apiKey` must be provided in `config`.");
    }

    if (!config.endpoint) {
      throw new Error("`endpoint` must be provided in `config`.");
    }

    this._logger =
      config.adapters.loggerAdapter ?? new ConsoleLoggerAdopter(LogLevel.WARN);
    this._metadataManager = new MetadataManager<TMetadata>();

    const dispatcherConfig: DispatcherConfig = {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiKeyHeader: config.apiKeyHeader ?? "X-API-Key",
      flushInterval: config.flushInterval ?? 5000,
      maxBatchSize: config.maxBatchSize ?? 10,
      maxRetries: config.maxRetries ?? 3,
      loggerAdapter: this._logger,
    };

    this._dispatcher = new Dispatcher<TMetadata>(
      dispatcherConfig,
      config.adapters.httpAdapter,
      config.adapters.storageAdapter,
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
   *
   * @param name Event name/identifier
   * @param payload Event data payload
   * @param metadata Event-specific metadata
   * @throws Error if client is not initialized
   */
  public async track<K extends keyof TEvents>(
    name: K,
    payload?: TEvents[K],
    metadata?: Partial<TMetadata>,
  ): Promise<void> {
    if (!this._initialized) {
      throw new Error(
        "Client not initialized. Call init() before tracking events.",
      );
    }

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
   * @returns `null` by default, runtime packages may return the set value
   */
  protected _setSessionId(sessionId: string): string | null {
    this._sessionId = sessionId;

    return null;
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
    await this._dispatcher.restore();

    this._initialized = true;
  }

  /**
   * Dispose the client and clean up resources.
   * Cancels scheduled flushes and clears all references for memory cleanup.
   */
  public dispose(): void {
    this._dispatcher.dispose();
    this._metadataManager.clear();
    this._sessionId = null;
    this._initialized = false;
  }
}
