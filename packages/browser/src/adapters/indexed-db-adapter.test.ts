import {
  StorageQuotaExceededError,
  type Event as RippleEvent,
} from "@internals/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBAdapter } from "./indexed-db-adapter.ts";

const createEvent = (name = "test_event"): RippleEvent => ({
  name,
  payload: { key: "value" },
  issuedAt: Date.now(),
  metadata: {},
  sessionId: "session-123",
  platform: null,
});

const defProp = <T>(obj: T, key: string, value: unknown) =>
  Object.defineProperty(obj, key, { value, configurable: true });

/**
 * Resolves an IDB open request with the given db, then flushes the microtask queue.
 */
const resolveOpen = async (req: IDBOpenDBRequest, db: IDBDatabase) => {
  defProp(req, "result", db);

  req.onsuccess?.(new Event("success"));

  await Promise.resolve();
};

/**
 * Resolves a get request with the given value, then flushes.
 */
const resolveGet = async (req: IDBRequest<unknown>, value: unknown) => {
  defProp(req, "result", value);

  req.onsuccess?.(new Event("success"));

  await Promise.resolve();
};

/**
 * Completes a put/delete request and fires transaction oncomplete.
 */
const completeTx = (req: IDBRequest, tx: IDBTransaction) => {
  req.onsuccess?.(new Event("success"));
  tx.oncomplete?.(new Event("complete"));
};

/**
 * Rejects a request with an optional error message.
 */
const rejectRequest = (req: IDBRequest, message: string | null) => {
  defProp(req, "error", message ? { message } : null);
  req.onerror?.(new Event("error"));
};

/**
 * Rejects a transaction with an optional error.
 */
const rejectTx = (
  tx: IDBTransaction,
  error: Error | null,
  event: "onerror" | "onabort" = "onerror",
) => {
  defProp(tx, "error", error);
  tx[event]?.(new Event(event === "onerror" ? "error" : "abort"));
};

/**
 * Creates a mock get request and registers it as the next return value on the store.
 */
const mockGetReq = (store: IDBObjectStore) => {
  const req = {} as IDBRequest<unknown>;

  vi.mocked(store.get).mockReturnValue(req);

  return req;
};

/**
 * Creates a mock put request and registers it as the next return value on the store.
 */
const mockPutReq = (store: IDBObjectStore) => {
  const req = {} as IDBRequest<IDBValidKey>;

  vi.mocked(store.put).mockReturnValue(req);

  return req;
};

/**
 * Creates a mock delete request and registers it as the next return value on the store.
 */
const mockDeleteReq = (store: IDBObjectStore) => {
  const req = {} as IDBRequest<undefined>;

  vi.mocked(store.delete).mockReturnValue(req);

  return req;
};

