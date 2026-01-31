import type { Event as RippleEvent } from "@internals/core";
import { describe, expect, it } from "vitest";
import { NoOpStorageAdapter } from "./noop-storage-adapter.ts";

describe("NoOpStorageAdapter", () => {
  it("should save without error", async () => {
    const adapter = new NoOpStorageAdapter();

    await expect(
      adapter.save([
        {
          name: "test",
          payload: {},
          issuedAt: 0,
          metadata: {},
          sessionId: "",
          platform: null,
        } satisfies RippleEvent,
      ]),
    ).resolves.toBeUndefined();
  });

  it("should load empty array", async () => {
    const adapter = new NoOpStorageAdapter();

    expect(await adapter.load()).toEqual([]);
  });

  it("should clear without error", async () => {
    const adapter = new NoOpStorageAdapter();

    await expect(adapter.clear()).resolves.toBeUndefined();
  });
});
