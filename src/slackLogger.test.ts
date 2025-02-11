import { WebClient } from "@slack/web-api";
import { isLevelEnabled } from "./isLevelEnabled";
import {
  COLOR_FROM_LEVEL,
  SlackLogger,
  SlackLoggerConfig,
} from "./slackLogger";
import { LogLevelEnum } from "./types";

// Mock WebClient
jest.mock("@slack/web-api");

describe("SlackLogger", () => {
  let slackLogger: SlackLogger;
  let mockPostMessage: jest.Mock;

  const config: SlackLoggerConfig = {
    apiToken: "test-token",
    defaultChannel: "#test-channel",
    level: LogLevelEnum.INFO,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup WebClient mock
    mockPostMessage = jest.fn().mockResolvedValue({ ok: true });
    (WebClient as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        postMessage: mockPostMessage,
      },
    }));

    // Create SlackLogger instance
    slackLogger = new SlackLogger(config);
  });

  describe("send", () => {
    it("should send message to Slack", async () => {
      // Arrange
      const message = "Test message";
      const level = LogLevelEnum.INFO; // This matches config.level
      const context = { requestId: "123" };

      // Act
      await slackLogger.send(level, message, context);

      // Assert
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: config.defaultChannel,
          text: expect.stringContaining(message),
          username: "AtlasLogger",
          icon_emoji: ":warning:",
          attachments: expect.arrayContaining([
            expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({ value: context.requestId }),
              ]),
            }),
          ]),
        })
      );
    });

    it("should use custom channel from context", async () => {
      // Arrange
      const customChannel = "#custom-channel";
      const message = "Test message";
      const level = LogLevelEnum.INFO;
      const context = { slack: { channel: customChannel } };

      // Act
      await slackLogger.send(level, message, context);

      // Assert
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: customChannel,
        })
      );
    });

    it("should not send message if level is below configured level", async () => {
      // Arrange
      const message = "Debug message";
      const level = LogLevelEnum.DEBUG;

      // Act
      await slackLogger.send(level, message);

      // Assert
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
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

      const context = {
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
      const configWithoutDefaultChannel: SlackLoggerConfig = {
        apiToken: "test-token",
        level: LogLevelEnum.INFO,
        defaultChannel: "", // Empty default channel
      };
      const localSlackLogger = new SlackLogger(configWithoutDefaultChannel);

      const message = "Test message";
      const context = {
        userId: "123",
      };

      // Act
      await localSlackLogger.send(level, message, context);

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
      const context = {
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
