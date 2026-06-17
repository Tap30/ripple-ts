---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

Schema versioning and `client.events` namespace for predefined CDP events.

#### Breaking Changes

##### `schemaVersion` removed from convenience methods

`identify()`, `clicked()`, `viewed()`, and `screen()` no longer accept a
`schemaVersion` parameter. The SDK auto-manages it via `PREDEFINED_SCHEMA_VERSION`.

##### `track()` without `schemaVersion` now sends `null`

Previously undefined behavior — now explicitly `null` on the event.

#### New Features

##### `client.events.*` namespace

Typed methods for all predefined CDP events with auto-managed schema version:

```ts
await client.events.productViewed({ product: { ... } });
await client.events.orderCompleted({ order: { ... } });
await client.events.paymentCaptured({ payment: { ... } });
```

##### `PREDEFINED_SCHEMA_VERSION` constant

Exported from `@internals/core` — value `"1"`. Shared across all Ripple SDKs.
