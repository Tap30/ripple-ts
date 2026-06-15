import { type HttpAdapter } from "./adapters/http-adapter.ts";
import { LogLevel, type LoggerAdapter } from "./adapters/logger-adapter.ts";
import { type StorageAdapter } from "./adapters/storage-adapter.ts";
import {
  Dispatcher,
  type BatchOptions,
  type DispatcherConfig,
  type RetryOptions,
} from "./dispatcher.ts";
import {
  PREDEFINED_SCHEMA_VERSION,
  type ClickedPayload,
  type ViewedPayload,
} from "./event-specs.ts";
import { EventsNamespace } from "./events-namespace.ts";
import { HttpClient } from "./http-client.ts";
import { ConsoleLogger } from "./logger.ts";
import { MetadataManager } from "./metadata-manager.ts";
import { Mutex } from "./mutex.ts";
import {
  createTelemetryHooks,
  type TelemetryHooks,
  type TelemetryOptions,
} from "./telemetry.ts";
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

export type { BatchOptions, RetryOptions };

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
   * Batching options controlling flush interval, batch size, and payload size limits.
   */
  batchOptions?: BatchOptions;
  /**
   * Retry options controlling retry attempts, delays, and backoff strategy.
   */
  retryOptions?: RetryOptions;
  /**
   * Maximum number of events to persist to storage (optional).
   * When limit is exceeded, oldest events are evicted using FIFO policy.
   */
  maxBufferSize?: number;
  /**
   * Per-event time-to-live in milliseconds.
   * Events older than this (based on `issuedAt`) are dropped at flush time.
   */
  eventTTL?: number;
  /**
   * HTTP adapter for sending events (default: built-in `HttpClient`).
   */
  httpAdapter?: HttpAdapter;
  /**
   * Storage adapter for persisting events.
   */
  storageAdapter: StorageAdapter;
  /**
   * Logger adapter for SDK internal logging (default: `ConsoleLogger` with `WARN` level).
   */
  loggerAdapter?: LoggerAdapter;
  /**
   * Optional function to sample events before they are enqueued.
   * Return `true` to keep the event, `false` to drop it.
   */
  eventSampler?: EventSampler;
  /**
   * Telemetry hooks for production monitoring (fire-and-forget).
   */
  hooks?: TelemetryHooks;
  /**
   * Automatic telemetry reporting configuration.
   * When enabled, the SDK sends internal metrics to the specified endpoint.
   */
  telemetryOptions?: TelemetryOptions;
};

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
  protected readonly _storage: StorageAdapter;
  protected readonly _logger: LoggerAdapter;
  protected readonly _sampler: EventSampler;

  readonly #hooks: TelemetryHooks;

  /**
   * Typed namespace for predefined CDP events.
   */
  public readonly events: EventsNamespace;

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
    if (!config.storageAdapter) {
      throw new Error("`storageAdapter` must be provided in `config`.");
    }

    if (!config.apiKey) {
      throw new Error("`apiKey` must be provided in `config`.");
    }

    if (!config.endpoint) {
      throw new Error("`endpoint` must be provided in `config`.");
    }

    if (
      config.batchOptions?.interval !== undefined &&
      config.batchOptions.interval <= 0
    ) {
      throw new Error("`batchOptions.interval` must be a positive number.");
    }

    if (
      config.batchOptions?.size !== undefined &&
      config.batchOptions.size <= 0
    ) {
      throw new Error("`batchOptions.size` must be a positive number.");
    }

    if (
      config.batchOptions?.maxPayloadSize !== undefined &&
      config.batchOptions.maxPayloadSize <= 0
    ) {
      throw new Error(
        "`batchOptions.maxPayloadSize` must be a positive number.",
      );
    }

    if (
      config.retryOptions?.maxAttempts !== undefined &&
      config.retryOptions.maxAttempts < 0
    ) {
      throw new Error(
        "`retryOptions.maxAttempts` must be a non-negative number.",
      );
    }

    if (
      config.retryOptions?.minDelay !== undefined &&
      config.retryOptions.minDelay <= 0
    ) {
      throw new Error("`retryOptions.minDelay` must be a positive number.");
    }

    if (
      config.retryOptions?.maxDelay !== undefined &&
      config.retryOptions.maxDelay <= 0
    ) {
      throw new Error("`retryOptions.maxDelay` must be a positive number.");
    }

    if (
      config.retryOptions?.backoffFactor !== undefined &&
      config.retryOptions.backoffFactor <= 0
    ) {
      throw new Error(
        "`retryOptions.backoffFactor` must be a positive number.",
      );
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
    this.#hooks = createTelemetryHooks(
      config.hooks ?? {},
      config.telemetryOptions ?? null,
      config.apiKey,
      config.apiKeyHeader ?? "X-API-Key",
    );
    this._logger = config.loggerAdapter ?? new ConsoleLogger(LogLevel.WARN);

    this.events = new EventsNamespace(this);

    this._metadataManager = new MetadataManager<TMetadata>();

    const dispatcherConfig: DispatcherConfig = {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiKeyHeader: config.apiKeyHeader ?? "X-API-Key",
      batchOptions: {
        interval: config.batchOptions?.interval ?? 10000,
        size: config.batchOptions?.size ?? 10,
        maxPayloadSize: config.batchOptions?.maxPayloadSize ?? 65536,
      },
      retryOptions: {
        maxAttempts: config.retryOptions?.maxAttempts ?? 3,
        minDelay: config.retryOptions?.minDelay ?? 1000,
        maxDelay: config.retryOptions?.maxDelay ?? 360000,
        backoffFactor: config.retryOptions?.backoffFactor ?? 2,
      },
      maxBufferSize: config.maxBufferSize ?? Number.MAX_SAFE_INTEGER,
      eventTTL: config.eventTTL ?? null,
      hooks: this.#hooks,
      logger: this._logger,
    };

    this._storage = config.storageAdapter;
    this._dispatcher = new Dispatcher<TMetadata>(
      dispatcherConfig,
      /* v8 ignore next -- @preserve */
      config.httpAdapter ?? new HttpClient(),
      config.storageAdapter,
    );
  }

  /**
   * Generate a unique anonymous ID for this client instance.
   * Can be overridden by subclasses to provide custom ID generation or persistence.
   *
   * @returns A unique anonymous identifier string
   */
  protected _generateAnonymousId(): string {
    return IdGenerator.generate();
  }

  /**
   * Get SDK information for the current runtime.
   * Must be implemented by runtime-specific clients.
   *
   * @returns SDK information
   */
  protected abstract _getSdkInfo(): SdkInfo;

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
   */
  public async identify(userId: string, traits: UserTraits): Promise<void> {
    return this._trackInternal(
      "user_identified",
      { userId, traits },
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  /**
   * Track a click interaction on a UI element.
   *
   * @param payload Click event data including element identifier
   */
  public async clicked(payload: ClickedPayload): Promise<void> {
    return this._trackInternal("clicked", payload, PREDEFINED_SCHEMA_VERSION);
  }

  /**
   * Track a view impression of a UI element.
   *
   * @param payload View event data including element identifier
   */
  public async viewed(payload: ViewedPayload): Promise<void> {
    return this._trackInternal("viewed", payload, PREDEFINED_SCHEMA_VERSION);
  }

  /**
   * Internal method for tracking predefined events without generic constraints.
   * Used by convenience methods and EventsNamespace.
   *
   * @param name Event name
   * @param payload Event payload
   * @param schemaVersion Schema version
   */
  protected async _trackInternal(
    name: string,
    payload: EventPayload,
    schemaVersion: string,
  ): Promise<void> {
    return this.track(
      name,
      payload as TCustomEvents[keyof TCustomEvents],
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
  public async track<K extends keyof TCustomEvents>(
    name: K,
    payload?: TCustomEvents[K],
    schemaVersion?: string,
  ): Promise<void> {
    if (this.#disposed) {
      this._logger.warn("Cannot track event: Client has been disposed");

      return;
    }

    await this.init();

    const event: Event<TMetadata> = {
      eventId: IdGenerator.generate(),
      schemaVersion: schemaVersion ?? null,
      anonymousId: this._anonymousId,
      userId: this._userId,
      name: name as string,
      payload: payload ?? null,
      issuedAt: Date.now(),
      sdk: this._getSdkInfo(),
      metadata: this.getMetadata(),
      platform: this._getPlatform(),
    };

    if (!this._sampler(event)) {
      this.#hooks.onDrop?.({ eventCount: 1, reason: "sampled" });

      return;
    }

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
   * @returns All metadata or null if none set
   */
  public getMetadata(): Partial<TMetadata> | null {
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

      await this._storage.init();
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
