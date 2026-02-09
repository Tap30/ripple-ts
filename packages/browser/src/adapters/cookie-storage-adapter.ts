import {
  type Event,
  type StorageAdapter,
  StorageQuotaExceededError,
} from "@internals/core";

export type CookieStorageAdapterConfig = {
  key?: string;
  maxAge?: number;
};

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
   * @param config Configuration object
   */
  constructor(config: CookieStorageAdapterConfig = {}) {
    this._key = config.key ?? "ripple_events";
    this._maxAge = config.maxAge ?? 604800;
  }

  /**
   * Check if cookies are available.
   *
   * @returns Promise resolving to true if cookies are available
   */
  public static async isAvailable(): Promise<boolean> {
    try {
      const testKey = "__ripple_test__";

      document.cookie = `${testKey}=test; max-age=1`;

      const available = document.cookie.includes(testKey);

      document.cookie = `${testKey}=; max-age=0`;

      return await Promise.resolve(available);
    } catch {
      return await Promise.resolve(false);
    }
  }

  /**
   * Save events to a cookie.
   *
   * @param events Array of events to save
   * @throws {StorageQuotaExceededError} When size limit exceeded and events are dropped
   */
  public save(events: Event[]): Promise<void> {
    try {
      const value = encodeURIComponent(JSON.stringify(events));

      document.cookie = `${this._key}=${value}; max-age=${this._maxAge}; path=/; SameSite=Strict`;

      return Promise.resolve();
    } catch (error) {
      // Cookie size limit (~4KB) - drop oldest half and retry
      if (events.length > 1) {
        try {
          const reduced = events.slice(-Math.floor(events.length / 2));
          const value = encodeURIComponent(JSON.stringify(reduced));

          document.cookie = `${this._key}=${value}; max-age=${this._maxAge}; path=/; SameSite=Strict`;

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
