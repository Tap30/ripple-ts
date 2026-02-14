import { LogLevel, type LoggerAdapter } from "./adapters/logger-adapter.ts";

/**
 * Default console logger implementation.
 */
export class ConsoleLoggerAdapter implements LoggerAdapter {
  private readonly _level: LogLevel;
  private readonly _levelOrder = [
    LogLevel.DEBUG,
    LogLevel.INFO,
    LogLevel.WARN,
    LogLevel.ERROR,
    LogLevel.NONE,
  ] as const;

  public constructor(level: LogLevel = LogLevel.WARN) {
    this._level = level;
  }

  private _shouldLog(messageLevel: LogLevel): boolean {
    if (this._level === LogLevel.NONE) return false;

    return (
      this._levelOrder.indexOf(messageLevel) >=
      this._levelOrder.indexOf(this._level)
    );
  }

  public debug(message: string, ...args: unknown[]): void {
    if (!this._shouldLog(LogLevel.DEBUG)) return;

    // eslint-disable-next-line no-console
    console.debug(`[Ripple] ${message}`, ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    if (!this._shouldLog(LogLevel.INFO)) return;

    // eslint-disable-next-line no-console
    console.info(`[Ripple] ${message}`, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    if (!this._shouldLog(LogLevel.WARN)) return;

    // eslint-disable-next-line no-console
    console.warn(`[Ripple] ${message}`, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    if (!this._shouldLog(LogLevel.ERROR)) return;

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
