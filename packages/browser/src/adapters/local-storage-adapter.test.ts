import type { Event as RippleEvent } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageAdapter } from "./local-storage-adapter.ts";

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;
  let mockLocalStorage: Storage;
  let mockEvents: RippleEvent[];

  beforeEach(() => {
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });

    adapter = new LocalStorageAdapter();

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
      expect(adapter).toBeInstanceOf(LocalStorageAdapter);
    });

    it("should create instance with custom key", () => {
      const customAdapter = new LocalStorageAdapter({ key: "custom_key" });

      expect(customAdapter).toBeInstanceOf(LocalStorageAdapter);
    });

    it("should create instance with TTL", () => {
      const customAdapter = new LocalStorageAdapter({ ttl: 60000 });

      expect(customAdapter).toBeInstanceOf(LocalStorageAdapter);
    });
  });

  describe("isAvailable", () => {
    it("should return true when localStorage is available", async () => {
      const available = await LocalStorageAdapter.isAvailable();

      expect(available).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "__ripple_test__",
        "test",
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "__ripple_test__",
      );
    });

    it("should return false when localStorage throws", async () => {
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const available = await LocalStorageAdapter.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe("save", () => {
    it("should save events to localStorage with timestamp", async () => {
      vi.setSystemTime(1000);
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

      await adapter.save(mockEvents);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "ripple_events",
        JSON.stringify({ events: mockEvents, savedAt: 1000 }),
      );
      vi.useRealTimers();
    });

    it("should use custom key when provided", async () => {
      vi.setSystemTime(1000);
      const customAdapter = new LocalStorageAdapter({ key: "custom_events" });

      vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

      await customAdapter.save(mockEvents);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "custom_events",
        JSON.stringify({ events: mockEvents, savedAt: 1000 }),
      );
      vi.useRealTimers();
    });

    it("should handle QuotaExceededError by dropping oldest half", async () => {
      vi.setSystemTime(1000);
      const events = Array.from({ length: 10 }, (_, i) => ({
        name: `event_${i}`,
        payload: {},
        issuedAt: i,
        metadata: {},
        sessionId: `session-${i}`,
        platform: null,
      })) as RippleEvent[];

      let callCount = 0;

      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error = new Error("QuotaExceededError");

          error.name = "QuotaExceededError";

          throw error;
        }
      });

      await expect(adapter.save(events)).rejects.toThrow(
        "Storage quota exceeded: dropped 5 oldest events, saved 5",
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
      // Second call should have only last 5 events
      const secondCall = vi.mocked(mockLocalStorage.setItem).mock.calls[1];

      if (!secondCall) {
        throw new Error("Second call not found");
      }

      const savedData = JSON.parse(secondCall[1]) as {
        events: RippleEvent[];
        savedAt: number;
      };

      expect(savedData.events).toHaveLength(5);
      expect(savedData.events[0]?.name).toBe("event_5");
      vi.useRealTimers();
    });

    it("should throw non-quota errors", async () => {
      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
        throw new Error("Some other error");
      });

      await expect(adapter.save(mockEvents)).rejects.toThrow(
        "Some other error",
      );
    });
  });

  describe("load", () => {
    it("should load events from localStorage", async () => {
      const data = JSON.stringify({ events: mockEvents, savedAt: Date.now() });

      vi.mocked(mockLocalStorage.getItem).mockReturnValue(data);

      const result = await adapter.load();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("ripple_events");
      expect(result).toEqual(mockEvents);
    });

    it("should return empty array when no data exists", async () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should return empty array and clear when TTL expired", async () => {
      const ttlAdapter = new LocalStorageAdapter({ ttl: 1000 });
      const data = JSON.stringify({ events: mockEvents, savedAt: 0 });

      vi.mocked(mockLocalStorage.getItem).mockReturnValue(data);
      vi.setSystemTime(2000);

      const result = await ttlAdapter.load();

      expect(result).toEqual([]);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("ripple_events");
      vi.useRealTimers();
    });

    it("should return events when TTL not expired", async () => {
      const ttlAdapter = new LocalStorageAdapter({ ttl: 5000 });
      const data = JSON.stringify({ events: mockEvents, savedAt: 1000 });

      vi.mocked(mockLocalStorage.getItem).mockReturnValue(data);
      vi.setSystemTime(2000);

      const result = await ttlAdapter.load();

      expect(result).toEqual(mockEvents);
      vi.useRealTimers();
    });

    it("should handle invalid JSON gracefully", async () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue("invalid json");

      const result = await adapter.load();

      expect(result).toEqual([]);
    });
  });

  describe("clear", () => {
    it("should remove events from localStorage", async () => {
      await adapter.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("ripple_events");
    });

    it("should use custom key when provided", async () => {
      const customAdapter = new LocalStorageAdapter({ key: "custom_events" });

      await customAdapter.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("custom_events");
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

    it("should handle non-Error in retry", async () => {
      let callCount = 0;

      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
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

      vi.mocked(mockLocalStorage.setItem).mockImplementation(() => {
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

    it("should handle non-Error exception", async () => {
      vi.mocked(mockLocalStorage.setItem).mockImplementationOnce(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "Non-error value";
      });

      await expect(adapter.save(mockEvents)).rejects.toThrow("Non-error value");
    });
  });
});
