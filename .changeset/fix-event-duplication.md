---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

**BREAKING CHANGE:** Fix critical event duplication bug by moving queue limit logic to dispatcher

- Fix: Storage adapters no longer merge events, eliminating exponential duplication bug
- Refactor: `maxBufferSize` moved from storage adapter configs to client/dispatcher config
- Refactor: Storage adapters now simply save what they're given (no merge, no limit logic)
- Feat: Dispatcher applies FIFO eviction before saving to storage
- **Impact:** High-throughput offline scenarios now have linear I/O instead of exponential growth
- **Migration:** Remove `maxBufferSize` from storage adapter constructors and add it to client config instead
