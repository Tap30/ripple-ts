import {
  type Event as RippleEvent,
  type StorageAdapter,
  StorageQuotaExceededError,
} from "@internals/core";

type StorageData = {
  events: RippleEvent[];
  savedAt: number;
};

export type LocalStorageAdapterConfig = {
  key?: string;
  ttl?: number;
};

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
   * @param config Configuration object
   */
  constructor(config: LocalStorageAdapterConfig = {}) {
    this._key = config.key ?? "ripple_events";
    this._ttl = config.ttl ?? null;
  }

  /**
   * Check if localStorage is available.
   *
   * @returns Promise resolving to true if localStorage is available
   */
  public static isAvailable(): Promise<boolean> {
    try {
      const testKey = "__ripple_test__";

      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);

      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  /**
   * Save events to localStorage.
   *
   * @param events Array of events to save
   * @throws {StorageQuotaExceededError} When quota exceeded and events are dropped
   */
  public async save(events: RippleEvent[]): Promise<void> {
    await Promise.resolve();

    try {
      const data: StorageData = {
        events,
        savedAt: Date.now(),
      };

      localStorage.setItem(this._key, JSON.stringify(data));
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

          localStorage.setItem(this._key, JSON.stringify(reducedData));

          throw new StorageQuotaExceededError(
            reduced.length,
            events.length - reduced.length,
          );
        } catch (retryError) {
          throw retryError instanceof Error
            ? retryError
            : new Error(String(retryError));
        }
      }

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Load events from localStorage.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<RippleEvent[]> {
    const stored = localStorage.getItem(this._key);

    if (!stored) return [];

    try {
      const data = JSON.parse(stored) as StorageData;

      if (this._ttl !== null && Date.now() - data.savedAt > this._ttl) {
        await this.clear();

        return [];
      }

      return data.events;
    } catch {
      return [];
    }
  }

  /**
   * Clear events from localStorage.
   */
  public clear(): Promise<void> {
    localStorage.removeItem(this._key);

    return Promise.resolve();
  }
}
