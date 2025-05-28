import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "./Logger";
import { LogConfig } from "./types";

export interface LoggerContext {
  logger?: Logger;
}

export function createLogger(
  context: AsyncLocalStorage<LoggerContext>,
  config: LogConfig
): { logger: Logger; getLogger: () => Logger } {
  const logger = new Logger(config);

  const getLogger = (): Logger => {
    const store = context.getStore();
    if (!store?.logger) {
      throw new Error(
        "Logger not found in context. Make sure you are running within a context scope."
      );
    }
    return store.logger;
  };

  return { logger, getLogger };
}
