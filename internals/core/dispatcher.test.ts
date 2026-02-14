import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpAdapter } from "./adapters/http-adapter.ts";
import {
  StorageQuotaExceededError,
  type StorageAdapter,
} from "./adapters/storage-adapter.ts";
import { Dispatcher, type DispatcherConfig } from "./dispatcher.ts";
import { NoOpLoggerAdapter } from "./logger.ts";
import type { Event } from "./types.ts";

type TestMetadata = {
  userId: string;
  schemaVersion: string;
  eventType: string;
};

const createMockHttpAdapter = (): HttpAdapter => ({
  send: vi.fn().mockResolvedValue({ status: 200 }),
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
  loggerAdapter: new NoOpLoggerAdapter(),
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

    it("should rebatch events when queue exceeds maxBatchSize", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 3 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      // Manually restore 7 events to simulate offline accumulation
      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([
        createEvent("event1"),
        createEvent("event2"),
        createEvent("event3"),
        createEvent("event4"),
        createEvent("event5"),
        createEvent("event6"),
        createEvent("event7"),
      ]);

      await dispatcher.restore();
      await dispatcher.flush();

      // Should send 3 batches: [1,2,3], [4,5,6], [7]
      expect(httpAdapter.send).toHaveBeenCalledTimes(3);

      const calls = (httpAdapter.send as ReturnType<typeof vi.fn>).mock.calls;

      expect(calls[0]?.[1]).toHaveLength(3);
      expect(calls[1]?.[1]).toHaveLength(3);
      expect(calls[2]?.[1]).toHaveLength(1);
    });

    it("should send single batch when queue size equals maxBatchSize", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 3 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([
        createEvent("event1"),
        createEvent("event2"),
        createEvent("event3"),
      ]);

      await dispatcher.restore();
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
      expect(
        (httpAdapter.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[1],
      ).toHaveLength(3);
    });

    it("should send single batch when queue size is less than maxBatchSize", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 10 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([
        createEvent("event1"),
        createEvent("event2"),
      ]);

      await dispatcher.restore();
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
      expect(
        (httpAdapter.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[1],
      ).toHaveLength(2);
    });

    it("should maintain event order across rebatched sends", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 2 });
      const dispatcher = new Dispatcher(config, httpAdapter, storageAdapter);

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([
        createEvent("event1"),
        createEvent("event2"),
        createEvent("event3"),
        createEvent("event4"),
        createEvent("event5"),
      ]);

      await dispatcher.restore();
      await dispatcher.flush();

      const calls = (httpAdapter.send as ReturnType<typeof vi.fn>).mock
        .calls as Array<[string, Array<Event<TestMetadata>>, object, string]>;

      expect(calls[0]?.[1]?.[0]?.name).toBe("event1");
      expect(calls[0]?.[1]?.[1]?.name).toBe("event2");
      expect(calls[1]?.[1]?.[0]?.name).toBe("event3");
      expect(calls[1]?.[1]?.[1]?.name).toBe("event4");
      expect(calls[2]?.[1]?.[0]?.name).toBe("event5");
    });
  });

  describe("retry logic", () => {
    it("should clear storage on successful request", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockResolvedValue({
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
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 200 });

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

    it("should not retry on 4xx client error and should drop events", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 400,
      });

      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));
      const saveCallsAfterEnqueue = (
        storageAdapter.save as ReturnType<typeof vi.fn>
      ).mock.calls.length;

      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
      expect(storageAdapter.clear).toHaveBeenCalled();
      // Verify no additional save calls after flush (only the one from enqueue)
      expect(storageAdapter.save).toHaveBeenCalledTimes(saveCallsAfterEnqueue);
    });

    it("should drop events on unexpected status codes (3xx)", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 302,
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
      expect(storageAdapter.clear).toHaveBeenCalled();
    });

    it("should retry on exception", async () => {
      const httpAdapter = createMockHttpAdapter();

      (httpAdapter.send as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ status: 200 });

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
        .mockResolvedValueOnce({ status: 200 });

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
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 200 });

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

    it("should prevent enqueue after disposal", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const loggerAdapter = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(loggerAdapter, "warn");
      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter }),
        httpAdapter,
        storageAdapter,
      );

      dispatcher.dispose();
      await dispatcher.enqueue(createEvent("test"));

      expect(warnSpy).toHaveBeenCalledWith(
        "Cannot enqueue event: Dispatcher has been disposed",
      );
      expect(storageAdapter.save).not.toHaveBeenCalled();
    });

    it("should prevent scheduling flush after disposal", async () => {
      vi.useFakeTimers();
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      dispatcher.dispose();
      await dispatcher.enqueue(createEvent("test"));

      vi.advanceTimersByTime(10000);

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should allow restore after disposal", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      vi.mocked(storageAdapter.load).mockResolvedValue([createEvent("test")]);

      const dispatcher = new Dispatcher(
        createConfig(),
        httpAdapter,
        storageAdapter,
      );

      dispatcher.dispose();
      await dispatcher.restore();
      await dispatcher.enqueue(createEvent("new_event"));

      expect(storageAdapter.save).toHaveBeenCalled();
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

  describe("storage error handling", () => {
    it("should log error when save fails during enqueue", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(storageAdapter.save).mockRejectedValue(
        new Error("QuotaExceededError"),
      );

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to persist events to storage",
        expect.objectContaining({
          error: "QuotaExceededError",
        }),
      );
    });

    it("should log warning when StorageQuotaExceededError during enqueue", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      vi.mocked(storageAdapter.save).mockRejectedValue(
        new StorageQuotaExceededError(5, 5),
      );

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Storage quota exceeded"),
      );
    });

    it("should log error when clear fails after successful send", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(storageAdapter.clear).mockRejectedValue(
        new Error("Storage error"),
      );

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to clear storage after successful send",
        expect.objectContaining({
          error: "Storage error",
        }),
      );
    });

    it("should log error when clear fails after 4xx error", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(httpAdapter.send).mockResolvedValue({ status: 400 });
      vi.mocked(storageAdapter.clear).mockRejectedValue(
        new Error("Storage error"),
      );

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to clear storage after 4xx error",
        expect.objectContaining({
          error: "Storage error",
        }),
      );
    });

    it("should log error when save fails after max retries", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(httpAdapter.send).mockResolvedValue({ status: 500 });
      vi.mocked(storageAdapter.save).mockResolvedValueOnce(undefined); // First save during enqueue
      vi.mocked(storageAdapter.save).mockRejectedValueOnce(
        new Error("Storage full"),
      ); // Second save after retries

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger, maxRetries: 0 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to persist events after max retries",
        expect.objectContaining({
          error: "Storage full",
        }),
      );
    });

    it("should log error when save fails after network error", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(httpAdapter.send).mockRejectedValue(new Error("Network error"));
      vi.mocked(storageAdapter.save).mockResolvedValueOnce(undefined); // First save during enqueue
      vi.mocked(storageAdapter.save).mockRejectedValueOnce(
        new Error("Storage full"),
      ); // Second save after network error

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger, maxRetries: 0 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to persist events after network error",
        expect.objectContaining({
          error: "Storage full",
        }),
      );
    });

    it("should log warning when StorageQuotaExceededError during requeue", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      vi.mocked(httpAdapter.send).mockResolvedValue({ status: 500 });
      vi.mocked(storageAdapter.save).mockResolvedValueOnce(undefined);
      vi.mocked(storageAdapter.save).mockRejectedValueOnce(
        new StorageQuotaExceededError(5, 5),
      );

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger, maxRetries: 0 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Storage quota exceeded"),
      );
    });

    it("should log error when restore fails", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(storageAdapter.load).mockRejectedValue(
        new Error("Failed to read storage"),
      );

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.restore();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to restore events from storage",
        expect.objectContaining({
          error: "Failed to read storage",
        }),
      );
    });

    it("should handle non-Error objects in storage errors", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(storageAdapter.save).mockRejectedValue("String error");

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to persist events to storage",
        expect.objectContaining({
          error: "String error",
        }),
      );
    });

    it("should handle non-Error objects in clear errors", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(storageAdapter.clear).mockRejectedValue({
        code: "ERR_STORAGE",
      });

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to clear storage after successful send",
        expect.objectContaining({
          error: "[object Object]",
        }),
      );
    });

    it("should handle non-Error objects in clear errors after 4xx", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(httpAdapter.send).mockResolvedValue({ status: 400 });
      vi.mocked(storageAdapter.clear).mockRejectedValue("Clear failed");

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to clear storage after 4xx error",
        expect.objectContaining({
          error: "Clear failed",
        }),
      );
    });

    it("should handle non-Error objects in save after max retries", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(httpAdapter.send).mockResolvedValue({ status: 500 });
      vi.mocked(storageAdapter.save).mockResolvedValueOnce(undefined);
      vi.mocked(storageAdapter.save).mockRejectedValueOnce(null);

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger, maxRetries: 0 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to persist events after max retries",
        expect.objectContaining({
          error: "null",
        }),
      );
    });

    it("should handle non-Error objects in save after network error", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(httpAdapter.send).mockRejectedValue(new Error("Network error"));
      vi.mocked(storageAdapter.save).mockResolvedValueOnce(undefined);
      vi.mocked(storageAdapter.save).mockRejectedValueOnce(undefined);

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger, maxRetries: 0 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("test"));
      await dispatcher.flush();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to persist events after network error",
        expect.objectContaining({
          error: "undefined",
        }),
      );
    });

    it("should handle non-Error objects in restore errors", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const loggerSpy = vi.spyOn(logger, "error");

      vi.mocked(storageAdapter.load).mockRejectedValue(123);

      const dispatcher = new Dispatcher(
        createConfig({ loggerAdapter: logger }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.restore();

      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to restore events from storage",
        expect.objectContaining({
          error: "123",
        }),
      );
    });
  });

  describe("maxBufferSize", () => {
    it("should apply FIFO eviction when limit exceeded during enqueue", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig({ maxBufferSize: 2 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));
      await dispatcher.enqueue(createEvent("event3"));

      // Should only save last 2 events
      expect(storageAdapter.save).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "event2" }),
          expect.objectContaining({ name: "event3" }),
        ]),
      );
      expect(
        (storageAdapter.save as ReturnType<typeof vi.fn>).mock.lastCall![0],
      ).toHaveLength(2);
    });

    it("should apply limit when re-queuing after max retries", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      vi.mocked(httpAdapter.send).mockResolvedValue({ status: 500 });

      const dispatcher = new Dispatcher(
        createConfig({ maxBufferSize: 2, maxRetries: 0 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));
      await dispatcher.enqueue(createEvent("event3"));

      // Clear the save calls from enqueue
      vi.mocked(storageAdapter.save).mockClear();

      await dispatcher.flush();

      // After failed flush, should re-queue and apply limit
      expect(storageAdapter.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "event2" }),
          expect.objectContaining({ name: "event3" }),
        ]),
      );
      expect(
        (storageAdapter.save as ReturnType<typeof vi.fn>).mock.lastCall![0],
      ).toHaveLength(2);
    });

    it("should not apply limit when under threshold", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig({ maxBufferSize: 10 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));

      expect(storageAdapter.save).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "event1" }),
          expect.objectContaining({ name: "event2" }),
        ]),
      );
      expect(
        (storageAdapter.save as ReturnType<typeof vi.fn>).mock.lastCall![0],
      ).toHaveLength(2);
    });

    it("should work without limit when not configured", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig(), // No limit
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));
      await dispatcher.enqueue(createEvent("event3"));

      // Should save all events
      expect(storageAdapter.save).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "event1" }),
          expect.objectContaining({ name: "event2" }),
          expect.objectContaining({ name: "event3" }),
        ]),
      );
      expect(
        (storageAdapter.save as ReturnType<typeof vi.fn>).mock.lastCall![0],
      ).toHaveLength(3);
    });

    it("should apply limit during restore", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();

      (storageAdapter.load as ReturnType<typeof vi.fn>).mockResolvedValue([
        createEvent("event1"),
        createEvent("event2"),
        createEvent("event3"),
        createEvent("event4"),
        createEvent("event5"),
      ]);

      const dispatcher = new Dispatcher(
        createConfig({ maxBufferSize: 2 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.restore();
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);

      const sentEvents = (httpAdapter.send as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[1] as Event<Record<string, unknown>>[];

      expect(sentEvents).toHaveLength(2);
      expect(sentEvents[0]).toMatchObject({ name: "event4" });
      expect(sentEvents[1]).toMatchObject({ name: "event5" });
    });
  });

  describe("configuration validation", () => {
    it("should warn when maxBufferSize < maxBatchSize", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      new Dispatcher(
        {
          ...createConfig({ maxBatchSize: 100, maxBufferSize: 50 }),
          loggerAdapter: logger,
        },
        httpAdapter,
        storageAdapter,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "maxBufferSize (50) is less than maxBatchSize (100)",
        ),
      );
    });

    it("should not warn when maxBufferSize >= maxBatchSize", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      new Dispatcher(
        {
          ...createConfig({ maxBatchSize: 10, maxBufferSize: 100 }),
          loggerAdapter: logger,
        },
        httpAdapter,
        storageAdapter,
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("should not warn when maxBufferSize is undefined", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      new Dispatcher(
        { ...createConfig({ maxBatchSize: 10 }), loggerAdapter: logger },
        httpAdapter,
        storageAdapter,
      );

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
