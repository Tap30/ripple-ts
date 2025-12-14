import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpAdapter } from "./adapters/http-adapter.ts";
import type { StorageAdapter } from "./adapters/storage-adapter.ts";
import { Dispatcher } from "./dispatcher.ts";
import type { DispatcherConfig, Event } from "./types.ts";

type TestMetadata = {
  userId: string;
  schemaVersion: string;
  eventType: string;
};

const createMockHttpAdapter = (): HttpAdapter => ({
  send: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
});

const createMockStorageAdapter = (): StorageAdapter => ({
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
});

const createConfig = (
  overrides?: Partial<DispatcherConfig>,
): DispatcherConfig => ({
  apiKey: "test-key",
  apiKeyHeader: "X-API-Key",
  endpoint: "https://api.test.com/events",
  flushInterval: 5000,
  maxBatchSize: 10,
  maxRetries: 3,
  ...overrides,
});

const createEvent = (name: string): Event<TestMetadata> => ({
  name,
  payload: { test: "data" },
  metadata: { userId: "123", schemaVersion: "1.0", eventType: "test" },
  issuedAt: Date.now(),
  sessionId: "session-123",
  platform: null,
});

const createEventWithoutMetadata = (name: string): Event<TestMetadata> => ({
  name,
  payload: { test: "data" },
  metadata: null,
  issuedAt: Date.now(),
  sessionId: "session-123",
  platform: null,
});

describe("Dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("enqueue", () => {
    it("should add event to queue", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({ name: "test" }),
      ]);
    });

    it("should trigger auto-flush when batch size reached", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 2 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));

      expect(httpAdapter.send).toHaveBeenCalledWith(
        config.endpoint,
        expect.arrayContaining([
          expect.objectContaining({ name: "event1" }),
          expect.objectContaining({ name: "event2" }),
        ]),
        expect.objectContaining({ [config.apiKeyHeader]: config.apiKey }),
        config.apiKeyHeader,
      );
    });

    it("should schedule flush when batch size not reached", async () => {
      vi.useFakeTimers();
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ flushInterval: 1000 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      await dispatcher.enqueue(createEvent("test"));

      expect(httpAdapter.send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(httpAdapter.send).toHaveBeenCalled();
    });

    it("should not schedule multiple timers", async () => {
      vi.useFakeTimers();
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));

      const timerCount = vi.getTimerCount();

      expect(timerCount).toBe(1);
    });
  });

  describe("flush", () => {
    it("should send queued events", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));
      await dispatcher.flush();

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

    it("should clear storage on successful send", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(storageAdapter.clear).toHaveBeenCalled();
    });

    it("should do nothing if queue is empty", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.flush();

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should cancel scheduled flush", async () => {
      vi.useFakeTimers();
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      vi.advanceTimersByTime(10000);

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent flush calls", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));

      await Promise.all([
        dispatcher.flush(),
        dispatcher.flush(),
        dispatcher.flush(),
      ]);

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry logic", () => {
    it("should clear storage on successful request", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
      expect(storageAdapter.clear).toHaveBeenCalled();
    });

    it("should retry on 5xx server error", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 4xx client error", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
      });

      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({ name: "event1" }),
      ]);
    });

    it("should retry on exception", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(2);
    });

    it("should retry on non-Error exception", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce("String error")
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(2);
    });

    it("should handle non-Error exception after max retries", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockRejectedValue(
        "String error",
      );

      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig({ maxRetries: 2 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(storageAdapter.save).toHaveBeenCalled();
    });

    it("should respect maxRetries for 5xx server errors", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 2 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(3);
    });

    it("should re-queue events after max retries on 5xx server error", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 1 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({ name: "event1" }),
      ]);
    });

    it("should re-queue events after max retries on exception", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 1 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({ name: "event1" }),
      ]);
    }, 10000);

    it("should maintain order when re-queuing after exception", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 0 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();
      await dispatcher.enqueue(createEvent("event2"));

      const calls = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls as Array<[Array<Event<TestMetadata>>]>;

      const lastCall = calls[calls.length - 1]?.[0];

      expect(lastCall).toEqual([
        expect.objectContaining({ name: "event1" }),
        expect.objectContaining({ name: "event2" }),
      ]);
    });

    it("should apply exponential backoff", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe("restore", () => {
    it("should load persisted events", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const persistedEvents = [
        createEvent("persisted1"),
        createEvent("persisted2"),
      ];

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue(
        persistedEvents,
      );

      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.restore();
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ name: "persisted1" }),
          expect.objectContaining({ name: "persisted2" }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should handle empty storage", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.restore();
      await dispatcher.flush();

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should schedule flush after restoring events", async () => {
      vi.useFakeTimers();
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const persistedEvents = [createEvent("persisted")];

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue(
        persistedEvents,
      );

      const dispatcher = new Dispatcher(
        createConfig({ flushInterval: 5000 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.restore();

      expect(httpAdapter.send).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(5000);

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ name: "persisted" }),
        ]),
        expect.any(Object),
        expect.any(String),
      );

      vi.useRealTimers();
    });

    it("should not schedule flush when no events restored", async () => {
      vi.useFakeTimers();
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const dispatcher = new Dispatcher(
        createConfig({ flushInterval: 5000 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.restore();
      await vi.advanceTimersByTimeAsync(5000);

      expect(httpAdapter.send).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("dispose", () => {
    it("should cancel scheduled flush", async () => {
      vi.useFakeTimers();
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      dispatcher.dispose();

      vi.advanceTimersByTime(10000);

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should handle dispose with no timer", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      expect(() => dispatcher.dispose()).not.toThrow();
    });

    it("should allow multiple dispose calls", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      dispatcher.dispose();
      dispatcher.dispose();
      dispatcher.dispose();

      expect(() => dispatcher.dispose()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle enqueue during flush", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));

      const flushPromise = dispatcher.flush();

      await dispatcher.enqueue(createEvent("event2"));

      await flushPromise;

      const calls = (storageAdapter.save as ReturnType<typeof vi.fn>).mock
        .calls as Array<[Array<Event<TestMetadata>>]>;

      const lastCall = calls[calls.length - 1]?.[0];

      expect(lastCall?.some(e => e.name === "event2")).toBe(true);
    });

    it("should handle rapid enqueue calls", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      const promises = Array.from({ length: 100 }, (_, i) =>
        dispatcher.enqueue(createEvent(`event${i}`)),
      );

      await Promise.all(promises);

      expect(storageAdapter.save).toHaveBeenCalled();
    });

    it("should send correct headers", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({
        apiKey: "secret-key",
        apiKeyHeader: "Authorization",
      });

      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          Authorization: "secret-key",
          "Content-Type": "application/json",
        }),
        "Authorization",
      );
    });

    it("should handle events with typed metadata", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher<TestMetadata>(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      const eventWithMetadata = createEvent("metadata_test");

      await dispatcher.enqueue(eventWithMetadata);
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            name: "metadata_test",
            metadata: {
              userId: "123",
              schemaVersion: "1.0",
              eventType: "test",
            },
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });

    it("should handle events without metadata", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher<TestMetadata>(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      const eventWithoutMetadata =
        createEventWithoutMetadata("no_metadata_test");

      await dispatcher.enqueue(eventWithoutMetadata);
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            name: "no_metadata_test",
            metadata: null,
          }),
        ]),
        expect.any(Object),
        expect.any(String),
      );
    });
  });
});
