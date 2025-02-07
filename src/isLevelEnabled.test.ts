import { isLevelEnabled } from "./isLevelEnabled";
import { LogLevel } from "./types";

describe("isLevelEnabled", () => {
  it.each([
    // messageLevel, configLevel, expected
    ["trace", "trace", true],
    ["debug", "trace", true],
    ["info", "trace", true],
    ["warn", "trace", true],
    ["error", "trace", true],
    ["fatal", "trace", true],

    ["trace", "debug", false],
    ["debug", "debug", true],
    ["info", "debug", true],
    ["warn", "debug", true],
    ["error", "debug", true],
    ["fatal", "debug", true],

    ["trace", "info", false],
    ["debug", "info", false],
    ["info", "info", true],
    ["warn", "info", true],
    ["error", "info", true],
    ["fatal", "info", true],

    ["trace", "warn", false],
    ["debug", "warn", false],
    ["info", "warn", false],
    ["warn", "warn", true],
    ["error", "warn", true],
    ["fatal", "warn", true],

    ["trace", "error", false],
    ["debug", "error", false],
    ["info", "error", false],
    ["warn", "error", false],
    ["error", "error", true],
    ["fatal", "error", true],

    ["trace", "fatal", false],
    ["debug", "fatal", false],
    ["info", "fatal", false],
    ["warn", "fatal", false],
    ["error", "fatal", false],
    ["fatal", "fatal", true],
  ])(
    "should return %p when messageLevel is %p and configLevel is %p",
    (messageLevel, configLevel, expected) => {
      expect(
        isLevelEnabled(messageLevel as LogLevel, configLevel as LogLevel)
      ).toBe(expected);
    }
  );
});
