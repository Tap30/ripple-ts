import type { Event as RippleEvent, StorageAdapter } from "@internals/core";

type StorageData = {
  events: RippleEvent[];
  savedAt: number;
};

/**
 * Storage adapter implementation using sessionStorage.
 * Data persists only for the duration of the page session with optional TTL.
 */
export class SessionStorageAdapter implements StorageAdapter {
  private readonly _key: string;
  private readonly _ttl: number | null;
  private readonly _persistedQueueLimit: number | null;

  /**
   * Create a new SessionStorageAdapter instance.
   *
   * @param key The sessionStorage key to use (default: "ripple_events")
   * @param ttl Time-to-live in milliseconds (default: null, no expiration)
   * @param persistedQueueLimit Maximum number of events to keep in storage (default: null, no limit).
   * Uses FIFO eviction when limit is reached.
   */
  constructor(
    key: string = "ripple_events",
    ttl: number | null = null,
    persistedQueueLimit: number | null = null,
  ) {
    this._key = key;
    this._ttl = ttl;
    this._persistedQueueLimit = persistedQueueLimit;
  }

  /**
   * Save events to sessionStorage.
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

    sessionStorage.setItem(this._key, JSON.stringify(data));
  }

  /**
   * Load events from sessionStorage.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<RippleEvent[]> {
    await Promise.resolve();

    const raw = sessionStorage.getItem(this._key);

    if (!raw) return [];

    const data = JSON.parse(raw) as StorageData;

    if (this._ttl !== null && Date.now() - data.savedAt > this._ttl) {
      await this.clear();

      return [];
    }

    return data.events;
  }

  /**
   * Clear events from sessionStorage.
   */
  public async clear(): Promise<void> {
    await Promise.resolve();

    sessionStorage.removeItem(this._key);
  }
}
