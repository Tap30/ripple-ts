---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

Add close() method to StorageAdapter interface for resource cleanup. The close() method is now called automatically during client disposal to properly release storage resources. IndexedDBAdapter implements close() to close database connections, while other adapters provide empty implementations as they don't require cleanup.
