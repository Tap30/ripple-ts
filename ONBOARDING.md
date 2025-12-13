# Onboarding Documentation

## Project Overview

Ripple TypeScript is a high-performance, scalable, and fault-tolerant event
tracking SDK system. This monorepo houses TypeScript SDKs for different runtime
environments (Browser and Node.js).

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

### Browser-Specific Features

- **Automatic Session Tracking**: Generates and maintains session ID tied to
  browser session lifecycle
- **Multiple Storage Options**:
  - LocalStorage (5-10MB, permanent)
  - SessionStorage (5-10MB, session-only)
  - IndexedDB (50MB-1GB+, high performance)
  - Cookies (4KB, cross-domain capable)
- **Fetch API with Keepalive**: Native browser HTTP support with `keepalive`
  flag for reliable event delivery
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
  apiKeyHeader?: string;    // Optional: Header name for API key (default: "X-API-Key")
  flushInterval?: number;   // Optional: Auto-flush interval (default: 5000ms)
  maxBatchSize?: number;    // Optional: Max events per batch (default: 10)
  maxRetries?: number;      // Optional: Max retry attempts (default: 3)
}
```

### Developer Experience

- **Full TypeScript Support**: Strict typing with generics
- **JSDoc Documentation**: Comprehensive inline documentation
- **ESLint Compliant**: Follows strict linting rules
- **Tree-Shakeable**: Optimized bundle size
- **Zero Dependencies**: Core has no external dependencies
- **Clear Error Messages**: Descriptive error handling
- **Usage Examples**: Playground with real-world scenarios
- **Migration Guides**: Documentation for version upgrades

## Architecture

### Monorepo Structure

```sh
ripple-ts/
├── packages/
│   ├── browser/          # Browser-specific SDK (@tapsioss/ripple-browser)
│   │   └── src/
│   │       ├── adapters/ # Browser adapters with tests
│   │       ├── *.test.ts # Unit tests co-located with source
│   │       └── index.ts  # Package entry point
│   └── node/             # Node.js-specific SDK (@tapsioss/ripple-node)
│       └── src/
│           ├── adapters/ # Node.js adapters with tests
│           ├── *.test.ts # Unit tests co-located with source
│           └── index.ts  # Package entry point
├── internals/            # Shared internal libs
│   └── core/             # Core internals (@internals/core)
│       └── src/
│           ├── adapters/ # Adapter interfaces
│           ├── *.ts      # Core implementations
│           └── index.ts  # Internal exports
├── playground/           # Development playground
│   ├── browser/          # Browser dev environment
│   └── node/             # Node.js dev environment
└── scripts/              # Build and maintenance scripts
```

### Package Details

#### @tapsioss/ripple-browser

- **Purpose**: Event tracking SDK for browser environments
- **Entry**: `packages/browser/src/index.ts`
- **Build**: ESM-only with TypeScript declarations
- **Environment**: Browser (jsdom for testing)
- **Exports**:
  - `RippleClient` - Main client class
  - `FetchHttpAdapter` - Default HTTP adapter with keepalive support
  - `LocalStorageAdapter` - Default storage adapter
  - `SessionStorageAdapter` - Session-only storage
  - `IndexedDBAdapter` - Large-capacity storage
  - `CookieStorageAdapter` - Cookie-based storage
  - Types: `HttpAdapter`, `StorageAdapter`, `ClientConfig`, `Event`,
    `EventPayload`, `HttpResponse`

#### @tapsioss/ripple-node

- **Purpose**: Event tracking SDK for Node.js runtime
- **Entry**: `packages/node/src/index.ts`
- **Build**: ESM-only with TypeScript declarations
- **Environment**: Node.js
- **Exports**:
  - `RippleClient` - Main client class
  - `FetchHttpAdapter` - Default HTTP adapter (uses Node.js fetch API)
  - `FileStorageAdapter` - Default storage adapter
  - Types: `HttpAdapter`, `StorageAdapter`, `ClientConfig`, `Event`,
    `EventPayload`, `HttpResponse`

#### @internals/core

- **Purpose**: Shared core internal utilities and types
- **Entry**: `core/src/index.ts`
- **Status**: Private internal library
- **Usage**: Shared code between browser and node packages

## Technology Stack

### Build & Development

- **Package Manager**: pnpm (v10.22.0) with workspaces
- **Node Version**: 24.10.0 (managed via Volta)
- **Bundler**: tsdown (rolldown-based, fast TypeScript bundler)
- **TypeScript**: 5.9.3 with strict mode
- **Testing**: Vitest with 100% coverage requirement
- **Linting**: ESLint 9 + Prettier
- **Versioning**: Changesets for version management

### Build System

#### Build Configuration (tsdown)

Each package uses tsdown for building with the following configuration:

- **Entry Points**: `src/index.ts`
- **Output Format**: ESM only (`.js` files)
- **TypeScript Declarations**: `.d.ts` files generated automatically
- **Minification**: Enabled for production builds
- **Source Maps**: Generated (`.js.map` files for debugging)
- **Tree Shaking**: Enabled via ESM format
- **External Dependencies**: All dependencies marked as external (not bundled)
- **Platform-Specific**: Browser and Node.js builds configured separately

#### Build Outputs

```sh
packages/browser/dist/
├── index.js          # ESM bundle (minified)
├── index.js.map      # Source map for debugging
└── index.d.ts        # TypeScript declarations

