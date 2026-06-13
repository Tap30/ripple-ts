import { SDK_NAME, SDK_VERSION } from "./__sdk_build_info__.ts";
import { type HttpAdapter } from "./adapters/http-adapter.ts";
import { LogLevel, type LoggerAdapter } from "./adapters/logger-adapter.ts";
import { type StorageAdapter } from "./adapters/storage-adapter.ts";
import { Dispatcher, type DispatcherConfig } from "./dispatcher.ts";
import type {
  ClickedPayload,
  PredefinedEvents,
  ViewedPayload,
} from "./event-specs.ts";
import { ConsoleLoggerAdapter } from "./logger.ts";
import { MetadataManager } from "./metadata-manager.ts";
import { Mutex } from "./mutex.ts";
import type {
  Event,
  EventPayload,
  Platform,
  SdkInfo,
  UserTraits,
} from "./types.ts";
import { IdGenerator } from "./utils.ts";

/**
 * Function to sample events before they are enqueued.
 */
export type EventSampler<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> = (event: Event<TMetadata>) => boolean;

/**
 * Configuration for the Ripple client.
 */
export type ClientConfig = {
  /**
   * API key for authentication.
   */
  apiKey: string;
  /**
   * API endpoint URL.
   */
  endpoint: string;
  /**
   * Header name for API key (default: `"X-API-Key"`).
   */
  apiKeyHeader?: string;
  /**
   * Interval in milliseconds between automatic flushes (default: `5000`).
   */
  flushInterval?: number;
  /**
   * Maximum number of events before auto-flush (default: `10`).
   */
  maxBatchSize?: number;
  /**
   * Maximum retry attempts for failed requests (default: `3`).
   */
  maxRetries?: number;
  /**
   * Maximum number of events to persist to storage (optional).
   * When limit is exceeded, oldest events are evicted using FIFO policy.
   */
  maxBufferSize?: number;
  /**
   * HTTP adapter for sending events.
   */
  httpAdapter: HttpAdapter;
  /**
   * Storage adapter for persisting events.
   */
  storageAdapter: StorageAdapter;
  /**
   * Logger adapter for SDK internal logging (default: `ConsoleLoggerAdapter` with `WARN` level).
   */
  loggerAdapter?: LoggerAdapter;
  /**
   * Optional function to sample events before they are enqueued.
   * Return `true` to keep the event, `false` to drop it.
   */
  eventSampler?: EventSampler;
};

/**
 * Merges predefined CDP events with user-defined custom events.
 */
export type AllEvents<TCustomEvents extends Record<string, EventPayload>> =
  PredefinedEvents & TCustomEvents;

/**
 * Abstract base class for Ripple SDK clients.
 * Provides core event tracking functionality with type-safe metadata management.
 *
 * @template TCustomEvents Custom event definitions merged with predefined CDP events
 * @template TMetadata The type definition for metadata
 */
export abstract class Client<
  TCustomEvents extends Record<string, EventPayload> = Record<
    string,
    EventPayload
  >,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  protected readonly _metadataManager: MetadataManager<TMetadata>;
  protected readonly _dispatcher: Dispatcher<TMetadata>;
  protected readonly _logger: LoggerAdapter;
  protected readonly _sampler: EventSampler;

  protected _anonymousId: string;
  protected _userId: string | null = null;

  readonly #initMutex = new Mutex();

  #initialized = false;
  #disposed = false;

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

    if (
      config.eventSampler !== undefined &&
      typeof config.eventSampler !== "function"
    ) {
      throw new Error("`eventSampler` must be a function.");
    }

    this._anonymousId = this._generateAnonymousId();

    this._sampler = config.eventSampler ?? (() => true);
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

  protected _generateAnonymousId(): string {
    return IdGenerator.generate();
  }

  /**
   * Get platform information for the current runtime.
   * Must be implemented by runtime-specific clients.
   *
   * @returns Platform information or null
   */
  protected abstract _getPlatform(): Platform | null;

  /**
   * Identify a user and associate traits with their profile.
   *
   * @param userId The authenticated user's unique identifier
   * @param traits User profile attributes (e.g., name, email)
   * @param schemaVersion Event schema version
   */
  public async identify(
    userId: string,
    traits: UserTraits,
    schemaVersion?: string,
  ): Promise<void> {
    return this.track(
      "user_identified",
      { userId, traits } as AllEvents<TCustomEvents>["user_identified"],
      schemaVersion,
    );
  }

  /**
   * Track a click interaction on a UI element.
   *
   * @param payload Click event data including element identifier
   * @param schemaVersion Event schema version
   */
  public async click(
    payload: ClickedPayload,
    schemaVersion?: string,
  ): Promise<void> {
    return this.track(
      "clicked",
      payload as AllEvents<TCustomEvents>["clicked"],
      schemaVersion,
    );
  }

  /**
   * Track a view impression of a UI element.
   *
   * @param payload View event data including element identifier
   * @param schemaVersion Event schema version
   */
  public async view(
    payload: ViewedPayload,
    schemaVersion?: string,
  ): Promise<void> {
    return this.track(
      "viewed",
      payload as AllEvents<TCustomEvents>["viewed"],
      schemaVersion,
    );
  }

  /**
   * Track an event.
   * Automatically initializes the client if not already initialized.
   *
   * @param name Event name/identifier
   * @param payload Event data payload
   * @param schemaVersion Event schema version
   */
  public async track<K extends keyof AllEvents<TCustomEvents>>(
    name: K,
    payload?: AllEvents<TCustomEvents>[K],
    schemaVersion?: string,
  ): Promise<void> {
    if (this.#disposed) {
      this._logger.warn("Cannot track event: Client has been disposed");

      return;
    }

    await this.init();

    const sdkInfo: SdkInfo = {
      name: SDK_NAME,
      version: SDK_VERSION,
    };

    const event: Event<TMetadata> = {
      eventId: IdGenerator.generate(),
      schemaVersion: schemaVersion ?? null,
      sdk: sdkInfo,
      anonymousId: this._anonymousId,
      userId: this._userId,
      name: name as string,
      metadata: this.getMetadata(),
      payload: payload ?? null,
      issuedAt: Date.now(),
      platform: this._getPlatform(),
    };

    if (!this._sampler(event)) return;

    return this._dispatcher.enqueue(event);
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
   * Get the anonymous ID.
   *
   * @returns Anonymous ID
   */
  public getAnonymousId(): string {
    return this._anonymousId;
  }

  /**
   * Get the user ID.
   *
   * @returns User ID or null if not set
   */
  public getUserId(): string | null {
    return this._userId;
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
    if (this.#initialized) return await Promise.resolve();

    if (this.#disposed) {
      this.#disposed = false;
      this.#initMutex.reset();
    }

    await this.#initMutex.runAtomic(async () => {
      if (this.#initialized) return await Promise.resolve();

      await this._dispatcher.restore();

      this.#initialized = true;
    });
  }

  /**
   * Dispose the client and clean up resources.
   * Cancels scheduled flushes and clears all references for memory cleanup.
   */
  public dispose(): void {
    this._dispatcher.dispose();
    this._metadataManager.clear();
    this.#initMutex.release();
    this._userId = null;
    this.#disposed = true;
    this._anonymousId = "";
    this.#initialized = false;
  }
}
