# Threat Composer

An ecosystem of threat modeling tools to help humans reduce time-to-value when threat modeling.

![Animated gif of Full mode](/docs/threat-composer.gif)

**[Live Demo](https://awslabs.github.io/threat-composer)** | **[Documentation](#documentation)** | **[Getting Started](#getting-started)**

## What is Threat Composer?

Threat Composer is a threat modeling ecosystem that helps you identify security issues and develop strategies to address them in the context of your system. The various tools has been designed to support the iterative and non-linear nature of real-world threat modeling.

### Why Threat Composer?

1. **Helps you get started quickly** - The AI-assisted CLI and MCP Server analyze your source code to generate a starter threat model, so you never face a blank page. Human expertise and participation remain essential to refine, validate, and evolve the threat model for your specific context
2. **Makes threat identification easier** - Uses ["Threat Grammar"](https://catalog.workshops.aws/threatmodel/en-US/what-can-go-wrong/threat-grammar) to help you iteratively write useful threats, with full examples for inspiration
3. **Provides quality insights** - Includes an insights dashboard to help identify areas for improvement
4. **Supports non-linear workflows** - Designed for how threat modeling actually works in practice
5. **Enables iteration** - Supports "living" threat models that evolve with your system

## Key Features

- **Threat Statement Composition**: Structured threat grammar with adaptive suggestions
- **Visual Diagrams**: Architecture and data flow diagram support
- **Assumptions Tracking**: Document and link assumptions to threats and mitigations
- **Insights Dashboard**: Quality metrics and improvement suggestions
- **Threat & Mitigation Packs**: Reusable threat and mitigation libraries (self-hosted)
- **Multiple Export Formats**: JSON, Markdown, DOCX, and PDF
- **Workspace Management**: Work on multiple threat models simultaneously
- **Version Control Friendly**: JSON format works seamlessly with Git

## Threat Composer Ecosystem

Threat Composer is available in multiple complementary tools to fit your workflow:

### 🌐 Web Application
**Hosted or Self-Hosted Static Website**

![Status: Stable](https://img.shields.io/badge/Status-Stable-green)

- **GitHub Pages**: [Try the live demo](https://awslabs.github.io/threat-composer)
- **Self-Hosted**: Deploy to your AWS account with full customization
- **Features**: Full threat modeling capabilities, browser-based storage, import/export

📖 [Web App Documentation](./docs/WEB-APP.md)

### 🤖 AI-Powered CLI & MCP Server

**Automated Threat Modeling** 

![Status: Experimental](https://img.shields.io/badge/Status-Experimental-orange)

- **CLI**: Analyze codebases and generate starter threat models automatically
- **MCP Server**: Workflow management and schema validation for AI assistants
- Uses AWS Bedrock with multi-agent architecture
- **Note**: Bedrock inference costs apply - see [pricing](https://aws.amazon.com/bedrock/pricing/)

📖 [AI/CLI/MCP Documentation](./docs/AI-CLI-MCP.md)

### 🔌 VS Code Extension
**Native Threat Modeling in Your IDE**

![Status: Stable](https://img.shields.io/badge/Status-Stable-green)

- Edit Threat Composer `.tc.json` files directly in VS Code
- Integrated with AWS Toolkit extension
- Full-featured editor with version control support

📖 [VS Code Extension Documentation](./docs/VSCODE-EXTENSION.md)

### 🧩 Browser Extension
**View Threat Models on the Web**

![Status: Experimental](https://img.shields.io/badge/Status-Experimental-orange)

- One-click viewing of Threat Composer `.tc.json` files on GitHub, GitLab, Bitbucket and Amazon CodeCatalyst
- Available for Chrome and Firefox

📖 [Browser Extension Documentation](./docs/BROWSER-EXTENSION.md)


## Getting Started

### Try It Now

**Web Application**: Visit the [live demo](https://awslabs.github.io/threat-composer?mode=Full) to start threat modeling immediately in your browser.

**VS Code**: Install the [AWS Toolkit extension](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode) to view and edit local `.tc.json` files.

### Use the AI CLI & MCP Server

Generate threat models automatically from your codebase with the CLI, or integrate with AI assistants using the MCP server:

```bash
# Install with uv (provides both CLI and MCP server)
uv tool install --from "git+https://github.com/awslabs/threat-composer.git#subdirectory=packages/threat-composer-ai" threat-composer-ai

# Use the CLI to analyze your codebase
threat-composer-ai-cli /path/to/your/code
```

**MCP Server Configuration** (for Kiro, Cline, Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "threat-composer-ai": {
      "command": "threat-composer-ai-mcp",
      "env": {
        "AWS_PROFILE": "your-profile-name",
        "AWS_REGION": "us-west-2"
      }
    }
  }
}
```

Or run directly with uvx (no installation required):

```json
{
  "mcpServers": {
    "threat-composer-ai": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/awslabs/threat-composer.git#subdirectory=packages/threat-composer-ai",
        "threat-composer-ai-mcp"
      ]
    }
  }
}
```

The MCP server provides tools for starting workflows, monitoring progress, managing sessions, and validating threat models against the Threat Composer schema.

**💡 Best Experience**: For the best experience when using the CLI from VS Code/Kiro terminal or when using AI assistants via MCP, install the [AWS Toolkit extension](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode) which includes the Threat Composer VS Code extension. This allows you to view and edit the generated `.tc.json` files directly in your IDE with full visual editing capabilities.

See [AI/CLI/MCP Documentation](./docs/AI-CLI-MCP.md) for complete installation and usage instructions.

### Self-Host the Web Application

Deploy Threat Composer to your AWS account:

```bash
git clone https://github.com/awslabs/threat-composer.git
cd threat-composer
./scripts/deployDev.sh
```

See [Web App Documentation](./docs/WEB-APP.md) for detailed deployment options including CI/CD setup.


## Example Threat Model

We've included an example threat model of the Threat Composer Web App itself. This provides a reference point for getting started.

To view it, switch to the **Example** workspace in the application. Note: Changes in the Example workspace are not saved.

## Documentation

### User Guides
- **[Web Application](./docs/WEB-APP.md)** - Deployment, configuration, and customization
- **[VS Code Extension](./docs/VSCODE-EXTENSION.md)** - Installation and usage in VS Code
- **[Browser Extension](./docs/BROWSER-EXTENSION.md)** - View threat models on GitHub and CodeCatalyst
- **[AI/CLI/MCP](./docs/AI-CLI-MCP.md)** - Automated threat modeling with AI

### Developer Resources
- **[Development Guide](./docs/DEVELOPMENT.md)** - Setup, architecture, and contribution guidelines
- **[Contributing Guidelines](./CONTRIBUTING.md)** - How to contribute to the project
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** - Community guidelines

### Learning Resources
- **[Threat Modeling for Builders - AWS Skill Builder](https://explore.skillbuilder.aws/learn/course/external/view/elearning/13274/threat-modeling-the-right-way-for-builders-workshop)** - Free eLearning course
- **[How to Approach Threat Modeling - AWS Security Blog](https://aws.amazon.com/blogs/security/how-to-approach-threat-modeling/)** - Best practices and tips
- **[Threat Modeling Workshop](https://catalog.workshops.aws/threatmodel/)** - Hands-on workshop materials

## Feedback & Support

We value your input!

- **Feedback Survey**: [Share your thoughts](https://www.pulse.aws/survey/3AGEAOXZ)
- **Bug Reports & Feature Requests**: [GitHub Issues](https://github.com/awslabs/threat-composer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/awslabs/threat-composer/discussions)

## Quick Links

### For Users
- [Live Demo](https://awslabs.github.io/threat-composer)
- [AWS Toolkit for VS Code](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode)

### For Developers
- [Development Setup](./docs/DEVELOPMENT.md#getting-started)
- [Repository Structure](./docs/DEVELOPMENT.md#repository-structure)
- [Contributing Guide](./CONTRIBUTING.md)
- [API Documentation](./packages/threat-composer/README.md)

## Repository Structure

This is a monorepo containing multiple packages:

| Package | Description | Documentation |
|---------|-------------|---------------|
| [threat-composer](./packages/threat-composer/) | Core UI components library | [README](./packages/threat-composer/README.md) |
| [threat-composer-app](./packages/threat-composer-app/) | Web application (SPA) | [README](./packages/threat-composer-app/README.md) |
| [threat-composer-app-browser-extension](./packages/threat-composer-app-browser-extension/) | Browser extension | [README](./packages/threat-composer-app-browser-extension/README.md) |
| [threat-composer-infra](./packages/threat-composer-infra/) | AWS CDK infrastructure | [README](./packages/threat-composer-infra/README.md) |
| [threat-composer-ai](./packages/threat-composer-ai/) | AI CLI & MCP server (Experimental) | [README](./packages/threat-composer-ai/README.md) |

## Contributing

Contributions are welcome! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on:

- Code of conduct
- Development setup
- Pull request process
- Coding standards

## Security

See [CONTRIBUTING](./CONTRIBUTING.md#security-issue-notifications) for information on reporting security issues.

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](./LICENSE) file for details.

## Acknowledgments

Built with:
- [React](https://react.dev/) and [CloudScape Design System](https://cloudscape.design/)
- [AWS CDK](https://aws.amazon.com/cdk/) and [AWS Prototyping SDK](https://aws.github.io/aws-pdk/)
- [Projen](https://projen.io/) for project management
- [Strands](https://github.com/awslabs/strands) for AI agent orchestration
