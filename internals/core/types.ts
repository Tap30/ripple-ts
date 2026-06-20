/**
 * Represents a generic payload for any event.
 */
export type EventPayload = Record<string, unknown>;

/**
 * Information about a specific platform or environment.
 */
export type PlatformInfo = {
  /**
   * The name of the platform/browser/os (e.g., "Chrome", "iOS").
   */
  name: string;
  /**
   * The semantic version or release number.
   */
  version: string;
};

/**
 * Web-specific platform details.
 */
export type WebPlatform = {
  /**
   * Identifies the platform type.
   */
  type: "web";
  /**
   * Information about the user's browser.
   */
  browser: PlatformInfo;
  /**
   * Information about the hardware device.
   */
  device: PlatformInfo;
  /**
   * Information about the operating system.
   */
  os: PlatformInfo;
};

/**
 * Native app-specific platform details.
 */
export type NativePlatform = {
  /**
   * Identifies the platform type.
   */
  type: "native";
  /**
   * Information about the hardware device.
   */
  device: PlatformInfo;
  /**
   * Information about the operating system.
   */
  os: PlatformInfo;
};

/**
 * Server-side platform details.
 */
export type ServerPlatform = {
  /**
   * Identifies the platform type.
   */
  type: "server";
};

/**
 * The platform from which the event was issued.
 */
export type Platform = WebPlatform | NativePlatform | ServerPlatform;

/**
 * Information about the tracking SDK sending the event.
 */
export type SdkInfo = {
  /**
   * The name of the SDK (e.g., "ripple-ts").
   */
  name: string;
  /**
   * The version of the SDK.
   */
  version: string;
};

/**
 * The root Event object shape.
 *
 * @template TMetadata Defines the shape of global/app-level metadata.
 */
export type Event<TMetadata = Record<string, unknown>> = {
  /**
   * The unique name of the event (e.g., "product_viewed").
   */
  name: string;
  /**
   * The event-specific data.
   */
  payload: EventPayload | null;
  /**
   * Environment/App-specific data attached to all events (e.g., app version, build number).
   */
  metadata: Partial<TMetadata> | null;
  /**
   * Platform context.
   */
  platform: Platform | null;
  /**
   * SDK context.
   */
  sdk: SdkInfo;
  /**
   * UNIX timestamp in milliseconds indicating when the event occurred.
   */
  issuedAt: number;
  /**
   * A unique identifier for the anonymous user/device.
   */
  anonymousId: string;
  /**
   * A unique UUID for this specific event to prevent deduplication.
   */
  eventId: string;
  /**
   * The version of the tracking schema being used.
   */
  schemaVersion: string | null;
  /**
   * The authenticated user's ID, if known.
   */
  userId: string | null;
};

/**
 * Represents a primitive value.
 */
export type Primitive = number | boolean | string;

/**
 * Represents monetary values.
 */
export type Money = {
  /**
   * The decimal value of the money.
   */
  amount: number;
  /**
   * The ISO 4217 currency code (e.g., "USD").
   */
  currency: string;
};

/**
 * Represents a product category.
 */
export type Category = {
  /**
   * Unique category identifier.
   */
  id: string;
  /**
   * Human-readable category name.
   */
  title?: string;
};

/**
 * Represents a physical address.
 */
