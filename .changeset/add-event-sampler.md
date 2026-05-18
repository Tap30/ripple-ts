---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

Add `eventSampler` config option to allow filtering events before they are enqueued.

The sampler is a synchronous function that receives the fully-constructed event and returns `true` to keep it or `false` to drop it. When omitted, all events are enqueued (default behavior unchanged).

```ts
const client = new RippleClient({
  // sample 50% of events
  eventSampler: (event) => Math.random() < 0.5,
});
```
