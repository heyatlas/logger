import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "./Logger";
import { LoggerContext } from "./loggerFactory";
import { withLoggerLambda } from "./withLoggerLambdaWrapper";
import { createLogger } from "./loggerFactory";

describe("withLoggerLambda", () => {
  let executionContext: AsyncLocalStorage<LoggerContext>;
  let mockHandler: jest.Mock;
  let wrappedHandler: ReturnType<typeof withLoggerLambda>;
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    executionContext = new AsyncLocalStorage();
    mockHandler = jest.fn().mockResolvedValue({ success: true });

    // Create logger factory and set up context
    const loggerFactory = createLogger(executionContext, {
      name: "test-service",
    });
    logger = loggerFactory.logger;
    // Mock setContext method
    logger.setContext = jest.fn();

    // Create wrapped handler after context is set up
    wrappedHandler = withLoggerLambda(executionContext, mockHandler);
  });

  it("should set AWS request ID and function name in logger context", async () => {
    // Arrange
    const event = {};
    const context = {
      awsRequestId: "123-456",
      functionName: "test-function",
    };

    // Act & Assert
    await executionContext.run({ logger }, async () => {
      await wrappedHandler(event, context);
      expect(logger.setContext).toHaveBeenCalledWith("awsRequestId", "123-456");
      expect(logger.setContext).toHaveBeenCalledWith(
        "functionName",
        "test-function"
      );
    });
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

    // Act & Assert
    await executionContext.run({ logger }, async () => {
      await wrappedHandler(event, context);
      expect(logger.setContext).toHaveBeenCalledWith("sqsMessageIds", [
        "msg1",
        "msg2",
      ]);
    });
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

    // Act & Assert
    await executionContext.run({ logger }, async () => {
      await wrappedHandler(event, context);
      expect(logger.setContext).not.toHaveBeenCalledWith(
        "sqsMessageIds",
        expect.any(Array)
      );
    });
  });

  it("should call the handler with original event and context", async () => {
    // Arrange
    const event = { test: "data" };
    const context = {
      awsRequestId: "123-456",
      functionName: "test-function",
    };

    // Act & Assert
    await executionContext.run({ logger }, async () => {
      await wrappedHandler(event, context);
      expect(mockHandler).toHaveBeenCalledWith(event, context);
    });
  });

  it("should return handler result", async () => {
    // Arrange
    const expectedResult = { success: true };
    mockHandler.mockResolvedValueOnce(expectedResult);

    // Act & Assert
    const result = await executionContext.run({ logger }, async () => {
      return wrappedHandler({}, {});
    });
    expect(result).toEqual(expectedResult);
  });

  it("should exit execution context even if handler throws", async () => {
    // Arrange
    const error = new Error("Test error");
    mockHandler.mockRejectedValueOnce(error);
    const exitSpy = jest.spyOn(executionContext, "exit");

    // Act & Assert
    await expect(
      executionContext.run({ logger }, async () => {
        await wrappedHandler({}, {});
      })
    ).rejects.toThrow(error);
    expect(exitSpy).toHaveBeenCalled();
  });

  it("should throw error if logger is not found in context", async () => {
    // Arrange
    const emptyContext = new AsyncLocalStorage<LoggerContext>();
    const handler = withLoggerLambda(emptyContext, mockHandler);

    // Act & Assert
    await expect(handler({}, {})).rejects.toThrow(
      "Logger not found in context"
    );
  });
});