packages/node/dist/
├── index.js          # ESM bundle (minified)
├── index.js.map      # Source map for debugging
└── index.d.ts        # TypeScript declarations
```

#### Package.json Exports

Both packages use modern ESM-only exports:

```json
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

This ensures:

- ESM-only distribution (Node.js 18+ and modern browsers)
- Proper TypeScript type definitions
- Tree shaking works correctly
- Smaller bundle sizes

### TypeScript Configuration

- **Target**: ES2017
- **Module**: node20 (Node.js ESM resolution)
- **Strict Mode**: Enabled with additional safety checks
- **Path Aliases**: Configured for all packages
- **Key Features**:
  - `noUncheckedIndexedAccess`: true
  - `noPropertyAccessFromIndexSignature`: true
  - `verbatimModuleSyntax`: true
  - `rewriteRelativeImportExtensions`: true

## Core Architecture (OOP Design)

### Class Hierarchy

```sh
Client (abstract)
├── RippleClient (browser)
└── RippleClient (node)

ContextManager
Dispatcher

Interfaces:
├── HttpAdapter
│   ├── FetchHttpAdapter (browser)
│   └── FetchHttpAdapter (node)
└── StorageAdapter
    ├── LocalStorageAdapter (browser)
    └── FileStorageAdapter (node)
```

### Core Components

#### Client (Abstract Base Class)

- **Location**: `@internals/core/client.ts`
- **Purpose**: Base SDK client with common functionality
- **Generic Type**: `Client<TContext>` - Type-safe context management
- **Key Methods**:
  - `init()` - Initialize and restore persisted events (must be called first)
  - `track(name, payload?, metadata?)` - Track an event (throws if not
    initialized)
  - `setContext<K>(key, value)` - Set global context (type-safe)
  - `flush()` - Force flush queued events
  - `dispose()` - Clean up resources and detach event listeners
- **Dependencies**: ContextManager, Dispatcher
- **DX**: Full TypeScript autocomplete for context keys/values

#### ContextManager

- **Location**: `@internals/core/context-manager.ts`
- **Purpose**: Manage global context attached to all events
- **Generic Type**: `ContextManager<TContext>` - Type-safe context
- **Key Methods**:
  - `set<K>(key, value)` - Set context value (type-safe key/value)
  - `get<K>(key)` - Get context value (type-safe return)
  - `getAll()` - Get all context as `Partial<TContext>`
  - `isEmpty()` - Check if context is empty (returns boolean)
  - `clear()` - Clear all context
