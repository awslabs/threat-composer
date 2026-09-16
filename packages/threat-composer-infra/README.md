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
- Node.js 24 (the root `engines` field also accepts 20.19 and 22.13 or later)
- pnpm 10 (`npm install -g pnpm@10`)
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)
- CDK bootstrapped in target account

### Setup

```bash
# From repository root
pnpm install --frozen-lockfile

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

# Deploy the Dev stage (application stack plus its us-east-1 WebACL stack)
cdk deploy 'Dev/*'

# Deploy the pipeline stack
cdk deploy ThreatComposerInfraStack

# Diff changes
cdk diff

# Destroy the Dev stage
cdk destroy 'Dev/*'
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

Tests run on Vitest. Package-local validation does not need AWS credentials,
bootstrapping, website build assets, or an Nx build:

```bash
# From repository root
pnpm --dir packages/threat-composer-infra exec vitest run
pnpm --dir packages/threat-composer-infra exec tsc --noEmit
pnpm --dir packages/threat-composer-infra exec eslint src test eslint.config.mjs

# Intentionally update snapshots only after reviewing the synthesized resources
pnpm --dir packages/threat-composer-infra exec vitest run --update
```

## Migration off `@aws/pdk`

This package used to build on `@aws/pdk`'s CDK constructs. Those have been
replaced with plain AWS CDK:

| Was | Now |
| --- | --- |
| `PDKNag.app()` | `new App()` plus the `cdk-nag` `AwsSolutionsChecks` aspect |
| `StaticWebsite` / `StaticWebsiteOrigin` | `src/static-website.ts`: private S3 bucket, CloudFront distribution with an Origin Access Control, and a `BucketDeployment` |
| `CloudfrontWebAcl` (inside `StaticWebsite`) | `src/web-acl-stack.ts`: a plain `CfnIPSet` + `CfnWebACL` |
| `PDKPipeline` / `PDKPipelineWithCodeConnection` | Explicit S3/KMS resources and `aws-codepipeline.Pipeline` wrapped by `pipelines.CodePipeline` in `src/pipeline-stack.ts` |
| `PDKNag.getStackPartitionRegex()` | a partition-agnostic suppression regex |

Two behavioural consequences worth knowing:

- **The WAF WebACL is now its own stack.** CloudFront-scoped WAF resources can
  only exist in `us-east-1`. PDK reached that region from anywhere using a
  Lambda-backed custom resource; the replacement uses ordinary CloudFormation,
  so the WebACL lives in a companion `us-east-1` stack and its ARN reaches the
  application stack through a cross-region reference. Deploy a whole stage
  (`cdk deploy 'Dev/*'`) rather than the app stack alone.
- **Sonar scanning was dropped.** `PDKPipeline` could attach a Sonar scanner via
  the `sonarqubeScannerConfig` context value. That value is unset in
  `cdk.context.json`; if it is needed again, add a `CodeBuildStep` to the
  pipeline's `post` steps.

### Existing Deployments

The replacement was compared with main commit `f2d84e15` using its frozen PDK
dependencies. It preserves resource identities and security settings, including
CodeCommit retention, key rotation, artifact logging and WAF managed rules.
The website keeps PDK's OAC, HTTP/2, default price class and 2048 MiB deployment
provider. The primary artifact/log buckets and key retain their original
**destroy-on-removal** behavior.

Focused tests cover resource identities, security controls and both pipeline
sources with same-account and cross-account mixed-region deployments. The full
PDK comparison was a one-off migration check, not a permanent test dependency.

Review the deployed diff/change set before upgrading, especially WAF
reassociation, cross-region references, provider upgrades and rollback. These
offline checks do not guarantee a replacement-free upgrade for every deployment.

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
