import type { Event as RippleEvent } from "@internals/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDBAdapter } from "./indexed-db-adapter.ts";

describe("IndexedDBAdapter", () => {
  let adapter: IndexedDBAdapter;
  let mockEvents: RippleEvent[];
  let mockDB: IDBDatabase;
  let mockTransaction: IDBTransaction;
  let mockObjectStore: IDBObjectStore;

  beforeEach(() => {
    vi.clearAllMocks();

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

    mockObjectStore = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    } as unknown as IDBObjectStore;

    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockObjectStore),
    } as unknown as IDBTransaction;

    mockDB = {
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(true),
      } as unknown as DOMStringList,
      createObjectStore: vi.fn(),
    } as unknown as IDBDatabase;

    Object.defineProperty(global, "indexedDB", {
      value: {
        open: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    adapter = new IndexedDBAdapter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should create instance with default parameters", () => {
      expect(adapter).toBeInstanceOf(IndexedDBAdapter);
    });

    it("should create instance with custom parameters", () => {
      const customAdapter = new IndexedDBAdapter({
        dbName: "custom_db",
        storeName: "custom_store",
        key: "custom_key",
      });

      expect(customAdapter).toBeInstanceOf(IndexedDBAdapter);
    });

    it("should create instance with TTL", () => {
      const customAdapter = new IndexedDBAdapter({ ttl: 60000 });

      expect(customAdapter).toBeInstanceOf(IndexedDBAdapter);
    });

    it("should create instance with persistedQueueLimit", () => {
      const customAdapter = new IndexedDBAdapter({
        persistedQueueLimit: 100,
      });

      expect(customAdapter).toBeInstanceOf(IndexedDBAdapter);
    });
  });

  describe("isAvailable", () => {
    it("should return true when IndexedDB is available", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const db = {
        close: vi.fn(),
      } as unknown as IDBDatabase;

      vi.spyOn(indexedDB, "open").mockReturnValue(openRequest);

      const availablePromise = IndexedDBAdapter.isAvailable();

      Object.defineProperty(openRequest, "result", { value: db });
      openRequest.onsuccess?.(new Event("success"));

      const available = await availablePromise;

      expect(available).toBe(true);
      expect(db.close).toHaveBeenCalled();
    });

    it("should return false when IndexedDB is not available", async () => {
      const originalIndexedDB = globalThis.indexedDB;

      // Remove indexedDB from globalThis
      // @ts-expect-error - Deleting for test
      delete globalThis.indexedDB;

      const available = await IndexedDBAdapter.isAvailable();

      expect(available).toBe(false);

      // Restore
      Object.defineProperty(globalThis, "indexedDB", {
        value: originalIndexedDB,
        writable: true,
        configurable: true,
      });
    });

    it("should return false when IndexedDB open fails", async () => {
      const openRequest = {} as IDBOpenDBRequest;

      vi.spyOn(indexedDB, "open").mockReturnValue(openRequest);

      const availablePromise = IndexedDBAdapter.isAvailable();

      openRequest.onerror?.(new Event("error"));

      const available = await availablePromise;

      expect(available).toBe(false);
    });

    it("should return false when IndexedDB open is blocked", async () => {
      const openRequest = {} as IDBOpenDBRequest;

      vi.spyOn(indexedDB, "open").mockReturnValue(openRequest);

      const availablePromise = IndexedDBAdapter.isAvailable();

      openRequest.onblocked?.({
        newVersion: null,
        oldVersion: 0,
      } as IDBVersionChangeEvent);

      const available = await availablePromise;

      expect(available).toBe(false);
    });

    it("should return false when IndexedDB.open throws", async () => {
      vi.spyOn(indexedDB, "open").mockImplementation(() => {
        throw new Error("IndexedDB disabled");
      });

      const available = await IndexedDBAdapter.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe("connection lifecycle", () => {
    it("should reset promise on database close", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;
      const db = {
        close: vi.fn(),
        onclose: null as (() => void) | null,
        onversionchange: null as (() => void) | null,
        transaction: vi.fn().mockReturnValue(mockTransaction),
      } as unknown as IDBDatabase;

      vi.spyOn(indexedDB, "open").mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: db });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      // Trigger close
      db.onclose?.(new Event("close"));

      // Verify close handler was set
      expect(db.onclose).toBeDefined();
    });

    it("should reset promise on version change", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;
      const db = {
        close: vi.fn(),
        onclose: null as (() => void) | null,
        onversionchange: null as (() => void) | null,
        transaction: vi.fn().mockReturnValue(mockTransaction),
      } as unknown as IDBDatabase;

      vi.spyOn(indexedDB, "open").mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: db });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      // Trigger version change
      db.onversionchange?.({
        newVersion: 2,
        oldVersion: 1,
      } as IDBVersionChangeEvent);

      expect(db.close).toHaveBeenCalled();
    });

    it("should handle blocked event during open", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

      vi.spyOn(indexedDB, "open").mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      // Trigger blocked event (should not reject, just a no-op)
      openRequest.onblocked?.({
        newVersion: null,
        oldVersion: 0,
      } as IDBVersionChangeEvent);

      // Then succeed
      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      expect(mockObjectStore.put).toHaveBeenCalled();
    });
  });

  describe("save", () => {
    it("should save events to IndexedDB with timestamp", async () => {
      vi.setSystemTime(1000);
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns no existing data
      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Put succeeds
      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      expect(indexedDB.open).toHaveBeenCalledWith("ripple_db", 1);
      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: mockEvents, savedAt: 1000 },
        "queue",
      );
    });

    it("should handle database open error", async () => {
      const openRequest = {} as IDBOpenDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "error", {
        value: { message: "Database error" } as DOMException,
      });
      openRequest.onerror?.(new Event("error"));

      await expect(savePromise).rejects.toThrow("Database error");
    });

    it("should handle database open error without message", async () => {
      const openRequest = {} as IDBOpenDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "error", { value: null });
      openRequest.onerror?.(new Event("error"));

      await expect(savePromise).rejects.toThrow("Failed to open IndexedDB");
    });

    it("should handle save error", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns no data
      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Put fails
      Object.defineProperty(putRequest, "error", {
        value: { message: "Save error" } as DOMException,
      });
      putRequest.onerror?.(new Event("error"));

      await expect(savePromise).rejects.toThrow("Save error");
    });

    it("should handle save error without message", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const putRequest = {} as IDBRequest<IDBValidKey>;
      const getRequest = {} as IDBRequest<unknown>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      // First open for load()
      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns no data
      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Put fails
      Object.defineProperty(putRequest, "error", { value: null });
      putRequest.onerror?.(new Event("error"));

      await expect(savePromise).rejects.toThrow("Failed to write data");
    });

    it("should handle get error during save", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get fails
      Object.defineProperty(getRequest, "error", {
        value: { message: "Get error" } as DOMException,
      });
      getRequest.onerror?.(new Event("error"));

      await expect(savePromise).rejects.toThrow("Get error");
    });

    it("should handle get error without message during save", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get fails without message
      Object.defineProperty(getRequest, "error", { value: null });
      getRequest.onerror?.(new Event("error"));

      await expect(savePromise).rejects.toThrow("Failed to read data");
    });

    it("should merge with existing persisted events", async () => {
      vi.setSystemTime(2000);
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

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

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns existing events
      Object.defineProperty(getRequest, "result", {
        value: { events: existingEvents, savedAt: 1000 },
      });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Put succeeds
      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: [...existingEvents, ...mockEvents], savedAt: 2000 },
        "queue",
      );
    });

    it("should apply FIFO eviction when persistedQueueLimit is exceeded", async () => {
      vi.setSystemTime(3000);
      const limitedAdapter = new IndexedDBAdapter({
        persistedQueueLimit: 2,
      });

      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

      const existingEvents: RippleEvent[] = [
        {
          name: "event_1",
          payload: {},
          issuedAt: 1000,
          metadata: {},
          sessionId: "session-1",
          platform: null,
        },
        {
          name: "event_2",
          payload: {},
          issuedAt: 2000,
          metadata: {},
          sessionId: "session-2",
          platform: null,
        },
      ];

      const newEvent: RippleEvent = {
        name: "event_3",
        payload: {},
        issuedAt: 3000,
        metadata: {},
        sessionId: "session-3",
        platform: null,
      };

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = limitedAdapter.save([newEvent]);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns existing events
      Object.defineProperty(getRequest, "result", {
        value: { events: existingEvents, savedAt: 2000 },
      });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Put succeeds
      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: [existingEvents[1], newEvent], savedAt: 3000 },
        "queue",
      );
    });

    it("should discard expired data and save new events when TTL exceeded", async () => {
      const adapterWithTTL = new IndexedDBAdapter({ ttl: 1000 });

      vi.setSystemTime(5000);

      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapterWithTTL.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns expired data (savedAt: 1000, now: 5000, ttl: 1000)
      Object.defineProperty(getRequest, "result", {
        value: { events: [{ name: "old" }], savedAt: 1000 },
      });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      // Should only save new events, discarding expired ones
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: mockEvents, savedAt: 5000 },
        "queue",
      );
    });

    it("should apply FIFO eviction on expired data when limit exceeded", async () => {
      const adapterWithTTL = new IndexedDBAdapter({
        ttl: 1000,
        persistedQueueLimit: 2,
      });

      vi.setSystemTime(5000);

      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const newEvents = [
        { name: "event1" },
        { name: "event2" },
        { name: "event3" },
      ] as RippleEvent[];

      const savePromise = adapterWithTTL.save(newEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns expired data
      Object.defineProperty(getRequest, "result", {
        value: { events: [{ name: "old" }], savedAt: 1000 },
      });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      // Should only keep last 2 events
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: [{ name: "event2" }, { name: "event3" }], savedAt: 5000 },
        "queue",
      );
    });

    it("should create object store on upgrade", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;
      const upgradeDB = {
        ...mockDB,
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        } as unknown as DOMStringList,
      } as IDBDatabase;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: upgradeDB });
      const upgradeEvent = new Event("upgradeneeded");

      Object.defineProperty(upgradeEvent, "target", {
        value: openRequest,
        writable: false,
      });
      openRequest.onupgradeneeded?.(upgradeEvent as IDBVersionChangeEvent);

      expect(upgradeDB.createObjectStore).toHaveBeenCalledWith("events");

      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns no data
      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Put succeeds
      putRequest.onsuccess?.(new Event("success"));

      await savePromise;
    });

    it("should not create object store if it exists", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = adapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      const upgradeEvent = new Event("upgradeneeded");

      Object.defineProperty(upgradeEvent, "target", {
        value: openRequest,
        writable: false,
      });
      openRequest.onupgradeneeded?.(upgradeEvent as IDBVersionChangeEvent);

      expect(mockDB.createObjectStore).not.toHaveBeenCalled();

      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns no data
      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Put succeeds
      putRequest.onsuccess?.(new Event("success"));

      await savePromise;
    });
  });

  describe("load", () => {
    it("should load events from IndexedDB", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);

      const loadPromise = adapter.load();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "result", {
        value: { events: mockEvents, savedAt: Date.now() },
      });
      getRequest.onsuccess?.(new Event("success"));

      const result = await loadPromise;

      expect(result).toEqual(mockEvents);
      expect(mockDB.transaction).toHaveBeenCalledWith("events", "readonly");
      expect(mockObjectStore.get).toHaveBeenCalledWith("queue");
    });

    it("should return empty array when no data exists", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);

      const loadPromise = adapter.load();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      const result = await loadPromise;

      expect(result).toEqual([]);
    });

    it("should return empty array and clear when TTL expired", async () => {
      const ttlAdapter = new IndexedDBAdapter({ ttl: 1000 });

      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest;
      const deleteRequest = {} as IDBRequest<undefined>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.delete).mockReturnValue(deleteRequest);
      vi.setSystemTime(2000);

      const loadPromise = ttlAdapter.load();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "result", {
        value: { events: mockEvents, savedAt: 0 },
      });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Handle the clear() call
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      deleteRequest.onsuccess?.(new Event("success"));

      const result = await loadPromise;

      expect(result).toEqual([]);
    });

    it("should return events when TTL not expired", async () => {
      const ttlAdapter = new IndexedDBAdapter({ ttl: 5000 });

      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.setSystemTime(2000);

      const loadPromise = ttlAdapter.load();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "result", {
        value: { events: mockEvents, savedAt: 1000 },
      });
      getRequest.onsuccess?.(new Event("success"));

      const result = await loadPromise;

      expect(result).toEqual(mockEvents);
    });

    it("should handle database open error", async () => {
      const openRequest = {} as IDBOpenDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);

      const loadPromise = adapter.load();

      Object.defineProperty(openRequest, "error", {
        value: { message: "Database error" } as DOMException,
      });
      openRequest.onerror?.(new Event("error"));

      await expect(loadPromise).rejects.toThrow("Database error");
    });

    it("should handle load error", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);

      const loadPromise = adapter.load();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "error", {
        value: { message: "Load error" } as DOMException,
      });
      getRequest.onerror?.(new Event("error"));

      await expect(loadPromise).rejects.toThrow("Load error");
    });

    it("should handle load error without message", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);

      const loadPromise = adapter.load();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(getRequest, "error", { value: null });
      getRequest.onerror?.(new Event("error"));

      await expect(loadPromise).rejects.toThrow("Failed to read data");
    });
  });

  describe("clear", () => {
    it("should clear events from IndexedDB", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const deleteRequest = {} as IDBRequest<undefined>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.delete).mockReturnValue(deleteRequest);

      const clearPromise = adapter.clear();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      deleteRequest.onsuccess?.(new Event("success"));

      await clearPromise;

      expect(mockDB.transaction).toHaveBeenCalledWith("events", "readwrite");
      expect(mockObjectStore.delete).toHaveBeenCalledWith("queue");
    });

    it("should handle database open error", async () => {
      const openRequest = {} as IDBOpenDBRequest;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);

      const clearPromise = adapter.clear();

      Object.defineProperty(openRequest, "error", {
        value: { message: "Database error" } as DOMException,
      });
      openRequest.onerror?.(new Event("error"));

      await expect(clearPromise).rejects.toThrow("Database error");
    });

    it("should handle clear error", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const deleteRequest = {} as IDBRequest<undefined>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.delete).mockReturnValue(deleteRequest);

      const clearPromise = adapter.clear();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(deleteRequest, "error", {
        value: { message: "Clear error" } as DOMException,
      });
      deleteRequest.onerror?.(new Event("error"));

      await expect(clearPromise).rejects.toThrow("Clear error");
    });

    it("should handle clear error without message", async () => {
      const openRequest = {} as IDBOpenDBRequest;
      const deleteRequest = {} as IDBRequest<undefined>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.delete).mockReturnValue(deleteRequest);

      const clearPromise = adapter.clear();

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      Object.defineProperty(deleteRequest, "error", { value: null });
      deleteRequest.onerror?.(new Event("error"));

      await expect(clearPromise).rejects.toThrow("Failed to clear data");
    });
  });

  describe("custom parameters", () => {
    it("should use custom database name, store name, and key", async () => {
      vi.setSystemTime(1000);
      const customAdapter = new IndexedDBAdapter({
        dbName: "custom_db",
        storeName: "custom_store",
        key: "custom_key",
      });

      const openRequest = {} as IDBOpenDBRequest;
      const getRequest = {} as IDBRequest<unknown>;
      const putRequest = {} as IDBRequest<IDBValidKey>;

      vi.mocked(indexedDB.open).mockReturnValue(openRequest);
      vi.mocked(mockObjectStore.get).mockReturnValue(getRequest);
      vi.mocked(mockObjectStore.put).mockReturnValue(putRequest);

      const savePromise = customAdapter.save(mockEvents);

      Object.defineProperty(openRequest, "result", { value: mockDB });
      openRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Get returns no data
      Object.defineProperty(getRequest, "result", { value: undefined });
      getRequest.onsuccess?.(new Event("success"));

      await Promise.resolve();

      // Put succeeds
      putRequest.onsuccess?.(new Event("success"));

      await savePromise;

      expect(indexedDB.open).toHaveBeenCalledWith("custom_db", 1);
      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        { events: mockEvents, savedAt: 1000 },
        "custom_key",
      );
    });
  });
});
