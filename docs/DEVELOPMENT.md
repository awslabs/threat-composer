# Threat Composer Development Guide

This guide covers development setup, architecture, and contribution guidelines for the Threat Composer project.

## Repository Overview

This monorepo hosts multiple packages that make up the Threat Composer ecosystem:

- **threat-composer**: Core UI components library
- **threat-composer-app**: Web application (SPA)
- **threat-composer-app-browser-extension**: Browser extension for Chrome/Firefox
- **threat-composer-infra**: AWS CDK infrastructure code
- **threat-composer-ai**: AI-powered CLI and MCP server for automated threat modeling

The repository is a [pnpm workspace](https://pnpm.io/workspaces) with [nx](https://nx.dev/) as the task runner. pnpm handles dependency management and nx handles the task graph. Each package declares its targets in a `project.json`, and `pnpm build` runs the whole graph with caching.

## Repository Structure

| Project                               | Path                                           | Description                                                                                            | Tech Stack                                                                          |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| threat-composer                       | packages/threat-composer                       | UI components for threat-composer                                                                      | [React](https://react.dev/), [CloudScape design system](https://cloudscape.design/) |
| threat-composer-app                   | packages/threat-composer-app                   | threat-composer Single Page App (SPA) bootstrapped by [create-react-app](https://create-react-app.dev/) | React                                                                               |
| threat-composer-infra                 | packages/threat-composer-infra                 | threat-composer Infrastructure CDK App                                                                 | [AWS CDK](https://aws.amazon.com/cdk/)                                              |
| threat-composer-app-browser-extension | packages/threat-composer-app-browser-extension | threat-composer browser extension                                                                      | [wxt](https://wxt.dev/), React                                                      |
| threat-composer-ai                    | packages/threat-composer-ai                    | AI-powered CLI and MCP server                                                                          | Python, [Strands](https://github.com/awslabs/strands), FastMCP                      |

## Prerequisites

### Required Tools

- [NodeJS](https://nodejs.org/en/) (version 20 or higher)
- [pnpm](https://pnpm.io/) (version 10) - Install via `npm install -g pnpm@10`
- [uv](https://github.com/astral-sh/uv) - Python package manager, needed for packages/threat-composer-ai
- [git-secrets](https://github.com/awslabs/git-secrets#installing-git-secrets)
- [oss-attribution-generator](https://www.npmjs.com/package/oss-attribution-generator) - Install via `npm install -g oss-attribution-generator`

### Optional Tools (for specific packages)

- [AWS CLI](https://aws.amazon.com/cli/) (version 2 or higher) - For infrastructure deployment
- [AWS CDK v2](https://aws.amazon.com/cdk/) - Install via `npm install -g aws-cdk`
- [Python 3.10+](https://www.python.org/) - For threat-composer-ai package

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/awslabs/threat-composer.git
cd threat-composer
```

### Install Dependencies

```bash
pnpm install --frozen-lockfile
```

This will install all dependencies for all packages in the monorepo. The `postinstall` step also runs `uv sync` for the Python package.

### Build All Projects

```bash
pnpm build
```

This runs every nx `build` target in dependency order. `build` includes compilation, eslint, ruff, unit tests, pytest and the e2e typecheck, so a green build is also a green lint and test run. Results are cached, so unchanged packages are skipped on the next run.

## Development Workflows

### Working with UI Components (threat-composer)

The threat-composer package contains the core UI components. The recommended development environment is Storybook.

#### Run Storybook

```bash
pnpm storybook
```

Open [http://localhost:6006](http://localhost:6006/) to view it in the browser. The page will reload if you make edits.

**This is the recommended development environment for UI component work.**

#### Run Tests

```bash
pnpm nx run @aws/threat-composer:test
```

### Working with the Web App (threat-composer-app)

#### Start Development Server

```bash
pnpm dev
```

This starts the web application in development mode. Open [http://localhost:3000](http://localhost:3000/) to view it in the browser.

#### Build for Production

```bash
pnpm nx run @aws/threat-composer-app:compile
```

The build artifacts will be in the `packages/threat-composer-app/build/` directory.

### Working with the Browser Extension

See the [Browser Extension README](../packages/threat-composer-app-browser-extension/README.md) for detailed instructions.

Quick start (from the repository root):

```bash
# Chrome development
pnpm dev:extension

# Firefox development
pnpm nx run @aws/threat-composer-app-browser-extension:dev:firefox
```

### Working with Infrastructure (threat-composer-infra)

#### Deploy to AWS

```bash
# Deploy dev environment
./scripts/deployDev.sh

# Deploy with CI/CD pipeline
./scripts/deployAll.sh
```

#### CDK Commands

```bash
cd packages/threat-composer-infra

# Synthesize CloudFormation template
cdk synth

# Deploy stack
cdk deploy

# Destroy stack
cdk destroy
```

### Working with AI Package (threat-composer-ai)

```bash
cd packages/threat-composer-ai

# Install dependencies
uv sync

# Run CLI
uv run threat-composer-ai-cli /path/to/codebase

# Run MCP server
uv run threat-composer-ai-mcp

# Run tests
uv run pytest
```

## Project Commands

### Monorepo Commands (from root)

```bash
# Install all dependencies
pnpm install --frozen-lockfile

# Build all packages (compile, eslint, ruff, unit tests, pytest, e2e typecheck)
pnpm build

# Run Storybook
pnpm storybook

# Start web app dev server
pnpm dev

# Run all tests
pnpm test

# Lint all packages (eslint for TypeScript, ruff for Python)
pnpm lint

# Type check all packages
pnpm typecheck

# Show the nx task graph
pnpm graph
```

### Package-Specific Commands

Packages do not have their own scripts. Run a single package's nx target from the repository root with `pnpm nx run <package>:<target>`. The package name is the `name` in its `project.json` and the targets are listed there too.

```bash
# Run tests
pnpm nx run @aws/threat-composer:test

# Build package
pnpm nx run @aws/threat-composer:build

# Lint
pnpm nx run @aws/threat-composer:eslint
```

## Code Organization

### UI Components (packages/threat-composer/src/)

```
src/
├── components/          # React components
│   ├── application/     # Application info components
│   ├── architecture/    # Architecture components
│   ├── assumptions/     # Assumptions components
│   ├── threats/         # Threat components
│   └── mitigations/     # Mitigation components
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── data/                # Reference data
│   ├── workspaceExamples/
│   ├── threatPacks/
│   └── mitigationPacks/
└── styles/              # Global styles
```

### Web App (packages/threat-composer-app/src/)

```
src/
├── components/          # App-specific components
├── containers/          # Container components
├── routes/              # Route definitions
├── hooks/               # App-specific hooks
└── utils/               # App utilities
```

### Infrastructure (packages/threat-composer-infra/src/)

```
src/
├── application-stack.ts # Application CloudFormation stack
├── application-stage.ts # Application stage
├── pipeline-stack.ts    # CI/CD pipeline stack
└── pipeline.ts          # Pipeline definition
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm nx run @aws/threat-composer:test

# Run tests in watch mode
pnpm nx run @aws/threat-composer:test:watch

# Run tests with coverage
pnpm nx run @aws/threat-composer:test -- --coverage
```

### End-to-end tests

Playwright tests for the web app live in `e2e/`. See the [e2e README](../e2e/README.md).

```bash
# Once: download Chromium
pnpm e2e:install-browsers

# Run the suite (Playwright starts the dev server itself)
BROWSER=none pnpm e2e

# Playwright UI mode
pnpm e2e:ui
```

## Code Quality

### Linting

```bash
# Lint all packages (eslint for TypeScript, ruff for Python)
pnpm lint

# eslint only
pnpm eslint
```

### Formatting

The TypeScript packages run eslint with `--fix`, so `pnpm eslint` also applies Prettier formatting. For the Python package:

```bash
pnpm nx run threat-composer-ai:lint:fix
```

### Type Checking

```bash
# Type check all packages
pnpm typecheck

# Type check specific package
pnpm nx run @aws/threat-composer-e2e:typecheck
```

## Building for Production

### Build All Packages

```bash
pnpm build
```

### Build Specific Package

```bash
pnpm nx run @aws/threat-composer:build
```

### Build Browser Extension

```bash
# Build for Chrome and Firefox
pnpm nx run @aws/threat-composer-app-browser-extension:compile

# Build for one browser only
pnpm nx run @aws/threat-composer-app-browser-extension:compile:chrome
pnpm nx run @aws/threat-composer-app-browser-extension:compile:firefox

# Create distribution ZIP
pnpm nx run @aws/threat-composer-app-browser-extension:zip
pnpm nx run @aws/threat-composer-app-browser-extension:zip:firefox
```

## Deployment

### Deploy Web Application

See [Web App Documentation](./WEB-APP.md) for detailed deployment instructions.

Quick deploy:

```bash
# Deploy dev environment
./scripts/deployDev.sh

# Deploy with CI/CD
./scripts/deployAll.sh
```

## Contributing

### Contribution Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run linting: `pnpm lint`
6. Commit your changes: `git commit -m "Add my feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Create a Pull Request

### Commit Message Guidelines

Follow conventional commit format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

### Code Review Process

1. All changes require a pull request
2. At least one approval required
3. All CI checks must pass
4. Code must follow project style guidelines

## Troubleshooting

### Common Issues

#### Dependency Installation Failures

```bash
git clean -fXd
pnpm install --frozen-lockfile
```

### Getting Help

- Check existing [GitHub Issues](https://github.com/awslabs/threat-composer/issues)
- Review [Discussions](https://github.com/awslabs/threat-composer/discussions)
- Read package-specific READMEs
- Consult documentation in `docs/` directory

## Additional Resources

### Documentation

- [Web Application](./WEB-APP.md)
- [VS Code Extension](./VSCODE-EXTENSION.md)
- [Browser Extension](./BROWSER-EXTENSION.md)
- [AI/CLI/MCP](./AI-CLI-MCP.md)

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](../LICENSE) file for details.

## Support

For bugs, issues, and feature requests, please use [GitHub Issues](https://github.com/awslabs/threat-composer/issues).

For general questions and discussions, use [GitHub Discussions](https://github.com/awslabs/threat-composer/discussions).
