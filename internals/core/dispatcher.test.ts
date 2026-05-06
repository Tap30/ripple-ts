import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  HttpAdapter,
  HttpAdapterContext,
} from "./adapters/http-adapter.ts";
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
  close: vi.fn().mockResolvedValue(undefined),
});

const createConfig = (
  overrides?: Partial<DispatcherConfig>,
): DispatcherConfig => ({
  apiKey: "test-key",
  apiKeyHeader: "X-API-Key",
  endpoint: "https://api.test.com/events",
  flushInterval: 5000,
  maxBatchSize: 10,
  maxBufferSize: Number.MAX_SAFE_INTEGER,
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

const createDispatcher = (opts: {
  config: DispatcherConfig;
  httpAdapter: HttpAdapter;
  storageAdapter: StorageAdapter;
}): Dispatcher => {
  const { config, httpAdapter, storageAdapter } = opts ?? {};

  return new Dispatcher(config, httpAdapter, storageAdapter);
};

describe("Dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("enqueue", () => {
    it("should add event to buffer and persist", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("test"));

      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({ name: "test" }),
      ]);
    });

    it("should trigger auto-flush when batch size reached", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 2 });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyHeader: config.apiKeyHeader,
          headers: expect.objectContaining({
            [config.apiKeyHeader]: config.apiKey,
          }) as object,
          endpoint: config.endpoint,
          events: expect.arrayContaining([
            expect.objectContaining({ name: "event1" }),
            expect.objectContaining({ name: "event2" }),
          ]) as Array<unknown>,
        } as HttpAdapterContext),
      );
    });

    it("should schedule flush when batch size not reached", async () => {
      vi.useFakeTimers();

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ flushInterval: 1000 });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await vi.advanceTimersByTimeAsync(1000);

      expect(httpAdapter.send).toHaveBeenCalled();
    });

    it("should not enqueue after disposal", async () => {
      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      dispatcher.dispose();

      await dispatcher.enqueue(createEvent("test"));

      expect(warnSpy).toHaveBeenCalledWith(
        "Cannot enqueue event: Dispatcher has been disposed",
      );
      expect(storageAdapter.save).not.toHaveBeenCalled();
    });
  });

  describe("flush", () => {
    it("should send queued events and clear storage", async () => {
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

      expect(httpAdapter.send).toHaveBeenCalled();
      expect(storageAdapter.clear).toHaveBeenCalled();
    });

    it("should do nothing if buffer is empty", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.flush();

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should handle concurrent flush calls", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await Promise.all([dispatcher.flush(), dispatcher.flush()]);

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
    });

    it("should rebatch events when buffer exceeds maxBatchSize", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 2 });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.enqueue(createEvent("event2"));
      await dispatcher.enqueue(createEvent("event3"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(2);
    });
  });

  describe("retry logic", () => {
    it("should retry on 5xx server error", async () => {
      const httpAdapter = createMockHttpAdapter();

      vi.mocked(httpAdapter.send)
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 200 });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 4xx client error and drop events", async () => {
      const httpAdapter = createMockHttpAdapter();

      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      vi.mocked(httpAdapter.send).mockResolvedValue({
        status: 400,
      });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "4xx client error, dropping events",
        expect.any(Object),
      );
      expect(storageAdapter.clear).toHaveBeenCalled();
    });

    it("should drop events on unexpected status codes (3xx)", async () => {
      const httpAdapter = createMockHttpAdapter();

      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      vi.mocked(httpAdapter.send).mockResolvedValue({
        status: 301,
      });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "Unexpected status code, dropping events",
        expect.any(Object),
      );
      expect(storageAdapter.clear).toHaveBeenCalled();
    });

    it("should retry on exception", async () => {
      const httpAdapter = createMockHttpAdapter();

      vi.mocked(httpAdapter.send)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ status: 200 });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(2);
    });

    it("should retry on non-Error exception", async () => {
      const httpAdapter = createMockHttpAdapter();

      vi.mocked(httpAdapter.send)
        .mockRejectedValueOnce("string error")
        .mockResolvedValueOnce({ status: 200 });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(2);
    });

    it("should re-queue events after max retries", async () => {
      const httpAdapter = createMockHttpAdapter();

      vi.mocked(httpAdapter.send).mockResolvedValue({
        status: 500,
      });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 2 });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(3);
      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({ name: "event1" }),
      ]);
    });

    it("should re-queue events after max retries on network error", async () => {
      const httpAdapter = createMockHttpAdapter();

      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      vi.mocked(httpAdapter.send).mockRejectedValue(new Error("Network error"));

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 2, loggerAdapter: logger });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalledTimes(3);
      expect(errorSpy).toHaveBeenCalledWith(
        "Network error, max retries reached",
        expect.any(Object),
      );
      expect(storageAdapter.save).toHaveBeenCalledWith([
        expect.objectContaining({ name: "event1" }),
      ]);
    });

    it("should apply exponential backoff", async () => {
      vi.useFakeTimers();

      const httpAdapter = createMockHttpAdapter();

      vi.mocked(httpAdapter.send)
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 200 });

      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      const flushPromise = dispatcher.flush();

      await vi.runAllTimersAsync();
      await flushPromise;

      expect(httpAdapter.send).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  describe("restore", () => {
    it("should load persisted events and schedule flush", async () => {
      vi.useFakeTimers();

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const events = [createEvent("event1"), createEvent("event2")];
      const config = createConfig({ flushInterval: 1000 });

      vi.mocked(storageAdapter.load).mockResolvedValue(events);

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.restore();
      await vi.advanceTimersByTimeAsync(1000);

      expect(httpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyHeader: expect.any(String) as string,
          headers: expect.any(Object) as object,
          endpoint: expect.any(String) as string,
          events: expect.arrayContaining([
            expect.objectContaining({ name: "event1" }),
            expect.objectContaining({ name: "event2" }),
          ]) as Array<unknown>,
        } as HttpAdapterContext),
      );
    });

    it("should handle empty storage", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.restore();
      await dispatcher.flush();

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should log error when restore fails", async () => {
      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });

      vi.mocked(storageAdapter.load).mockRejectedValue(new Error("Load error"));

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.restore();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to restore events from storage",
        expect.objectContaining({ error: "Load error" }),
      );
    });

    it("should handle non-Error objects in restore errors", async () => {
      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });

      vi.mocked(storageAdapter.load).mockRejectedValue("string error");

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.restore();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to restore events from storage",
        expect.objectContaining({ error: "string error" }),
      );
    });
  });

  describe("dispose", () => {
    it("should cancel scheduled flush", async () => {
      vi.useFakeTimers();

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const dispatcher = new Dispatcher(
        createConfig({ flushInterval: 1000 }),
        httpAdapter,
        storageAdapter,
      );

      await dispatcher.enqueue(createEvent("event1"));

      dispatcher.dispose();

      await vi.advanceTimersByTimeAsync(1000);

      expect(httpAdapter.send).not.toHaveBeenCalled();
    });

    it("should allow multiple dispose calls", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig();
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      expect(() => {
        dispatcher.dispose();
        dispatcher.dispose();
      }).not.toThrow();
    });

    it("should allow restore after disposal", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const events = [createEvent("event1")];
      const config = createConfig();

      vi.mocked(storageAdapter.load).mockResolvedValue(events);

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      dispatcher.dispose();

      await dispatcher.restore();
      await dispatcher.flush();

      expect(httpAdapter.send).toHaveBeenCalled();
    });

    it("should cancel pending retry delays on disposal", async () => {
      let sendCount = 0;

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 3 });

      vi.mocked(httpAdapter.send).mockImplementation(() => {
        sendCount++;

        return Promise.resolve({ status: 500 });
      });

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      const flushPromise = dispatcher.flush();

      // Wait for first send attempt
      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, 10);
      });

      // Dispose to abort retry delays
      dispatcher.dispose();

      await flushPromise;

      // Should only have attempted once before disposal aborted retries
      expect(sendCount).toBe(1);
    });

    it("should cancel network error retry delays on disposal", async () => {
      let sendCount = 0;

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 3 });

      vi.mocked(httpAdapter.send).mockImplementation(() => {
        sendCount++;

        return Promise.reject(new Error("Network error"));
      });

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      const flushPromise = dispatcher.flush();

      // Wait for first send attempt
      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, 10);
      });

      // Dispose to abort retry delays
      dispatcher.dispose();
      await flushPromise;

      // Should only have attempted once before disposal aborted retries
      expect(sendCount).toBe(1);
    });
  });

  describe("storage error handling", () => {
    it("should log error when save fails during enqueue", async () => {
      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });

      vi.mocked(storageAdapter.save).mockRejectedValue(new Error("Save error"));

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to persist events to storage",
        expect.objectContaining({ error: "Save error", queueSize: 1 }),
      );
    });

    it("should log warning when StorageQuotaExceededError during enqueue", async () => {
      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });

      vi.mocked(storageAdapter.save).mockRejectedValue(
        new StorageQuotaExceededError(5, 2),
      );

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Storage quota exceeded"),
      );
    });

    it("should log error when clear fails after successful send", async () => {
      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });

      vi.mocked(storageAdapter.clear).mockRejectedValue(
        new Error("Clear error"),
      );

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to clear storage after successful send",
        expect.objectContaining({ error: "Clear error" }),
      );
    });

    it("should log error when clear fails after 4xx error", async () => {
      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });

      vi.mocked(httpAdapter.send).mockResolvedValue({ status: 400 });
      vi.mocked(storageAdapter.clear).mockRejectedValue(
        new Error("Clear error"),
      );

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to clear storage after 4xx error",
        expect.objectContaining({ error: "Clear error" }),
      );
    });

    it("should log error when save fails after max retries", async () => {
      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 1, loggerAdapter: logger });

      vi.mocked(httpAdapter.send).mockResolvedValue({ status: 500 });
      vi.mocked(storageAdapter.save)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error("Save error"));

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to persist events after max retries",
        expect.objectContaining({ error: "Save error" }),
      );
    });

    it("should log warning when StorageQuotaExceededError during requeue", async () => {
      const logger = new NoOpLoggerAdapter();
      const warnSpy = vi.spyOn(logger, "warn");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxRetries: 1, loggerAdapter: logger });

      vi.mocked(httpAdapter.send).mockResolvedValue({
        status: 500,
      });

      vi.mocked(storageAdapter.save)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new StorageQuotaExceededError(5, 2));

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Storage quota exceeded"),
      );
    });

    it("should handle non-Error objects in storage errors", async () => {
      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });

      vi.mocked(storageAdapter.save).mockRejectedValue("string error");

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to persist events to storage",
        expect.objectContaining({ error: "string error" }),
      );
    });

    it("should handle non-Error objects in clear errors", async () => {
      const logger = new NoOpLoggerAdapter();
      const errorSpy = vi.spyOn(logger, "error");

      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ loggerAdapter: logger });

      vi.mocked(storageAdapter.clear).mockRejectedValue("string error");

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.enqueue(createEvent("event1"));
      await dispatcher.flush();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to clear storage after successful send",
        expect.objectContaining({ error: "string error" }),
      );
    });
  });

  describe("maxBufferSize", () => {
    it("should apply FIFO eviction when buffer limit exceeded", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 10, maxBufferSize: 12 });
      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      for (let i = 1; i <= 25; i++) {
        await dispatcher.enqueue(createEvent(`event${i}`));
      }

      const lastCall = vi.mocked(storageAdapter.save).mock
        .lastCall![0] as Array<{ name: string }>;

      expect(lastCall).toHaveLength(5);
      expect(lastCall[0]?.name).toBe("event21");
      expect(lastCall[4]?.name).toBe("event25");
    });

    it("should apply limit when buffer exceeds maxBufferSize", async () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 10, maxBufferSize: 12 });
      const persistedEvents = Array.from({ length: 15 }, (_, i) =>
        createEvent(`persisted${i + 1}`),
      );

      vi.mocked(storageAdapter.load).mockResolvedValue(persistedEvents);

      const dispatcher = createDispatcher({
        config,
        httpAdapter,
        storageAdapter,
      });

      await dispatcher.restore();
      await dispatcher.enqueue(createEvent("new1"));

      const lastCall = vi.mocked(storageAdapter.save).mock
        .lastCall![0] as Array<{ name: string }>;

      expect(lastCall).toHaveLength(12);
      expect(lastCall[0]?.name).toBe("persisted5");
      expect(lastCall[11]?.name).toBe("new1");
    });
  });

  describe("configuration validation", () => {
    it("should throw when maxBufferSize < maxBatchSize", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 100, maxBufferSize: 50 });

      expect(() => {
        createDispatcher({ config, httpAdapter, storageAdapter });
      }).toThrow("Invalid configuration: maxBufferSize");
    });

    it("should not throw when maxBufferSize >= maxBatchSize", () => {
      const httpAdapter = createMockHttpAdapter();
      const storageAdapter = createMockStorageAdapter();
      const config = createConfig({ maxBatchSize: 10, maxBufferSize: 10 });

      expect(() => {
        createDispatcher({ config, httpAdapter, storageAdapter });
      }).not.toThrow();
    });
  });
});
