import type { Event as RippleEvent, StorageAdapter } from "@internals/core";

type StorageData = {
  events: RippleEvent[];
  savedAt: number;
};

export type SessionStorageAdapterConfig = {
  key?: string;
  ttl?: number;
  persistedQueueLimit?: number;
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
   * @param config Configuration object
   */
  constructor(config: SessionStorageAdapterConfig = {}) {
    this._key = config.key ?? "ripple_events";
    this._ttl = config.ttl ?? null;
    this._persistedQueueLimit = config.persistedQueueLimit ?? null;
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
