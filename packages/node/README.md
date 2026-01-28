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

- 🚀 **High Performance**: Efficient queue management with O(1) operations
- 📦 **Automatic Batching**: Configurable batch size and flush intervals
- 🔄 **Retry Logic**: Exponential backoff with jitter
- 🔒 **Concurrency Safe**: Thread-safe flush operations with mutex protection
- 💾 **File System Storage**: Persistent event storage with unlimited capacity
- 🔌 **Pluggable Adapters**: Custom HTTP, storage, and logger implementations
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
import {
  RippleClient,
  FetchHttpAdapter,
  FileStorageAdapter,
  ConsoleLoggerAdapter,
  LogLevel,
} from "@tapsioss/ripple-node";

// Define your event types for type safety
type ServerEvents = {
  "api.request": { endpoint: string; method: string; duration?: number };
  "user.created": { userId: string; email: string; plan: string };
  "error.occurred": { code: number; message: string; stack?: string };
};

const client = new RippleClient<ServerEvents>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  httpAdapter: new FetchHttpAdapter(),
  storageAdapter: new FileStorageAdapter(),
  loggerAdapter: new ConsoleLoggerAdapter(LogLevel.INFO), // Optional: Enable logging
});

await client.init();
// Type-safe event tracking
await client.track("api.request", {
  endpoint: "/api/users",
  method: "GET",
  duration: 150,
});
await client.flush();
```

## Usage

### Basic Tracking

```ts
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

// Get current metadata
const currentMetadata = client.getMetadata();

// Get session ID (returns null for Node.js client unless manually set)
const sessionId = client.getSessionId();

// Manually flush events
await client.flush();

// Clean up resources when shutting down
client.dispose();
```

### Type-Safe Metadata

```ts
import { RippleClient } from "@tapsioss/ripple-node";

type Metadata = {
  serverId: string;
  environment: "development" | "staging" | "production";
  region: string;
  schemaVersion: string;
  eventType: "api_call" | "system_event" | "user_action";
  source: string;
  requestId?: string;
};

type Events = {
  "database.query": {
    table: string;
    operation: "select" | "insert" | "update";
    duration: number;
  };
  "cache.miss": { key: string; ttl?: number };
  "webhook.received": {
    source: string;
    eventType: string;
    payload: Record<string, unknown>;
  };
};

// Create typed client with both generics
const client = new RippleClient<Events, Metadata>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
});

// Metadata to automatically attach to all events
client.setMetadata("serverId", "server-456");
client.setMetadata("environment", "production");
client.setMetadata("region", "us-east-1");

await client.init();

// Track with typed events and metadata
await client.track(
  "database.query",
  { table: "users", operation: "select", duration: 45 },
  {
    schemaVersion: "3.1.0",
    eventType: "api_call",
    source: "user_service",
    requestId: "req-789",
  },
);

// Metadata is automatically attached to all events
await client.track("cache.miss", {
  key: "user:123",
  ttl: 3600,
});
```

### Custom Storage Adapter

```ts
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

const client = new RippleClient({
  ...config,
  storageAdapter: new RedisStorageAdapter(),
});
```

### Multiple Client Instances

When using multiple Ripple instances in the same Node.js application, configure
unique storage paths to prevent conflicts:

```ts
import { RippleClient, FileStorageAdapter } from "@tapsioss/ripple-node";

// Analytics service
const analyticsClient = new RippleClient({
  apiKey: "analytics-key",
  endpoint: "https://analytics.example.com/events",
  storageAdapter: new FileStorageAdapter("./analytics_events.json"),
});

// Marketing service
const marketingClient = new RippleClient({
  apiKey: "marketing-key",
  endpoint: "https://marketing.example.com/events",
  storageAdapter: new FileStorageAdapter("./marketing_events.json"),
});

// Both clients can operate independently without conflicts
await analyticsClient.init();
await marketingClient.init();
```

}

### Custom HTTP Adapter

```ts
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

const client = new RippleClient({
  ...config,
  httpAdapter: new GrpcHttpAdapter(),
});
```

### Graceful Shutdown

```ts
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

## Error Handling

The SDK handles HTTP errors differently based on their type:

- **2xx Success**: Events are cleared from storage
- **4xx Client Errors**: Events are dropped (not retried or persisted) since
  client errors won't resolve without code changes
- **5xx Server Errors**: Retried with exponential backoff up to `maxRetries`,
  then re-queued and persisted for later retry
- **Network Errors**: Same behavior as 5xx errors

## Multi-Instance Considerations

When running multiple Ripple client instances in the same Node.js application,
consider these important factors to avoid conflicts and ensure proper operation:

### Storage Isolation

Each client instance should use separate file paths to prevent data conflicts:

```ts
// ❌ Bad: Both instances will conflict (same default file)
const client1 = new RippleClient({ apiKey: "key1", endpoint: "url1" });
const client2 = new RippleClient({ apiKey: "key2", endpoint: "url2" });

// ✅ Good: Isolated storage paths
const client1 = new RippleClient({
  apiKey: "key1",
  endpoint: "url1",
  storageAdapter: new FileStorageAdapter("./service1_events.json"),
});

const client2 = new RippleClient({
  apiKey: "key2",
  endpoint: "url2",
  storageAdapter: new FileStorageAdapter("./service2_events.json"),
});
```

### Resource Management

- Each instance has its own flush timer and queue
- Always call `dispose()` when instances are no longer needed
- Consider memory usage with many concurrent instances

```ts
// Proper cleanup on process exit
process.on("SIGTERM", () => {
  client1.dispose();
  client2.dispose();
  process.exit(0);
});
```

