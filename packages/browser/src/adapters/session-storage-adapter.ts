import type { Event, StorageAdapter } from "@repo/core";

/**
 * Storage adapter implementation using sessionStorage.
 * Data persists only for the duration of the page session.
 */
export class SessionStorageAdapter implements StorageAdapter {
  private readonly _key: string;

  /**
   * Create a new SessionStorageAdapter instance.
   *
   * @param key The sessionStorage key to use (default: "ripple_events")
   */
  constructor(key: string = "ripple_events") {
    this._key = key;
  }

  /**
   * Save events to sessionStorage.
   *
   * @param events Array of events to save
   */
  public async save(events: Event[]): Promise<void> {
    await Promise.resolve();

    sessionStorage.setItem(this._key, JSON.stringify(events));
  }

  /**
   * Load events from sessionStorage.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<Event[]> {
    await Promise.resolve();

    const data = sessionStorage.getItem(this._key);

    return data ? (JSON.parse(data) as Event[]) : [];
  }

  /**
   * Clear events from sessionStorage.
   */
  public async clear(): Promise<void> {
    await Promise.resolve();

    sessionStorage.removeItem(this._key);
  }
}
