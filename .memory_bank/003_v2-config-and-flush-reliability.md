# V2 Client Configuration & Flush Reliability

**Date:** June 14, 2026 **Status:** In Progress

## Context

V2 restructures the client configuration from flat fields into logical groupings
and fixes a potential data loss issue in the flush rebatching logic.

## Key Architectural Decisions

### 1. Structured Configuration Objects

**Decision:** Replace flat config fields (`flushInterval`, `maxBatchSize`,
`maxRetries`) with nested `batchOptions` and `retryOptions`.

**Before (v1):**

```ts
{
  flushInterval: 5000,
  maxBatchSize: 10,
  maxRetries: 3,
}
```

**After (v2):**

```ts
{
  batchOptions: {
    interval: 10000,     // was flushInterval (default changed to 10s)
    size: 10,            // was maxBatchSize
    maxPayloadSize: 65536, // NEW: 64KB per batch
  },
  retryOptions: {
    maxAttempts: 3,      // was maxRetries
    minDelay: 1000,      // NEW: base delay for backoff
    maxDelay: 360000,    // NEW: cap for backoff (6 min)
    backoffFactor: 2,    // NEW: exponential multiplier
  },
}
```

**Rationale:**

- Logical grouping improves readability and discoverability
- New fields (payload size, backoff params) fit naturally into groups
- Same types shared between `ClientConfig` (optional) and `DispatcherConfig`
  (required, with defaults applied)

**Location:** Types defined in `dispatcher.ts`, re-exported from `client.ts`.

### 2. Payload Size-Based Batching

**Decision:** Add `maxPayloadSize` to batch options. Enforced at flush time via
`#createBatches()`.

**Behavior:**

- Events are batched by BOTH count (`size`) AND serialized byte size
  (`maxPayloadSize`)
- Size calculated via `JSON.stringify(event).length`
- A single event exceeding `maxPayloadSize` is never dropped — sent alone
- NOT enforced at enqueue time (avoids tracking running size)

**Rationale:**

- Prevents oversized HTTP requests that may be rejected by gateways/proxies
- Flush-only enforcement keeps enqueue path fast
- Single-event guarantee prevents data loss for large events

### 3. Stop-on-First-Failure Flush Strategy

**Decision:** If any batch send fails (after exhausting retries), immediately
requeue that batch + all remaining unsent batches and abort the flush.

**Before (v1 — data loss risk):**

```
flush():
  batches = [A, B, C]
  send(A) → fails → requeueEvents(A)   // A back in buffer
  send(B) → fails → requeueEvents(B)   // B prepended to buffer = [B, A] ← ORDER INVERTED
  send(C) → succeeds                   // C sent despite A,B failing
```

**After (v2 — safe):**

```
flush():
  batches = [A, B, C]
  send(A) → fails → requeue([A, B, C]) → return  // All preserved in order
```

**Rationale:**

- Single endpoint: if one batch fails (5xx/network), others likely will too
- Preserves strict FIFO ordering
- No partial sends with ordering gaps
- `#sendWithRetry` returns `boolean` — `true` = success/non-retryable, `false` =
  exhausted retries

### 4. `calculateBackoff` Parameterization

**Decision:** Make backoff parameters configurable instead of hardcoded.

**Signature:** `calculateBackoff(attempt, minDelay, maxDelay, backoffFactor)`

**Formula:**
`min(minDelay × backoffFactor^attempt, maxDelay) + jitter(0-1000ms)`

**Note:** `minDelay`/`maxDelay` bound the exponential component only, not the
final result (jitter can push slightly above `maxDelay`). This is intentional to
preserve jitter effectiveness at the cap.

### 5. `TCustomEvents` Generic & `_trackInternal`

**Decision:** The `Client` class generic `TCustomEvents` is used only by
`track()`. Predefined events are sent via `_trackInternal()` which delegates to
`track()` with type assertions.

**Rationale:**

- `track()` only covers user-defined custom events — clean generic constraint
- Predefined events bypass the constraint via
  `_trackInternal(name, payload, schemaVersion)`
- No `AllEvents` merge type needed — simpler type system
- `EventsNamespace` and convenience methods use `_trackInternal`

## Migration Impact

- `flushInterval` → `batchOptions.interval` (default changed: 5000 → 10000)
- `maxBatchSize` → `batchOptions.size`
- `maxRetries` → `retryOptions.maxAttempts`
- New options: `batchOptions.maxPayloadSize`, `retryOptions.minDelay`,
  `retryOptions.maxDelay`, `retryOptions.backoffFactor`
- `DispatcherConfig` now uses `batchOptions: Required<BatchOptions>` and
  `retryOptions: Required<RetryOptions>`
- `#sendWithRetry` returns `Promise<boolean>` instead of `Promise<void>`

## Additional Decisions (June 14, 2026)

### Browser Identity Rework

- `SessionManager` renamed to `IdentityManager` (manages `anonymousId`, not
  sessions)
- `getSessionId()` removed from browser client, replaced by inherited
  `getAnonymousId()`
- Anonymous ID persisted in `sessionStorage` (survives page reloads, cleared on
  tab close)
- Default storage key: `"ripple_session"`
- `ua-parser-js` moved from `peerDependencies` to `dependencies`

### Adapter Consolidation

- Isomorphic `HttpClient` in `internals/core/http-client.ts` replaces
  per-package `FetchHttpAdapter`
- `httpAdapter` optional in `ClientConfig` — defaults to `HttpClient`
- Only `storageAdapter` remains required
- Logger renames: `ConsoleLoggerAdapter` → `ConsoleLogger`, `NoOpLoggerAdapter`
  → `NoOpLogger`
- Package-specific `FetchHttpAdapter` files removed

## References

- Client config: `internals/core/client.ts`
- Dispatcher: `internals/core/dispatcher.ts`
- Backoff utility: `internals/core/utils.ts`
- Previous decisions: `.memory_bank/002_v2-event-specs-type-system.md`
