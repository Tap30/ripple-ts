import { PREDEFINED_SCHEMA_VERSION } from "./event-specs.ts";
import type { Event } from "./types.ts";
import { IdGenerator } from "./utils.ts";

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
};

type CustomTelemetryEventMap = {
  sdk_event_flush: FlushInfo;
  sdk_event_send_success: SendSuccessInfo;
  sdk_event_send_failure: SendFailureInfo;
  sdk_event_retry: RetryInfo;
  sdk_event_drop: DropInfo;
  sdk_event_enqueue: EnqueueInfo;
};

type ClientContext = {
  apiKey: string;
  apiKeyHeader: string;
  getUserId: () => string | null;
  getMetadata: () => Record<string, unknown> | null;
} & Pick<Event, "anonymousId" | "platform" | "sdk">;

/**
 * Creates a merged hooks object that wraps user hooks with auto-telemetry reporting.
 * If telemetry is disabled or not configured, returns user hooks as-is.
 */
export const createTelemetryHooks = (
  userHooks: TelemetryHooks,
  options: TelemetryOptions | null,
  clientCtx: ClientContext,
): TelemetryHooks => {
  /* v8 ignore start -- @preserve */
  const { disabled = false, endpoint } = options ?? {};

  if (!endpoint || disabled) return userHooks;

  const {
    apiKey,
    apiKeyHeader,
    anonymousId,
    platform,
    sdk,
    getMetadata,
    getUserId,
  } = clientCtx;

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
      anonymousId,
      platform,
      sdk,
    };

    try {
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [apiKeyHeader]: apiKey,
        },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => {});
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // Fire-and-forget — never throw
    }
  };

  return {
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
      report("sdk_event_enqueue", info);

      userHooks.onEnqueue?.(info);
    },
  };
  /* v8 ignore stop */
};
