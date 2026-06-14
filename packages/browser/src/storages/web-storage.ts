import type { Event as RippleEvent, StorageAdapter } from "@internals/core";
import { IndexedDBStorage } from "./indexed-db-storage.ts";
import { LocalStorage } from "./local-storage.ts";
import { NoOpStorage } from "./noop-storage.ts";

/**
 * Configuration options for WebStorage.
 */
export type WebStorageConfig = {
  /**
   * Preferred storage backend (default: auto-detect best available).
   */
  prefer?: "indexed-db" | "local-storage";
  /**
   * The name of the IndexedDB database (default: "ripple_db").
   */
  dbName?: string;
  /**
   * The name of the IndexedDB object store (default: "events").
   */
  storeName?: string;
  /**
   * The key for storage (default: "ripple_events" for localStorage, "queue" for IndexedDB).
   */
  key?: string;
  /**
   * Time-to-live in milliseconds for stored events.
   */
  ttl?: number;
};

/**
 * Isomorphic browser storage adapter that auto-selects the best available
 * storage backend (IndexedDB → localStorage → NoOp).
 *
 * Call `init()` to detect availability and initialize the underlying adapter.
 */
export class WebStorage implements StorageAdapter {
  readonly #config: WebStorageConfig;
  #adapter: StorageAdapter | null = null;

  constructor(config: WebStorageConfig = {}) {
    this.#config = config;
  }

  /**
   * Detect the best available storage and initialize it.
   *
   * @returns The initialized WebStorage instance
   */
  public async init(): Promise<void> {
    this.#adapter = await this.#resolve();
  }

  async #resolve(): Promise<StorageAdapter> {
    const { prefer } = this.#config;

    if (prefer === "local-storage") {
      if (await LocalStorage.isAvailable()) {
        return new LocalStorage({
          key: this.#config.key,
          ttl: this.#config.ttl,
        });
      }
    }

    if (prefer === "indexed-db" || !prefer) {
      if (await IndexedDBStorage.isAvailable()) {
        return new IndexedDBStorage({
          dbName: this.#config.dbName,
          storeName: this.#config.storeName,
          key: this.#config.key,
          ttl: this.#config.ttl,
        });
      }
    }

    if (!prefer && (await LocalStorage.isAvailable())) {
      return new LocalStorage({
        key: this.#config.key,
        ttl: this.#config.ttl,
      });
    }

    return new NoOpStorage();
  }

  #getAdapter(): StorageAdapter {
    if (!this.#adapter) {
      throw new Error(
        "WebStorage not initialized. Call `init()` before using.",
      );
    }

    return this.#adapter;
  }

  public async save(events: RippleEvent[]): Promise<void> {
    return this.#getAdapter().save(events);
  }

  public async load(): Promise<RippleEvent[]> {
    return this.#getAdapter().load();
  }

  public async clear(): Promise<void> {
    return this.#getAdapter().clear();
  }

  public async close(): Promise<void> {
    return this.#getAdapter().close();
  }
}
