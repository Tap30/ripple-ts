import { describe, expect, it, vi } from "vitest";
import { calculateBackoff, delay } from "./utils.ts";

describe("utils", () => {
  describe("calculateBackoff", () => {
    it("should calculate backoff for attempt 0", () => {
      const result = calculateBackoff(0);

      expect(result).toBeGreaterThanOrEqual(1000);
      expect(result).toBeLessThan(2000);
    });

    it("should calculate backoff for attempt 1", () => {
      const result = calculateBackoff(1);

      expect(result).toBeGreaterThanOrEqual(2000);
      expect(result).toBeLessThan(3000);
    });

    it("should calculate backoff for attempt 2", () => {
      const result = calculateBackoff(2);

      expect(result).toBeGreaterThanOrEqual(4000);
      expect(result).toBeLessThan(5000);
    });

    it("should calculate backoff for attempt 3", () => {
      const result = calculateBackoff(3);

      expect(result).toBeGreaterThanOrEqual(8000);
      expect(result).toBeLessThan(9000);
    });

    it("should include jitter in calculation", () => {
      const results = new Set<number>();

      for (let i = 0; i < 100; i++) {
        results.add(calculateBackoff(0));
      }

      expect(results.size).toBeGreaterThan(1);
    });

    it("should follow exponential formula", () => {
      const attempt0 = calculateBackoff(0);
      const attempt1 = calculateBackoff(1);
      const attempt2 = calculateBackoff(2);

      expect(attempt1).toBeGreaterThan(attempt0);
      expect(attempt2).toBeGreaterThan(attempt1);
    });
  });

  describe("delay", () => {
    it("should return a promise", () => {
      const promise = delay(50);

      expect(promise).toBeInstanceOf(Promise);
    });

    it("should resolve after delay", async () => {
      let resolved = false;

      void delay(10).then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      await delay(20);

      expect(resolved).toBe(true);
    });

    it("should work with fake timers", async () => {
      vi.useFakeTimers();

      let resolved = false;
      const promise = delay(1000).then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      vi.advanceTimersByTime(1000);
      await promise;

      expect(resolved).toBe(true);

      vi.useRealTimers();
    });
  });
});
