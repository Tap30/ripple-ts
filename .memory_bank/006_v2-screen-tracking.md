# V2 Screen Tracking & Auto-Capture

**Date:** June 14, 2026 **Status:** Implemented

## Context

Screen/page view tracking is a core CDP requirement. Browser environments have
rich context available via DOM APIs that should be auto-captured.

## Key Decisions

### 1. Platform-Specific `screen()` Signatures

**Decision:** `screen()` is implemented on each package's `RippleClient`, not on
the base `Client`.

- **Browser:** `screen(payload?: Partial<ScreenPayload>, schemaVersion?)` — all
  fields optional, auto-captured from DOM
- **Node:** `screen(payload: ScreenPayload, schemaVersion?)` — mandatory, no
  auto-capture available

**Rationale:** The base client has no access to DOM APIs. Auto-capture is a
platform concern, not a core concern.

### 2. Browser Auto-Capture Fields

| Field      | Source                                           |
| ---------- | ------------------------------------------------ |
| `title`    | `document.title`                                 |
| `url`      | `location.href`                                  |
| `pathname` | `location.pathname`                              |
| `referrer` | `document.referrer`                              |
| `search`   | `location.search`                                |
| `keywords` | `<meta name="keywords">` content, split by comma |
| `campaign` | UTM params from `location.search`                |

### 3. Merge Strategy

**Decision:** Auto-captured values are the base. User-provided payload fields
override via spread: `{ ...auto, ...payload }`.

**Rationale:** Users may want to correct or enrich auto-captured data (e.g.,
custom title for SPAs where `document.title` lags).

### 4. Graceful Degradation

All DOM access is guarded with `typeof document/location !== "undefined"`
checks. Returns empty string or `undefined` when APIs unavailable (SSR, web
workers).

## References

- Browser: `packages/browser/src/ripple-client.ts`
- Node: `packages/node/src/ripple-client.ts`
- Payload types: `internals/core/event-specs.ts` → `ScreenPayload`
