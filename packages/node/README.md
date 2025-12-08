<div align="center">

# Ripple | TypeScript | Node.js

</div>

<div align="center">

A high-performance, scalable, and fault-tolerant event tracking TypeScript SDK
for Node.js.

</div>

<hr />

## Features

- 🚀 **High Performance**: Efficient queue management with O(1) operations
- 📦 **Automatic Batching**: Configurable batch size and flush intervals
- 🔄 **Retry Logic**: Exponential backoff with jitter
- 🔒 **Concurrency Safe**: Thread-safe flush operations with mutex protection
- 💾 **File System Storage**: Persistent event storage with unlimited capacity
- 🔌 **Pluggable Adapters**: Custom HTTP and storage implementations
- 📘 **Type-Safe**: Full TypeScript support with generics
- 🎯 **Zero Dependencies**: No external dependencies
- 🌐 **Native Fetch**: Uses Node.js 18+ native fetch API
- ✅ **No Event Loss**: Events are preserved even during concurrent operations
- 📋 **Event Ordering**: FIFO order maintained across all scenarios

## Installation

```sh
npm install @tapsioss/ripple-node
```

```sh
pnpm add @tapsioss/ripple-node
```

```sh
yarn add @tapsioss/ripple-node
```

## Requirements

- Node.js 18.0.0 or higher (for native fetch API support)

## Quick Start

```ts
import { RippleClient } from "@tapsioss/ripple-node";

const client = new RippleClient({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
});

await client.init();
await client.track("api_request", { endpoint: "/api/users", method: "GET" });
await client.flush();
```

## Usage

### Basic Tracking

```typescript
import { RippleClient } from "@tapsioss/ripple-node";

const client = new RippleClient({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  flushInterval: 5000, // Auto-flush every 5 seconds
  maxBatchSize: 10, // Auto-flush after 10 events
  maxRetries: 3, // Retry failed requests 3 times
});

// Initialize and restore persisted events
await client.init();

// Track events
await client.track("user_signup", { userId: "user-123" });
await client.track("database_query", { table: "users", duration: 45 });

// Track without payload (just signal that something happened)
await client.track("server_started");

// Manually flush events
await client.flush();
```

### Type-Safe Context

```typescript
interface ServerContext extends Record<string, unknown> {
  serverId: string;
  environment: "development" | "staging" | "production";
  region: string;
}

const client = new RippleClient<ServerContext>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
});

// Type-safe context with autocomplete
client.setContext("serverId", "server-456");
client.setContext("environment", "production");
client.setContext("region", "us-east-1");

// Context is automatically attached to all events
await client.track("api_request", { endpoint: "/api/users" });

// Track event with metadata (schema version)
await client.track(
  "order_created",
  { orderId: "order-456", amount: 99.99 },
  { schemaVersion: "2.1.0" },
);
```

### Event Metadata

Track events with optional metadata for schema versioning:

```typescript
import { RippleClient } from "@tapsioss/ripple-node";

const client = new RippleClient({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
});

await client.init();

// Track with schema version
await client.track(
  "payment_processed",
  { transactionId: "txn-456", amount: 149.99 },
  { schemaVersion: "3.1.0" },
);

// Metadata is optional
await client.track("api_request", { endpoint: "/api/users" });
```

**Note**: Platform information (server type) is automatically attached to all
events.

**Use Cases**:

- Schema versioning for backward compatibility
- Event structure evolution tracking
- Data migration identification

### Custom Storage Adapter

```typescript
import {
  RippleClient,
  type StorageAdapter,
  type Event,
} from "@tapsioss/ripple-node";

class RedisStorageAdapter implements StorageAdapter {
  public async save(events: Event[]): Promise<void> {
    await redis.set("ripple:events", JSON.stringify(events));
  }

  public async load(): Promise<Event[]> {
    const data = await redis.get("ripple:events");
    return data ? JSON.parse(data) : [];
  }

  public async clear(): Promise<void> {
    await redis.del("ripple:events");
  }
}

const client = new RippleClient(
  {
    apiKey: "your-api-key",
    endpoint: "https://api.example.com/events",
  },
  {
    storageAdapter: new RedisStorageAdapter(),
  },
);
```

### Custom HTTP Adapter

```typescript
import {
  RippleClient,
  type HttpAdapter,
  type HttpResponse,
  type Event,
} from "@tapsioss/ripple-node";

class GrpcHttpAdapter implements HttpAdapter {
  public async send(
    endpoint: string,
    events: Event[],
    headers?: Record<string, string>,
  ): Promise<HttpResponse> {
    // Implement gRPC call
    const response = await grpcClient.sendEvents({ events });
    return {
      ok: response.success,
      status: response.code,
      data: response.data,
    };
  }
}

const client = new RippleClient(config, {
  httpAdapter: new GrpcHttpAdapter(),
});
```

### Graceful Shutdown

```typescript
import { RippleClient } from "@tapsioss/ripple-node";

const client = new RippleClient(config);

// Flush events before process exit
process.on("SIGTERM", async () => {
  await client.flush();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await client.flush();
  process.exit(0);
});
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

## Configuration

```typescript
interface ClientConfig {
  apiKey: string; // Required: API authentication key
  endpoint: string; // Required: API endpoint URL
  flushInterval?: number; // Optional: Auto-flush interval in ms (default: 5000)
  maxBatchSize?: number; // Optional: Max events per batch (default: 10)
  maxRetries?: number; // Optional: Max retry attempts (default: 3)
}
```

## API Reference

### `RippleClient`

#### `constructor(config: ClientConfig, adapters?: RippleClientAdapters)`

Creates a new RippleClient instance.

#### `async init(): Promise<void>`

Initializes the client and restores persisted events. **Must be called before
tracking events**, otherwise `track()` will throw an error to prevent data loss.

#### `async track(name: string, payload?: EventPayload, metadata?: EventMetadata): Promise<void>`

Tracks an event with optional payload data and metadata. Metadata includes
schemaVersion for event versioning. Platform information (server) is
automatically attached.

**Throws**: Error if `init()` has not been called.

#### `setContext<K>(key: K, value: TContext[K]): void`

Sets a global context value that will be attached to all subsequent events.

#### `async flush(): Promise<void>`

Immediately flushes all queued events to the server.

#### `dispose(): void`

Disposes the client and cleans up resources. Cancels scheduled flushes. Call
this when you're done using the client (e.g., during graceful shutdown).

## Storage

By default, events are persisted to `.ripple_events.json` in the current working
directory. You can customize the file path:

```typescript
import { RippleClient, FileStorageAdapter } from "@tapsioss/ripple-node";

const client = new RippleClient(config, {
  storageAdapter: new FileStorageAdapter("/var/log/ripple/events.json"),
});
```

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
[MIT license](https://github.com/Tap30/ripple-ts/blob/main/packages/node/LICENSE).
