import bunyan from "bunyan";
import { omit } from "lodash";
import pino from "pino-pretty";
import { SlackLogger } from "./slackLogger";
import { Context, LogConfig, LogLevel, EnvironmentConfigs } from "./types";

// Default environment configurations
const DEFAULT_ENV_CONFIGS: EnvironmentConfigs = {
  test: {
    streams: [{ level: "fatal", type: "stdout" }],
  },
  local: {
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

// pretty stream for local development
const prettyStream = pino({
  colorize: true,
  translateTime: true,
  ignore: "pid, hostname",
});

export class Logger {
  private logger: bunyan;
  private context: Record<string, unknown> = {};
  public slackLogger?: SlackLogger;

  constructor(
    config: LogConfig,
    envConfigs: EnvironmentConfigs = DEFAULT_ENV_CONFIGS
  ) {
    const environment = config.env || "local";
    const envConfig = envConfigs[environment];

    if (!envConfig) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    const finalConfig = {
      ...envConfig,
      ...config,
      // Merge streams if both exist
      streams: config.streams || envConfig.streams,
      // Merge slack config if both exist
      slack: config.slack || envConfig.slack,
    };

    this.logger = this.createLogger(finalConfig);
    if (finalConfig.slack) {
      this.slackLogger = new SlackLogger(finalConfig.slack);
    }
  }

  private createLogger(config: LogConfig): bunyan {
    const streams: bunyan.Stream[] = config.streams.map((streamConfig) => {
      switch (streamConfig.type) {
        case "stdout":
          return {
            level: streamConfig.level,
            stream: config.env === "test" ? prettyStream : process.stdout,
          };
        case "file":
          if (!streamConfig.path) {
            throw new Error("File path is required for file streams");
          }
          return { level: streamConfig.level, path: streamConfig.path };
        default:
          throw new Error(`Unknown stream type: ${streamConfig.type}`);
      }
    });

    return bunyan.createLogger({
      name: config.name,
      streams,
      serializers: bunyan.stdSerializers,
    });
  }

  public setContext(key: string, value: unknown): Logger {
    this.context[key] = value;
    return this;
  }

  private getFullContext(extra?: Context): Context {
    return { ...this.context, ...(extra || {}) };
  }

  private handleAsyncOperations(
    level: LogLevel,
    message: string,
    fullContext: Context
  ): void {
    Promise.all([this.slackLogger?.send(level, message, fullContext)]).catch(
      (error) => {
        console.error("Error in background logging operations:", error);
      }
    );
  }

  private log(level: LogLevel, message: string, extra?: Context): void {
    const fullContext = this.getFullContext(extra);
    const context = omit(fullContext, "slack"); // Remove slack config from the context
    this.logger[level](context, message);
    this.handleAsyncOperations(level, message, fullContext);
  }

  public trace(message: string, extra?: Context): void {
    this.log("trace", message, extra);
  }

  public debug(message: string, extra?: Context): void {
    this.log("debug", message, extra);
  }

  public info(message: string, extra?: Context): void {
    this.log("info", message, extra);
  }

  public warn(message: string, extra?: Context): void {
    this.log("warn", message, extra);
  }

  public error(message: string, extra?: Context): void {
    this.log("error", message, extra);
  }

  public fatal(message: string, extra?: Context): void {
    this.log("fatal", message, extra);
  }
}
