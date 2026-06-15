import { describe, expect, it, vi } from "vitest";
import type { Client } from "./client.ts";
import {
  PREDEFINED_SCHEMA_VERSION,
  type AppStateChangedPayload,
  type CartEmptiedPayload,
  type CartModificationPayload,
  type CartViewedPayload,
  type ChallengeCompletedPayload,
  type ChallengeStartedPayload,
  type ChallengeStepCompletedPayload,
  type CheckoutStartedPayload,
  type CheckoutStepPayload,
  type CouponDeniedPayload,
  type CouponEnteredRemovedPayload,
  type IncentiveClaimedPayload,
  type IncentiveExpiredPayload,
  type IncentiveGrantedPayload,
  type IncentiveRedeemedPayload,
  type OrderCancelledPayload,
  type OrderCompletedPayload,
  type OrderFailedPayload,
  type OrderFulfillmentStatusUpdatedPayload,
  type OrderProductFulfilledPayload,
  type OrderProductReturnedPayload,
  type OrderRefundedPayload,
  type OrderShippedPayload,
  type OrderUpdatedPayload,
  type PaymentAuthorizedPayload,
  type PaymentCapturedPayload,
  type PaymentFailedPayload,
  type PaymentRefundedPayload,
  type ProductClickedPayload,
  type ProductListFilteredPayload,
  type ProductListViewedPayload,
  type ProductReviewedPayload,
  type ProductSharedPayload,
  type ProductsSearchedPayload,
  type ProductViewedPayload,
  type ProductWishlistPayload,
  type PromotionPayload,
  type ReferralAppliedPayload,
  type ReferralSharedPayload,
} from "./event-specs.ts";
import { EventsNamespace } from "./events-namespace.ts";
import type {
  Challenge,
  Checkout,
  Coupon,
  Incentive,
  Order,
  Payment,
  Product,
  Referral,
} from "./types.ts";

