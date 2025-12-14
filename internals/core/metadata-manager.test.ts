import { beforeEach, describe, expect, it } from "vitest";
import { MetadataManager } from "./metadata-manager.ts";

type TestMetadata = {
  userId: string;
  sessionId: string;
  schemaVersion: string;
  eventType: string;
};

describe("MetadataManager", () => {
  let manager: MetadataManager<TestMetadata>;

  beforeEach(() => {
    manager = new MetadataManager<TestMetadata>();
  });

  describe("set", () => {
    it("should set metadata value", () => {
      manager.set("userId", "123");

      expect(manager.getAll()).toEqual({ userId: "123" });
    });

    it("should set multiple metadata values", () => {
      manager.set("userId", "123");
      manager.set("sessionId", "abc");

      expect(manager.getAll()).toEqual({
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should overwrite existing metadata value", () => {
      manager.set("userId", "123");
      manager.set("userId", "456");

      expect(manager.getAll()).toEqual({ userId: "456" });
    });
  });

  describe("getAll", () => {
    it("should return empty object when no metadata set", () => {
      expect(manager.getAll()).toEqual({});
    });

    it("should return all metadata", () => {
      manager.set("userId", "123");
      manager.set("sessionId", "abc");

      expect(manager.getAll()).toEqual({
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should return a copy of metadata", () => {
      manager.set("userId", "123");

      const metadata1 = manager.getAll();
      const metadata2 = manager.getAll();

      expect(metadata1).not.toBe(metadata2);
      expect(metadata1).toEqual(metadata2);
    });
  });

  describe("isEmpty", () => {
    it("should return true when no metadata set", () => {
      expect(manager.isEmpty()).toBe(true);
    });

    it("should return false when metadata is set", () => {
      manager.set("userId", "123");

      expect(manager.isEmpty()).toBe(false);
    });
  });

  describe("merge", () => {
    it("should return null when no shared or event metadata", () => {
      expect(manager.merge()).toBeNull();
    });

    it("should return shared metadata when no event metadata", () => {
      manager.set("userId", "123");
      manager.set("sessionId", "abc");

      expect(manager.merge()).toEqual({
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should return event metadata when no shared metadata", () => {
      const eventMetadata = { schemaVersion: "1.0", eventType: "test" };

      expect(manager.merge(eventMetadata)).toEqual(eventMetadata);
    });

    it("should merge shared and event metadata", () => {
      manager.set("userId", "123");
      manager.set("sessionId", "abc");

      const eventMetadata = { schemaVersion: "1.0", eventType: "test" };
      const result = manager.merge(eventMetadata);

      expect(result).toEqual({
        userId: "123",
        sessionId: "abc",
        schemaVersion: "1.0",
        eventType: "test",
      });
    });

    it("should prioritize event metadata over shared metadata", () => {
      manager.set("userId", "123");
      manager.set("schemaVersion", "0.5");

      const eventMetadata = { schemaVersion: "1.0", eventType: "test" };
      const result = manager.merge(eventMetadata);

      expect(result).toEqual({
        userId: "123",
        schemaVersion: "1.0", // Event metadata takes precedence
        eventType: "test",
      });
    });
  });
});