describe("IndexedDBAdapter", () => {
  let adapter: IndexedDBAdapter;
  let mockEvents: RippleEvent[];
  let mockDB: IDBDatabase;
  let mockTransaction: IDBTransaction;
  let mockObjectStore: IDBObjectStore;
  let openRequest: IDBOpenDBRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEvents = [createEvent()];

    mockObjectStore = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    } as unknown as IDBObjectStore;

    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockObjectStore),
      oncomplete: null,
      onerror: null,
      onabort: null,
    } as unknown as IDBTransaction;

    mockDB = {
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(true),
      } as unknown as DOMStringList,
      createObjectStore: vi.fn(),
      close: vi.fn(),
    } as unknown as IDBDatabase;

    openRequest = {} as IDBOpenDBRequest;

    Object.defineProperty(global, "indexedDB", {
      value: { open: vi.fn().mockReturnValue(openRequest) },
      writable: true,
      configurable: true,
    });

    adapter = new IndexedDBAdapter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("creates with defaults", () => {
      expect(adapter).toBeInstanceOf(IndexedDBAdapter);
    });

    it("creates with custom config", () => {
      expect(
        new IndexedDBAdapter({
          dbName: "db",
          storeName: "store",
          key: "k",
          ttl: 60000,
        }),
      ).toBeInstanceOf(IndexedDBAdapter);
    });
  });

  describe("isAvailable", () => {
    it("returns true when IndexedDB opens successfully", async () => {
      const db = { close: vi.fn() } as unknown as IDBDatabase;
      const promise = IndexedDBAdapter.isAvailable();

      defProp(openRequest, "result", db);
      openRequest.onsuccess?.(new Event("success"));

      expect(await promise).toBe(true);
      expect(db.close).toHaveBeenCalled();
    });

    it("returns false when indexedDB is unavailable", async () => {
      const original = globalThis.indexedDB;

      // @ts-expect-error - intentional deletion
      delete globalThis.indexedDB;

      expect(await IndexedDBAdapter.isAvailable()).toBe(false);

      Object.defineProperty(globalThis, "indexedDB", {
        value: original,
        writable: true,
        configurable: true,
      });
    });

    it.each([
      [
        "open fails",
        (req: IDBOpenDBRequest) => {
          req.onerror?.(new Event("error"));
        },
      ],
      [
        "open is blocked",
        (req: IDBOpenDBRequest) => {
          req.onblocked?.({
            newVersion: null,
            oldVersion: 0,
          } as IDBVersionChangeEvent);
        },
      ],
    ])("returns false when %s", async (_, trigger) => {
      const promise = IndexedDBAdapter.isAvailable();

      trigger(openRequest);
      expect(await promise).toBe(false);
    });

    it("returns false when IndexedDB.open throws", async () => {
      vi.spyOn(indexedDB, "open").mockImplementation(() => {
        throw new Error("IndexedDB disabled");
      });

      expect(await IndexedDBAdapter.isAvailable()).toBe(false);
    });
  });

  describe("connection lifecycle", () => {
    const doSave = async () => {
      const getReq = mockGetReq(mockObjectStore);
      const putReq = mockPutReq(mockObjectStore);

      const savePromise = adapter.save(mockEvents);

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, undefined);

      completeTx(putReq, mockTransaction);

      await savePromise;

      return mockDB as unknown as {
        close: ReturnType<typeof vi.fn>;
        onclose: ((e: Event) => void) | null;
        onabort: ((e: Event) => void) | null;
        onversionchange: ((e: IDBVersionChangeEvent) => void) | null;
      };
    };

    it("resets db promise on close and abort", async () => {
      const db = await doSave();

      db.onclose?.(new Event("close"));
      db.onabort?.(new Event("abort"));

      expect(db.onclose).toBeDefined();
      expect(db.onabort).toBeDefined();
    });

    it("closes db on version change", async () => {
      const db = await doSave();

      db.onversionchange?.({
        newVersion: 2,
        oldVersion: 1,
      } as IDBVersionChangeEvent);

      expect(db.close).toHaveBeenCalled();
    });

    it("rejects on blocked upgrade", async () => {
      const savePromise = adapter.save(mockEvents);

      openRequest.onblocked?.({
        newVersion: null,
        oldVersion: 0,
      } as IDBVersionChangeEvent);

      await expect(savePromise).rejects.toThrow(
        "IndexedDB upgrade blocked by another tab",
      );
    });

    it("creates object store on upgrade if missing", async () => {
      const upgradeDB = {
        ...mockDB,
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        } as unknown as DOMStringList,
      } as IDBDatabase;

      const getReq = mockGetReq(mockObjectStore);
      const putReq = mockPutReq(mockObjectStore);
      const savePromise = adapter.save(mockEvents);

      defProp(openRequest, "result", upgradeDB);
      const upgradeEvent = new Event("upgradeneeded");

      defProp(upgradeEvent, "target", openRequest);
      openRequest.onupgradeneeded?.(upgradeEvent as IDBVersionChangeEvent);

      expect(upgradeDB.createObjectStore).toHaveBeenCalledWith("events");

      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      await resolveGet(getReq, undefined);

      completeTx(putReq, mockTransaction);

      await savePromise;
    });

    it("skips object store creation if already exists", async () => {
      const getReq = mockGetReq(mockObjectStore);
      const putReq = mockPutReq(mockObjectStore);

      const savePromise = adapter.save(mockEvents);

      defProp(openRequest, "result", mockDB);
      const upgradeEvent = new Event("upgradeneeded");

      defProp(upgradeEvent, "target", openRequest);
      openRequest.onupgradeneeded?.(upgradeEvent as IDBVersionChangeEvent);

      expect(mockDB.createObjectStore).not.toHaveBeenCalled();

      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      await resolveGet(getReq, undefined);

      completeTx(putReq, mockTransaction);

      await savePromise;
    });
  });

  describe("save", () => {
    it("saves events with timestamp", async () => {
      vi.setSystemTime(1000);

      const getReq = mockGetReq(mockObjectStore);
      const putReq = mockPutReq(mockObjectStore);

      const savePromise = adapter.save(mockEvents);

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, undefined);

      completeTx(putReq, mockTransaction);

      await savePromise;

      expect(indexedDB.open).toHaveBeenCalledWith(
        "ripple_db",
        IndexedDBAdapter.SCHEMA_VERSION,
      );
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: mockEvents, savedAt: 1000 },
        "queue",
      );
    });

    it("uses custom db/store/key names", async () => {
      vi.setSystemTime(1000);

      const custom = new IndexedDBAdapter({
        dbName: "custom_db",
        storeName: "custom_store",
        key: "custom_key",
      });

      const getReq = mockGetReq(mockObjectStore);
      const putReq = mockPutReq(mockObjectStore);

      const savePromise = custom.save(mockEvents);

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, undefined);

      completeTx(putReq, mockTransaction);

      await savePromise;

      expect(indexedDB.open).toHaveBeenCalledWith(
        "custom_db",
        IndexedDBAdapter.SCHEMA_VERSION,
      );
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: mockEvents, savedAt: 1000 },
        "custom_key",
      );
    });

    it("discards expired TTL data on save", async () => {
      vi.setSystemTime(5000);

      const ttlAdapter = new IndexedDBAdapter({ ttl: 1000 });
      const getReq = mockGetReq(mockObjectStore);
      const putReq = mockPutReq(mockObjectStore);

      const savePromise = ttlAdapter.save(mockEvents);

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, { events: [createEvent("old")], savedAt: 1000 });

      completeTx(putReq, mockTransaction);

      await savePromise;

      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: mockEvents, savedAt: 5000 },
        "queue",
      );
    });

    it("rejects on db open error (with and without message)", async () => {
      const savePromise1 = adapter.save(mockEvents);

      defProp(openRequest, "error", { message: "Database error" });
      openRequest.onerror?.(new Event("error"));

      await expect(savePromise1).rejects.toThrow("Database error");

      const savePromise2 = adapter.save(mockEvents);

      defProp(openRequest, "error", null);
      openRequest.onerror?.(new Event("error"));

      await expect(savePromise2).rejects.toThrow("Failed to open IndexedDB");
    });

    it("rejects on get error (with and without message)", async () => {
      for (const [msg, expected] of [
        ["Get error", "Get error"],
        [null, "Failed to read data"],
      ] as const) {
        const getReq = mockGetReq(mockObjectStore);
        const promise = adapter.save(mockEvents);

        await resolveOpen(openRequest, mockDB);

        rejectRequest(getReq, msg);

        await expect(promise).rejects.toThrow(expected);
      }
    });

    it("rejects on put error (with and without message)", async () => {
      for (const [msg, expected] of [
        ["Save error", "Save error"],
        [null, "Failed to write data"],
      ] as const) {
        const getReq = mockGetReq(mockObjectStore);
        const putReq = mockPutReq(mockObjectStore);

        const savePromise = adapter.save(mockEvents);

        await resolveOpen(openRequest, mockDB);
        await resolveGet(getReq, undefined);

        rejectRequest(putReq, msg);

        await expect(savePromise).rejects.toThrow(expected);
      }
    });

    it.each([
      [
        "onerror with error",
        "onerror" as const,
        new Error("Tx Error"),
        "Tx Error",
      ],
      [
        "onabort with error",
        "onabort" as const,
        new Error("Tx Abort"),
        "Tx Abort",
      ],
      ["onerror without error", "onerror" as const, null, "Transaction failed"],
      [
        "onabort without error",
        "onabort" as const,
        null,
        "Transaction aborted",
      ],
    ])("rejects on transaction %s", async (_, event, error, expected) => {
      mockGetReq(mockObjectStore);
      const savePromise = adapter.save(mockEvents);

      await resolveOpen(openRequest, mockDB);

      rejectTx(mockTransaction, error, event);

      await expect(savePromise).rejects.toThrow(expected);
    });

    it("rejects with quota error for single event (no retry)", async () => {
      const getReq = mockGetReq(mockObjectStore);
      const putReq = mockPutReq(mockObjectStore);

      const savePromise = adapter.save([createEvent()]);

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, undefined);

      defProp(putReq, "error", new StorageQuotaExceededError(0, 0));
      putReq.onerror?.(new Event("error"));

      await expect(savePromise).rejects.toThrow("Storage quota exceeded");
    });

    it("retries with half events on quota error for multiple events", async () => {
      const largeMockEvents = Array.from({ length: 10 }, (_, i) =>
        createEvent(`event${i}`),
      );

      let callCount = 0;

      const getReqs = [mockGetReq(mockObjectStore), {} as IDBRequest<unknown>];
      const putReqs = [
        mockPutReq(mockObjectStore),
        {} as IDBRequest<IDBValidKey>,
      ];

      vi.mocked(mockObjectStore.get).mockImplementation(
        () => getReqs[callCount]!,
      );
      vi.mocked(mockObjectStore.put).mockImplementation(
        () => putReqs[callCount]!,
      );

      const savePromise = adapter.save(largeMockEvents);

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReqs[0]!, undefined);

      callCount = 1;

      defProp(putReqs[0]!, "error", new StorageQuotaExceededError(0, 0));
      putReqs[0]!.onerror?.(new Event("error"));

      await Promise.resolve();

      await resolveGet(getReqs[1]!, undefined);

      completeTx(putReqs[1]!, mockTransaction);

      await expect(savePromise).rejects.toThrow("Storage quota exceeded");
    });
  });

  describe("load", () => {
    it("loads events from IndexedDB", async () => {
      const getReq = mockGetReq(mockObjectStore);
      const loadPromise = adapter.load();

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, { events: mockEvents, savedAt: Date.now() });

      expect(await loadPromise).toEqual(mockEvents);
      expect(mockDB.transaction).toHaveBeenCalledWith("events", "readonly");
      expect(mockObjectStore.get).toHaveBeenCalledWith("queue");
    });

    it("returns empty array when no data exists", async () => {
      const getReq = mockGetReq(mockObjectStore);
      const loadPromise = adapter.load();

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, undefined);

      expect(await loadPromise).toEqual([]);
    });

    it("returns events when TTL not expired", async () => {
      vi.setSystemTime(2000);
      const ttlAdapter = new IndexedDBAdapter({ ttl: 5000 });
      const getReq = mockGetReq(mockObjectStore);
      const loadPromise = ttlAdapter.load();

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, { events: mockEvents, savedAt: 1000 });

      expect(await loadPromise).toEqual(mockEvents);
    });

    it("clears and returns empty array when TTL expired", async () => {
      vi.setSystemTime(2000);
      const ttlAdapter = new IndexedDBAdapter({ ttl: 1000 });
      const getReq = mockGetReq(mockObjectStore);
      const deleteReq = mockDeleteReq(mockObjectStore);
      const loadPromise = ttlAdapter.load();

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, { events: mockEvents, savedAt: 0 });

      await Promise.resolve();

      await resolveOpen(openRequest, mockDB);

      await Promise.resolve();

      completeTx(deleteReq, mockTransaction);

      await expect(loadPromise).resolves.toEqual([]);
    });

    it("logs error and returns empty array when TTL clear fails", async () => {
      vi.setSystemTime(2000);

      const ttlAdapter = new IndexedDBAdapter({ ttl: 1000 });
      const getReq = mockGetReq(mockObjectStore);

      vi.spyOn(ttlAdapter, "clear").mockRejectedValueOnce(
        new Error("Clear failed"),
      );

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const loadPromise = ttlAdapter.load();

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, { events: mockEvents, savedAt: 0 });

      await expect(loadPromise).resolves.toEqual([]);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to clear expired TTL data:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("rejects on db open error", async () => {
      const loadPromise = adapter.load();

      defProp(openRequest, "error", { message: "Database error" });
      openRequest.onerror?.(new Event("error"));

      await expect(loadPromise).rejects.toThrow("Database error");
    });

    it("rejects on get error (with and without message)", async () => {
      for (const [msg, expected] of [
        ["Load error", "Load error"],
        [null, "Failed to read data"],
      ] as const) {
        const getReq = mockGetReq(mockObjectStore);
        const loadPromise = adapter.load();

        await resolveOpen(openRequest, mockDB);

        rejectRequest(getReq, msg);

        await expect(loadPromise).rejects.toThrow(expected);
      }
    });
  });

  describe("clear", () => {
    it("clears events from IndexedDB", async () => {
      const deleteReq = mockDeleteReq(mockObjectStore);
      const loadPromise = adapter.clear();

      await resolveOpen(openRequest, mockDB);

      completeTx(deleteReq, mockTransaction);

      await loadPromise;

      expect(mockDB.transaction).toHaveBeenCalledWith("events", "readwrite");
      expect(mockObjectStore.delete).toHaveBeenCalledWith("queue");
    });

    it("rejects on db open error", async () => {
      const loadPromise = adapter.clear();

      defProp(openRequest, "error", { message: "Database error" });
      openRequest.onerror?.(new Event("error"));

      await expect(loadPromise).rejects.toThrow("Database error");
    });

    it("rejects on delete error (with and without message)", async () => {
      for (const [msg, expected] of [
        ["Clear error", "Clear error"],
        [null, "Failed to clear data"],
      ] as const) {
        const deleteReq = mockDeleteReq(mockObjectStore);
        const loadPromise = adapter.clear();

        await resolveOpen(openRequest, mockDB);

        rejectRequest(deleteReq, msg);

        await expect(loadPromise).rejects.toThrow(expected);
      }
    });

    it.each([
      [
        "onerror with error",
        "onerror" as const,
        new Error("Clear Tx Error"),
        "Clear Tx Error",
      ],
      [
        "onabort with error",
        "onabort" as const,
        new Error("Clear Tx Abort"),
        "Clear Tx Abort",
      ],
      ["onerror without error", "onerror" as const, null, "Transaction failed"],
      [
        "onabort without error",
        "onabort" as const,
        null,
        "Transaction aborted",
      ],
    ])("rejects on transaction %s", async (_, event, error, expected) => {
      mockDeleteReq(mockObjectStore);

      const loadPromise = adapter.clear();

      await resolveOpen(openRequest, mockDB);

      rejectTx(mockTransaction, error, event);

      await expect(loadPromise).rejects.toThrow(expected);
    });
  });

  describe("close", () => {
    it("closes the database connection", async () => {
      const getReq = mockGetReq(mockObjectStore);
      const loadPromise = adapter.load();

      await resolveOpen(openRequest, mockDB);
      await resolveGet(getReq, undefined);
      await loadPromise;

      await adapter.close();
      expect(mockDB.close).toHaveBeenCalled();
    });

    it("resolves without error when no connection exists", async () => {
      await expect(new IndexedDBAdapter().close()).resolves.toBeUndefined();
    });
  });
});