- **Behavior**: Events with no context will have `context: null` instead of
  empty object
- **DX**: Full TypeScript autocomplete and type checking

#### Dispatcher

- **Location**: `@internals/core/dispatcher.ts`
- **Purpose**: Queue management, batching, and retry logic
- **Generic Type**: `Dispatcher<TContext>` - Type-safe events
- **Constructor**: Accepts `DispatcherConfig` object (not ordered params)
- **Key Methods**:
  - `enqueue(event)` - Add event to queue
  - `flush()` - Send queued events
  - `restore()` - Load persisted events
  - `dispose()` - Clean up timers and cancel scheduled flushes
- **Features**:
  - Auto-flush on batch size threshold
  - Scheduled flush with configurable interval
  - Exponential backoff: `1000ms * 2^attempt + random(0-1000ms)`
  - Retry up to `maxRetries` times
  - Persistence on failure
  - Race condition prevention with Mutex
- **Data Structure**: Uses custom Queue (linked list) for O(1) enqueue/dequeue
- **Concurrency Safety**:
  - Mutex prevents concurrent flush operations
  - Safe to call `enqueue()` during `flush()`
  - Safe to call `flush()` multiple times concurrently
  - Maintains event order during retry failures

#### Mutex

- **Location**: `@internals/core/mutex.ts`
- **Purpose**: Mutual exclusion lock for preventing race conditions
- **Key Method**: `runAtomic(task)` - Execute task with exclusive lock
- **Features**:
  - Queue-based task scheduling
  - Automatic lock release (even on errors)
  - Prevents concurrent access to shared resources
- **Usage**: Used by Dispatcher to prevent concurrent flush operations

#### Race Condition Prevention

The Dispatcher handles four critical race condition scenarios:

##### 1. Concurrent flush() Calls

- **Problem**: Multiple flush calls could process the same events
  simultaneously, causing duplicate sends
- **Solution**: Wrapped flush logic in `_flushMutex.runAtomic()` to serialize
  operations
- **Result**: Only one flush operation runs at a time; subsequent calls wait in
  queue

##### 2. enqueue() During flush()

- **Problem**: Events added after queue copy but before send could be lost or
  misordered
- **Solution**: Mutex ensures flush completes atomically; new events safely
  added to queue
- **Result**: Events enqueued during flush are preserved and sent in next batch

##### 3. Scheduled Flush During Manual flush()

- **Problem**: Timer callback could trigger while manual flush is in progress
- **Solution**: Both scheduled and manual flush use same mutex
- **Result**: Timer flush waits for manual flush to complete; no duplicate
  operations

##### 4. Re-queuing During Retry Failures

- **Problem**: Failed events re-queued after max retries could be misordered
  with new events
- **Solution**: Capture current queue state:
  `[...failedEvents, ...currentQueue]`
- **Result**: Failed events maintain correct order (failed first, then newly
  enqueued)

#### Queue

- **Location**: `@internals/core/queue.ts`
- **Purpose**: Efficient FIFO data structure for event management
- **Implementation**: Singly linked list
- **Key Methods**:
  - `enqueue(value)` - Add to tail (O(1))
  - `dequeue()` - Remove from head (O(1))
  - `toArray()` - Convert to array for serialization
  - `fromArray(items)` - Bulk load from array
  - `size()`, `isEmpty()`, `clear()`
- **Advantages**: Constant time operations, no array reallocation

### Adapter Contracts

#### HttpAdapter Interface

- **Location**: `@internals/core/adapters/http-adapter.ts`
- **Purpose**: Abstract HTTP communication for custom implementations
- **Method**:
  `send(endpoint, events, headers, apiKeyHeader): Promise<HttpResponse>`
- **Parameters**:
  - `endpoint` - API endpoint URL
  - `events` - Array of events to send
  - `headers` - Headers to include in the request
  - `apiKeyHeader` - Header name for API key (kept for interface compatibility)
