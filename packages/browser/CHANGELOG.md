# @tapsioss/ripple-browser

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



- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - **BREAKING CHANGE:** Fix critical event duplication bug by moving queue limit logic to dispatcher
  
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
