# V2 Telemetry & Monitoring Hooks

**Date:** June 14, 2026 **Status:** Implemented

## Context

Production debugging requires visibility into SDK internals without modifying
source code or adding custom instrumentation.

## Key Decisions

### 1. Fire-and-Forget Hooks

**Decision:** Provide sync-only callback hooks on `ClientConfig.hooks`.

**Hooks:**

- `onFlush` — batch count and event count at flush time
- `onSendSuccess` — batch size and HTTP status on success
- `onSendFailure` — batch size, error message, attempt number on final failure
- `onRetry` — attempt number and calculated delay before retry
- `onDrop` — event count and reason (`"expired"` | `"sampled"` |
  `"client_error"`)
- `onEnqueue` — current buffer size after enqueue

**Rationale:**

- Sync-only prevents hooks from blocking the event pipeline
- Users wire to their own monitoring (Datadog, Sentry, etc.)

### 2. Automatic Telemetry Reporting

**Decision:** `telemetryOptions: { disabled: boolean; endpoint: string }` on
`ClientConfig`. When enabled, wraps user hooks with auto-reporting to the
endpoint.

**Implementation:**

- `createTelemetryHooks()` merges user hooks with telemetry reporter
- Uses configured `apiKey`/`apiKeyHeader` for auth
- Fire-and-forget `fetch` with `keepalive: true`
- Never throws — silently drops on failure

### 3. Type-Safe Event Map

**Decision:** `TelemetryEventMap` maps event names to payload types, used to
type the internal `report()` function.

```ts
type TelemetryEventMap = {
  sdk_event_flush: FlushInfo;
  sdk_event_send_success: SendSuccessInfo;
  sdk_event_send_failure: SendFailureInfo;
  sdk_event_retry: RetryInfo;
  sdk_event_drop: DropInfo;
  sdk_event_enqueue: EnqueueInfo;
};
```

**Rationale:** Compile-time guarantee that each telemetry event name maps to its
correct payload shape.

## Architecture

```
ClientConfig.hooks (user)  ──┐
                              ├─ createTelemetryHooks() ──► merged hooks
ClientConfig.telemetryOptions ┘                               │
                                                              ├─ Client (onDrop for sampled)
                                                              └─ Dispatcher (all other hooks)
```

## References

- Telemetry types: `internals/core/telemetry.ts`
- Client: `internals/core/client.ts`
- Dispatcher: `internals/core/dispatcher.ts`
