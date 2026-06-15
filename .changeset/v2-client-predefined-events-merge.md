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

##### New convenience methods on `Client`

- `identify(userId, traits)` — tracks a `user_identified` event
- `clicked(payload)` — tracks a `clicked` event
- `viewed(payload)` — tracks a `viewed` event
