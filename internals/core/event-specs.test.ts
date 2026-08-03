import { describe, expect, it } from "vitest";
import { isPredefinedEvent } from "./event-specs.ts";
import type { Event } from "./types.ts";

const createEvent = (name: string): Event => ({
  name,
  payload: null,
  metadata: null,
  platform: null,
  sdk: { name: "test", version: "1.0" },
  issuedAt: Date.now(),
  anonymousId: "anon-1",
  eventId: "evt-1",
  schemaVersion: null,
  userId: null,
});

describe("isPredefinedEvent", () => {
  it("should return true for a predefined event name", () => {
    expect(isPredefinedEvent(createEvent("product_viewed"))).toBe(true);
  });

  it("should return true for every predefined event name", () => {
    const sample = [
      "user_identified",
      "screened",
      "app_state_changed",
      "clicked",
      "viewed",
      "product_clicked",
      "product_viewed",
      "product_shared",
      "products_searched",
      "product_list_viewed",
      "product_list_filtered",
      "product_reviewed",
      "product_added_to_wishlist",
      "product_removed_from_wishlist",
      "product_added_to_cart",
      "product_removed_from_cart",
      "cart_viewed",
      "cart_emptied",
      "checkout_started",
      "checkout_step_viewed",
      "checkout_step_completed",
      "order_completed",
      "order_failed",
      "order_cancelled",
      "order_shipped",
      "order_refunded",
      "order_updated",
      "order_product_fulfilled",
      "order_product_returned",
      "order_fulfillment_status_updated",
      "order_reviewed",
      "coupon_entered",
      "coupon_removed",
      "coupon_denied",
      "promotion_viewed",
      "promotion_clicked",
      "payment_authorized",
      "payment_captured",
      "payment_failed",
      "payment_refunded",
      "referral_shared",
      "referral_applied",
      "incentive_granted",
      "incentive_redeemed",
      "incentive_claimed",
      "incentive_expired",
      "challenge_started",
      "challenge_completed",
      "challenge_step_completed",
    ];

    for (const name of sample) {
      expect(isPredefinedEvent(createEvent(name))).toBe(true);
    }
  });

  it("should return false for a custom event name", () => {
    expect(isPredefinedEvent(createEvent("custom.event"))).toBe(false);
  });

  it("should return false for an empty event name", () => {
    expect(isPredefinedEvent(createEvent(""))).toBe(false);
  });

  it("should return false for a name that is a prefix of a predefined event", () => {
    expect(isPredefinedEvent(createEvent("product"))).toBe(false);
  });
});
