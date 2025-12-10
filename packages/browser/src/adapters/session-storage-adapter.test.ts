import type { Event } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionStorageAdapter } from "./session-storage-adapter.ts";

describe("SessionStorageAdapter", () => {
  let adapter: SessionStorageAdapter;
  let mockSessionStorage: Storage;
  let mockEvents: Event[];

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
        context: {},
        sessionId: "session-123",
        metadata: null,
        platform: null,
      },
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
  });

  describe("save", () => {
    it("should save events to sessionStorage", async () => {
      await adapter.save(mockEvents);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_events",
        JSON.stringify(mockEvents),
      );
    });

    it("should use custom key when provided", async () => {
      const customAdapter = new SessionStorageAdapter("custom_events");

      await customAdapter.save(mockEvents);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "custom_events",
        JSON.stringify(mockEvents),
      );
    });

    it("should save empty array", async () => {
      await adapter.save([]);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_events",
        JSON.stringify([]),
      );
    });
  });

  describe("load", () => {
    it("should load events from sessionStorage", async () => {
      const eventsJson = JSON.stringify(mockEvents);

      vi.mocked(mockSessionStorage.getItem).mockReturnValue(eventsJson);

      const result = await adapter.load();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("ripple_events");
      expect(result).toEqual(mockEvents);
    });

    it("should return empty array when no data exists", async () => {
      vi.mocked(mockSessionStorage.getItem).mockReturnValue(null);

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should use custom key when provided", async () => {
      const customAdapter = new SessionStorageAdapter("custom_events");

      vi.mocked(mockSessionStorage.getItem).mockReturnValue("[]");

      await customAdapter.load();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("custom_events");
    });

    it("should handle invalid JSON gracefully", async () => {
      vi.mocked(mockSessionStorage.getItem).mockReturnValue("invalid json");

      await expect(adapter.load()).rejects.toThrow();
    });

    it("should load empty array correctly", async () => {
      vi.mocked(mockSessionStorage.getItem).mockReturnValue("[]");

      const result = await adapter.load();

      expect(result).toEqual([]);
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
