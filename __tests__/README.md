# Integration Tests

This directory contains integration tests for the Ripple TypeScript SDKs.

## Structure

- `browser/` - Integration tests for the browser package (jsdom environment)
- `node/` - Integration tests for the Node.js package (node environment)

## Configuration

Each subdirectory has its own `vitest.config.ts` configured for the appropriate
test environment.
