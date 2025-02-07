import { WebClient } from "@slack/web-api";
import { isLevelEnabled } from "./isLevelEnabled";
import { Context, LogLevel, SlackConfig } from "./types";

export enum LogLevelEnum {
  TRACE = "trace",
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

export const COLOR_FROM_LEVEL: Record<LogLevel, string> = {
  trace: "#c4c4c4",
  debug: "#00ab00",
  info: "#0066E7",
  warn: "#F18009",
  error: "#D4070F",
  fatal: "#D4070F",
};

export const EMOJI_FROM_LEVEL: Record<LogLevel, string> = {
  trace: ":mag:", // 🔎
  debug: ":broom:", // 🧹
  info: ":information_source:", // ℹ️
  warn: ":warning:", // ⚠️
  error: ":x:", // ❌
  fatal: ":scream:", // 😱
};

export class SlackLogger {
  private config: SlackConfig;
  private client: WebClient;

  constructor(config: SlackConfig) {
    this.config = config;
    this.client = new WebClient(this.config.apiToken);
  }

  private formatExtra(
    extra: Record<string, unknown>
  ): { title: string; value: string; short: boolean }[] {
    return Object.entries(extra).map(([key, value]) => ({
      title: key,
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
      short: false,
    }));
  }

  public async send(
    level: LogLevel,
    message: string,
    extra?: Context
  ): Promise<void> {
    if (isLevelEnabled(level, this.config.level) && extra?.slack?.channel) {
      const slackMessage = {
        text: `*${level.toUpperCase()}:* ${message}`,
        channel: extra.slack.channel,
        username: extra.slack.username || "AtlasLogger",
        icon_emoji: extra.slack.icon_emoji || ":warning:",
        attachments: extra
          ? [
              {
                fields: this.formatExtra(extra),
                color: COLOR_FROM_LEVEL[level],
              },
            ]
          : undefined,
      };
      try {
        await this.client.chat.postMessage(slackMessage);
      } catch (error) {
        console.error("Error sending slack message:", error);
      }
    }
  }
}
