# 009: Dispatcher Concurrency Fix and Streaming Flush

**Date:** 2026-06-17 **Status:** Implemented **Scope:**
`internals/core/dispatcher.ts`

## Context

Two problems existed in the Dispatcher:

1. **Enqueue/flush storage race:** `enqueue()` awaits `storage.save()` without
   synchronization, while `flush()` calls `storage.clear()` inside its mutex. If
   flush runs between enqueue's buffer add and its storage save, the stale
   snapshot overwrites the cleared storage, causing event replay on next init.

2. **Flush memory overhead:** `flush()` called `toArray()` (full copy),
   `filterExpired()` (second array), `createBatches()` (array of arrays), then
   on failure `slice().flat()` — allocating ~3× buffer size in intermediaries.

3. **Clear-after-send data loss:** `flush()` called `storage.clear()` after a
   successful send. Events enqueued _during_ flush had their persisted state
   wiped, causing data loss if the app crashed before the next persist.

## Decisions

### Storage Mutex (concurrency)

Introduced `#storageMutex` that serializes all storage I/O. Buffer mutations
remain synchronous and unblocked (JS single-threaded guarantees atomicity for
sync ops). This avoids blocking enqueue on the full flush lifecycle while
preventing storage state divergence.

### Streaming Flush (memory)

Replaced batch-then-iterate with incremental drain:

- `dequeue()` one event at a time (no `toArray()` copy)
- Filter expired inline during drain (no separate `filterExpired()` pass)
- Build one batch at a time, send when full (no `createBatches()` array)
- On mid-loop failure: requeue failed batch + current event + remaining buffer

### Persist-not-clear strategy

Replaced `#clearStorage()` with `#persistBuffer()`. After a successful (or
dropped) send, storage is overwritten with the _current_ buffer state rather
than cleared. This ensures events enqueued during flush remain persisted.

### Fire-and-forget enqueue persistence

`enqueue()` calls `void this.#persistBuffer()` — the in-memory buffer is the
source of truth; disk persistence is a best-effort durability snapshot. The
mutex serializes writes to prevent stale overwrites without blocking callers.

Post-send persistence in `#handleResponse` is _awaited_ because storage must
reflect the drained buffer before flush completes — otherwise a crash + restore
would re-send already-delivered events.

## Key Invariant

On mid-loop send failure, the current event (already dequeued, triggered the
overflow check) must be included in the requeue alongside the failed batch.
Remaining buffer events are still in the ring buffer and get prepended via
`#requeueBatch`.

## Tradeoffs

| Aspect              | Before               | After                             |
| ------------------- | -------------------- | --------------------------------- |
| Peak flush memory   | ~3× buffer size      | ~1 batch size                     |
| Enqueue latency     | Blocked on storage   | Fire-and-forget (non-blocking)    |
| Post-send storage   | `clear()` (racy)     | `save(buffer)` (crash-safe)       |
| Storage consistency | Racy                 | Mutex-serialized                  |
| Code complexity     | Simple batch-iterate | Streaming loop with inline filter |

## Mutex Architecture

```
#flushMutex    — serializes flush operations (prevents concurrent flushes)
#storageMutex  — serializes storage I/O (prevents enqueue/flush storage races)
```

Both are reset on `restore()` and released on `dispose()`. `MutexDisposedError`
is caught in `#persistBuffer` and `#requeueBatch` to handle disposal during
in-flight flush gracefully.
