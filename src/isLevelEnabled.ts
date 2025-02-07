import { LogLevel } from "./types";

export function isLevelEnabled(
  messageLevel: LogLevel,
  configLevel: LogLevel
): boolean {
  const levels: LogLevel[] = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ];
  return levels.indexOf(messageLevel) >= levels.indexOf(configLevel);
}
