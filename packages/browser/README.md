<div align="center">

# Ripple | TypeScript | Browser

</div>

<div align="center">

A high-performance, scalable, and fault-tolerant event tracking TypeScript SDK
for browsers.

</div>

<hr />

## Features

- 🚀 **High Performance**: Efficient queue management with O(1) operations
- 📦 **Automatic Batching**: Configurable batch size and flush intervals
- 🔄 **Retry Logic**: Exponential backoff with jitter
- 🔐 **Session Tracking**: Automatic session ID generation and management
- 🔒 **Concurrency Safe**: Thread-safe flush operations with mutex protection
- 💾 **Multiple Storage Options**: localStorage, sessionStorage, IndexedDB,
  Cookies
- 🔌 **Pluggable Adapters**: Custom HTTP, storage, and logger implementations
- 📘 **Type-Safe**: Full TypeScript support with generics
- 🌐 **Offline Support**: Events persist across page reloads
- ✅ **No Event Loss**: Events are preserved even during concurrent operations
- 📋 **Event Ordering**: FIFO order maintained across all scenarios
- 🚀 **Keepalive Support**: Reliable event delivery using fetch with `keepalive`
  flag

## Installation

```sh
npm install @tapsioss/ripple-browser ua-parser-js
```

```sh
pnpm add @tapsioss/ripple-browser ua-parser-js
```

```sh
yarn add @tapsioss/ripple-browser ua-parser-js
```

### Peer Dependencies

This package requires `ua-parser-js` (v2.x) as a peer dependency for automatic
platform detection (browser, device, and OS information). Make sure to install
it alongside the SDK.

## Quick Start

```ts
import {
  RippleClient,
  FetchHttpAdapter,
  IndexedDBAdapter,
} from "@tapsioss/ripple-browser";

const client = new RippleClient({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  adapters: {
    httpAdapter: new FetchHttpAdapter(),
    storageAdapter: new IndexedDBAdapter(),
  },
});

await client.init();
await client.track("page_view", { page: "/home" });
```

## Usage

### Basic Tracking

```ts
import {
  RippleClient,
  FetchHttpAdapter,
  IndexedDBAdapter,
} from "@tapsioss/ripple-browser";

const client = new RippleClient({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  flushInterval: 5000, // Auto-flush every 5 seconds
  maxBatchSize: 10, // Auto-flush after 10 events
  maxRetries: 3, // Retry failed requests 3 times
  sessionStoreKey: "my_app_session", // Custom session storage key
  adapters: {
    httpAdapter: new FetchHttpAdapter(),
    storageAdapter: new IndexedDBAdapter(),
  },
});

// Initialize and restore persisted events
await client.init();

// Session ID is automatically generated and tracked
console.log("Session ID:", client.getSessionId());

// Track events (session ID is automatically attached)
// Note: init() must be called before tracking, otherwise an error is thrown
await client.track("button_click", { button: "signup" });
await client.track("form_submit", { form: "contact" });

// Track without payload (just signal that something happened)
await client.track("page_loaded");

// Manually flush events
await client.flush();

// Clean up when done (e.g., SPA route change, component unmount)
client.dispose();
```

### Type-Safe Metadata

```ts
interface Metadata extends Record<string, unknown> {
  userId: string;
  sessionId: string;
  appVersion: string;
}

const client = new RippleClient<Metadata>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  adapters: {
    httpAdapter: new FetchHttpAdapter(),
    storageAdapter: new IndexedDBAdapter(),
  },
});

// Type-safe metadata with autocomplete
client.setMetadata("userId", "user-123");
client.setMetadata("sessionId", "session-abc");
client.setMetadata("appVersion", "1.0.0");

// Metadata is automatically attached to all events
await client.track("page_view", { page: "/dashboard" });

// Track event with typed metadata
await client.track(
  "user_signup",
  { email: "user@example.com" },
  {
    schemaVersion: "1.0.0",
    eventType: "conversion",
    source: "landing_page",
  },
);
```

### Event Metadata

Track events with optional metadata for schema versioning and type safety:

```ts
import { RippleClient } from "@tapsioss/ripple-browser";

// Define custom metadata type
type AppMetadata = {
  schemaVersion: string;
  eventType: "user_action" | "system_event" | "conversion";
  source: string;
  experimentId?: string;
};

// Create typed client
const client = new RippleClient<AppMetadata>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
});

await client.init();

// Track with typed metadata
await client.track(
  "checkout_completed",
  { orderId: "order-123", amount: 99.99 },
  {
    schemaVersion: "2.0.0",
    eventType: "conversion",
    source: "checkout_page",
    experimentId: "checkout-v2",
  },
);

// Metadata is optional
await client.track("button_click", { button: "submit" });
```

