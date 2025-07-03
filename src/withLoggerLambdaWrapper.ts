import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "./Logger";
import { LoggerContext } from "./loggerFactory";
import { LogConfig } from "./types";

// Wrapper for Lambda handlers
export function withLoggerLambda<T>(
  executionContext: AsyncLocalStorage<LoggerContext>,
  loggerOrConfig: Logger | LogConfig,
  handler: (event: any, context: any) => Promise<T>
): (event: any, context: any) => Promise<T> {
  return async (event: any, context: any) => {
    // Create logger instance if config was provided
    const logger =
      loggerOrConfig instanceof Logger
        ? loggerOrConfig
        : new Logger(loggerOrConfig);

    // Set Lambda-specific context
    logger.setContext("awsRequestId", context.awsRequestId);
    logger.setContext("functionName", context.functionName);

    // If the event is from SQS, add message ID to context
    if (event.Records && Array.isArray(event.Records)) {
      const sqsRecords = event.Records.filter(
        (record: any) => record.eventSource === "aws:sqs"
      );

      if (sqsRecords.length > 0) {
        const messageIds = sqsRecords.map((record: any) => record.messageId);
        logger.setContext("sqsMessageIds", messageIds);
      }
    }

    try {
      // Run the handler within the logger context
      return await executionContext.run({ logger }, async () => {
        return await handler(event, context);
      });
    } finally {
      executionContext.exit(() => {});
    }
  };
}
