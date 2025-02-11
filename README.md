# @heyatlas/logger

A structured logger with Slack integration and AWS Lambda support.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a detailed list of changes.

## Features

- Structured logging with Bunyan
- Slack integration
- AWS Lambda context support
- TypeScript support
- Log level management
- Async context tracking

## Installation

```bash
npm install @heyatlas/logger
```

## Usage

### Basic Usage

```typescript
import { Logger } from "@heyatlas/logger";

// Only name is required at root level
const logger = new Logger({
  name: "my-app",
});

// Environment is determined by process.env.NODE_ENV
// Defaults to "local" if not set
logger.info("Hello world", { userId: "123" });
```

### Slack Integration

```typescript
const logger = new Logger({
  name: "my-app",
  slackApiToken: "your-slack-token",
  staging: {
    streams: [{ type: "stdout", level: "info" }],
    slack: {
      defaultChannel: "#staging-logs",
      level: "warn",
    },
  },
  production: {
    streams: [{ type: "stdout", level: "info" }],
    slack: {
      defaultChannel: "#production-logs",
      level: "error",
    },
  },
});

logger.error("Something went wrong", {
  slack: { channel: "#alerts" },
  error: new Error("Details here"),
});
```

### AWS Lambda Support

```typescript
import { withLoggerLambda } from "@heyatlas/logger";
import { AsyncLocalStorage } from "async_hooks";

const executionContext = new AsyncLocalStorage();
export const handler = withLoggerLambda(
  executionContext,
  async (event, context) => {
    const logger = getLogger(executionContext);
    logger.info("Processing event", { event });
    // ... handler logic
  }
);
```

### Environment-based Configuration

The logger uses NODE_ENV to determine which environment configuration to use:

```typescript
import { Logger } from "@heyatlas/logger";

const logger = new Logger({
  name: "my-service",
  slackApiToken: process.env.SLACK_TOKEN, // Optional: enable Slack integration

  // Environment-specific configurations
  local: {
    streams: [{ level: "debug", type: "stdout" }],
  },
  test: {
    streams: [{ level: "fatal", type: "stdout" }],
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
      level: "error",
    },
  },
});
```

### Configuration Structure

The logger uses two levels of configuration:

1. Root Configuration:

   - `name` (required): Logger name
   - `slackApiToken` (optional): Slack API token for integration

2. Environment Configuration:
   - `streams` (required): Array of stream configurations
   - `slack` (optional): Slack settings per environment
     - `defaultChannel`: Default Slack channel
     - `level`: Minimum level for Slack notifications

## Environment Configuration

The logger supports different configurations per environment. You can use default configurations or provide your own:

### Default Configurations

The logger comes with default configurations for common environments:

```typescript
const defaultConfigs = {
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
```

### Custom Environment Configurations

You can provide your own environment configurations:

```typescript
import { getLogger, EnvironmentConfigs } from "@heyatlas/logger";
import { AsyncLocalStorage } from "async_hooks";

const customEnvConfigs: EnvironmentConfigs = {
  development: {
    streams: [{ level: "debug", type: "stdout" }],
  },
  qa: {
    streams: [
      { level: "info", type: "stdout" },
      { level: "error", type: "file", path: "/var/log/app.log" },
    ],
    slack: {
      defaultChannel: "#qa-alerts",
      level: "error",
    },
  },
};

const executionContext = new AsyncLocalStorage();

const logger = getLogger(
  executionContext,
  {
    name: "my-service",
    slackApiToken: process.env.SLACK_TOKEN,
    qa: {
      streams: [{ level: "debug", type: "stdout" }],
    },
  },
  customEnvConfigs
);
```

Each environment configuration can specify:

- Stream configurations (stdout, file)
- Slack integration settings
- Log levels per stream and Slack

## API Documentation

### Log Levels

The logger supports the following log levels in order of priority:

- `fatal`: System is unusable
- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug-level messages
- `trace`: Trace-level messages

## License

MIT
