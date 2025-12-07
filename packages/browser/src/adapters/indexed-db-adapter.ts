import type { Event, StorageAdapter } from "@repo/core";

/**
 * Storage adapter implementation using IndexedDB.
 * Provides large-capacity persistent storage with better performance for large datasets.
 */
export class IndexedDBAdapter implements StorageAdapter {
  private readonly _dbName: string;
  private readonly _storeName: string;
  private readonly _key: string;

  /**
   * Create a new IndexedDBAdapter instance.
   *
   * @param dbName The IndexedDB database name (default: "ripple_db")
   * @param storeName The object store name (default: "events")
   * @param key The key to store events under (default: "queue")
   */
  constructor(
    dbName: string = "ripple_db",
    storeName: string = "events",
    key: string = "queue",
  ) {
    this._dbName = dbName;
    this._storeName = storeName;
    this._key = key;
  }

  /**
   * Open or create the IndexedDB database.
   *
   * @returns Promise resolving to the database instance
   */
  private _openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName, 1);

      request.onerror = () =>
        reject(new Error(request.error?.message ?? "Failed to open database"));
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this._storeName)) {
          db.createObjectStore(this._storeName);
        }
      };
    });
  }

  /**
   * Save events to IndexedDB.
   *
   * @param events Array of events to save
   */
  public async save(events: Event[]): Promise<void> {
    const db = await this._openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this._storeName, "readwrite");
      const store = transaction.objectStore(this._storeName);
      const request = store.put(events, this._key);

      request.onerror = () =>
        reject(new Error(request.error?.message ?? "Failed to save events"));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Load events from IndexedDB.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<Event[]> {
    const db = await this._openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this._storeName, "readonly");
      const store = transaction.objectStore(this._storeName);
      const request = store.get(this._key);

      request.onerror = () =>
        reject(new Error(request.error?.message ?? "Failed to load events"));
      request.onsuccess = () => {
        const result = request.result as Event[] | undefined;

        resolve(result ?? []);
      };
    });
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
        reject(new Error(request.error?.message ?? "Failed to clear events"));
      request.onsuccess = () => resolve();
    });
  }
}
