import type { Event as RippleEvent, StorageAdapter } from "@internals/core";

type StorageData = {
  events: RippleEvent[];
  savedAt: number;
};

export type IndexedDBAdapterConfig = {
  dbName?: string;
  storeName?: string;
  key?: string;
  ttl?: number;
  persistedQueueLimit?: number;
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
  private readonly _persistedQueueLimit: number | null;

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
    this._persistedQueueLimit = config.persistedQueueLimit ?? null;
  }

  /**
   * Open, create, or reuse the IndexedDB connection.
   *
   * @returns Promise resolving to the database instance
   */
  private _openDB(): Promise<IDBDatabase> {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this._dbName, 1);

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

  private _write(db: IDBDatabase, data: StorageData): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this._storeName, "readwrite");
      const store = transaction.objectStore(this._storeName);
      const request = store.put(data, this._key);

      request.onerror = () =>
        reject(new Error(request.error?.message ?? "Failed to write data"));
      request.onsuccess = () => resolve();
    });
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

  /**
   * Save events to IndexedDB.
   *
   * @param events Array of events to save
   */
  public async save(events: RippleEvent[]): Promise<void> {
    const db = await this._openDB();
    const data = await this._read(db);

    const persistedEvents: RippleEvent[] = data?.events ?? [];

    let eventsToSave: RippleEvent[] = [...persistedEvents, ...events];

    if (
      this._persistedQueueLimit !== null &&
      eventsToSave.length > this._persistedQueueLimit
    ) {
      eventsToSave = eventsToSave.slice(-this._persistedQueueLimit);
    }

    await this._write(db, {
      events: eventsToSave,
      savedAt: Date.now(),
    } satisfies StorageData);
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