### Shared vs Separate Adapters

You can share stateless HTTP adapters but should separate storage:

```ts
const sharedHttpAdapter = new FetchHttpAdapter();

const client1 = new RippleClient({
  httpAdapter: sharedHttpAdapter, // ✅ Safe to share
  storageAdapter: new FileStorageAdapter("./client1.json"), // ✅ Separate storage
});

const client2 = new RippleClient({
  httpAdapter: sharedHttpAdapter, // ✅ Safe to share
  storageAdapter: new FileStorageAdapter("./client2.json"), // ✅ Separate storage
});
```

## Extending Functionality

### Extending the Client Class

```ts
import { RippleClient, type NodeClientConfig } from "@tapsioss/ripple-node";

class TrackedRippleClient extends RippleClient {
  private requestId: string | null = null;
  private correlationId: string | null = null;

  constructor(config: NodeClientConfig) {
    super(config);
  }

  // Set request ID for request tracing
  public setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  // Set correlation ID for cross-service tracking
  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  // Override track to automatically inject IDs
  public override async track(
    name: string,
    payload?: any,
    metadata?: any,
  ): Promise<void> {
    const enhancedMetadata = {
      ...metadata,
      ...(this.requestId && { requestId: this.requestId }),
      ...(this.correlationId && { correlationId: this.correlationId }),
      serviceVersion: process.env.SERVICE_VERSION,
    };

    return super.track(name, payload, enhancedMetadata);
  }

  // Convenience method for API monitoring
  public trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
  ) {
    return this.track("api_call", {
      endpoint,
      method,
      duration,
      status,
      success: status < 400,
    });
  }
}

const client = new TrackedRippleClient(config);
await client.init();

// Set request context (e.g., from Express middleware)
client.setRequestId("req-xyz-789");
client.setCorrelationId("corr-abc-123");

// All events now include request/correlation IDs
await client.track("database_query", { table: "users", duration: 45 });
await client.trackApiCall("/api/users", "GET", 150, 200);
```

### Schema Transformation via HTTP Adapter

```ts
import {
  type HttpAdapter,
  type HttpResponse,
  type Event,
} from "@tapsioss/ripple-node";

class SchemaTransformAdapter implements HttpAdapter {
  constructor(private baseAdapter: HttpAdapter) {}

  public async send(
    endpoint: string,
    events: Event[],
    headers: Record<string, string>,
    apiKeyHeader: string,
  ): Promise<HttpResponse> {
    // Transform to match your observability platform schema
    const transformedEvents = events.map(event => ({
      "@timestamp": new Date(event.timestamp).toISOString(),
      level: "info",
      message: `Event: ${event.name}`,
      event: {
        name: event.name,
        data: event.payload,
      },
      trace: {
        id: event.metadata?.correlationId,
        request_id: event.metadata?.requestId,
      },
      service: {
        name: "your-service",
        version: event.metadata?.serviceVersion,
      },
      labels: event.metadata,
    }));

    return this.baseAdapter.send(
      endpoint,
      transformedEvents as any,
      headers,
      apiKeyHeader,
    );
  }
}

const client = new RippleClient({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  httpAdapter: new SchemaTransformAdapter(new FetchHttpAdapter()),
  storageAdapter: new FileStorageAdapter(),
});
```

## Configuration

The RippleClient uses `NodeClientConfig` for configuration:

```ts
type NodeClientConfig = {
  apiKey: string; // Required: API authentication key
  endpoint: string; // Required: API endpoint URL
  apiKeyHeader?: string; // Optional: Header name for API key (default: "X-API-Key")
  flushInterval?: number; // Optional: Auto-flush interval in ms (default: 5000)
  maxBatchSize?: number; // Optional: Max events per batch (default: 10)
  maxRetries?: number; // Optional: Max retry attempts (default: 3)
  httpAdapter: HttpAdapter; // Required: HTTP adapter for sending events
  storageAdapter: StorageAdapter; // Required: Storage adapter for persisting events
  loggerAdapter?: LoggerAdapter; // Optional: Logger adapter (default: ConsoleLoggerAdapter with WARN level)
};
```

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

```ts
import { ConsoleLoggerAdapter, LogLevel } from "@tapsioss/ripple-node";

const client = new RippleClient({
  // ... other config
  loggerAdapter: new ConsoleLoggerAdapter(LogLevel.DEBUG),
});
```

## API Reference

### `RippleClient`

#### `constructor(config: NodeClientConfig)`

Creates a new RippleClient instance.

**Parameters:**

- `config: NodeClientConfig` - Client configuration with optional adapters

#### `async init(): Promise<void>`

Initializes the client and restores persisted events. **Must be called before
tracking events**, otherwise `track()` will throw an error to prevent data loss.

#### `async track(name: string, payload?: EventPayload, metadata?: TMetadata): Promise<void>`

Tracks an event with optional payload data and typed metadata. Metadata includes
schemaVersion for event versioning. Platform information (server) is
automatically attached.

**Throws**: Error if `init()` has not been called.

#### `setMetadata<K>(key: K, value: TMetadata[K]): void`

Sets a global metadata value that will be attached to all subsequent events.

#### `async flush(): Promise<void>`

Immediately flushes all queued events to the server.

#### `dispose(): void`

Disposes the client and cleans up resources. Cancels scheduled flushes. Call
this when you're done using the client (e.g., during graceful shutdown).

## Storage

By default, events are persisted to `.ripple_events.json` in the current working
directory. You can customize the file path:

```ts
import { RippleClient, FileStorageAdapter } from "@tapsioss/ripple-node";

const client = new RippleClient({
  ...config,
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
