import type { Event } from "../types.ts";

/**
 * Error thrown when storage quota is exceeded and events are dropped.
 */
export class StorageQuotaExceededError extends Error {
  public readonly saved: number;
  public readonly dropped: number;

  constructor(saved: number, dropped: number) {
    super(
      `Storage quota exceeded: dropped ${dropped} oldest events, saved ${saved}`,
    );

    this.name = "StorageQuotaExceededError";
    this.saved = saved;
    this.dropped = dropped;
  }
}

/**
 * Abstract interface for event persistence.
 * Implement this interface to use custom storage backends (file system, database, etc.).
 */
export interface StorageAdapter {
  /**
   * Persist events to storage.
   *
   * @param events Array of events to save
   * @throws {StorageQuotaExceededError} When quota exceeded and events are dropped
   */
  save(events: Event[]): Promise<void>;

  /**
   * Load persisted events from storage.
   *
   * @returns Promise resolving to array of events
   */
  load(): Promise<Event[]>;

  /**
   * Clear all persisted events from storage.
   */
  clear(): Promise<void>;
}
