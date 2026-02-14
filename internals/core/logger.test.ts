import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel } from "./adapters/logger-adapter.ts";
import { ConsoleLoggerAdapter, NoOpLoggerAdapter } from "./logger.ts";

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ConsoleLoggerAdapter", () => {
    it("should log debug messages when level is DEBUG", () => {
      const consoleSpy = vi
        .spyOn(console, "debug")
        .mockImplementation(() => {});

      const logger = new ConsoleLoggerAdapter(LogLevel.DEBUG);

      logger.debug("test message", { data: "test" });

      expect(consoleSpy).toHaveBeenCalledWith("[Ripple] test message", {
        data: "test",
      });
    });

    it("should log info messages when level is INFO or lower", () => {
      const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = new ConsoleLoggerAdapter(LogLevel.INFO);

      logger.info("test message", { data: "test" });

      expect(consoleSpy).toHaveBeenCalledWith("[Ripple] test message", {
        data: "test",
      });
    });

    it("should log warn messages when level is WARN or lower", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = new ConsoleLoggerAdapter(LogLevel.WARN);

      logger.warn("test message", { data: "test" });

      expect(consoleSpy).toHaveBeenCalledWith("[Ripple] test message", {
        data: "test",
      });
    });

    it("should log error messages when level is ERROR or lower", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const logger = new ConsoleLoggerAdapter(LogLevel.ERROR);

      logger.error("test message", { data: "test" });

      expect(consoleSpy).toHaveBeenCalledWith("[Ripple] test message", {
        data: "test",
      });
    });

    it("should not log messages above the configured level", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = new ConsoleLoggerAdapter(LogLevel.ERROR);

      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("should use WARN level by default", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const logger = new ConsoleLoggerAdapter();

      logger.warn("warn message");
      logger.info("info message");

      expect(warnSpy).toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it("should not log any messages when level is NONE", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = new ConsoleLoggerAdapter(LogLevel.NONE);

      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("NoOpLogger", () => {
    it("should not call any console methods", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = new NoOpLoggerAdapter();

      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
