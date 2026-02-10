---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

Improved initialization behavior with automatic pre-init operation queuing

Previously, calling `track()` before `init()` would throw an error. Now, track operations are automatically queued and processed after initialization completes.

**What changed:**

- `track()` no longer throws an error when called before `init()`
- Operations are queued using a mutex and executed after `init()` completes
- `init()` can be called multiple times safely (subsequent calls are no-ops)

**Migration:**
No code changes required. Existing code continues to work. You can now safely call `track()` before `init()` if needed, and the SDK will handle queuing automatically.

**Benefits:**

- Better developer experience - no need to ensure strict initialization order
- Prevents race conditions
- Thread-safe operation queuing
  