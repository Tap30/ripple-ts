---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Fix: Add comprehensive error handling for storage operations.

- Wrap all storage adapter operations (`save()`, `load()`, `clear()`) in try-catch blocks
- Log storage errors via logger adapter instead of throwing unhandled rejections
- Handle errors during enqueue, flush, restore, and retry operations
- Support both Error objects and non-Error values in error logging
- Prevent application crashes from storage failures (QuotaExceededError, SecurityError, etc.)
