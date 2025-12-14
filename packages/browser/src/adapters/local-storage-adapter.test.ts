import type { Event } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageAdapter } from "./local-storage-adapter.ts";

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;
  let mockLocalStorage: Storage;
  let mockEvents: Event[];

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
      },
    ];
  });

  describe("constructor", () => {
    it("should create instance with default key", () => {
      expect(adapter).toBeInstanceOf(LocalStorageAdapter);
    });

    it("should create instance with custom key", () => {
      const customAdapter = new LocalStorageAdapter("custom_key");

      expect(customAdapter).toBeInstanceOf(LocalStorageAdapter);
    });
  });

  describe("save", () => {
    it("should save events to localStorage", async () => {
      await adapter.save(mockEvents);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "ripple_events",
        JSON.stringify(mockEvents),
      );
    });

    it("should use custom key when provided", async () => {
      const customAdapter = new LocalStorageAdapter("custom_events");

      await customAdapter.save(mockEvents);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "custom_events",
        JSON.stringify(mockEvents),
      );
    });

    it("should save empty array", async () => {
      await adapter.save([]);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "ripple_events",
        JSON.stringify([]),
      );
    });
  });

  describe("load", () => {
    it("should load events from localStorage", async () => {
      const eventsJson = JSON.stringify(mockEvents);

      vi.mocked(mockLocalStorage.getItem).mockReturnValue(eventsJson);

      const result = await adapter.load();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("ripple_events");
      expect(result).toEqual(mockEvents);
    });

    it("should return empty array when no data exists", async () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue(null);

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should use custom key when provided", async () => {
      const customAdapter = new LocalStorageAdapter("custom_events");

      vi.mocked(mockLocalStorage.getItem).mockReturnValue("[]");

      await customAdapter.load();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("custom_events");
    });

    it("should handle invalid JSON gracefully", async () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue("invalid json");

      await expect(adapter.load()).rejects.toThrow();
    });

    it("should load empty array correctly", async () => {
      vi.mocked(mockLocalStorage.getItem).mockReturnValue("[]");

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
      const customAdapter = new LocalStorageAdapter("custom_events");

      await customAdapter.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("custom_events");
    });
  });
});