- **Implementations**:
  - `FetchHttpAdapter` (browser) - Uses browser Fetch API with `keepalive` flag
  - `FetchHttpAdapter` (node) - Uses Node.js fetch API
  - **Custom**: Implement for axios, gRPC, or any HTTP client

#### StorageAdapter Interface

- **Location**: `@internals/core/adapters/storage-adapter.ts`
- **Purpose**: Abstract event persistence for custom implementations
- **Methods**:
  - `save(events)` - Persist events
  - `load()` - Load persisted events
  - `clear()` - Clear persisted events
- **Browser Implementations**:
  - `LocalStorageAdapter` - localStorage (~5-10MB, permanent)
  - `SessionStorageAdapter` - sessionStorage (~5-10MB, session-only)
  - `IndexedDBAdapter` - IndexedDB (~50MB-1GB+, permanent, best performance)
  - `CookieStorageAdapter` - Cookies (~4KB, configurable expiry, limited use)
- **Node.js Implementations**:
  - `FileStorageAdapter` - File system (unlimited, permanent)
  - **Custom**: Implement for Redis, MongoDB, PostgreSQL, etc.

#### Storage Adapter Comparison

| Adapter            | Capacity   | Persistence  | Performance | Best For                   |
| ------------------ | ---------- | ------------ | ----------- | -------------------------- |
| **LocalStorage**   | ~5-10MB    | Permanent    | Good        | Default browser choice     |
| **SessionStorage** | ~5-10MB    | Session only | Good        | Temporary tracking         |
| **IndexedDB**      | ~50MB-1GB+ | Permanent    | Excellent   | Large event queues         |
| **Cookie**         | ~4KB       | Configurable | Fair        | Small queues, cross-domain |
| **FileStorage**    | Unlimited  | Permanent    | Good        | Default Node.js choice     |

### Type Definitions

#### EventMetadata

```typescript
type EventMetadata = {
  schemaVersion?: string;
};
```

#### Platform

```typescript
type PlatformInfo = {
  name: string;
  version: string;
};

type WebPlatform = {
  type: "web";
  browser: PlatformInfo;
  device: PlatformInfo;
  os: PlatformInfo;
};

type NativePlatform = {
  type: "native";
  device: PlatformInfo;
  os: PlatformInfo;
};

type ServerPlatform = {
  type: "server";
};

type Platform = WebPlatform | NativePlatform | ServerPlatform;
```

#### Event (Generic)

```typescript
type Event<TContext = Record<string, unknown>> = {
  name: string;
  payload: Record<string, unknown> | null;
  issuedAt: number;
  context: TContext | null;
  sessionId: string | null;
  metadata: EventMetadata | null;
  platform: Platform | null;
};
```

**Note**: The `context` field is `null` when no context values are set, rather
than an empty object. This reduces payload size for events without context.

#### ClientConfig

```typescript
type ClientConfig = {
  apiKey: string;
  endpoint: string;
  flushInterval?: number; // Default: 5000ms
  maxBatchSize?: number; // Default: 10
  maxRetries?: number; // Default: 3
};
```

#### DispatcherConfig

```typescript
type DispatcherConfig = {
  endpoint: string;
  flushInterval: number;
  maxBatchSize: number;
  maxRetries: number;
};
```

#### HttpResponse

```typescript
type HttpResponse = {
  ok: boolean;
  status: number;
  data?: unknown;
};
```

## Usage Examples

### Basic Usage

```typescript
import { RippleClient } from "@tapsioss/ripple-browser";

const client = new RippleClient({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
});

await client.init();
await client.track("page_view", { page: "/home" });

// Track with metadata
await client.track(
  "user_action",
  { action: "click", button: "submit" },
  { schemaVersion: "1.0.0" },
);

// Track without payload (just signal that something happened)
await client.track("app_started");

await client.flush();
```

**Important**: `init()` must be called before `track()`. Calling `track()`
before initialization will throw an error to prevent data loss.

