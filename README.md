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

const logger = new Logger({ name: "my-app" });
logger.info("Hello, world!");
```

### Slack Integration

```typescript
const logger = new Logger({ name: "my-app", slack: {
  apiToken: "your-slack-token",
  channel: "#your-channel",
```

### AWS Lambda Support

```typescript
import { withLoggerLambda } from "@heyatlas/logger";

const handler = withLoggerLambda(async (event, context) => {
  const logger = getLogger();
  logger.info("Hello, world!");
});
```
