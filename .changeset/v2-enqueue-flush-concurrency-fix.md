---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Fix race condition between enqueue and flush, and optimize flush memory footprint.

#### Bug Fixes

##### Enqueue/flush storage race condition

Introduced a dedicated storage mutex that serializes storage I/O without blocking buffer mutations or network requests. Previously, an enqueue's `storage.save()` could interleave with flush's `storage.clear()`, causing already-sent events to persist in storage and replay on next initialization.

#### Improvements

##### Streaming flush with O(1) peak memory per batch

Flush now drains the buffer incrementally via `dequeue()`, building and sending one batch at a time. This replaces the previous approach of `toArray()` + `filterExpired()` + `createBatches()` + iterating all batches, which allocated ~3× buffer size in intermediate arrays. Peak memory is now ~1 batch size regardless of total buffer contents.
