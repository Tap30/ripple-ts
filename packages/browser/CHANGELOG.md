# @tapsioss/ripple-browser

## 2.1.0
### Minor Changes



- [`591d1e2`](https://github.com/Tap30/ripple-ts/commit/591d1e23a2fec0955d2cd9ea3a575999778282ce) Thanks [@mimshins](https://github.com/mimshins)! - Add missing `customProperties` to event specs.


### Patch Changes



- [#41](https://github.com/Tap30/ripple-ts/pull/41) [`8f7d6f8`](https://github.com/Tap30/ripple-ts/commit/8f7d6f89e547340cd67addfe13a7228a23bae074) Thanks [@mimshins](https://github.com/mimshins)! - Update user address traits to be consistent with `Address` type.



- [`63a7602`](https://github.com/Tap30/ripple-ts/commit/63a76025ebb9e13b40ffa250a4237e233f804501) Thanks [@mimshins](https://github.com/mimshins)! - Refactor cart-related event payloads to use a new `Cart` type and fix `Shipping.price` type.
  
  **Changes:**
  
  - `CartModificationPayload`: replaced `cartId?: string` with `cart: Cart`.
  - `CartViewedPayload`: replaced `cartId?: string` and `products: Product[]` with `cart: Cart`.
  - `CartEmptiedPayload`: replaced `cartId?: string` and `products: Product[]` with `cart: Cart`.
  - `Shipping.price`: changed from `number` to `Money`.
  
  **Added:**
  
  - New `Cart` type with `cartId` and `products` fields.
  - Exported `Cart` type from both browser and node packages.

## 2.0.0
### Major Changes



- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Consolidate HTTP and logger adapters into core.
  
  #### Breaking Changes
  
  ##### `FetchHttpAdapter` removed from packages
  
  The package-specific `FetchHttpAdapter` exports have been removed. The built-in
  `HttpClient` from core is now used by default — no adapter needed in config.
  
  ```diff
  -import { FetchHttpAdapter } from "@tapsioss/ripple-browser";
  -
   const client = new RippleClient({
     apiKey: "your-api-key",
     endpoint: "https://api.example.com/events",
  -  httpAdapter: new FetchHttpAdapter(),
     storageAdapter: new IndexedDBAdapter(),
   });
  ```
  
  For custom HTTP implementations, pass `httpAdapter` with your own `HttpAdapter`.
  
  ##### Logger class renames
  
  - `ConsoleLoggerAdapter` → `ConsoleLogger`
  - `NoOpLoggerAdapter` → `NoOpLogger`
  
  #### New Features
  
  ##### `httpAdapter` is now optional
  
  The built-in isomorphic `HttpClient` (fetch-based with `keepalive`) is used by
  default. Only `storageAdapter` remains required.
  
  ##### `HttpClient` exported from both packages
  
  ```ts
  import { HttpClient } from "@tapsioss/ripple-browser";
  import { HttpClient } from "@tapsioss/ripple-node";
  ```


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Replace session-based identity with persistent anonymous ID.
  
  #### Breaking Changes
  
  ##### `getSessionId()` removed, replaced by `getAnonymousId()`
  
  The browser client no longer exposes a session ID. Instead, an anonymous ID is
  persisted in `sessionStorage` and used for cross-event identity resolution.
  
  ```diff
  -const sessionId = client.getSessionId();
  +const anonymousId = client.getAnonymousId();
  ```
  
  ##### Default `sessionStoreKey` changed
  
  The default storage key changed from `"ripple_session_id"` to
  `"ripple_session"`.
  
  ##### `ua-parser-js` moved from `peerDependencies` to `dependencies`
  
  Users no longer need to install `ua-parser-js` separately — it's now bundled
  as a direct dependency.


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Merge predefined CDP events into the `Client` generic type system.
  
  #### Breaking Changes
  
  ##### `track()` now includes predefined events without explicit declaration
  
  Previously users had to redeclare predefined event types in their `TEvents` to get type safety. Now `PredefinedEvents` are always merged:
  
  ```diff
  -type MyEvents = {
  -  product_viewed: ProductViewedPayload; // no longer needed
  -  "feature.enabled": { featureName: string };
  -};
  +type MyCustomEvents = {
  +  "feature.enabled": { featureName: string };
  +};
  ```
  
  #### New Features
  
  ##### New convenience methods on `Client`
  
  - `identify(userId, traits)` — tracks a `user_identified` event
  - `clicked(payload)` — tracks a `clicked` event
  - `viewed(payload)` — tracks a `viewed` event


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Restructure client configuration and fix flush rebatching data loss.
  
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


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - CDP Event Specifications & Type System Foundation.
  
  #### Breaking Changes
  
  ##### Event Structure Changes**
  
  The root `Event<TMetadata>` type has been significantly updated to align with CDP (Customer Data Platform) standards:
  
  **Added fields:**
  
  - `sdk: SdkInfo` - SDK name and version (auto-injected at build time)
  - `anonymousId: string` - Anonymous user identifier for cross-device tracking
  - `eventId: string` - Unique UUID for event deduplication
  - `schemaVersion: string | null` - Schema version for custom events
  - `userId: string | null` - Authenticated user identifier
  
  **Removed fields:**
  
  - `sessionId: string | null` - Moved to metadata (platform-specific implementation)
  
  **Migration:**
  
  ```diff
   type Event<TMetadata> = {
     name: string;
     payload: EventPayload | null;
     metadata: TMetadata | null;
     platform: Platform | null;
  +  sdk: SdkInfo;
     issuedAt: number;
  -  sessionId: string | null;
  +  anonymousId: string;
  +  eventId: string;
  +  schemaVersion: string | null;
  +  userId: string | null;
   };
  ```
  
  #### New Features
  
  ##### Predefined CDP Events
  
  Added predefined events covering the complete ecommerce funnel with full type safety:
  
  - **Product Discovery:** `product_viewed`, `product_clicked`, `products_searched`, `product_list_viewed`, `product_list_filtered`
  - **Wishlist:** `product_added_to_wishlist`, `product_removed_from_wishlist`
  - **Cart:** `product_added_to_cart`, `product_removed_from_cart`, `cart_viewed`, `cart_emptied`
  - **Checkout:** `checkout_started`, `checkout_step_viewed`, `checkout_step_completed`
  - **Orders:** `order_completed`, `order_failed`, `order_cancelled`, `order_shipped`, `order_refunded`, `order_updated`
  - **Payments:** `payment_authorized`, `payment_captured`, `payment_failed`, `payment_refunded`
  - **Coupons:** `coupon_entered`, `coupon_removed`, `coupon_denied`, `coupon_redeemed`
  - **Promotions:** `promotion_viewed`, `promotion_clicked`
  - **Identity & Lifecycle:** `identify`, `screen`, `app_state_changed`
  
  All predefined events include TypeScript autocomplete and compile-time validation.
  
  #### Shared Domain Types
  
  Added comprehensive domain types for ecommerce tracking:
  
  - `Money` - Amount with ISO 4217 currency code
  - `Product` - Complete product representation with price, category, SKU, vendor
  - `Order` - Order with products, revenue, shipping, tax, discounts, totals
  - `Cart` - Shopping cart with products
  - `Checkout` - Checkout session with step tracking
  - `Payment` - Payment transaction with method, amount, gateway
  - `Coupon` - Discount code with amount
  - `Category`, `Address`, `Shipping` - Supporting types
  - `Pagination`, `Filter`, `Sort` - List navigation
  - `Campaign` - UTM attribution parameters
  
  #### New Module: event-specs.ts
  
  Created `internals/core/event-specs.ts` containing:
  
  - All predefined event payload types
  - `PredefinedEvents` type map for event name → payload type mapping
  - Event-specific types separate from core infrastructure types
  
  #### Type Safety Enhancements
  
  **PredefinedEvents Type Map:**
  
  ```ts
  export type PredefinedEvents = {
    product_viewed: ProductViewedPayload;
    cart_viewed: CartViewedPayload;
    order_completed: OrderCompletedPayload;
    // ... 40 more events
  };
  ```
  
  **Merged Event Types:**
  Custom events will be merged with predefined events:
  
  ```ts
  type CustomEvents = {
    "feature.enabled": { featureName: string };
  };
  
  const client = new RippleClient<CustomEvents, AppMetadata>(config);
  
  // Both predefined and custom events available with autocomplete
  await client.track("product_viewed", { product: {...} });
  await client.track("feature.enabled", { featureName: "dark-mode" }, "1.0.0");
  ```


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Replace in-memory event buffer with a fixed-capacity ring buffer.
  
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


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Schema versioning and `client.events` namespace for predefined CDP events.
  
  #### Breaking Changes
  
  ##### `schemaVersion` removed from convenience methods
  
  `identify()`, `clicked()`, `viewed()`, and `screen()` no longer accept a
  `schemaVersion` parameter. The SDK auto-manages it via `PREDEFINED_SCHEMA_VERSION`.
  
  ##### `track()` without `schemaVersion` now sends `null`
  
  Previously undefined behavior — now explicitly `null` on the event.
  
  #### New Features
  
  ##### `client.events.*` namespace
  
  Typed methods for all predefined CDP events with auto-managed schema version:
  
  ```ts
  await client.events.productViewed({ product: { ... } });
  await client.events.orderCompleted({ order: { ... } });
  await client.events.paymentCaptured({ payment: { ... } });
  ```
  
  ##### `PREDEFINED_SCHEMA_VERSION` constant
  
  Exported from `@internals/core` — value `"1"`. Shared across all Ripple SDKs.


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Consolidate browser storage adapters into `WebStorage` and add `init()` to `StorageAdapter` interface.
  
  #### Breaking Changes
  
  ##### `StorageAdapter` interface now requires `init()` method
  
  All storage adapter implementations must implement `init(): Promise<void>`.
  
  ##### `IndexedDBAdapter`, `LocalStorageAdapter` removed from public exports
  
  These are now internal to `WebStorage`. Use `WebStorage` directly:
  
  ```diff
  -import { IndexedDBAdapter } from "@tapsioss/ripple-browser";
  -const client = new RippleClient({ storageAdapter: new IndexedDBAdapter() });
  +import { WebStorage } from "@tapsioss/ripple-browser";
  +const client = new RippleClient({ storageAdapter: new WebStorage() });
  ```
  
  ##### Storage class renames
  
  - `IndexedDBAdapter` → `IndexedDBStorage` (internal)
  - `LocalStorageAdapter` → `LocalStorage` (internal)
  - `NoOpStorageAdapter` → `NoOpStorage`
  
  #### New Features
  
  ##### `WebStorage` — auto-detecting browser storage
  
  Automatically selects the best available backend (IndexedDB → localStorage → NoOp):
  
  ```ts
  import { WebStorage } from "@tapsioss/ripple-browser";
  
  const client = new RippleClient({
    storageAdapter: new WebStorage(),           // auto-detect
    // or with preferences:
    storageAdapter: new WebStorage({ prefer: "local-storage" }),
  });
  ```
  
  ##### `StorageAdapter.init()` called automatically
  
  The base `Client.init()` now calls `storageAdapter.init()` before restoring events. Custom storage adapters can use this for async setup.
  
  ##### `eventTtl` in client config
  
  Per-event expiry is now handled at the dispatcher level. Events older than `eventTtl` (based on `issuedAt`) are dropped at flush time:
  
  ```ts
  const client = new RippleClient({
    eventTtl: 86400000, // 24 hours
  });
  ```

### Minor Changes



- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Automatic `app_state_changed` tracking and manual `appOpened()`/`appClosed()` methods.
  
  #### New Features
  
  ##### Auto-tracking visibility changes
  
  The browser client automatically tracks `app_state_changed` events when page
  visibility changes (`foreground` ↔ `background`). Starts after `init()`,
  cleaned up on `dispose()`.
  
  ##### `appOpened()` and `appClosed()`
  
  Manual methods to explicitly signal app lifecycle state:
  
  ```ts
  client.appOpened();  // { newState: "opened", previousState: ... }
  client.appClosed(); // { newState: "closed", previousState: ... }
  ```


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Add `screen()` method for page/screen view tracking.
  
  #### New Features
  
  ##### Browser: `screen(payload?, schemaVersion?)`
  
  Auto-captures page info from the browser environment:
  
  - `title` — from `document.title`
  - `url` — from `location.href`
  - `pathname` — from `location.pathname`
  - `referrer` — from `document.referrer`
  - `search` — from `location.search`
  - `keywords` — from `<meta name="keywords">` tag
  - `campaign` — from UTM query parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`)
  
  Provided payload fields take precedence over auto-captured values.
  
  ```ts
  await client.screen(); // fully auto-captured
  await client.screen({ title: "Custom Title" }); // override title only
  ```
  
  ##### Node: `screen(payload, schemaVersion?)`
  
  Requires a `ScreenPayload` — no auto-capture in server environments.
  
  ```ts
  await client.screen({ title: "Dashboard", url: "/dashboard" });
  ```


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Build-time SDK info injection.
  
  #### New Features
  
  ##### Automatic SDK name and version injection
  
  `SDK_NAME` and `SDK_VERSION` are now injected at build time from each package's
  `package.json`. The `_getSdkInfo()` abstract method on `Client` provides this to
  the event `sdk` field, ensuring every event carries the correct package name and
  version without manual updates.
  
  The build step `build:inject-sdk-info` runs before package bundling via
  `scripts/inject-sdk-info.ts`.


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Add telemetry hooks and automatic telemetry reporting.
  
  #### New Features
  
  ##### Telemetry hooks for production monitoring
  
  Fire-and-forget callbacks for observing SDK internals:
  
  ```ts
  const client = new RippleClient({
    hooks: {
      onFlush: info => console.log(`Flushed ${info.eventCount} events`),
      onSendSuccess: info => metrics.increment("events.sent", info.batchSize),
      onSendFailure: info => alerts.notify(`Send failed: ${info.error}`),
      onRetry: info => console.log(`Retry #${info.attempt}`),
      onDrop: info => console.warn(`Dropped ${info.eventCount}: ${info.reason}`),
      onEnqueue: info => gauge.set("buffer_size", info.bufferSize),
    },
  });
  ```
  
  ##### Automatic telemetry reporting
  
  When enabled, the SDK automatically reports internal metrics to a dedicated endpoint:
  
  ```ts
  const client = new RippleClient({
    telemetryOptions: {
      disabled: false,
      endpoint: "https://telemetry.example.com/sdk",
    },
  });
  ```
  
  Uses the configured `apiKey` and `apiKeyHeader` for authentication. User hooks
  and auto-telemetry work together — both fire on each event.

### Patch Changes



- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Cache platform and SDK info, use lazy telemetry context.
  
  #### Performance
  
  - Cache `_getPlatform()` result instead of parsing UA on every `track()` call (browser).
  - Return a module-level constant from `_getSdkInfo()` instead of allocating per call.
  
  #### Refactor
  
  - Telemetry context now uses lazy getters (`getPlatform`, `getSdk`, `getAnonymousId`) instead of eagerly resolving values in the `Client` constructor. This fixes a private field access error when subclass fields aren't installed during `super()` and ensures telemetry events capture current state at report time.


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Fix storage race condition on flush and improve enqueue throughput.
  
  #### Bug Fixes
  
  ##### Storage clear race condition
  
  Previously, `flush()` called `storage.clear()` after a successful send. If new events were enqueued during the flush, their persisted state was wiped — causing data loss on crash. Now flush persists the current buffer state (`storage.save(buffer)`) instead of clearing, ensuring newly-enqueued events survive in storage.
  
  #### Improvements
  
  ##### Fire-and-forget persistence in enqueue
  
  `enqueue()` no longer awaits the storage write. The in-memory buffer is the source of truth; persistence is a best-effort durability snapshot serialized via mutex. This removes disk I/O from the hot path, improving enqueue throughput.


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Fix race condition between enqueue and flush, and optimize flush memory footprint.
  
  #### Bug Fixes
  
  ##### Enqueue/flush storage race condition
  
  Introduced a dedicated storage mutex that serializes storage I/O without blocking buffer mutations or network requests. Previously, an enqueue's `storage.save()` could interleave with flush's `storage.clear()`, causing already-sent events to persist in storage and replay on next initialization.
  
  #### Improvements
  
  ##### Streaming flush with O(1) peak memory per batch
  
  Flush now drains the buffer incrementally via `dequeue()`, building and sending one batch at a time. This replaces the previous approach of `toArray()` + `filterExpired()` + `createBatches()` + iterating all batches, which allocated ~3× buffer size in intermediate arrays. Peak memory is now ~1 batch size regardless of total buffer contents.


- [#38](https://github.com/Tap30/ripple-ts/pull/38) [`5752de2`](https://github.com/Tap30/ripple-ts/commit/5752de2860d524f3bbf561c85ee9724a8ecc11d1) Thanks [@mimshins](https://github.com/mimshins)! - Performance, memory, and concurrency improvements from code review.
  
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

## 1.2.1
### Patch Changes



- [`f061cce`](https://github.com/Tap30/ripple-ts/commit/f061ccea8688b6c5d01460da2fbcacf1aa91c8d0) Thanks [@mimshins](https://github.com/mimshins)! - Export event sampler types.

## 1.2.0
### Minor Changes



- [#34](https://github.com/Tap30/ripple-ts/pull/34) [`c612db8`](https://github.com/Tap30/ripple-ts/commit/c612db8bbeab9918def6f4aad99b4c269efdd60d) Thanks [@mimshins](https://github.com/mimshins)! - Add `eventSampler` config option to allow filtering events before they are enqueued.
  
  The sampler is a synchronous function that receives the fully-constructed event and returns `true` to keep it or `false` to drop it. When omitted, all events are enqueued (default behavior unchanged).
  
  ```ts
  const client = new RippleClient({
    // sample 50% of events
    eventSampler: (event) => Math.random() < 0.5,
  });
  ```

## 1.1.0
### Minor Changes



- [#32](https://github.com/Tap30/ripple-ts/pull/32) [`6572d26`](https://github.com/Tap30/ripple-ts/commit/6572d262d920e47cfa580344b676b0b4aa04813d) Thanks [@mimshins](https://github.com/mimshins)! - **Replace multiple `HttpAdapter.send` parameters with a context object.**
  
  This refactor simplifies the `HttpAdapter` interface by consolidating multiple parameters
  into a single context object named `HttpAdapterContext`.
  
  **Before:**
  
  ```ts
  send(
    endpoint: string,
    events: Event[],
    headers: Record<string, string>,
    apiKeyHeader: string,
  ): Promise<HttpResponse>;
  ```
  
  **After:**
  
  ```ts
  // After
  send(context: HttpAdapterContext): Promise<HttpResponse>;
  ```


- [#32](https://github.com/Tap30/ripple-ts/pull/32) [`6572d26`](https://github.com/Tap30/ripple-ts/commit/6572d262d920e47cfa580344b676b0b4aa04813d) Thanks [@mimshins](https://github.com/mimshins)! - **Fixes & Improvements in IndexedDBAdapter:**
  
  - **Improved Transaction Error Handling:** Added explicit fallback error messages (`"Transaction failed"`, `"Transaction aborted"`) for edge cases where the browser's IndexedDB `transaction.error` or `request.error` is `null` or `undefined` during `onerror` and `onabort` events.
  - **Robust Quota Exceeded Logic:** Ensured `StorageQuotaExceededError` is correctly propagated and handled within the retry logic when the browser storage limit is reached.
  - **Lifecycle Event Resilience:** Improved cleanup and connection resets during native database lifecycle events (`onclose`, `onabort`, `onversionchange`, `onblocked`).

### Patch Changes



- [#32](https://github.com/Tap30/ripple-ts/pull/32) [`6572d26`](https://github.com/Tap30/ripple-ts/commit/6572d262d920e47cfa580344b676b0b4aa04813d) Thanks [@mimshins](https://github.com/mimshins)! - **Enhance browser compatibility by updating error handling syntax.**
  
  This change refactors `catch {}` blocks to `catch (_) {}` to ensure broader compatibility, specifically for legacy iOS browsers that do not support optional catch binding (a feature introduced in ES2019).
  
  **Why this change?**
  
  While modern JavaScript environments support optional catch binding (e.g., `try { ... } catch { ... }`), our codebase targets ES2017. Legacy iOS browsers running older versions of Safari/WebKit do not recognize the `catch {}` syntax, leading to syntax errors and breaking application functionality on those devices.
  
  By explicitly including the unused error parameter `_`, we ensure that the code remains valid ES2017, preventing syntax errors in environments that do not support the newer `catch` syntax. This maintains robust error handling across a wider range of user devices.
  
  **Before:**
  
  ```ts
  try {
    // ... some code that might throw
  } catch {
    // Ignore error
  }
  ```
  
  **After:**
  
  ```ts
  try {
    // ... some code that might throw
  
    // Use `catch (_) {}` instead of `catch {}` for ES2017 compatibility.
    // Older iOS Safari versions don't support optional catch binding.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
  }
  ```


- [#32](https://github.com/Tap30/ripple-ts/pull/32) [`6572d26`](https://github.com/Tap30/ripple-ts/commit/6572d262d920e47cfa580344b676b0b4aa04813d) Thanks [@mimshins](https://github.com/mimshins)! - **Migrate private members to native ES private field syntax (`#`).**
  
  All private fields and methods across `internals/core` and `packages/browser` have been migrated from the conventional `_` underscore prefix to native ES `#` private syntax. This enforces true encapsulation at the JavaScript engine level rather than relying on naming convention alone.
  
  No public API changes.


- [#32](https://github.com/Tap30/ripple-ts/pull/32) [`6572d26`](https://github.com/Tap30/ripple-ts/commit/6572d262d920e47cfa580344b676b0b4aa04813d) Thanks [@mimshins](https://github.com/mimshins)! - **Replace `_setSessionId()` method with a `protected _sessionId` field.**
  
  The protected `_setSessionId(sessionId)` method has been removed in favor of a directly accessible `protected _sessionId` field. Subclasses can now assign the session ID directly instead of going through a setter method.
  
  No public API changes.

## 1.0.1
### Patch Changes



- [`6efec3d`](https://github.com/Tap30/ripple-ts/commit/6efec3dcd6ba50c6eeed44e1812694c455ef9399) Thanks [@mimshins](https://github.com/mimshins)! - Fix race condition in `init()` when called multiple times after `dispose()`. Previously, if `restore()` took longer to complete, concurrent `init()` calls could reset the mutex while it was actively being used, potentially corrupting the initialization process.

## 1.0.0

### Major Changes

- [`aa268ea`](https://github.com/Tap30/ripple-ts/commit/aa268ea05ba137c54c2896ca3b8d18183f1e7f4b) Thanks [@mimshins](https://github.com/mimshins)! - BREAKING CHANGE: Add validation to prevent invalid Dispatcher configuration
  
  The Dispatcher constructor now throws an error if `maxBufferSize < maxBatchSize`. This configuration was previously allowed but would cause events to be dropped unnecessarily since the batch size could never be reached.
  
  If you're using this configuration, update it to ensure `maxBufferSize >= maxBatchSize`:
  
  ```diff
  const dispatcher = new Dispatcher({
    maxBatchSize: 100,
  - maxBufferSize: 50,  // Invalid - will throw error
  + maxBufferSize: 100, // Valid - buffer can hold at least one full batch
  });
  ```

- [`6c90393`](https://github.com/Tap30/ripple-ts/commit/6c90393ae53bcc587b36677b75ee75b6c864d054) Thanks [@mimshins](https://github.com/mimshins)! - BREAKING CHANGE: Rename `ConsoleLoggerAdopter` to `ConsoleLoggerAdapter` to fix typo
  
  If you're using the logger directly, update your imports:
  
  ```diff
  - import { ConsoleLoggerAdopter } from '@tapsioss/ripple-browser';
  + import { ConsoleLoggerAdapter } from '@tapsioss/ripple-browser';
  
  - const logger = new ConsoleLoggerAdopter(LogLevel.DEBUG);
  + const logger = new ConsoleLoggerAdapter(LogLevel.DEBUG);
  ```

- [`459f336`](https://github.com/Tap30/ripple-ts/commit/459f3367df1fb12bba5d1d3f402625493e32c50e) Thanks [@mimshins](https://github.com/mimshins)! - Remove SessionStorageAdapter, CookieStorageAdapter from browser package and FileStorageAdapter from node package. These adapters are no longer exported or available. For browser, use LocalStorageAdapter or IndexedDBAdapter instead. For node, use NoOpStorageAdapter or implement a custom storage adapter.

### Minor Changes

- [`5610631`](https://github.com/Tap30/ripple-ts/commit/561063133abe14837b67114eee58864917983f9b) Thanks [@mimshins](https://github.com/mimshins)! - Add close() method to StorageAdapter interface for resource cleanup. The close() method is now called automatically during client disposal to properly release storage resources. IndexedDBAdapter implements close() to close database connections, while other adapters provide empty implementations as they don't require cleanup.

### Patch Changes

- [`dcda392`](https://github.com/Tap30/ripple-ts/commit/dcda3927f85a23ca184f4b8c1a07593bf012bdc0) Thanks [@mimshins](https://github.com/mimshins)! - Add disposal state tracking to prevent operations after client disposal. The client now tracks disposal state with a `_disposed` flag that prevents `track()` calls from re-initializing a disposed client. Explicit `init()` call is required to re-enable a disposed client.

- [`684f87a`](https://github.com/Tap30/ripple-ts/commit/684f87a644594239c05e7008dda091bf5bfc2656) Thanks [@mimshins](https://github.com/mimshins)! - Fix race condition in client initialization when track() is called before init()

- [`705a71c`](https://github.com/Tap30/ripple-ts/commit/705a71c4eb56a610b8d8584dd165874cd474b619) Thanks [@mimshins](https://github.com/mimshins)! - Add validation for negative configuration values. The client constructor now throws errors when `flushInterval`, `maxBatchSize`, or `maxBufferSize` are zero or negative, or when `maxRetries` is negative.

- [`95ec7b2`](https://github.com/Tap30/ripple-ts/commit/95ec7b25faede6033c2e9b37332a358e4197e106) Thanks [@mimshins](https://github.com/mimshins)! - Fix memory leak in Dispatcher by preventing timer scheduling after disposal

- [`13a732e`](https://github.com/Tap30/ripple-ts/commit/13a732e3deb6167049670cd8adce69cb6e0b16bc) Thanks [@mimshins](https://github.com/mimshins)! - Fix mutex disposal to properly reject new acquisitions and support reinitialization. The mutex now throws `MutexDisposedError` when attempting to acquire a disposed mutex, preventing silent failures. Added `reset()` method to allow mutex reuse after disposal, enabling proper client and dispatcher reinitialization workflows.

- [`e51dcd9`](https://github.com/Tap30/ripple-ts/commit/e51dcd9cf26501f6a25931dbea490dbc594f60bf) Thanks [@mimshins](https://github.com/mimshins)! - Fix inconsistent error handling in storage adapters. Changed from `Promise.reject()` to `throw` for consistent async/await error handling in LocalStorageAdapter, SessionStorageAdapter, and CookieStorageAdapter.

- [`827706f`](https://github.com/Tap30/ripple-ts/commit/827706f11768e7aa14db888c89a154bfe6d7ddc2) Thanks [@mimshins](https://github.com/mimshins)! - Fix unsafe mutex release that could cause hanging promises during disposal. The mutex now properly resolves all queued tasks before clearing, preventing deadlocks when the dispatcher is disposed.

## 0.9.0

### Minor Changes

- [#28](https://github.com/Tap30/ripple-ts/pull/28) [`9eca791`](https://github.com/Tap30/ripple-ts/commit/9eca7913d518974cbfba38df46df3f96092efcc9) Thanks [@mimshins](https://github.com/mimshins)! - Improved initialization behavior with automatic pre-init operation queuing
  
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

- [#26](https://github.com/Tap30/ripple-ts/pull/26) [`34806bb`](https://github.com/Tap30/ripple-ts/commit/34806bb95cfb3e8d160448289e1f22d5f50c2baa) Thanks [@mimshins](https://github.com/mimshins)! - Feat: Add no-operation storage adapter that discards all events.

## 0.8.0

### Minor Changes

- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - **BREAKING CHANGE:** Fix critical event duplication bug by moving buffer limit logic to dispatcher
  
  - Fix: Storage adapters no longer merge events, eliminating exponential duplication bug
  - Refactor: `maxBufferSize` moved from storage adapter configs to client/dispatcher config
  - Refactor: Storage adapters now simply save what they're given (no merge, no limit logic)
  - Feat: Dispatcher applies FIFO eviction before saving to storage
  - **Impact:** High-throughput offline scenarios now have linear I/O instead of exponential growth
  - **Migration:** Remove `maxBufferSize` from storage adapter constructors and add it to client config instead

- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - - Feat: Add static `isAvailable()` method to all storage adapters for detecting storage availability before instantiation.
  - Fix: Implement atomic read-write transactions in IndexedDBAdapter to prevent race conditions across tabs.
  - Fix: Add connection lifecycle handlers (onclose, onversionchange) to IndexedDBAdapter for automatic reconnection.
  - Fix: Support graceful degradation when storage is unavailable (private browsing, disabled storage, quota exceeded).

### Patch Changes

- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - - Fix: Apply `maxBufferSize` limit during restore from storage to prevent silent event loss
  - Fix: Preserve original error type in IndexedDB adapter for proper QuotaExceededError retry handling
  - Feat: Add runtime validation warning when `maxBufferSize < maxBatchSize`
  - Test: Add comprehensive storage quota error handling test coverage

- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - Fix: update schema version of IndexedDB due to the schema changes.

- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - Fix: Add comprehensive error handling for storage operations.
  
  - Wrap all storage adapter operations (`save()`, `load()`, `clear()`) in try-catch blocks
  - Log storage errors via logger adapter instead of throwing unhandled rejections
  - Handle errors during enqueue, flush, restore, and retry operations
  - Support both Error objects and non-Error values in error logging
  - Prevent application crashes from storage failures (QuotaExceededError, SecurityError, etc.)

- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - Fix: the IndexedDB connection is now opened once and reused for all subsequent operations.

## 0.7.0

### Minor Changes

- [#20](https://github.com/Tap30/ripple-ts/pull/20) [`333cd0c`](https://github.com/Tap30/ripple-ts/commit/333cd0c6023f5b9edb46bb3b275633855b7f2abe) Thanks [@mimshins](https://github.com/mimshins)! - Feat: add `persistedQueueLimit` property to adapters.

- [#23](https://github.com/Tap30/ripple-ts/pull/23) [`7bd9101`](https://github.com/Tap30/ripple-ts/commit/7bd910195631b9ed2102a3b7b59634712b4b323f) Thanks [@mimshins](https://github.com/mimshins)! - Refactor!: update HttpResponse interface to remove `ok` field from it.

- [#22](https://github.com/Tap30/ripple-ts/pull/22) [`ca157cb`](https://github.com/Tap30/ripple-ts/commit/ca157cbccb0943924b99397155dc5b7e3cb15d9f) Thanks [@mimshins](https://github.com/mimshins)! - Refactor!: update browser runtime prebuilt adapters to accept config object instead of separate params.

## 0.6.0

### Minor Changes

- [#18](https://github.com/Tap30/ripple-ts/pull/18) [`750c4d7`](https://github.com/Tap30/ripple-ts/commit/750c4d78759c89062f08727f05356b84f8707590) Thanks [@mimshins](https://github.com/mimshins)! - Feat: add `ttl` property to storage adapters.

## 0.5.0

### Minor Changes

- [`1aad5ad`](https://github.com/Tap30/ripple-ts/commit/1aad5ad3ab599e034eeafe35d4589e9f4b599c9c) Thanks [@mimshins](https://github.com/mimshins)! - Feat: add dynamic rebatching to dispatcher's flush.

## 0.4.2

### Patch Changes

- [#15](https://github.com/Tap30/ripple-ts/pull/15) [`7c6baaa`](https://github.com/Tap30/ripple-ts/commit/7c6baaa40ed8539fd19ebbb4b36f80ee40106042) Thanks [@mimshins](https://github.com/mimshins)! - Fix: resolve the potential memory bloat and overhead in case of 4xx client errors.

## 0.4.1

### Patch Changes

- [`0de0418`](https://github.com/Tap30/ripple-ts/commit/0de0418b3417873204c103e5843f24708a4223ec) Thanks [@mimshins](https://github.com/mimshins)! - Feat: expose platform-specific types.

## 0.4.0

### Minor Changes

- [#11](https://github.com/Tap30/ripple-ts/pull/11) [`f2c1782`](https://github.com/Tap30/ripple-ts/commit/f2c178200d8fd8dcf0b9fd70a98b3a325b02e4aa) Thanks [@mimshins](https://github.com/mimshins)! - Refactor!: flatten `ClientConfig` by removing nested `adapters` field.

## 0.3.0

### Minor Changes

- [`d127dd8`](https://github.com/Tap30/ripple-ts/commit/d127dd817f4e9c933d78a3ef421e2e220b77743c) Thanks [@mimshins](https://github.com/mimshins)! - Refactor: improve disposability, memory management, documentation, and readability of the code.

## 0.2.0

### Minor Changes

- [#6](https://github.com/Tap30/ripple-ts/pull/6) [`08550b7`](https://github.com/Tap30/ripple-ts/commit/08550b7a2ca73492e8811fd1c0157360005ff07e) Thanks [@mimshins](https://github.com/mimshins)! - Refactor: merge context and metadata concepts together.

- [#7](https://github.com/Tap30/ripple-ts/pull/7) [`031960c`](https://github.com/Tap30/ripple-ts/commit/031960cac828a12ffd9dece20cb01f8dd29d614f) Thanks [@mimshins](https://github.com/mimshins)! - Feat: add logger adapter and predefined configurable adapters.

- [`aba6864`](https://github.com/Tap30/ripple-ts/commit/aba68640b6b045143ca471049bd07b57b303b8cc) Thanks [@mimshins](https://github.com/mimshins)! - Feat: add generic type for events map.

- [`58b8c69`](https://github.com/Tap30/ripple-ts/commit/58b8c698e1de46da3192c9dc392f152ed13c71c9) Thanks [@mimshins](https://github.com/mimshins)! - Refactor: remove default adapters and address multi-instance Ripple clients.

- [#1](https://github.com/Tap30/ripple-ts/pull/1) [`24be7dd`](https://github.com/Tap30/ripple-ts/commit/24be7dd975bdb727c49dec39c6ac9536ab1ade77) Thanks [@mimshins](https://github.com/mimshins)! - Initial implementation

### Patch Changes

- [#5](https://github.com/Tap30/ripple-ts/pull/5) [`39e08d8`](https://github.com/Tap30/ripple-ts/commit/39e08d8a874eea774b62813c98da03c1450573dd) Thanks [@mimshins](https://github.com/mimshins)! - Fix: Update session id generation to use cryptographic solutions for random generation.
