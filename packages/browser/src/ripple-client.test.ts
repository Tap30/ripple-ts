import type {
  ClientConfig,
  HttpAdapter,
  StorageAdapter,
} from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RippleClient } from "./ripple-client.ts";

// Mock UAParser
vi.mock("ua-parser-js", () => ({
  UAParser: vi.fn().mockImplementation(function () {
    return {
      getBrowser: () => ({ name: "Chrome", version: "120.0.0" }),
      getDevice: () => ({ type: "desktop", vendor: "Apple" }),
      getOS: () => ({ name: "macOS", version: "14.0.0" }),
    };
  }),
}));

// Mock SessionManager
vi.mock("./session-manager.ts", () => ({
  SessionManager: vi.fn().mockImplementation(function () {
    return {
      init: vi.fn().mockReturnValue("test-session-id"),
      getSessionId: vi.fn().mockReturnValue("test-session-id"),
    };
  }),
}));

// Mock adapters
const mockHttpAdapter: HttpAdapter = {
  send: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
};

const mockStorageAdapter: StorageAdapter = {
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
};

const mockConfig: ClientConfig = {
  apiKey: "test-key",
  endpoint: "https://api.test.com/events",
};

describe("RippleClient", () => {
  let client: RippleClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window and document
    Object.defineProperty(global, "window", {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, "document", {
      value: {
        visibilityState: "visible",
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "test-agent",
      },
      writable: true,
      configurable: true,
    });

    client = new RippleClient(mockConfig, {
      httpAdapter: mockHttpAdapter,
      storageAdapter: mockStorageAdapter,
    });
  });

  describe("constructor", () => {
    it("should create instance with custom adapters", () => {
      expect(client).toBeInstanceOf(RippleClient);
    });

    it("should create instance with default adapters", () => {
      const defaultClient = new RippleClient(mockConfig);

      expect(defaultClient).toBeInstanceOf(RippleClient);
    });

    it("should create instance with partial adapters", () => {
      const partialClient = new RippleClient(mockConfig, {
        httpAdapter: mockHttpAdapter,
      });

      expect(partialClient).toBeInstanceOf(RippleClient);
    });
  });

  describe("init", () => {
    it("should initialize session and load events", async () => {
      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalled();
    });

    it("should handle missing window object", async () => {
      const originalWindow = global.window;

      delete (global as { window?: Window }).window;

      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalled();

      global.window = originalWindow;
    });

    it("should call super.init", async () => {
      const superInitSpy = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(client)),
        "init",
      );

      await client.init();

      expect(superInitSpy).toHaveBeenCalled();
    });
  });

  describe("getSessionId", () => {
    it("should return session ID from session manager", () => {
      const sessionId = client.getSessionId();

      expect(sessionId).toBe("test-session-id");
    });
  });

  describe("type safety", () => {
    it("should support typed context", async () => {
      interface AppContext extends Record<string, unknown> {
        userId: string;
        sessionId: string;
        appVersion: string;
      }

      const typedClient = new RippleClient<AppContext>(mockConfig, {
        httpAdapter: mockHttpAdapter,
        storageAdapter: mockStorageAdapter,
      });

      await typedClient.init();

      typedClient.setContext("userId", "123");
      typedClient.setContext("sessionId", "abc");
      typedClient.setContext("appVersion", "1.0.0");

      expect(typedClient).toBeInstanceOf(RippleClient);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple init calls", async () => {
      await client.init();
      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalledTimes(2);
    });

    it("should handle dispose before init", () => {
      expect(() => client.dispose()).not.toThrow();
    });

    it("should handle multiple dispose calls", async () => {
      await client.init();

      client.dispose();
      client.dispose();

      expect(mockStorageAdapter.load).toHaveBeenCalled();
    });
  });

  describe("platform detection", () => {
    it("should include platform info when tracking events", async () => {
      await client.init();

      await client.track("test_event", { key: "value" });

      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "test_event",
            platform: {
              type: "web",
              browser: { name: "chrome", version: "120.0.0" },
              device: { name: "desktop", version: "apple" },
              os: { name: "macos", version: "14.0.0" },
            },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should use fallback values when UAParser returns undefined", async () => {
      const { UAParser } = await import("ua-parser-js");

      vi.mocked(UAParser).mockImplementation(function (this: {
        getBrowser: () => { name?: string; version?: string };
        getDevice: () => { type?: string; vendor?: string };
        getOS: () => { name?: string; version?: string };
      }) {
        this.getBrowser = () => ({});
        this.getDevice = () => ({});
        this.getOS = () => ({});
        return this;
      } as unknown as typeof UAParser);

      const newClient = new RippleClient(mockConfig, {
        httpAdapter: mockHttpAdapter,
        storageAdapter: mockStorageAdapter,
      });

      await newClient.init();
      await newClient.track("test_event", { key: "value" });
      await newClient.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "test_event",
            platform: {
              type: "web",
              browser: { name: "UNKNOWN", version: "UNKNOWN" },
              device: { name: "desktop", version: "UNKNOWN" },
              os: { name: "UNKNOWN", version: "UNKNOWN" },
            },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should handle missing navigator when tracking events", async () => {
      const originalNavigator = global.navigator;

      delete (global as { navigator?: Navigator }).navigator;

      const newClient = new RippleClient(mockConfig, {
        httpAdapter: mockHttpAdapter,
        storageAdapter: mockStorageAdapter,
      });

      await newClient.init();
      await newClient.track("test_event", { key: "value" });
      await newClient.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "test_event",
            platform: null,
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );

      global.navigator = originalNavigator;
    });
  });
});
