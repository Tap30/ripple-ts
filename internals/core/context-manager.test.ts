import { describe, expect, it } from "vitest";
import { ContextManager } from "./context-manager.ts";

type TestContext = {
  userId: string;
  sessionId: string;
  appVersion: string;
  isAuthenticated: boolean;
};

describe("ContextManager", () => {
  describe("set", () => {
    it("should set context value", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");

      expect(manager.get("userId")).toBe("123");
    });

    it("should set multiple values", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.set("sessionId", "abc");
      manager.set("appVersion", "1.0.0");

      expect(manager.get("userId")).toBe("123");
      expect(manager.get("sessionId")).toBe("abc");
      expect(manager.get("appVersion")).toBe("1.0.0");
    });

    it("should overwrite existing value", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.set("userId", "456");

      expect(manager.get("userId")).toBe("456");
    });

    it("should handle boolean values", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("isAuthenticated", true);

      expect(manager.get("isAuthenticated")).toBe(true);
    });
  });

  describe("get", () => {
    it("should return undefined for unset key", () => {
      const manager = new ContextManager<TestContext>();

      expect(manager.get("userId")).toBeUndefined();
    });

    it("should return set value", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");

      expect(manager.get("userId")).toBe("123");
    });

    it("should return correct value after multiple sets", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.set("userId", "456");

      expect(manager.get("userId")).toBe("456");
    });
  });

  describe("getAll", () => {
    it("should return empty object for no context", () => {
      const manager = new ContextManager<TestContext>();

      expect(manager.getAll()).toEqual({});
    });

    it("should return all context values", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.set("sessionId", "abc");

      expect(manager.getAll()).toEqual({
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should return shallow copy", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");

      const context1 = manager.getAll();
      const context2 = manager.getAll();

      expect(context1).not.toBe(context2);
      expect(context1).toEqual(context2);
    });

    it("should not affect internal state when modified", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");

      const context = manager.getAll();

      context.userId = "456";

      expect(manager.get("userId")).toBe("123");
    });
  });

  describe("isEmpty", () => {
    it("should return true for empty context", () => {
      const manager = new ContextManager<TestContext>();

      expect(manager.isEmpty()).toBe(true);
    });

    it("should return false when context has values", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");

      expect(manager.isEmpty()).toBe(false);
    });

    it("should return true after clear", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.clear();

      expect(manager.isEmpty()).toBe(true);
    });

    it("should return false with multiple values", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.set("sessionId", "abc");

      expect(manager.isEmpty()).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear empty context", () => {
      const manager = new ContextManager<TestContext>();

      manager.clear();

      expect(manager.getAll()).toEqual({});
    });

    it("should remove all context values", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.set("sessionId", "abc");
      manager.clear();

      expect(manager.getAll()).toEqual({});
      expect(manager.get("userId")).toBeUndefined();
      expect(manager.get("sessionId")).toBeUndefined();
    });

    it("should allow setting values after clear", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.clear();
      manager.set("userId", "456");

      expect(manager.get("userId")).toBe("456");
    });
  });

  describe("type safety", () => {
    it("should work with Record<string, unknown>", () => {
      const manager = new ContextManager<Record<string, unknown>>();

      manager.set("anyKey", "anyValue");
      manager.set("anotherKey", 123);

      expect(manager.get("anyKey")).toBe("anyValue");
      expect(manager.get("anotherKey")).toBe(123);
    });

    it("should handle complex types", () => {
      type ComplexContext = {
        user: { id: string; name: string };
        settings: { theme: string };
      };

      const manager = new ContextManager<ComplexContext>();

      manager.set("user", { id: "123", name: "John" });
      manager.set("settings", { theme: "dark" });

      expect(manager.get("user")).toEqual({ id: "123", name: "John" });
      expect(manager.get("settings")).toEqual({ theme: "dark" });
    });
  });

  describe("edge cases", () => {
    it("should handle rapid set/get operations", () => {
      const manager = new ContextManager<TestContext>();

      for (let i = 0; i < 1000; i++) {
        manager.set("userId", `user-${i}`);
      }

      expect(manager.get("userId")).toBe("user-999");
    });

    it("should handle multiple clears", () => {
      const manager = new ContextManager<TestContext>();

      manager.set("userId", "123");
      manager.clear();
      manager.clear();
      manager.clear();

      expect(manager.getAll()).toEqual({});
    });

    it("should maintain independence between instances", () => {
      const manager1 = new ContextManager<TestContext>();
      const manager2 = new ContextManager<TestContext>();

      manager1.set("userId", "123");
      manager2.set("userId", "456");

      expect(manager1.get("userId")).toBe("123");
      expect(manager2.get("userId")).toBe("456");
    });
  });
});