**Note**: Platform information is automatically detected by the runtime package:

- **Browser**: Detects browser name/version, device type, and OS
- **Node.js**: Sets platform type as "server"

### Event Metadata

Events can include optional metadata for schema versioning and event-specific
information:

```typescript
// Track event with metadata
await client.track(
  "user_signup",
  { email: "user@example.com", plan: "premium" },
  { schemaVersion: "1.0.0" },
);

// Metadata is optional
await client.track("page_view", { page: "/home" });
```

**Use Cases**:

- **Schema Versioning**: Track event schema versions for backward compatibility
- **Event Evolution**: Manage breaking changes in event structure
- **Data Migration**: Identify events that need transformation

### Type-Safe Context

```typescript
interface AppContext extends Record<string, unknown> {
  userId: string;
  sessionId: string;
  appVersion: string;
}

const client = new RippleClient<AppContext>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
});

// Full TypeScript autocomplete and type checking
client.setContext("userId", "123");
client.setContext("sessionId", "abc");
```

### Custom Adapters

#### Using Built-in Adapters

```typescript
import { RippleClient, IndexedDBAdapter } from "@tapsioss/ripple-browser";

// Use IndexedDB for large event queues
const client = new RippleClient({
  ...config,
  adapters: {
    storageAdapter: new IndexedDBAdapter(),
  },
});
```

#### Creating Custom HTTP Adapter

```typescript
import type {
  HttpAdapter,
  HttpResponse,
  Event,
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

// Usage
const client = new RippleClient({
  ...config,
  adapters: {
    httpAdapter: new AxiosHttpAdapter(),
  },
});
```

#### Creating Custom Storage Adapter

```typescript
import type { StorageAdapter, Event } from "@tapsioss/ripple-node";

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

// Usage
const client = new RippleClient({
  ...config,
  adapters: {
    storageAdapter: new RedisStorageAdapter(),
  },
});
```

#### Using Multiple Custom Adapters

```typescript
const client = new RippleClient({
  ...config,
  adapters: {
    httpAdapter: new AxiosHttpAdapter(),
    storageAdapter: new RedisStorageAdapter(),
  },
});
```

## Development Workflow

### Scripts

- `pnpm build` - Build all packages (browser + node)
- `pnpm dev` - Start playground development server
- `pnpm test` - Run all tests with coverage (alias for test:coverage)
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:watch` - Run tests in watch mode
- `pnpm check:lint` - Run ESLint on all packages
- `pnpm check:types` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Remove all build artifacts and node_modules

### Testing Structure

#### Test Organization

All tests are co-located with source files using the pattern `*.test.ts`:

```sh
packages/browser/src/
├── adapters/
│   ├── fetch-http-adapter.ts
│   ├── fetch-http-adapter.test.ts      # 20 tests
│   ├── indexed-db-adapter.ts
│   ├── indexed-db-adapter.test.ts      # 19 tests
│   ├── local-storage-adapter.ts
│   ├── local-storage-adapter.test.ts   # 12 tests
│   ├── session-storage-adapter.ts
│   ├── session-storage-adapter.test.ts # 12 tests
│   ├── cookie-storage-adapter.ts
│   └── cookie-storage-adapter.test.ts  # 15 tests
├── ripple-client.ts
├── ripple-client.test.ts               # 21 tests
├── session-manager.ts
└── session-manager.test.ts             # 17 tests

