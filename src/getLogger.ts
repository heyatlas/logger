import { AsyncLocalStorage } from "async_hooks";
import { merge, omit } from "lodash";
import { Logger } from "./Logger";
import { LogConfig } from "./types";

export function getLogger(
  context: AsyncLocalStorage<{ logger?: Logger }>,
  options?: Partial<LogConfig>
): Logger {
  let logger = context.getStore()?.logger;
  if (!logger) {
    const config: LogConfig = {
      name: options?.name ?? "unknown-api",
      slackApiToken: options?.slackApiToken,
      [process.env.NODE_ENV || "local"]: {
        streams: [{ level: "info", type: "stdout" }],
      },
    };

    logger = new Logger(
      merge({}, config, omit(options, ["name", "slackApiToken"]))
    );
    context.enterWith({ logger });
  }
  return logger;
}
