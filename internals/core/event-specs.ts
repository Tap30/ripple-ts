import type {
  AppState,
  Campaign,
  Category,
  Challenge,
  Checkout,
  Coupon,
  Filter,
  Incentive,
  Money,
  Order,
  Pagination,
  Payment,
  Primitive,
  Product,
  Referral,
  Sort,
  UserTraits,
} from "./types.ts";

/**
 * Schema version for all predefined CDP events.
 * Incremental, shared across all Ripple SDKs.
 * Bump when predefined event payload shapes change.
 */
export const PREDEFINED_SCHEMA_VERSION = "1";

/**
 * Payload for identify event.
 */
export type UserIdentifiedPayload = {
  /**
   * The known database ID of the user.
   */
  userId: string;
  /**
   * User profile attributes.
   */
  traits: UserTraits;
};

/**
 * Payload for screen event.
 */
export type ScreenPayload = {
  /**
   * The page title.
   */
  title: string;
  /**
   * Full URL of the page.
   */
  url: string;
  /**
   * URL pathname.
   */
  pathname?: string;
  /**
   * Previous page URL.
   */
  referrer?: string;
  /**
   * Query string parameters.
   */
  search?: string;
  /**
   * Extracted SEO keywords.
   */
  keywords?: string[];
  /**
   * Parsed UTM campaign parameters.
   */
  campaign?: Campaign;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for app state change events.
 */
export type AppStateChangedPayload = {
  /**
   * The new application state.
   */
  newState: AppState;
  /**
   * The previous application state.
   */
  previousState?: AppState;
};

/**
 * Payload for click event.
 */
export type ClickedPayload = {
  /**
   * The unique identifier of the clicked element (e.g., "submit_checkout_button").
   */
  elementId: string;
  /**
   * The type of element clicked (e.g., "button", "link", "icon").
   */
  elementType?: string;
  /**
   * The visible text or title of the element, if applicable.
   */
  elementTitle?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for view event.
 */
export type ViewedPayload = {
  /**
   * The unique identifier of the viewed element (e.g., "services_section").
   */
  elementId: string;
  /**
   * The type of element viewed.
   */
  elementType?: string;
  /**
   * The title of the element, if applicable.
   */
  elementTitle?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product clicked event.
 */
export type ProductClickedPayload = {
  /**
   * The product that was clicked.
   */
  product: Product;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product viewed event.
 */
export type ProductViewedPayload = {
  /**
   * The product that was viewed.
   */
  product: Product;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product shared event.
 */
export type ProductSharedPayload = {
  /**
   * Platform shared to (e.g., "Twitter", "Email", "WhatsApp").
   */
  sharingMethod?: string;
  /**
   * User-generated message attached to the share.
   */
  message?: string;
  /**
   * Recipient identifier if shared directly.
   */
  recipient?: string;
  /**
   * The product that was shared.
   */
  product: Product;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product wishlist events (add/remove).
 */
export type ProductWishlistPayload = {
  /**
   * The unique identifier for the user's wishlist.
   */
  wishlistId?: string;
  /**
   * The UI location from where the product was added/removed.
   */
  referrer?: string;
  /**
   * The product being modified in the wishlist.
   */
  product: Product;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for cart modification events (add/remove product).
 */
export type CartModificationPayload = {
  /**
   * The unique identifier for the cart.
   */
  cartId?: string;
  /**
   * The UI location from where the modification occurred.
   */
  referrer?: string;
  /**
   * The product being added or removed.
   */
  product: Product;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product reviewed event.
 */
export type ProductReviewedPayload = {
  /**
   * The product being reviewed.
   */
  product: Product;
  /**
   * Unique identifier for the review.
   */
  reviewId: string;
  /**
   * Numerical rating given.
   */
  rating: number;
  /**
   * Summary/title of the review.
   */
  title?: string;
  /**
   * Body text of the review.
   */
  body?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for cart viewed event.
 */
export type CartViewedPayload = {
  /**
   * The unique identifier for the cart.
   */
  cartId?: string;
  /**
   * The current list of products in the cart.
   */
  products: Product[];
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for cart emptied event.
 */
export type CartEmptiedPayload = {
  /**
   * The unique identifier for the cart.
   */
  cartId?: string;
  /**
   * The list of products that were cleared.
   */
  products: Product[];
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for checkout started event.
 */
export type CheckoutStartedPayload = {
  /**
   * The checkout session details.
   */
  checkout: Checkout;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for checkout step events (viewed/completed).
 */
export type CheckoutStepPayload = {
  /**
   * The checkout session details at this step.
   */
  checkout: Checkout;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order completed event.
 */
export type OrderCompletedPayload = {
  /**
   * The finalized order details.
   */
  order: Order;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order failed event.
 */
export type OrderFailedPayload = {
  /**
   * The order that failed to process.
   */
  order: Order;
  /**
   * Detailed reason for the failure.
   */
  reason: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order cancelled event.
 */
export type OrderCancelledPayload = {
  /**
   * The order being cancelled.
   */
  order: Order;
  /**
   * Who cancelled the order (e.g., "customer", "admin", "system").
   */
  issuer?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order shipped event.
 */
export type OrderShippedPayload = {
  /**
   * The order that was shipped.
   */
  order: Order;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order product fulfilled event.
 */
export type OrderProductFulfilledPayload = {
  /**
   * The overall order.
   */
  order: Order;
  /**
   * The specific product within the order that was fulfilled.
   */
  product: Product;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order refunded event.
 */
export type OrderRefundedPayload = {
  /**
   * The order that was refunded.
   */
  order: Order;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order product returned event.
 */
export type OrderProductReturnedPayload = {
  /**
   * The order containing the returned product.
   */
  order: Order;
  /**
   * The specific product being returned.
   */
  product: Product;
  /**
   * Reason for return (e.g., "Defective", "Wrong Size").
   */
  reason: string;
  /**
   * How the customer was refunded (e.g., "Store Credit").
   */
  refundMethod?: string;
  /**
   * The monetary value of the return.
   */
  totalReturnedValue: Money;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order updated event.
 */
export type OrderUpdatedPayload = {
  /**
   * The updated order details.
   */
  order: Order;
  /**
   * The reason for the update.
   */
  reason?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order fulfillment status updated event.
 */
export type OrderFulfillmentStatusUpdatedPayload = {
  /**
   * The order undergoing a status change.
   */
  order: Order;
  /**
   * The previous fulfillment status.
   */
  previousStatus?: string;
  /**
   * The new fulfillment status.
   */
  newStatus: string;
  /**
   * The reason for the status change, if applicable.
   */
  reason?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order reviewed event.
 */
export type OrderReviewedPayload = {
  /**
   * The order being reviewed.
   */
  order: Order;
  /**
   * Unique identifier for the submitted review.
   */
  reviewId: string;
  /**
   * The numerical rating given by the user (e.g., 1 to 5).
   */
  rating: number;
  /**
   * The title or summary of the review.
   */
  title?: string;
  /**
   * The full text body of the review.
   */
  body?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for products searched event.
 */
export type ProductsSearchedPayload = {
  /**
   * The raw text query submitted by the user.
   */
  query: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product list viewed event.
 */
export type ProductListViewedPayload = {
  /**
   * Unique identifier for the product list/grid.
   */
  listId?: string;
  /**
   * The category being viewed, if applicable.
   */
  category?: Category;
  /**
   * Pagination state of the list.
   */
  pagination?: Pagination;
  /**
   * The products currently visible in the list.
   */
  products: Product[];
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product list filtered event.
 */
export type ProductListFilteredPayload = {
  /**
   * Unique identifier for the product list being filtered.
   */
  listId?: string;
  /**
   * The active category context.
   */
  category?: Category;
  /**
   * The active filters applied.
   */
  filters: Filter[];
  /**
   * The active sorting parameters applied.
   */
  sorts: Sort[];
  /**
   * The resulting products after filtering/sorting.
   */
  products: Product[];
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for coupon entered/removed events.
 */
export type CouponEnteredRemovedPayload = {
  /**
   * The coupon being entered or removed.
   */
  coupon: Coupon;
  /**
   * The checkout session context.
   */
  checkout: Checkout;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for coupon denied event.
 */
export type CouponDeniedPayload = {
  /**
   * The coupon that was rejected.
   */
  coupon: Coupon;
  /**
   * The checkout session context.
   */
  checkout: Checkout;
  /**
   * Reason the coupon was denied.
   */
  reason: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for promotion events (viewed/clicked).
 */
export type PromotionPayload = {
  /**
   * Unique identifier for the promotion/banner.
   */
  promotionId: string;
  /**
   * Human-readable title of the promotion.
   */
  promotionTitle?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for payment authorized event.
 */
export type PaymentAuthorizedPayload = {
  /**
   * The payment authorization details.
   */
  payment: Payment;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for payment captured event.
 */
export type PaymentCapturedPayload = {
  /**
   * The payment capture details.
   */
  payment: Payment;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for payment failed event.
 */
export type PaymentFailedPayload = {
  /**
   * The failed payment details.
   */
  payment: Payment;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for payment refunded event.
 */
export type PaymentRefundedPayload = {
  /**
   * The refunded payment details.
   */
  payment: Payment;
  /**
   * Reason for the refund.
   */
  reason?: string;
  /**
   * The amount returned in this specific transaction.
   */
  returnedAmount: Money;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for referral shared event.
 */
export type ReferralSharedPayload = {
  /**
   * The referral object that was shared.
   */
  referral: Referral;
  /**
   * The medium through which it was shared (e.g., "whatsapp", "email").
   */
  medium?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for referral applied event.
 */
export type ReferralAppliedPayload = {
  /**
   * The referral object that was applied.
   */
  referral: Referral;
  /**
   * The UI flow or surface where the referral was applied (e.g., "checkout", "registration").
   */
  flow?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for incentive granted event.
 */
export type IncentiveGrantedPayload = {
  /**
   * The incentive that was granted.
   */
  incentive: Incentive;
  /**
   * Identifier for the source triggering the grant (e.g., Order ID).
   */
  sourceId?: string;
  /**
   * Descriptive title of the source.
   */
  sourceTitle?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for incentive redeemed event.
 */
export type IncentiveRedeemedPayload = {
  /**
   * The incentive being redeemed.
   */
  incentive: Incentive;
  /**
   * Identifier for what consumed the incentive (e.g., Order ID).
   */
  redeemerId?: string;
  /**
   * Descriptive title of the redeemer.
   */
  redeemerTitle?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for incentive claimed event.
 */
export type IncentiveClaimedPayload = {
  /**
   * The incentive that was claimed.
   */
  incentive: Incentive;
  /**
   * Identifier for the origin of the claimable reward.
   */
  sourceId?: string;
  /**
   * Descriptive title of the source.
   */
  sourceTitle?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for incentive expired event.
 */
export type IncentiveExpiredPayload = {
  /**
   * The incentive that expired.
   */
  incentive: Incentive;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for gamification challenge started event.
 */
export type ChallengeStartedPayload = {
  /**
   * The challenge that was started.
   */
  challenge: Challenge;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for gamification challenge completed event.
 */
export type ChallengeCompletedPayload = {
  /**
   * The challenge that was completed.
   */
  challenge: Challenge;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for gamification challenge step completed event.
 */
export type ChallengeStepCompletedPayload = {
  /**
   * The challenge containing the step.
   */
  challenge: Challenge;
  /**
   * The identifier or index of the step completed.
   */
  step: string | number;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Map of all predefined event names to their payload types.
 * Provides type-safe event tracking with autocomplete support.
 */
export type PredefinedEvents = {
  user_identified: UserIdentifiedPayload;
  screened: ScreenPayload;
  app_state_changed: AppStateChangedPayload;
  clicked: ClickedPayload;
  viewed: ViewedPayload;

  product_clicked: ProductClickedPayload;
  product_viewed: ProductViewedPayload;
  product_shared: ProductSharedPayload;
  products_searched: ProductsSearchedPayload;
  product_list_viewed: ProductListViewedPayload;
  product_list_filtered: ProductListFilteredPayload;
  product_reviewed: ProductReviewedPayload;

  product_added_to_wishlist: ProductWishlistPayload;
  product_removed_from_wishlist: ProductWishlistPayload;

  product_added_to_cart: CartModificationPayload;
  product_removed_from_cart: CartModificationPayload;
  cart_viewed: CartViewedPayload;
  cart_emptied: CartEmptiedPayload;

  checkout_started: CheckoutStartedPayload;
  checkout_step_viewed: CheckoutStepPayload;
  checkout_step_completed: CheckoutStepPayload;

  order_completed: OrderCompletedPayload;
  order_failed: OrderFailedPayload;
  order_cancelled: OrderCancelledPayload;
  order_shipped: OrderShippedPayload;
  order_refunded: OrderRefundedPayload;
  order_updated: OrderUpdatedPayload;
  order_product_fulfilled: OrderProductFulfilledPayload;
  order_product_returned: OrderProductReturnedPayload;
  order_fulfillment_status_updated: OrderFulfillmentStatusUpdatedPayload;
  order_reviewed: OrderReviewedPayload;

  coupon_entered: CouponEnteredRemovedPayload;
  coupon_removed: CouponEnteredRemovedPayload;
  coupon_denied: CouponDeniedPayload;

  promotion_viewed: PromotionPayload;
  promotion_clicked: PromotionPayload;

  payment_authorized: PaymentAuthorizedPayload;
  payment_captured: PaymentCapturedPayload;
  payment_failed: PaymentFailedPayload;
  payment_refunded: PaymentRefundedPayload;

  referral_shared: ReferralSharedPayload;
  referral_applied: ReferralAppliedPayload;

  incentive_granted: IncentiveGrantedPayload;
  incentive_redeemed: IncentiveRedeemedPayload;
  incentive_claimed: IncentiveClaimedPayload;
  incentive_expired: IncentiveExpiredPayload;

  challenge_started: ChallengeStartedPayload;
  challenge_completed: ChallengeCompletedPayload;
  challenge_step_completed: ChallengeStepCompletedPayload;
};
