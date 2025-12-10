# Threat Composer Browser Extension

View web-accessible Threat Composer files (`.tc.json`) with one click directly in your browser.

## Overview

The Threat Composer browser extension allows you to view `.tc.json` files hosted on the web without downloading them. The extension adds a "View in Threat Composer" button to supported platforms, making it easy to review threat models stored in repositories or shared via URLs.

## Supported Platforms

The extension integrates with the following platforms:

- **GitHub Code Browser**: View `.tc.json` files in GitHub repositories
- **Amazon CodeCatalyst**: View threat models in CodeCatalyst projects
- **Direct URLs**: Any web-accessible `.tc.json` file (with URL containing `.tc.json`)

**Note**: On Firefox, the extension does not work on `githubusercontent.com` due to the `sandbox` CSP directive.

## Installation

### Chrome Web Store

*Coming soon - extension will be published to Chrome Web Store*

### Firefox Add-ons

*Coming soon - extension will be published to Firefox Add-ons*

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

### Viewing Threat Models on GitHub

1. Navigate to a `.tc.json` file in any GitHub repository
2. Look for the "View in Threat Composer" button added by the extension
3. Click the button to open the threat model in the Threat Composer viewer
4. The threat model will be displayed with full functionality

### Viewing Threat Models on CodeCatalyst

1. Navigate to a `.tc.json` file in your CodeCatalyst project
2. Click the "View in Threat Composer" button
3. Review the threat model in the integrated viewer

### Viewing Direct URLs

1. Navigate to any URL containing `.tc.json` (e.g., raw GitHub URLs)
2. The extension will detect the file and add the viewing button
3. Click to open in Threat Composer

## Features

### Read-Only Viewing

- View complete threat models including:
  - Application information
  - Architecture diagrams
  - Data flow diagrams
  - Assumptions
  - Threats
  - Mitigations
  - Insights

### Integrated Experience

- Seamless integration with GitHub and CodeCatalyst UI
- No need to download files
- Quick access to threat models during code review
- Works with public and private repositories (with appropriate access)

### Offline Capability

- The Threat Composer web app is bundled within the extension
- No external dependencies required after installation
- Fast loading times

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

Then navigate to a supported integration to test:
- [Example 1](https://github.com/awslabs/threat-composer/blob/main/packages/threat-composer/src/data/workspaceExamples/ThreatComposer.tc.json)
- [Example 2](https://github.com/awslabs/threat-composer/blob/main/packages/threat-composer/src/data/workspaceExamples/GenAIChatbot.tc.json)
- [Example 3](https://raw.githubusercontent.com/awslabs/threat-composer/main/packages/threat-composer/src/data/workspaceExamples/GenAIChatbot.tc.json)

#### Firefox

```bash
cd ./packages/threat-composer-app-browser-extension
yarn run dev:firefox
```

**Note**: On Firefox, the extension does not work on `githubusercontent.com` due to CSP restrictions.

### Project Structure

```
packages/threat-composer-app-browser-extension/
├── public/                          # Static assets
│   ├── scriptInjectForCodeCatalyst.js
│   └── scriptInjectForThreatComposer.js
├── src/
│   ├── entrypoints/                # Extension entry points
│   └── debugLogger.ts              # Debug utilities
├── wxt.config.ts                   # WXT configuration
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

### Firefox-Specific Issues

- The extension does not work on `githubusercontent.com` due to CSP restrictions
- Use GitHub's code browser view instead of raw file URLs

## Known Limitations

- Read-only viewing (no editing capability)
- Firefox: Does not work on `githubusercontent.com`
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
