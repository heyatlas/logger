import { WebClient } from "@slack/web-api";
import { COLOR_FROM_LEVEL, LogLevelEnum, SlackLogger } from "./slackLogger";
import { Context, SlackConfig } from "./types";
import { isLevelEnabled } from "./isLevelEnabled";

// Mock the WebClient class
jest.mock("@slack/web-api");

describe("SlackLogger", () => {
  let slackLogger: SlackLogger;
  let mockPostMessage: jest.Mock;

  const config: SlackConfig = {
    apiToken: "test-token",
    level: LogLevelEnum.INFO,
    defaultChannel: "#default-channel",
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a mock for the postMessage method
    mockPostMessage = jest.fn();
    (WebClient as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        postMessage: mockPostMessage,
      },
    }));

    // Create a new SlackLogger instance before each test
    slackLogger = new SlackLogger(config);
  });

  describe.each([
    { level: LogLevelEnum.TRACE },
    { level: LogLevelEnum.DEBUG },
    { level: LogLevelEnum.INFO },
    { level: LogLevelEnum.WARN },
    { level: LogLevelEnum.ERROR },
    { level: LogLevelEnum.FATAL },
  ])("send - $level", ({ level }) => {
    it("should send a correctly formatted message", async () => {
      // Skip test for levels below config level
      if (!isLevelEnabled(level, config.level)) {
        return;
      }

      // Arrange
      const message = "Test message";
      const channel = "#test-channel";

      const context: Context = {
        userId: "123",
        requestId: "456",
        slack: {
          channel,
          username: "CustomLogger",
        },
        extra: {
          details: "Some details",
        },
      };

      // Act
      await slackLogger.send(level, message, context);

      // Assert
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith({
        text: `*${level.toUpperCase()}:* ${message}`,
        channel,
        username: "CustomLogger",
        icon_emoji: ":warning:",
        attachments: [
          {
            fields: expect.arrayContaining([
              {
                title: "userId",
                value: "123",
                short: false,
              },
              {
                title: "requestId",
                value: "456",
                short: false,
              },
              {
                title: "extra",
                value: JSON.stringify({ details: "Some details" }),
                short: false,
              },
            ]),
            color: COLOR_FROM_LEVEL[level],
          },
        ],
      });
    });

    it("should not send message when slack channel is not provided", async () => {
      // Arrange
      const message = "Test message";
      const context: Context = {
        userId: "123",
      };

      // Act
      await slackLogger.send(level, message, context);

      // Assert
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      // Skip test for levels below config level
      if (!isLevelEnabled(level, config.level)) {
        return;
      }

      // Arrange
      mockPostMessage.mockRejectedValue(new Error("Slack API Error"));
      const message = "Test message";
      const context: Context = {
        slack: {
          channel: "#test-channel",
        },
      };

      // Act & Assert
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      await expect(
        slackLogger.send(level, message, context)
      ).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error sending slack message:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
