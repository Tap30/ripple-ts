import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";
import { Client } from "./client.ts";
import type { ClientConfig, Event, Platform } from "./types.ts";

type TestMetadata = {
  userId: string;
  sessionId: string;
  schemaVersion: string;
  eventType: string;
};

type TestEvents = {
  test_event: { key: string };
  user_signup: { email: string; plan: string };
  simple_event: Record<string, unknown>;
  typed_event: { data: string };
  event1: Record<string, unknown>;
  event2: Record<string, unknown>;
  event_0: Record<string, unknown>;
  event_1: Record<string, unknown>;
  event_2: Record<string, unknown>;
  event_3: Record<string, unknown>;
  event_4: Record<string, unknown>;
  event_5: Record<string, unknown>;
  event_6: Record<string, unknown>;
  event_7: Record<string, unknown>;
  event_8: Record<string, unknown>;
  event_9: Record<string, unknown>;
};

class TestClient extends Client<TestEvents, TestMetadata> {
  protected _getPlatform(): Platform | null {
    return { type: "server" };
  }
}

class TestClientWithDefaults extends Client {
  protected _getPlatform(): Platform | null {
    return { type: "server" };
  }
}

const createMockHttpAdapter = (): HttpAdapter => ({
  send: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
});

const createMockStorageAdapter = (): StorageAdapter => ({
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
});

const createConfig = (
  overrides?: Partial<ClientConfig>,
  httpAdapter?: HttpAdapter,
  storageAdapter?: StorageAdapter,
): ClientConfig => ({
  apiKey: "test-key",
  endpoint: "https://api.test.com/events",
  ...overrides,
  adapters: {
    httpAdapter: httpAdapter ?? createMockHttpAdapter(),
    storageAdapter: storageAdapter ?? createMockStorageAdapter(),
  },
});

const createTestClient = (
  config?: Partial<ClientConfig>,
  httpAdapter?: HttpAdapter,
  storageAdapter?: StorageAdapter,
): TestClient => {
  const http = httpAdapter ?? createMockHttpAdapter();
  const storage = storageAdapter ?? createMockStorageAdapter();

  return new TestClient(createConfig(config, http, storage));
};

const createTestClientWithDefaults = (
  config?: Partial<ClientConfig>,
  httpAdapter?: HttpAdapter,
  storageAdapter?: StorageAdapter,
): TestClientWithDefaults => {
  const http = httpAdapter ?? createMockHttpAdapter();
  const storage = storageAdapter ?? createMockStorageAdapter();

  return new TestClientWithDefaults(createConfig(config, http, storage));
};

