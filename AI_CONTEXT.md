# AI Context

## Project Overview

Ripple TypeScript is a high-performance, scalable, and fault-tolerant event
tracking SDK system. This monorepo houses TypeScript/JavaScript SDKs for
different runtime environments (browser and Node.js).

## Architecture

### Monorepo Structure

```sh
ripple-ts/
├── packages/
│   ├── browser/          # Browser-specific SDK (@tapsioss/ripple-browser)
│   └── node/             # Node.js-specific SDK (@tapsioss/ripple-node)
├── core/                 # Shared internal package (@repo/core)
├── playground/           # Development playground
│   ├── browser/          # Browser testing environment
│   └── node/             # Node.js testing environment
└── scripts/              # Build and maintenance scripts
```

### Package Details

#### @tapsioss/ripple-browser

- **Purpose**: Event tracking SDK for browser environments
- **Entry**: `packages/browser/src/index.ts`
- **Build**: Dual format (ESM + CJS) with TypeScript declarations
- **Environment**: Browser (jsdom for testing)

#### @tapsioss/ripple-node

- **Purpose**: Event tracking SDK for Node.js runtime
- **Entry**: `packages/node/src/index.ts`
- **Build**: Dual format (ESM + CJS) with TypeScript declarations
- **Environment**: Node.js

#### @repo/core

- **Purpose**: Shared internal utilities and types
- **Entry**: `core/src/index.ts`
- **Status**: Private workspace package
- **Usage**: Shared code between browser and node packages

## Technology Stack

### Build & Development

- **Package Manager**: pnpm (v10.22.0) with workspaces
- **Node Version**: 24.10.0 (managed via Volta)
- **Bundler**: tsup (esbuild-based)
- **TypeScript**: 5.9.3 with strict mode
- **Testing**: Vitest with 100% coverage requirement
- **Linting**: ESLint 9 + Prettier
- **Versioning**: Changesets for version management

### TypeScript Configuration

- **Target**: ES2017
- **Module**: node20 (Node.js ESM resolution)
- **Strict Mode**: Enabled with additional safety checks
- **Path Aliases**: Configured for all packages
- **Key Features**:
  - `noUncheckedIndexedAccess`: true
  - `noPropertyAccessFromIndexSignature`: true
  - `verbatimModuleSyntax`: true
  - `rewriteRelativeImportExtensions`: true

## Development Workflow

### Scripts

- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm test:dev` - Watch mode for tests
- `pnpm check:lint` - Run all linting checks
- `pnpm dev` - Start playground development server

### Testing Requirements

- **Coverage**: 100% threshold enforced
- **Environment**: jsdom for browser, node for Node.js
- **Location**: `src/**/__tests__/**` or `*.test.ts` / `*.spec.ts`
- **Exclusions**: `index.ts` and `types.ts` files

### Build Output

- **Formats**: ESM (`.js`) and CommonJS (`.cjs`)
- **TypeScript**: Declaration files (`.d.ts`)
- **Minification**: Enabled
- **Source Maps**: Disabled

## Design Principles

### 1. Runtime Separation

- Browser and Node.js SDKs are separate packages
- Shared code lives in `@repo/core`
- Each package has runtime-specific implementations

### 2. Type Safety

- Strict TypeScript configuration
- No implicit any
- Exhaustive null/undefined checks
- Index access safety

### 3. Testing

- 100% code coverage requirement
- Unit tests co-located with source
- End-to-end tests in playground

### 4. Distribution

- Dual module format (ESM + CJS)
- Tree-shakeable exports
- Minimal bundle size (minified)

## API Contract

The SDK follows a framework-agnostic API contract defined in the main Ripple
repository. See: <https://github.com/Tap30/ripple/blob/main/API_CONTRACT.md>

## Contributing Guidelines

### Commit Convention

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes

### Pull Request Process

1. Fork and clone the repository
2. Create a feature branch
3. Make changes with appropriate tests
4. Ensure 100% test coverage
5. Run `pnpm check:lint` before committing
6. Submit PR with clear description

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Write descriptive variable names
- Add JSDoc comments for public APIs

## Key Files

- `package.json` - Root workspace configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration
- `pnpm-workspace.yaml` - Workspace definition
- `.changeset/config.json` - Changesets configuration

## Future Considerations

### Potential Enhancements

- Middleware/plugin system
- Batch event processing
- Retry mechanisms with exponential backoff
- Local storage/IndexedDB persistence (browser)
- File system persistence (Node.js)
- Optional Event validation and schema enforcement (via `zod`)
- Performance monitoring and metrics
- Debug mode with detailed logging

### Scalability

- Queue management for high-volume events
- Configurable flush intervals
- Memory-efficient event buffering
- Graceful degradation on errors

### Developer Experience

- Comprehensive TypeScript types
- Clear error messages
- Detailed documentation
- Usage examples and recipes
- Migration guides
