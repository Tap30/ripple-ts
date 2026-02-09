---
"@tapsioss/ripple-browser": minor
---

- Feat: Add static `isAvailable()` method to all storage adapters for detecting storage availability before instantiation.
- Fix: Implement atomic read-write transactions in IndexedDBAdapter to prevent race conditions across tabs.
- Fix: Add connection lifecycle handlers (onclose, onversionchange) to IndexedDBAdapter for automatic reconnection.
- Fix: Support graceful degradation when storage is unavailable (private browsing, disabled storage, quota exceeded).