packages/node/src/
├── adapters/
│   ├── fetch-http-adapter.ts
│   ├── fetch-http-adapter.test.ts      # 7 tests
│   ├── file-storage-adapter.ts
│   └── file-storage-adapter.test.ts    # 14 tests
├── ripple-client.ts
└── ripple-client.test.ts               # 12 tests
```

#### Test Coverage

**Browser Package** (116 tests):

- ✅ 100% statements, branches, functions, and lines
- All adapters: fetch-http, indexed-db, local-storage, session-storage,
  cookie-storage
- Core: ripple-client, session-manager

**Node Package** (33 tests):

- ✅ 100% statements, branches, functions, and lines
- All adapters: fetch-http, file-storage
- Core: ripple-client

**Total**: 149 tests across both runtimes

#### Test Configuration

Each package has its own `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // or 'node' for node package
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/**/types.ts"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
```

#### Test Environments

- **Browser Package**: Uses `jsdom` to simulate browser APIs (DOM, localStorage,
  IndexedDB, fetch, etc.)
- **Node Package**: Uses `node` environment for native Node.js APIs (fs, fetch)
- **Internals**: Uses `node` environment (no browser-specific code)

#### Testing Best Practices

1. **No `any` Types**: All tests use proper TypeScript types
2. **No Private Access**: Tests only use public APIs (no `as any` to access
   private methods)
3. **Co-located Tests**: Tests live next to source files for easy maintenance
4. **Comprehensive Coverage**: 100% coverage requirement enforced
5. **Mock Properly**: Use proper type assertions (`as unknown as Type`) instead
   of `any`
6. **Test Behavior**: Focus on public API behavior, not implementation details

## Design Principles

### 1. Runtime Separation

- Browser and Node.js SDKs are separate packages
- Shared code lives in `@internals/core`
- Each package has runtime-specific implementations

### 2. Type Safety

- Strict TypeScript configuration
- No implicit any
- Exhaustive null/undefined checks
- Index access safety

### 3. Testing

- 100% code coverage requirement
- Unit tests co-located with source
- End-to-end tests in playground

### 4. Distribution

- **ESM-Only Format**: Modern `.js` files for Node.js 18+ and modern browsers
- **Tree-Shakeable**: ESM format enables dead code elimination
- **Minimal Bundle Size**: Minified output, external dependencies not bundled
- **Type Definitions**: Full TypeScript support with `.d.ts` files
- **Modern Exports**: Uses `exports` field for proper module resolution
- **Zero Runtime Dependencies**: Core has no external dependencies (only dev
  dependencies)

## API Contract

The SDK follows a framework-agnostic design and API contract defined in the main
Ripple repository. See:
<https://github.com/Tap30/ripple/blob/main/DESIGN_AND_CONTRACTS.md>

## Contributing Guidelines

### Commit Convention

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes

### Pull Request Process

1. Fork and clone the repository
2. Create a feature branch
3. Make changes with appropriate tests
4. Ensure 100% test coverage
5. Run `pnpm check:lint` before committing
6. Submit PR with clear description

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Write descriptive variable names
- **Naming Conventions**:
  - Private members: Use `_` prefix (e.g., `_context`, `_queue`, `_timer`)
  - Public methods: Explicit `public` keyword required
  - Protected members: Explicit `protected` keyword required
- **Type Definitions**:
  - Use `interface` only for OOP interfaces (e.g., `HttpAdapter`,
    `StorageAdapter`)
  - Use `type` for all other type definitions (data structures, configurations,
    unions)
- **Documentation**:
  - Add JSDoc comments for all public APIs
  - Document all classes with purpose and generic types
  - Document all methods with parameters and return types
  - Add inline comments for complex logic
- **JSDoc Format**:
  - No dashes before parameter descriptions
  - Blank line after main description
  - Always use multi-line format (never single-line `/** comment */`)
  - Format: `@param paramName Description without dash`
  - Example:

    ```typescript
    /**
     * Send events to the specified endpoint.
     *
     * @param endpoint The API endpoint URL
     * @param events Array of events to send
     * @returns Promise resolving to HTTP response
     */
    ```

  - Field comments (always multi-line):

    ```typescript
    type Config = {
      /**
       * API endpoint URL
       */
      endpoint: string;
    };
    ```

## Key Files

- `package.json` - Root workspace configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration
- `pnpm-workspace.yaml` - Workspace definition
- `.changeset/config.json` - Changesets configuration
