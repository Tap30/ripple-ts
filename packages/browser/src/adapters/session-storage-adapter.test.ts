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
      const customAdapter = new SessionStorageAdapter("custom_key");

      expect(customAdapter).toBeInstanceOf(SessionStorageAdapter);
    });

    it("should create instance with TTL", () => {
      const customAdapter = new SessionStorageAdapter("key", 60000);

      expect(customAdapter).toBeInstanceOf(SessionStorageAdapter);
    });
  });

  describe("save", () => {
    it("should save events to sessionStorage with timestamp", async () => {
      vi.setSystemTime(1000);
      await adapter.save(mockEvents);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_events",
        JSON.stringify({ events: mockEvents, savedAt: 1000 }),
      );
      vi.useRealTimers();
    });

    it("should use custom key when provided", async () => {
      vi.setSystemTime(1000);
      const customAdapter = new SessionStorageAdapter("custom_events");

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
      const ttlAdapter = new SessionStorageAdapter("ripple_events", 1000);
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
      const ttlAdapter = new SessionStorageAdapter("ripple_events", 5000);
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
      const customAdapter = new SessionStorageAdapter("custom_events");

      await customAdapter.clear();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "custom_events",
      );
    });
  });
});
