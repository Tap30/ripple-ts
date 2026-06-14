import type { Event as RippleEvent } from "@internals/core";
import { describe, expect, it } from "vitest";
import { NoOpStorage } from "./noop-storage.ts";

describe("NoOpStorage", () => {
  it("should init without error", async () => {
    const adapter = new NoOpStorage();

    await expect(adapter.init()).resolves.toBeUndefined();
  });

  it("should save without error", async () => {
    const adapter = new NoOpStorage();

    await expect(
      adapter.save([
        {
          name: "test",
          payload: null,
          issuedAt: 0,
          metadata: null,
          anonymousId: "anon-user-123",
          eventId: "event-id",
          schemaVersion: null,
          sdk: {
            name: "",
            version: "",
          },
          userId: null,
          platform: null,
        } satisfies RippleEvent,
      ]),
    ).resolves.toBeUndefined();
  });

  it("should load empty array", async () => {
    const adapter = new NoOpStorage();

    expect(await adapter.load()).toEqual([]);
  });

  it("should clear without error", async () => {
    const adapter = new NoOpStorage();

    await expect(adapter.clear()).resolves.toBeUndefined();
  });

  it("should close without error", async () => {
    const adapter = new NoOpStorage();

    await expect(adapter.close()).resolves.toBeUndefined();
  });
});
