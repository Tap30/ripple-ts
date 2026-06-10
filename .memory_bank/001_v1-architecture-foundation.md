# V1 Architecture Foundation

**Date:** 2025-2026  
**Status:** Historical (Superseded by V2)

## Context

Ripple SDK V1 was designed as a high-performance event tracking system for
TypeScript environments (Browser and Node.js). The primary goal was to provide a
type-safe, flexible analytics SDK with automatic batching, retry logic, and
persistence.

## Key Architectural Decisions

### 1. Type-Safe Event Tracking

**Decision:** Use TypeScript generics to enforce compile-time type safety for
events and metadata.

**Rationale:**

- Prevent runtime errors from mistyped event names or payloads
- Enable IDE autocompletion for better developer experience
- Maintain flexibility for custom event schemas per application

**Implementation:**

```ts
type AppEvents = {
  "user.login": { email: string; method: "google" | "email" };
  "page.view": { url: string; title: string };
};

const client = new RippleClient<AppEvents, AppMetadata>(config);
```

### 2. Monorepo Structure with Shared Core

**Decision:** Use pnpm workspaces with platform-specific packages (browser/node)
and shared internals.

**Rationale:**

- Code reuse: Core logic (Client, Dispatcher, MetadataManager) shared across
  platforms
- Platform-specific adapters: HTTP, storage, and logging implementations
  optimized per environment
- Independent versioning while maintaining consistency

**Tradeoffs:**

- Added build complexity
- Required careful dependency management
- **Benefit:** Reduced duplication, consistent behavior across platforms

### 3. Pluggable Adapter Pattern

**Decision:** Use dependency injection for HTTP, storage, and logger adapters.

**Rationale:**

- Flexibility: Users can provide custom implementations
- Testability: Easy to mock adapters in tests
- Environment adaptation: Different storage (localStorage vs file system) per
  platform

**Implementation:**

```ts
interface HttpAdapter {
  send(endpoint: string, events: Event[]): Promise<HttpResponse>;
}

interface StorageAdapter {
  save(events: Event[]): Promise<void>;
  load(): Promise<Event[]>;
  static isAvailable(): boolean;
}
```

### 4. Automatic Batching with Dynamic Rebatching

**Decision:** Buffer events and flush when batch size reached, with rebatching
during flush.

**Rationale:**

- Network efficiency: Reduce HTTP requests
- Performance: Minimize I/O operations
- **Innovation:** Dynamic rebatching during flush ensures optimal throughput
  even with accumulated events

**Configuration:**

```ts
{
  batchSize: 10,           // Events per batch
  flushInterval: 30000,    // Auto-flush timer (ms)
}
```

### 5. Retry Logic with Exponential Backoff

**Decision:** Implement retry mechanism with exponential backoff and jitter.

**Rationale:**

- Reliability: Handle temporary network failures
- Server protection: Jitter prevents thundering herd
- User experience: Transparent recovery from transient errors

### 6. Race Condition Prevention

**Decision:** Use mutex locks and atomic IndexedDB transactions.

**Rationale:**

- Data integrity: Prevent concurrent flush operations from corrupting state
- Consistency: Ensure events aren't duplicated or lost
- Critical for: Background flush timers + manual flush calls

### 7. Event Persistence with TTL

**Decision:** Automatically persist unsent events with time-to-live and buffer
limits.

**Rationale:**

- Durability: Survive page reloads and app crashes
- Storage management: TTL and size limits prevent unbounded growth
- Privacy: Old events automatically expire

**Configuration:**

```ts
{
  maxBufferSize: 1000,    // Max stored events
  eventTTL: 86400000,     // 24 hours in ms
}
```

## Technology Choices

### Build System: tsdown

**Decision:** Use tsdown (rolldown-based bundler) instead of tsc or Rollup
directly.

**Rationale:**

- Modern: Built on Rolldown (Rust-based, fast)
- Simplicity: TypeScript bundling without complex configuration
- ESM-first: Aligns with modern JavaScript ecosystem

**Tradeoff:** Less mature than established tools, but performance gains and
simplicity justified the risk.

### Testing: Vitest

**Decision:** Use Vitest with 100% coverage requirement.

**Rationale:**

- Speed: Faster than Jest
- Native ESM support
- Built-in coverage with c8
- Enforced quality bar: 100% coverage ensures thorough testing

### Distribution: ESM-Only

**Decision:** Ship only ES modules, no CommonJS.

**Rationale:**

- Modern JavaScript standard
- Reduced bundle size
- Simpler build output
- **Tradeoff:** Drops support for older Node.js versions and build systems

## Migration Path to V2

V1 focused on **generic event tracking** with user-defined schemas. V2 shifts
toward **CDP (Customer Data Platform) integration** with:

- Predefined event specifications
- Standardized event schemas for interoperability
- Maintained type safety and custom event support
- Enhanced developer experience with autocomplete for standard events

See `002_v2-cdp-migration.md` for V2 architectural changes.
