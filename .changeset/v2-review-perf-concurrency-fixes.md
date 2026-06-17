---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Performance, memory, and concurrency improvements from code review.

#### Performance

- **IndexedDB save:** Replace atomic read-write with direct `put` (removes unnecessary `get` request per save).
- **MetadataManager:** Cache a frozen snapshot on read, invalidate on `set()` — eliminates per-event shallow copy.
- **Buffer.clear():** Remove unnecessary `Array.fill(undefined)` — resetting head/length is sufficient.
- **HttpClient:** Skip `response.json()` on 204 No Content responses.
- **delay utility:** Clean up abort listener on natural resolve to prevent listener accumulation.

#### Bug Fixes

- **Mutex.release():** Reject queued tasks with `MutexDisposedError` instead of resolving them concurrently, preventing interleaved writes during shutdown.

#### Refactoring

- **Dispatcher `#requeueBatch`:** Simplified to use `#persistBuffer()`, eliminating duplicated error handling and reducing buffer allocations from 3 to 2.
