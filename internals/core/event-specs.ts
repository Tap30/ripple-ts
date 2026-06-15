import type {
  AppState,
  Campaign,
  Category,
  Checkout,
  Coupon,
  Filter,
  Money,
  Order,
  Pagination,
  Payment,
  Primitive,
  Product,
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
 * Payload for web screen/page view events.
 */
export type WebScreenedPayload = {
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
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for mobile screen view events.
 */
export type MobileScreenedPayload = {
  /**
   * Name of the screen (e.g., "Home", "Product Detail").
   */
  title: string;
  /**
   * The previous screen name.
   */
  referrer?: string;
  /**
   * Parsed UTM campaign parameters from a deep link.
   */
  campaign?: Campaign;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for app state change events.
 */
export type AppStateChangedPayload = {
  newState: AppState;
  previousState?: AppState;
};

/**
 * Payload for click event.
 */
export type ClickedPayload = {
  elementId: string;
  elementType?: string;
  elementTitle?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for view event.
 */
export type ViewedPayload = {
  elementId: string;
  elementType?: string;
  elementTitle?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product clicked event.
 */
export type ProductClickedPayload = {
  product: Product;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product viewed event.
 */
export type ProductViewedPayload = {
  product: Product;
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
  product: Product;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product wishlist events (add/remove).
 */
export type ProductWishlistPayload = {
  wishlistId?: string;
  referrer?: string;
  product: Product;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for cart modification events (add/remove product).
 */
export type CartModificationPayload = {
  cartId?: string;
  referrer?: string;
  product: Product;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product reviewed event.
 */
export type ProductReviewedPayload = {
  product: Product;
  reviewId: string;
  rating: number;
  title?: string;
  body?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for cart viewed event.
 */
export type CartViewedPayload = {
  cartId?: string;
  products: Product[];
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for cart emptied event.
 */
export type CartEmptiedPayload = {
  cartId?: string;
  products: Product[];
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for checkout started event.
 */
export type CheckoutStartedPayload = {
  checkout: Checkout;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for checkout step events (viewed/completed).
 */
export type CheckoutStepPayload = {
  checkout: Checkout;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order completed event.
 */
export type OrderCompletedPayload = {
  order: Order;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order failed event.
 */
export type OrderFailedPayload = {
  order: Order;
  /**
   * Detailed reason for the failure.
   */
  reason: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order cancelled event.
 */
export type OrderCancelledPayload = {
  order: Order;
  issuer?: string;
  reason?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order shipped event.
 */
export type OrderShippedPayload = {
  order: Order;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order product fulfilled event.
 */
export type OrderProductFulfilledPayload = {
  order: Order;
  product: Product;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order refunded event.
 */
export type OrderRefundedPayload = {
  order: Order;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order product returned event.
 */
export type OrderProductReturnedPayload = {
  order: Order;
  product: Product;
  /**
   * Reason for return (e.g., "Defective", "Wrong Size").
   */
  reason: string;
  /**
   * How the customer was refunded (e.g., "Store Credit", "Original Payment Method").
   */
  refundMethod?: string;
  totalReturnedValue: Money;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order updated event.
 */
export type OrderUpdatedPayload = {
  order: Order;
  reason?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order fulfillment status updated event.
 */
export type OrderFulfillmentStatusUpdatedPayload = {
  order: Order;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for order reviewed event.
 */
export type OrderReviewedPayload = {
  order: Order;
  /** Unique identifier for the submitted review. */
  reviewId: string;
  /** The numerical rating given by the user (e.g., 1 to 5). */
  rating: number;
  /** The title or summary of the review. */
  title?: string;
  /** The full text body of the review. */
  body?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for products searched event.
 */
export type ProductsSearchedPayload = {
  query: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product list viewed event.
 */
export type ProductListViewedPayload = {
  listId?: string;
  category?: Category;
  pagination?: Pagination;
  products: Product[];
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for product list filtered event.
 */
export type ProductListFilteredPayload = {
  listId?: string;
  category?: Category;
  filters: Filter[];
  sorts: Sort[];
  products: Product[];
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for coupon entered/removed events.
 */
export type CouponEnteredRemovedPayload = {
  coupon: Coupon;
  checkout: Checkout;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for coupon denied event.
 */
export type CouponDeniedPayload = {
  coupon: Coupon;
  checkout: Checkout;
  reason: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for coupon redeemed event.
 */
export type CouponRedeemedPayload = {
  coupon: Coupon;
  order: Order;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for promotion events (viewed/clicked).
 */
export type PromotionPayload = {
  promotionId: string;
  promotionTitle?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for payment authorized event.
 */
export type PaymentAuthorizedPayload = {
  payment: Payment;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for payment captured event.
 */
export type PaymentCapturedPayload = {
  payment: Payment;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for payment failed event.
 */
export type PaymentFailedPayload = {
  payment: Payment;
  customProperties?: Record<string, Primitive>;
};

/**
 * Payload for payment refunded event.
 */
export type PaymentRefundedPayload = {
  payment: Payment;
  reason?: string;
  returnedAmount: Money;
  customProperties?: Record<string, Primitive>;
};

/**
 * Map of all predefined event names to their payload types.
 * Provides type-safe event tracking with autocomplete support.
 */
export type PredefinedEvents = {
  user_identified: UserIdentifiedPayload;
  app_state_changed: AppStateChangedPayload;
  screened: WebScreenedPayload | MobileScreenedPayload;
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
  coupon_redeemed: CouponRedeemedPayload;

  promotion_viewed: PromotionPayload;
  promotion_clicked: PromotionPayload;

  payment_authorized: PaymentAuthorizedPayload;
  payment_captured: PaymentCapturedPayload;
  payment_failed: PaymentFailedPayload;
  payment_refunded: PaymentRefundedPayload;
};
