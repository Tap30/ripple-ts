# V2 Event Lifecycle & Build Infrastructure

**Date:** June 14, 2026
**Status:** Implemented

## Context

V2 introduces per-event TTL enforcement at the dispatcher level and automated
SDK info injection at build time.

## Key Decisions

### 1. Event TTL Moved to Dispatcher

**Decision:** Remove `ttl`/`staleThreshold` from storage layer. Add `eventTTL`
to `ClientConfig` → `DispatcherConfig`, enforced at flush time.

**Rationale:**

- Storage is append-only; `load()` only runs at `init()` — stale events would
  never be filtered during a long session
- Dispatcher owns event lifecycle and flush cadence — the natural enforcement
  point
- Filtering at flush time catches events that aged out during offline/retry
  periods

**Implementation:**

- `ClientConfig.eventTTL?: number` (optional, disabled by default)
- `DispatcherConfig.eventTTL: number | null`
- `#filterExpired()` in dispatcher, called in `flush()` before `#createBatches()`
- Events where `Date.now() - event.issuedAt > eventTTL` are dropped silently

### 2. Build-Time SDK Info Injection

**Decision:** Each package's `SDK_NAME` and `SDK_VERSION` are injected at build
time from `package.json`, not hardcoded or imported from core.

**Rationale:**

- Each package has its own name/version (`@tapsioss/ripple-browser`, etc.)
- Core can't know which package is consuming it at runtime
- `_getSdkInfo()` made abstract on `Client`, implemented by each `RippleClient`

**Implementation:**

- `scripts/inject-sdk-info.ts` — finds `__sdk_build_info__.ts` files via globby,
  writes `SDK_NAME`/`SDK_VERSION` from adjacent `package.json`
- Build order: `build:inject-sdk-info` → `build:packages` (via `run-s`)
- Each `RippleClient` implements `protected _getSdkInfo(): SdkInfo`

## References

- Dispatcher: `internals/core/dispatcher.ts`
- Client: `internals/core/client.ts`
- Build script: `scripts/inject-sdk-info.ts`
- Build info files: `packages/*/src/__sdk_build_info__.ts`
