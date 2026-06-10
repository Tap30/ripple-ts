# AI Agent Documentation

## Memory Bank

The `.memory_bank/` directory contains historical records of important design
decisions, architectural changes, and tradeoffs. Before working on major
changes, review relevant memory bank documents to understand the context and
rationale behind existing decisions.

## Project Overview

Ripple TypeScript is a high-performance event tracking SDK system with
TypeScript SDKs for Browser and Node.js environments.

## Architecture

### Monorepo Structure

```txt
ripple-ts/
├── .memory_bank/         # Design decisions and architecture history
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
- **Event Specs** - Predefined CDP events with full type safety

### Type Safety

```ts
// Define custom event types (optional)
type CustomEvents = {
  "custom.event": { customField: string };
};

// Define metadata type
type AppMetadata = {
  appVersion: string;
  buildNumber: string;
};

// Create typed client (PredefinedEvents + CustomEvents merged automatically)
const client = new RippleClient<CustomEvents, AppMetadata>(config);

// Type-safe tracking with autocomplete for predefined events
await client.track("product_viewed", {
  product: {
    productId: "123",
    price: { amount: 29.99, currency: "USD" },
  },
});

// Custom events with schema versioning
await client.track("custom.event", { customField: "value" }, "1.0.0");

// Identity and screen tracking
await client.identify("user-123", { email: "user@example.com" });
await client.screen({ title: "Product Detail", url: "/product/123" });

// Global metadata
client.setMetadata({ appVersion: "2.0.0", buildNumber: "456" });
```

### Predefined Events

Ripple V2 includes predefined CDP events covering the complete ecommerce funnel:

- **Product Discovery:** `product_viewed`, `product_clicked`,
  `products_searched`, `product_list_viewed`, `product_list_filtered`
- **Cart & Wishlist:** `product_added_to_cart`, `cart_viewed`, `cart_emptied`,
  `product_added_to_wishlist`
- **Checkout:** `checkout_started`, `checkout_step_viewed`,
  `checkout_step_completed`
- **Orders:** `order_completed`, `order_shipped`, `order_refunded`,
  `order_cancelled`
- **Payments:** `payment_authorized`, `payment_captured`, `payment_failed`,
  `payment_refunded`
- **Coupons & Promotions:** `coupon_applied`, `coupon_denied`,
  `promotion_viewed`

See `internals/core/event-specs.ts` and `internals/core/types.ts` for type
definitions.

## Key Features

- **Type-Safe Event Tracking** - Generic TEvents parameter for compile-time
  safety
- **Predefined CDP Events** - standard ecommerce events with full type safety
- **Custom Event Support** - Merge custom events with predefined events
  seamlessly
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
- **Auto-Capture** - Platform and SDK info automatically populated per event

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

## Code Guidelines

### Naming Conventions

- Private members: `#` prefix (native ES private member syntax)
- Public methods: Explicit `public` keyword
- Use `interface` for OOP contracts, `type` for data structures
- Event names: snake_case (e.g., `product_viewed`, `order_completed`)

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

// Optional: define custom events
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
  httpAdapter: new FetchHttpAdapter(),
  storageAdapter: new LocalStorageAdapter(),
});

await client.init();

// Set global metadata
client.setMetadata({ appVersion: "2.0.0", environment: "prod" });

// Identify user
await client.identify("user-123", {
  email: "user@example.com",
  firstName: "John",
});

// Track predefined events (with autocomplete!)
await client.track("product_viewed", {
  product: {
    productId: "prod-456",
    productTitle: "Awesome Product",
    price: { amount: 49.99, currency: "USD" },
  },
});

await client.track("order_completed", {
  order: {
    orderId: "order-789",
    products: [
      /* ... */
    ],
    revenue: { amount: 49.99, currency: "USD" },
    total: { amount: 54.99, currency: "USD" },
  },
});

// Track custom events
await client.track("feature.enabled", { featureName: "dark-mode" }, "1.0.0");

// Flush and cleanup
});
await client.flush();
client.dispose(); // Clean up when done
```

## Contributing

1. Fork and create feature branch
2. Ensure 100% test coverage
3. Run `pnpm check:lint` and `pnpm test` before committing
4. Follow commit convention: `feat:`, `fix:`, `docs:`, etc.
5. Review `.memory_bank/` for context on design decisions
6. Document major architectural changes in `.memory_bank/`
