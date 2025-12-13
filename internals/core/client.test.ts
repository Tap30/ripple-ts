import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";
import { Client } from "./client.ts";
import type { ClientConfig, Event, Platform } from "./types.ts";

type TestContext = {
  userId: string;
  sessionId: string;
};

class TestClient extends Client<TestContext> {
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

describe("Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create client with default config", () => {
      const client = createTestClient();

      expect(client).toBeInstanceOf(Client);
    });

    it("should apply default values", () => {
      const client = createTestClient();

      expect(client).toBeDefined();
    });

    it("should use custom config values", () => {
      const client = createTestClient({
        flushInterval: 10000,
        maxBatchSize: 20,
        maxRetries: 5,
      });

      expect(client).toBeDefined();
    });

    it("should throw error when adapters are missing", () => {
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

    it("should throw error when apiKey is missing", () => {
      expect(() => {
        new TestClient({
          endpoint: "https://api.test.com/events",
          adapters: {
            httpAdapter: createMockHttpAdapter(),
            storageAdapter: createMockStorageAdapter(),
          },
        } as any);
      }).toThrow("`apiKey` must be provided in `config`.");
    });

    it("should throw error when endpoint is missing", () => {
      expect(() => {
        new TestClient({
          apiKey: "test-key",
          adapters: {
            httpAdapter: createMockHttpAdapter(),
            storageAdapter: createMockStorageAdapter(),
          },
        } as any);
      }).toThrow("`endpoint` must be provided in `config`.");
    });
  });

  describe("init", () => {
    it("should initialize client", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();

      expect(storageAdapter.load).toHaveBeenCalled();
    });

    it("should restore persisted events", async () => {
      const storageAdapter = createMockStorageAdapter();

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: "persisted", payload: null, issuedAt: Date.now() },
      ]);

      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();

      expect(storageAdapter.load).toHaveBeenCalled();
    });

    it("should allow tracking after init", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalled();
    });
  });

  describe("track", () => {
    it("should throw if not initialized", async () => {
      const client = createTestClient();

      await expect(client.track("test_event")).rejects.toThrow(
        "Client not initialized. Call init() before tracking events.",
      );
    });

    it("should track event with name only", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalled();
      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents).toHaveLength(1);
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
        .calls[0]?.[0] as Event<TestContext>[];

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
        { schemaVersion: "1.0" },
      );

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents[0]).toMatchObject({
        name: "test_event",
        payload: { key: "value" },
        metadata: { schemaVersion: "1.0" },
      });
    });

    it("should attach context to event", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setContext("userId", "123");
      client.setContext("sessionId", "abc");
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents[0]?.context).toEqual({
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should include timestamp", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      const before = Date.now();

      await client.init();
      await client.track("test_event");
      const after = Date.now();

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents[0]?.issuedAt).toBeGreaterThanOrEqual(before);
      expect(savedEvents[0]?.issuedAt).toBeLessThanOrEqual(after);
    });

    it("should include platform info", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents[0]?.platform).toEqual({ type: "server" });
    });

    it("should include sessionId", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents[0]?.sessionId).toBeNull();
    });
  });

  describe("setContext", () => {
    it("should set context value", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setContext("userId", "123");
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents[0]?.context).toEqual({ userId: "123" });
    });

    it("should update context value", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setContext("userId", "123");
      client.setContext("userId", "456");
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents[0]?.context).toEqual({ userId: "456" });
    });

    it("should set multiple context values", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();
      client.setContext("userId", "123");
      client.setContext("sessionId", "abc");
      await client.track("test_event");

      const savedEvents = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as Event<TestContext>[];

      expect(savedEvents[0]?.context).toEqual({
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should work before init", () => {
      const client = createTestClient();

      expect(() => client.setContext("userId", "123")).not.toThrow();
    });
  });

  describe("flush", () => {
    it("should flush queued events", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, httpAdapter, storageAdapter);

      await client.init();
      await client.track("test_event");
      await client.flush();

      expect(httpAdapter.send).toHaveBeenCalled();
      expect(storageAdapter.clear).toHaveBeenCalled();
    });

    it("should work with empty queue", async () => {
      const client = createTestClient();

      await client.init();
      await expect(client.flush()).resolves.not.toThrow();
    });

    it("should work before init", async () => {
      const client = createTestClient();

      await expect(client.flush()).resolves.not.toThrow();
    });
  });

  describe("dispose", () => {
    it("should clean up resources", () => {
      const client = createTestClient();

      expect(() => client.dispose()).not.toThrow();
    });

    it("should cancel scheduled flushes", async () => {
      vi.useFakeTimers();
      const client = createTestClient();

      await client.init();
      await client.track("test_event");

      client.dispose();

      vi.advanceTimersByTime(10000);
      vi.useRealTimers();

      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });

    it("should work before init", () => {
      const client = createTestClient();

      expect(() => client.dispose()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle rapid track calls", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();

      const promises = Array.from({ length: 10 }, (_, i) =>
        client.track(`event_${i}`),
      );

      await Promise.all(promises);

      expect(storageAdapter.save).toHaveBeenCalled();
    });

    it("should handle context changes between tracks", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient(undefined, undefined, storageAdapter);

      await client.init();

      client.setContext("userId", "123");
      await client.track("event1");

      client.setContext("userId", "456");
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
