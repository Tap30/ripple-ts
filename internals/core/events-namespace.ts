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
  type ProductViewedPayload,
  type ProductWishlistPayload,
  type ProductsSearchedPayload,
  type PromotionPayload,
  type ReferralAppliedPayload,
  type ReferralSharedPayload,
} from "./event-specs.ts";

/**
 * Typed namespace for predefined CDP events.
 * All methods auto-attach `PREDEFINED_SCHEMA_VERSION`.
 */
export class EventsNamespace {
  readonly #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  // App State
  appStateChanged(payload: AppStateChangedPayload) {
    return this.#client.track(
      "app_state_changed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Product Discovery
  productClicked(payload: ProductClickedPayload) {
    return this.#client.track(
      "product_clicked",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  productViewed(payload: ProductViewedPayload) {
    return this.#client.track(
      "product_viewed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  productShared(payload: ProductSharedPayload) {
    return this.#client.track(
      "product_shared",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  productsSearched(payload: ProductsSearchedPayload) {
    return this.#client.track(
      "products_searched",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  productListViewed(payload: ProductListViewedPayload) {
    return this.#client.track(
      "product_list_viewed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  productListFiltered(payload: ProductListFilteredPayload) {
    return this.#client.track(
      "product_list_filtered",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  productReviewed(payload: ProductReviewedPayload) {
    return this.#client.track(
      "product_reviewed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Wishlist
  productAddedToWishlist(payload: ProductWishlistPayload) {
    return this.#client.track(
      "product_added_to_wishlist",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  productRemovedFromWishlist(payload: ProductWishlistPayload) {
    return this.#client.track(
      "product_removed_from_wishlist",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Cart
  productAddedToCart(payload: CartModificationPayload) {
    return this.#client.track(
      "product_added_to_cart",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  productRemovedFromCart(payload: CartModificationPayload) {
    return this.#client.track(
      "product_removed_from_cart",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  cartViewed(payload: CartViewedPayload) {
    return this.#client.track(
      "cart_viewed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  cartEmptied(payload: CartEmptiedPayload) {
    return this.#client.track(
      "cart_emptied",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Checkout
  checkoutStarted(payload: CheckoutStartedPayload) {
    return this.#client.track(
      "checkout_started",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  checkoutStepViewed(payload: CheckoutStepPayload) {
    return this.#client.track(
      "checkout_step_viewed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  checkoutStepCompleted(payload: CheckoutStepPayload) {
    return this.#client.track(
      "checkout_step_completed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Orders
  orderCompleted(payload: OrderCompletedPayload) {
    return this.#client.track(
      "order_completed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  orderFailed(payload: OrderFailedPayload) {
    return this.#client.track(
      "order_failed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  orderCancelled(payload: OrderCancelledPayload) {
    return this.#client.track(
      "order_cancelled",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  orderShipped(payload: OrderShippedPayload) {
    return this.#client.track(
      "order_shipped",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  orderRefunded(payload: OrderRefundedPayload) {
    return this.#client.track(
      "order_refunded",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  orderUpdated(payload: OrderUpdatedPayload) {
    return this.#client.track(
      "order_updated",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  orderProductFulfilled(payload: OrderProductFulfilledPayload) {
    return this.#client.track(
      "order_product_fulfilled",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  orderProductReturned(payload: OrderProductReturnedPayload) {
    return this.#client.track(
      "order_product_returned",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  orderFulfillmentStatusUpdated(payload: OrderFulfillmentStatusUpdatedPayload) {
    return this.#client.track(
      "order_fulfillment_status_updated",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Coupons
  couponEntered(payload: CouponEnteredRemovedPayload) {
    return this.#client.track(
      "coupon_entered",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  couponRemoved(payload: CouponEnteredRemovedPayload) {
    return this.#client.track(
      "coupon_removed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  couponDenied(payload: CouponDeniedPayload) {
    return this.#client.track(
      "coupon_denied",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Promotions
  promotionViewed(payload: PromotionPayload) {
    return this.#client.track(
      "promotion_viewed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  promotionClicked(payload: PromotionPayload) {
    return this.#client.track(
      "promotion_clicked",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Payments
  paymentAuthorized(payload: PaymentAuthorizedPayload) {
    return this.#client.track(
      "payment_authorized",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  paymentCaptured(payload: PaymentCapturedPayload) {
    return this.#client.track(
      "payment_captured",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  paymentFailed(payload: PaymentFailedPayload) {
    return this.#client.track(
      "payment_failed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  paymentRefunded(payload: PaymentRefundedPayload) {
    return this.#client.track(
      "payment_refunded",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Referral
  referralShared(payload: ReferralSharedPayload) {
    return this.#client.track(
      "referral_shared",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  referralApplied(payload: ReferralAppliedPayload) {
    return this.#client.track(
      "referral_applied",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Incentives
  incentiveGranted(payload: IncentiveGrantedPayload) {
    return this.#client.track(
      "incentive_granted",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  incentiveRedeemed(payload: IncentiveRedeemedPayload) {
    return this.#client.track(
      "incentive_redeemed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  incentiveClaimed(payload: IncentiveClaimedPayload) {
    return this.#client.track(
      "incentive_claimed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  incentiveExpired(payload: IncentiveExpiredPayload) {
    return this.#client.track(
      "incentive_expired",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }

  // Gamification Challenges
  challengeStarted(payload: ChallengeStartedPayload) {
    return this.#client.track(
      "challenge_started",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  challengeCompleted(payload: ChallengeCompletedPayload) {
    return this.#client.track(
      "challenge_completed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
  challengeStepCompleted(payload: ChallengeStepCompletedPayload) {
    return this.#client.track(
      "challenge_step_completed",
      payload,
      PREDEFINED_SCHEMA_VERSION,
    );
  }
}