describe("Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should throw error if httpAdapter is missing", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          adapters: {
            httpAdapter: undefined as unknown as HttpAdapter,
            storageAdapter: createMockStorageAdapter(),
          },
        });
      }).toThrow(
        "Both `httpAdapter` and `storageAdapter` must be provided in `config.adapters`.",
      );
    });

    it("should throw error if storageAdapter is missing", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          adapters: {
            httpAdapter: createMockHttpAdapter(),
            storageAdapter: undefined as unknown as StorageAdapter,
          },
        });
      }).toThrow(
        "Both `httpAdapter` and `storageAdapter` must be provided in `config.adapters`.",
      );
    });

    it("should throw error if apiKey is missing", () => {
      expect(() => {
        new TestClient({
          apiKey: "",
          endpoint: "https://api.test.com/events",
          adapters: {
            httpAdapter: createMockHttpAdapter(),
            storageAdapter: createMockStorageAdapter(),
          },
        });
      }).toThrow("`apiKey` must be provided in `config`.");
    });

    it("should throw error if endpoint is missing", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "",
          adapters: {
            httpAdapter: createMockHttpAdapter(),
            storageAdapter: createMockStorageAdapter(),
          },
        });
      }).toThrow("`endpoint` must be provided in `config`.");
    });

    it("should create client with valid config", () => {
      const client = createTestClient();

      expect(client).toBeInstanceOf(TestClient);
    });

    it("should use default values for optional config", () => {
      const client = createTestClient();

      expect(client).toBeInstanceOf(TestClient);
    });
  });

  describe("init", () => {
    it("should initialize client", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();

      expect(storageAdapter.load).toHaveBeenCalled();
    });
  });

  describe("track", () => {
    it("should throw error if not initialized", async () => {
      const client = createTestClient();

      await expect(client.track("test_event")).rejects.toThrow(
        "Client not initialized. Call init() before tracking events.",
      );
    });

    it("should track simple event", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "test_event",
        payload: null,
        metadata: null,
      });
    });

    it("should track event with payload", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("test_event", { key: "value" });

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "test_event",
        payload: { key: "value" },
      });
    });

    it("should track event with metadata", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track(
        "test_event",
        { key: "value" },
        { schemaVersion: "1.0", eventType: "user_action" },
      );

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({
        schemaVersion: "1.0",
        eventType: "user_action",
      });
    });

    it("should attach shared metadata to event", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setMetadata("userId", "123");
      client.setMetadata("sessionId", "abc");
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should merge shared and event metadata", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setMetadata("userId", "123");
      client.setMetadata("sessionId", "abc");
      await client.track(
        "test_event",
        { key: "value" },
        { schemaVersion: "1.0", eventType: "user_action" },
      );

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({
        userId: "123",
        sessionId: "abc",
        schemaVersion: "1.0",
        eventType: "user_action",
      });
    });

    it("should prioritize event metadata over shared metadata", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setMetadata("userId", "123");
      client.setMetadata("schemaVersion", "0.5");
      await client.track(
        "test_event",
        { key: "value" },
        { schemaVersion: "1.0", eventType: "user_action" },
      );

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({
        userId: "123",
        schemaVersion: "1.0", // Event metadata takes precedence
        eventType: "user_action",
      });
    });

    it("should include platform information", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.platform).toEqual({ type: "server" });
    });

    it("should include timestamp", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      const beforeTime = Date.now();

      await client.init();
      await client.track("test_event");
      const afterTime = Date.now();

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.issuedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(savedEvents[0]?.issuedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("setMetadata", () => {
    it("should set metadata value", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setMetadata("userId", "123");
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({ userId: "123" });
    });

    it("should update existing metadata value", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setMetadata("userId", "123");
      client.setMetadata("userId", "456");
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({ userId: "456" });
    });
  });

  describe("flush", () => {
    it("should flush events", async () => {
      const httpAdapter = createMockHttpAdapter();
      const client = createTestClient(undefined, httpAdapter);

      await client.init();
      await client.track("test_event");
      await client.flush();

      expect(httpAdapter.send).toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    it("should dispose client", () => {
      const client = createTestClient();

      expect(() => client.dispose()).not.toThrow();
    });
  });

  describe("generic metadata", () => {
    it("should support typed metadata", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track(
        "user_signup",
        { email: "test@example.com", plan: "free" },
        {
          schemaVersion: "2.0",
          eventType: "conversion",
          userId: "123",
          sessionId: "abc",
        },
      );

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({
        schemaVersion: "2.0",
        eventType: "conversion",
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should support default metadata type", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClientWithDefaults(
        undefined,
        undefined,
        storageAdapter,
      );

      await client.init();
      await client.track(
        "page_view",
        { url: "/home" },
        { customField: "value", version: 1 },
      );

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<Record<string, unknown>>[];

      expect(savedEvents[0]?.metadata).toEqual({
        customField: "value",
        version: 1,
      });
    });

    it("should handle null metadata with typed client", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("simple_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toBeNull();
    });

    it("should handle undefined metadata with typed client", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("simple_event", { data: "test" }, undefined);

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toBeNull();
    });

    it("should preserve metadata type safety", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();

      // This should compile with correct types
      await client.track(
        "typed_event",
        { data: "test" },
        {
          schemaVersion: "1.0",
          eventType: "interaction",
          userId: "123",
          sessionId: "abc",
        },
      );

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata?.schemaVersion).toBe("1.0");
      expect(savedEvents[0]?.metadata?.eventType).toBe("interaction");
    });
  });

  describe("edge cases", () => {
    it("should handle rapid track calls", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();

      const promises = Array.from({ length: 10 }, (_, i) =>
        client.track(`event_${i}` as keyof TestEvents),
      );

      await Promise.all(promises);

      expect(storageAdapter.save).toHaveBeenCalled();
    });

    it("should handle metadata changes between tracks", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();

      client.setMetadata("userId", "123");
      await client.track("event1");

      client.setMetadata("userId", "456");
      await client.track("event2");

      expect(storageAdapter.save).toHaveBeenCalledTimes(2);
    });

    it("should handle custom apiKeyHeader", async () => {
      const httpAdapter = createMockHttpAdapter();
      const client = createTestClient(
        { apiKeyHeader: "Authorization" },
        httpAdapter,
      );

      await client.init();
      await client.track("test_event");
      await client.flush();

      expect(httpAdapter.send).toHaveBeenCalled();
    });
  });
});
