/**
 * Calculate exponential backoff delay with jitter.
 * Formula: 1000ms * 2^attempt + random(0-1000ms)
 *
 * @param attempt The retry attempt number
 * @returns Delay in milliseconds
 */
export const calculateBackoff = (attempt: number): number => {
  const baseDelay = 1000;
  const exponential = baseDelay * Math.pow(2, attempt);
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

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new DelayAbortedError());
    });
  });
};
