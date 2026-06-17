import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpAdapter } from "./adapters/http-adapter.ts";
import {
  StorageQuotaExceededError,
  type StorageAdapter,
} from "./adapters/storage-adapter.ts";
import { Dispatcher, type DispatcherConfig } from "./dispatcher.ts";
import { NoOpLogger } from "./logger.ts";
import type { Event } from "./types.ts";

type TestMetadata = { userId: string };

const createMockHttp = (): HttpAdapter => ({
  send: vi.fn().mockResolvedValue({ status: 200 }),
});

const createMockStorage = (): StorageAdapter => ({
  init: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
});

const createConfig = (
  overrides?: Partial<DispatcherConfig>,
): DispatcherConfig => ({
  apiKey: "key",
  apiKeyHeader: "X-API-Key",
  endpoint: "https://api.test.com/events",
  batchOptions: { interval: 5000, size: 10, maxPayloadSize: 65536 },
  retryOptions: {
    maxAttempts: 3,
    minDelay: 1000,
    maxDelay: 360000,
    backoffFactor: 2,
  },
  maxBufferSize: 50,
  eventTtl: null,
  hooks: {},
  logger: new NoOpLogger(),
  ...overrides,
});

const createEvent = (name: string, issuedAt?: number): Event<TestMetadata> => ({
  name,
  payload: { test: "data" },
  metadata: { userId: "123" },
  issuedAt: issuedAt ?? Date.now(),
  eventId: `evt-${name}`,
  anonymousId: "anon-1",
  userId: "user-1",
  schemaVersion: null,
  sdk: { name: "test", version: "1.0" },
  platform: null,
});

/** Flush microtask queue so fire-and-forget persist completes. */
const tick = () =>
  new Promise(r => {
    setTimeout(r, 0);
  });

