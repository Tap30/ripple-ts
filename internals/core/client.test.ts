import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";
import { Client, type ClientConfig } from "./client.ts";
import type { Event, EventPayload, Platform } from "./types.ts";

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
  send: vi.fn().mockResolvedValue({ status: 200 }),
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
  httpAdapter: httpAdapter ?? createMockHttpAdapter(),
  storageAdapter: storageAdapter ?? createMockStorageAdapter(),
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
          httpAdapter: undefined as unknown as HttpAdapter,
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow(
        "Both `httpAdapter` and `storageAdapter` must be provided in `config`.",
      );
    });

    it("should throw error if storageAdapter is missing", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: undefined as unknown as StorageAdapter,
        });
      }).toThrow(
        "Both `httpAdapter` and `storageAdapter` must be provided in `config`.",
      );
    });

    it("should throw error if apiKey is missing", () => {
      expect(() => {
        new TestClient({
          apiKey: "",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`apiKey` must be provided in `config`.");
    });

    it("should throw error if endpoint is missing", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`endpoint` must be provided in `config`.");
    });

    it("should throw error if flushInterval is negative", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
          flushInterval: -1,
        });
      }).toThrow("`flushInterval` must be a positive number.");
    });

    it("should throw error if flushInterval is zero", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
          flushInterval: 0,
        });
      }).toThrow("`flushInterval` must be a positive number.");
    });

    it("should throw error if maxBatchSize is negative", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
          maxBatchSize: -1,
        });
      }).toThrow("`maxBatchSize` must be a positive number.");
    });

    it("should throw error if maxBatchSize is zero", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
          maxBatchSize: 0,
        });
      }).toThrow("`maxBatchSize` must be a positive number.");
    });

    it("should throw error if maxRetries is negative", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
          maxRetries: -1,
        });
      }).toThrow("`maxRetries` must be a non-negative number.");
    });

    it("should throw error if maxBufferSize is negative", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
          maxBufferSize: -1,
        });
      }).toThrow("`maxBufferSize` must be a positive number.");
    });

    it("should throw error if maxBufferSize is zero", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          endpoint: "https://api.test.com/events",
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
          maxBufferSize: 0,
        });
      }).toThrow("`maxBufferSize` must be a positive number.");
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

    it("should not re-initialize if already initialized", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.init();

      expect(storageAdapter.load).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent init calls", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await Promise.all([client.init(), client.init(), client.init()]);

      expect(storageAdapter.load).toHaveBeenCalledTimes(1);
    });
  });

  describe("track", () => {
    it("should queue events before initialization", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      const trackPromise = client.track("test_event", { key: "value" });

      await client.init();
      await trackPromise;

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "test_event",
        payload: { key: "value" },
      });
    });

    it("should queue multiple events before initialization", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      const track1 = client.track("event1", { key: "value1" });
      const track2 = client.track("event2", { key: "value2" });

      await client.init();
      await Promise.all([track1, track2]);

      expect(storageAdapter.save).toHaveBeenCalledTimes(2);
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

    it("should clear metadata on dispose", async () => {
      const client = createTestClient();

      await client.init();

      client.setMetadata("userId", "123");
      client.dispose();

      // Re-init and check metadata is cleared
      await client.init();
      expect(client.getMetadata()).toEqual({});
    });

    it("should clear session ID on dispose", async () => {
      const client = createTestClient();

      await client.init();

      // Manually set a session ID to test disposal
      client["_sessionId"] = "test-session-123";
      expect(client.getSessionId()).toBe("test-session-123");

      client.dispose();
      expect(client.getSessionId()).toBeNull();
    });

    it("should allow re-initialization after dispose", async () => {
      const client = createTestClient();

      // First init
      await client.init();
      // Manually set session ID to simulate session management
      client["_sessionId"] = "session-1";
      expect(client.getSessionId()).toBe("session-1");

      // Dispose
      client.dispose();
      expect(client.getSessionId()).toBeNull();

      // Re-init should work
      await expect(client.init()).resolves.not.toThrow();
      expect(client.getSessionId()).toBeNull(); // Base client doesn't auto-generate sessions
    });

    it("should work normally after dispose and re-init", async () => {
      const client = createTestClient();

      // First lifecycle
      await client.init();

      client.setMetadata("userId", "123");

      await client.track("user_signup", {
        email: "test@example.com",
        plan: "premium",
      });

      // Dispose
      client.dispose();

      // Re-init and use normally
      await client.init();
      client.setMetadata("userId", "456");

      expect(async () => {
        await client.track("user_signup", {
          email: "test2@example.com",
          plan: "basic",
        });
      }).not.toThrow();

      expect(client.getMetadata()).toEqual({ userId: "456" });
    });

    it("should handle multiple dispose calls gracefully", () => {
      const client = createTestClient();

      expect(() => {
        client.dispose();
        client.dispose();
        client.dispose();
      }).not.toThrow();
    });

    it("should allow subclasses to override _setSessionId", () => {
      class TestClient extends Client<Record<string, EventPayload>> {
        protected _getPlatform(): Platform | null {
          return null;
        }

        public testSetSessionId(sessionId: string): void {
          this._setSessionId(sessionId);
        }
      }

      const client = new TestClient({
        apiKey: "test-key",
        endpoint: "https://api.example.com",
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      client.testSetSessionId("test-session-123");

      expect(client.getSessionId()).toBe("test-session-123");
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
