import { AsyncLocalStorage } from "async_hooks";
import { LoggerContext } from "./loggerFactory";

// Wrapper for Lambda handlers
export function withLoggerLambda<T>(
  executionContext: AsyncLocalStorage<LoggerContext>,
  handler: (event: any, context: any) => Promise<T>
): (event: any, context: any) => Promise<T> {
  return async (event: any, context: any) => {
    const store = executionContext.getStore();
    if (!store?.logger) {
      throw new Error(
        "Logger not found in context. Make sure you are running within a context scope."
      );
    }
    const logger = store.logger;

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
      return await executionContext.run({ logger }, async () => {
        return await handler(event, context);
      });
    } finally {
      executionContext.exit(() => {});
    }
  };
}
