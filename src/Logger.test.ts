import bunyan from "bunyan";
import { Logger } from "./Logger";
import { SlackLogger } from "./slackLogger";
import { Context, LogConfig, LogLevelEnum } from "./types";
import { AsyncLocalStorage } from "async_hooks";
import { LoggerContext } from "./loggerFactory";

// Mock dependencies
jest.mock("bunyan");
jest.mock("./slackLogger");
jest.mock("pino-pretty", () => jest.fn());

describe("Logger", () => {
  let mockSlackSend: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  let mockBunyanLogger: jest.Mock;

  const defaultConfig: LogConfig = {
    name: "test-logger",
    slackApiToken: "test-token",
    test: {
      streams: [{ level: "fatal", type: "stdout" }],
      slack: {
        defaultChannel: "#test-logs",
        level: "warn",
      },
    },
    local: {
      streams: [{ level: "info", type: "stdout" }],
    },
    staging: {
      streams: [{ level: "info", type: "stdout" }],
      slack: {
        defaultChannel: "#staging-logs",
        level: "warn",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Bunyan logger
    mockBunyanLogger = jest.fn().mockReturnValue({
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        fields: { name: "test-logger" },
        _streams: [{ level: "fatal", type: "stdout" }],
      }),
      fields: { name: "test-logger" },
      _streams: [{ level: "fatal", type: "stdout" }],
    });
    (bunyan.createLogger as jest.Mock) = mockBunyanLogger;

    // Mock SlackLogger
    mockSlackSend = jest.fn().mockResolvedValue(undefined);
    (SlackLogger as jest.Mock).mockImplementation(() => ({
      send: mockSlackSend,
      getConfig: () => ({ apiToken: "test-token" }),
    }));

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.resetModules();
  });

  describe("context handling", () => {
    it("should set and include context in logs", () => {
      // Arrange
      const logger = new Logger(defaultConfig);
      const context = { userId: "123" };
      const message = "Test message";

      // Act
      logger.setContext("userId", "123");
      logger.info(message);

      // Assert
      expect(logger["logger"].info).toHaveBeenCalledWith(context, message);
    });

    it("should merge context with extra parameters", () => {
      // Arrange
      const logger = new Logger(defaultConfig);
      const baseContext = { userId: "123" };
      const extra: Context = { requestId: "456" };
      const message = "Test message";

      // Act
      logger.setContext("userId", "123");
      logger.info(message, extra);

      // Assert
      expect(logger["logger"].info).toHaveBeenCalledWith(
        { ...baseContext, ...extra },
        message
      );
    });
  });

  describe("log levels", () => {
    it.each([
      [LogLevelEnum.TRACE],
      [LogLevelEnum.DEBUG],
      [LogLevelEnum.INFO],
      [LogLevelEnum.WARN],
      [LogLevelEnum.ERROR],
      [LogLevelEnum.FATAL],
    ])("should log message with %s level", (level) => {
      // Arrange
      const logger = new Logger(defaultConfig);
      const message = "Test message";
      const extra: Context = { requestId: "123" };

      // Act
      logger[level](message, extra);

      // Assert
      expect(logger["logger"][level]).toHaveBeenCalledWith(extra, message);
      expect(mockSlackSend).toHaveBeenCalledWith(level, message, extra);
    });
  });

  describe("slack integration", () => {
    it("should handle slack errors gracefully", async () => {
      // Arrange
      const logger = new Logger(defaultConfig);
      mockSlackSend.mockRejectedValue(new Error("Slack error"));
      const message = "Test message";

      // Act
      logger.info(message);

      // Wait for Promise.all in handleAsyncOperations
      await new Promise(process.nextTick);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in background logging operations:",
        expect.any(Error)
      );
    });

    it("should not initialize slack logger if config is missing", () => {
      // Arrange
      const configWithoutSlack: LogConfig = {
        name: "test-logger",
        test: {
          streams: [{ type: "stdout", level: "info" }],
        },
      };

      // Act
      const loggerWithoutSlack = new Logger(configWithoutSlack);

      // Assert
      expect(loggerWithoutSlack.slackLogger).toBeUndefined();
    });
  });

  describe("file streams", () => {
    it("should throw error if file path is missing", () => {
      // Arrange
      const invalidConfig: LogConfig = {
        name: "test-logger",
        test: {
          streams: [{ type: "file", level: "info" }],
        },
      };

      // Act & Assert
      expect(() => new Logger(invalidConfig)).toThrow(
        "File path is required for file streams"
      );
    });

    it("should throw error for unknown stream type", () => {
      // Arrange
      const invalidConfig: LogConfig = {
        name: "test-logger",
        test: {
          streams: [{ type: "invalid" as any, level: "info" }],
        },
      };

      // Act & Assert
      expect(() => new Logger(invalidConfig)).toThrow(
        "Unknown stream type: invalid"
      );
    });
  });

  describe("environment configuration", () => {
    it("should use environment-specific stream configuration", () => {
      // instantiate a new logger with the default config to check that the default config is used
      new Logger(defaultConfig);
      expect(mockBunyanLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test-logger",
          streams: expect.arrayContaining([
            expect.objectContaining({ level: "fatal" }),
          ]),
        })
      );
    });

    it("should initialize slack logger with correct config", () => {
      process.env.NODE_ENV = "staging";
      const logger = new Logger(defaultConfig);
      expect(logger.slackLogger).toBeDefined();
      expect(SlackLogger).toHaveBeenCalledWith({
        apiToken: "test-token",
        defaultChannel: "#staging-logs",
        level: "warn",
      });
    });

    it("should use default config when environment config is not provided", () => {
      process.env.NODE_ENV = "local";
      // instantiate a new logger with the default config to check that the default config is used
      new Logger({
        name: "test-logger",
        slackApiToken: "test-token",
      });
      expect(mockBunyanLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          streams: expect.arrayContaining([
            expect.objectContaining({ level: "info" }),
          ]),
        })
      );
    });
  });

  describe("child logger", () => {
    it("should create a child logger using Bunyan's child method", () => {
      // Arrange
      const logger = new Logger(defaultConfig);
      const boundFields = { component: "auth", userId: "123" };
      const mockChildLogger = {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        fields: { name: "test-logger" },
        _streams: [{ level: "fatal", type: "stdout" }],
      };
      logger["logger"].child = jest
        .fn()
        .mockImplementation(() => mockChildLogger);

      // Act
      const childLogger = logger.child(boundFields);

      // Assert
      expect(logger["logger"].child).toHaveBeenCalledWith(boundFields);
      expect(childLogger["logger"]).toBe(mockChildLogger);
    });

    it("should inherit parent's context but override with bound fields", () => {
      // Arrange
      const logger = new Logger(defaultConfig);
      logger.setContext("userId", "456");
      logger.setContext("requestId", "789");
      const boundFields = { userId: "123" };
      const mockChildLogger = {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        fields: { name: "test-logger" },
        _streams: [{ level: "fatal", type: "stdout" }],
      };
      logger["logger"].child = jest
        .fn()
        .mockImplementation(() => mockChildLogger);

      // Act
      const childLogger = logger.child(boundFields);
      childLogger.info("test message");

      // Assert
      expect(childLogger["logger"].info).toHaveBeenCalledWith(
        { userId: "123", requestId: "789" },
        "test message"
      );
    });

    it("should maintain separate contexts between parent and child", () => {
      // Arrange
      const logger = new Logger(defaultConfig);
      const mockChildLogger = {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        fields: { name: "test-logger" },
        _streams: [{ level: "fatal", type: "stdout" }],
      };
      logger["logger"].child = jest
        .fn()
        .mockImplementation(() => mockChildLogger);

      // Act
      const childLogger = logger.child({ component: "auth" });
      logger.setContext("parent", "value");
      childLogger.setContext("child", "value");

      // Assert
      expect(logger["context"]).toEqual({ parent: "value" });
      expect(childLogger["context"]).toEqual({
        component: "auth",
        child: "value",
      });
    });

    describe("context scenarios", () => {
      it("should maintain child logger context across execution context", () => {
        // Arrange
        const logger = new Logger(defaultConfig);
        const middlewareLogger = logger.child({ reqId: "123" });
        const mockChildLogger = {
          trace: jest.fn(),
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          fatal: jest.fn(),
          fields: { name: "test-logger" },
          _streams: [{ level: "fatal", type: "stdout" }],
        };
        middlewareLogger["logger"].child = jest
          .fn()
          .mockImplementation(() => mockChildLogger);

        // Act
        const contextLogger = middlewareLogger.child({ lid: "456" });
        contextLogger.info("test message");

        // Assert
        expect(contextLogger["logger"].info).toHaveBeenCalledWith(
          { reqId: "123", lid: "456" },
          "test message"
        );
      });

      it("should preserve child logger in execution context", () => {
        // Arrange
        const logger = new Logger(defaultConfig);
        const middlewareLogger = logger.child({ reqId: "123" });
        const mockChildLogger = {
          trace: jest.fn(),
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          fatal: jest.fn(),
          fields: { name: "test-logger" },
          _streams: [{ level: "fatal", type: "stdout" }],
        };
        middlewareLogger["logger"].child = jest
          .fn()
          .mockImplementation(() => mockChildLogger);

        // Act
        const contextLogger = middlewareLogger.child({ lid: "456" });
        const executionContext = new AsyncLocalStorage<LoggerContext>();
        let contextLoggerInScope: Logger | undefined;

        executionContext.run({ logger: contextLogger }, () => {
          contextLoggerInScope = executionContext.getStore()?.logger;
        });

        // Assert
        expect(contextLoggerInScope).toBe(contextLogger);
        expect(contextLoggerInScope?.["logger"]).toBe(mockChildLogger);
      });
    });
  });
});
