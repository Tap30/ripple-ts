import type { Event, StorageAdapter } from "@repo/core";

/**
 * Storage adapter implementation using cookies.
 * Note: Limited storage capacity (~4KB). Use for small event queues only.
 */
export class CookieStorageAdapter implements StorageAdapter {
  private readonly _key: string;
  private readonly _maxAge: number;

  /**
   * Create a new CookieStorageAdapter instance.
   *
   * @param key The cookie name (default: "ripple_events")
   * @param maxAge Cookie max age in seconds (default: 7 days)
   */
  constructor(key: string = "ripple_events", maxAge: number = 604800) {
    this._key = key;
    this._maxAge = maxAge;
  }

  /**
   * Save events to a cookie.
   *
   * @param events Array of events to save
   */
  public async save(events: Event[]): Promise<void> {
    await Promise.resolve();
    const value = encodeURIComponent(JSON.stringify(events));

    document.cookie = `${this._key}=${value}; max-age=${this._maxAge}; path=/; SameSite=Strict`;
  }

  /**
   * Load events from a cookie.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<Event[]> {
    await Promise.resolve();

    const cookies = document.cookie.split("; ");
    const cookie = cookies.find(c => c.startsWith(`${this._key}=`));

    if (!cookie) return [];

    const value = cookie.split("=")[1];

    if (!value) return [];

    try {
      return JSON.parse(decodeURIComponent(value)) as Event[];
    } catch {
      return await Promise.resolve([]);
    }
  }

  /**
   * Clear events from the cookie.
   */
  public async clear(): Promise<void> {
    await Promise.resolve();

    document.cookie = `${this._key}=; max-age=0; path=/`;
  }
}
