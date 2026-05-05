---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

**Fixes & Improvements in IndexedDBAdapter:**

- **Improved Transaction Error Handling:** Added explicit fallback error messages (`"Transaction failed"`, `"Transaction aborted"`) for edge cases where the browser's IndexedDB `transaction.error` or `request.error` is `null` or `undefined` during `onerror` and `onabort` events.
- **Robust Quota Exceeded Logic:** Ensured `StorageQuotaExceededError` is correctly propagated and handled within the retry logic when the browser storage limit is reached.
- **Lifecycle Event Resilience:** Improved cleanup and connection resets during native database lifecycle events (`onclose`, `onabort`, `onversionchange`, `onblocked`).
  