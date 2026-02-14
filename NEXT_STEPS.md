# Next Steps

- Add integration tests for disposal scenarios
- Add telemetry/monitoring hooks for production debugging
- Add optional rate limiting (e.g., max events per second)
- `Queue.toArray()` Creates Unnecessary Copies

  **File**: `internals/core/queue.ts`

  **Issue**: `toArray()` is O(n) and called multiple times per flush cycle.

  **Suggestion**: Cache array representation or use circular buffer if
  performance becomes an issue.

- Potential Data Loss in Flush Rebatching

  **File**: `internals/core/dispatcher.ts`  
  **Severity**: Important

  **Problem**: If `_sendWithRetry` fails and re-queues events, but subsequent
  batches also fail, event ordering becomes unpredictable.

  **Suggestion**: Document this behavior or revise batching strategy to preserve
  order.

- Silent Failure in Storage Quota Handling

  **File**: `internals/core/dispatcher.ts`  
  **Severity**: Important

  **Problem**: When storage fails, events remain in memory but users have no way
  to know persistence failed. This could lead to data loss if the page crashes.

  **Suggestion**: Expose storage health status or emit events for monitoring.

- Missing Abort Signal Support

  **File**: `packages/browser/src/adapters/fetch-http-adapter.ts`

  **Issue**: No request cancellation support. Requests continue even after
  client disposal.

  **Suggestion**: Add `AbortController` support to the `HttpAdapter` interface.
