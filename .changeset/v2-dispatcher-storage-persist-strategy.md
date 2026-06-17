---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Fix storage race condition on flush and improve enqueue throughput.

#### Bug Fixes

##### Storage clear race condition

Previously, `flush()` called `storage.clear()` after a successful send. If new events were enqueued during the flush, their persisted state was wiped — causing data loss on crash. Now flush persists the current buffer state (`storage.save(buffer)`) instead of clearing, ensuring newly-enqueued events survive in storage.

#### Improvements

##### Fire-and-forget persistence in enqueue

`enqueue()` no longer awaits the storage write. The in-memory buffer is the source of truth; persistence is a best-effort durability snapshot serialized via mutex. This removes disk I/O from the hot path, improving enqueue throughput.
