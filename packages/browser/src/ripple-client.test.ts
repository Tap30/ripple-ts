import {
  NoOpLoggerAdapter,
  type HttpAdapter,
  type StorageAdapter,
} from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RippleClient, type BrowserClientConfig } from "./ripple-client.ts";

type TestMetadata = {
  schemaVersion: string;
  eventType: string;
  userId: string;
};

type TestEvents = {
  "user.login": { email: string; method: string };
  "page.view": { url: string; title: string };
  "button.click": { buttonId: string; location: string };
  test_event: { key: string };
  user_action: Record<string, unknown>;
  simple_event: Record<string, unknown>;
  page_view: { page: string };
};

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
    let sessionId: string | null = null;
    let initCounter = 0;

    return {
      init: vi.fn().mockImplementation(() => {
        initCounter++;
        sessionId = `test-session-id-${initCounter}`;
        return sessionId;
      }),
      getSessionId: vi.fn().mockImplementation(() => sessionId),
      clear: vi.fn().mockImplementation(() => {
        sessionId = null;
      }),
    };
  }),
}));

// Mock adapters
const mockHttpAdapter: HttpAdapter = {
  send: vi.fn().mockResolvedValue({ status: 200 }),
};

const mockStorageAdapter: StorageAdapter = {
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
};

const mockConfig: BrowserClientConfig = {
  apiKey: "test-key",
  endpoint: "https://api.test.com/events",
  httpAdapter: mockHttpAdapter,
  storageAdapter: mockStorageAdapter,
  loggerAdapter: new NoOpLoggerAdapter(),
};

describe("RippleClient", () => {
  let client: RippleClient<TestEvents, TestMetadata>;
  let clientWithDefaults: RippleClient;

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

    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "test-agent",
      },
      writable: true,
      configurable: true,
    });

    client = new RippleClient<TestEvents, TestMetadata>(mockConfig);

    clientWithDefaults = new RippleClient(mockConfig);
  });

  describe("constructor", () => {
    it("should create instance with custom adapters", () => {
      expect(client).toBeInstanceOf(RippleClient);
    });

    it("should create instance with required adapters", () => {
      const defaultClient = new RippleClient(mockConfig);

      expect(defaultClient).toBeInstanceOf(RippleClient);
    });

    it("should pass custom sessionStoreKey to SessionManager", async () => {
      const { SessionManager } = vi.mocked(
        await import("./session-manager.ts"),
      );

      new RippleClient({
        ...mockConfig,
        sessionStoreKey: "custom_session_key",
      });

      expect(SessionManager).toHaveBeenCalledWith("custom_session_key");
    });

    it("should use default sessionStoreKey when not provided", async () => {
      const { SessionManager } = vi.mocked(
        await import("./session-manager.ts"),
      );

      new RippleClient(mockConfig);

      expect(SessionManager).toHaveBeenCalledWith(undefined);
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
    it("should return session ID from session manager", async () => {
      await client.init();
      const sessionId = client.getSessionId();

      expect(sessionId).toBe("test-session-id-1");
    });
  });

  describe("type safety", () => {
    it("should support typed metadata", async () => {
      interface AppMetadata extends Record<string, unknown> {
        userId: string;
        sessionId: string;
        appVersion: string;
      }

      type AppEvents = {
        test_event: { key: string };
      };

      const typedClient = new RippleClient<AppEvents, AppMetadata>({
        ...mockConfig,
        httpAdapter: mockHttpAdapter,
        storageAdapter: mockStorageAdapter,
      });

      await typedClient.init();

      typedClient.setMetadata("userId", "123");
      typedClient.setMetadata("sessionId", "abc");
      typedClient.setMetadata("appVersion", "1.0.0");

      expect(typedClient).toBeInstanceOf(RippleClient);
    });
  });

  describe("edge cases", () => {
    it("should handle multiple init calls", async () => {
      await client.init();
      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalledTimes(1);
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

    it("should allow re-initialization after dispose", async () => {
      // First init
      await client.init();
      const firstSessionId = client.getSessionId();

      expect(firstSessionId).toBeTruthy();

      // Dispose
      client.dispose();
      expect(client.getSessionId()).toBeNull();

      // Re-init should work
      await client.init();
      const secondSessionId = client.getSessionId();

      expect(secondSessionId).toBeTruthy();
      expect(secondSessionId).not.toBe(firstSessionId);
    });

    it("should work normally after dispose and re-init", async () => {
      // First lifecycle
      await client.init();
      client.setMetadata("userId", "123");

      // Dispose
      client.dispose();

      // Re-init and use normally
      await client.init();
      client.setMetadata("userId", "456");

      expect(async () => {
        await client.track("page_view", { page: "/home" });
      }).not.toThrow();

      expect(client.getMetadata()).toEqual({ userId: "456" });
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

      const newClient = new RippleClient({
        ...mockConfig,
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

      const newClient = new RippleClient({
        ...mockConfig,
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

  describe("generic metadata", () => {
    it("should support typed metadata", async () => {
      await client.init();
      await client.track(
        "user_action",
        { action: "click" },
        { schemaVersion: "2.0", eventType: "interaction" },
      );
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "user_action",
            metadata: { schemaVersion: "2.0", eventType: "interaction" },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should support default metadata type", async () => {
      await clientWithDefaults.init();
      await clientWithDefaults.track(
        "page_view",
        { url: "/home" },
        { customField: "value", version: 1 },
      );
      await clientWithDefaults.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "page_view",
            metadata: { customField: "value", version: 1 },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should handle null metadata", async () => {
      await client.init();
      await client.track("simple_event");
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "simple_event",
            metadata: null,
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });
  });
});
