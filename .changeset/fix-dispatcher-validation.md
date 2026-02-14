---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

BREAKING CHANGE: Add validation to prevent invalid Dispatcher configuration

The Dispatcher constructor now throws an error if `maxBufferSize < maxBatchSize`. This configuration was previously allowed but would cause events to be dropped unnecessarily since the batch size could never be reached.

If you're using this configuration, update it to ensure `maxBufferSize >= maxBatchSize`:

```diff
const dispatcher = new Dispatcher({
  maxBatchSize: 100,
- maxBufferSize: 50,  // Invalid - will throw error
+ maxBufferSize: 100, // Valid - buffer can hold at least one full batch
});
```
