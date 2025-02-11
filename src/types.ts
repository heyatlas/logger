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

// Configuration for environments
export interface EnvironmentConfigs {
  [environment: string]: EnvironmentConfig | string | undefined;
}

// Main logger configuration
export interface LogConfig extends EnvironmentConfigs {
  name: string;
  slackApiToken?: string;
}

export interface Context {
  slack?: {
    channel: string;
    username?: string;
    icon_emoji?: string;
  };
  [key: string]: unknown;
}
