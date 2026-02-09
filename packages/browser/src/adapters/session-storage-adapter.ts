import {
  type Event as RippleEvent,
  type StorageAdapter,
  StorageQuotaExceededError,
} from "@internals/core";

type StorageData = {
  events: RippleEvent[];
  savedAt: number;
};

export type SessionStorageAdapterConfig = {
  key?: string;
  ttl?: number;
};

/**
 * Storage adapter implementation using sessionStorage.
 * Data persists only for the duration of the page session with optional TTL.
 */
export class SessionStorageAdapter implements StorageAdapter {
  private readonly _key: string;
  private readonly _ttl: number | null;

  /**
   * Create a new SessionStorageAdapter instance.
   *
   * @param config Configuration object
   */
  constructor(config: SessionStorageAdapterConfig = {}) {
    this._key = config.key ?? "ripple_events";
    this._ttl = config.ttl ?? null;
  }

  /**
   * Check if sessionStorage is available.
   *
   * @returns Promise resolving to true if sessionStorage is available
   */
  public static async isAvailable(): Promise<boolean> {
    try {
      const testKey = "__ripple_test__";

      sessionStorage.setItem(testKey, "test");
      sessionStorage.removeItem(testKey);

      return await Promise.resolve(true);
    } catch {
      return await Promise.resolve(false);
    }
  }

  /**
   * Save events to sessionStorage.
   *
   * @param events Array of events to save
   * @throws {StorageQuotaExceededError} When quota exceeded and events are dropped
   */
  public save(events: RippleEvent[]): Promise<void> {
    try {
      const data: StorageData = {
        events,
        savedAt: Date.now(),
      };

      sessionStorage.setItem(this._key, JSON.stringify(data));

      return Promise.resolve();
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "QuotaExceededError" &&
        events.length > 1
      ) {
        try {
          // Drop oldest half and retry
          const reduced = events.slice(-Math.floor(events.length / 2));
          const reducedData: StorageData = {
            events: reduced,
            savedAt: Date.now(),
          };

          sessionStorage.setItem(this._key, JSON.stringify(reducedData));

          return Promise.reject(
            new StorageQuotaExceededError(
              reduced.length,
              events.length - reduced.length,
            ),
          );
        } catch (retryError) {
          return Promise.reject(
            retryError instanceof Error
              ? retryError
              : new Error(String(retryError)),
          );
        }
      }

      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
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
