import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";
import { Client, type ClientConfig, type EventSampler } from "./client.ts";
import type { Event, Platform, SdkInfo } from "./types.ts";

type TestMetadata = {
  userId: string;
  sessionId: string;
};

type TestCustomEvents = {
  test_event: { key: string };
  user_signup: { email: string; plan: string };
  simple_event: Record<string, unknown>;
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

class TestClient extends Client<TestCustomEvents, TestMetadata> {
  protected _getPlatform(): Platform | null {
    return { type: "server" };
  }

  protected _getSdkInfo(): SdkInfo {
    return { name: "test-sdk", version: "1.0.0" };
  }
}

const createMockHttpAdapter = (): HttpAdapter => ({
  send: vi.fn().mockResolvedValue({ status: 200 }),
});

const createMockStorageAdapter = (): StorageAdapter => ({
  init: vi.fn().mockResolvedValue(undefined),
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
  const { config, httpAdapter, storageAdapter } = opts;

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
    it("should throw error if storageAdapter is missing", () => {
      expect(() => {
        createTestClient({
          storageAdapter: undefined as unknown as StorageAdapter,
          httpAdapter: createMockHttpAdapter(),
        });
      }).toThrow("`storageAdapter` must be provided in `config`.");
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

    it("should throw error if batchOptions.interval is zero", () => {
      expect(() => {
        createTestClient({
          config: { batchOptions: { interval: 0 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`batchOptions.interval` must be a positive number.");
    });

    it("should throw error if batchOptions.interval is negative", () => {
      expect(() => {
        createTestClient({
          config: { batchOptions: { interval: -1 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`batchOptions.interval` must be a positive number.");
    });

    it("should throw error if batchOptions.size is zero", () => {
      expect(() => {
        createTestClient({
          config: { batchOptions: { size: 0 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`batchOptions.size` must be a positive number.");
    });

    it("should throw error if batchOptions.size is negative", () => {
      expect(() => {
        createTestClient({
          config: { batchOptions: { size: -1 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`batchOptions.size` must be a positive number.");
    });

    it("should throw error if batchOptions.maxPayloadSize is zero", () => {
      expect(() => {
        createTestClient({
          config: { batchOptions: { maxPayloadSize: 0 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`batchOptions.maxPayloadSize` must be a positive number.");
    });

    it("should throw error if retryOptions.maxAttempts is negative", () => {
      expect(() => {
        createTestClient({
          config: { retryOptions: { maxAttempts: -1 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`retryOptions.maxAttempts` must be a non-negative number.");
    });

    it("should throw error if retryOptions.minDelay is zero", () => {
      expect(() => {
        createTestClient({
          config: { retryOptions: { minDelay: 0 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`retryOptions.minDelay` must be a positive number.");
    });

    it("should throw error if retryOptions.maxDelay is zero", () => {
      expect(() => {
        createTestClient({
          config: { retryOptions: { maxDelay: 0 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`retryOptions.maxDelay` must be a positive number.");
    });

    it("should throw error if retryOptions.backoffFactor is zero", () => {
      expect(() => {
        createTestClient({
          config: { retryOptions: { backoffFactor: 0 } },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`retryOptions.backoffFactor` must be a positive number.");
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

    it("should throw error if maxBufferSize is negative", () => {
      expect(() => {
        createTestClient({
          config: { maxBufferSize: -1 },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`maxBufferSize` must be a positive number.");
    });

    it("should throw error if eventSampler is not a function", () => {
      expect(() => {
        createTestClient({
          config: {
            eventSampler: "not-a-function" as unknown as EventSampler,
          },
          httpAdapter: createMockHttpAdapter(),
          storageAdapter: createMockStorageAdapter(),
        });
      }).toThrow("`eventSampler` must be a function.");
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
    it("should auto-initialize on first track", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.track("test_event", { key: "value" });

      expect(storageAdapter.load).toHaveBeenCalled();
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

    it("should track event without payload", async () => {
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
      });
    });

    it("should include schemaVersion when provided", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event", { key: "value" }, "2.0.0");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.schemaVersion).toBe("2.0.0");
    });

    it("should default schemaVersion to null", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event", { key: "value" });

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.schemaVersion).toBeNull();
    });

    it("should include eventId", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.eventId).toBeDefined();
      expect(typeof savedEvents[0]?.eventId).toBe("string");
    });

    it("should include anonymousId", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.anonymousId).toBe(client.getAnonymousId());
    });

    it("should include sdk info", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.sdk).toMatchObject({
        name: expect.any(String) as string,
        version: expect.any(String) as string,
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

    it("should default metadata to empty object when none set", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.metadata).toEqual({});
    });

    it("should enqueue event when sampler returns true", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        config: { eventSampler: () => true },
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event");

      expect(storageAdapter.save).toHaveBeenCalledTimes(1);
    });

    it("should drop event when sampler returns false", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        config: { eventSampler: () => false },
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event");

      expect(storageAdapter.save).not.toHaveBeenCalled();
    });

    it("should pass the constructed event to the sampler", async () => {
      const sampler = vi.fn().mockReturnValue(true);
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        config: { eventSampler: sampler },
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("test_event", { key: "value" });

      expect(sampler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test_event",
          payload: { key: "value" },
        }),
      );
    });

    it("should track predefined events with type safety", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.track("product_viewed", {
        product: { productId: "123", price: { amount: 10, currency: "USD" } },
      });

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "product_viewed",
        payload: {
          product: { productId: "123", price: { amount: 10, currency: "USD" } },
        },
      });
    });
  });

  describe("identify", () => {
    it("should track user_identified event", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.identify("user-123", { email: "test@example.com" });

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "user_identified",
        payload: { userId: "user-123", traits: { email: "test@example.com" } },
      });
    });

    it("should pass schemaVersion", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.identify("user-123", {}, "1.0.0");

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]?.schemaVersion).toBe("1.0.0");
    });
  });

  describe("click", () => {
    it("should track clicked event", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.click({ elementId: "btn-1", elementType: "button" });

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "clicked",
        payload: { elementId: "btn-1", elementType: "button" },
      });
    });
  });

  describe("view", () => {
    it("should track viewed event", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        storageAdapter,
        httpAdapter: createMockHttpAdapter(),
      });

      await client.init();
      await client.view({ elementId: "banner-1" });

      const savedEvents = vi.mocked(storageAdapter.save).mock
        .calls[0]?.[0] as Event<TestMetadata>[];

      expect(savedEvents[0]).toMatchObject({
        name: "viewed",
        payload: { elementId: "banner-1" },
      });
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

  describe("getAnonymousId", () => {
    it("should return a non-empty string", () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      expect(client.getAnonymousId()).toBeDefined();
      expect(client.getAnonymousId().length).toBeGreaterThan(0);
    });
  });

  describe("getUserId", () => {
    it("should return null by default", () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      expect(client.getUserId()).toBeNull();
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
    it("should dispose client without error", () => {
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

      await client.init();

      expect(client.getMetadata()).toEqual({});
    });

    it("should clear anonymousId on dispose", async () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      await client.init();
      client.dispose();

      expect(client.getAnonymousId()).toBe("");
    });

    it("should clear userId on dispose", async () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      await client.init();
      client.dispose();

      expect(client.getUserId()).toBeNull();
    });

    it("should allow re-initialization after dispose", async () => {
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter: createMockStorageAdapter(),
      });

      await client.init();
      client.dispose();

      await expect(client.init()).resolves.not.toThrow();
    });

    it("should work normally after dispose and re-init", async () => {
      const storageAdapter = createMockStorageAdapter();
      const client = createTestClient({
        httpAdapter: createMockHttpAdapter(),
        storageAdapter,
      });

      await client.init();
      client.setMetadata("userId", "123");
      await client.track("user_signup", {
        email: "test@example.com",
        plan: "premium",
      });

      client.dispose();

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

      await client.track("user_signup", {
        email: "test@example.com",
        plan: "premium",
      });

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

      await client.init();

      await client.track("user_signup", {
        email: "test@example.com",
        plan: "premium",
      });

      expect(storageAdapter.save).toHaveBeenCalledTimes(1);
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
        client.track(`event_${i}` as keyof TestCustomEvents),
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