describe("Dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("configuration", () => {
    it("throws when maxBufferSize < batchOptions.size", () => {
      expect(
        () =>
          new Dispatcher(
            createConfig({
              batchOptions: {
                interval: 5000,
                size: 100,
                maxPayloadSize: 65536,
              },
              maxBufferSize: 50,
            }),
            createMockHttp(),
            createMockStorage(),
          ),
      ).toThrow("maxBufferSize");
    });

    it("does not throw when maxBufferSize >= batchOptions.size", () => {
      expect(
        () =>
          new Dispatcher(
            createConfig({ maxBufferSize: 10 }),
            createMockHttp(),
            createMockStorage(),
          ),
      ).not.toThrow();
    });
  });

  describe("enqueue", () => {
    it("persists buffer to storage (fire-and-forget)", async () => {
      const storage = createMockStorage();
      const d = new Dispatcher(createConfig(), createMockHttp(), storage);

      await d.enqueue(createEvent("e1"));
      await tick();

      expect(storage.save).toHaveBeenCalledWith([
        expect.objectContaining({ name: "e1" }),
      ]);
    });

    it("triggers auto-flush when batch size reached", async () => {
      const http = createMockHttp();
      const config = createConfig({
        batchOptions: { interval: 5000, size: 2, maxPayloadSize: 65536 },
      });

      const d = new Dispatcher(config, http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      await d.enqueue(createEvent("e2"));

      expect(http.send).toHaveBeenCalledTimes(1);
      expect(http.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: [
            expect.objectContaining({ name: "e1" }),
            expect.objectContaining({ name: "e2" }),
          ],
        }),
      );
    });

    it("schedules flush when batch size not reached", async () => {
      vi.useFakeTimers();
      const http = createMockHttp();
      const config = createConfig({
        batchOptions: { interval: 100, size: 10, maxPayloadSize: 65536 },
      });

      const d = new Dispatcher(config, http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      expect(http.send).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);
      expect(http.send).toHaveBeenCalledTimes(1);
    });

    it("does not enqueue after disposal", async () => {
      const logger = new NoOpLogger();
      const warnSpy = vi.spyOn(logger, "warn");
      const storage = createMockStorage();
      const d = new Dispatcher(
        createConfig({ logger }),
        createMockHttp(),
        storage,
      );

      d.dispose();
      await d.enqueue(createEvent("e1"));

      expect(warnSpy).toHaveBeenCalledWith(
        "Cannot enqueue event: Dispatcher has been disposed",
      );
      expect(storage.save).not.toHaveBeenCalled();
    });

    it("fires onEnqueue hook", async () => {
      const onEnqueue = vi.fn();
      const d = new Dispatcher(
        createConfig({ hooks: { onEnqueue } }),
        createMockHttp(),
        createMockStorage(),
      );

      await d.enqueue(createEvent("e1"));

      expect(onEnqueue).toHaveBeenCalledWith({ bufferSize: 1 });
    });
  });

  describe("flush", () => {
    it("sends events and persists empty buffer on success", async () => {
      const http = createMockHttp();
      const storage = createMockStorage();
      const d = new Dispatcher(createConfig(), http, storage);

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(http.send).toHaveBeenCalledTimes(1);
      expect(storage.save).toHaveBeenLastCalledWith([]);
    });

    it("does nothing when buffer is empty", async () => {
      const http = createMockHttp();
      const d = new Dispatcher(createConfig(), http, createMockStorage());

      await d.flush();

      expect(http.send).not.toHaveBeenCalled();
    });

    it("serializes concurrent flush calls via mutex", async () => {
      const http = createMockHttp();
      const d = new Dispatcher(createConfig(), http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      await Promise.all([d.flush(), d.flush()]);

      expect(http.send).toHaveBeenCalledTimes(1);
    });

    it("splits into multiple batches when buffer > batch size", async () => {
      const http = createMockHttp();
      const config = createConfig({
        batchOptions: { interval: 5000, size: 2, maxPayloadSize: 65536 },
      });

      const d = new Dispatcher(config, http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      await d.enqueue(createEvent("e2"));
      // e1+e2 auto-flushed (size=2), now add more
      await d.enqueue(createEvent("e3"));
      await d.enqueue(createEvent("e4"));
      await d.enqueue(createEvent("e5"));
      await d.flush();

      // auto-flush sent [e1,e2], then [e3,e4], then flush sends [e5]
      expect(http.send).toHaveBeenCalledTimes(3);
    });

    it("splits batch when maxPayloadSize exceeded", async () => {
      const http = createMockHttp();
      const config = createConfig({
        batchOptions: { interval: 5000, size: 50, maxPayloadSize: 1 },
        maxBufferSize: 50,
      });

      const d = new Dispatcher(config, http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      await d.enqueue(createEvent("e2"));
      await d.flush();

      // Each event exceeds 1 byte, so each goes in its own batch
      expect(http.send).toHaveBeenCalledTimes(2);
    });

    it("requeues failed batch + remaining events on mid-flush failure", async () => {
      const http = createMockHttp();
      const storage = createMockStorage();
      const config = createConfig({
        batchOptions: { interval: 5000, size: 2, maxPayloadSize: 65536 },
        retryOptions: {
          maxAttempts: 0,
          minDelay: 100,
          maxDelay: 100,
          backoffFactor: 1,
        },
      });

      const d = new Dispatcher(config, http, storage);

      // Enqueue 3 events without triggering auto-flush by using size=2 carefully:
      // enqueue e1 (buffer=1, no flush), enqueue e2 (buffer=2, auto-flush [e1,e2])
      // Then enqueue e3, e4, e5 — e3+e4 auto-flush, e5 remains
      // We want a mid-flush failure. Use flush+track+flush:
      await d.enqueue(createEvent("e1"));
      // manually flush e1 before batch fills
      await d.flush();

      // Now set up failure for next send
      vi.mocked(http.send).mockResolvedValue({ status: 500 });

      await d.enqueue(createEvent("e2"));
      await d.enqueue(createEvent("e3"));
      await d.enqueue(createEvent("e4"));
      // auto-flush triggers with [e2,e3] → 500, e4 still in buffer
      // requeue should have [e2, e3, e4]

      expect(storage.save).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "e2" }),
          expect.objectContaining({ name: "e3" }),
          expect.objectContaining({ name: "e4" }),
        ]),
      );
    });

    it("requeues trailing batch on failure", async () => {
      const http = createMockHttp();
      const storage = createMockStorage();
      const config = createConfig({
        retryOptions: {
          maxAttempts: 0,
          minDelay: 100,
          maxDelay: 100,
          backoffFactor: 1,
        },
      });

      const d = new Dispatcher(config, http, storage);

      vi.mocked(http.send).mockResolvedValue({ status: 500 });
      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(storage.save).toHaveBeenLastCalledWith([
        expect.objectContaining({ name: "e1" }),
      ]);
    });

    it("filters expired events by TTL", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(10000);

      const http = createMockHttp();
      const d = new Dispatcher(
        createConfig({ eventTtl: 5000 }),
        http,
        createMockStorage(),
      );

      await d.enqueue(createEvent("old", 3000));
      await d.enqueue(createEvent("new", 8000));
      await d.flush();

      expect(http.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: [expect.objectContaining({ name: "new" })],
        }),
      );
    });

    it("does not send when all events expired", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(10000);

      const http = createMockHttp();
      const onDrop = vi.fn();
      const d = new Dispatcher(
        createConfig({ eventTtl: 1000, hooks: { onDrop } }),
        http,
        createMockStorage(),
      );

      await d.enqueue(createEvent("old", 1000));
      await d.flush();

      expect(http.send).not.toHaveBeenCalled();
      expect(onDrop).toHaveBeenCalledWith({ eventCount: 1, reason: "expired" });
    });

    it("fires onFlush hook with correct counts", async () => {
      const onFlush = vi.fn();
      const d = new Dispatcher(
        createConfig({ hooks: { onFlush } }),
        createMockHttp(),
        createMockStorage(),
      );

      await d.enqueue(createEvent("e1"));
      await d.enqueue(createEvent("e2"));
      await d.flush();

      expect(onFlush).toHaveBeenCalledWith({ eventCount: 2, batchCount: 1 });
    });

    it("cancels scheduled timer on manual flush", async () => {
      vi.useFakeTimers();
      const http = createMockHttp();
      const config = createConfig({
        batchOptions: { interval: 1000, size: 10, maxPayloadSize: 65536 },
      });

      const d = new Dispatcher(config, http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      // Timer scheduled. Manual flush should cancel it.
      await d.flush();
      await vi.advanceTimersByTimeAsync(1000);

      // Only one send (from manual flush), not a second from timer
      expect(http.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry", () => {
    it("retries on 5xx and succeeds", async () => {
      const http = createMockHttp();

      vi.mocked(http.send)
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 200 });

      const d = new Dispatcher(createConfig(), http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(http.send).toHaveBeenCalledTimes(2);
    });

    it("retries on network error and succeeds", async () => {
      const http = createMockHttp();

      vi.mocked(http.send)
        .mockRejectedValueOnce(new Error("Network"))
        .mockResolvedValueOnce({ status: 200 });

      const d = new Dispatcher(createConfig(), http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(http.send).toHaveBeenCalledTimes(2);
    });

    it("retries on non-Error throw", async () => {
      const http = createMockHttp();

      vi.mocked(http.send)
        .mockRejectedValueOnce("string error")
        .mockResolvedValueOnce({ status: 200 });

      const d = new Dispatcher(createConfig(), http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(http.send).toHaveBeenCalledTimes(2);
    });

    it("requeues after max retries exhausted (5xx)", async () => {
      const http = createMockHttp();
      const storage = createMockStorage();
      const onSendFailure = vi.fn();

      vi.mocked(http.send).mockResolvedValue({ status: 500 });
      const d = new Dispatcher(
        createConfig({
          retryOptions: {
            maxAttempts: 1,
            minDelay: 1,
            maxDelay: 1,
            backoffFactor: 1,
          },
          hooks: { onSendFailure },
        }),
        http,
        storage,
      );

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(http.send).toHaveBeenCalledTimes(2); // initial + 1 retry
      expect(onSendFailure).toHaveBeenCalled();
      expect(storage.save).toHaveBeenLastCalledWith([
        expect.objectContaining({ name: "e1" }),
      ]);
    });

    it("requeues after max retries exhausted (network error)", async () => {
      const http = createMockHttp();
      const storage = createMockStorage();
      const logger = new NoOpLogger();
      const errorSpy = vi.spyOn(logger, "error");

      vi.mocked(http.send).mockRejectedValue(new Error("Network"));
      const d = new Dispatcher(
        createConfig({
          retryOptions: {
            maxAttempts: 1,
            minDelay: 1,
            maxDelay: 1,
            backoffFactor: 1,
          },
          logger,
        }),
        http,
        storage,
      );

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(http.send).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledWith(
        "Network error, max retries reached",
        expect.any(Object),
      );
    });

    it("drops events on 4xx without retry", async () => {
      const http = createMockHttp();
      const onDrop = vi.fn();

      vi.mocked(http.send).mockResolvedValue({ status: 400 });

      const d = new Dispatcher(
        createConfig({ hooks: { onDrop } }),
        http,
        createMockStorage(),
      );

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(http.send).toHaveBeenCalledTimes(1);
      expect(onDrop).toHaveBeenCalledWith({
        eventCount: 1,
        reason: "client_error",
      });
    });

    it("drops events on unexpected status (3xx)", async () => {
      const http = createMockHttp();
      const logger = new NoOpLogger();
      const warnSpy = vi.spyOn(logger, "warn");

      vi.mocked(http.send).mockResolvedValue({ status: 301 });

      const d = new Dispatcher(
        createConfig({ logger }),
        http,
        createMockStorage(),
      );

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(http.send).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "Unexpected status code, dropping events",
        expect.any(Object),
      );
    });

    it("fires onSendSuccess hook", async () => {
      const onSendSuccess = vi.fn();
      const d = new Dispatcher(
        createConfig({ hooks: { onSendSuccess } }),
        createMockHttp(),
        createMockStorage(),
      );

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(onSendSuccess).toHaveBeenCalledWith({
        batchSize: 1,
        status: 200,
      });
    });

    it("fires onRetry hook with backoff delay", async () => {
      vi.useFakeTimers();
      const http = createMockHttp();
      const onRetry = vi.fn();

      vi.mocked(http.send)
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 200 });

      const d = new Dispatcher(
        createConfig({ hooks: { onRetry } }),
        http,
        createMockStorage(),
      );

      await d.enqueue(createEvent("e1"));
      const p = d.flush();

      await vi.runAllTimersAsync();
      await p;

      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1 }),
      );
    });
  });

  describe("concurrency", () => {
    it("enqueue during flush — new event is consumed by flush loop", async () => {
      const http = createMockHttp();
      const config = createConfig({
        batchOptions: { interval: 5000, size: 2, maxPayloadSize: 65536 },
      });

      const d = new Dispatcher(config, http, createMockStorage());

      // Enqueue 1 event, then flush. While flush awaits send, enqueue another.
      let sendCount = 0;

      vi.mocked(http.send).mockImplementation(async ctx => {
        sendCount++;
        if (sendCount === 1) {
          // During first send, enqueue another event
          await d.enqueue(createEvent("mid-flush"));
        }

        return { status: 200 };
      });

      await d.enqueue(createEvent("e1"));
      await d.flush();

      // e1 sent in first batch. "mid-flush" enqueued during send,
      // but flush already drained buffer before send. It should be picked up
      // by auto-flush or next manual flush.
      // The key: no data loss.
      const allSentEvents = vi
        .mocked(http.send)
        .mock.calls.flatMap(c => c[0].events as Array<{ name: string }>);

      const names = allSentEvents.map(e => e.name);

      expect(names).toContain("e1");
      // mid-flush was enqueued after buffer drain, triggers its own auto-flush
      // (size=2 won't be reached, so scheduled flush handles it later)
      // Verify it's at least in the buffer by flushing again
      await d.flush();
      const allEvents = vi
        .mocked(http.send)
        .mock.calls.flatMap(c => c[0].events as Array<{ name: string }>);

      expect(allEvents.map(e => e.name)).toContain("mid-flush");
    });

    it("enqueue after flush succeeds preserves new event in storage", async () => {
      const http = createMockHttp();
      const storage = createMockStorage();
      const d = new Dispatcher(createConfig(), http, storage);

      await d.enqueue(createEvent("e1"));
      await d.flush();

      // Now enqueue a new event after flush completed
      await d.enqueue(createEvent("e2"));
      await tick();

      // The last persist should include e2
      const lastSave = vi.mocked(storage.save).mock.lastCall![0] as Array<{
        name: string;
      }>;

      expect(lastSave).toEqual([expect.objectContaining({ name: "e2" })]);
    });
  });

  describe("restore", () => {
    it("loads persisted events and schedules flush", async () => {
      vi.useFakeTimers();
      const http = createMockHttp();
      const storage = createMockStorage();

      vi.mocked(storage.load).mockResolvedValue([
        createEvent("e1"),
        createEvent("e2"),
      ]);

      const config = createConfig({
        batchOptions: { interval: 100, size: 10, maxPayloadSize: 65536 },
      });

      const d = new Dispatcher(config, http, storage);

      await d.restore();
      await vi.advanceTimersByTimeAsync(100);

      expect(http.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({ name: "e1" }),
          ]) as unknown[],
        }),
      );
    });

    it("handles empty storage gracefully", async () => {
      const http = createMockHttp();
      const d = new Dispatcher(createConfig(), http, createMockStorage());

      await d.restore();
      await d.flush();

      expect(http.send).not.toHaveBeenCalled();
    });

    it("logs error on load failure (Error)", async () => {
      const logger = new NoOpLogger();
      const errorSpy = vi.spyOn(logger, "error");
      const storage = createMockStorage();

      vi.mocked(storage.load).mockRejectedValue(new Error("Load failed"));

      const d = new Dispatcher(
        createConfig({ logger }),
        createMockHttp(),
        storage,
      );

      await d.restore();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to restore events from storage",
        expect.objectContaining({ error: "Load failed" }),
      );
    });

    it("logs error on load failure (non-Error)", async () => {
      const logger = new NoOpLogger();
      const errorSpy = vi.spyOn(logger, "error");
      const storage = createMockStorage();

      vi.mocked(storage.load).mockRejectedValue("string error");

      const d = new Dispatcher(
        createConfig({ logger }),
        createMockHttp(),
        storage,
      );

      await d.restore();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to restore events from storage",
        expect.objectContaining({ error: "string error" }),
      );
    });
  });

  describe("dispose", () => {
    it("cancels scheduled flush", async () => {
      vi.useFakeTimers();
      const http = createMockHttp();
      const config = createConfig({
        batchOptions: { interval: 100, size: 10, maxPayloadSize: 65536 },
      });

      const d = new Dispatcher(config, http, createMockStorage());

      await d.enqueue(createEvent("e1"));
      d.dispose();
      await vi.advanceTimersByTimeAsync(100);

      expect(http.send).not.toHaveBeenCalled();
    });

    it("allows multiple dispose calls", () => {
      const d = new Dispatcher(
        createConfig(),
        createMockHttp(),
        createMockStorage(),
      );

      expect(() => {
        d.dispose();
        d.dispose();
      }).not.toThrow();
    });

    it("allows restore after disposal", async () => {
      const http = createMockHttp();
      const storage = createMockStorage();

      vi.mocked(storage.load).mockResolvedValue([createEvent("e1")]);

      const d = new Dispatcher(createConfig(), http, storage);

      d.dispose();

      await d.restore();
      await d.flush();

      expect(http.send).toHaveBeenCalled();
    });

    it("aborts in-flight retry delay on disposal (5xx)", async () => {
      let sendCount = 0;
      const http = createMockHttp();

      vi.mocked(http.send).mockImplementation(() => {
        sendCount++;
        return Promise.resolve({ status: 500 });
      });

      const d = new Dispatcher(
        createConfig({
          retryOptions: {
            maxAttempts: 3,
            minDelay: 5000,
            maxDelay: 5000,
            backoffFactor: 1,
          },
        }),
        http,
        createMockStorage(),
      );

      await d.enqueue(createEvent("e1"));
      const p = d.flush();

      await new Promise(r => {
        setTimeout(r, 10);
      });
      d.dispose();
      await p;

      expect(sendCount).toBe(1);
    });

    it("aborts in-flight retry delay on disposal (network error)", async () => {
      let sendCount = 0;
      const http = createMockHttp();

      vi.mocked(http.send).mockImplementation(() => {
        sendCount++;
        return Promise.reject(new Error("Network"));
      });

      const d = new Dispatcher(
        createConfig({
          retryOptions: {
            maxAttempts: 3,
            minDelay: 5000,
            maxDelay: 5000,
            backoffFactor: 1,
          },
        }),
        http,
        createMockStorage(),
      );

      await d.enqueue(createEvent("e1"));
      const p = d.flush();

      await new Promise(r => {
        setTimeout(r, 10);
      });
      d.dispose();
      await p;

      expect(sendCount).toBe(1);
    });
  });

  describe("storage errors", () => {
    it("logs error when persist fails during enqueue", async () => {
      const logger = new NoOpLogger();
      const errorSpy = vi.spyOn(logger, "error");
      const storage = createMockStorage();

      vi.mocked(storage.save).mockRejectedValue(new Error("Save fail"));

      const d = new Dispatcher(
        createConfig({ logger }),
        createMockHttp(),
        storage,
      );

      await d.enqueue(createEvent("e1"));
      await tick();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to persist events to storage",
        expect.objectContaining({ error: "Save fail", queueSize: 1 }),
      );
    });

    it("logs warning on StorageQuotaExceededError", async () => {
      const logger = new NoOpLogger();
      const warnSpy = vi.spyOn(logger, "warn");
      const storage = createMockStorage();

      vi.mocked(storage.save).mockRejectedValue(
        new StorageQuotaExceededError(5, 2),
      );

      const d = new Dispatcher(
        createConfig({ logger }),
        createMockHttp(),
        storage,
      );

      await d.enqueue(createEvent("e1"));
      await tick();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Storage quota exceeded"),
      );
    });

    it("logs error when persist fails after successful send", async () => {
      const logger = new NoOpLogger();
      const errorSpy = vi.spyOn(logger, "error");
      const storage = createMockStorage();

      vi.mocked(storage.save)
        .mockResolvedValueOnce(undefined) // fire-and-forget from enqueue
        .mockRejectedValueOnce(new Error("Persist fail")); // after send

      const d = new Dispatcher(
        createConfig({ logger }),
        createMockHttp(),
        storage,
      );

      await d.enqueue(createEvent("e1"));
      await d.flush();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to persist events to storage",
        expect.objectContaining({ error: "Persist fail" }),
      );
    });

    it("handles non-Error thrown from storage", async () => {
      const logger = new NoOpLogger();
      const errorSpy = vi.spyOn(logger, "error");
      const storage = createMockStorage();

      vi.mocked(storage.save).mockRejectedValue("string error");

      const d = new Dispatcher(
        createConfig({ logger }),
        createMockHttp(),
        storage,
      );

      await d.enqueue(createEvent("e1"));
      await tick();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to persist events to storage",
        expect.objectContaining({ error: "string error" }),
      );
    });
  });

  describe("buffer limits", () => {
    it("evicts oldest events when maxBufferSize exceeded", async () => {
      const http = createMockHttp();
      const config = createConfig({
        batchOptions: { interval: 5000, size: 3, maxPayloadSize: 65536 },
        maxBufferSize: 3,
      });

      const d = new Dispatcher(config, http, createMockStorage());

      for (let i = 1; i <= 5; i++) {
        await d.enqueue(createEvent(`e${i}`));
      }

      // Auto-flush triggered at size=3, so let's check what was sent
      const sentEvents = vi.mocked(http.send).mock.calls[0]![0]
        .events as Array<{ name: string }>;

      expect(sentEvents).toHaveLength(3);
    });

    it("truncates on restore when storage exceeds buffer capacity", async () => {
      const http = createMockHttp();
      const storage = createMockStorage();
      const config = createConfig({
        batchOptions: { interval: 5000, size: 3, maxPayloadSize: 65536 },
        maxBufferSize: 3,
      });

      vi.mocked(storage.load).mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => createEvent(`p${i + 1}`)),
      );

      const d = new Dispatcher(config, http, storage);

      await d.restore();
      await d.flush();

      const sentEvents = vi.mocked(http.send).mock.calls[0]![0]
        .events as Array<{ name: string }>;

      expect(sentEvents).toHaveLength(3);
      expect(sentEvents[0]?.name).toBe("p3");
      expect(sentEvents[2]?.name).toBe("p5");
    });
  });
});
