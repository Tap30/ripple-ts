---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Fix race condition between enqueue and flush causing stale storage state.

Introduced a dedicated storage mutex that serializes storage I/O without blocking buffer mutations or network requests. Previously, an enqueue's `storage.save()` could interleave with flush's `storage.clear()`, causing already-sent events to persist in storage and replay on next initialization.
