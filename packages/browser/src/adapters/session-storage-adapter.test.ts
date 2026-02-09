import type { Event as RippleEvent } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionStorageAdapter } from "./session-storage-adapter.ts";

describe("SessionStorageAdapter", () => {
  let adapter: SessionStorageAdapter;
  let mockSessionStorage: Storage;
  let mockEvents: RippleEvent[];

  beforeEach(() => {
    mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    Object.defineProperty(window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
    });

    adapter = new SessionStorageAdapter();

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

  describe("constructor", () => {
    it("should create instance with default key", () => {
      expect(adapter).toBeInstanceOf(SessionStorageAdapter);
    });

    it("should create instance with custom key", () => {
      const customAdapter = new SessionStorageAdapter({ key: "custom_key" });

      expect(customAdapter).toBeInstanceOf(SessionStorageAdapter);
    });

    it("should create instance with TTL", () => {
      const customAdapter = new SessionStorageAdapter({ ttl: 60000 });

      expect(customAdapter).toBeInstanceOf(SessionStorageAdapter);
    });
  });

  describe("isAvailable", () => {
    it("should return true when sessionStorage is available", async () => {
      const available = await SessionStorageAdapter.isAvailable();

      expect(available).toBe(true);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "__ripple_test__",
        "test",
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "__ripple_test__",
      );
    });

    it("should return false when sessionStorage throws", async () => {
      vi.mocked(mockSessionStorage.setItem).mockImplementation(() => {
        throw new Error("SecurityError");
      });

      const available = await SessionStorageAdapter.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe("save", () => {
    it("should save events to sessionStorage with timestamp", async () => {
      vi.setSystemTime(1000);
      vi.mocked(mockSessionStorage.getItem).mockReturnValue(null);

      await adapter.save(mockEvents);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_events",
        JSON.stringify({ events: mockEvents, savedAt: 1000 }),
      );
      vi.useRealTimers();
    });

    it("should use custom key when provided", async () => {
      vi.setSystemTime(1000);
      const customAdapter = new SessionStorageAdapter({ key: "custom_events" });

      vi.mocked(mockSessionStorage.getItem).mockReturnValue(null);

      await customAdapter.save(mockEvents);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "custom_events",
        JSON.stringify({ events: mockEvents, savedAt: 1000 }),
      );
      vi.useRealTimers();
    });
  });

  describe("load", () => {
    it("should load events from sessionStorage", async () => {
      const data = JSON.stringify({ events: mockEvents, savedAt: Date.now() });

      vi.mocked(mockSessionStorage.getItem).mockReturnValue(data);

      const result = await adapter.load();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("ripple_events");
      expect(result).toEqual(mockEvents);
    });

    it("should return empty array when no data exists", async () => {
      vi.mocked(mockSessionStorage.getItem).mockReturnValue(null);

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should return empty array and clear when TTL expired", async () => {
      const ttlAdapter = new SessionStorageAdapter({ ttl: 1000 });
      const data = JSON.stringify({ events: mockEvents, savedAt: 0 });

      vi.mocked(mockSessionStorage.getItem).mockReturnValue(data);
      vi.setSystemTime(2000);

      const result = await ttlAdapter.load();

      expect(result).toEqual([]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "ripple_events",
      );
      vi.useRealTimers();
    });

    it("should return events when TTL not expired", async () => {
      const ttlAdapter = new SessionStorageAdapter({ ttl: 5000 });
      const data = JSON.stringify({ events: mockEvents, savedAt: 1000 });

      vi.mocked(mockSessionStorage.getItem).mockReturnValue(data);
      vi.setSystemTime(2000);

      const result = await ttlAdapter.load();

      expect(result).toEqual(mockEvents);
      vi.useRealTimers();
    });

    it("should handle invalid JSON gracefully", async () => {
      vi.mocked(mockSessionStorage.getItem).mockReturnValue("invalid json");

      await expect(adapter.load()).rejects.toThrow();
    });
  });

  describe("clear", () => {
    it("should remove events from sessionStorage", async () => {
      await adapter.clear();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "ripple_events",
      );
    });

    it("should use custom key when provided", async () => {
      const customAdapter = new SessionStorageAdapter({ key: "custom_events" });

      await customAdapter.clear();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "custom_events",
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
      vi.mocked(mockSessionStorage.setItem).mockImplementationOnce(() => {
        const error = new Error("QuotaExceededError");

        error.name = "QuotaExceededError";
        throw error;
      });

      await expect(adapter.save(createMockEvents(10))).rejects.toThrow(
        "Storage quota exceeded",
      );
    });

    it("should handle quota exceeded retry error", async () => {
      let callCount = 0;

      vi.mocked(mockSessionStorage.setItem).mockImplementation(() => {
        callCount++;
        const error = new Error("QuotaExceededError");

        error.name = "QuotaExceededError";
        throw error;
      });

      await expect(adapter.save(createMockEvents(10))).rejects.toThrow();
      expect(callCount).toBe(2);
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(mockSessionStorage.setItem).mockImplementationOnce(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "String error";
      });

      await expect(adapter.save(createMockEvents(1))).rejects.toThrow(
        "String error",
      );
    });

    it("should handle single event quota error", async () => {
      vi.mocked(mockSessionStorage.setItem).mockImplementationOnce(() => {
        const error = new Error("QuotaExceededError");

        error.name = "QuotaExceededError";
        throw error;
      });

      await expect(adapter.save(createMockEvents(1))).rejects.toThrow(
        "QuotaExceededError",
      );
    });

    it("should handle non-Error in retry", async () => {
      let callCount = 0;

      vi.mocked(mockSessionStorage.setItem).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error = new Error("QuotaExceededError");

          error.name = "QuotaExceededError";
          throw error;
        }

        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "Retry string error";
      });

      await expect(adapter.save(createMockEvents(10))).rejects.toThrow(
        "Retry string error",
      );
    });

    it("should handle Error in retry", async () => {
      let callCount = 0;

      vi.mocked(mockSessionStorage.setItem).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error = new Error("QuotaExceededError");

          error.name = "QuotaExceededError";
          throw error;
        }

        throw new Error("Retry error");
      });

      await expect(adapter.save(createMockEvents(10))).rejects.toThrow(
        "Retry error",
      );
    });

    it("should handle non-QuotaExceededError", async () => {
      vi.mocked(mockSessionStorage.setItem).mockImplementationOnce(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "Non-error value";
      });

      await expect(adapter.save(createMockEvents(1))).rejects.toThrow(
        "Non-error value",
      );
    });

    it("should handle non-quota Error", async () => {
      vi.mocked(mockSessionStorage.setItem).mockImplementationOnce(() => {
        throw new TypeError("Some other error");
      });

      await expect(adapter.save(createMockEvents(2))).rejects.toThrow(
        "Some other error",
      );
    });
  });
});
