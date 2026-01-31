import type { Event as RippleEvent, StorageAdapter } from "@internals/core";

interface StorageData {
  events: RippleEvent[];
  savedAt: number;
}

/**
 * Storage adapter implementation using localStorage.
 * Provides persistent storage across browser sessions with optional TTL.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly _key: string;
  private readonly _ttl: number | null;

  /**
   * Create a new LocalStorageAdapter instance.
   *
   * @param key The localStorage key to use (default: "ripple_events")
   * @param ttl Time-to-live in milliseconds (default: null, no expiration)
   */
  constructor(key: string = "ripple_events", ttl: number | null = null) {
    this._key = key;
    this._ttl = ttl;
  }

  /**
   * Save events to localStorage.
   *
   * @param events Array of events to save
   */
  public async save(events: RippleEvent[]): Promise<void> {
    await Promise.resolve();

    const data: StorageData = { events, savedAt: Date.now() };

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
