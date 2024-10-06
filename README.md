# **threat-composer**

> [!TIP]  
> You can now create, view and edit Threat Composer files directly within Visual Studio Code using the [AWS Toolkit extension](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode). See the AWS Toolkit for Visual Studio Code [user guide](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/threatcomposer-overview.html).

## Goal

A simple threat modeling tool to help humans to reduce time-to-value when threat modeling

![Animated gif of Full mode](/docs/threat-composer.gif)

----> [Live demo](https://awslabs.github.io/threat-composer?mode=Full) <----

## Summary

The process of [threat modeling](https://catalog.workshops.aws/threatmodel/en-US/introduction) helps you identify security issues and develop a strategy to address them in the _context_ of your system. A threat model directly supports your ability to define, agree upon, and communicate what is necessary in order to deliver a secure product or service. You can threat model very early in your design phase. These early insights put you in a better position to identify sensible design choices early in the cycle, and efficiently build and ship your workload securely. Identifying and fixing security issues at design time is exponentially easier to do than doing so once the workload has been built.

There are many ways to perform threat modeling. Much like programming languages, there are advantages and disadvantages to each. You should choose the approach that works for you, and communicate it within your organization. A good place to start is [Shostack’s 4 Question Frame for Threat Modeling](https://github.com/adamshostack/4QuestionFrame) which proposes four simple open ended questions.

The Threat composer tool has been built for the following reasons:

1. **Coming up with useful threats can be hard.** Feedback from builders regarding the "What can go wrong?" question is that there are two key challenges in this step - firstly, no generally agreed standard on what 'good' looks like. This is contextual based on the system being assessed and the ownership model of the teams involved; and, secondly, there is no canonical list of possible things that could go wrong. Hence, threat identification necessitates brainstorming and collaboration between the individuals involved in the threat modeling process, and often involves starting from a "blank page". Threat composer uses ["Threat Grammar"](https://catalog.workshops.aws/threatmodel/en-US/what-can-go-wrong/threat-grammar), a prescriptive way to write threats, with the aim of making it easier to iteratively write useful threats. Threat Composer includes full examples to help the customer understand what good might look like. Customers can use these as inspiration or as a starting point for their own threats.
2. **Provide insights on how to improve quality and coverage.** One of the toughest questions to answer is “did we do a good enough job?” because it can be highly subjective. Threat composer includes an ‘insights dashboard’ to help you quickly identify areas for improvement, including (a) threats without linked mitigations, (b) unprioritized threats, (c) threat category distribution, and (d) based on threat grammar usage, potential improvement to inputs for mitigation or prioritisation.
3. **Threat modeling is non-linear.** Threat modeling is often taught as a linear process, where a person or team works on each of the threat modeling questions separately. In practice, threat modeling can be very non-linear. For example, you may think of a mitigation (“what are we going to do about?”) immediately after you’ve thought of a threat (“what can go wrong?), this may lead you to re-evaluate specific aspects of your design (”what are we building?“). Threat composer aims to support this kind of non-linear and natural workflow.
4. **Threat modeling is iterative.** both at a micro and a macro level. For example, at a micro level, you may iterate on a given threat to the point you find you could [decompose](https://catalog.workshops.aws/threatmodel/en-US/what-can-go-wrong/threat-grammar/decomposition) it into two discrete threats. At a macro level, a threat model can (and should) evolve and mature as the system you are threat modeling evolves through the software/hardware development lifecycle. In the early stages of design you may need to make a lot of [assumptions](https://catalog.workshops.aws/threatmodel/en-US/what-are-we-working-on/exercise/state-your-assumptions), and as time passes previous assumptions may become invalidated which is a [trigger to review the threat model](https://catalog.workshops.aws/threatmodel/en-US/introduction/when-to-threat-model). Additionally, as you progress it’s likely that new design decisions are made, new threats are thought of and mitigations go from being “planned”, to being “implemented”. Threat composer has been designed to support this iterative design and development lifecycle, and to support the ability of having a “living” threat model-as-code as your feature or service evolves and matures.

## Features

- Capture and store systems description, architecture diagram, and dataflow diagram.
- Capture and store assumptions related to the systems design, threats and/or mitigations, along with mapping of assumptions to threats to mitigations.
- Help iteratively compose useful threats, and encourage brainstorming. This feature is also available via a dedicated [‘Threats Only’](https://awslabs.github.io/threat-composer?mode=ThreatsOnly) mode.
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



## Threat model example

We've included an example of how you could use Threat composer to create a threat model, we have chosen the threat composer tool itself as an example to illustrate this. This threat model does not claim to be 100% complete for every possible interaction. It aims to give the reader an example of what a set of threats, assumptions and mitigations could look like. We've chosen to share this example as it provides a common reference point for people who are starting off with Threat composer. You may have different perspectives on the assumptions, threats and mitigations. This is ok, and could be used to start conversations in your organization with the context of your risk appetite. You may want to use this as he base threat model as a starting point to generate a contextualised threat model for your own specific needs and deployment of Threat composer. You are responsible for making your own independent assessment of this threat model and its applicability to your organization.

To view the example threat model simply switch to the system-defined **Example** Workspace.

No changes you make within Example workspace will be saved. If you wish to modify it or use is a base, it's recommended you Export it, create a new Workspace and Import it.

## Feedback

We value your input! Please take a moment to provide us with your [feedback](https://www.pulse.aws/survey/3AGEAOXZ). Thank you for helping us improve!

For bugs, issues and feature requests, please use [GitHub issues](https://github.com/awslabs/threat-composer/issues).

## **Usage**

You can try the threat-composer demo via the [Github Pages](https://awslabs.github.io/threat-composer/) deployment. It's **RECOMMENDED** that you use the included [AWS Cloud Development Kit (CDK) app](https://docs.aws.amazon.com/cdk/v2/guide/home.html) to self-host the static website, support your customization, and continuous development. Refer to the [**Security considerations section**](#security-considerations) and [**Deployment section**](#deployment).

## Security considerations

> If you use threat-composer via your AWS account, please note that any sample code, software libraries, command line tools, proofs of concept, templates, or other related technology are provided as AWS Content or Third-Party Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this AWS Content or Third-Party Content in your production accounts, or on production or other critical data. You are responsible for testing, securing, and optimizing the AWS Content or Third-Party Content, such as sample code, as appropriate for production grade use based on your specific quality control practices and standards. Deploying AWS Content or Third-Party Content may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.

### Data protection

This tool stores all user-supplied input only within your browsers local storage (there is no backend or API). Given the nature of the data that you could be storing you should take the necessary steps to secure access to your browser, and keep your browser and operating system software up-to-date.

The tool supports the export of data out of the browser local storage to a local file, ensure that you are applying the appropriate protections to these file exports in terms of least privilege access control, encryption-at-rest and encryption-in-transit.

### Network accessibility

By default the [WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html) associated with the CloudFront distribution is configured to only allow `192.160.0.0/24` (non-routable networks) to reach the static assets. You’d need to modify the configuration of the CDK application to ensure that you are able to scope access to your network(s) (see ‘Configuration’ section).

### Authentication

In the default configuration there is no authentication to reach the static web assets. You should integrate this with whatever identity management solution you currently use. To add authentication you would need to customise this application. One approach you could consider is to create a [Lambda@Edge](https://aws.amazon.com/lambda/edge/) function to enforce authentication and [associated cookie validation](https://aws.amazon.com/blogs/networking-and-content-delivery/external-server-authorization-with-lambdaedge/), then attach this function to the Amazon CloudFront distribution to protect the static web assets (see ‘Configuration’ section). You’d especially want to consider this if you modify the sample application to include your own data, such as example threat statements.

### Identity and Access Management (IAM) permissions for CDK

It’s recommended that you use a scoped down [IAM policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html) to when interacting with CDK and it’s recommended that you consider customising and attaching the below example to the IAM Principal being used. This policy is scoped down, but does include some powerful permissive actions such as `iam:*` as CDK requires a role to do things like create IAM Roles, S3 Buckets, ECR repositories and SSM parameters when [bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html). The policy does scope each of the allowed actions to resources typically associated with CDK only (specifically, `CDKToolkit/*` stack, and resources with a `cdk-` prefix).

**Note:** You’d need to change the `<aws-account-id>` and `<aws-region>` to align to your values.

```
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

```

### GitHub Pages

At the time of writing it is not possible to configure HSTS (HTTP Strict Transport Security) or custom HTTP headers for GitHub pages, and it’s recommended that you deploy threat-composer into your AWS account where these additional protections have been configured in the provided CDK project.

### Content Security Policy

This tool includes a simple CSP ([Content Security Policy](https://en.wikipedia.org/wiki/Content_Security_Policy)) that should be customised to your needs and use-case. For example, to support showing architecture and data-flow diagrams from URLs the included CSP allows images loads from any source (`img-src: *`), you may want to scope this to the specific domain(s) that you wish to limit this too.

### Importing content

You should only import content into threat-composer from sources that you trust.

![Screenshot of import modal](/docs/screenshot-import-modal.png)

### Vulnerability management

Like all software, it’s important that you have an on-going process in place to ensure that you are performing vulnerability management of the code included in this package and all of it’s dependencies. In this GitHub repository, we leverage [dependabot security alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts) and [dependabot security updates](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates) to detect and update vulnerable dependencies.

Watch this repository for updates and deploy the latest changes. See ‘Maintenance’ section for each Deployment option below on how to deploy the latest changes.

### CloudFront Security Policy

When using the default CloudFront domain and certificate (\*.[cloudfront.net](http://cloudfront.net/)), CloudFront automatically sets the security policy to [TLSv1](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html). It’s recommended that you use a [custom domain](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html) and certificate with the CloudFront distribution and configure it to use use a [Security Policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html) that does not allow older protocols such as TLS 1.0. Consider using the `TLSv1.2_2021` Security Policy.

### AWS Well-Architected Framework

The [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) helps you understand the pros and cons of decisions you make while building systems on AWS. By using the Framework you will learn architectural best practices for designing and [operating](https://docs.aws.amazon.com/wellarchitected/latest/framework/operational-excellence.html) [reliable](https://docs.aws.amazon.com/wellarchitected/latest/framework/reliability.html), [secure](https://docs.aws.amazon.com/wellarchitected/latest/framework/security.html), [efficient](https://docs.aws.amazon.com/wellarchitected/latest/framework/performance-efficiency.html), [cost-effective](https://docs.aws.amazon.com/wellarchitected/latest/framework/cost-optimization.html), and [sustainable](https://docs.aws.amazon.com/wellarchitected/latest/framework/sustainability.html) systems in the cloud.

## Learn how to threat model

- [Threat modeling for builders training - AWS Skill Builder](https://explore.skillbuilder.aws/learn/course/external/view/elearning/13274/threat-modeling-the-right-way-for-builders-workshop) - This free eLearning aims to teach you the fundamentals of performing threat modeling, with knowledge checks and exercises that use the threat-composer tool.
- [How to approach threat modeling - AWS Security Blog](https://aws.amazon.com/blogs/security/how-to-approach-threat-modeling/) provides observations and tips for practical ways to incorporate threat modeling into your organization, which center around communication, collaboration, and human-led expertise to find and address threats that your end customer expects.

## **Deployment**

**Important**: This application uses various AWS services and there are costs associated with these services after the Free Tier usage - please see the AWS Pricing page for details. You are responsible for any AWS costs incurred.

### Prerequisites

- [NodeJS](https://nodejs.org/en/) (version 18 or higher)
- [Yarn](https://yarnpkg.com/) (installed via `npm install -g yarn`)
- [PDK](https://aws.github.io/aws-pdk/overview/index.html) (installed via `npm install -g @aws/pdk`)
- [AWS CLI](https://aws.amazon.com/cli/) (version 2 or higher)
- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) (configured via `aws  configure`)
- [AWS CDK v2](https://aws.amazon.com/cdk/) CLI (installed via `npm install -g aws-cdk`)
- [CDK Bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) (e.g. `cdk bootstrap aws://<your_aws_account_id>/<aws-region>)`

See Deployment section below for more instructions about CDK bootstrapping.

- [git-remote-codecommit](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-git-remote-codecommit.html) (e.g. `pip install git-remote-codecommit`)

### Configuration

The threat-composer Infra CDK app support customization like custom domain name. You can update the configuration in the configuration file to set it up. The configuration file is located at _packages/threat-composer -infra/cdk.context.json_.
Note that all the configurations are **OPTIONAL**.

**Important note:** The default values for `cidrRangesDev` and `cidrRangesProd` are non-routable CIDR ranges. In order to access threat-composer you've need to update these values to ranges that align with your access needs.

---

| Configuration Property | Description                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| repositoryName         | (Optional) The CodeCommit repository name if Deployment with CI/CD option is used                                                                                                                                                          |
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

### Deployment - Static Website Only

Following the steps to deploy an instance of application CloudFormation stack into your AWS account. The application CloudFormation stack include a [CloudFront distribution](https://aws.amazon.com/cloudfront/), [S3 website bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html), and an associated [AWS WAF WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html).

We recommend you bootstrap your CDK project by [specifying the specific AWS Managed Policies](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-customizing) required for the ‘Static Website Only’ deployment to create the required resources, including Amazon S3 Buckets, IAM Roles, CloudFront Distribution etc. This will ensure that CloudFormation does not use the ‘Admin’ policy:

`cdk bootstrap aws://<aws-account-id>/<aws-region> --cloudformation-execution-policies "arn:aws:iam::aws:policy/IAMFullAccess,arn:aws:iam::aws:policy/AWSLambda_FullAccess,arn:aws:iam::aws:policy/AmazonS3FullAccess,arn:aws:iam::aws:policy/CloudFrontFullAccess,arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"`

**Important:** To avoid deployment failures, be sure the policies that you specify are sufficient for any deployments you will perform in the environment being bootstrapped. Meaning if you are using CDK bootstrap for other CDK apps in the same account, you may need to adjust the permissions to be inclusive of what is needed for other applications.

Learn more about customising CDK bootstrap [here](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-customizing).

#### Deployment Instructions

1. Clone the repository

   `git clone https://github.com/awslabs/threat-composer.git `

   `cd threat-composer`

1. Run script:

   `./scripts/deployDev.sh`

![Screenshot of deployDev.sh](/docs/screenshot-deployDev.png)

The script will install dependencies, build the project, and deploy the application CloudFormation stack.

If the script is run successfully, you will see output of your CloudFront domain name. Visit the URL or specified custom domain name (if provided) in a web browser to access the deployed website.

#### Maintenance

It is recommended to watch this GitHub repository for any updates and run the commands below periodically from the project root directory to deploy the latest changes in our GitHub repository:

`git pull origin main`

`./scripts/deployDev.sh`

### Deployment – With CI/CD

If you are planning to customize the configurations or update code to fit your use cases, it is recommended to deploy the whole CI/CD infrastructure CloudFormation Stack. The CI/CD infrastructure includes a [CodeCommit](https://aws.amazon.com/codecommit/) repository and a [CodePipeline](https://aws.amazon.com/codepipeline/). The CodePipeline deploys the application stack ([CloudFront distribution](https://aws.amazon.com/cloudfront/) + [S3 website bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html) + [AWS WAF WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html)) into the nominated dev and prod environments.

This deployment option does create resources beyond what is created in the ‘Static website only’ deployment, such as CodeCommit repository, CodePipeline and KMS keys, hence requires additional permissions within it’s CloudFormation execution policy. At the time of writing there appears to be a bug with CDK (see [issue](https://github.com/aws/aws-cdk/issues/21973)) when using a cross-account keys within the pipeline that the deployment will only be successful if one attaches the `AdministratorAccess` policy to the CloudFormation execution role, as follows:

`cdk bootstrap aws://<aws-account-id>/<aws-region> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`

You may need to include the `--trust` option when bootstrapping the dev or production accounts if they are different from the pipeline AWS account shown below. This command is run from the AWS account that has been configured in the property `accountDev` or `accountProd` in _packages/threat-composer -infra/cdk.context.json_. See below for an example.

`cdk bootstrap aws://<dev-or-prod-aws-account-id>/us-west-2 --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --trust <pipeline-aws-account-id>`

#### Deployment Instructions

1. Clone the repository

   `git clone https://github.com/awslabs/threat-composer.git`

   `cd threat-composer`

1. Deploy the CI/CD infrastructure CloudFormation stack

   `./scripts/deployAll.sh`

![Screenshot of deployAll.sh](/docs/screenshot-deployAll.png)

The script will install dependencies, build the project, and deploy the CI/CD infrastructure CloudFormation stack.

If the script is run successfully, you will see output of your CodeCommit repository GRC URL.

1. Add the newly created CodeCommit repo as a git remote.

   `git remote add codecommit <CodeCommitGRCUrl>`

2. Update configuration/code and `git commit` your changes

3. Push the code to the newly created CodeCommit repo

   `git push codecommit main`

The CodePipeline will be automatically triggered to build the project and deploy the application stack to your nominated dev and prod environments.

#### Maintenance

It is recommended to watch this GitHub repository for any updates and run the commands below periodically to sync the latest changes in our GitHub repository to the mirrored CodeCommit repository.

`git pull --no-rebase origin main`

`git push codecommit main`

## **Development**

This monorepo hosts the code for threat-composer UI components, a [create-react-app](https://create-react-app.dev/) website, and a [CDK app](https://docs.aws.amazon.com/cdk/v2/guide/apps.html) to allow you to deploy the website to your AWS account.

The repository is defined and maintained using [projen](https://github.com/projen/projen) and [aws-prototyping-sdk](https://github.com/aws/aws-prototyping-sdk).

### Repository Structure

| Project                               | Path                                           | Description                                                                                            | Tech stack                                                                          |
| ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| threat-composer                       | packages/threat-composer                       | UI components for threat-composer                                                                      | [React](https://react.dev/), [CloudScape design system](https://cloudscape.design/) |
| threat-composer-app                   | packages/threat-composer-app                   | threat-composer Single Page App (SPA) bootstraped by [create-react-app](https://create-react-app.dev/) | React                                                                               |
| threat-composer-infra                 | packages/threat-composer-infra                 | threat-composer Infrastructure CDK App                                                                 | [aws-prototyping-sdk constructs](https://github.com/aws/aws-prototyping-sdk)        |
| threat-composer-app-browser-extension | packages/threat-composer-app-browser-extension | threat-composer browser extension                                                                      | [wxt](https://wxt.dev/), React                                                      |

### Prerequisites

- [git-secrets](https://github.com/awslabs/git-secrets#installing-git-secrets)
- [oss-attribution-generator](https://www.npmjs.com/package/oss-attribution-generator)

`npm install -g oss-attribution-generator`

### Commands

- Install dependencies

  `pdk install --frozen-lockfile`

- Build all the projects

  `pdk build`

- Run Storybook

  `pdk run storybook`

  Runs storybook to navigate all the threat-composer UI components
  Open [http://localhost:6006](http://localhost:6006/) to view it in the browser. The page will reload if you make edits.

  **It is recommended to use storybook as development environment.**

- Start website in dev mode

  `pdk run dev`

- For the browser extension (Chrome and Firefox) please see [this README](./packages/threat-composer-app-browser-extension/README.md)

## **Customising reference data in your build**

> [!NOTE]
> The following section is only applicable in self-hosting deployment scenarios.

You can customize the reference data used within Threat Composer to better suit your specific needs. The following sections details the types of customisations possible and how to use them.

### Reference or example threat models

Reference or example threat models are available directly in the Workspace selector for quick review and reference. The following steps describe how you can create and include a reference or example threat model in your own deployment.

1. Author your content using Threat Composer, and export as `.tc.json` file
1. Rename the file to a descriptive name, e.g. `ServerlessAPI.tc.json`
1. Place the `.tc.json` file into the `packages/threat-composer/src/data/workspaceExamples` directory.
1. Update `packages/threat-composer/src/data/workspaceExamples/workspaceExamples.ts` file to import the `.tc.json` file. e.g. `import serverlessAPI from './ServerlessAPI.tc.json'` and add it to the `workspaceExamples` array - for example:

    ```
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
1. Build the project

#### Dynamically inject example threat models in build time

1. Follow steps 1-2 above to author your example threat models
1. Store your example threat models within a folder in a seperate location or repository
1. Copy the file folder containing example threat models under the path `packages/threat-composer/src/data/workspaceExamples` in your build
1. Run the script below in your build from the project root to inject the example threat models entry to configuration file `packages/threat-composer/src/data/workspaceExamples/workspaceExamples.ts`:

    ```
    npx ts-node ./scripts/data/injectData.ts WorkspaceExample <SourceDir-relative path to the workspaceExamples folder>
    ```
1. Build the project

### Threat packs

Threat packs allow you to quickly find and add bulk or selected threat statements to your current workspace. The following steps describe how you can create and include a custom Threat Pack in your own deployment.

1. Author your content using Threat Composer, and export as `.tc.json` file
1. Rename the file to a descriptive name, e.g. `AuthenticationThreats.tc.json`
1. Place the `.tc.json` into the `packages/threat-composer/src/data/threatPacks` directory. Or if it's it's already a reference threat model (see section prior to this) there is no need to also add file at this location.
1. Create a `.metadata.json` file for your pack (e.g. `AuthenticationThreats.metadata.json`) in the `packages/threat-composer/src/data/threatPacks` directory
1. Paste the following schema in the file:

    ```
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

1. Update the value of `id` to be a short human readable indentier for the pack (e.g. `AuthThreats`)
1. Update the value of `description` to describe the contents of the pack (e.g. `This pack contains common authentication threats`)
1. Update the value of `path` to point to the _relative_ path of the source `.tc.json` file (e.g. `./AuthenticationThreats.tc.json`)
1. Generate the threat pack file by running `yarn run build:packs` from the root of the local repository
1. Update `packages/threat-composer/src/data/threatPacks/threatPacks.ts` file to import the generated file. e.g. `import authenticationThreatPack './generated/AuthThreats.json';` and add it to the `threatPacks` array - for example:
    ```
    const threatPacks = [
    authenticationThreatPack,
    GenAIChatbot,
    ] as ThreatPack[];
    ```
1. Build the project

#### Dynamically inject example threat packs in build time

1. Follow steps 1-2 above to author your threat packs 
1. Store your threat packs within a folder in a seperate location or repository
1. Follow steps 4-8 above to author your threat pack metadata files
1. Store your threat pack metadata files within a folder in a seperate location or repository (can be the same folder of threat pack files)
1. Copy the file folder(s) containing threat pack files and metadata files under the path `packages/threat-composer/src/data/threatPacks` in your build
1. Run the script below in your build from the project root to build the threat packs

    ```
    npx ts-node ./scripts/data/buildPacks.ts ThreatPack <SourceDir-the relative path to the threatPacks folder for the folder containing metadata files> <DestDir-the relative path to the threatPacks folder for output threat packs files>
    ```

1. Run the script below in your build from the project root to inject the generated threat packs entry to configuration file `packages/threat-composer/src/data/threatPacks/threatPacks.ts`:

    ```
    npx ts-node ./scripts/data/injectData.ts ThreatPack <SourceDir-the value DestDir from the previous step>
    ```
1. Build the project

### Mitigation packs

Mitigation packs allow you to quickly find and add bulk or selected mitigation candidates to your current workspace. The following steps describe how you can create and include a custom Mitigation Pack in your own deployment.

1. Author your content using Threat Composer, and export as `.tc.json` file
1. Rename the file to a descriptive name, e.g. `BaselineControls.tc.json`
1. Place the `.tc.json` into the `packages/threat-composer/src/data/mitigationPacks` directory. Or if it's it's already a reference threat model (see section prior to this) there is no need to also add file at this location.
1. Create a `.metadata.json` file for your pack (e.g. `BaselineControls.metadata.json`) in the `packages/threat-composer/src/data/mitigationPacks` directory
1. Paste the following schema in the file:

    ```
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

1. Update the value of `id` to be a short human readable indentier for the pack (e.g. `BaselineControls`)
1. Update the value of `description` to describe the contents of the pack (e.g. `This pack contains our organizations baseline controls`)
1. Update the value of `path` to point to the _relative_ path of the source `.tc.json` file (e.g. `./BaselineControls.tc.json`)
1. Generate the threat pack file by running `yarn run build:packs` from the root of the local repository
1. Update `packages/threat-composer/src/data/mitigationPacks/mitigationPacks.ts` file to import the generated file. e.g. `import ourBaselineControlsMitigationPack './generated/BaselineControls.json';` and add it to the `mitigationPacks` array - for example:
    ```
    const mitigationPacks = [
    ourBaselineControlsMitigationPack,
    GenAIChatbot,
    ] as MitigationPack[];
    ```
1. Build the project

#### Dynamically inject example mitigation packs in build time

1. Follow steps 1-2 above to author your mitigation packs 
1. Store your mitigation packs within a folder in a seperate location or repository
1. Follow steps 4-8 above to author your mitigation pack metadata files
1. Store your mitigation pack metadata files within a folder in a seperate location or repository (can be the same folder of mitigation pack files)
1. Copy the file folder(s) containing mitigation pack files and metadata files under the path `packages/threat-composer/src/data/mitigationPacks` in your build
1. Run the script below in your build from the project root to build the mitigation packs

    ```
    npx ts-node ./scripts/data/buildPacks.ts MitigationPack <SourceDir-the relative path to the mitigationPacks folder for the folder containing metadata files> <DestDir-the relative path to the the mitigationtPacks folder for output mitigation packs files>
    ```

1. Run the script below in your build from the project root to inject the generated mitigation packs entry to configuration file `packages/threat-composer/src/data/mitigationPacks/mitigationPacks.ts`:

    ```
    npx ts-node ./scripts/data/injectData.ts MitigationPack <SourceDir-the value DestDir from the previous step>
    ```
1. Build the project

### Threat examples

Threats that are included in the example threats data are made make available to users of your deployment of Threat Composer within the 'Full Examples' list within the threat statement editor, and are used at random when a user presses the 'Give me a random example' button in the editor. The following steps describe how you can customise the threats that are included:

1. Open the `packages/threat-composer/src/data/threatStatementExamples.json` file in your editor of choice
1. Add or edit existing entries ensuring to using the expected schema.
    - `id` (string) - A unique ID for your example (e.g. `"EXAMPLE_000001"`)
    - `numberId` (string) - This should aways have a value of `"-1"`
    - `threatSource` (string) - The entity taking action (e.g. `"internal threat actor"`)
    - `prerequistes` (string) - Conditions or requirements that must be met for a threat source's action to be viable. (e.g. `"who can register a vehicle"`)
    - `threatAction` (string) - The action being performed by the threat source (e.g. `"claim they did not do so"`)
    - `threatImpact` (string) - The direct impact of a successful threat action (e.g. `"the actor disputing financial charges related to the registration of a vehicle"`)
    - `impactedGoal` - (Array of strings) - The information security or business objective that is negatively affected. (e.g. `["integrity"]`)
    - `impactedAssets` - (Array of strings) - The assets affected by a successful threat action (e.g. `["billing"]`)
    - `metadata` - (Array of objects) (e.g. `[ "key": "STRIDE", "value" : [ "T"] ]`)

1. Build the project.

## **Contribution guide**

Contribution guide are available at the [Contributing Guidelines](https://github.com/awslabs/threat-composer/blob/main/CONTRIBUTING.md).

## License

This project is licensed under the Apache-2.0 License.
