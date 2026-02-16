---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Fix race condition in `init()` when called multiple times after `dispose()`. Previously, if `restore()` took longer to complete, concurrent `init()` calls could reset the mutex while it was actively being used, potentially corrupting the initialization process.
