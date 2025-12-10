# Threat Composer UI Components Library

React component library for building threat modeling interfaces.

> **For user guides and application usage, see the main [README](../../README.md) and [docs/](../../docs/)**

## Package Overview

This package contains the core React UI components used across Threat Composer applications. It provides:
- Threat statement composition components
- Diagram editors (architecture and data flow)
- Workspace management components
- Insights dashboard
- Import/export functionality

Built with:
- React
- TypeScript
- CloudScape Design System

## Local Development Setup

### Prerequisites
- Node.js 20 or higher
- Yarn package manager

### Setup

```bash
# From repository root
pdk install --frozen-lockfile

# Run Storybook for component development
pdk run storybook
```

Storybook will open at [http://localhost:6006](http://localhost:6006)

**Storybook is the recommended development environment** for working on UI components.

## Build

```bash
# From repository root
pdk build

# Or from package directory
cd packages/threat-composer
yarn build
```

Build output will be in the `dist/` directory.

## Project Structure

```
src/
├── index.ts                     # Package exports
├── types.ts                     # TypeScript types
├── components/                  # React components
├── containers/                  # Container components
├── contexts/                    # React contexts
├── hooks/                       # Custom React hooks
├── utils/                       # Utility functions
├── configs/                     # Configuration
├── data/                        # Reference data
│   ├── workspaceExamples/       # Example threat models
│   ├── threatPacks/             # Threat packs
│   └── mitigationPacks/         # Mitigation packs
├── migrations/                  # Data migrations
└── styles/                      # Styling
```

## Development Commands

```bash
# Run Storybook
yarn storybook

# Build library
yarn build

# Run tests
yarn test

# Run linter
yarn lint

# Format code
yarn format

# Type checking
yarn type-check
```

## Using in Other Projects

```bash
# Install from npm (when published)
npm install @aws/threat-composer

# Or link locally for development
cd packages/threat-composer
yarn link

cd your-project
yarn link @aws/threat-composer
```

## Component Development

When developing components:

1. Create component in `src/components/`
2. Add Storybook story in component directory
3. Export from `src/index.ts`
4. Document props with TypeScript
5. Follow CloudScape design patterns
6. Add tests

Example component structure:
```
src/components/MyComponent/
├── index.tsx              # Component implementation
├── MyComponent.stories.tsx # Storybook story
├── types.ts               # Component types
└── __tests__/             # Tests
    └── index.test.tsx
```

## Customizing Reference Data

### Workspace Examples

Add example threat models in `src/data/workspaceExamples/`:

1. Create `.tc.json` file
2. Import in `workspaceExamples.ts`
3. Add to `workspaceExamples` array

### Threat Packs

Add threat packs in `src/data/threatPacks/`:

1. Create `.tc.json` file with threats
2. Create `.metadata.json` file
3. Run `yarn run build:packs`
4. Import generated pack in `threatPacks.ts`

### Mitigation Packs

Add mitigation packs in `src/data/mitigationPacks/`:

1. Create `.tc.json` file with mitigations
2. Create `.metadata.json` file
3. Run `yarn run build:packs`
4. Import generated pack in `mitigationPacks.ts`

## Testing

```bash
# Run all tests
yarn test

# Run with coverage
yarn test --coverage

# Run in watch mode
yarn test --watch

# Run specific test
yarn test MyComponent
```

## Contributing

When contributing to this package:

1. Use Storybook for component development
2. Follow React and TypeScript best practices
3. Maintain CloudScape design system patterns
4. Add comprehensive tests
5. Document components with JSDoc
6. Update Storybook stories

## Documentation

- **Main README**: [README.md](../../README.md)
- **Development Guide**: [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md)
- **Storybook**: Run `yarn storybook` for interactive component docs

## License

Licensed under Apache-2.0. See [LICENSE](../../LICENSE) for details.