**Note**: Platform information (browser, device, OS) is automatically detected
and attached to all events.

**Use Cases**:

- Schema versioning for backward compatibility
- Event structure evolution tracking
- Data migration identification

### Custom Storage Adapters

```ts
import {
  RippleClient,
  IndexedDBAdapter,
  SessionStorageAdapter,
} from "@tapsioss/ripple-browser";

// Use IndexedDB for large event queues
const client = new RippleClient({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  adapters: {
    storageAdapter: new IndexedDBAdapter(),
  },
});

// Or use sessionStorage for temporary tracking
const sessionClient = new RippleClient({
  ...config,
  adapters: {
    storageAdapter: new SessionStorageAdapter(),
  },
});
```

### Multiple Client Instances

When using multiple Ripple instances in the same application, configure unique
storage keys to prevent conflicts:

```ts
import {
  RippleClient,
  IndexedDBAdapter,
  LocalStorageAdapter,
} from "@tapsioss/ripple-browser";

// Analytics client
const analyticsClient = new RippleClient({
  apiKey: "analytics-key",
  endpoint: "https://analytics.example.com/events",
  sessionStoreKey: "analytics_session",
  adapters: {
    storageAdapter: new IndexedDBAdapter("analytics_db", "events", "queue"),
  },
});

// Marketing client
const marketingClient = new RippleClient({
  apiKey: "marketing-key",
  endpoint: "https://marketing.example.com/events",
  sessionStoreKey: "marketing_session",
  adapters: {
    storageAdapter: new LocalStorageAdapter("marketing_events"),
  },
});

// Both clients can operate independently without conflicts
await analyticsClient.init();
await marketingClient.init();
```

### Custom HTTP Adapter

```ts
import {
  RippleClient,
  type HttpAdapter,
  type HttpResponse,
  type Event,
} from "@tapsioss/ripple-browser";

class AxiosHttpAdapter implements HttpAdapter {
  public async send(
    endpoint: string,
    events: Event[],
    headers: Record<string, string>,
    apiKeyHeader: string,
  ): Promise<HttpResponse> {
    const response = await axios.post(endpoint, { events }, { headers });
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      data: response.data,
    };
  }
}

const client = new RippleClient({
  ...config,
  adapters: {
    httpAdapter: new AxiosHttpAdapter(),
  },
});
```

## Storage Adapters

| Adapter                   | Capacity   | Persistence  | Performance | Use Case                   |
| ------------------------- | ---------- | ------------ | ----------- | -------------------------- |
| **LocalStorageAdapter**   | ~5-10MB    | Permanent    | Good        | Small event queues         |
| **SessionStorageAdapter** | ~5-10MB    | Session only | Good        | Temporary tracking         |
| **IndexedDBAdapter**      | ~50MB-1GB+ | Permanent    | Excellent   | Large event queues         |
| **CookieStorageAdapter**  | ~4KB       | Configurable | Fair        | Small queues, cross-domain |

## Logger Adapters

| Adapter                  | Output  | Configurable | Use Case                    |
| ------------------------ | ------- | ------------ | --------------------------- |
| **ConsoleLoggerAdapter** | Console | Yes          | Development and debugging   |
| **NoOpLoggerAdapter**    | None    | No           | Production (silent logging) |

### Log Levels

- `DEBUG`: Detailed debugging information
- `INFO`: General information messages
- `WARN`: Warning messages (default level)
- `ERROR`: Error messages
- `NONE`: No logging output

```typescript
import { ConsoleLoggerAdapter, LogLevel } from "@tapsioss/ripple-browser";

const client = new RippleClient({
  // ... other config
  adapters: {
    // ... other adapters
    loggerAdapter: new ConsoleLoggerAdapter(LogLevel.DEBUG),
  },
});
```

## Platform Detection

