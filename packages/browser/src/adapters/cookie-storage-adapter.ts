import type { Event, StorageAdapter } from "@internals/core";

export type CookieStorageAdapterConfig = {
  key?: string;
  maxAge?: number;
  persistedQueueLimit?: number;
};

/**
 * Storage adapter implementation using cookies.
 * Note: Limited storage capacity (~4KB). Use for small event queues only.
 */
export class CookieStorageAdapter implements StorageAdapter {
  private readonly _key: string;
  private readonly _maxAge: number;
  private readonly _persistedQueueLimit: number | null;

  /**
   * Create a new CookieStorageAdapter instance.
   *
   * @param config Configuration object
   */
  constructor(config: CookieStorageAdapterConfig = {}) {
    this._key = config.key ?? "ripple_events";
    this._maxAge = config.maxAge ?? 604800;
    this._persistedQueueLimit = config.persistedQueueLimit ?? null;
  }

  /**
   * Save events to a cookie.
   *
   * @param events Array of events to save
   */
  public async save(events: Event[]): Promise<void> {
    const persistedEvents = await this.load();

    let eventsToSave: Event[] = [...persistedEvents, ...events];

    if (
      this._persistedQueueLimit !== null &&
      eventsToSave.length > this._persistedQueueLimit
    ) {
      eventsToSave = eventsToSave.slice(-this._persistedQueueLimit);
    }

    const value = encodeURIComponent(JSON.stringify(eventsToSave));

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
