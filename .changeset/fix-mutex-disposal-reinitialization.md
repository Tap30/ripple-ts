---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Fix mutex disposal to properly reject new acquisitions and support reinitialization. The mutex now throws `MutexDisposedError` when attempting to acquire a disposed mutex, preventing silent failures. Added `reset()` method to allow mutex reuse after disposal, enabling proper client and dispatcher reinitialization workflows.
