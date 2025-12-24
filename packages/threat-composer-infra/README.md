# Threat Composer Infrastructure

AWS CDK infrastructure for deploying Threat Composer web application.

> **For deployment guides, configuration options, and CI/CD setup, see [docs/WEB-APP.md](../../docs/WEB-APP.md)**

## Package Overview

This package contains AWS CDK infrastructure code for deploying Threat Composer as a static website with:
- CloudFront distribution
- S3 website bucket
- AWS WAF WebACL
- Optional CI/CD pipeline with CodePipeline

## Local Development Setup

### Prerequisites
- Node.js 20 or higher
- Yarn package manager
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)
- CDK bootstrapped in target account

### Setup

```bash
# From repository root
pdk install --frozen-lockfile

# Bootstrap CDK (if not already done)
cdk bootstrap aws://<account-id>/<region>

# Deploy dev stack
./scripts/deployDev.sh

# Or deploy with CI/CD
./scripts/deployAll.sh
```

## Project Structure

```
src/
├── application-stack.ts      # Main application stack
├── application-stage.ts      # Application stage
├── pipeline-stack.ts         # CI/CD pipeline stack
├── pipeline.ts               # Pipeline definition
└── constants.ts              # Configuration constants
```

## Configuration

Configuration is managed in `cdk.context.json`. Key settings:

- `accountDev` / `accountProd` - AWS accounts for deployments
- `cidrRangesDev` / `cidrRangesProd` - IP allowlist for WAF
- `domainNameDev` / `domainNameProd` - Custom domain names
- `certificateDev` / `certificateProd` - ACM certificate ARNs
- `useCodeConnection` - Use external git repository via CodeConnections
- `repositoryOwnerAndName` - External repository (e.g., "owner/repo")
- `codeConnectionArn` - CodeStar Connection ARN

See [docs/WEB-APP.md](../../docs/WEB-APP.md) for complete configuration reference.

## Development Commands

```bash
# Synthesize CloudFormation
cd packages/threat-composer-infra
cdk synth

# Deploy application stack
cdk deploy ThreatComposerApplicationStack

# Deploy pipeline stack
cdk deploy ThreatComposerPipelineStack

# Diff changes
cdk diff

# Destroy stack
cdk destroy ThreatComposerApplicationStack
```

## Deployment Options

### Static Website Only

Deploys just the application stack (CloudFront + S3 + WAF):

```bash
./scripts/deployDev.sh
```

### With CI/CD Pipeline

Deploys full CI/CD infrastructure (CodePipeline + Application):

```bash
./scripts/deployAll.sh
```

## Testing

```bash
# Run infrastructure tests
cd packages/threat-composer-infra
yarn test

# Run with coverage
yarn test --coverage
```

## Contributing

When contributing to this package:

1. Follow AWS CDK best practices
2. Maintain security configurations (WAF, HTTPS, etc.)
3. Update deployment documentation in [docs/WEB-APP.md](../../docs/WEB-APP.md)
4. Test deployments in isolated accounts
5. Document configuration changes

## Documentation

- **Deployment Guide**: [docs/WEB-APP.md](../../docs/WEB-APP.md)
- **Main README**: [README.md](../../README.md)
- **Development Guide**: [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md)

## License

Licensed under Apache-2.0. See [LICENSE](../../LICENSE) for details.