export type Address = {
  /**
   * Complete formatted address.
   */
  fullAddress: string;
  /**
   * City name.
   */
  city: string;
  /**
   * Geographical coordinates.
   */
  location?: {
    /**
     * Latitude coordinate.
     */
    lat: number;
    /**
     * Longitude coordinate.
     */
    long: number;
  };
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents shipping details for an order.
 */
export type Shipping = {
  /**
   * Cost of shipping.
   */
  price: Money;
  /**
   * Shipping method name (e.g., "Standard", "Next Day").
   */
  method: string;
  /**
   * Where the shipment originates.
   */
  origin?: Address;
  /**
   * Where the shipment is going.
   */
  destination: Address;
  /**
   * Estimated arrival information.
   */
  arrival?: {
    /**
     * Exact UNIX timestamp in milliseconds for expected arrival.
     */
    absoluteArriveAt?: number;
    /**
     * Time window for arrival [start, end] in UNIX timestamp milliseconds.
     */
    rangeArriveAt?: [number, number];
  };
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents a discount coupon.
 */
export type Coupon = {
  /**
   * The string code applied by the user.
   */
  code: string;
  /**
   * The monetary value discounted.
   */
  amount: Money;
  /**
   * Internal ID of the coupon.
   */
  id?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents an individual purchasable item.
 */
export type Product = {
  /**
   * Unique product identifier.
   */
  productId: string;
  /**
   * Name of the product.
   */
  productTitle?: string;
  /**
   * Primary category of the product.
   */
  category?: Category;
  /**
   * Stock Keeping Unit identifier.
   */
  skuId?: string;
  /**
   * Manufacturer or seller.
   */
  vendor?: string;
  /**
   * Current selling price of a single unit.
   */
  price: Money;
  /**
   * Discount applied to this specific product.
   */
  discount?: Money;
  /**
   * Number of items.
   */
  quantity?: number;
  /**
   * The index position of the product in a list/grid.
   */
  position?: number;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents a finalized or processing order.
 */
export type Order = {
  /**
   * Unique order identifier.
   */
  orderId: string;
  /**
   * Associated checkout session identifier.
   */
  checkoutId?: string;
  /**
   * Payment gateway transaction ID.
   */
  transactionId?: string;
  /**
   * Associated cart identifier.
   */
  cartId?: string;
  /**
   * Final total value charged to the customer.
   */
  totalValue: Money;
  /**
   * Total discount applied to the order.
   */
  totalDiscount?: Money;
  /**
   * Value of the order before taxes and shipping.
   */
  subtotalValue?: Money;
  /**
   * Tax amount applied.
   */
  tax?: Money;
  /**
   * Shipping details and costs.
   */
  shipping?: Shipping;
  /**
   * Method used for payment (e.g., "Credit Card", "PayPal").
   */
  paymentMethod?: string;
  /**
   * Incentives applied to this order.
   */
  incentives?: Incentive[];
  /**
   * Array of products purchased.
   */
  products: Product[];
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents an active checkout session.
 */
export type Checkout = {
  /**
   * Unique checkout session identifier.
   */
  checkoutId?: string;
  /**
   * Order details populated so far (excludes finalized IDs).
   */
  order: Omit<Order, "orderId" | "transactionId" | "checkoutId">;
  /**
   * Current step in the checkout funnel (e.g., "2" or "shipping").
   */
  step: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Pagination details for list views.
 */
export type Pagination = {
  /**
   * The current page number.
   */
  page: number;
  /**
   * The number of items per page.
   */
  limit: number;
};

/**
 * Key-value filter applied to a list.
 */
export type Filter = {
  /**
   * The filter parameter key.
   */
  key: string;
  /**
   * The filter parameter value.
   */
  value: string;
};

/**
 * Sorting parameter applied to a list.
 */
export type Sort = {
  /**
   * The sorting parameter key.
   */
  key: string;
  /**
   * The sorting direction.
   */
  value: "asc" | "dsc";
};

/**
 * Represents a payment transaction.
 */
export type Payment = {
  /**
   * Unique payment identifier.
   */
  paymentId: string;
  /**
   * Payment gateway used.
   */
  gateway?: string;
  /**
   * Method of payment (e.g., "credit_card").
   */
  method: string;
  /**
   * Amount processed in this payment.
   */
  value: Money;
  /**
   * The order associated with this payment.
   */
  order?: Order;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents marketing campaign parameters (usually parsed from UTMs).
 */
export type Campaign = {
  /**
   * The referrer or entity sending the traffic (utm_source).
   */
  source: string;
  /**
   * The marketing medium (utm_medium).
   */
  medium: string;
  /**
   * The specific campaign name (utm_campaign).
   */
  name?: string;
  /**
   * Identify the paid keywords (utm_term).
   */
  term?: string;
  /**
   * Differentiate similar content or links within the same ad (utm_content).
   */
  content?: string;
};

/**
 * Represents an incentive reward value.
 */
export type Reward = {
  /**
   * The numerical amount of the reward.
   */
  amount: number;
  /**
   * The unit of the reward (e.g., "points", "dollars").
   */
  unit: string;
};

/**
 * Represents a shopping cart.
 */
export type Cart = {
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
 * Represents an incentive (e.g., loyalty points, cashback).
 */
export type Incentive = {
  /**
   * Unique identifier for the incentive.
   */
  incentiveId: string;
  /**
   * Human-readable title of the incentive.
   */
  incentiveTitle?: string;
  /**
   * Type of incentive (e.g., "cashback", "points").
   */
  type: string;
  /**
   * The reward value associated with the incentive.
   */
  reward: Reward;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents a gamification challenge.
 */
export type Challenge = {
  /**
   * Unique identifier for the challenge.
   */
  challengeId: string;
  /**
   * Human-readable title of the challenge.
   */
  challengeTitle?: string;
  /**
   * Category grouping for the challenge.
   */
  category?: Category;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents a referral object.
 */
export type Referral = {
  /**
   * The unique referral code used.
   */
  referralCode: string;
  /**
   * The ID of the user who owns the referral code.
   */
  referrerId?: string;
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * Application state enum.
 */
export type AppState = "opened" | "closed" | "foreground" | "background";

/**
 * User profile attributes.
 */
export type UserTraits = {
  /**
   * User's first name.
   */
  firstName?: string;
  /**
   * User's last name.
   */
  lastName?: string;
  /**
   * User's full name.
   */
  fullName?: string;
  /**
   * User's chosen username.
   */
  username?: string;
  /**
   * User's age.
   */
  age?: number;
  /**
   * User's email address.
   */
  email?: string;
  /**
   * User's phone number.
   */
  phone?: string;
  /**
   * User's gender.
   */
  gender?: "male" | "female" | "other";
  /**
   * UNIX timestamp in milliseconds of user's birthday.
   */
  birthday?: number;
  /**
   * UNIX timestamp in milliseconds of user registration.
   */
  registeredAt?: number;
  /**
   * User's physical address details.
   */
  address?: {
    /**
     * City name.
     */
    city?: string;
    /**
     * Country code or name.
     */
    country?: string;
    /**
     * State or province.
     */
    state?: string;
    /**
     * Street address.
     */
    street?: string;
    /**
     * User's timezone.
     */
    timezone?: string;
  };
  /**
   * Custom additional properties.
   */
  customProperties?: Record<string, Primitive>;
};

/**
 * HTTP response structure.
 */
export type HttpResponse = {
  /**
   * HTTP status code
   */
  status: number;
  /**
   * Response data if available
   */
  data?: unknown;
};
