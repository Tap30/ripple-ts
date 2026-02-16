import type { Event as RippleEvent } from "@internals/core";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileStorageAdapter } from "./file-storage-adapter.ts";

vi.mock("node:fs/promises");

describe("FileStorageAdapter", () => {
  let adapter: FileStorageAdapter;
  let mockEvents: RippleEvent[];

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = new FileStorageAdapter();

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
    it("should create instance with default path", () => {
      expect(adapter).toBeInstanceOf(FileStorageAdapter);
    });

    it("should create instance with custom path", () => {
      const customAdapter = new FileStorageAdapter("/custom/path.json");

      expect(customAdapter).toBeInstanceOf(FileStorageAdapter);
    });
  });

  describe("save", () => {
    it("should save events to file", async () => {
      vi.mocked(writeFile).mockResolvedValue();

      await adapter.save(mockEvents);

      expect(writeFile).toHaveBeenCalledWith(
        ".ripple_events.json",
        JSON.stringify(mockEvents),
        "utf-8",
      );
    });

    it("should save to custom path", async () => {
      const customAdapter = new FileStorageAdapter("/custom/path.json");

      vi.mocked(writeFile).mockResolvedValue();

      await customAdapter.save(mockEvents);

      expect(writeFile).toHaveBeenCalledWith(
        "/custom/path.json",
        JSON.stringify(mockEvents),
        "utf-8",
      );
    });

    it("should save empty array", async () => {
      vi.mocked(writeFile).mockResolvedValue();

      await adapter.save([]);

      expect(writeFile).toHaveBeenCalledWith(
        ".ripple_events.json",
        JSON.stringify([]),
        "utf-8",
      );
    });
  });

  describe("load", () => {
    it("should load events from file", async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockEvents));

      const result = await adapter.load();

      expect(result).toEqual(mockEvents);
      expect(readFile).toHaveBeenCalledWith(".ripple_events.json", "utf-8");
    });

    it("should return empty array when file does not exist", async () => {
      vi.mocked(readFile).mockRejectedValue(
        new Error("ENOENT: no such file or directory"),
      );

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should return empty array on read error", async () => {
      vi.mocked(readFile).mockRejectedValue(new Error("Permission denied"));

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should return empty array on JSON parse error", async () => {
      vi.mocked(readFile).mockResolvedValue("invalid json");

      const result = await adapter.load();

      expect(result).toEqual([]);
    });

    it("should load from custom path", async () => {
      const customAdapter = new FileStorageAdapter("/custom/path.json");

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockEvents));

      await customAdapter.load();

      expect(readFile).toHaveBeenCalledWith("/custom/path.json", "utf-8");
    });
  });

  describe("clear", () => {
    it("should delete file", async () => {
      vi.mocked(unlink).mockResolvedValue();

      await adapter.clear();

      expect(unlink).toHaveBeenCalledWith(".ripple_events.json");
    });

    it("should handle file not found error", async () => {
      vi.mocked(unlink).mockRejectedValue(
        new Error("ENOENT: no such file or directory"),
      );

      await expect(adapter.clear()).resolves.not.toThrow();
    });

    it("should handle permission error", async () => {
      vi.mocked(unlink).mockRejectedValue(new Error("Permission denied"));

      await expect(adapter.clear()).resolves.not.toThrow();
    });

    it("should clear custom path", async () => {
      const customAdapter = new FileStorageAdapter("/custom/path.json");

      vi.mocked(unlink).mockResolvedValue();

      await customAdapter.clear();

      expect(unlink).toHaveBeenCalledWith("/custom/path.json");
    });
  });

  describe("close", () => {
    it("should close without error", async () => {
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });
});
