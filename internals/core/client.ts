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
   * Maximum number of events the in-memory buffer can hold (default: `50`).
   * When limit is exceeded, oldest events are evicted using FIFO policy.
   */
  maxBufferSize?: number;
  /**
   * Per-event time-to-live in milliseconds.
   * Events older than this (based on `issuedAt`) are dropped at flush time.
   */
  eventTtl?: number;
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

    const {
      apiKey,
      endpoint,
      storageAdapter,
      httpAdapter = new HttpClient(),
      hooks = {},
      eventSampler = () => true,
      maxBufferSize = 50,
      eventTtl = null,
      telemetryOptions = null,
      apiKeyHeader = "X-API-Key",
      loggerAdapter = new ConsoleLogger(LogLevel.WARN),
    } = config;

    const {
      interval: batchInterval = 10000,
      maxPayloadSize: batchMaxPayloadSize = 64 * 1024,
      size: batchSize = 10,
    } = config.batchOptions ?? {};

    const {
      backoffFactor: retryBackoffFactor = 2,
      maxAttempts: retryMaxAttempts = 3,
      maxDelay: retryMaxDelay = 360000,
      minDelay: retryMinDelay = 1000,
    } = config.retryOptions ?? {};

    this._sampler = eventSampler;
    this._anonymousId = this._generateAnonymousId();
    this._logger = loggerAdapter;
    this.events = new EventsNamespace(this);
    this._metadataManager = new MetadataManager<TMetadata>();
    this._storage = storageAdapter;

    this.#hooks = createTelemetryHooks(hooks, telemetryOptions, {
      apiKey,
      apiKeyHeader,
      getUserId: this.getUserId,
      getMetadata: this.getMetadata,
      getAnonymousId: this.getAnonymousId,
      getPlatform: this._getPlatform,
      getSdk: this._getSdkInfo,
    });

    const dispatcherConfig: DispatcherConfig = {
      apiKey,
      endpoint,
      apiKeyHeader,
      maxBufferSize,
      eventTtl,
      batchOptions: {
        interval: batchInterval,
        size: batchSize,
        maxPayloadSize: batchMaxPayloadSize,
      },
      retryOptions: {
        maxAttempts: retryMaxAttempts,
        minDelay: retryMinDelay,
        maxDelay: retryMaxDelay,
        backoffFactor: retryBackoffFactor,
      },
      hooks: this.#hooks,
      logger: this._logger,
    };

    this._dispatcher = new Dispatcher<TMetadata>(
      dispatcherConfig,
      httpAdapter,
      storageAdapter,
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
    await this._trackInternal(
      "user_identified",
      { userId, traits },
      PREDEFINED_SCHEMA_VERSION,
    );

    this._userId = userId;
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
   * Internal method for tracking predefined/internal events without generic constraints.
   * Used by convenience methods.
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
      anonymousId: this._anonymousId,
      userId: this._userId,
      name: name as string,
      schemaVersion: schemaVersion ?? null,
      payload: payload ?? null,
      issuedAt: Date.now(),
      metadata: this.getMetadata(),
      sdk: this._getSdkInfo(),
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
   */
  public async init(): Promise<void> {
    if (this.#initialized) return;

    if (this.#disposed) {
      this.#disposed = false;
      this.#initMutex.reset();
    }

    return this.#initMutex.runAtomic(async () => {
      if (this.#initialized) return;

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
