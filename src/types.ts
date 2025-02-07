export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface StreamConfig {
  level: LogLevel;
  type: "stdout" | "file";
  path?: string;
  stream?: NodeJS.WritableStream;
  localPath?: string;
}

export interface SlackConfig {
  // for general events
  webhookUrl: string;
  // for product events (created, deleted)
  productWebhookUrl?: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  apiToken?: string;
  level: LogLevel;
}

export interface LogConfig {
  env?: string;
  name: string;
  streams: StreamConfig[];
  logDir?: string;
  slack?: SlackConfig;
}