const createMockClient = () =>
  ({
    track: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Client;

describe("EventsNamespace", () => {
  it("should support all event categories", async () => {
    const client = createMockClient();
    const events = new EventsNamespace(client);

    const product: Product = {
      price: { amount: 0, currency: "" },
      productId: "",
    };

    const order: Order = {
      orderId: "",
      products: [],
      totalValue: { amount: 0, currency: "" },
    };

    const checkout: Checkout = {
      step: 0,
      order,
    };

    const coupon: Coupon = {
      amount: { amount: 0, currency: "" },
      code: "",
    };

    const payment: Payment = {
      value: { amount: 0, currency: "" },
      method: "",
      paymentId: "",
    };

    const referral: Referral = {
      referralCode: "",
    };

    const incentive: Incentive = {
      incentiveId: "",
      reward: { amount: 0, unit: "" },
      type: "",
    };

    const challenge: Challenge = {
      challengeId: "",
    };

    const methods: [string, string, Record<string, unknown>][] = [
      [
        "appStateChanged",
        "app_state_changed",
        { newState: "foreground" } satisfies AppStateChangedPayload,
      ],
      [
        "productClicked",
        "product_clicked",
        { product } satisfies ProductClickedPayload,
      ],
      [
        "productViewed",
        "product_viewed",
        { product } satisfies ProductViewedPayload,
      ],
      [
        "productShared",
        "product_shared",
        { product } satisfies ProductSharedPayload,
      ],
      [
        "productsSearched",
        "products_searched",
        { query: "test" } satisfies ProductsSearchedPayload,
      ],
      [
        "productListViewed",
        "product_list_viewed",
        { products: [] } satisfies ProductListViewedPayload,
      ],
      [
        "productListFiltered",
        "product_list_filtered",
        {
          filters: [],
          sorts: [],
          products: [],
        } satisfies ProductListFilteredPayload,
      ],
      [
        "productReviewed",
        "product_reviewed",
        {
          product,
          reviewId: "1",
          rating: 5,
        } satisfies ProductReviewedPayload,
      ],
      [
        "productAddedToWishlist",
        "product_added_to_wishlist",
        { product } satisfies ProductWishlistPayload,
      ],
      [
        "productRemovedFromWishlist",
        "product_removed_from_wishlist",
        { product } satisfies ProductWishlistPayload,
      ],
      [
        "productAddedToCart",
        "product_added_to_cart",
        { product } satisfies CartModificationPayload,
      ],
      [
        "productRemovedFromCart",
        "product_removed_from_cart",
        { product } satisfies CartModificationPayload,
      ],
      [
        "cartViewed",
        "cart_viewed",
        { products: [] } satisfies CartViewedPayload,
      ],
      [
        "cartEmptied",
        "cart_emptied",
        { products: [] } satisfies CartEmptiedPayload,
      ],
      [
        "checkoutStarted",
        "checkout_started",
        { checkout } satisfies CheckoutStartedPayload,
      ],
      [
        "checkoutStepViewed",
        "checkout_step_viewed",
        { checkout } satisfies CheckoutStepPayload,
      ],
      [
        "checkoutStepCompleted",
        "checkout_step_completed",
        { checkout } satisfies CheckoutStepPayload,
      ],
      [
        "orderCompleted",
        "order_completed",
        { order } satisfies OrderCompletedPayload,
      ],
      [
        "orderFailed",
        "order_failed",
        { order, reason: "err" } satisfies OrderFailedPayload,
      ],
      [
        "orderCancelled",
        "order_cancelled",
        { order } satisfies OrderCancelledPayload,
      ],
      [
        "orderShipped",
        "order_shipped",
        { order } satisfies OrderShippedPayload,
      ],
      [
        "orderRefunded",
        "order_refunded",
        { order } satisfies OrderRefundedPayload,
      ],
      [
        "orderUpdated",
        "order_updated",
        { order } satisfies OrderUpdatedPayload,
      ],
      [
        "orderProductFulfilled",
        "order_product_fulfilled",
        { order, product } satisfies OrderProductFulfilledPayload,
      ],
      [
        "orderProductReturned",
        "order_product_returned",
        {
          order,
          product,
          reason: "r",
          totalReturnedValue: { amount: 0, currency: "" },
        } satisfies OrderProductReturnedPayload,
      ],
      [
        "orderFulfillmentStatusUpdated",
        "order_fulfillment_status_updated",
        { order, newStatus: "" } satisfies OrderFulfillmentStatusUpdatedPayload,
      ],
      [
        "couponEntered",
        "coupon_entered",
        { coupon, checkout } satisfies CouponEnteredRemovedPayload,
      ],
      [
        "couponRemoved",
        "coupon_removed",
        { coupon, checkout } satisfies CouponEnteredRemovedPayload,
      ],
      [
        "couponDenied",
        "coupon_denied",
        { coupon, checkout, reason: "r" } satisfies CouponDeniedPayload,
      ],
      [
        "promotionViewed",
        "promotion_viewed",
        { promotionId: "1" } satisfies PromotionPayload,
      ],
      [
        "promotionClicked",
        "promotion_clicked",
        { promotionId: "1" } satisfies PromotionPayload,
      ],
      [
        "paymentAuthorized",
        "payment_authorized",
        { payment } satisfies PaymentAuthorizedPayload,
      ],
      [
        "paymentCaptured",
        "payment_captured",
        { payment } satisfies PaymentCapturedPayload,
      ],
      [
        "paymentFailed",
        "payment_failed",
        { payment } satisfies PaymentFailedPayload,
      ],
      [
        "paymentRefunded",
        "payment_refunded",
        {
          payment,
          returnedAmount: { amount: 0, currency: "" },
        } satisfies PaymentRefundedPayload,
      ],
      [
        "referralShared",
        "referral_shared",
        { referral } satisfies ReferralSharedPayload,
      ],
      [
        "referralApplied",
        "referral_applied",
        { referral } satisfies ReferralAppliedPayload,
      ],
      [
        "incentiveGranted",
        "incentive_granted",
        { incentive } satisfies IncentiveGrantedPayload,
      ],
      [
        "incentiveRedeemed",
        "incentive_redeemed",
        { incentive } satisfies IncentiveRedeemedPayload,
      ],
      [
        "incentiveClaimed",
        "incentive_claimed",
        { incentive } satisfies IncentiveClaimedPayload,
      ],
      [
        "incentiveExpired",
        "incentive_expired",
        { incentive } satisfies IncentiveExpiredPayload,
      ],
      [
        "challengeStarted",
        "challenge_started",
        { challenge } satisfies ChallengeStartedPayload,
      ],
      [
        "challengeCompleted",
        "challenge_completed",
        { challenge } satisfies ChallengeCompletedPayload,
      ],
      [
        "challengeStepCompleted",
        "challenge_step_completed",
        { challenge, step: 0 } satisfies ChallengeStepCompletedPayload,
      ],
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
