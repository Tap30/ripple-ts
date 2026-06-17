---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

CDP Event Specifications & Type System Foundation.

#### Breaking Changes

##### Event Structure Changes**

The root `Event<TMetadata>` type has been significantly updated to align with CDP (Customer Data Platform) standards:

**Added fields:**

- `sdk: SdkInfo` - SDK name and version (auto-injected at build time)
- `anonymousId: string` - Anonymous user identifier for cross-device tracking
- `eventId: string` - Unique UUID for event deduplication
- `schemaVersion: string | null` - Schema version for custom events
- `userId: string | null` - Authenticated user identifier

**Removed fields:**

- `sessionId: string | null` - Moved to metadata (platform-specific implementation)

**Migration:**

```diff
 type Event<TMetadata> = {
   name: string;
   payload: EventPayload | null;
   metadata: TMetadata | null;
   platform: Platform | null;
+  sdk: SdkInfo;
   issuedAt: number;
-  sessionId: string | null;
+  anonymousId: string;
+  eventId: string;
+  schemaVersion: string | null;
+  userId: string | null;
 };
```

#### New Features

##### Predefined CDP Events

Added predefined events covering the complete ecommerce funnel with full type safety:

- **Product Discovery:** `product_viewed`, `product_clicked`, `products_searched`, `product_list_viewed`, `product_list_filtered`
- **Wishlist:** `product_added_to_wishlist`, `product_removed_from_wishlist`
- **Cart:** `product_added_to_cart`, `product_removed_from_cart`, `cart_viewed`, `cart_emptied`
- **Checkout:** `checkout_started`, `checkout_step_viewed`, `checkout_step_completed`
- **Orders:** `order_completed`, `order_failed`, `order_cancelled`, `order_shipped`, `order_refunded`, `order_updated`
- **Payments:** `payment_authorized`, `payment_captured`, `payment_failed`, `payment_refunded`
- **Coupons:** `coupon_entered`, `coupon_removed`, `coupon_denied`, `coupon_redeemed`
- **Promotions:** `promotion_viewed`, `promotion_clicked`
- **Identity & Lifecycle:** `identify`, `screen`, `app_state_changed`

All predefined events include TypeScript autocomplete and compile-time validation.

#### Shared Domain Types

Added comprehensive domain types for ecommerce tracking:

- `Money` - Amount with ISO 4217 currency code
- `Product` - Complete product representation with price, category, SKU, vendor
- `Order` - Order with products, revenue, shipping, tax, discounts, totals
- `Cart` - Shopping cart with products
- `Checkout` - Checkout session with step tracking
- `Payment` - Payment transaction with method, amount, gateway
- `Coupon` - Discount code with amount
- `Category`, `Address`, `Shipping` - Supporting types
- `Pagination`, `Filter`, `Sort` - List navigation
- `Campaign` - UTM attribution parameters

#### New Module: event-specs.ts

Created `internals/core/event-specs.ts` containing:

- All predefined event payload types
- `PredefinedEvents` type map for event name → payload type mapping
- Event-specific types separate from core infrastructure types

#### Type Safety Enhancements

**PredefinedEvents Type Map:**

```ts
export type PredefinedEvents = {
  product_viewed: ProductViewedPayload;
  cart_viewed: CartViewedPayload;
  order_completed: OrderCompletedPayload;
  // ... 40 more events
};
```

**Merged Event Types:**
Custom events will be merged with predefined events:

```ts
type CustomEvents = {
  "feature.enabled": { featureName: string };
};

const client = new RippleClient<CustomEvents, AppMetadata>(config);

// Both predefined and custom events available with autocomplete
await client.track("product_viewed", { product: {...} });
await client.track("feature.enabled", { featureName: "dark-mode" }, "1.0.0");
```
