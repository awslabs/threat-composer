# Threat Composer Browser Extension

View web-accessible Threat Composer files (`.tc.json`) with one click directly in your browser.

## Overview

The Threat Composer browser extension allows you to view `.tc.json` files hosted on the web without downloading them. The extension adds a "View in Threat Composer" button to supported platforms, making it easy to review threat models stored in repositories or shared via URLs.

## Supported Platforms

GitHub, GitLab, Bitbucket and Amazon CodeCatalyst.

Each integration can be individually enabled/disabled and configured with custom URL patterns for self-hosted instances.

## Features

- Read-only viewing of complete threat models
- Seamless integration with supported platform UIs
- Quick access during code review without downloading files
- Works with public and private repositories (with appropriate access)
- Per-integration enable/disable toggles
- Custom URL patterns for self-hosted instances (e.g. GitLab self-managed)
- Debug mode for troubleshooting
- Bundled Threat Composer app with no external dependencies

## Installation

### Chrome Web Store

*Not yet published*

### Firefox Add-ons

*Not yet published*

### Manual Installation (Development)

#### For Chrome

1. Clone the threat-composer repository
2. Run the main build script: `./scripts/build.sh`
3. Open Chrome and navigate to `chrome://extensions`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Navigate to `./.output/chrome-mv3` directory and click "Open"

#### For Firefox

1. Clone the threat-composer repository
2. Run the main build script: `./scripts/build.sh`
3. Open Firefox and navigate to `about:debugging`
4. Click "This Firefox"
5. Click "Load Temporary Add-on..."
6. Navigate to `./.output/firefox-mv2` directory and select any file

## Usage

1. Navigate to a `.tc.json` file on any supported platform
2. Look for the "View in Threat Composer" button in the file actions
3. Click to open the threat model in the viewer

## Building from Source

### Prerequisites

- Node.js (version 20 or higher)
- Yarn package manager

### Build Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/awslabs/threat-composer.git
   cd threat-composer
   ```

2. Run the main build script:
   ```bash
   ./scripts/build.sh
   ```

3. The built extensions will be in:
   - Chrome: `./.output/chrome-mv3`
   - Firefox: `./.output/firefox-mv2`

### Creating Distribution Packages

#### Chrome ZIP

```bash
cd ./packages/threat-composer-app-browser-extension
yarn run zip
```

The ZIP file will be created in `./.output/`

#### Firefox ZIP

```bash
cd ./packages/threat-composer-app-browser-extension
yarn run zip:firefox
```

The ZIP file will be created in `./.output/`

## Development

### Running in Development Mode

#### Chrome

```bash
cd ./packages/threat-composer-app-browser-extension
yarn run dev
```

Then navigate to a supported integration to test: [Example 1](https://github.com/awslabs/threat-composer/blob/main/packages/threat-composer/src/data/workspaceExamples/ThreatComposer.tc.json), [Example 2](https://github.com/awslabs/threat-composer/blob/main/packages/threat-composer/src/data/workspaceExamples/GenAIChatbot.tc.json), [Example 3](https://raw.githubusercontent.com/awslabs/threat-composer/main/packages/threat-composer/src/data/workspaceExamples/GenAIChatbot.tc.json)

#### Firefox

```bash
cd ./packages/threat-composer-app-browser-extension
yarn run dev:firefox
```

### Project Structure

```
packages/threat-composer-app-browser-extension/
├── public/                          # Static assets
├── src/
│   ├── entrypoints/
│   │   ├── background.ts            # Service worker
│   │   ├── content-script.ts        # Main content script
│   │   ├── content-script/
│   │   │   ├── handlers/            # Platform-specific handlers
│   │   │   ├── utils/               # Shared utilities
│   │   │   └── types.ts
│   │   └── popup/                   # Extension popup UI
│   └── debugLogger.ts
├── wxt.config.ts                    # WXT configuration
└── package.json
```

### Technology Stack

- **Framework**: [WXT](https://wxt.dev/) - Modern web extension framework
- **UI**: React
- **Build Tool**: Vite (via WXT)

## Permissions

The extension requires the following permissions:

- **activeTab**: To inject the viewer button on supported pages
- **storage**: To store user preferences (if any)
- **Host permissions**: For GitHub, CodeCatalyst, and other supported platforms

## Privacy

- The extension does not collect or transmit any data
- All threat model viewing happens locally in your browser
- No analytics or tracking
- No external API calls

## Troubleshooting

### Button Not Appearing

1. Verify the extension is installed and enabled
2. Refresh the page
3. Check that the URL contains `.tc.json`
4. Ensure you're on a supported platform

### Viewer Not Loading

1. Check browser console for errors
2. Verify the `.tc.json` file is valid JSON
3. Ensure the file follows Threat Composer schema
4. Try reloading the extension

## Known Limitations

- Read-only viewing (no editing capability)
- Requires internet access to load files from web
- Large threat models may take time to load

## Source Code

- **Repository**: [awslabs/threat-composer](https://github.com/awslabs/threat-composer)
- **Extension Code**: [packages/threat-composer-app-browser-extension](https://github.com/awslabs/threat-composer/tree/main/packages/threat-composer-app-browser-extension)

## Contributing

Contributions are welcome! See the main [Contributing Guidelines](../CONTRIBUTING.md) for details.

### Adding New Platform Support

To add support for a new platform:

1. Create a new content script in `src/entrypoints/`
2. Add platform-specific injection logic
3. Update the manifest permissions
4. Test on the target platform
5. Submit a pull request

## Support

For issues and questions:

- **GitHub Issues**: [threat-composer/issues](https://github.com/awslabs/threat-composer/issues)
- **Discussions**: [threat-composer/discussions](https://github.com/awslabs/threat-composer/discussions)

## Related Resources

- [Threat Composer Web Application](./WEB-APP.md)
- [Threat Composer VS Code Extension](./VSCODE-EXTENSION.md)
- [Threat Composer AI/CLI/MCP](./AI-CLI-MCP.md)
- [Development Guide](./DEVELOPMENT.md)
