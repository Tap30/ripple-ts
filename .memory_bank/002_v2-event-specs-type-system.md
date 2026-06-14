# V2 Event Specs & Type System

**Date:** June 10, 2026 **Status:** In Progress

## Context

Ripple SDK V2 shifts focus from generic event tracking to **CDP (Customer Data
Platform) integration** with predefined event specifications. The goal is to
provide standardized event schemas for ecommerce platforms while maintaining the
flexibility for custom events and full type safety.

## Key Architectural Decisions

### 1. Separation of Concerns: event-specs.ts

**Decision:** Create a dedicated `internals/core/event-specs.ts` file for all
CDP-related event payloads and type mappings, separate from core infrastructure
types.

**Rationale:**

- **Clarity:** Core types (`Event`, `Platform`, `HttpResponse`) vs
  domain-specific types (product, order, payment payloads)
- **Maintainability:** Event specifications can evolve independently from SDK
  infrastructure
- **Discoverability:** Developers can find all predefined events in one place

**Structure:**

```
internals/core/
├── types.ts         # Core SDK types (Event, Platform, shared domain types)
├── event-specs.ts   # All predefined event payloads + PredefinedEvents map
└── index.ts         # Public exports
```

### 2. Predefined Event Coverage

**Decision:** Implement comprehensive CDP event specs covering the full
ecommerce funnel — industry-standard names aligned with common CDP platforms
(Segment, Amplitude, Mixpanel).

**Rationale:**

- Covers complete purchase funnel from discovery to post-purchase
- Enables out-of-the-box analytics dashboards and funnels

> See `internals/core/event-specs.ts` → `PredefinedEvents` for the full list.

### 3. Shared Domain Types

**Decision:** Define reusable domain types in `types.ts` that compose into event
payloads.

**Rationale:**

- **Composition over duplication:** Domain types reused across multiple events
- **Type safety:** Strong typing prevents field name typos and ensures
  consistent data shape
- **Single source of truth:** One definition per domain concept

> See `internals/core/types.ts` for all domain type definitions.

### 4. PredefinedEvents Type Map

**Decision:** Create a single `PredefinedEvents` type mapping event names to
payload types, merged with user custom events via `AllEvents<TCustomEvents>`.

**Rationale:**

- **Autocomplete:** IDE suggests valid event names when typing
- **Type safety:** Compiler ensures correct payload shape for each event
- **Merge with custom events:** `PredefinedEvents & TCustomEvents` enables both
  predefined and user-defined events

> See `internals/core/event-specs.ts` → `PredefinedEvents` type.

### 5. Updated Event Structure

**Decision:** Enhance root `Event<TMetadata>` type with CDP-required fields:
`sdk`, `anonymousId`, `eventId`, `schemaVersion`, `userId`. Removed `sessionId`
(moved to platform-specific implementations).

**Rationale:**

- **CDP standard fields:** Align with Segment spec for identity resolution
- **Deduplication:** `eventId` prevents duplicate event processing
- **Schema evolution:** `schemaVersion` supports custom event versioning

> See `internals/core/types.ts` → `Event<TMetadata>` type for the full shape.

### 6. Custom Properties Pattern

**Decision:** Every predefined event payload includes
`customProperties?: Record<string, Primitive>` for extensibility.

**Rationale:**

- **Flexibility:** Users can add domain-specific fields without forking types
- **Type safety:** `Primitive` union prevents complex nested objects
- **Future-proof:** New business requirements don't require SDK updates

## API Design Decisions

### Decided

1. ✅ **Track API:** `client.track(eventName, payload?, schemaVersion?)`
2. ✅ **Identity API:** `client.identify(userId, traits, schemaVersion?)` —
   sends a `user_identified` event
3. ✅ **Click API:** `client.click(payload, schemaVersion?)`
4. ✅ **View API:** `client.view(payload, schemaVersion?)`
5. ✅ **Metadata API:** `client.setMetadata(key, value)` — per-event metadata
   removed from `track()`

### Pending

- Should `screen()` be added and auto-trigger a predefined event?
- Schema version default for predefined events?
- Custom event name collision handling with predefined events?

## Migration Impact

- `Event<TMetadata>` structure changed (see decision #5)
- Generic: `RippleClient<TEvents, TMetadata>` →
  `RippleClient<TCustomEvents, TMetadata>`
- `track()` third parameter changed from metadata to `schemaVersion`
- Major version bump (v2.0.0) with migration guide at `MIGRATION.md`

## References

- Core types: `internals/core/types.ts`
- Event specs: `internals/core/event-specs.ts`
- Client: `internals/core/client.ts`
- Migration guide: `MIGRATION.md`
- V1 architecture: `.memory_bank/001_v1-architecture-foundation.md`
