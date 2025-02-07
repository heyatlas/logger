import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "./Logger";
import { withLoggerLambda } from "./withLoggerLambdaWrapper";

// Mock dependencies
jest.mock("./Logger");
jest.mock("./getLogger", () => ({
  getLogger: jest.fn().mockReturnValue({
    setContext: jest.fn(),
    info: jest.fn(),
  }),
}));

describe("withLoggerLambda", () => {
  let executionContext: AsyncLocalStorage<{ logger?: Logger }>;
  let mockHandler: jest.Mock;
  let wrappedHandler: ReturnType<typeof withLoggerLambda>;

  beforeEach(() => {
    jest.clearAllMocks();
    executionContext = new AsyncLocalStorage();
    mockHandler = jest.fn().mockResolvedValue({ success: true });
    wrappedHandler = withLoggerLambda(executionContext, mockHandler);
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
    const logger = require("./getLogger").getLogger();
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
    const logger = require("./getLogger").getLogger();
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
    const logger = require("./getLogger").getLogger();
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
});
