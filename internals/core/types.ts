import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";

/**
 * Event payload containing arbitrary key-value pairs.
 */
export type EventPayload = Record<string, unknown>;

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
 * Represents a tracked event with metadata.
 *
 * @template TMetadata The type of metadata attached to events
 */
export type Event<TMetadata = Record<string, unknown>> = {
  /**
   * Event name/identifier
   */
  name: string;
  /**
   * Event data payload
   */
  payload: EventPayload | null;
  /**
   * Event metadata (includes both shared and event-specific metadata)
   */
  metadata: TMetadata | null;
  /**
   * Unix timestamp in milliseconds
   */
  issuedAt: number;
  /**
   * Session identifier (browser only)
   */
  sessionId: string | null;
  /**
   * Platform information
   */
  platform: Platform | null;
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
   * Header name for API key (default: "X-API-Key")
   */
  apiKeyHeader?: string;
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
  /**
   * Custom adapters for HTTP and storage
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
  };
};

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
