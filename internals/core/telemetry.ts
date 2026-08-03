import { Buffer } from "./buffer.ts";
import { PREDEFINED_SCHEMA_VERSION } from "./event-specs.ts";
import type { Event, Platform, SdkInfo } from "./types.ts";
import { IdGenerator } from "./utils.ts";

/**
 * Maximum number of telemetry events buffered before oldest are evicted.
 */
const TELEMETRY_BUFFER_CAPACITY = 50;

/**
 * Default flush interval in milliseconds (10 seconds).
 */
const DEFAULT_FLUSH_INTERVAL = 10 * 1000;

/**
 * Information provided to the onFlush hook.
 */
export type FlushInfo = {
  eventCount: number;
  batchCount: number;
};

/**
 * Information provided to the onSendSuccess hook.
 */
export type SendSuccessInfo = {
  batchSize: number;
  status: number;
};

/**
 * Information provided to the onSendFailure hook.
 */
export type SendFailureInfo = {
  batchSize: number;
  error: string;
  attempt: number;
};

/**
 * Information provided to the onRetry hook.
 */
export type RetryInfo = {
  attempt: number;
  delay: number;
};

/**
 * Reason an event was dropped.
 */
export type DropReason = "expired" | "sampled" | "client_error";

/**
 * Information provided to the onDrop hook.
 */
export type DropInfo = {
  eventCount: number;
  reason: DropReason;
};

/**
 * Information provided to the onEnqueue hook.
 */
export type EnqueueInfo = {
  bufferSize: number;
};

/**
 * Telemetry hooks for production monitoring.
 * All hooks are fire-and-forget (synchronous).
 */
export type TelemetryHooks = {
  onFlush?: (info: FlushInfo) => void;
  onSendSuccess?: (info: SendSuccessInfo) => void;
  onSendFailure?: (info: SendFailureInfo) => void;
  onRetry?: (info: RetryInfo) => void;
  onDrop?: (info: DropInfo) => void;
  onEnqueue?: (info: EnqueueInfo) => void;
};

/**
 * Configuration for automatic SDK telemetry reporting.
 */
export type TelemetryOptions = {
  /**
   * Disable automatic telemetry reporting.
   */
  disabled?: boolean;
  /**
   * Endpoint to send telemetry data to.
   */
  endpoint: string;
  /**
   * Interval in milliseconds between automatic telemetry flushes.
   * Defaults to 10000 (10 seconds).
   */
  flushInterval?: number;
};

/**
 * Result of creating telemetry hooks, including a dispose function for cleanup.
 */
export type TelemetryHooksResult = {
  hooks: TelemetryHooks;
  dispose: () => void;
};

type CustomTelemetryEventMap = {
  sdk_event_flush: FlushInfo;
  sdk_event_send_success: SendSuccessInfo;
  sdk_event_send_failure: SendFailureInfo;
  sdk_event_retry: RetryInfo;
  sdk_event_drop: DropInfo;
};

type ClientContext = {
  apiKey: string;
  apiKeyHeader: string;
  getUserId: () => string | null;
  getMetadata: () => Record<string, unknown> | null;
  getPlatform: () => Platform | null;
  getSdk: () => SdkInfo;
  getAnonymousId: () => string;
};

/**
 * Creates a merged hooks object that wraps user hooks with auto-telemetry reporting.
 * Telemetry events are buffered in a ring buffer and flushed periodically.
 * If telemetry is disabled or not configured, returns user hooks as-is with a no-op dispose.
 */
export const createTelemetryHooks = (
  userHooks: TelemetryHooks,
  options: TelemetryOptions | null,
  clientCtx: ClientContext,
): TelemetryHooksResult => {
  /* v8 ignore start -- @preserve */
  const {
    endpoint,
    disabled = false,
    flushInterval = DEFAULT_FLUSH_INTERVAL,
  } = options ?? {};

  if (!endpoint || disabled) {
    return {
      hooks: userHooks,
      dispose: () => {},
    };
  }

  const {
    apiKey,
    apiKeyHeader,
    getAnonymousId,
    getPlatform,
    getSdk,
    getMetadata,
    getUserId,
  } = clientCtx;

  const buffer = new Buffer<Event>(TELEMETRY_BUFFER_CAPACITY);

  const flushBuffer = (): void => {
    if (buffer.isEmpty()) return;

    const events = buffer.toArray();

    buffer.clear();

    try {
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [apiKeyHeader]: apiKey,
        },
        body: JSON.stringify({ events }),
        keepalive: true,
      }).catch(() => {});
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // Fire-and-forget — never throw
    }
  };

  const intervalId = setInterval(flushBuffer, flushInterval);

  const dispose = (): void => {
    clearInterval(intervalId);
    flushBuffer();
  };

  const report = <K extends keyof CustomTelemetryEventMap>(
    type: K,
    data: CustomTelemetryEventMap[K],
  ): void => {
    const event: Event = {
      name: type,
      payload: data,
      eventId: IdGenerator.generate(),
      issuedAt: Date.now(),
      schemaVersion: PREDEFINED_SCHEMA_VERSION,
      userId: getUserId(),
      metadata: getMetadata(),
      anonymousId: getAnonymousId(),
      platform: getPlatform(),
      sdk: getSdk(),
    };

    buffer.enqueue(event);
  };

  const hooks: TelemetryHooks = {
    onFlush: info => {
      report("sdk_event_flush", info);

      userHooks.onFlush?.(info);
    },
    onSendSuccess: info => {
      report("sdk_event_send_success", info);

      userHooks.onSendSuccess?.(info);
    },
    onSendFailure: info => {
      report("sdk_event_send_failure", info);

      userHooks.onSendFailure?.(info);
    },
    onRetry: info => {
      report("sdk_event_retry", info);

      userHooks.onRetry?.(info);
    },
    onDrop: info => {
      report("sdk_event_drop", info);

      userHooks.onDrop?.(info);
    },
    onEnqueue: info => {
      userHooks.onEnqueue?.(info);
    },
  };

  return { hooks, dispose };
  /* v8 ignore stop */
};
