---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

Replace in-memory event buffer with a fixed-capacity ring buffer.

#### Breaking Changes

##### `maxBufferSize` default changed from unlimited to `50`

The buffer now enforces its capacity structurally — oldest events are automatically evicted when the limit is reached. Previously, the limit was only applied when persisting to storage, allowing unbounded in-memory growth.

If you rely on buffering more than 50 events in memory, set `maxBufferSize` explicitly:

```ts
const client = new RippleClient({
  // ...
  maxBufferSize: 200,
});
```

#### Improvements

##### Ring buffer with O(1) eviction

The internal buffer is now array-backed with fixed allocation, providing:

- Bounded memory usage regardless of enqueue rate
- O(1) enqueue with automatic FIFO eviction when full
- Better cache locality compared to the previous linked-list implementation
