<div align="center">

<img width="64" height="64" alt="Ripple Logo" src="https://raw.githubusercontent.com/Tap30/ripple/refs/heads/main/ripple-logo.png" />

# Ripple | TypeScript | Node.js

</div>

<div align="center">

A high-performance, scalable, and fault-tolerant event tracking TypeScript SDK
for Node.js.

</div>

<hr />

## Features

- 🚀 **High Performance**: Efficient buffer management with O(1) operations
- 📦 **Automatic Batching**: Configurable batch size, payload size, and flush
  intervals
- 🔄 **Dynamic Rebatching**: Optimizes throughput with stop-on-failure ordering
  guarantees
- 🔄 **Retry Logic**: Configurable exponential backoff with jitter
- 🔒 **Concurrency Safe**: Thread-safe flush operations with mutex protection
- 🔌 **Pluggable Adapters**: Custom HTTP, storage, and logger implementations
- 📘 **Type-Safe**: Full TypeScript support with predefined CDP events + custom
  events
- 🎯 **Zero Dependencies**: No external dependencies
- 🌐 **Native Fetch**: Uses Node.js 18+ native fetch API

## Installation

```sh
npm install @tapsioss/ripple-node
```

## Requirements

- Node.js 18.0.0 or higher (for native fetch API support)

## Quick Start

```ts
import { RippleClient, NoOpStorageAdapter } from "@tapsioss/ripple-node";

// Define custom events (predefined CDP events always available)
type CustomEvents = {
  "api.request": { endpoint: string; method: string; duration: number };
};

type AppMetadata = {
  serverId: string;
  environment: "prod" | "staging" | "dev";
};

const client = new RippleClient<CustomEvents, AppMetadata>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  storageAdapter: new NoOpStorageAdapter(),
});

await client.init();

client.setMetadata("serverId", "srv-1");
client.setMetadata("environment", "prod");

// Track predefined events via events namespace (schema version auto-managed)
await client.events.orderCompleted({
  order: {
    orderId: "order-789",
    products: [{ productId: "p-1", price: { amount: 49.99, currency: "USD" } }],
    revenue: { amount: 49.99, currency: "USD" },
    total: { amount: 54.99, currency: "USD" },
  },
});

// Track custom events with schema version
await client.track(
  "api.request",
  {
    endpoint: "/api/users",
    method: "GET",
    duration: 150,
  },
  "1.0.0",
);

// Identity
await client.identify("user-123", { email: "user@example.com" });

await client.flush();
client.dispose();
```

## Configuration

```ts
const client = new RippleClient({
  // Required
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  storageAdapter: new NoOpStorageAdapter(),

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
  loggerAdapter: new ConsoleLogger(LogLevel.INFO),
  eventSampler: event => true, // Keep all events
});
```

## API Reference

### `new RippleClient<TCustomEvents, TMetadata>(config)`

Creates a new client. `TCustomEvents` defines your custom events.

### `init(): Promise<void>`

Initializes the client and restores persisted events.

### `track(name, payload?, schemaVersion?): Promise<void>`

Tracks an event. Accepts custom event names with full type safety.

### `identify(userId, traits): Promise<void>`

Identifies a user. Sends a `user_identified` event.

### `clicked(payload): Promise<void>`

Tracks a `clicked` event.

### `viewed(payload): Promise<void>`

Tracks a `viewed` event.

### `screen(payload): Promise<void>`

Tracks a `screened` page view event. Requires `WebScreenedPayload`.

### `setMetadata(key, value): void`

Sets global metadata attached to all subsequent events.

### `getMetadata(): Partial<TMetadata>`

Returns current metadata.

### `getAnonymousId(): string`

Returns the anonymous ID (auto-generated UUID per instance).

### `getUserId(): string | null`

Returns the authenticated user ID if set via `identify()`.

### `flush(): Promise<void>`

Immediately flushes all queued events.

### `dispose(): void`

Cleans up resources and cancels timers.

## Custom HTTP Adapter

```ts
import type {
  HttpAdapter,
  HttpAdapterContext,
  HttpResponse,
} from "@tapsioss/ripple-node";

class GrpcHttpAdapter implements HttpAdapter {
  async send(context: HttpAdapterContext): Promise<HttpResponse> {
    const response = await grpcClient.sendEvents({
      events: context.events,
      metadata: context.headers,
    });
    return { status: response.code };
  }
}
```

## Custom Storage Adapter

```ts
import type { StorageAdapter, Event } from "@tapsioss/ripple-node";

class RedisStorageAdapter implements StorageAdapter {
  async init(): Promise<void> {
    // initialization
  }
  async save(events: Event[]): Promise<void> {
    await redis.set("ripple:events", JSON.stringify(events));
  }
  async load(): Promise<Event[]> {
    const data = await redis.get("ripple:events");
    return data ? JSON.parse(data) : [];
  }
  async clear(): Promise<void> {
    await redis.del("ripple:events");
  }
  async close(): Promise<void> {
    // cleanup if needed
  }
}
```

## Graceful Shutdown

```ts
process.on("SIGTERM", async () => {
  await client.flush();
  client.dispose();
  process.exit(0);
});
```

## Error Handling

- **2xx**: Events cleared from storage
- **4xx**: Events dropped (client errors won't self-resolve)
- **5xx / Network errors**: Retried with exponential backoff, then requeued with
  ordering preserved

## Migration from v1

See the [Migration Guide](../../MIGRATION.md) for detailed instructions on
upgrading from v1 to v2.

## License

[MIT](./LICENSE)
