import { AsyncLocalStorage } from "async_hooks";
import { merge } from "lodash";
import { Logger } from "./Logger";
import { LogConfig, EnvironmentConfigs } from "./types";

const DEFAULT_CONFIGS: EnvironmentConfigs = {
  test: {
    streams: [{ level: "fatal", type: "stdout" }],
  },
  local: {
    streams: [{ level: "info", type: "stdout" }],
  },
  localhost: {
    streams: [{ level: "info", type: "stdout" }],
  },
  staging: {
    streams: [{ level: "info", type: "stdout" }],
    slack: {
      defaultChannel: "#staging-logs",
      level: "warn",
    },
  },
  production: {
    streams: [{ level: "info", type: "stdout" }],
    slack: {
      defaultChannel: "#prod-alerts",
      level: "warn",
    },
  },
};

function createLogger(
  environment: string,
  projectName: string,
  options?: Partial<LogConfig>,
  envConfigs: EnvironmentConfigs = DEFAULT_CONFIGS
): Logger {
  const envConfig = envConfigs[environment];
  if (!envConfig) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  const baseConfig: LogConfig = {
    name: projectName,
    ...envConfig,
  };

  return new Logger(merge({}, baseConfig, options ?? {}));
}

export function getLogger(
  context: AsyncLocalStorage<{ logger?: Logger }>,
  options?: Partial<LogConfig>,
  envConfigs?: EnvironmentConfigs
): Logger {
  let logger = context.getStore()?.logger;
  if (!logger) {
    logger = createLogger(
      options?.env ?? "localhost",
      options?.name ?? "unknown-api",
      options,
      envConfigs
    );
    context.enterWith({ logger });
  }
  return logger;
}
