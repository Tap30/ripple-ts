---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

Add batching to internal telemetry reporting. Telemetry events are now buffered in a ring buffer (capacity 50) and flushed periodically instead of sending one HTTP request per event. A new `flushInterval` option is available in `TelemetryOptions` (defaults to 10 seconds). Data loss on crash is acceptable — no persistence layer is used.
