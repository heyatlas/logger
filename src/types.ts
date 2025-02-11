export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface StreamConfig {
  level: LogLevel;
  type: "stdout" | "file";
  path?: string;
  stream?: NodeJS.WritableStream;
}

// Environment level Slack config
export interface SlackConfig {
  level: LogLevel;
  defaultChannel: string;
}

// Configuration for each environment
export interface EnvironmentConfig {
  streams: StreamConfig[];
  slack?: SlackConfig;
}

// Main logger configuration
export interface LogConfig {
  name: string;
  slackApiToken?: string;
  [environment: string]: EnvironmentConfig | string | undefined;
}

export interface Context {
  slack?: {
    channel: string;
    username?: string;
    icon_emoji?: string;
  };
  [key: string]: unknown;
}
