# Migration Guide: v1 → v2

## Configuration

### `flushInterval`, `maxBatchSize`, `maxRetries` → `batchOptions`, `retryOptions`

Flat configuration fields have been replaced with structured option objects.

```diff
 const client = new RippleClient({
   apiKey: "your-api-key",
   endpoint: "https://api.example.com/events",
-  flushInterval: 5000,
-  maxBatchSize: 10,
-  maxRetries: 3,
+  batchOptions: {
+    interval: 10000,       // default changed from 5000 to 10000
+    size: 10,
+    maxPayloadSize: 65536, // NEW: 64KB limit per batch
+  },
+  retryOptions: {
+    maxAttempts: 3,
+    minDelay: 1000,        // NEW
+    maxDelay: 360000,      // NEW
+    backoffFactor: 2,      // NEW
+  },
   httpAdapter: new FetchHttpAdapter(),
   storageAdapter: new IndexedDBAdapter(),
 });
```

> **Note:** The default flush interval changed from 5000ms to 10000ms.

## Event Type System

### Custom events no longer need to redeclare predefined events

The `TEvents` generic parameter is now `TCustomEvents`. Predefined CDP events
are always available — no need to include them in your custom type map.

```diff
-type MyEvents = {
-  product_viewed: { product: Product };   // no longer needed
-  "custom.event": { foo: string };
-};
-const client = new RippleClient<MyEvents, Metadata>(config);
+type MyCustomEvents = {
+  "custom.event": { foo: string };
+};
+const client = new RippleClient<MyCustomEvents, Metadata>(config);
```

All predefined events (`product_viewed`, `order_completed`, etc.) are available
with full autocomplete and type checking out of the box.

## `track()` API

### Third parameter changed from metadata to `schemaVersion`

Per-event metadata has been removed from `track()`. Use `setMetadata()` for
global metadata instead.

```diff
-await client.track("event", payload, { schemaVersion: "1.0", source: "web" });
+client.setMetadata("source", "web");
+await client.track("event", payload, "1.0");
```

## Event Structure

### New fields on the `Event` object

| Field           | Type             | Description                 |
| --------------- | ---------------- | --------------------------- |
| `eventId`       | `string`         | UUID for deduplication      |
| `anonymousId`   | `string`         | Anonymous user/device ID    |
| `userId`        | `string \| null` | Authenticated user ID       |
| `schemaVersion` | `string \| null` | Custom event schema version |
| `sdk`           | `SdkInfo`        | SDK name and version        |

### Removed fields

| Field       | Migration                            |
| ----------- | ------------------------------------ |
| `sessionId` | Moved to platform-specific (browser) |

## New Convenience Methods

```ts
// Identify a user
await client.identify("user-123", { email: "user@example.com" });

// Track element interactions
await client.click({ elementId: "btn-signup", elementType: "button" });
await client.view({ elementId: "hero-banner" });
```

These are shorthand for `client.track("user_identified", ...)`,
`client.track("clicked", ...)`, and `client.track("viewed", ...)`.

## Adapters

### `httpAdapter` is now optional

The built-in `HttpClient` (isomorphic fetch-based) is used by default. You no
longer need to pass an HTTP adapter unless you need custom behavior.

```diff
 const client = new RippleClient({
   apiKey: "your-api-key",
   endpoint: "https://api.example.com/events",
-  httpAdapter: new FetchHttpAdapter(),
   storageAdapter: new IndexedDBAdapter(),
 });
```

### `FetchHttpAdapter` removed from packages

The package-specific `FetchHttpAdapter` exports have been removed. Use the
built-in `HttpClient` from core (auto-applied) or import it explicitly:

```diff
-import { FetchHttpAdapter } from "@tapsioss/ripple-browser";
+import { HttpClient } from "@tapsioss/ripple-browser";
```

### Logger class renames

| v1                     | v2              |
| ---------------------- | --------------- |
| `ConsoleLoggerAdapter` | `ConsoleLogger` |
| `NoOpLoggerAdapter`    | `NoOpLogger`    |

### `HttpAdapter.send()` signature changed

The adapter now receives a context object instead of positional arguments:

```diff
-send(endpoint: string, events: Event[], headers: Record<string, string>, apiKeyHeader: string): Promise<HttpResponse>
+send(context: HttpAdapterContext): Promise<HttpResponse>
```

## Storage

### `StorageAdapter` interface requires `init()` method

Custom storage adapters must now implement `init(): Promise<void>`.

### Browser storage classes consolidated

`IndexedDBAdapter` and `LocalStorageAdapter` are no longer exported. Use
`WebStorage` which auto-detects the best available backend:

```diff
-import { IndexedDBAdapter } from "@tapsioss/ripple-browser";
-const storage = new IndexedDBAdapter({ ttl: 3600000 });
+import { WebStorage } from "@tapsioss/ripple-browser";
+const storage = new WebStorage();
```

### Storage class renames

| v1                    | v2            |
| --------------------- | ------------- |
| `IndexedDBAdapter`    | (internal)    |
| `LocalStorageAdapter` | (internal)    |
| `NoOpStorageAdapter`  | `NoOpStorage` |

### `ttl` removed from storage layer

The `ttl` option has been removed from storage adapters. Event expiry is now
handled at the dispatcher level via `eventTTL` in client config:

```ts
const client = new RippleClient({
  eventTTL: 86400000, // Drop events older than 24 hours at flush time
  // ...
});
```
