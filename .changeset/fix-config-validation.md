---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Add validation for negative configuration values. The client constructor now throws errors when `flushInterval`, `maxBatchSize`, or `maxBufferSize` are zero or negative, or when `maxRetries` is negative.
