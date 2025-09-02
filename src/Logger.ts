import bunyan from "bunyan";
import { merge, omit } from "lodash";
import pino from "pino-pretty";
import { SlackLogger } from "./slackLogger";
import {
  Context,
  EnvironmentConfig,
  EnvironmentConfigs,
  LogConfig,
  LogLevel,
  StreamConfig,
} from "./types";

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
  private loggerName: string;
  private streamConfigs: StreamConfig[];
  private slackApiToken?: string;

  constructor(config: LogConfig) {
    const environment = process.env.NODE_ENV || "local";
    const defaultEnvConfig = DEFAULT_ENV_CONFIGS[environment];
    const envConfig = config[environment] as EnvironmentConfig;

    if (!envConfig && !defaultEnvConfig) {
      throw new Error(
        `Invalid or missing configuration for environment: ${environment}`
      );
    }

    // Merge default environment config with user-provided config
    const finalEnvConfig = merge({}, defaultEnvConfig, envConfig);

    // Store configuration for child loggers
    this.loggerName = config.name;
    this.streamConfigs = finalEnvConfig.streams;
    this.slackApiToken = config.slackApiToken;

    this.logger = this.createLogger({
      name: config.name,
      streams: finalEnvConfig.streams,
    });

    if (config.slackApiToken && finalEnvConfig.slack) {
      this.slackLogger = new SlackLogger({
        apiToken: config.slackApiToken,
        ...finalEnvConfig.slack,
      });
    }
  }

  private createLogger(config: {
    name: string;
    streams: StreamConfig[];
  }): bunyan {
    const streams: bunyan.Stream[] = config.streams.map((streamConfig) => {
      const env = process.env.NODE_ENV || 'local'
      switch (streamConfig.type) {
        case "stdout":
          return {
            level: streamConfig.level,
            stream:
              ['local', 'test'].includes(env) ? prettyStream : process.stdout,
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

  public child(boundFields: Context): Logger {
    const childLogger = new Logger({
      name: this.loggerName,
      slackApiToken: this.slackApiToken,
      [process.env.NODE_ENV || "local"]: {
        streams: this.streamConfigs,
      },
    });
    childLogger.logger = this.logger.child(boundFields);
    childLogger.context = { ...this.context, ...boundFields };
    childLogger.slackLogger = this.slackLogger;
    return childLogger;
  }
}
