import { beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityManager } from "./identity-manager.ts";

// Mock IdGenerator from core
vi.mock("@internals/core", () => ({
  IdGenerator: {
    generate: vi.fn().mockReturnValue("mock-uuid-1234"),
  },
}));

describe("IdentityManager", () => {
  let sessionManager: IdentityManager;
  let mockSessionStorage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    Object.defineProperty(global, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
    });

    sessionManager = new IdentityManager();
  });

  describe("constructor", () => {
    it("should create instance with default storage key", () => {
      expect(sessionManager).toBeInstanceOf(IdentityManager);
    });

    it("should create instance with custom storage key", () => {
      const customManager = new IdentityManager("custom_key");

      expect(customManager).toBeInstanceOf(IdentityManager);
    });

    it("should initialize with null anonymousId", () => {
      expect(sessionManager.getAnonymousId()).toBeNull();
    });
  });

  describe("init", () => {
    it("should return existing anonymousId from sessionStorage", () => {
      mockSessionStorage.getItem.mockReturnValue("existing-anon-id");

      const id = sessionManager.init();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("ripple_session");
      expect(id).toBe("existing-anon-id");
      expect(sessionManager.getAnonymousId()).toBe("existing-anon-id");
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it("should generate new anonymousId when none exists", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const id = sessionManager.init();

      expect(id).toBe("mock-uuid-1234");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_session",
        "mock-uuid-1234",
      );
    });

    it("should use custom storage key", () => {
      const customManager = new IdentityManager("custom_key");

      mockSessionStorage.getItem.mockReturnValue("custom-id");

      const id = customManager.init();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("custom_key");
      expect(id).toBe("custom-id");
    });

    it("should generate new ID for empty string in storage", () => {
      mockSessionStorage.getItem.mockReturnValue("");

      const id = sessionManager.init();

      expect(id).toBe("mock-uuid-1234");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_session",
        "mock-uuid-1234",
      );
    });

    it("should handle multiple init calls", () => {
      mockSessionStorage.getItem.mockReturnValue("existing-id");

      const id1 = sessionManager.init();
      const id2 = sessionManager.init();

      expect(id1).toBe("existing-id");
      expect(id2).toBe("existing-id");
    });
  });

  describe("getAnonymousId", () => {
    it("should return null before initialization", () => {
      expect(sessionManager.getAnonymousId()).toBeNull();
    });

    it("should return anonymousId after initialization", () => {
      mockSessionStorage.getItem.mockReturnValue("test-id");

      sessionManager.init();

      expect(sessionManager.getAnonymousId()).toBe("test-id");
    });
  });

  describe("clear", () => {
    it("should clear anonymousId and remove from storage", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      sessionManager.init();
      expect(sessionManager.getAnonymousId()).toBeTruthy();

      sessionManager.clear();

      expect(sessionManager.getAnonymousId()).toBeNull();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "ripple_session",
      );
    });
  });

  describe("edge cases", () => {
    it("should throw when sessionStorage.getItem errors", () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => sessionManager.init()).toThrow("Storage error");
    });

    it("should throw when sessionStorage.setItem errors", () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error("Storage full");
      });

      expect(() => sessionManager.init()).toThrow("Storage full");
    });

    it("should work with different storage key formats", () => {
      const specialManager = new IdentityManager("my-app_anon.id");

      mockSessionStorage.getItem.mockReturnValue("special-id");

      const id = specialManager.init();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("my-app_anon.id");
      expect(id).toBe("special-id");
    });
  });

  describe("userId", () => {
    it("should return null when no userId is set", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      expect(sessionManager.getUserId()).toBeNull();
    });

    it("should persist and retrieve userId", () => {
      sessionManager.setUserId("user-123");

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_session_user",
        "user-123",
      );
    });

    it("should clear userId on clear()", () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      sessionManager.init();
      sessionManager.setUserId("user-123");
      sessionManager.clear();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "ripple_session_user",
      );
    });
  });
});
