# AI Agent Documentation

## Project Overview

Ripple TypeScript is a high-performance event tracking SDK system with
TypeScript SDKs for Browser and Node.js environments.

## Architecture

### Monorepo Structure

```txt
ripple-ts/
├── packages/
│   ├── browser/          # Browser SDK (@tapsioss/ripple-browser)
│   └── node/             # Node.js SDK (@tapsioss/ripple-node)
├── internals/core/       # Shared internals (@internals/core)
├── playground/           # Development environments
└── scripts/              # Build scripts
```

### Core Components

- **Client** - Abstract base class with type-safe metadata management
- **MetadataManager** - Type-safe global metadata handling
- **Dispatcher** - Buffer management, batching, retry logic with race condition
  prevention
- **Adapters** - Pluggable HTTP, storage, and logger implementations

### Type Safety

```ts
// Define event types mapping
type AppEvents = {
  "user.login": { email: string; method: "google" | "email" };
  "page.view": { url: string; title: string };
};

// Define metadata type
type AppMetadata = {
  userId: string;
  sessionId: string;
  schemaVersion: string;
};

// Create typed client
const client = new RippleClient<AppEvents, AppMetadata>(config);

// Type-safe tracking
await client.track("user.login", {
  email: "user@example.com",
  method: "google",
});
```

## Key Features

- **Type-Safe Event Tracking** - Generic TEvents parameter for compile-time
  safety
- **Unified Metadata System** - Merges shared and event-specific metadata
- **Automatic Batching** - Configurable batch size with auto-flush
- **Dynamic Rebatching** - Automatically rebatches accumulated events during
  flush for optimal throughput
- **Retry Logic** - Exponential backoff with jitter
- **Event Persistence** - Automatic storage of unsent events with TTL and buffer
  limits
- **Storage Availability Detection** - Static `isAvailable()` method on all
  storage adapters for graceful degradation
- **Race Condition Prevention** - Mutex-protected operations and atomic
  IndexedDB transactions
- **Custom Adapters** - Pluggable HTTP, storage, and logger implementations

## Technology Stack

- **Package Manager**: pnpm with workspaces
- **Build**: tsdown (rolldown-based TypeScript bundler)
- **Testing**: Vitest with 100% coverage requirement
- **Distribution**: ESM-only format for modern environments

## Development Commands

```sh
pnpm build          # Build all packages
pnpm test           # Run tests with coverage
pnpm check:lint     # ESLint, TypeScript, and Prettier check
pnpm format         # Prettier formatting
pnpm clean          # Clean build artifacts
```

## Testing

- **Coverage**: 100% statements, branches, functions, lines
- **Structure**: Tests co-located with source files `(\*.test.ts)`
- **Environments**: `jsdom` for browser, node for Node.js
- **Total**: 180 tests across all packages (140 browser + 40 node)

## Code Guidelines

### Naming Conventions

- Private members: `_` prefix
- Public methods: Explicit `public` keyword
- Use `interface` for OOP contracts, `type` for data structures

### JSDoc Format

```ts
/**
 * Send events to the specified endpoint.
 *
 * @param endpoint The API endpoint URL
 * @param events Array of events to send
 * @returns Promise resolving to HTTP response
 */
```

## Usage Example

```ts
import { RippleClient } from "@tapsioss/ripple-browser";

const client = new RippleClient<AppEvents, AppMetadata>({
  apiKey: "your-api-key",
  endpoint: "https://api.example.com/events",
  httpAdapter: new FetchHttpAdapter(),
  storageAdapter: new LocalStorageAdapter(),
});

await client.init();
await client.track("user.login", {
  email: "user@example.com",
  method: "google",
});
await client.flush();
client.dispose(); // Clean up when done
```

## Contributing

1. Fork and create feature branch
2. Ensure 100% test coverage
3. Run `pnpm check:lint` and `pnpm test` before committing
4. Follow commit convention: `feat:`, `fix:`, `docs:`, etc.
