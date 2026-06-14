/**
 * Represents a generic payload for any event.
 */
export type EventPayload = Record<string, unknown>;

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
  location?: { lat: number; long: number };
};

/**
 * Represents shipping details for an order.
 */
export type Shipping = {
  /**
   * Cost of shipping.
   */
  price: number;
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
   * Products included in the order.
   */
  products: Product[];
  /**
   * Total revenue (sum of all product prices after discounts).
   */
  revenue: Money;
  /**
   * Shipping details.
   */
  shipping?: Shipping;
  /**
   * Tax amount.
   */
  tax?: Money;
  /**
   * Applied coupons.
   */
  coupons?: Coupon[];
  /**
   * Total discount from all sources.
   */
  discount?: Money;
  /**
   * Final amount charged to the user.
   */
  total: Money;
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents a shopping cart.
 */
export type Cart = {
  /**
   * Unique cart identifier.
   */
  cartId: string;
  /**
   * Products currently in the cart.
   */
  products: Product[];
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents a payment transaction.
 */
export type Payment = {
  /**
   * Unique payment transaction identifier from the gateway.
   */
  paymentId: string;
  /**
   * Associated order identifier.
   */
  orderId: string;
  /**
   * The payment method used.
   */
  method: string;
  /**
   * The amount being charged.
   */
  amount: Money;
  /**
   * Name of the payment gateway/processor.
   */
  gateway?: string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents pagination context.
 */
export type Pagination = {
  /**
   * Current page number (1-based).
   */
  page: number;
  /**
   * Number of items per page.
   */
  pageSize: number;
  /**
   * Total number of pages available.
   */
  totalPages?: number;
};

/**
 * Represents a filter applied to a list.
 */
export type Filter = {
  /**
   * Type of filter (e.g., "category", "price", "brand").
   */
  type: string;
  /**
   * Value(s) of the filter.
   */
  value: Primitive | Primitive[];
};

/**
 * Represents sorting applied to a list.
 */
export type Sort = {
  /**
   * Type of sort (e.g., "price", "popularity", "date").
   */
  type: string;
  /**
   * Sort order.
   */
  order: "asc" | "desc";
};

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

export type WebPlatform = {
  type: "web";
  browser: PlatformInfo;
  device: PlatformInfo;
  os: PlatformInfo;
};

export type NativePlatform = {
  type: "native";
  device: PlatformInfo;
  os: PlatformInfo;
};

export type ServerPlatform = {
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

/**
 * Represents a checkout session.
 */
export type Checkout = {
  /**
   * Unique checkout session identifier.
   */
  checkoutId?: string;
  /**
   * Order details populated so far (excludes finalized IDs).
   */
  order: Omit<Order, "orderId" | "checkoutId">;
  /**
   * Current step in the checkout funnel (e.g., 2 or "shipping").
   */
  step: number | string;
  customProperties?: Record<string, Primitive>;
};

/**
 * Represents UTM campaign parameters.
 */
export type Campaign = {
  /**
   * The referrer or entity sending the traffic (utm_source, e.g., "google", "newsletter").
   */
  source: string;
  /**
   * The marketing medium (utm_medium, e.g., "cpc", "email", "social").
   */
  medium: string;
  /**
   * The specific campaign name (utm_campaign, e.g., "summer_sale_2026").
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
 * Application state enum.
 */
export type AppState = "opened" | "closed" | "foreground" | "background";

export type UserTraits = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  age?: number;
  email?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  verified?: boolean;
  /**
   * UNIX timestamp in milliseconds.
   */
  birthday?: number;
  /**
   * UNIX timestamp in milliseconds.
   */
  registeredAt?: number;
  address?: {
    city?: string;
    country?: string;
    state?: string;
    street?: string;
    timezone?: string;
  };
};
