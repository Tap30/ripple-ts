import type { Event } from "../types.ts";

/**
 * Abstract interface for event persistence.
 * Implement this interface to use custom storage backends (file system, database, etc.).
 */
export interface StorageAdapter {
  /**
   * Persist events to storage.
   *
   * @param events Array of events to save
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
