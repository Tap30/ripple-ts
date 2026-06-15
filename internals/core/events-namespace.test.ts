import { describe, expect, it, vi } from "vitest";
import type { Client } from "./client.ts";
import { PREDEFINED_SCHEMA_VERSION } from "./event-specs.ts";
import { EventsNamespace } from "./events-namespace.ts";

const createMockClient = () =>
  ({
    track: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Client;

describe("EventsNamespace", () => {
  it("should support all event categories", async () => {
    const client = createMockClient();
    const events = new EventsNamespace(client);

    const methods: [string, string, Record<string, unknown>][] = [
      ["productClicked", "product_clicked", { product: {} }],
      ["productViewed", "product_viewed", { product: {} }],
      ["productShared", "product_shared", { product: {} }],
      ["productsSearched", "products_searched", { query: "test" }],
      ["productListViewed", "product_list_viewed", { products: [] }],
      [
        "productListFiltered",
        "product_list_filtered",
        { filters: [], sorts: [], products: [] },
      ],
      [
        "productReviewed",
        "product_reviewed",
        { product: {}, reviewId: "1", rating: 5 },
      ],
      ["productAddedToWishlist", "product_added_to_wishlist", { product: {} }],
      [
        "productRemovedFromWishlist",
        "product_removed_from_wishlist",
        { product: {} },
      ],
      ["productAddedToCart", "product_added_to_cart", { product: {} }],
      ["productRemovedFromCart", "product_removed_from_cart", { product: {} }],
      ["cartViewed", "cart_viewed", { products: [] }],
      ["cartEmptied", "cart_emptied", { products: [] }],
      ["checkoutStarted", "checkout_started", { checkout: {} }],
      ["checkoutStepViewed", "checkout_step_viewed", { checkout: {} }],
      ["checkoutStepCompleted", "checkout_step_completed", { checkout: {} }],
      ["orderCompleted", "order_completed", { order: {} }],
      ["orderFailed", "order_failed", { order: {}, reason: "err" }],
      ["orderCancelled", "order_cancelled", { order: {} }],
      ["orderShipped", "order_shipped", { order: {} }],
      ["orderRefunded", "order_refunded", { order: {} }],
      ["orderUpdated", "order_updated", { order: {} }],
      [
        "orderProductFulfilled",
        "order_product_fulfilled",
        { order: {}, product: {} },
      ],
      [
        "orderProductReturned",
        "order_product_returned",
        { order: {}, product: {}, reason: "r", totalReturnedValue: {} },
      ],
      [
        "orderFulfillmentStatusUpdated",
        "order_fulfillment_status_updated",
        { order: {}, previousStatus: "a", newStatus: "b" },
      ],
      ["couponEntered", "coupon_entered", { coupon: {}, checkout: {} }],
      ["couponRemoved", "coupon_removed", { coupon: {}, checkout: {} }],
      [
        "couponDenied",
        "coupon_denied",
        { coupon: {}, checkout: {}, reason: "r" },
      ],
      ["couponRedeemed", "coupon_redeemed", { coupon: {}, order: {} }],
      ["promotionViewed", "promotion_viewed", { promotionId: "1" }],
      ["promotionClicked", "promotion_clicked", { promotionId: "1" }],
      ["paymentAuthorized", "payment_authorized", { payment: {} }],
      ["paymentCaptured", "payment_captured", { payment: {} }],
      ["paymentFailed", "payment_failed", { payment: {} }],
      [
        "paymentRefunded",
        "payment_refunded",
        { payment: {}, returnedAmount: {} },
      ],
      ["appStateChanged", "app_state_changed", { newState: "foreground" }],
    ];

    for (const [method, eventName, payload] of methods) {
      vi.mocked(client.track).mockClear();

      // @ts-expect-error for test
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await events[method](payload);

      expect(client.track).toHaveBeenCalledWith(
        eventName,
        payload,
        PREDEFINED_SCHEMA_VERSION,
      );
    }
  });
});
