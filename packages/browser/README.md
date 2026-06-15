<div align="center">

<img width="64" height="64" alt="Ripple Logo" src="https://raw.githubusercontent.com/Tap30/ripple/refs/heads/main/ripple-logo.png" />

# Ripple | TypeScript | Browser

</div>

<div align="center">

A high-performance, scalable, and fault-tolerant event tracking TypeScript SDK
for browsers.

</div>

<hr />

## Features

- 🚀 **High Performance**: Efficient buffer management with O(1) operations
- 📦 **Automatic Batching**: Configurable batch size, payload size, and flush
  intervals
- 🔄 **Dynamic Rebatching**: Optimizes throughput with stop-on-failure ordering
  guarantees
- 🔄 **Retry Logic**: Configurable exponential backoff with jitter
- 🆔 **Anonymous ID**: Persistent anonymous identity via sessionStorage
- 🔒 **Concurrency Safe**: Thread-safe flush operations with mutex protection
- 💾 **Auto-Detecting Storage**: IndexedDB, localStorage, with automatic
  fallback
- 🔌 **Pluggable Adapters**: Custom HTTP, storage, and logger implementations
- 📘 **Type-Safe**: Full TypeScript support with predefined CDP events + custom
  events
- 🌐 **Offline Support**: Events persist across page reloads
- ✅ **No Event Loss**: Events preserved with FIFO ordering across all scenarios

## Installation

```sh
npm install @tapsioss/ripple-browser ua-parser-js
```

### Peer Dependencies

This package requires `ua-parser-js` (v2.x) as a peer dependency for automatic
platform detection.

## Quick Start

```ts
import { RippleClient, WebStorage } from "@tapsioss/ripple-browser";

// Define custom event types (predefined CDP events are always available)
type CustomEvents = {
  "feature.enabled": { featureName: string };
};

type AppMetadata = {
  appVersion: string;
  environment: "prod" | "dev";
};

const client = new RippleClient<CustomEvents, AppMetadata>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  storageAdapter: new WebStorage(),
});

await client.init();

// Set global metadata
client.setMetadata("appVersion", "2.0.0");
client.setMetadata("environment", "prod");

// Track predefined events via events namespace (schema version auto-managed)
await client.events.productViewed({
  product: { productId: "123", price: { amount: 29.99, currency: "USD" } },
});

// Track custom events with explicit schema version
await client.track("feature.enabled", { featureName: "dark-mode" }, "1");

// Identity
await client.identify("user-123", { email: "user@example.com" });

// Flush and cleanup
await client.flush();
client.dispose();
```

## Configuration

```ts
const client = new RippleClient({
  // Required
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  storageAdapter: new WebStorage(),

  // Batching (all optional)
  batchOptions: {
    interval: 10000, // Auto-flush interval in ms (default: 10000)
    size: 10, // Max events per batch (default: 10)
    maxPayloadSize: 65536, // Max batch payload in bytes (default: 64KB)
  },

  // Retry (all optional)
  retryOptions: {
    maxAttempts: 3, // Max retry attempts (default: 3)
    minDelay: 1000, // Base delay in ms (default: 1000)
    maxDelay: 360000, // Max delay cap in ms (default: 360000)
    backoffFactor: 2, // Exponential multiplier (default: 2)
  },

  // Other options
  apiKeyHeader: "X-API-Key", // Header name (default: "X-API-Key")
  maxBufferSize: 1000, // Max persisted events (default: unlimited)
  eventTTL: 86400000, // Drop events older than 24h at flush (default: disabled)
  sessionStoreKey: "ripple_anonymous_id", // sessionStorage key (default)
  loggerAdapter: new ConsoleLogger(LogLevel.WARN),
  eventSampler: event => Math.random() < 0.5, // Sample 50% of events
});
```

## API Reference

### `new RippleClient<TCustomEvents, TMetadata>(config)`

Creates a new client. `TCustomEvents` defines your custom events.

### `init(): Promise<void>`

Initializes the client, restores persisted events, and persists anonymous ID.

### `track(name, payload?, schemaVersion?): Promise<void>`

Tracks an event. Accepts custom event names with full type safety.

### `identify(userId, traits): Promise<void>`

Identifies a user. Sends a `user_identified` event.

### `clicked(payload): Promise<void>`

Tracks a `clicked` event.

### `viewed(payload): Promise<void>`

Tracks a `viewed` event.

### `screen(payload?): Promise<void>`

Tracks a `screened` page view event. Auto-captures title, URL, pathname,
referrer, search, keywords (from meta tag), and UTM campaign params. Provided
fields override auto-captured values.

### `appOpened(): void`

Manually tracks `app_state_changed` with `newState: "opened"`.

### `appClosed(): void`

Manually tracks `app_state_changed` with `newState: "closed"`.

### `setMetadata(key, value): void`

Sets global metadata attached to all subsequent events.

### `getMetadata(): Partial<TMetadata>`

Returns current metadata.

### `getAnonymousId(): string`

Returns the anonymous ID (persisted in sessionStorage).

### `getUserId(): string | null`

Returns the authenticated user ID if set via `identify()`.

### `flush(): Promise<void>`

Immediately flushes all queued events.

### `dispose(): void`

Cleans up resources, cancels timers, clears session.

## Storage

| Adapter         | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| **WebStorage**  | Auto-detects best backend (IndexedDB → localStorage → NoOp) |
| **NoOpStorage** | Discards all events (when persistence not needed)           |

```ts
import { RippleClient, WebStorage } from "@tapsioss/ripple-browser";

// Auto-detect best available storage
const client = new RippleClient({
  storageAdapter: new WebStorage(),
  // ...
});

// Or with preferences
const client2 = new RippleClient({
  storageAdapter: new WebStorage({
    prefer: "local-storage", // or "indexed-db" (default)
    dbName: "my_app_db", // Optional: custom IndexedDB name
    key: "my_events", // Optional: custom storage key
  }),
  // ...
});
```

## Platform Detection

The SDK automatically detects browser, device, and OS information using
`ua-parser-js` and attaches it to every event:

```ts
{
  type: "web",
  browser: { name: "chrome", version: "120.0" },
  device: { name: "desktop", version: "unknown" },
  os: { name: "macos", version: "14.0" }
}
```

## Auto-Capture

### App State Tracking

The SDK automatically tracks `app_state_changed` events when page visibility
changes (`foreground` ↔ `background`). No configuration needed.

### Screen/Page View

`screen()` auto-captures from the browser environment:

- Page title, URL, pathname, referrer, search params
- SEO keywords from `<meta name="keywords">`
- UTM campaign parameters (`utm_source`, `utm_medium`, `utm_campaign`,
  `utm_term`, `utm_content`)

## Error Handling

- **2xx**: Events cleared from storage
- **4xx**: Events dropped (client errors won't self-resolve)
- **5xx / Network errors**: Retried with exponential backoff, then requeued with
  ordering preserved

## Custom HTTP Adapter

```ts
import type {
  HttpAdapter,
  HttpAdapterContext,
  HttpResponse,
} from "@tapsioss/ripple-browser";

class CustomHttpAdapter implements HttpAdapter {
  async send(context: HttpAdapterContext): Promise<HttpResponse> {
    const response = await fetch(context.endpoint, {
      method: "POST",
      headers: context.headers,
      body: JSON.stringify({ events: context.events }),
    });
    return { status: response.status };
  }
}
```

## Migration from v1

See the [Migration Guide](../../MIGRATION.md) for detailed instructions on
upgrading from v1 to v2.

## License

[MIT](./LICENSE)
