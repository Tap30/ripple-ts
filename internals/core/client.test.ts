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

  public testSetSessionId(sessionId: string): void {
    this._setSessionId(sessionId);
  }
}

const createMockHttpAdapter = (): HttpAdapter => ({
  send: vi.fn().mockResolvedValue({ status: 200 }),
});

const createMockStorageAdapter = (): StorageAdapter => ({
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
});

const createTestClient = (opts: {
  config?: Partial<ClientConfig>;
  httpAdapter: HttpAdapter;
  storageAdapter: StorageAdapter;
}): TestClient => {
  const { config, httpAdapter, storageAdapter } = opts ?? {};

  return new TestClient({
    apiKey: "test-key",
    endpoint: "https://api.test.com/events",
    ...config,
    httpAdapter,
    storageAdapter,
  });
};

describe("Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should throw error if httpAdapter is missing", () => {
      expect(() => {
        createTestClient({
          httpAdapter: undefined as unknown as HttpAdapter,
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow(
        "Both `httpAdapter` and `storageAdapter` must be provided in `config`.",
      );
    });

    it("should throw error if storageAdapter is missing", () => {
      expect(() => {
        createTestClient({
          storageAdapter: undefined as unknown as StorageAdapter,
          httpAdapter: createMockHttpAdapter(),
        });
      }).toThrow(
        "Both `httpAdapter` and `storageAdapter` must be provided in `config`.",
      );
    });

    it("should throw error if apiKey is missing", () => {
      expect(() => {
        createTestClient({
          config: { apiKey: "" },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`apiKey` must be provided in `config`.");
    });

    it("should throw error if endpoint is missing", () => {
      expect(() => {
        createTestClient({
          config: { endpoint: "" },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`endpoint` must be provided in `config`.");
    });

    it("should throw error if flushInterval is negative", () => {
      expect(() => {
        createTestClient({
          config: { flushInterval: -1 },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`flushInterval` must be a positive number.");
    });

    it("should throw error if flushInterval is zero", () => {
      expect(() => {
        createTestClient({
          config: { flushInterval: 0 },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`flushInterval` must be a positive number.");
    });

    it("should throw error if maxBatchSize is negative", () => {
      expect(() => {
        createTestClient({
          config: { maxBatchSize: -1 },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`maxBatchSize` must be a positive number.");
    });

    it("should throw error if maxBatchSize is zero", () => {
      expect(() => {
        createTestClient({
          config: { maxBatchSize: 0 },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`maxBatchSize` must be a positive number.");
    });

    it("should throw error if maxRetries is negative", () => {
      expect(() => {
        createTestClient({
          config: { maxRetries: -1 },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`maxRetries` must be a non-negative number.");
    });

    it("should throw error if maxBufferSize is negative", () => {
      expect(() => {
        createTestClient({
          config: { maxBufferSize: -1 },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`maxBufferSize` must be a positive number.");
    });

    it("should throw error if maxBufferSize is zero", () => {
      expect(() => {
        createTestClient({
          config: { maxBufferSize: 0 },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`maxBufferSize` must be a positive number.");
    });
  });

  describe("init", () => {
    it("should initialize client", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      expect(storageAdapter.load).toHaveBeenCalled();
    });

    it("should not re-initialize if already initialized", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.init();

      expect(storageAdapter.load).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent init calls", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await Promise.all([client.init(), client.init(), client.init()]);

      expect(storageAdapter.load).toHaveBeenCalledTimes(1);
    });
  });

  describe("track", () => {
    it("should queue events before initialization", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

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
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      const track1 = client.track("event1", { key: "value1" });
      const track2 = client.track("event2", { key: "value2" });

      await client.init();
      await Promise.all([track1, track2]);

      expect(storageAdapter.save).toHaveBeenCalledTimes(2);
    });

    it("should track simple event", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "test_event",
        payload: null,
        metadata: null,
      });
    });

    it("should track event with payload", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event", { key: "value" });

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "test_event",
        payload: { key: "value" },
      });
    });

    it("should track event with metadata", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track(
        "test_event",
        { key: "value" },
        { schemaVersion: "1.0", eventType: "user_action" },
      );

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({
        schemaVersion: "1.0",
        eventType: "user_action",
      });
    });

    it("should attach shared metadata to event", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      client.setMetadata("userId", "123");
      client.setMetadata("sessionId", "abc");

      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({
        userId: "123",
        sessionId: "abc",
      });
    });

    it("should merge shared and event metadata", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      client.setMetadata("userId", "123");
      client.setMetadata("sessionId", "abc");

      await client.track(
        "test_event",
        { key: "value" },
        { schemaVersion: "1.0", eventType: "user_action" },
      );

      const savedEvents = vi.mocked(storageAdapter.save).mock
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
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      client.setMetadata("userId", "123");
      client.setMetadata("schemaVersion", "0.5");

      await client.track(
        "test_event",
        { key: "value" },
        { schemaVersion: "1.0", eventType: "user_action" },
      );

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({
        userId: "123",
        // Event metadata takes precedence
        schemaVersion: "1.0",
        eventType: "user_action",
      });
    });

    it("should include platform information", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.platform).toEqual({ type: "server" });
    });

    it("should include timestamp", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      const beforeTime = Date.now();

      await client.init();
      await client.track("test_event");
      const afterTime = Date.now();

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.issuedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(savedEvents[0]?.issuedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("setMetadata", () => {
    it("should set metadata value", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      client.setMetadata("userId", "123");

      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({ userId: "123" });
    });

    it("should update existing metadata value", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      client.setMetadata("userId", "123");
      client.setMetadata("userId", "456");

      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({ userId: "456" });
    });
  });

  describe("flush", () => {
    it("should flush events", async () => {
      const httpAdapter = createMockHttpAdapter();
      const client = createTestClient({
        httpAdapter,
        storageAdapter: createMockStorageAdapter(),
      });

      await client.init();
      await client.track("test_event");
      await client.flush();

      expect(httpAdapter.send).toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    it("should dispose client", () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      expect(() => client.dispose()).not.toThrow();
    });

    it("should clear metadata on dispose", async () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      await client.init();

      client.setMetadata("userId", "123");
      client.dispose();

      // Re-init and check metadata is cleared
      await client.init();

      expect(client.getMetadata()).toEqual({});
    });

    it("should clear session ID on dispose", async () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      await client.init();

      client.testSetSessionId("test-session-123");
      expect(client.getSessionId()).toBe("test-session-123");

      client.dispose();
      expect(client.getSessionId()).toBeNull();
    });

    it("should allow re-initialization after dispose", async () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      // First init
      await client.init();

      client.testSetSessionId("session-1");
      expect(client.getSessionId()).toBe("session-1");

      // Dispose
      client.dispose();
      expect(client.getSessionId()).toBeNull();

      // Re-init should work
      await expect(client.init()).resolves.not.toThrow();

      // Base client doesn't auto-generate sessions
      expect(client.getSessionId()).toBeNull();
    });

    it("should work normally after dispose and re-init", async () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

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

      await expect(
        client.track("user_signup", {
          email: "test2@example.com",
          plan: "basic",
        }),
      ).resolves.not.toThrow();

      expect(client.getMetadata()).toEqual({ userId: "456" });
    });

    it("should handle multiple dispose calls gracefully", () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      expect(() => {
        client.dispose();
        client.dispose();
        client.dispose();
      }).not.toThrow();
    });

    it("should drop track calls after dispose without re-init", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      client.dispose();

      // Track should be silently dropped
      await client.track("user_signup", {
        email: "test@example.com",
        plan: "premium",
      });

      // Verify no events were enqueued (save not called after dispose)
      expect(storageAdapter.save).not.toHaveBeenCalled();
    });

    it("should allow tracking after dispose and explicit re-init", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      client.dispose();

      // Explicitly re-init
      await client.init();

      // Track should work now
      await client.track("user_signup", {
        email: "test@example.com",
        plan: "premium",
      });

      // Verify event was enqueued
      expect(storageAdapter.save).toHaveBeenCalledTimes(1);
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

  describe("edge cases", () => {
    it("should handle rapid track calls", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      const promises = Array.from({ length: 10 }, (_, i) =>
        client.track(`event_${i}` as keyof TestEvents),
      );

      await Promise.all(promises);

      expect(storageAdapter.save).toHaveBeenCalled();
    });

    it("should handle metadata changes between tracks", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();

      client.setMetadata("userId", "123");

      await client.track("event1");

      client.setMetadata("userId", "456");

      await client.track("event2");

      expect(storageAdapter.save).toHaveBeenCalledTimes(2);
    });

    it("should handle custom apiKeyHeader", async () => {
      const httpAdapter = createMockHttpAdapter();
      const client = createTestClient({
        httpAdapter,
        config: { apiKeyHeader: "Authorization" },
        storageAdapter: createMockStorageAdapter(),
      });

      await client.init();
      await client.track("test_event");
      await client.flush();

      expect(httpAdapter.send).toHaveBeenCalled();
    });
  });
});
