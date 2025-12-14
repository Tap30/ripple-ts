import type { HttpAdapter, StorageAdapter } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RippleClient, type NodeClientConfig } from "./ripple-client.ts";

type TestMetadata = {
  schemaVersion: string;
  eventType: string;
};

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
  let client: RippleClient<TestMetadata>;
  let clientWithDefaults: RippleClient;

  beforeEach(() => {
    vi.clearAllMocks();

    client = new RippleClient<TestMetadata>({
      ...mockConfig,
      adapters: {
        httpAdapter: mockHttpAdapter,
        storageAdapter: mockStorageAdapter,
      },
    });

    clientWithDefaults = new RippleClient({
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
    it("should support typed metadata", async () => {
      interface AppMetadata extends Record<string, unknown> {
        userId: string;
        requestId: string;
        appVersion: string;
      }

      const typedClient = new RippleClient<AppMetadata>({
        ...mockConfig,
        adapters: {
          httpAdapter: mockHttpAdapter,
          storageAdapter: mockStorageAdapter,
        },
      });

      await typedClient.init();

      typedClient.setMetadata("userId", "123");
      typedClient.setMetadata("requestId", "abc");
      typedClient.setMetadata("appVersion", "1.0.0");

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
        { schemaVersion: "1.0.0", eventType: "interaction" },
      );

      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "user_action",
            metadata: { schemaVersion: "1.0.0", eventType: "interaction" },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });
  });

  describe("metadata management", () => {
    it("should set and include metadata in events", async () => {
      const genericConfig: NodeClientConfig = {
        ...mockConfig,
        adapters: {
          httpAdapter: mockHttpAdapter,
          storageAdapter: mockStorageAdapter,
        },
      };

      const genericClient = new RippleClient(genericConfig);

      await genericClient.init();

      genericClient.setMetadata("userId", "user-123");
      genericClient.setMetadata("sessionId", "session-production");

      await genericClient.track("test_event", {});

      await genericClient.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({
              userId: "user-123",
              sessionId: "session-production",
            }) as Record<string, unknown>,
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });
  });

  describe("generic metadata", () => {
    it("should support typed metadata", async () => {
      await client.init();
      await client.track(
        "server_action",
        { action: "process" },
        { schemaVersion: "3.0", eventType: "system" },
      );
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "server_action",
            metadata: { schemaVersion: "3.0", eventType: "system" },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should support default metadata type", async () => {
      await clientWithDefaults.init();
      await clientWithDefaults.track(
        "api_call",
        { endpoint: "/users" },
        { requestId: "req-123", duration: 150 },
      );
      await clientWithDefaults.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        mockConfig.endpoint,
        expect.arrayContaining([
          expect.objectContaining({
            name: "api_call",
            metadata: { requestId: "req-123", duration: 150 },
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
