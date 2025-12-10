# Threat Composer VS Code Extension

View and edit Threat Composer files (`.tc.json`) directly within Visual Studio Code using the AWS Toolkit extension.

## Overview

The Threat Composer VS Code extension provides a native editing experience for threat models within your development environment. This integration allows you to:

- Create, view, and edit `.tc.json` files directly in VS Code
- Work with threat models alongside your code
- Leverage VS Code's powerful editor features
- Maintain threat models in version control with your codebase

## Installation

The Threat Composer functionality is included in the AWS Toolkit for Visual Studio Code extension.

### Install from VS Code Marketplace

1. Open Visual Studio Code
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on Mac)
3. Search for "AWS Toolkit"
4. Click **Install** on the [AWS Toolkit](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode) extension

### Install from Command Line

```bash
code --install-extension AmazonWebServices.aws-toolkit-vscode
```

## Usage

### Opening Threat Composer Files

Once installed, `.tc.json` files will automatically open in the Threat Composer editor:

1. Open any `.tc.json` file in VS Code
2. The Threat Composer custom editor will launch automatically
3. If it doesn't open automatically, right-click the file and select **Open With > Threat Composer**

### Creating New Threat Models

1. Create a new file with the `.tc.json` extension
2. The Threat Composer editor will open with an empty threat model
3. Start building your threat model using the visual interface

### Editing Threat Models

The VS Code extension provides the same full-featured interface as the web application:

- **Application Info**: Define your system description
- **Architecture**: Document system architecture with diagrams
- **Data Flow**: Map data flows and trust boundaries
- **Assumptions**: Capture design and security assumptions
- **Threats**: Identify and document threats using threat grammar
- **Mitigations**: Define mitigation strategies
- **Insights**: Review threat model quality metrics

### File Association

The extension automatically associates with `.tc.json` files. You can also:

- Set Threat Composer as the default editor for `.tc.json` files
- Use "Open With" to choose between Threat Composer and text editor views
- Edit the raw JSON when needed by opening with the default text editor

## Features

### Full Threat Composer Functionality

All features from the web application are available:

- Threat statement composition with grammar support
- Visual architecture and data flow diagrams
- Threat and mitigation linking
- Assumption tracking
- Insights dashboard
- Export to Markdown, DOCX, and PDF

### VS Code Integration

- **Native File Handling**: Works with VS Code's file system
- **Version Control**: Seamlessly integrates with Git and other VCS
- **Workspace Support**: Manage multiple threat models in your workspace
- **Side-by-Side Editing**: View threat models alongside code
- **Search**: Find threat models using VS Code's file search

### Offline Capability

- Works completely offline
- No external dependencies required
- All data stored locally in `.tc.json` files

## Source Code

The Threat Composer VS Code extension is part of the AWS Toolkit for Visual Studio Code:

- **Repository**: [aws/aws-toolkit-vscode](https://github.com/aws/aws-toolkit-vscode)
- **Threat Composer Code**: [packages/core/src/threatComposer](https://github.com/aws/aws-toolkit-vscode/tree/master/packages/core/src/threatComposer)

## Documentation

For detailed documentation on using the Threat Composer extension:

- [AWS Toolkit for VS Code User Guide - Threat Composer](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/threatcomposer-overview.html)
- [AWS Toolkit for VS Code Documentation](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/welcome.html)

## Compatibility

- **VS Code Version**: 1.70.0 or higher
- **Operating Systems**: Windows, macOS, Linux
- **File Format**: Threat Composer v1 schema (`.tc.json`)

## Tips and Best Practices

### Version Control

- Commit `.tc.json` files to your repository
- Review threat model changes in pull requests
- Track threat model evolution over time
- Use branches for experimental threat modeling

### Workspace Organization

```
project/
├── src/
├── docs/
│   └── threat-models/
│       ├── api-gateway.tc.json
│       ├── database.tc.json
│       └── authentication.tc.json
└── README.md
```

### Collaboration

- Share `.tc.json` files with team members
- Use VS Code Live Share for collaborative threat modeling
- Export to Markdown for documentation
- Include threat models in code reviews

## Troubleshooting

### Extension Not Loading

1. Ensure AWS Toolkit extension is installed and enabled
2. Reload VS Code window (`Ctrl+Shift+P` > "Reload Window")
3. Check VS Code version compatibility
4. Review VS Code extension logs

### File Not Opening in Threat Composer

1. Verify file has `.tc.json` extension
2. Right-click file > "Open With" > "Threat Composer"
3. Check file is valid JSON format
4. Ensure file follows Threat Composer schema

### Performance Issues

- Large threat models may take time to load
- Consider splitting very large models into multiple files
- Close unused editor tabs
- Increase VS Code memory limit if needed

## Support

For issues and questions:

- **AWS Toolkit Issues**: [GitHub Issues](https://github.com/aws/aws-toolkit-vscode/issues)
- **Threat Composer Core**: [GitHub Issues](https://github.com/awslabs/threat-composer/issues)
- **AWS Support**: [AWS Support Center](https://console.aws.amazon.com/support/)

## Related Resources

- [Threat Composer Web Application](./WEB-APP.md)
- [Threat Composer Browser Extension](./BROWSER-EXTENSION.md)
- [Threat Composer AI/CLI/MCP](./AI-CLI-MCP.md)
- [Development Guide](./DEVELOPMENT.md)
