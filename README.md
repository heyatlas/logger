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

// Regular logging with level validation
logger.error("Something went wrong", {
  slack: { channel: "#alerts" },
  error: new Error("Details here"),
});

// Direct Slack messaging without level validation
// Useful for sending notifications that don't need to go through the logger
logger.slackLogger?.sendDirect("#notifications", "Important notification");
```

The `sendDirect` method allows you to send messages directly to Slack without any formatting or level validation. This is useful for:

- Sending simple notifications that don't need to be logged
- Reusing the SlackLogger instance in other parts of your application
- Sending plain text messages to specific channels

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

## Child Loggers

The logger supports creating child loggers that inherit context from their parent while allowing for additional bound fields. This is particularly useful for tracking request-specific information across different parts of your application.

```typescript
// Create a parent logger
const logger = new Logger(config);

// Create a child logger with request-specific fields
const requestLogger = logger.child({ reqId: "123" });

// The child logger inherits the parent's context
logger.setContext("userId", "456");
requestLogger.info("Processing request"); // Includes both reqId and userId

// Child loggers can have their own context
requestLogger.setContext("component", "auth");
requestLogger.info("Authenticating user"); // Includes reqId, userId, and component

// Child loggers maintain their context across async boundaries
const executionContext = new AsyncLocalStorage<LoggerContext>();
executionContext.run({ logger: requestLogger }, async () => {
  // The logger maintains its context here
  requestLogger.info("Inside async context");
});
```

### Context Inheritance

Child loggers inherit their parent's context and can override it with their own bound fields. The inheritance works as follows:

1. Parent context is copied to the child
2. Bound fields are merged with the parent's context
3. Child-specific context can be added using `setContext`
4. Context is maintained across async boundaries

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
