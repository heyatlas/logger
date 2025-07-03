import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "./Logger";
import { LoggerContext } from "./loggerFactory";
import { withLoggerLambda } from "./withLoggerLambdaWrapper";
import { LogConfig } from "./types";

describe("withLoggerLambda", () => {
  let executionContext: AsyncLocalStorage<LoggerContext>;
  let mockHandler: jest.Mock;
  let wrappedHandler: ReturnType<typeof withLoggerLambda>;
  let logger: Logger;
  let logConfig: LogConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    executionContext = new AsyncLocalStorage();
    mockHandler = jest.fn().mockResolvedValue({ success: true });

    // Create test config
    logConfig = {
      name: "test-service",
      test: {
        streams: [{ level: "info", type: "stdout" }],
      },
    };

    // Create logger
    logger = new Logger(logConfig);

    // Mock setContext method
    logger.setContext = jest.fn().mockReturnValue(logger);

    // Create wrapped handler with logger
    wrappedHandler = withLoggerLambda(executionContext, logger, mockHandler);
  });

  it("should set AWS request ID and function name in logger context", async () => {
    // Arrange
    const event = {};
    const context = {
      awsRequestId: "123-456",
      functionName: "test-function",
    };

    // Act
    await wrappedHandler(event, context);

    // Assert
    expect(logger.setContext).toHaveBeenCalledWith("awsRequestId", "123-456");
    expect(logger.setContext).toHaveBeenCalledWith(
      "functionName",
      "test-function"
    );
  });

  it("should handle SQS events and set message IDs in context", async () => {
    // Arrange
    const event = {
      Records: [
        { eventSource: "aws:sqs", messageId: "msg1" },
        { eventSource: "aws:sqs", messageId: "msg2" },
        { eventSource: "aws:other", messageId: "msg3" },
      ],
    };
    const context = {
      awsRequestId: "123-456",
      functionName: "test-function",
    };

    // Act
    await wrappedHandler(event, context);

    // Assert
    expect(logger.setContext).toHaveBeenCalledWith("sqsMessageIds", [
      "msg1",
      "msg2",
    ]);
  });

  it("should not set SQS message IDs for non-SQS events", async () => {
    // Arrange
    const event = {
      Records: [{ eventSource: "aws:other", messageId: "msg1" }],
    };
    const context = {
      awsRequestId: "123-456",
      functionName: "test-function",
    };

    // Act
    await wrappedHandler(event, context);

    // Assert
    expect(logger.setContext).not.toHaveBeenCalledWith(
      "sqsMessageIds",
      expect.any(Array)
    );
  });

  it("should call the handler with original event and context", async () => {
    // Arrange
    const event = { test: "data" };
    const context = {
      awsRequestId: "123-456",
      functionName: "test-function",
    };

    // Act
    await wrappedHandler(event, context);

    // Assert
    expect(mockHandler).toHaveBeenCalledWith(event, context);
  });

  it("should return handler result", async () => {
    // Arrange
    const expectedResult = { success: true };
    mockHandler.mockResolvedValueOnce(expectedResult);

    // Act
    const result = await wrappedHandler({}, {});

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it("should exit execution context even if handler throws", async () => {
    // Arrange
    const error = new Error("Test error");
    mockHandler.mockRejectedValueOnce(error);
    const exitSpy = jest.spyOn(executionContext, "exit");

    // Act & Assert
    await expect(wrappedHandler({}, {})).rejects.toThrow(error);
    expect(exitSpy).toHaveBeenCalled();
  });

  it("should create logger from config when config is provided", async () => {
    // Arrange
    const handlerWithConfig = withLoggerLambda(
      executionContext,
      logConfig,
      mockHandler
    );
    const event = {};
    const context = {
      awsRequestId: "789-012",
      functionName: "config-function",
    };

    // Act
    await handlerWithConfig(event, context);

    // Assert
    expect(mockHandler).toHaveBeenCalledWith(event, context);
  });

  it("should work with existing logger instance", async () => {
    // Arrange
    const existingLogger = new Logger(logConfig);
    existingLogger.setContext = jest.fn().mockReturnValue(existingLogger);

    const handlerWithLogger = withLoggerLambda(
      executionContext,
      existingLogger,
      mockHandler
    );
    const event = {};
    const context = {
      awsRequestId: "345-678",
      functionName: "logger-function",
    };

    // Act
    await handlerWithLogger(event, context);

    // Assert
    expect(existingLogger.setContext).toHaveBeenCalledWith(
      "awsRequestId",
      "345-678"
    );
    expect(existingLogger.setContext).toHaveBeenCalledWith(
      "functionName",
      "logger-function"
    );
    expect(mockHandler).toHaveBeenCalledWith(event, context);
  });
});
