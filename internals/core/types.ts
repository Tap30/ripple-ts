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
