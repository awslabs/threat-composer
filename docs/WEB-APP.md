# Threat Composer Web Application

The Threat Composer web application is available as a static website that can be deployed via GitHub Pages or self-hosted in your AWS account.

## Live Demo

Try the threat-composer demo via the [Github Pages](https://awslabs.github.io/threat-composer/) deployment.

## Features

- Capture and store systems description, architecture diagram, and dataflow diagram.
- Capture and store assumptions related to the systems design, threats and/or mitigations, along with mapping of assumptions to threats to mitigations.
- Help iteratively compose useful threats, and encourage brainstorming. This feature is also available via a dedicated ['Threats Only'](https://awslabs.github.io/threat-composer?mode=ThreatsOnly) mode.
  - Rendering structured threat statements (aligned to a prescriptive threat grammar) based on user input.
  - Supporting an adaptive threat statement structure, this helps create progressively more complete threats.
  - Provide dynamic suggestions based on supplied and missing user input.
  - Provide complete threat statement examples to aid contextual brainstorming.
- Capture and store mitigation candidates and mapping to threats.
- Create a threat model document based on user-supplied input.
- Help users answer "Did we do a good enough job" by providing insights and suggestions for bar-raising actions via an 'Insights dashboard'
- Threat packs to find and add bulk or selected threat statements to your current workspace (Self-hosted deployments only). You can author and deploy custom packs - [Learn more...](#customising-reference-data-in-your-build)
- Mitigation packs to find and add bulk or selected mitigations to your current workspace. You can author and deploy custom packs (Self-hosted deployments only) - [Learn more...](#customising-reference-data-in-your-build)
- Data persisted only client-side within the browser (100% local storage).
- JSON import/export capabilities to enable persistent storage, sharing, and version control outside of the web browser (e.g. by using git).
- Markdown, DOCX, and PDF static downloads of the threat model document.
- Workspace separation to allow working on multiple threat models.

## Usage Recommendations

It's **RECOMMENDED** that you use the included [AWS Cloud Development Kit (CDK) app](https://docs.aws.amazon.com/cdk/v2/guide/home.html) to self-host the static website, support your customization, and continuous development. Refer to the [**Security considerations section**](#security-considerations) and [**Deployment section**](#deployment).

## Security Considerations

> If you use threat-composer via your AWS account, please note that any sample code, software libraries, command line tools, proofs of concept, templates, or other related technology are provided as AWS Content or Third-Party Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this AWS Content or Third-Party Content in your production accounts, or on production or other critical data. You are responsible for testing, securing, and optimizing the AWS Content or Third-Party Content, such as sample code, as appropriate for production grade use based on your specific quality control practices and standards. Deploying AWS Content or Third-Party Content may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.

### Data Protection

This tool stores all user-supplied input only within your browsers local storage (there is no backend or API). Given the nature of the data that you could be storing you should take the necessary steps to secure access to your browser, and keep your browser and operating system software up-to-date.

The tool supports the export of data out of the browser local storage to a local file, ensure that you are applying the appropriate protections to these file exports in terms of least privilege access control, encryption-at-rest and encryption-in-transit.

### Network Accessibility

By default the [WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html) associated with the CloudFront distribution is configured to only allow `192.168.0.0/24` (non-routable networks) to reach the static assets. You'd need to modify the configuration of the CDK application to ensure that you are able to scope access to your network(s) (see 'Configuration' section).

### Authentication

In the default configuration there is no authentication to reach the static web assets. You should integrate this with whatever identity management solution you currently use. To add authentication you would need to customise this application. One approach you could consider is to create a [Lambda@Edge](https://aws.amazon.com/lambda/edge/) function to enforce authentication and [associated cookie validation](https://aws.amazon.com/blogs/networking-and-content-delivery/external-server-authorization-with-lambdaedge/), then attach this function to the Amazon CloudFront distribution to protect the static web assets (see 'Configuration' section). You'd especially want to consider this if you modify the sample application to include your own data, such as example threat statements.

### Identity and Access Management (IAM) Permissions for CDK

It's recommended that you use a scoped down [IAM policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html) to when interacting with CDK and it's recommended that you consider customising and attaching the below example to the IAM Principal being used. This policy is scoped down, but does include some powerful permissive actions such as `iam:*` as CDK requires a role to do things like create IAM Roles, S3 Buckets, ECR repositories and SSM parameters when [bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html). The policy does scope each of the allowed actions to resources typically associated with CDK only (specifically, `CDKToolkit/*` stack, and resources with a `cdk-` prefix).

**Note:** You'd need to change the `<aws-account-id>` and `<aws-region>` to align to your values.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "0",
            "Effect": "Allow",
            "Action": [
                "cloudformation:DescribeStacks",
                "cloudformation:CreateChangeSet",
                "cloudformation:DescribeChangeSet",
                "cloudformation:ExecuteChangeSet",
                "cloudformation:DeleteChangeSet",
                "cloudformation:DescribeStackEvents",
                "cloudformation:DeleteStack",
                "cloudformation:GetTemplate"
            ],
            "Resource": "arn:aws:cloudformation:<aws-region>:<aws-account-id>:stack/CDKToolkit/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "sts:AssumeRole",
                "iam:*"
            ],
            "Resource": [
                "arn:aws:iam::*:role/cdk-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ssm:*"
            ],
            "Resource": [
                "arn:aws:ssm:<aws-region>:<aws-account-id>:parameter/cdk-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::cdk-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ecr:*"
            ],
            "Resource": [
                "arn:aws:ecr:<aws-region>:<aws-account-id>:repository/cdk-*"
            ]
        }
    ]
}
```

### GitHub Pages

At the time of writing it is not possible to configure HSTS (HTTP Strict Transport Security) or custom HTTP headers for GitHub pages, and it's recommended that you deploy threat-composer into your AWS account where these additional protections have been configured in the provided CDK project.

### Content Security Policy

This tool includes a simple CSP ([Content Security Policy](https://en.wikipedia.org/wiki/Content_Security_Policy)) that should be customised to your needs and use-case. For example, to support showing architecture and data-flow diagrams from URLs the included CSP allows images loads from any source (`img-src: *`), you may want to scope this to the specific domain(s) that you wish to limit this too.

### Importing Content

You should only import content into threat-composer from sources that you trust.

![Screenshot of import modal](/docs/screenshot-import-modal.png)

### Vulnerability Management

Like all software, it's important that you have an on-going process in place to ensure that you are performing vulnerability management of the code included in this package and all of it's dependencies. In this GitHub repository, we leverage [dependabot security alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts) and [dependabot security updates](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates) to detect and update vulnerable dependencies.

Watch this repository for updates and deploy the latest changes. See 'Maintenance' section for each Deployment option below on how to deploy the latest changes.

### CloudFront Security Policy

When using the default CloudFront domain and certificate (\*.[cloudfront.net](http://cloudfront.net/)), CloudFront automatically sets the security policy to [TLSv1](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html). It's recommended that you use a [custom domain](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html) and certificate with the CloudFront distribution and configure it to use use a [Security Policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html) that does not allow older protocols such as TLS 1.0. Consider using the `TLSv1.2_2021` Security Policy.

### AWS Well-Architected Framework

The [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) helps you understand the pros and cons of decisions you make while building systems on AWS. By using the Framework you will learn architectural best practices for designing and [operating](https://docs.aws.amazon.com/wellarchitected/latest/framework/operational-excellence.html) [reliable](https://docs.aws.amazon.com/wellarchitected/latest/framework/reliability.html), [secure](https://docs.aws.amazon.com/wellarchitected/latest/framework/security.html), [efficient](https://docs.aws.amazon.com/wellarchitected/latest/framework/performance-efficiency.html), [cost-effective](https://docs.aws.amazon.com/wellarchitected/latest/framework/cost-optimization.html), and [sustainable](https://docs.aws.amazon.com/wellarchitected/latest/framework/sustainability.html) systems in the cloud.

## Deployment

**Important**: This application uses various AWS services and there are costs associated with these services after the Free Tier usage - please see the AWS Pricing page for details. You are responsible for any AWS costs incurred.

### Prerequisites

- [NodeJS](https://nodejs.org/en/) (version 20 or higher)
- [Yarn](https://yarnpkg.com/) (installed via `npm install -g yarn`)
- [PDK](https://aws.github.io/aws-pdk/overview/index.html) (installed via `npm install -g @aws/pdk`)
- [AWS CLI](https://aws.amazon.com/cli/) (version 2 or higher)
- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) (configured via `aws configure`)
- [AWS CDK v2](https://aws.amazon.com/cdk/) CLI (installed via `npm install -g aws-cdk`)
- [CDK Bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) (e.g. `cdk bootstrap aws://<your_aws_account_id>/<aws-region>`)
- [git-remote-codecommit](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-git-remote-codecommit.html) (e.g. `pip install git-remote-codecommit`)

### Configuration

The threat-composer Infra CDK app support customization like custom domain name. You can update the configuration in the configuration file to set it up. The configuration file is located at _packages/threat-composer-infra/cdk.context.json_.

Note that all the configurations are **OPTIONAL**.

**Important note:** The default values for `cidrRangesDev` and `cidrRangesProd` are non-routable CIDR ranges. In order to access threat-composer you've need to update these values to ranges that align with your access needs.

| Configuration Property | Description                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| accountPipeline        | (Optional) The AWS account for deploying CodeCommit repository and CI/CD pipeline if Deployment with CI/CD option is used. Default value: current account                                                                                  |
| accountDev             | (Optional) The AWS account for deploying dev instance of application stack. Default value: current account                                                                                                                                 |
| accountProd            | (Optional) The AWS account for deploying prod instance of application stack if Deployment with CI/CD option is used.                                                                                                                       |
| cidrTypeDev            | (Optional) The IP address type for dev instance of [WAF WebAcl IPSet](https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html). Options are IPV4 or IPV6. Default value: IPV4.                                      |
| cidrTypeProd           | (Optional) The IP address type for prod instance of [WAF WebAcl IPSet](https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html). Options are IPV4 or IPV6. Default value: IPV4.                                     |
| cidrRangesDev          | (Optional) The IP address ranges for dev instance of [WAF WebAcl IPSet](https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html). Multiple values is supported via `,` separator. Default value: `192.168.0.0/24`.  |
| cidrRangesProd         | (Optional) The IP address ranges for prod instance of [WAF WebAcl IPSet](https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html). Multiple values is supported via `,` separator. Default value: `192.168.0.0/24`. |
| domainNameDev          | (Optional) The custom domain name for dev deployment                                                                                                                                                                                       |
| domainNameProd         | (Optional) The custom domain name for prod deployment                                                                                                                                                                                      |
| certificateDev         | (Optional) The AWS Certificate Manager certificate ARN for the custom domain name of dev deployment if custom domain name is used                                                                                                          |
| certificateProd        | (Optional) The AWS Certificate Manager certificate ARN for the custom domain name of prod deployment if custom domain name is used                                                                                                         |
| hostZoneNameDev        | (Optional) The Route 53 host zone for the custom domain name of prod deployment if host zone record creation is required                                                                                                                   |
| hostZoneNameProd       | (Optional) The Route 53 host zone for the custom domain name of prod deployment if host zone record creation is required                                                                                                                   |
| lambdaEdgeDev          | (Optional) The lambda edge function ARN attached to CloudFront VIEWER_REQUEST event for CloudFront dev instance or the AWS Systems Manbager(SSM) parameter name (in us-east-1) storing the Lambda edge function ARN                        |
| lambdaEdgeProd         | (Optional) The lambda edge function ARN attached to CloudFront VIEWER_REQUEST event for CloudFront prod instance or the AWS Systems Manbager(SSM) parameter name (in us-east-1) storing the Lambda edge function ARN                       |
| cacheControlNoCache    | (Optional) If true, Set CloudFront response headers *pragma* to *no-cache*, and *cache-control* to *no-store, no-cache*                                                                                                                   |
| useCodeConnection      | (Optional, defaults to false) Set to true to use an external repository instead of CodeCommit                                                                                                                                             |
| repositoryName         | (Optional) Name of the CodeCommit repository (Required only when useCodeConnection is false)                                                                                                                                               |
| repositoryOwnerAndName | (Optional) The owner and name of the external repository (Required when useCodeConnection is false)                                                                                                                                        |
| codeConnectionArn      | (Optional) The ARN of the CodeStar Connection for the external repository (Required when useCodeConnection is false)                                                                                                                       |

### Deployment Option 1: Static Website Only

Following the steps to deploy an instance of application CloudFormation stack into your AWS account. The application CloudFormation stack include a [CloudFront distribution](https://aws.amazon.com/cloudfront/), [S3 website bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html), and an associated [AWS WAF WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html).

We recommend you bootstrap your CDK project by [specifying the specific AWS Managed Policies](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-customizing) required for the 'Static Website Only' deployment to create the required resources, including Amazon S3 Buckets, IAM Roles, CloudFront Distribution etc. This will ensure that CloudFormation does not use the 'Admin' policy:

```bash
cdk bootstrap aws://<aws-account-id>/<aws-region> --cloudformation-execution-policies "arn:aws:iam::aws:policy/IAMFullAccess,arn:aws:iam::aws:policy/AWSLambda_FullAccess,arn:aws:iam::aws:policy/AmazonS3FullAccess,arn:aws:iam::aws:policy/CloudFrontFullAccess,arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
```

**Important:** To avoid deployment failures, be sure the policies that you specify are sufficient for any deployments you will perform in the environment being bootstrapped. Meaning if you are using CDK bootstrap for other CDK apps in the same account, you may need to adjust the permissions to be inclusive of what is needed for other applications.

Learn more about customising CDK bootstrap [here](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-customizing).

#### Deployment Instructions

1. Clone the repository

   ```bash
   git clone https://github.com/awslabs/threat-composer.git
   cd threat-composer
   ```

2. Run script:

   ```bash
   ./scripts/deployDev.sh
   ```

![Screenshot of deployDev.sh](/docs/screenshot-deployDev.png)

The script will install dependencies, build the project, and deploy the application CloudFormation stack.

If the script is run successfully, you will see output of your CloudFront domain name. Visit the URL or specified custom domain name (if provided) in a web browser to access the deployed website.

#### Maintenance

It is recommended to watch this GitHub repository for any updates and run the commands below periodically from the project root directory to deploy the latest changes in our GitHub repository:

```bash
git pull origin main
./scripts/deployDev.sh
```

### Deployment Option 2: With CI/CD

If you are planning to customize the configurations or update code to fit your use cases, it is recommended to deploy the whole CI/CD infrastructure CloudFormation Stack. The CI/CD infrastructure includes a [CodeCommit](https://aws.amazon.com/codecommit/) repository and a [CodePipeline](https://aws.amazon.com/codepipeline/). The CodePipeline deploys the application stack ([CloudFront distribution](https://aws.amazon.com/cloudfront/) + [S3 website bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html) + [AWS WAF WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html)) into the nominated dev and prod environments.

This deployment option does create resources beyond what is created in the 'Static website only' deployment, such as CodeCommit repository, CodePipeline and KMS keys, hence requires additional permissions within it's CloudFormation execution policy. At the time of writing there appears to be a bug with CDK (see [issue](https://github.com/aws/aws-cdk/issues/21973)) when using a cross-account keys within the pipeline that the deployment will only be successful if one attaches the `AdministratorAccess` policy to the CloudFormation execution role, as follows:

```bash
cdk bootstrap aws://<aws-account-id>/<aws-region> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

You may need to include the `--trust` option when bootstrapping the dev or production accounts if they are different from the pipeline AWS account shown below. This command is run from the AWS account that has been configured in the property `accountDev` or `accountProd` in _packages/threat-composer-infra/cdk.context.json_. See below for an example.

```bash
cdk bootstrap aws://<dev-or-prod-aws-account-id>/us-west-2 --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --trust <pipeline-aws-account-id>
```

#### Use CodeConnections to Connect to an External Git Repository

Alternatively, you can also connect the CodePipeline to an external git repository (like GitHub, Bitbucket, or GitLab) using [CodeConnections](https://docs.aws.amazon.com/dtconsole/latest/userguide/welcome-connections.html) with the configuration settings below:

```json
"useCodeConnection": "true",
"repositoryOwnerAndName": "<The Owner and Repository name. For instance, user testUser with git repository testRepo becomes "testUser/testRepo",
"codeConnectionArn": "<The ARN of the code connection>"
```

#### Deployment Instructions

1. Clone the repository

   ```bash
   git clone https://github.com/awslabs/threat-composer.git
   cd threat-composer
   ```

2. Deploy the CI/CD infrastructure CloudFormation stack

   ```bash
   ./scripts/deployAll.sh
   ```

![Screenshot of deployAll.sh](/docs/screenshot-deployAll.png)

The script will install dependencies, build the project, and deploy the CI/CD infrastructure CloudFormation stack.

If the script is run successfully, you will see output of your CodeCommit repository GRC URL.

3. Add the newly created CodeCommit repo as a git remote.

   ```bash
   git remote add codecommit <CodeCommitGRCUrl>
   ```

4. Update configuration/code and `git commit` your changes

5. Push the code to the newly created CodeCommit repo

   ```bash
   git push codecommit main
   ```

The CodePipeline will be automatically triggered to build the project and deploy the application stack to your nominated dev and prod environments.

#### Maintenance

It is recommended to watch this GitHub repository for any updates and run the commands below periodically to sync the latest changes in our GitHub repository to the mirrored CodeCommit repository.

```bash
git pull --no-rebase origin main
git push codecommit main
```

## Customising Reference Data in Your Build

> [!NOTE]
> The following section is only applicable in self-hosting deployment scenarios.

You can customize the reference data used within Threat Composer to better suit your specific needs. The following sections details the types of customisations possible and how to use them.

### Reference or Example Threat Models

Reference or example threat models are available directly in the Workspace selector for quick review and reference. The following steps describe how you can create and include a reference or example threat model in your own deployment.

1. Author your content using Threat Composer, and export as `.tc.json` file
2. Rename the file to a descriptive name, e.g. `ServerlessAPI.tc.json`
3. Place the `.tc.json` file into the `packages/threat-composer/src/data/workspaceExamples` directory.
4. Update `packages/threat-composer/src/data/workspaceExamples/workspaceExamples.ts` file to import the `.tc.json` file. e.g. `import serverlessAPI from './ServerlessAPI.tc.json'` and add it to the `workspaceExamples` array - for example:

    ```typescript
    const workspaceExamples = [
    {
        name: 'Threat Composer',
        value: threatComposer,
    },
    {
        name: 'Serverless API',
        value: serverlessAPI,
    },
    ] as WorkspaceExample[];
    ```
5. Build the project

#### Dynamically Inject Example Threat Models in Build Time

1. Follow steps 1-2 above to author your example threat models
2. Store your example threat models within a folder in a seperate location or repository
3. Copy the file folder containing example threat models under the path `packages/threat-composer/src/data/workspaceExamples` in your build
4. Run the script below in your build from the project root to inject the example threat models entry to configuration file `packages/threat-composer/src/data/workspaceExamples/workspaceExamples.ts`:

    ```bash
    npx ts-node ./scripts/data/injectData.ts WorkspaceExample <SourceDir-relative path to the workspaceExamples folder>
    ```
5. Build the project

### Threat Packs

Threat packs allow you to quickly find and add bulk or selected threat statements to your current workspace. The following steps describe how you can create and include a custom Threat Pack in your own deployment.

1. Author your content using Threat Composer, and export as `.tc.json` file
2. Rename the file to a descriptive name, e.g. `AuthenticationThreats.tc.json`
3. Place the `.tc.json` into the `packages/threat-composer/src/data/threatPacks` directory. Or if it's it's already a reference threat model (see section prior to this) there is no need to also add file at this location.
4. Create a `.metadata.json` file for your pack (e.g. `AuthenticationThreats.metadata.json`) in the `packages/threat-composer/src/data/threatPacks` directory
5. Paste the following schema in the file:

    ```json
    {
    "schema": 1,
    "namespace": "threat-composer",
    "type": "threatpack-pack-metadata",
    "id": "<REPLACE WITH SHORT HUMAN READABLE IDENTIFIER>",
    "name": "<REPLACE WITH NAME OF THE THREAT PACK>",
    "description": "<REPLACE WITH DESCRIPTION OF THE THREAT PACK>",
    "path": "<REPLACE WITH RELATIVE PATH TO .TC.JSON FILE>"
    }
    ```

6. Update the value of `id` to be a short human readable indentier for the pack (e.g. `AuthThreats`)
7. Update the value of `description` to describe the contents of the pack (e.g. `This pack contains common authentication threats`)
8. Update the value of `path` to point to the _relative_ path of the source `.tc.json` file (e.g. `./AuthenticationThreats.tc.json`)
9. Generate the threat pack file by running `yarn run build:packs` from the root of the local repository
10. Update `packages/threat-composer/src/data/threatPacks/threatPacks.ts` file to import the generated file. e.g. `import authenticationThreatPack './generated/AuthThreats.json';` and add it to the `threatPacks` array - for example:
    ```typescript
    const threatPacks = [
    authenticationThreatPack,
    GenAIChatbot,
    ] as ThreatPack[];
    ```
11. Build the project

#### Dynamically Inject Example Threat Packs in Build Time

1. Follow steps 1-2 above to author your threat packs 
2. Store your threat packs within a folder in a seperate location or repository
3. Follow steps 4-8 above to author your threat pack metadata files
4. Store your threat pack metadata files within a folder in a seperate location or repository (can be the same folder of threat pack files)
5. Copy the file folder(s) containing threat pack files and metadata files under the path `packages/threat-composer/src/data/threatPacks` in your build
6. Run the script below in your build from the project root to build the threat packs

    ```bash
    npx ts-node ./scripts/data/buildPacks.ts ThreatPack <SourceDir-the relative path to the threatPacks folder for the folder containing metadata files> <DestDir-the relative path to the threatPacks folder for output threat packs files>
    ```

7. Run the script below in your build from the project root to inject the generated threat packs entry to configuration file `packages/threat-composer/src/data/threatPacks/threatPacks.ts`:

    ```bash
    npx ts-node ./scripts/data/injectData.ts ThreatPack <SourceDir-the value DestDir from the previous step>
    ```
8. Build the project

### Mitigation Packs

Mitigation packs allow you to quickly find and add bulk or selected mitigation candidates to your current workspace. The following steps describe how you can create and include a custom Mitigation Pack in your own deployment.

1. Author your content using Threat Composer, and export as `.tc.json` file
2. Rename the file to a descriptive name, e.g. `BaselineControls.tc.json`
3. Place the `.tc.json` into the `packages/threat-composer/src/data/mitigationPacks` directory. Or if it's it's already a reference threat model (see section prior to this) there is no need to also add file at this location.
4. Create a `.metadata.json` file for your pack (e.g. `BaselineControls.metadata.json`) in the `packages/threat-composer/src/data/mitigationPacks` directory
5. Paste the following schema in the file:

    ```json
    {
    "schema": 1,
    "namespace": "threat-composer",
    "type": "mitigationpack-pack-metadata",
    "id": "<REPLACE WITH SHORT HUMAN READABLE IDENTIFIER>",
    "name": "<REPLACE WITH NAME OF THE MITIGATION PACK>",
    "description": "<REPLACE WITH DESCRIPTION OF THE MITIGATION PACK>",
    "path": "<REPLACE WITH RELATIVE PATH TO .TC.JSON FILE>"
    }
    ```

6. Update the value of `id` to be a short human readable indentier for the pack (e.g. `BaselineControls`)
7. Update the value of `description` to describe the contents of the pack (e.g. `This pack contains our organizations baseline controls`)
8. Update the value of `path` to point to the _relative_ path of the source `.tc.json` file (e.g. `./BaselineControls.tc.json`)
9. Generate the threat pack file by running `yarn run build:packs` from the root of the local repository
10. Update `packages/threat-composer/src/data/mitigationPacks/mitigationPacks.ts` file to import the generated file. e.g. `import ourBaselineControlsMitigationPack './generated/BaselineControls.json';` and add it to the `mitigationPacks` array - for example:
    ```typescript
    const mitigationPacks = [
    ourBaselineControlsMitigationPack,
    GenAIChatbot,
    ] as MitigationPack[];
    ```
11. Build the project

#### Dynamically Inject Example Mitigation Packs in Build Time

1. Follow steps 1-2 above to author your mitigation packs 
2. Store your mitigation packs within a folder in a seperate location or repository
3. Follow steps 4-8 above to author your mitigation pack metadata files
4. Store your mitigation pack metadata files within a folder in a seperate location or repository (can be the same folder of mitigation pack files)
5. Copy the file folder(s) containing mitigation pack files and metadata files under the path `packages/threat-composer/src/data/mitigationPacks` in your build
6. Run the script below in your build from the project root to build the mitigation packs

    ```bash
    npx ts-node ./scripts/data/buildPacks.ts MitigationPack <SourceDir-the relative path to the mitigationPacks folder for the folder containing metadata files> <DestDir-the relative path to the mitigationPacks folder for output mitigation packs files>
    ```

7. Run the script below in your build from the project root to inject the generated mitigation packs entry to configuration file `packages/threat-composer/src/data/mitigationPacks/mitigationPacks.ts`:

    ```bash
    npx ts-node ./scripts/data/injectData.ts MitigationPack <SourceDir-the value DestDir from the previous step>
    ```
8. Build the project

### Threat Examples

Threats that are included in the example threats data are made make available to users of your deployment of Threat Composer within the 'Full Examples' list within the threat statement editor, and are used at random when a user presses the 'Give me a random example' button in the editor. The following steps describe how you can customise the threats that are included:

1. Open the `packages/threat-composer/src/data/threatStatementExamples.json` file in your editor of choice
2. Add or edit existing entries ensuring to using the expected schema.
    - `id` (string) - A unique ID for your example (e.g. `"EXAMPLE_000001"`)
    - `numberId` (string) - This should aways have a value of `"-1"`
    - `threatSource` (string) - The entity taking action (e.g. `"internal threat actor"`)
    - `prerequistes` (string) - Conditions or requirements that must be met for a threat source's action to be viable. (e.g. `"who can register a vehicle"`)
    - `threatAction` (string) - The action being performed by the threat source (e.g. `"claim they did not do so"`)
    - `threatImpact` (string) - The direct impact of a successful threat action (e.g. `"the actor disputing financial charges related to the registration of a vehicle"`)
    - `impactedGoal` - (Array of strings) - The information security or business objective that is negatively affected. (e.g. `["integrity"]`)
    - `impactedAssets` - (Array of strings) - The assets affected by a successful threat action (e.g. `["billing"]`)
    - `metadata` - (Array of objects) (e.g. `[ "key": "STRIDE", "value" : [ "T"] ]`)

3. Build the project.
