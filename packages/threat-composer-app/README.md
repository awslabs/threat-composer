# Threat Composer Single Page App (SPA)

React-based web application for threat modeling with browser-based storage.

> **For user documentation, deployment guides, and usage instructions, see [docs/WEB-APP.md](../../docs/WEB-APP.md)**

## Package Overview

This package contains the Threat Composer web application built with Vite. It provides:
- Full threat modeling capabilities in the browser
- Local storage for threat models
- Import/export functionality
- Multiple workspace support

## Local Development Setup

### Prerequisites
- Node.js 24 (the root `engines` field also accepts 20.19 and 22.13 or later)
- pnpm 10 (`npm install -g pnpm@10`)

### Setup

```bash
# From repository root
pnpm install --frozen-lockfile

# Start the Vite dev server
pnpm dev
```

The app will open at [http://localhost:3000](http://localhost:3000). Configuration is read from `import.meta.env` and must use the `VITE_` prefix: `VITE_ROUTE_BASE_PATH`, `VITE_GITHUB_PAGES` and `VITE_APP_MODE` (the last is set by `.env.browser-extension` / `.env.ide-extension` for the variant builds). `PUBLIC_URL` is read by `vite.config.ts` to set the base path of the website build.

## Build

```bash
# From repository root, everything
pnpm build

# Or just this package
pnpm nx run @aws/threat-composer-app:compile
```

Build output will be in the `build/` directory, with one subdirectory per variant (`website`, `browser-extension`, `ide-extension`). Each variant is a `vite build` with a different `--mode`; see `vite.config.ts`. `pnpm nx run @aws/threat-composer-app:preview` serves the website build with `vite preview`.

## Project Structure

```
src/
├── index.tsx                    # Application entry point
├── components/                  # React components
├── containers/                  # Container components
├── routes/                      # Route definitions
├── hooks/                       # Custom React hooks
├── utils/                       # Utility functions
└── config/                      # Configuration
```

## Development Commands

All commands run from the repository root.

```bash
# Start dev server
pnpm dev

# Build for production
pnpm nx run @aws/threat-composer-app:compile

# Run unit tests (Vitest)
pnpm nx run @aws/threat-composer-app:test

# Type check
pnpm nx run @aws/threat-composer-app:typecheck

# Run linter
pnpm nx run @aws/threat-composer-app:eslint
```

Browser tests for this app live in the repository's `e2e/` project; see [e2e/README.md](../../e2e/README.md).

## Contributing

When contributing to this package:

1. Follow React best practices
2. Use TypeScript for type safety
3. Maintain CloudScape design system patterns
4. Update user documentation in [docs/WEB-APP.md](../../docs/WEB-APP.md)
5. Test across different browsers

## Documentation

- **User Guide**: [docs/WEB-APP.md](../../docs/WEB-APP.md)
- **Main README**: [README.md](../../README.md)
- **Development Guide**: [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md)

## License

Licensed under Apache-2.0. See [LICENSE](../../LICENSE) for details.
