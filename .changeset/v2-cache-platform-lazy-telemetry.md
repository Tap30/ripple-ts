---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Cache platform and SDK info, use lazy telemetry context.

#### Performance

- Cache `_getPlatform()` result instead of parsing UA on every `track()` call (browser).
- Return a module-level constant from `_getSdkInfo()` instead of allocating per call.

#### Refactor

- Telemetry context now uses lazy getters (`getPlatform`, `getSdk`, `getAnonymousId`) instead of eagerly resolving values in the `Client` constructor. This fixes a private field access error when subclass fields aren't installed during `super()` and ensures telemetry events capture current state at report time.
