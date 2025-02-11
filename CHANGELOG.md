# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2025-02-11

### Changed

- Fix SlackLogger default channel

## [1.3.0] - 2025-02-11

### Added

- Environment configuration support in Logger constructor
- Default environment configurations for test, local, staging, and production
- Simplified Slack configuration with single API token at root level

### Changed

- Logger constructor now accepts simplified root configuration
- Streams configuration moved to environment-specific configs
- Slack configuration split between root (API token) and environment (channel, level)
- Improved configuration merging

## [1.2.0] - 2025-02-10

### Added

- Environment configuration support in Logger constructor
- Default environment configurations for test, local, staging, and production

## [1.1.0] - 2025-02-10

### Added

- Custom environment configurations support through `envConfigs` parameter
- Default configurations for test, local, staging, and production environments
- Type definitions for environment configurations

### Changed

- `getLogger` function now accepts optional environment configurations

## [1.0.1] - 2025-02-07

- Add `withLoggerLambda` wrapper for Lambda handlers
- Add `getLogger` function to get the logger from the execution context
- Add `Logger` class to create a logger with a name and environment
- Add `SlackLogger` class to send logs to a Slack channel
- Add `LogLevelEnum` enum for log levels
- Add `isLevelEnabled` function to check if a log level is enabled

## [1.0.0] - 2025-02-07

- Initial release
