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

const createConfig = (overrides?: Partial<ClientConfig>): ClientConfig => ({
  apiKey: "test-key",
  endpoint: "https://api.test.com/events",
  ...overrides,
});

describe("Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create client with default config", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      expect(client).toBeInstanceOf(Client);
    });

    it("should apply default values", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      expect(client).toBeDefined();
    });

    it("should use custom config values", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      const client = new TestClient(
        createConfig({
          flushInterval: 10000,
          maxBatchSize: 20,
          maxRetries: 5,
        }),
        httpAdapter,
        storageAdapter,
      );

      expect(client).toBeDefined();
    });
  });

  describe("init", () => {
    it("should initialize client", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();

      expect(storageAdapter.load).toHaveBeenCalled();
    });

    it("should restore persisted events", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: "persisted", payload: null, issuedAt: Date.now() },
      ]);

      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();

      expect(storageAdapter.load).toHaveBeenCalled();
    });

    it("should allow tracking after init", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalled();
    });
  });

  describe("track", () => {
    it("should throw if not initialized", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await expect(client.track("test_event")).rejects.toThrow(
        "Client not initialized. Call init() before tracking events.",
      );
    });

    it("should track event with name only", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "test_event",
          payload: null,
          metadata: null,
        }),
      ]);
    });

    it("should track event with payload", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track("test_event", { key: "value" });

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "test_event",
          payload: { key: "value" },
        }),
      ]);
    });

    it("should track event with metadata", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track(
        "test_event",
        { key: "value" },
        { schemaVersion: "1.0.0" },
      );

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "test_event",
          metadata: { schemaVersion: "1.0.0" },
        }),
      ]);
    });

    it("should attach context to event", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      client.setContext("userId", "123");
      client.setContext("sessionId", "abc");
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          context: {
            userId: "123",
            sessionId: "abc",
          },
        }),
      ]);
    });

    it("should include timestamp", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      const before = Date.now();

      await client.init();
      await client.track("test_event");

      const after = Date.now();

      const calls = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls as Array<[Array<Event<TestContext>>]>;

      const savedEvent = calls[0]?.[0]?.[0];

      expect(savedEvent?.issuedAt).toBeGreaterThanOrEqual(before);
      expect(savedEvent?.issuedAt).toBeLessThanOrEqual(after);
    });

    it("should include platform info", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          platform: { type: "server" },
        }),
      ]);
    });

    it("should include sessionId", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          sessionId: null,
        }),
      ]);
    });
  });

  describe("setContext", () => {
    it("should set context value", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      client.setContext("userId", "123");
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          context: { userId: "123" },
        }),
      ]);
    });

    it("should update context value", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      client.setContext("userId", "123");
      client.setContext("userId", "456");
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          context: { userId: "456" },
        }),
      ]);
    });

    it("should set multiple context values", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      client.setContext("userId", "123");
      client.setContext("sessionId", "abc");
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({
          context: {
            userId: "123",
            sessionId: "abc",
          },
        }),
      ]);
    });

    it("should work before init", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      expect(() => client.setContext("userId", "123")).not.toThrow();
    });
  });

  describe("flush", () => {
    it("should flush queued events", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track("event1");
      await client.track("event2");
      await client.flush();

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ name: "event1" }),
          expect.objectContaining({ name: "event2" }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should work with empty queue", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.flush();

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should work before init", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await expect(client.flush()).resolves.not.toThrow();
    });
  });

  describe("dispose", () => {
    it("should clean up resources", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      expect(() => client.dispose()).not.toThrow();
    });

    it("should cancel scheduled flushes", async () => {
      vi.useFakeTimers();
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track("test_event");
      client.dispose();

      vi.advanceTimersByTime(10000);

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should work before init", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      expect(() => client.dispose()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle rapid track calls", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();

      const promises = Array.from({ length: 100 }, (_, i) =>
        client.track(`event${i}`),
      );

      await Promise.all(promises);

      expect(storageAdapter.save).toHaveBeenCalled();
    });

    it("should handle context changes between tracks", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await client.init();

      client.setContext("userId", "123");
      await client.track("event1");

      client.setContext("userId", "456");
      await client.track("event2");

      const calls = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls as Array<[Array<Event<TestContext>>]>;

      const event1Call = calls.find(call => call[0]?.[0]?.name === "event1");
      const event2Call = calls.find(call =>
        call[0].some(e => e.name === "event2"),
      );

      expect(event1Call?.[0]?.[0]?.context?.userId).toBe("123");
      expect(
        event2Call?.[0]?.find(e => e.name === "event2")?.context?.userId,
      ).toBe("456");
    });

    it("should handle custom apiKeyHeader", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const client = new TestClient(
        createConfig({ apiKeyHeader: "Authorization" }),
        httpAdapter,
        storageAdapter,
      );

      await client.init();
      await client.track("test_event");
      await client.flush();

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          Authorization: "test-key",
        }),
        "Authorization",
      );
    });
  });
});
