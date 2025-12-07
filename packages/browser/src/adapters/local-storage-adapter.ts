import type { Event, StorageAdapter } from "@internals/core";

/**
 * Storage adapter implementation using localStorage.
 * Provides persistent storage across browser sessions.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly _key: string;

  /**
   * Create a new LocalStorageAdapter instance.
   *
   * @param key The localStorage key to use (default: "ripple_events")
   */
  constructor(key: string = "ripple_events") {
    this._key = key;
  }

  /**
   * Save events to localStorage.
   *
   * @param events Array of events to save
   */
  public async save(events: Event[]): Promise<void> {
    await Promise.resolve();
    localStorage.setItem(this._key, JSON.stringify(events));
  }

  /**
   * Load events from localStorage.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<Event[]> {
    await Promise.resolve();
    const data = localStorage.getItem(this._key);

    return data ? (JSON.parse(data) as Event[]) : [];
  }

  /**
   * Clear events from localStorage.
   */
  public async clear(): Promise<void> {
    await Promise.resolve();
    localStorage.removeItem(this._key);
  }
}
