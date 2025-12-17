import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionManager } from "./session-manager.ts";

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let mockSessionStorage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock sessionStorage
    mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    Object.defineProperty(global, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
    });

    sessionManager = new SessionManager();
  });

  describe("constructor", () => {
    it("should create instance with default storage key", () => {
      expect(sessionManager).toBeInstanceOf(SessionManager);
    });

    it("should create instance with custom storage key", () => {
      const customManager = new SessionManager("custom_session_key");

      expect(customManager).toBeInstanceOf(SessionManager);
    });

    it("should initialize with null session ID", () => {
      expect(sessionManager.getSessionId()).toBeNull();
    });
  });

  describe("init", () => {
    it("should return existing session ID from sessionStorage", () => {
      const existingSessionId = "existing-session-123";

      mockSessionStorage.getItem.mockReturnValue(existingSessionId);

      const sessionId = sessionManager.init();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(
        "ripple_session_id",
      );
      expect(sessionId).toBe(existingSessionId);
      expect(sessionManager.getSessionId()).toBe(existingSessionId);
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it("should generate new session ID when none exists", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const sessionId = sessionManager.init();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(
        "ripple_session_id",
      );
      expect(sessionId).toMatch(/^\d+-[a-z0-9]+$/);
      expect(sessionManager.getSessionId()).toBe(sessionId);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_session_id",
        sessionId,
      );
    });

    it("should use custom storage key", () => {
      const customManager = new SessionManager("custom_key");
      const existingSessionId = "custom-session-456";

      mockSessionStorage.getItem.mockReturnValue(existingSessionId);

      const sessionId = customManager.init();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("custom_key");
      expect(sessionId).toBe(existingSessionId);
    });

    it("should generate unique session IDs", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const sessionId1 = sessionManager.init();

      // Create new manager to simulate fresh state
      const newManager = new SessionManager();
      const sessionId2 = newManager.init();

      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(sessionId2).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it("should handle empty string from sessionStorage", () => {
      mockSessionStorage.getItem.mockReturnValue("");

      const sessionId = sessionManager.init();

      // Empty string is falsy, so should generate new session
      expect(sessionId).toMatch(/^\d+-[a-z0-9]+$/);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "ripple_session_id",
        sessionId,
      );
    });

    it("should handle multiple init calls", () => {
      const existingSessionId = "existing-session-789";

      mockSessionStorage.getItem.mockReturnValue(existingSessionId);

      const sessionId1 = sessionManager.init();
      const sessionId2 = sessionManager.init();

      expect(sessionId1).toBe(existingSessionId);
      expect(sessionId2).toBe(existingSessionId);
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSessionId", () => {
    it("should return null before initialization", () => {
      expect(sessionManager.getSessionId()).toBeNull();
    });

    it("should return session ID after initialization", () => {
      const existingSessionId = "test-session-id";

      mockSessionStorage.getItem.mockReturnValue(existingSessionId);

      sessionManager.init();

      expect(sessionManager.getSessionId()).toBe(existingSessionId);
    });

    it("should return generated session ID", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const sessionId = sessionManager.init();

      expect(sessionManager.getSessionId()).toBe(sessionId);
    });
  });

  describe("_generateSessionId", () => {
    it("should generate session ID with correct format", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const sessionId = sessionManager.init();

      // Should be timestamp-randomstring format
      const parts = sessionId.split("-");

      expect(parts).toHaveLength(2);
      expect(Number(parts[0])).toBeGreaterThan(0);
      expect(parts[1]).toMatch(/^[a-z0-9]+$/);
      expect(parts[1]?.length).toBeGreaterThan(0);
    });

    it("should generate different IDs on subsequent calls", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const manager1 = new SessionManager();
      const manager2 = new SessionManager();

      const id1 = manager1.init();
      const id2 = manager2.init();

      expect(id1).not.toBe(id2);
    });
  });

  describe("edge cases", () => {
    it("should handle sessionStorage errors gracefully", () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => sessionManager.init()).toThrow("Storage error");
    });

    it("should handle setItem errors gracefully", () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error("Storage full");
      });

      expect(() => sessionManager.init()).toThrow("Storage full");
    });

    it("should work with different storage key formats", () => {
      const specialKeyManager = new SessionManager("my-app_session.id");

      mockSessionStorage.getItem.mockReturnValue("special-session");

      const sessionId = specialKeyManager.init();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(
        "my-app_session.id",
      );
      expect(sessionId).toBe("special-session");
    });
  });

  describe("clear", () => {
    it("should clear session ID and remove from storage", () => {
      sessionManager.init();
      expect(sessionManager.getSessionId()).toBeTruthy();

      sessionManager.clear();

      expect(sessionManager.getSessionId()).toBeNull();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "ripple_session_id",
      );
    });
  });
});
