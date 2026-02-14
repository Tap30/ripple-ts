---
"@tapsioss/ripple-browser": patch
---

Fix inconsistent error handling in storage adapters. Changed from `Promise.reject()` to `throw` for consistent async/await error handling in LocalStorageAdapter, SessionStorageAdapter, and CookieStorageAdapter.
