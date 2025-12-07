/**
 * Event payload containing arbitrary key-value pairs.
 */
export type EventPayload = Record<string, unknown>;

/**
 * Event metadata containing schema version and other event-specific data.
 */
export type EventMetadata = {
  /**
   * Schema version for the event
   */
  schemaVersion?: string;
};

/**
 * Platform information with name and version.
 */
export type PlatformInfo = {
  /**
   * Platform name
   */
  name: string;
  /**
   * Platform version
   */
  version: string;
};

/**
 * Web platform information.
 */
export type WebPlatform = {
  /**
   * Platform type
   */
  type: "web";
  /**
   * Browser information
   */
  browser: PlatformInfo;
  /**
   * Device information
   */
  device: PlatformInfo;
  /**
   * Operating system information
   */
  os: PlatformInfo;
};

/**
 * Native platform information.
 */
export type NativePlatform = {
  /**
   * Platform type
   */
  type: "native";
  /**
   * Device information
   */
  device: PlatformInfo;
  /**
   * Operating system information
   */
  os: PlatformInfo;
};

/**
 * Server platform information.
 */
export type ServerPlatform = {
  /**
   * Platform type
   */
  type: "server";
};

/**
 * Platform discriminated union.
 */
export type Platform = WebPlatform | NativePlatform | ServerPlatform;

/**
 * Represents a tracked event with metadata and context.
 *
 * @template TContext The type of context attached to events
 */
export type Event<TContext = Record<string, unknown>> = {
  /**
   * Event name/identifier
   */
  name: string;
  /**
   * Event data payload
   */
  payload?: EventPayload;
  /**
   * Unix timestamp in milliseconds
   */
  timestamp: number;
  /**
   * Global context attached to the event
   */
  context?: TContext;
  /**
   * Session identifier (browser only)
   */
  sessionId?: string | null;
  /**
   * Event-specific metadata
   */
  metadata?: EventMetadata;
  /**
   * Platform information
   */
  platform?: Platform;
};

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
   * Interval in milliseconds between automatic flushes (default: 5000)
   */
  flushInterval?: number;
  /**
   * Maximum number of events before auto-flush (default: 10)
   */
  maxBatchSize?: number;
  /**
   * Maximum retry attempts for failed requests (default: 3)
   */
  maxRetries?: number;
};

/**
 * Configuration for the Dispatcher.
 */
export type DispatcherConfig = {
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
};

/**
 * HTTP response structure.
 */
export type HttpResponse = {
  /**
   * Whether the request was successful (2xx status)
   */
  ok: boolean;
  /**
   * HTTP status code
   */
  status: number;
  /**
   * Response data if available
   */
  data?: unknown;
};
