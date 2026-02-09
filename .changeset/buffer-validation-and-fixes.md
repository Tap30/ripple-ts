---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

- Fix: Apply `maxBufferSize` limit during restore from storage to prevent silent event loss
- Fix: Preserve original error type in IndexedDB adapter for proper QuotaExceededError retry handling
- Feat: Add runtime validation warning when `maxBufferSize < maxBatchSize`
- Test: Add comprehensive storage quota error handling test coverage
