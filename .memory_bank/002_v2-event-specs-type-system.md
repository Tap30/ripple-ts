# V2 Event Specs & Type System

**Date:** June 10, 2026  
**Status:** In Progress

## Context

Ripple SDK V2 shifts focus from generic event tracking to **CDP (Customer Data
Platform) integration** with predefined event specifications. The goal is to
provide standardized event schemas for ecommerce platforms while maintaining the
flexibility for custom events and full type safety.

## Key Architectural Decisions

### 1. Separation of Concerns: event-specs.ts

**Decision:** Create a dedicated `internals/core/event-specs.ts` file for all
CDP-related event payloads and type mappings, separate from core infrastructure
types.

**Rationale:**

- **Clarity:** Core types (`Event`, `Platform`, `HttpResponse`) vs
  domain-specific types (product, order, payment payloads)
- **Maintainability:** Event specifications can evolve independently from SDK
  infrastructure
- **Discoverability:** Developers can find all predefined events in one place

**Structure:**

```
internals/core/
├── types.ts         # Core SDK types (Event, Platform, shared domain types)
├── event-specs.ts   # All predefined event payloads + PredefinedEvents map
└── index.ts         # Public exports
```

### 2. Predefined Event Coverage

**Decision:** Implement comprehensive CDP event specs covering the full
ecommerce funnel.

**Event Categories (43 events):**

- **Identity & Lifecycle:** `identify`, `screen`, `app_state_changed`
- **Product Discovery:** `product_clicked`, `product_viewed`, `product_shared`,
  `products_searched`, `product_list_viewed`, `product_list_filtered`
- **Wishlist:** `product_added_to_wishlist`, `product_removed_from_wishlist`
- **Cart:** `product_added_to_cart`, `product_removed_from_cart`, `cart_viewed`,
  `cart_emptied`
- **Reviews:** `product_reviewed`
- **Checkout:** `checkout_started`, `checkout_step_viewed`,
  `checkout_step_completed`
- **Orders:** `order_completed`, `order_failed`, `order_cancelled`,
  `order_shipped`, `order_refunded`, `order_updated`, `order_product_fulfilled`,
  `order_product_returned`, `order_fulfillment_status_updated`
- **Coupons:** `coupon_entered`, `coupon_removed`, `coupon_denied`,
  `coupon_redeemed`
- **Promotions:** `promotion_viewed`, `promotion_clicked`
- **Payments:** `payment_authorized`, `payment_captured`, `payment_failed`,
  `payment_refunded`

**Rationale:**

- Industry-standard event names align with common CDP platforms (Segment,
  Amplitude, Mixpanel)
- Covers complete purchase funnel from discovery to post-purchase
- Enables out-of-the-box analytics dashboards and funnels

### 3. Shared Domain Types

**Decision:** Define reusable domain types in `types.ts` that compose into event
payloads.

**Core Domain Types:**

- `Money` - amount + currency (ISO 4217)
- `Product` - complete product representation with SKU, category, price,
  discount, quantity
- `Order` - order with products, revenue, shipping, tax, coupons, totals
- `Cart` - shopping cart with products
- `Checkout` - checkout session with partial order and step tracking
- `Payment` - payment transaction with method, amount, gateway
- `Coupon` - discount code with amount
- `Category`, `Address`, `Shipping` - supporting types
- `Pagination`, `Filter`, `Sort` - list navigation types
- `Campaign` - UTM parameters for attribution

**Rationale:**

- **Composition over duplication:** `Order` type reused across
  `order_completed`, `order_shipped`, `order_refunded`, etc.
- **Type safety:** Strong typing prevents field name typos and ensures
  consistent data shape
- **Validation:** Single source of truth for domain concepts

### 4. PredefinedEvents Type Map

**Decision:** Create a single `PredefinedEvents` type mapping event names to
payload types.

```ts
export type PredefinedEvents = {
  product_viewed: ProductViewedPayload;
  cart_viewed: CartViewedPayload;
  order_completed: OrderCompletedPayload;
  // ... 40 more events
};
```

**Rationale:**

- **Autocomplete:** IDE suggests valid event names when typing
- **Type safety:** Compiler ensures correct payload shape for each event
- **Merge with custom events:** `PredefinedEvents & TCustomEvents` enables both
  predefined and user-defined events

### 5. Updated Event Structure

**Decision:** Enhance root `Event<TMetadata>` type with CDP-required fields.

**V2 Changes:**

```diff
 type Event<TMetadata> = {
   name: string;
   payload: EventPayload | null;
   metadata: TMetadata | null;
   platform: Platform | null;
+  sdk: SdkInfo;                    // NEW: SDK name + version
   issuedAt: number;
-  sessionId: string | null;        // REMOVED: moved to metadata
+  anonymousId: string;             // NEW: anonymous user ID
+  eventId: string;                 // NEW: UUID for deduplication
+  schemaVersion: string | null;    // NEW: custom event schema version
+  userId: string | null;           // NEW: authenticated user ID
 };
```

**Rationale:**

- **CDP standard fields:** `anonymousId`, `userId`, `eventId` align with Segment
  spec
- **Deduplication:** `eventId` prevents duplicate event processing
- **Identity resolution:** `anonymousId` + `userId` enable cross-device tracking
- **Schema evolution:** `schemaVersion` supports custom event versioning

### 6. Custom Properties Pattern

**Decision:** Every event payload includes
`customProperties?: Record<string, Primitive>` for extensibility.

**Rationale:**

- **Flexibility:** Users can add domain-specific fields without forking types
- **Type safety:** `Primitive` union (`number | boolean | string`) prevents
  complex nested objects
- **Future-proof:** New business requirements don't require SDK updates

## API Design Decisions (In Progress)

### Decided

1. ✅ **Track API:** `client.track(eventName, payload, schemaVersion?)`
   - Used for all predefined and custom events
   - `schemaVersion` parameter only for custom events
2. ✅ **Identity API:** `client.identify(userId, traits?)`
3. ✅ **Screen API:** `client.screen(screenName, properties?)`
4. ✅ **Metadata API:** `client.setMetadata(metadata)`
   - Removed metadata from `.track()` third parameter

### Pending

- Should `identify()` send an event or just set `userId`?
- Should `screen()` auto-trigger a predefined event?
- Schema version default for predefined events?
- Custom event name collision handling?

## Migration Impact

**Breaking Changes:**

- `Event<TMetadata>` structure changed (added fields, removed `sessionId`)
- Generic signature will change: `RippleClient<TEvents, TMetadata>` →
  `RippleClient<TCustomEvents, TMetadata>`
- Third parameter of `.track()` changed from metadata to schemaVersion

**Migration Path:**

- Major version bump (v2.0.0)
- Changeset-based migration guide

## Next Steps

1. Update `Client` base class to support merged event map
2. Implement auto-capture for platform and SDK info
3. Build-time script to inject SDK version
4. Update tests for new event structure
5. Create migration guide document

## References

- Core types: `internals/core/types.ts`
- Event specs: `internals/core/event-specs.ts`
- V1 architecture: `.memory_bank/001_v1-architecture-foundation.md`
