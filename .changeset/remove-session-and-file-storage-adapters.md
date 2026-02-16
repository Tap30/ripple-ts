---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

Remove SessionStorageAdapter, CookieStorageAdapter from browser package and FileStorageAdapter from node package. These adapters are no longer exported or available. For browser, use LocalStorageAdapter or IndexedDBAdapter instead. For node, use NoOpStorageAdapter or implement a custom storage adapter.
