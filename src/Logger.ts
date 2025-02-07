import bunyan from "bunyan";
import { omit } from "lodash";
import pino from "pino-pretty";
import { SlackLogger } from "./slackLogger";
import { Context, LogConfig, LogLevel } from "./types";

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

  constructor(config: LogConfig, env?: string) {
    this.logger = this.createLogger(config, env);
    if (config.slack) {
      this.slackLogger = new SlackLogger(config.slack);
    }
  }

  private createLogger(config: LogConfig, env?: string): bunyan {
    const streams: bunyan.Stream[] = config.streams.map((streamConfig) => {
      switch (streamConfig.type) {
        case "stdout":
          return {
            level: streamConfig.level,
            stream: env === "test" ? prettyStream : process.stdout,
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
