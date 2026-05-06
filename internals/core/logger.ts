import { LogLevel, type LoggerAdapter } from "./adapters/logger-adapter.ts";

/**
 * Default console logger implementation.
 */
export class ConsoleLoggerAdapter implements LoggerAdapter {
  readonly #level: LogLevel;
  readonly #levelOrder = [
    LogLevel.DEBUG,
    LogLevel.INFO,
    LogLevel.WARN,
    LogLevel.ERROR,
    LogLevel.NONE,
  ] as const;

  constructor(level: LogLevel = LogLevel.WARN) {
    this.#level = level;
  }

  #shouldLog(messageLevel: LogLevel): boolean {
    if (this.#level === LogLevel.NONE) return false;

    return (
      this.#levelOrder.indexOf(messageLevel) >=
      this.#levelOrder.indexOf(this.#level)
    );
  }

  public debug(message: string, ...args: unknown[]): void {
    if (!this.#shouldLog(LogLevel.DEBUG)) return;

    // eslint-disable-next-line no-console
    console.debug(`[Ripple] ${message}`, ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    if (!this.#shouldLog(LogLevel.INFO)) return;

    // eslint-disable-next-line no-console
    console.info(`[Ripple] ${message}`, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    if (!this.#shouldLog(LogLevel.WARN)) return;

    // eslint-disable-next-line no-console
    console.warn(`[Ripple] ${message}`, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    if (!this.#shouldLog(LogLevel.ERROR)) return;

    // eslint-disable-next-line no-console
    console.error(`[Ripple] ${message}`, ...args);
  }
}

/**
 * No-op logger that discards all log messages.
 */
export class NoOpLoggerAdapter implements LoggerAdapter {
  public debug(_message: string, ..._args: unknown[]): void {}
  public info(_message: string, ..._args: unknown[]): void {}
  public warn(_message: string, ..._args: unknown[]): void {}
  public error(_message: string, ..._args: unknown[]): void {}
}
