import {
  type Event as RippleEvent,
  type StorageAdapter,
  StorageQuotaExceededError,
} from "@internals/core";

type StorageData = {
  events: RippleEvent[];
  savedAt: number;
};

export type IndexedDBAdapterConfig = {
  dbName?: string;
  storeName?: string;
  key?: string;
  ttl?: number;
};

/**
 * Storage adapter implementation using IndexedDB.
 * Provides large-capacity persistent storage with better performance for large datasets.
 */
export class IndexedDBAdapter implements StorageAdapter {
  private readonly _dbName: string;
  private readonly _storeName: string;
  private readonly _key: string;
  private readonly _ttl: number | null;

  public static readonly SCHEMA_VERSION = 2;

  private _dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Create a new IndexedDBAdapter instance.
   *
   * @param config Configuration object
   */
  constructor(config: IndexedDBAdapterConfig = {}) {
    this._dbName = config.dbName ?? "ripple_db";
    this._storeName = config.storeName ?? "events";
    this._key = config.key ?? "queue";
    this._ttl = config.ttl ?? null;
  }

  /**
   * Check if IndexedDB is available.
   *
   * @returns Promise resolving to true if IndexedDB is available
   */
  public static async isAvailable(): Promise<boolean> {
    try {
      if (!("indexedDB" in globalThis)) {
        return await Promise.resolve(false);
      }

      const testDb = "__ripple_test__";
      const request = indexedDB.open(testDb);

      return new Promise(resolve => {
        request.onsuccess = () => {
          request.result.close();

          try {
            indexedDB.deleteDatabase(testDb);
          } catch {
            // Ignore cleanup errors
          }

          resolve(true);
        };

        request.onerror = () => resolve(false);
        request.onblocked = () => resolve(false);
      });
    } catch {
      return await Promise.resolve(false);
    }
  }

  /**
   * Open, create, or reuse the IndexedDB connection.
   *
   * @returns Promise resolving to the database instance
   */
  private _openDB(): Promise<IDBDatabase> {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(
          this._dbName,
          IndexedDBAdapter.SCHEMA_VERSION,
        );

        request.onblocked = () => {
          // Handle tabs with older versions of the DB
        };

        request.onerror = () => {
          // Reset so we can retry later
          this._dbPromise = null;

          reject(
            new Error(request.error?.message ?? "Failed to open IndexedDB"),
          );
        };

        request.onsuccess = () => {
          const db = request.result;

          // Reset promise on unexpected close so next operation reopens
          db.onclose = () => {
            this._dbPromise = null;
          };

          // Reset promise on version change from another tab
          db.onversionchange = () => {
            db.close();
            this._dbPromise = null;
          };

          resolve(db);
        };

        request.onupgradeneeded = event => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(this._storeName)) {
            db.createObjectStore(this._storeName);
          }
        };
      });
    }

    return this._dbPromise;
  }

  private _read(db: IDBDatabase): Promise<StorageData | null> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this._storeName, "readonly");
      const store = transaction.objectStore(this._storeName);
      const request = store.get(this._key);

      request.onerror = () =>
        reject(new Error(request.error?.message ?? "Failed to read data"));
      request.onsuccess = () => {
        const data = request.result as StorageData | undefined;

        if (!data) {
          resolve(null);

          return;
        }

        if (this._ttl !== null && Date.now() - data.savedAt > this._ttl) {
          void this.clear().then(() => resolve(null));

          return;
        }

        resolve(data);
      };
    });
  }

  private _atomicReadWrite(
    db: IDBDatabase,
    transform: (data: StorageData | null) => StorageData,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this._storeName, "readwrite");
      const store = transaction.objectStore(this._storeName);
      const getRequest = store.get(this._key);

      getRequest.onerror = () =>
        reject(new Error(getRequest.error?.message ?? "Failed to read data"));

      getRequest.onsuccess = () => {
        const data = getRequest.result as StorageData | undefined;
        const newData = transform(data ?? null);
        const putRequest = store.put(newData, this._key);

        putRequest.onerror = () =>
          reject(putRequest.error ?? new Error("Failed to write data"));
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  /**
   * Save events to IndexedDB.
   *
   * @param events Array of events to save
   * @throws {StorageQuotaExceededError} When quota exceeded and events are dropped
   */
  public async save(events: RippleEvent[]): Promise<void> {
    const db = await this._openDB();

    try {
      await this._atomicReadWrite(db, () => {
        return {
          events,
          savedAt: Date.now(),
        };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "QuotaExceededError" &&
        events.length > 1
      ) {
        // Drop oldest half and retry
        const reduced = events.slice(-Math.floor(events.length / 2));

        await this._atomicReadWrite(db, () => {
          return {
            events: reduced,
            savedAt: Date.now(),
          };
        });

        throw new StorageQuotaExceededError(
          reduced.length,
          events.length - reduced.length,
        );
      }

      throw error;
    }
  }

  /**
   * Load events from IndexedDB.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<RippleEvent[]> {
    const db = await this._openDB();
    const data = await this._read(db);

    if (!data) return [];

    return data.events;
  }

  /**
   * Clear events from IndexedDB.
   */
  public async clear(): Promise<void> {
    const db = await this._openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this._storeName, "readwrite");
      const store = transaction.objectStore(this._storeName);
      const request = store.delete(this._key);

      request.onerror = () =>
        reject(new Error(request.error?.message ?? "Failed to clear data"));
      request.onsuccess = () => resolve();
    });
  }
}
