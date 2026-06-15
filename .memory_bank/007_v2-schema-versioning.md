# V2 Schema Versioning & Events Namespace

**Date:** June 15, 2026 **Status:** Implemented

## Context

Multiple SDKs share predefined event specifications. The gateway validates
payloads against schema versions. Old SDK versions send old schemas — the
gateway needs to know which version to validate against.

## Key Decisions

### 1. PREDEFINED_SCHEMA_VERSION

**Decision:** Single incremental constant `"1"` shared across all predefined
events. Not semver — just a monotonic integer string.

**Location:** `internals/core/event-specs.ts`

**Rationale:**

- All predefined events ship together — one version covers all
- Shared across SDKs — same spec, same version
- Gateway maps `schemaVersion` → expected payload shape from its DB
- Bump on any predefined event schema change, release all SDKs

**Future:** Per-event versions pulled from an event registry at build time.

### 2. `client.events.*` Namespace

**Decision:** Typed convenience methods for all predefined CDP events on
`client.events`. Each method explicitly passes `PREDEFINED_SCHEMA_VERSION`.

**Rationale:**

- Clear separation: `client.events.*` = predefined (SDK-managed schema),
  `client.track()` = custom (user-managed schema)
- Type-safe payloads with autocomplete
- Future-proof for per-event version maps

**Implementation:** `EventsNamespace` class takes a `Client` reference, calls
`client.track(name, payload, PREDEFINED_SCHEMA_VERSION)`.

### 3. Convenience Methods Keep Schema Version Internal

**Decision:** `identify()`, `clicked()`, `viewed()`, `screen()` no longer accept
`schemaVersion` parameter. They always use `PREDEFINED_SCHEMA_VERSION`.

**Rationale:** These are predefined events — the SDK owns the schema version.
Users shouldn't override it.

### 4. `track()` Schema Version Semantics

- `track(name, payload, schemaVersion)` — explicit version (custom events)
- `track(name, payload)` — `schemaVersion: null` on the event
- Predefined events via `client.events.*` or convenience methods always pass
  `PREDEFINED_SCHEMA_VERSION` explicitly

**Gateway behavior:**

- `schemaVersion: "1"` → validate against schema v1
- `schemaVersion: null` → gateway assumes latest (for custom events without
  versioning)

## Usage

```ts
// Predefined events — schema version auto-managed
client.events.productViewed({ product: { ... } });
client.identify("user-123", { email: "..." });
client.screen(); // browser auto-capture

// Custom events — user manages schema version
client.track("custom.event", { foo: "bar" }, "2.0.0");
```

## References

- Schema version constant: `internals/core/event-specs.ts`
- Events namespace: `internals/core/events-namespace.ts`
- Client: `internals/core/client.ts`
