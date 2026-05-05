import {
  type Event as RippleEvent,
  type StorageAdapter,
  StorageQuotaExceededError,
} from "@internals/core";

type StorageData = {
  events: RippleEvent[];
  savedAt: number;
};

/**
 * Configuration options for the IndexedDBAdapter.
 */
export type IndexedDBAdapterConfig = {
  /**
   * The name of the IndexedDB database (default: "ripple_db").
   */
  dbName?: string;
  /**
   * The name of the object store (default: "events").
   */
  storeName?: string;
  /**
   * The key under which to store the events (default: "queue").
   */
  key?: string;
  /**
   * Time-to-live in milliseconds.
   *
   * Design Intention: The TTL acts as a "session" timeout for the entire batch.
   * Because the `savedAt` timestamp is overwritten on every `save()` operation,
   * frequent saves will continually reset the expiration timer for all stored
   * events. Events will only expire if no saves occur for the duration of the TTL.
   */
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
            // Use `catch (_) {}` instead of `catch {}` for ES2017 compatibility.
            // Older iOS Safari versions don't support optional catch binding.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_) {
            // Ignore cleanup errors
          }

          resolve(true);
        };

        request.onerror = () => resolve(false);
        request.onblocked = () => resolve(false);
      });
      // Use `catch (_) {}` instead of `catch {}` for ES2017 compatibility.
      // Older iOS Safari versions don't support optional catch binding.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
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
          this._dbPromise = null;

          reject(new Error("IndexedDB upgrade blocked by another tab"));
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

          // Reset promise on unexpected abort so next operation reopens
          db.onabort = () => {
            this._dbPromise = null;
          };

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
          this.clear()
            .catch(err =>
              // eslint-disable-next-line no-console
              console.error("Failed to clear expired TTL data:", err),
            )
            .finally(() => resolve(null));

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

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(transaction.error || new Error("Transaction failed"));

      transaction.onabort = () =>
        reject(transaction.error || new Error("Transaction aborted"));

      const getRequest = store.get(this._key);

      getRequest.onerror = () =>
        reject(new Error(getRequest.error?.message ?? "Failed to read data"));

      getRequest.onsuccess = () => {
        const data = getRequest.result as StorageData | undefined;
        const newData = transform(data ?? null);
        const putRequest = store.put(newData, this._key);

        putRequest.onerror = () =>
          reject(putRequest.error ?? new Error("Failed to write data"));
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
      if (error instanceof StorageQuotaExceededError && events.length > 1) {
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

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this._storeName, "readwrite");
      const store = transaction.objectStore(this._storeName);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(transaction.error || new Error("Transaction failed"));

      transaction.onabort = () =>
        reject(transaction.error || new Error("Transaction aborted"));

      const request = store.delete(this._key);

      request.onerror = () =>
        reject(new Error(request.error?.message ?? "Failed to clear data"));
    });
  }

  /**
   * Close the database connection and release resources.
   */
  public async close(): Promise<void> {
    if (this._dbPromise) {
      const db = await this._dbPromise;

      db.close();
      this._dbPromise = null;
    }
  }
}
