# @heyatlas/logger

A structured logger with Slack integration and AWS Lambda support.

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

const logger = new Logger({
  name: "my-app",
  streams: [{ type: "stdout", level: "info" }],
});

logger.info("Hello world", { userId: "123" });
```

### Slack Integration

```typescript
const logger = new Logger({
  name: "my-app",
  streams: [{ type: "stdout", level: "info" }],
  slack: {
    apiToken: "your-slack-token",
    defaultChannel: "#logs",
    level: "error",
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
