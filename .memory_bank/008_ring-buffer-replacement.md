# 008: Ring Buffer Replacement

**Date:** 2026-06-16 **Status:** Implemented **Scope:**
`internals/core/buffer.ts`, `internals/core/dispatcher.ts`,
`internals/core/client.ts`

## Context

The original `Buffer` was a linked-list FIFO queue with no capacity limit. The
`maxBufferSize` constraint was only enforced at storage-persistence time via
`Dispatcher.#applyBufferLimit()`, which sliced a copy of the buffer array. This
meant the in-memory buffer could grow unbounded if events were enqueued faster
than flushed.

## Decision

Replace the linked-list `Buffer` with a **fixed-capacity ring buffer** that
enforces `maxBufferSize` structurally at enqueue time.

## Key Changes

- `Buffer` constructor now requires a `capacity` argument
- `enqueue()` overwrites the oldest element when at capacity (O(1) eviction)
- `fromArray()` keeps only the last `capacity` items (newest-win)
- `Dispatcher.#applyBufferLimit()` removed entirely — the buffer self-limits
- Default `maxBufferSize` changed from `Number.MAX_SAFE_INTEGER` to `50`

## Tradeoffs

| Aspect         | Before (linked list)   | After (ring buffer)     |
| -------------- | ---------------------- | ----------------------- |
| Memory         | Unbounded growth       | Fixed at capacity       |
| Enqueue        | O(1), no eviction      | O(1), auto-evict oldest |
| Dequeue        | O(1)                   | O(1)                    |
| toArray        | O(n) pointer chase     | O(n) contiguous read    |
| Cache locality | Poor (scattered nodes) | Good (array-backed)     |
| Allocation     | Per-enqueue node alloc | Pre-allocated array     |

## Why 50 as Default

- Batch size is 10 by default, so 50 = 5 batches of headroom
- Prevents excessive memory use in constrained environments (mobile browsers)
- Users can override via `config.maxBufferSize` if they need more

## API (unchanged surface)

```ts
const buffer = new Buffer<T>(capacity);
buffer.enqueue(value); // auto-evicts oldest if full
buffer.dequeue(); // returns null if empty
buffer.toArray(); // FIFO order
buffer.fromArray(items); // truncates to capacity, keeps newest
buffer.clear();
buffer.size();
buffer.isEmpty();
```
