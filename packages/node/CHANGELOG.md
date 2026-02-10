# @tapsioss/ripple-node

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

## 0.8.0
### Minor Changes



- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - **BREAKING CHANGE:** Fix critical event duplication bug by moving queue limit logic to dispatcher
  
  - Fix: Storage adapters no longer merge events, eliminating exponential duplication bug
  - Refactor: `maxBufferSize` moved from storage adapter configs to client/dispatcher config
  - Refactor: Storage adapters now simply save what they're given (no merge, no limit logic)
  - Feat: Dispatcher applies FIFO eviction before saving to storage
  - **Impact:** High-throughput offline scenarios now have linear I/O instead of exponential growth
  - **Migration:** Remove `maxBufferSize` from storage adapter constructors and add it to client config instead

### Patch Changes



- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - - Fix: Apply `maxBufferSize` limit during restore from storage to prevent silent event loss
  - Fix: Preserve original error type in IndexedDB adapter for proper QuotaExceededError retry handling
  - Feat: Add runtime validation warning when `maxBufferSize < maxBatchSize`
  - Test: Add comprehensive storage quota error handling test coverage


- [#24](https://github.com/Tap30/ripple-ts/pull/24) [`f54bb12`](https://github.com/Tap30/ripple-ts/commit/f54bb12b1f477c6205677ac5254f2b55ea05e7a2) Thanks [@mimshins](https://github.com/mimshins)! - Fix: Add comprehensive error handling for storage operations.
  
  - Wrap all storage adapter operations (`save()`, `load()`, `clear()`) in try-catch blocks
  - Log storage errors via logger adapter instead of throwing unhandled rejections
  - Handle errors during enqueue, flush, restore, and retry operations
  - Support both Error objects and non-Error values in error logging
  - Prevent application crashes from storage failures (QuotaExceededError, SecurityError, etc.)

## 0.7.0
### Minor Changes



- [#23](https://github.com/Tap30/ripple-ts/pull/23) [`7bd9101`](https://github.com/Tap30/ripple-ts/commit/7bd910195631b9ed2102a3b7b59634712b4b323f) Thanks [@mimshins](https://github.com/mimshins)! - Refactor!: update HttpResponse interface to remove `ok` field from it.

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
