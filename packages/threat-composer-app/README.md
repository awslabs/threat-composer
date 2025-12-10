# Threat Composer Single Page App (SPA)

React-based web application for threat modeling with browser-based storage.

> **For user documentation, deployment guides, and usage instructions, see [docs/WEB-APP.md](../../docs/WEB-APP.md)**

## Package Overview

This package contains the Threat Composer web application built with Create React App. It provides:
- Full threat modeling capabilities in the browser
- Local storage for threat models
- Import/export functionality
- Multiple workspace support

## Local Development Setup

### Prerequisites
- Node.js 20 or higher
- Yarn package manager

### Setup

```bash
# From repository root
pdk install --frozen-lockfile

# Start development server
pdk run dev

# Or from package directory
cd packages/threat-composer-app
yarn start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Build

```bash
# From repository root
pdk build

# Or from package directory
cd packages/threat-composer-app
yarn build
```

Build output will be in the `build/` directory.

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

```bash
# Start dev server
yarn start

# Build for production
yarn build

# Run tests
yarn test

# Run linter
yarn lint

# Format code
yarn format
```

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
