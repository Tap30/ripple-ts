/**
 * Log levels in order of severity
 */
export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  NONE: "none",
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Logger interface for customizable logging
 */
export interface LoggerAdapter {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
