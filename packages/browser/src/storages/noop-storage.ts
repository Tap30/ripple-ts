import type { Event as RippleEvent, StorageAdapter } from "@internals/core";

/**
 * No-operation storage adapter that discards all events.
 * Use when event persistence is not needed or not supported.
 */
export class NoOpStorage implements StorageAdapter {
  public async init(): Promise<void> {}
  public async save(_events: RippleEvent[]): Promise<void> {}
  public async clear(): Promise<void> {}
  public async close(): Promise<void> {}

  public async load(): Promise<RippleEvent[]> {
    return Promise.resolve([]);
  }
}
