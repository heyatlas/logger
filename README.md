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
- Context management with AsyncLocalStorage

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

### Usage Scenarios

#### 1. AWS Lambda Functions

```typescript
import { AsyncLocalStorage } from "async_hooks";
import { createLogger, withLoggerLambda } from "@heyatlas/logger";

// Create execution context
const executionContext = new AsyncLocalStorage();

// Create logger factory
const { logger, getLogger } = createLogger(executionContext, {
  name: "my-lambda-service",
  slackApiToken: process.env.SLACK_TOKEN,
  production: {
    streams: [{ level: "info", type: "stdout" }],
    slack: {
      defaultChannel: "#prod-alerts",
      level: "error",
    },
  },
});

// Export getLogger for use in other modules
export { getLogger };

// Lambda handler
export const handler = withLoggerLambda(
  executionContext,
  async (event, context) => {
    const logger = getLogger();

    logger.info("Processing event", { event });

    try {
      // Your handler logic here
      const result = await processEvent(event);
      logger.info("Event processed successfully", { result });
      return result;
    } catch (error) {
      logger.error("Failed to process event", { error });
      throw error;
    }
  }
);
```

#### 2. EC2/ECS API Service (Express)

```typescript
import express from "express";
import { AsyncLocalStorage } from "async_hooks";
import { createLogger } from "@heyatlas/logger";

const app = express();
const executionContext = new AsyncLocalStorage();

// Create logger factory
const { logger, getLogger } = createLogger(executionContext, {
  name: "my-api-service",
  slackApiToken: process.env.SLACK_TOKEN,
  production: {
    streams: [{ level: "info", type: "stdout" }],
    slack: {
      defaultChannel: "#prod-alerts",
      level: "error",
    },
  },
});

// Export getLogger for use in other modules
export { getLogger };

// Middleware to create context for each request
app.use((req, res, next) => {
  executionContext.run({ logger }, () => next());
});

// Example route
app.get("/users/:id", async (req, res) => {
  const logger = getLogger();

  try {
    logger.info("Fetching user", { userId: req.params.id });
    const user = await userService.getUser(req.params.id);
    logger.info("User fetched successfully", { user });
    res.json(user);
  } catch (error) {
    logger.error("Failed to fetch user", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});
```

#### 3. GraphQL Service

```typescript
import { ApolloServer } from "apollo-server";
import { AsyncLocalStorage } from "async_hooks";
import { createLogger } from "@heyatlas/logger";

const executionContext = new AsyncLocalStorage();

// Create logger factory
const { logger, getLogger } = createLogger(executionContext, {
  name: "my-graphql-service",
  slackApiToken: process.env.SLACK_TOKEN,
  production: {
    streams: [{ level: "info", type: "stdout" }],
    slack: {
      defaultChannel: "#prod-alerts",
      level: "error",
    },
  },
});

// Export getLogger for use in other modules
export { getLogger };

// Apollo Server context
const context = async ({ req }) => {
  return executionContext.run({ logger }, () => ({ req }));
};

// Example resolver
const resolvers = {
  Query: {
    user: async (_, { id }, context) => {
      const logger = getLogger();

      try {
        logger.info("Fetching user", { userId: id });
        const user = await userService.getUser(id);
        logger.info("User fetched successfully", { user });
        return user;
      } catch (error) {
        logger.error("Failed to fetch user", { error });
        throw error;
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
});
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
