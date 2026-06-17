import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateBackoff,
  delay,
  DelayAbortedError,
  IdGenerator,
} from "./utils.ts";

describe("utils", () => {
  describe("calculateBackoff", () => {
    it("should calculate backoff for attempt 0", () => {
      const result = calculateBackoff(0, 1000, 360000, 2);

      expect(result).toBeGreaterThanOrEqual(1000);
      expect(result).toBeLessThan(2000);
    });

    it("should calculate backoff for attempt 1", () => {
      const result = calculateBackoff(1, 1000, 360000, 2);

      expect(result).toBeGreaterThanOrEqual(2000);
      expect(result).toBeLessThan(3000);
    });

    it("should calculate backoff for attempt 2", () => {
      const result = calculateBackoff(2, 1000, 360000, 2);

      expect(result).toBeGreaterThanOrEqual(4000);
      expect(result).toBeLessThan(5000);
    });

    it("should calculate backoff for attempt 3", () => {
      const result = calculateBackoff(3, 1000, 360000, 2);

      expect(result).toBeGreaterThanOrEqual(8000);
      expect(result).toBeLessThan(9000);
    });

    it("should cap exponential at maxDelay", () => {
      const result = calculateBackoff(20, 1000, 5000, 2);

      expect(result).toBeGreaterThanOrEqual(5000);
      expect(result).toBeLessThan(6000);
    });

    it("should respect custom minDelay", () => {
      const result = calculateBackoff(0, 500, 360000, 2);

      expect(result).toBeGreaterThanOrEqual(500);
      expect(result).toBeLessThan(1500);
    });

    it("should respect custom backoffFactor", () => {
      const result = calculateBackoff(1, 1000, 360000, 3);

      expect(result).toBeGreaterThanOrEqual(3000);
      expect(result).toBeLessThan(4000);
    });

    it("should include jitter in calculation", () => {
      const results = new Set<number>();

      for (let i = 0; i < 100; i++) {
        results.add(calculateBackoff(0, 1000, 360000, 2));
      }

      expect(results.size).toBeGreaterThan(1);
    });

    it("should follow exponential formula", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const attempt0 = calculateBackoff(0, 1000, 360000, 2);
      const attempt1 = calculateBackoff(1, 1000, 360000, 2);
      const attempt2 = calculateBackoff(2, 1000, 360000, 2);

      expect(attempt0).toBe(1000);
      expect(attempt1).toBe(2000);
      expect(attempt2).toBe(4000);

      vi.restoreAllMocks();
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

    it("should reject when signal is already aborted", async () => {
      const controller = new AbortController();

      controller.abort();

      await expect(delay(100, controller.signal)).rejects.toThrow(
        DelayAbortedError,
      );
    });

    it("should cancel delay when signal is aborted", async () => {
      const controller = new AbortController();
      const promise = delay(100, controller.signal);

      setTimeout(() => controller.abort(), 10);

      await expect(promise).rejects.toThrow(DelayAbortedError);
    });
  });

  describe("IdGenerator", () => {
    // Standard UUID v4 regex
    const UUID_V4_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    afterEach(() => {
      // Clean up any global stubs or mocks after each test
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("should generate a string in valid UUID v4 format", () => {
      const id = IdGenerator.generate();

      expect(id).toMatch(UUID_V4_REGEX);
    });

    it("should generate unique UUIDs", () => {
      const id1 = IdGenerator.generate();
      const id2 = IdGenerator.generate();

      expect(id1).not.toBe(id2);
    });

    it("should use native crypto.randomUUID if available", () => {
      const mockUUID = "12345678-1234-4321-a123-123456789012";
      const mockCrypto = {
        randomUUID: vi.fn().mockReturnValue(mockUUID),
      };

      // Stub the global crypto object
      vi.stubGlobal("crypto", mockCrypto);

      const id = IdGenerator.generate();

      expect(mockCrypto.randomUUID).toHaveBeenCalledOnce();
      expect(id).toBe(mockUUID);
    });

    it("should use fallback Math.random when global crypto is undefined", () => {
      // Remove crypto entirely
      vi.stubGlobal("crypto", undefined);

      const mathRandomSpy = vi.spyOn(Math, "random");

      const id = IdGenerator.generate();

      // 31 x's and y's in the template string means Math.random should be called 31 times
      expect(mathRandomSpy).toHaveBeenCalledTimes(31);
      expect(id).toMatch(UUID_V4_REGEX);
    });

    it("should use fallback Math.random when crypto.randomUUID is undefined", () => {
      // Crypto exists, but randomUUID does not (e.g., older browsers/Node versions)
      vi.stubGlobal("crypto", {});

      const mathRandomSpy = vi.spyOn(Math, "random");

      const id = IdGenerator.generate();

      expect(mathRandomSpy).toHaveBeenCalled();
      expect(id).toMatch(UUID_V4_REGEX);
    });
  });
});
