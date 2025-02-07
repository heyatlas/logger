import { AsyncLocalStorage } from "async_hooks";
import { merge } from "lodash";
import { Logger } from "./Logger";
import { LogConfig } from "./types";

function createLogger(
  environment: string,
  projectName: string,
  options?: Partial<LogConfig>
): Logger {
  let config: LogConfig;

  switch (environment) {
    case "test":
      config = {
        name: projectName,
        streams: [{ level: "fatal", type: "stdout" }],
      };
      break;
    case "local":
    case "localhost":
      config = {
        name: projectName,
        streams: [{ level: "info", type: "stdout" }],
      };
      break;
    case "staging":
      config = {
        name: projectName,
        streams: [{ level: "info", type: "stdout" }],
        slack: {
          defaultChannel: "#staging-logs",
          level: "warn",
          apiToken: options?.slack?.apiToken,
        },
      };
      break;
    case "production":
      config = {
        name: projectName,
        streams: [{ level: "info", type: "stdout" }],
        slack: {
          defaultChannel: "#prod-alerts",
          level: "warn",
          apiToken: options?.slack?.apiToken,
        },
      };
      break;
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }

  return new Logger(merge({}, config, options ?? {}));
}

export function getLogger(
  context: AsyncLocalStorage<{ logger?: Logger }>,
  options?: Partial<LogConfig>
): Logger {
  let logger = context.getStore()?.logger;
  if (!logger) {
    logger = createLogger(
      options?.env ?? "localhost",
      options?.name ?? "unknown-api",
      options
    );
    context.enterWith({ logger });
  }
  return logger;
}
