---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

Restructure client configuration and fix flush rebatching data loss.

#### Breaking Changes

##### Configuration restructured into `batchOptions` and `retryOptions`

Flat config fields replaced with nested option objects:

```diff
 const client = new RippleClient({
   apiKey: "your-api-key",
   endpoint: "https://api.example.com/events",
-  flushInterval: 5000,
-  maxBatchSize: 10,
-  maxRetries: 3,
+  batchOptions: {
+    interval: 10000,
+    size: 10,
+    maxPayloadSize: 65536,
+  },
+  retryOptions: {
+    maxAttempts: 3,
+    minDelay: 1000,
+    maxDelay: 360000,
+    backoffFactor: 2,
+  },
   httpAdapter: new FetchHttpAdapter(),
   storageAdapter: new IndexedDBAdapter(),
 });
```

##### Default flush interval changed from 5000ms to 10000ms

#### New Features

##### `batchOptions.maxPayloadSize`

Batches are now split by both event count and serialized byte size (default 64KB). Prevents oversized HTTP requests rejected by gateways/proxies.

##### Full retry backoff control

New configurable parameters: `retryOptions.minDelay`, `retryOptions.maxDelay`, `retryOptions.backoffFactor`.

#### Bug Fixes

##### Flush rebatching data loss and ordering inversion

Fixed: when multiple batches failed during flush, `#requeueEvents` was called per-batch causing ordering inversion (`[B, A]` instead of `[A, B]`). The dispatcher now stops on first failure and requeues the failed batch + all remaining unsent batches in original order.
