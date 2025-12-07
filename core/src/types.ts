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
  payload: EventPayload;
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
