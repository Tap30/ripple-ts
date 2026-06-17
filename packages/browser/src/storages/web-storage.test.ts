import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebStorage } from "./web-storage.ts";

const mockSave = vi.fn().mockResolvedValue(undefined);
const mockLoad = vi.fn().mockResolvedValue([]);
const mockClear = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);

let indexedDBAvailable = true;
let localStorageAvailable = true;

vi.mock("./indexed-db-storage.ts", () => ({
  IndexedDBStorage: class {
    static isAvailable = () => Promise.resolve(indexedDBAvailable);
    save = mockSave;
    load = mockLoad;
    clear = mockClear;
    close = mockClose;
  },
}));

vi.mock("./local-storage.ts", () => ({
  LocalStorage: class {
    static isAvailable = () => Promise.resolve(localStorageAvailable);
    save = mockSave;
    load = mockLoad;
    clear = mockClear;
    close = mockClose;
  },
}));

vi.mock("./noop-storage.ts", () => ({
  NoOpStorage: class {
    save = vi.fn().mockResolvedValue(undefined);
    load = vi.fn().mockResolvedValue([]);
    clear = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

describe("WebStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexedDBAvailable = true;
    localStorageAvailable = true;
  });

  describe("init", () => {
    it("should default to IndexedDB when available", async () => {
      const storage = new WebStorage();

      await storage.init();

      await storage.save([]);
      expect(mockSave).toHaveBeenCalled();
    });

    it("should fall back to localStorage when IndexedDB unavailable", async () => {
      indexedDBAvailable = false;

      const storage = new WebStorage();

      await storage.init();

      await storage.save([]);
      expect(mockSave).toHaveBeenCalled();
    });

    it("should fall back to NoOp when both unavailable", async () => {
      indexedDBAvailable = false;
      localStorageAvailable = false;

      const storage = new WebStorage();

      await storage.init();

      await expect(storage.load()).resolves.toEqual([]);
    });

    it("should prefer localStorage when configured", async () => {
      const storage = new WebStorage({ prefer: "local-storage" });

      await storage.init();

      await storage.save([]);
      expect(mockSave).toHaveBeenCalled();
    });

    it("should prefer indexeddb when configured", async () => {
      const storage = new WebStorage({ prefer: "indexed-db" });

      await storage.init();

      await storage.save([]);
      expect(mockSave).toHaveBeenCalled();
    });

    it("should fall back to NoOp when preferred localStorage is unavailable", async () => {
      localStorageAvailable = false;
      indexedDBAvailable = false;

      const storage = new WebStorage({ prefer: "local-storage" });

      await storage.init();

      await expect(storage.load()).resolves.toEqual([]);
    });
  });

  describe("before init", () => {
    it("should throw if save called before init", async () => {
      const storage = new WebStorage();

      await expect(storage.save([])).rejects.toThrow(
        "WebStorage not initialized",
      );
    });

    it("should throw if load called before init", async () => {
      const storage = new WebStorage();

      await expect(storage.load()).rejects.toThrow(
        "WebStorage not initialized",
      );
    });

    it("should throw if clear called before init", async () => {
      const storage = new WebStorage();

      await expect(storage.clear()).rejects.toThrow(
        "WebStorage not initialized",
      );
    });

    it("should throw if close called before init", async () => {
      const storage = new WebStorage();

      await expect(storage.close()).rejects.toThrow(
        "WebStorage not initialized",
      );
    });
  });
});
