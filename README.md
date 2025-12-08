<div align="center">

# Ripple | TypeScript

</div>

<div align="center">

A high-performance, scalable, and fault tolerant event tracking TypeScript SDK.

</div>

<hr />

## Packages

- [@tapsioss/ripple-browser](https://github.com/Tap30/ripple-ts/blob/main/packages/browser/README.md)
- [@tapsioss/ripple-node](https://github.com/Tap30/ripple-ts/blob/main/packages/node/README.md)

## SDK Features

### Core Features

- **Type-Safe Context Management**: Generic context types with full TypeScript
  autocomplete
- **Event Metadata**: Optional metadata support with schema versioning for
  events
- **Automatic Batching**: Configurable batch size with auto-flush
- **Scheduled Flushing**: Time-based automatic event dispatch
- **Retry Logic**: Exponential backoff with jitter (1000ms × 2^attempt + random
  jitter)
- **Event Persistence**: Automatic storage of unsent events
- **Queue Management**: Efficient FIFO queue using linked list (O(1) operations)
- **Graceful Degradation**: Re-queues events on failure after max retries
- **Custom Adapters**: Pluggable HTTP and storage implementations
- **Thread-Safe Operations**: Mutex-protected flush operations prevent race
  conditions
- **Concurrency Safe**: Handles concurrent flush calls, enqueue during flush,
  and retry failures

### Browser-Specific Features

- **Automatic Session Tracking**: Generates and maintains session ID tied to
  browser session lifecycle
- **Multiple Storage Options**:
  - LocalStorage (5-10MB, permanent)
  - SessionStorage (5-10MB, session-only)
  - IndexedDB (50MB-1GB+, high performance)
  - Cookies (4KB, cross-domain capable)
- **Fetch API**: Native browser HTTP support
- **Offline Support**: Events persist across page reloads
- **Session Lifecycle**: Session ID cleared on tab/window close (matches
  sessionStorage behavior)

### Node.js-Specific Features

- **File System Storage**: Unlimited capacity with JSON persistence
- **Native Fetch**: Node.js 18+ fetch API support
- **Process Lifecycle**: Graceful shutdown with event flushing

### Configuration Options

```typescript
{
  apiKey: string;           // Required: API authentication key
  endpoint: string;         // Required: API endpoint URL
  flushInterval?: number;   // Optional: Auto-flush interval (default: 5000ms)
  maxBatchSize?: number;    // Optional: Max events per batch (default: 10)
  maxRetries?: number;      // Optional: Max retry attempts (default: 3)
}
```

### Developer Experience

- **Full TypeScript Support**: Strict typing with generics
- **JSDoc Documentation**: Comprehensive inline documentation
- **ESLint Compliant**: Follows strict linting rules
- **Dual Module Format**: ESM and CommonJS support
- **Tree-Shakeable**: Optimized bundle size
- **Zero Dependencies**: Core has no external dependencies
- **Clear Error Messages**: Descriptive error handling
- **Usage Examples**: Playground with real-world scenarios

## Documentation

- [Onboarding](https://github.com/Tap30/ripple-ts/blob/main/ONBOARDING.md) - To
  learn about project's architecture, development guidelines, and Dev/AI
  onboarding in depth.
- [Design and API Contract Documentation](https://github.com/Tap30/ripple/blob/main/DESIGN_AND_CONTRACTS.md) -
  To learn about the framework-agnostic design principles, architecture, and API
  contract for SDKs.

## Contributing

Read the
[contributing guide](https://github.com/Tap30/ripple-ts/blob/main/CONTRIBUTING.md)
to learn about our development process, how to propose bug fixes and
improvements, and how to build and test your changes.

## License

This project is licensed under the terms of the
[MIT license](https://github.com/Tap30/ripple-ts/blob/main/LICENSE).