The SDK automatically detects and attaches platform information to all events
using [ua-parser-js](https://github.com/faisalman/ua-parser-js). This includes:

- **Browser**: Name and version (e.g., Chrome 120.0, Firefox 121.0)
- **Device**: Type and vendor (e.g., Desktop, Mobile, Tablet)
- **OS**: Name and version (e.g., Windows 11, macOS 14.0, iOS 17.0)

Platform data is automatically included in every event and requires no
configuration. The `ua-parser-js` library is a peer dependency and must be
installed alongside the SDK.

**Example platform data:**

```typescript
{
  type: "web",
  browser: { name: "chrome", version: "120.0" },
  device: { name: "desktop", version: "unknown" },
  os: { name: "macos", version: "14.0" }
}
```

## Concurrency Guarantees

The SDK is designed to handle concurrent operations safely:

- **Thread-Safe Flush**: Multiple concurrent `flush()` calls are automatically
  serialized using mutex locks
- **Event Ordering**: FIFO order is maintained even during retry failures and
  concurrent operations
- **No Event Loss**: Events tracked during flush operations are safely queued
  and sent in the next batch
- **Automatic Cleanup**: Mutex locks are automatically released even if errors
  occur, preventing deadlocks

You can safely call `track()` and `flush()` from multiple parts of your
application without worrying about race conditions.

## Multi-Instance Considerations

When running multiple Ripple client instances in the same application, consider
these important factors to avoid conflicts and ensure proper operation:

### Storage Isolation

Each client instance should use separate storage to prevent data conflicts:

```ts
// ❌ Bad: Both instances will conflict
const client1 = new RippleClient({ apiKey: "key1", endpoint: "url1" });
const client2 = new RippleClient({ apiKey: "key2", endpoint: "url2" });

// ✅ Good: Isolated storage
const client1 = new RippleClient({
  apiKey: "key1",
  endpoint: "url1",
  sessionStoreKey: "app1_session",
  adapters: {
    storageAdapter: new IndexedDBAdapter("app1_db", "events", "queue"),
  },
});

const client2 = new RippleClient({
  apiKey: "key2",
  endpoint: "url2",
  sessionStoreKey: "app2_session",
  adapters: {
    storageAdapter: new LocalStorageAdapter("app2_events"),
  },
});
```

### Resource Management

- Each instance has its own flush timer and queue
- Always call `dispose()` when instances are no longer needed
- Consider memory usage with many concurrent instances

```ts
// Proper cleanup
const cleanup = () => {
  client1.dispose();
  client2.dispose();
};

// In React/SPA
useEffect(() => cleanup, []);
```

### Session Management

Configure unique session storage keys to maintain separate user sessions:

```ts
const userClient = new RippleClient({
  sessionStoreKey: "user_analytics_session",
  // ...
});

const adminClient = new RippleClient({
  sessionStoreKey: "admin_analytics_session",
  // ...
});
```

## Configuration

The RippleClient uses `BrowserClientConfig` for configuration:

```typescript
type BrowserClientConfig = {
  apiKey: string; // Required: API authentication key
  endpoint: string; // Required: API endpoint URL
  apiKeyHeader?: string; // Optional: Header name for API key (default: "X-API-Key")
  flushInterval?: number; // Optional: Auto-flush interval in ms (default: 5000)
  maxBatchSize?: number; // Optional: Max events per batch (default: 10)
  maxRetries?: number; // Optional: Max retry attempts (default: 3)
  sessionStoreKey?: string; // Optional: Custom session storage key (default: "ripple_session_id")
  adapters: {
    // Required: Must provide both adapters
    httpAdapter: HttpAdapter; // Required: HTTP adapter for sending events
    storageAdapter: StorageAdapter; // Required: Storage adapter for persisting events
  };
};
```

## API Reference

### `RippleClient`

#### `constructor(config: BrowserClientConfig)`

Creates a new RippleClient instance.

**Parameters:**

- `config: BrowserClientConfig` - Client configuration with optional adapters

#### `async init(): Promise<void>`

Initializes the client and restores persisted events. **Must be called before
tracking events**, otherwise `track()` will throw an error to prevent data loss.

#### `async track(name: string, payload?: EventPayload, metadata?: TMetadata): Promise<void>`

Tracks an event with optional payload data and typed metadata. Metadata includes
schemaVersion for event versioning. Platform information (browser, device, OS)
is automatically detected and attached.

**Throws**: Error if `init()` has not been called.

#### `setMetadata<K>(key: K, value: TMetadata[K]): void`

Sets a global metadata value that will be attached to all subsequent events.

#### `async flush(): Promise<void>`

Immediately flushes all queued events to the server.

#### `getSessionId(): string | null`

Gets the current session ID. Returns null if the client has not been
initialized.

#### `dispose(): void`

Disposes the client and cleans up resources. Detaches event listeners and
cancels scheduled flushes. Call this when you're done using the client to
prevent memory leaks.

## Design and API Contract

Read the
[Design and API Contract Documentation](https://github.com/Tap30/ripple/blob/main/DESIGN_AND_CONTRACTS.md)
to learn about the framework-agnostic API contract for SDKs.

## Contributing

Read the
[contributing guide](https://github.com/Tap30/ripple-ts/blob/main/CONTRIBUTING.md)
to learn about our development process, how to propose bug fixes and
improvements, and how to build and test your changes.

## License

This project is licensed under the terms of the
[MIT license](https://github.com/Tap30/ripple-ts/blob/main/packages/browser/LICENSE).
