import type { Event as RippleEvent } from "@internals/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieStorageAdapter } from "./cookie-storage-adapter.ts";

describe("CookieStorageAdapter", () => {
  let adapter: CookieStorageAdapter;
  let mockEvents: RippleEvent[];
  let originalCookieDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalCookieDescriptor = Object.getOwnPropertyDescriptor(
      document,
      "cookie",
    );

    adapter = new CookieStorageAdapter();

    mockEvents = [
      {
        name: "test_event",
        payload: { key: "value" },
        issuedAt: Date.now(),
        metadata: {},
        sessionId: "session-123",
        platform: null,
      } satisfies RippleEvent,
    ];
  });

  afterEach(() => {
    if (originalCookieDescriptor) {
      Object.defineProperty(document, "cookie", originalCookieDescriptor);
    }
  });

  describe("constructor", () => {
    it("should create instance with default parameters", () => {
      expect(adapter).toBeInstanceOf(CookieStorageAdapter);
    });

    it("should create instance with custom parameters", () => {
      const customAdapter = new CookieStorageAdapter({
        key: "custom_events",
        maxAge: 3600,
      });

      expect(customAdapter).toBeInstanceOf(CookieStorageAdapter);
    });
  });

  describe("isAvailable", () => {
    it("should return true when cookies are available", async () => {
      const available = await CookieStorageAdapter.isAvailable();

      expect(available).toBe(true);
    });

    it("should return false when cookies throw", async () => {
      Object.defineProperty(document, "cookie", {
        get: () => {
          throw new Error("Cookies disabled");
        },
        set: () => {
          throw new Error("Cookies disabled");
        },
        configurable: true,
      });

      const available = await CookieStorageAdapter.isAvailable();

      expect(available).toBe(false);

      // Restore
      Object.defineProperty(document, "cookie", {
        value: "",
        writable: true,
        configurable: true,
      });
    });
  });

  describe("save", () => {
    it("should save events to cookie", async () => {
      const cookieSetter = vi.fn();

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await adapter.save(mockEvents);

      const expectedValue = encodeURIComponent(JSON.stringify(mockEvents));

      expect(cookieSetter).toHaveBeenCalledWith(
        `ripple_events=${expectedValue}; max-age=604800; path=/; SameSite=Strict`,
      );
    });

    it("should use custom key and maxAge", async () => {
      const customAdapter = new CookieStorageAdapter({
        key: "custom_events",
        maxAge: 3600,
      });

      const cookieSetter = vi.fn();

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await customAdapter.save(mockEvents);

      const expectedValue = encodeURIComponent(JSON.stringify(mockEvents));

      expect(cookieSetter).toHaveBeenCalledWith(
        `custom_events=${expectedValue}; max-age=3600; path=/; SameSite=Strict`,
      );
    });

    it("should save empty array", async () => {
      const cookieSetter = vi.fn();

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await adapter.save([]);

      const expectedValue = encodeURIComponent(JSON.stringify([]));

      expect(cookieSetter).toHaveBeenCalledWith(
        `ripple_events=${expectedValue}; max-age=604800; path=/; SameSite=Strict`,
      );
    });

    it("should overwrite existing persisted events", async () => {
      const existingEvents: RippleEvent[] = [
        {
          name: "existing_event",
          payload: { old: "data" },
          issuedAt: 500,
          metadata: {},
          sessionId: "session-old",
          platform: null,
        },
      ];

      const cookieSetter = vi.fn();
      const existingValue = encodeURIComponent(JSON.stringify(existingEvents));

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => `ripple_events=${existingValue}`,
        configurable: true,
      });

      await adapter.save(mockEvents);

      const expectedValue = encodeURIComponent(JSON.stringify(mockEvents));

      expect(cookieSetter).toHaveBeenCalledWith(
        `ripple_events=${expectedValue}; max-age=604800; path=/; SameSite=Strict`,
      );
    });
  });

  describe("load", () => {
    it("should load events from cookie", async () => {
      const eventsJson = JSON.stringify(mockEvents);
      const encodedValue = encodeURIComponent(eventsJson);

      Object.defineProperty(document, "cookie", {
        value: `ripple_events=${encodedValue}`,
        writable: true,
        configurable: true,
      });

      const result = await adapter.load();

      expect(result).toEqual(mockEvents);
    });

    it("should return empty array when cookie doesn't exist", async () => {
      Object.defineProperty(document, "cookie", {
        value: "other_cookie=value",
        writable: true,
        configurable: true,
      });

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should return empty array when cookie value is empty", async () => {
      Object.defineProperty(document, "cookie", {
        value: "ripple_events=",
        writable: true,
        configurable: true,
      });

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should handle multiple cookies", async () => {
      const eventsJson = JSON.stringify(mockEvents);
      const encodedValue = encodeURIComponent(eventsJson);

      Object.defineProperty(document, "cookie", {
        value: `other_cookie=value; ripple_events=${encodedValue}; another_cookie=value2`,
        writable: true,
        configurable: true,
      });

      const result = await adapter.load();

      expect(result).toEqual(mockEvents);
    });

    it("should use custom key", async () => {
      const customAdapter = new CookieStorageAdapter({ key: "custom_events" });
      const eventsJson = JSON.stringify(mockEvents);
      const encodedValue = encodeURIComponent(eventsJson);

      Object.defineProperty(document, "cookie", {
        value: `custom_events=${encodedValue}`,
        writable: true,
        configurable: true,
      });

      const result = await customAdapter.load();

      expect(result).toEqual(mockEvents);
    });

    it("should handle invalid JSON gracefully", async () => {
      const invalidValue = encodeURIComponent("invalid json");

      Object.defineProperty(document, "cookie", {
        value: `ripple_events=${invalidValue}`,
        writable: true,
        configurable: true,
      });

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should handle malformed cookie value", async () => {
      Object.defineProperty(document, "cookie", {
        value: "ripple_events",
        writable: true,
        configurable: true,
      });

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should load empty array correctly", async () => {
      const encodedValue = encodeURIComponent("[]");

      Object.defineProperty(document, "cookie", {
        value: `ripple_events=${encodedValue}`,
        writable: true,
        configurable: true,
      });

      const result = await adapter.load();

      expect(result).toEqual([]);
    });
  });

  describe("clear", () => {
    it("should clear cookie by setting max-age to 0", async () => {
      const cookieSetter = vi.fn();

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await adapter.clear();

      expect(cookieSetter).toHaveBeenCalledWith(
        "ripple_events=; max-age=0; path=/",
      );
    });

    it("should use custom key when clearing", async () => {
      const customAdapter = new CookieStorageAdapter({ key: "custom_events" });
      const cookieSetter = vi.fn();

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await customAdapter.clear();

      expect(cookieSetter).toHaveBeenCalledWith(
        "custom_events=; max-age=0; path=/",
      );
    });
  });

  describe("quota exceeded handling", () => {
    const createMockEvents = (count: number): RippleEvent[] =>
      Array.from({ length: count }, (_, i) => ({
        name: `event${i}`,
        payload: {},
        metadata: {},
        issuedAt: Date.now(),
        sessionId: "s",
        platform: null,
      }));

    it("should handle quota exceeded with retry", async () => {
      const cookieSetter = vi.fn((value: string) => {
        if (value.length > 100) {
          throw new Error("Cookie too large");
        }
      });

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await expect(adapter.save(createMockEvents(10))).rejects.toThrow(
        "Cookie too large",
      );
    });

    it("should handle quota exceeded retry error", async () => {
      const cookieSetter = vi.fn(() => {
        throw new Error("Cookie too large");
      });

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await expect(adapter.save(createMockEvents(10))).rejects.toThrow();
    });

    it("should handle non-Error exceptions", async () => {
      const cookieSetter = vi.fn(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "String error";
      });

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await expect(adapter.save(createMockEvents(1))).rejects.toThrow(
        "String error",
      );
    });

    it("should handle single event quota error", async () => {
      const cookieSetter = vi.fn(() => {
        throw new Error("Cookie too large");
      });

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await expect(adapter.save(createMockEvents(1))).rejects.toThrow(
        "Cookie too large",
      );
    });

    it("should handle non-Error in retry", async () => {
      let callCount = 0;
      const cookieSetter = vi.fn(() => {
        callCount++;

        if (callCount === 1) {
          throw new Error("Cookie too large");
        }

        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "Retry string error";
      });

      Object.defineProperty(document, "cookie", {
        set: cookieSetter,
        get: () => "",
        configurable: true,
      });

      await expect(adapter.save(createMockEvents(10))).rejects.toThrow(
        "Retry string error",
      );
    });
  });

  describe("close", () => {
    it("should close without error", async () => {
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });
});
