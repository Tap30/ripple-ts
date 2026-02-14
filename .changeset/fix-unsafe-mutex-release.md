---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Fix unsafe mutex release that could cause hanging promises during disposal. The mutex now properly resolves all queued tasks before clearing, preventing deadlocks when the dispatcher is disposed.
