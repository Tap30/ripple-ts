---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Refactor cart-related event payloads to use a new `Cart` type and fix `Shipping.price` type.

**Changes:**

- `CartModificationPayload`: replaced `cartId?: string` with `cart: Cart`.
- `CartViewedPayload`: replaced `cartId?: string` and `products: Product[]` with `cart: Cart`.
- `CartEmptiedPayload`: replaced `cartId?: string` and `products: Product[]` with `cart: Cart`.
- `Shipping.price`: changed from `number` to `Money`.

**Added:**

- New `Cart` type with `cartId` and `products` fields.
- Exported `Cart` type from both browser and node packages.
