---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

Merge predefined CDP events into the `Client` generic type system.

#### Breaking Changes

##### `track()` now includes predefined events without explicit declaration

Previously users had to redeclare predefined event types in their `TEvents` to get type safety. Now `PredefinedEvents` are always merged:

```diff
-type MyEvents = {
-  product_viewed: ProductViewedPayload; // no longer needed
-  "feature.enabled": { featureName: string };
-};
+type MyCustomEvents = {
+  "feature.enabled": { featureName: string };
+};
```

#### New Features

##### `AllEvents<TCustomEvents>` type export

A new exported utility type merges predefined and custom events:

```ts
type AllEvents<TCustomEvents extends Record<string, EventPayload>> =
  PredefinedEvents & TCustomEvents;
```

##### New convenience methods on `Client`

- `identify(userId, traits, schemaVersion?)` — tracks a `user_identified` event
- `click(payload, schemaVersion?)` — tracks a `clicked` event
- `view(payload, schemaVersion?)` — tracks a `viewed` event
