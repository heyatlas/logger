import { Logger } from "./Logger";
import { LogConfig, Context } from "./types";
import { LogLevelEnum, SlackLogger } from "./slackLogger";
import bunyan from "bunyan";

// Mock dependencies
jest.mock("bunyan");
jest.mock("./slackLogger");
jest.mock("pino-pretty", () => jest.fn());

describe("Logger", () => {
  let logger: Logger;
  let mockSlackSend: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  let mockBunyanLogger: jest.Mocked<bunyan>;

  const defaultConfig: LogConfig = {
    name: "test-logger",
    streams: [
      {
        type: "stdout",
        level: "info",
      },
    ],
    slack: {
      apiToken: "test-token",
      level: "info",
      defaultChannel: "#test-channel",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Bunyan logger methods
    mockBunyanLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<bunyan>;

    (bunyan.createLogger as jest.Mock).mockReturnValue(mockBunyanLogger);

    // Mock SlackLogger
    mockSlackSend = jest.fn();
    (SlackLogger as jest.Mock).mockImplementation(() => ({
      send: mockSlackSend,
    }));

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    logger = new Logger(defaultConfig);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("context handling", () => {
    it("should set and include context in logs", () => {
      // Arrange
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
        streams: [{ type: "stdout", level: "info" }],
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
        streams: [{ type: "file", level: "info" }],
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
        streams: [{ type: "invalid" as any, level: "info" }],
      };

      // Act & Assert
      expect(() => new Logger(invalidConfig)).toThrow(
        "Unknown stream type: invalid"
      );
    });
  });
});
