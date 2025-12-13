import type { HttpAdapter, StorageAdapter } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RippleClient, type NodeClientConfig } from "./ripple-client.ts";

const mockHttpAdapter: HttpAdapter = {
  send: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
};

const mockStorageAdapter: StorageAdapter = {
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
};

const mockConfig: NodeClientConfig = {
  apiKey: "test-key",
  endpoint: "https://api.test.com/events",
};

describe("RippleClient", () => {
  let client: RippleClient;

  beforeEach(() => {
    vi.clearAllMocks();

    client = new RippleClient({
      ...mockConfig,
      adapters: {
        httpAdapter: mockHttpAdapter,
        storageAdapter: mockStorageAdapter,
      },
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
      const partialClient = new RippleClient({
        ...mockConfig,
        adapters: {
          httpAdapter: mockHttpAdapter,
        },
      });

      expect(partialClient).toBeInstanceOf(RippleClient);
    });
  });

  describe("init", () => {
    it("should initialize and load events", async () => {
      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalled();
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

  describe("platform detection", () => {
    it("should include server platform info when tracking events", async () => {
      await client.init();

      await client.track("test_event", { key: "value" });

      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "test_event",
            platform: {
              type: "server",
            },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });
  });

  describe("type safety", () => {
    it("should support typed context", async () => {
      interface AppContext extends Record<string, unknown> {
        userId: string;
        requestId: string;
        appVersion: string;
      }

      const typedClient = new RippleClient<AppContext>({
        ...mockConfig,
        adapters: {
          httpAdapter: mockHttpAdapter,
          storageAdapter: mockStorageAdapter,
        },
      });

      await typedClient.init();

      typedClient.setContext("userId", "123");
      typedClient.setContext("requestId", "abc");
      typedClient.setContext("appVersion", "1.0.0");

      expect(typedClient).toBeInstanceOf(RippleClient);
    });
  });

  describe("event tracking", () => {
    it("should track events with payload", async () => {
      await client.init();

      await client.track("user_signup", { email: "test@example.com" });

      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "user_signup",
            payload: { email: "test@example.com" },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should track events with metadata", async () => {
      await client.init();

      await client.track(
        "user_action",
        { action: "click" },
        { schemaVersion: "1.0.0" },
      );

      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "user_action",
            metadata: { schemaVersion: "1.0.0" },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });
  });

  describe("context management", () => {
    it("should set and include context in events", async () => {
      await client.init();

      client.setContext("userId", "user-123");
      client.setContext("environment", "production");

      await client.track("test_event", {});

      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            context: expect.objectContaining({
              userId: "user-123",
              environment: "production",
            }) as Record<string, unknown>,
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });
  });

  describe("dispose", () => {
    it("should dispose client", () => {
      expect(() => client.dispose()).not.toThrow();
    });

    it("should call super dispose", () => {
      const superDisposeSpy = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(client)),
        "dispose",
      );

      client.dispose();

      expect(superDisposeSpy).toHaveBeenCalled();
    });
  });
});
