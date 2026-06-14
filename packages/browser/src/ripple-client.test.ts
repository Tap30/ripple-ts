import {
  NoOpLogger,
  type HttpAdapter,
  type HttpAdapterContext,
  type StorageAdapter,
} from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RippleClient, type BrowserClientConfig } from "./ripple-client.ts";

type TestMetadata = {
  appVersion: string;
};

type TestEvents = {
  "user.login": { email: string; method: string };
  test_event: { key: string };
  simple_event: Record<string, unknown>;
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
vi.mock("./identity-manager.ts", () => ({
  IdentityManager: vi.fn().mockImplementation(function () {
    let anonymousId: string | null = null;
    let initCounter = 0;

    return {
      init: vi.fn().mockImplementation(() => {
        initCounter++;
        anonymousId = `test-anon-id-${initCounter}`;
        return anonymousId;
      }),
      getAnonymousId: vi.fn().mockImplementation(() => anonymousId),
      clear: vi.fn().mockImplementation(() => {
        anonymousId = null;
      }),
    };
  }),
}));

// Mock adapters
const mockHttpAdapter: HttpAdapter = {
  send: vi.fn().mockResolvedValue({ status: 200 }),
};

const mockStorageAdapter: StorageAdapter = {
  init: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockConfig: BrowserClientConfig = {
  apiKey: "test-key",
  endpoint: "https://api.test.com/events",
  httpAdapter: mockHttpAdapter,
  storageAdapter: mockStorageAdapter,
  loggerAdapter: new NoOpLogger(),
};

describe("RippleClient", () => {
  let client: RippleClient<TestEvents, TestMetadata>;

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(global, "navigator", {
      value: { userAgent: "test-agent" },
      writable: true,
      configurable: true,
    });

    client = new RippleClient<TestEvents, TestMetadata>(mockConfig);
  });

  describe("constructor", () => {
    it("should create instance", () => {
      expect(client).toBeInstanceOf(RippleClient);
    });

    it("should pass custom sessionStoreKey to IdentityManager", async () => {
      const { IdentityManager } = vi.mocked(
        await import("./identity-manager.ts"),
      );

      new RippleClient({
        ...mockConfig,
        sessionStoreKey: "custom_key",
      });

      expect(IdentityManager).toHaveBeenCalledWith("custom_key");
    });

    it("should use default sessionStoreKey when not provided", async () => {
      const { IdentityManager } = vi.mocked(
        await import("./identity-manager.ts"),
      );

      new RippleClient(mockConfig);

      expect(IdentityManager).toHaveBeenCalledWith(undefined);
    });
  });

  describe("init", () => {
    it("should initialize and persist anonymousId", async () => {
      await client.init();

      expect(client.getAnonymousId()).toMatch(/^test-anon-id-\d+$/);
    });

    it("should restore events from storage", async () => {
      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalled();
    });

    it("should not re-initialize if already initialized", async () => {
      await client.init();
      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalledTimes(1);
    });
  });

  describe("dispose", () => {
    it("should clear session manager on dispose", async () => {
      await client.init();
      client.dispose();

      expect(client.getAnonymousId()).toBe("");
    });

    it("should allow re-initialization after dispose", async () => {
      await client.init();
      const firstId = client.getAnonymousId();

      client.dispose();

      await client.init();
      const secondId = client.getAnonymousId();

      expect(secondId).toBeTruthy();
      expect(secondId).not.toBe(firstId);
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
    it("should include web platform info when tracking", async () => {
      await client.init();
      await client.track("test_event", { key: "value" });
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              name: "test_event",
              platform: {
                type: "web",
                browser: { name: "chrome", version: "120.0.0" },
                device: { name: "desktop", version: "apple" },
                os: { name: "macos", version: "14.0.0" },
              },
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
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
      });

      const newClient = new RippleClient<TestEvents, TestMetadata>(mockConfig);

      await newClient.init();
      await newClient.track("test_event", { key: "value" });
      await newClient.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              platform: {
                type: "web",
                browser: { name: "UNKNOWN", version: "UNKNOWN" },
                device: { name: "desktop", version: "UNKNOWN" },
                os: { name: "UNKNOWN", version: "UNKNOWN" },
              },
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });

    it("should return null platform when navigator is undefined", async () => {
      delete (global as { navigator?: Navigator }).navigator;

      const newClient = new RippleClient<TestEvents, TestMetadata>(mockConfig);

      await newClient.init();
      await newClient.track("test_event", { key: "value" });
      await newClient.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              name: "test_event",
              platform: null,
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });
  });

  describe("tracking", () => {
    it("should include anonymousId in events", async () => {
      await client.init();
      await client.track("test_event", { key: "value" });
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              anonymousId: client.getAnonymousId(),
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });

    it("should track predefined events", async () => {
      await client.init();
      await client.track("product_viewed", {
        product: { productId: "123", price: { amount: 10, currency: "USD" } },
      });
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              name: "product_viewed",
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });

    it("should support metadata", async () => {
      await client.init();
      client.setMetadata("appVersion", "2.0.0");
      await client.track("simple_event");
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              metadata: { appVersion: "2.0.0" },
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });
  });
});
