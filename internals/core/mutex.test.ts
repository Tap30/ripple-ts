import { describe, expect, it } from "vitest";
import { Mutex, MutexDisposedError } from "./mutex.ts";

describe("Mutex", () => {
  it("should allow single task to run immediately", async () => {
    const mutex = new Mutex();
    let executed = false;

    await mutex.runAtomic(async () => {
      executed = true;

      await Promise.resolve();
    });

    expect(executed).toBe(true);
  });

  it("should serialize concurrent tasks", async () => {
    const mutex = new Mutex();
    const results: number[] = [];

    const task1 = mutex.runAtomic(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 50);
      });

      results.push(1);
    });

    const task2 = mutex.runAtomic(async () => {
      results.push(2);

      await Promise.resolve();
    });

    await Promise.all([task1, task2]);

    expect(results).toEqual([1, 2]);
  });

  it("should handle multiple queued tasks", async () => {
    const mutex = new Mutex();
    const results: number[] = [];

    const tasks = [1, 2, 3, 4, 5].map(n =>
      mutex.runAtomic(async () => {
        await new Promise(resolve => {
          setTimeout(resolve, 10);
        });

        results.push(n);
      }),
    );

    await Promise.all(tasks);

    expect(results).toEqual([1, 2, 3, 4, 5]);
  });

  it("should release lock even if task throws error", async () => {
    const mutex = new Mutex();

    await expect(
      mutex.runAtomic(() => {
        throw new Error("Task failed");
      }),
    ).rejects.toThrow("Task failed");

    expect(mutex.isLocked).toBe(false);
  });

  it("should allow next task after error", async () => {
    const mutex = new Mutex();
    let executed = false;

    await expect(
      mutex.runAtomic(() => {
        throw new Error("First task failed");
      }),
    ).rejects.toThrow();

    await mutex.runAtomic(async () => {
      executed = true;

      await Promise.resolve();
    });

    expect(executed).toBe(true);
  });

  it("should return task result", async () => {
    const mutex = new Mutex();

    const result = await mutex.runAtomic(async () => {
      return Promise.resolve(42);
    });

    expect(result).toBe(42);
  });

  it("should handle synchronous tasks", async () => {
    const mutex = new Mutex();

    const result = await mutex.runAtomic(() => {
      return "sync result";
    });

    expect(result).toBe("sync result");
  });

  it("should report locked state correctly", async () => {
    const mutex = new Mutex();

    expect(mutex.isLocked).toBe(false);

    const promise = mutex.runAtomic(async () => {
      expect(mutex.isLocked).toBe(true);

      await new Promise(resolve => {
        setTimeout(resolve, 10);
      });
    });

    await new Promise(resolve => {
      setTimeout(resolve, 5);
    });

    expect(mutex.isLocked).toBe(true);

    await promise;

    expect(mutex.isLocked).toBe(false);
  });

  it("should handle empty task queue", async () => {
    const mutex = new Mutex();

    await mutex.runAtomic(() => {});

    expect(mutex.isLocked).toBe(false);
  });

  it("should preserve task execution order with mixed sync/async", async () => {
    const mutex = new Mutex();
    const results: string[] = [];

    const task1 = mutex.runAtomic(() => {
      results.push("sync");
    });

    const task2 = mutex.runAtomic(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 10);
      });

      results.push("async");
    });

    const task3 = mutex.runAtomic(() => {
      results.push("sync2");
    });

    await Promise.all([task1, task2, task3]);

    expect(results).toEqual(["sync", "async", "sync2"]);
  });

  it("should resolve queued tasks when released", async () => {
    const mutex = new Mutex();
    const results: string[] = [];

    const task1 = mutex.runAtomic(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 50);
      });

      results.push("task1");
    });

    const task2 = mutex.runAtomic(async () => {
      results.push("task2");

      await Promise.resolve();
    });

    const task3 = mutex.runAtomic(async () => {
      results.push("task3");

      await Promise.resolve();
    });

    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    mutex.release();

    await Promise.all([task1, task2, task3]);

    expect(results).toContain("task1");
    expect(results).toContain("task2");
    expect(results).toContain("task3");
    expect(results.length).toBe(3);
    expect(mutex.isLocked).toBe(false);
  });

  it("should reject new tasks after disposal", async () => {
    const mutex = new Mutex();

    mutex.release();

    await expect(
      mutex.runAtomic(async () => {
        return Promise.resolve("should not execute");
      }),
    ).rejects.toThrow(MutexDisposedError);
  });

  it("should reject new tasks with correct error message", async () => {
    const mutex = new Mutex();

    mutex.release();

    await expect(
      mutex.runAtomic(async () => {
        return Promise.resolve("should not execute");
      }),
    ).rejects.toThrow("Mutex has been disposed");
  });

  it("should allow queued tasks to complete but reject new ones after disposal", async () => {
    const mutex = new Mutex();
    const results: string[] = [];

    const task1 = mutex.runAtomic(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 30);
      });

      results.push("task1");
    });

    const task2 = mutex.runAtomic(async () => {
      results.push("task2");

      return Promise.resolve();
    });

    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    mutex.release();

    await Promise.all([task1, task2]);

    expect(results).toContain("task1");
    expect(results).toContain("task2");
    expect(results.length).toBe(2);

    await expect(
      mutex.runAtomic(async () => {
        results.push("task3");

        return Promise.resolve();
      }),
    ).rejects.toThrow(MutexDisposedError);

    expect(results.length).toBe(2);
  });

  it("should handle disposal with empty queue", async () => {
    const mutex = new Mutex();

    mutex.release();

    expect(mutex.isLocked).toBe(false);

    await expect(
      mutex.runAtomic(async () => {
        return Promise.resolve("test");
      }),
    ).rejects.toThrow(MutexDisposedError);
  });

  it("should handle multiple disposal calls safely", async () => {
    const mutex = new Mutex();

    mutex.release();
    mutex.release();
    mutex.release();

    await expect(
      mutex.runAtomic(async () => {
        return Promise.resolve("test");
      }),
    ).rejects.toThrow(MutexDisposedError);
  });

  it("should allow reuse after reset", async () => {
    const mutex = new Mutex();
    let executed = false;

    mutex.release();

    await expect(
      mutex.runAtomic(async () => {
        return Promise.resolve("should not execute");
      }),
    ).rejects.toThrow(MutexDisposedError);

    mutex.reset();

    await mutex.runAtomic(async () => {
      executed = true;

      return Promise.resolve();
    });

    expect(executed).toBe(true);
  });

  it("should reset all internal state", async () => {
    const mutex = new Mutex();

    const task1 = mutex.runAtomic(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 50);
      });
    });

    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    expect(mutex.isLocked).toBe(true);

    mutex.release();
    mutex.reset();

    expect(mutex.isLocked).toBe(false);

    await task1;

    const result = await mutex.runAtomic(async () => {
      return Promise.resolve("works");
    });

    expect(result).toBe("works");
  });

  it("should handle reset without prior disposal", async () => {
    const mutex = new Mutex();

    mutex.reset();

    const result = await mutex.runAtomic(async () => {
      return Promise.resolve("test");
    });

    expect(result).toBe("test");
  });
});
