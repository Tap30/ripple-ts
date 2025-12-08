import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";
import { ContextManager } from "./context-manager.ts";
import { Dispatcher } from "./dispatcher.ts";
import type {
  ClientConfig,
  DispatcherConfig,
  Event,
  EventMetadata,
  EventPayload,
  Platform,
} from "./types.ts";

/**
 * Abstract base class for Ripple SDK clients.
 * Provides core event tracking functionality with type-safe context management.
 *
 * @template TContext The type definition for global context
 */
export abstract class Client<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  protected readonly _contextManager: ContextManager<TContext>;
  protected readonly _dispatcher: Dispatcher<TContext>;
  protected _sessionId: string | null = null;
  private _initialized = false;

  /**
   * Create a new Client instance.
   *
   * @param config Client configuration
   * @param httpAdapter HTTP adapter for sending events
   * @param storageAdapter Storage adapter for persisting events
   */
  constructor(
    config: ClientConfig,
    httpAdapter: HttpAdapter,
    storageAdapter: StorageAdapter,
  ) {
    this._contextManager = new ContextManager<TContext>();

    const dispatcherConfig: DispatcherConfig = {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiKeyHeader: config.apiKeyHeader ?? "X-API-Key",
      flushInterval: config.flushInterval ?? 5000,
      maxBatchSize: config.maxBatchSize ?? 10,
      maxRetries: config.maxRetries ?? 3,
    };

    this._dispatcher = new Dispatcher<TContext>(
      dispatcherConfig,
      httpAdapter,
      storageAdapter,
    );
  }

  /**
   * Track an event.
   *
   * @param name Event name/identifier
   * @param payload Event data payload
   * @param metadata Event-specific metadata
   * @throws Error if client is not initialized
   */
  public async track(
    name: string,
    payload?: EventPayload,
    metadata?: EventMetadata,
  ): Promise<void> {
    if (!this._initialized) {
      throw new Error(
        "Client not initialized. Call init() before tracking events.",
      );
    }

    const event: Event<TContext> = {
      name,
      metadata: metadata ?? null,
      payload: payload ?? null,
      issuedAt: Date.now(),
      context: this._contextManager.getAll() as TContext,
      sessionId: this._sessionId,
      platform: this._getPlatform(),
    };

    await this._dispatcher.enqueue(event);
  }

  /**
   * Set a global context value.
   * This context will be attached to all subsequent events.
   *
   * @template K The context key type
   * @param key The context key
   * @param value The value to set
   */
  public setContext<K extends keyof TContext>(
    key: K,
    value: TContext[K],
  ): void {
    this._contextManager.set(key, value);
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
   * Get platform information for the current runtime.
   * Must be implemented by runtime-specific clients.
   *
   * @returns Platform information or null
   */
  protected abstract _getPlatform(): Platform | null;

  /**
   * Dispose the client and clean up resources.
   * Cancels scheduled flushes and detaches event listeners.
   */
  public dispose(): void {
    this._dispatcher.dispose();
  }
}
