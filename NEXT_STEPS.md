# Next Steps

- Add telemetry/monitoring hooks for production debugging
- Add optional rate limiting (e.g., max events per second)
- `Buffer.toArray()` Creates Unnecessary Copies

  **File**: `internals/core/buffer.ts`

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

- No Validation of Restored Events

  **Location:** `internals/core/dispatcher.ts:408`

  **Issue:** Events loaded from storage are not validated for schema
  correctness.

  ```typescript
  const stored = await this._storageAdapter.load();
  const limited = this._applyBufferLimit(stored as Event<TMetadata>[]);
  this._queue.fromArray(limited);
  ```

  **Impact:** Corrupted storage data could cause runtime errors or send
  malformed events.

  **Recommendation:** Add schema validation:

  ```typescript
  const stored = await this._storageAdapter.load();
  const validated = stored.filter(
    e => e && typeof e.name === "string" && typeof e.issuedAt === "number",
  );
  if (validated.length < stored.length) {
    this._logger.warn(
      `Dropped ${stored.length - validated.length} invalid events`,
    );
  }
  ```

- Storage Quota Attacks

  **Current:** Malicious code could fill storage quota by tracking massive
  events.

  **Mitigation:** `maxBufferSize` provides some protection, but no per-event
  size limit exists.

  **Recommendation:** Add optional `maxEventSize` configuration to reject
  oversized events.
