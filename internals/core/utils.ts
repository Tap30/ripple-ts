/**
 * Calculate exponential backoff delay with jitter.
 * Formula: min(minDelay * backoffFactor^attempt, maxDelay) + random(0-1000ms)
 *
 * @param attempt The retry attempt number
 * @param minDelay Minimum delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @param backoffFactor Multiplicative factor per attempt
 * @returns Delay in milliseconds
 */
export const calculateBackoff = (
  attempt: number,
  minDelay: number,
  maxDelay: number,
  backoffFactor: number,
): number => {
  const exponential = Math.min(
    minDelay * Math.pow(backoffFactor, attempt),
    maxDelay,
  );

  const jitter = Math.random() * 1000;

  return exponential + jitter;
};

/**
 * Error thrown when a delay is aborted via AbortSignal.
 */
export class DelayAbortedError extends Error {
  constructor() {
    super("Delay aborted");

    this.name = "DelayAbortedError";
  }
}

/**
 * Delay execution for the specified duration.
 *
 * @param ms Milliseconds to delay
 * @param signal Optional AbortSignal to cancel the delay
 */
export const delay = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DelayAbortedError());

      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      reject(new DelayAbortedError());
    };

    signal?.addEventListener("abort", onAbort);
  });
};

/**
 * Utility class for generating unique identifiers.
 */
export class IdGenerator {
  /**
   * Generates a universally unique identifier (UUID v4).
   *
   * @returns A string representing the UUID.
   */
  public static generate(): string {
    // Use the native Web Crypto API if available
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback pseudo-random generator
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;

      return v.toString(16);
    });
  }
}
