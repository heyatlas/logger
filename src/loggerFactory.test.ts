import { AsyncLocalStorage } from "async_hooks";
import { createLogger, LoggerContext } from "./loggerFactory";
import { Logger } from "./Logger";
import { LogLevel } from "./types";

describe("Logger Factory", () => {
  const mockConfig = {
    name: "test-logger",
    local: {
      streams: [{ level: "info" as LogLevel, type: "stdout" as const }],
    },
  };

  describe("Lambda Scenario", () => {
    it("should create a new logger instance for each Lambda invocation", () => {
      // Simulate Lambda cold start
      const context = new AsyncLocalStorage<LoggerContext>();
      const { logger, getLogger } = createLogger(context, mockConfig);

      // First invocation
      const result1 = context.run({ logger }, () => {
        return getLogger();
      });

      // Second invocation (simulating new Lambda instance)
      const context2 = new AsyncLocalStorage<LoggerContext>();
      const { logger: logger2, getLogger: getLogger2 } = createLogger(
        context2,
        mockConfig
      );

      const result2 = context2.run({ logger: logger2 }, () => {
        return getLogger2();
      });

      // Loggers should be different instances
      expect(result1).not.toBe(result2);
    });
  });

  describe("EC2/ECS Scenario", () => {
    it("should reuse logger instance across requests but maintain separate contexts", () => {
      // Create logger once at application startup
      const context = new AsyncLocalStorage<LoggerContext>();
      const { logger, getLogger } = createLogger(context, mockConfig);

      // Simulate first request
      const request1Result = context.run({ logger }, () => {
        return getLogger();
      });

      // Simulate second request
      const request2Result = context.run({ logger }, () => {
        return getLogger();
      });

      // Loggers should be the same instance
      expect(request1Result).toBe(request2Result);

      // But contexts should be separate
      const context1 = context.run({ logger }, () => context.getStore());
      const context2 = context.run({ logger }, () => context.getStore());
      expect(context1).not.toBe(context2);
    });

    it("should throw error when trying to access logger outside context", () => {
      const context = new AsyncLocalStorage<LoggerContext>();
      const { getLogger } = createLogger(context, mockConfig);

      expect(() => getLogger()).toThrow("Logger not found in context");
    });
  });
});
