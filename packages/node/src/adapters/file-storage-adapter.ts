import type { Event, StorageAdapter } from "@repo/core";
import { readFile, unlink, writeFile } from "node:fs/promises";

/**
 * Storage adapter implementation using the file system.
 * Provides persistent storage for Node.js environments.
 */
export class FileStorageAdapter implements StorageAdapter {
  private readonly _path: string;

  /**
   * Create a new FileStorageAdapter instance.
   *
   * @param path The file path to use (default: ".ripple_events.json")
   */
  constructor(path: string = ".ripple_events.json") {
    this._path = path;
  }

  /**
   * Save events to a file.
   *
   * @param events Array of events to save
   */
  public async save(events: Event[]): Promise<void> {
    await writeFile(this._path, JSON.stringify(events), "utf-8");
  }

  /**
   * Load events from a file.
   *
   * @returns Promise resolving to array of events
   */
  public async load(): Promise<Event[]> {
    try {
      const data = await readFile(this._path, "utf-8");

      return JSON.parse(data) as Event[];
    } catch {
      await Promise.resolve();
      return [];
    }
  }

  /**
   * Clear events by deleting the file.
   */
  public async clear(): Promise<void> {
    try {
      await unlink(this._path);
    } catch {
      await Promise.resolve();
    }
  }
}
