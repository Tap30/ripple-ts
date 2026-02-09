import type { Event as RippleEvent, StorageAdapter } from "@internals/core";

type StorageData = {
  events: RippleEvent[];
  savedAt: number;
};

export type LocalStorageAdapterConfig = {
  key?: string;
  ttl?: number;
  persistedQueueLimit?: number;
};

/**
 * Storage adapter implementation using localStorage.
 * Provides persistent storage across browser sessions with optional TTL.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly _key: string;
  private readonly _ttl: number | null;
  private readonly _persistedQueueLimit: number | null;

  /**
   * Create a new LocalStorageAdapter instance.
   *
   * @param config Configuration object
   */
  constructor(config: LocalStorageAdapterConfig = {}) {
    this._key = config.key ?? "ripple_events";
    this._ttl = config.ttl ?? null;
    this._persistedQueueLimit = config.persistedQueueLimit ?? null;
  }

  /**
   * Check if localStorage is available.
   *
   * @returns Promise resolving to true if localStorage is available
   */
  public static async isAvailable(): Promise<boolean> {
    try {
      const testKey = "__ripple_test__";

      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);

      return await Promise.resolve(true);
    } catch {
      return await Promise.resolve(false);
    }
  }

  /**
   * Save events to localStorage.
   *
   * @param events Array of events to save
   */
  public async save(events: RippleEvent[]): Promise<void> {
    const persistedEvents = await this.load();

    let eventsToSave: RippleEvent[] = [...persistedEvents, ...events];

    if (
      this._persistedQueueLimit !== null &&
      eventsToSave.length > this._persistedQueueLimit
    ) {
      eventsToSave = eventsToSave.slice(-this._persistedQueueLimit);
    }

    const data: StorageData = {
      events: eventsToSave,
      savedAt: Date.now(),
    };

    localStorage.setItem(this._key, JSON.stringify(data));
  }

  /**
   * Load events from localStorage.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<RippleEvent[]> {
    await Promise.resolve();

    const raw = localStorage.getItem(this._key);

    if (!raw) return [];

    const data = JSON.parse(raw) as StorageData;

    if (this._ttl !== null && Date.now() - data.savedAt > this._ttl) {
      await this.clear();

      return [];
    }

    return data.events;
  }

  /**
   * Clear events from localStorage.
   */
  public async clear(): Promise<void> {
    await Promise.resolve();

    localStorage.removeItem(this._key);
  }
}
