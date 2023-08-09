# **threat-composer**

## Goal

A threat modeling tool to help humans to reduce time-to-value when threat modeling

## Summary

[Threat modeling](https://catalog.workshops.aws/threatmodel/en-US/introduction) helps you identify security issues and develop a strategy to address them in the context of your system.

A threat model directly supports your ability to define, and agree upon what is necessary in order to deliver a secure product or service. You can threat model very early in your design phase. These early insights put you in a better position to efficiently build and ship your workload securely. Identifying and fixing issues at design time is exponentially easier to do than doing so once the workload has been built.

A key phase of the [threat modeling process](https://catalog.workshops.aws/threatmodel/en-US/introduction/how-to-threat-model) is the "What can go wrong?" step. Feedback from builders is that there are two key challenges in this step, firstly there is little industry guidance on what a 'good' threat statement looks like. Secondly, no canonical list of possible things that can wrong hence it necessitates brainstorming and collaboration between the individuals involved in the threat modeling process often starting from a "blank page".

threat-composer provides a prescriptive threat articulation structure, this helps users create threat statements with less effort. The tool supports starting from any part of the threat statement, and encourages the user to be more complete and descriptive to help ensure the threat statement allows for both for prioritization for mitigation and sufficient information to devise mitigation strategies. In addition, the tools aims to aid the brainstorming and collaboration process by including full threat statement examples and per field examples which a customer can use as inspiration or as a starting point for their own custom and contextual threat statements.

![Screenshot of ThreatsOnly mode](/docs/screenshot-threatsonly-mode.png)

## Features

* Renders structured threat statements based on user input
* Adaptive threat statement structure, this helps create progressively more complete threats.
* Dynamic suggestions based on supplied and missing user input
* Complete threat statement examples to aid contextual brainstorming and re-use
* Data persisted only client-side with the browser
* Import/export capabilities to enable persistent storage and sharing
* Workspace separation to cater for multiple solution requirements

## **Usage**

You can try the threat-composer demo via the [Github Pages](https://awslabs.github.io/threat-composer/) deployment. It's **RECOMMENDED** that you use the included [AWS Cloud Development Kit (CDK) app](https://docs.aws.amazon.com/cdk/v2/guide/home.html) to self-host the static website, support your customization, and continuous development. Refer to the [**Security considerations section**](#security-considerations) and [**Deployment section**](#deployment).

## Security considerations

>The sample code; software libraries; command line tools; proofs of concept; templates; or other related technology (including any of the foregoing that are provided by our personnel) is provided to you as AWS Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this AWS Content in your production accounts, or on production or other critical data. You are responsible for testing, securing, and optimizing the AWS Content, such as sample code, as appropriate for production grade use based on your specific quality control practices and standards. Deploying AWS Content may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.

### Data protection

This tool stores all user-supplied input only within your browsers local storage (there is no backend or API). Given the nature of the data that you could be storing you should take the necessary steps to secure access to your browser, and keep your browser and operating system software up-to-date.

The tool supports the export of data out of the browser local storage to a local file, ensure that you are applying the appropriate protections to these file exports in terms of least privilege access control, encryption-at-rest and encryption-in-transit.

### Network accessibility

By default the [WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html) associated with the CloudFront distribution is configured to only allow `192.160.0.0/24` (non-routable networks) to reach the static assets. You’d need to modify the configuration of the CDK application to ensure that you are able to scope access to your network(s) (see ‘Configuration’ section).

### Authentication

In the default configuration there is no authentication to reach the static web assets. You should integrate this with whatever identity management solution you currently use. To add authentication you would need to customise this application. One approach you could consider is to create a [Lambda@Edge](https://aws.amazon.com/lambda/edge/) function to enforce authentication and [associated cookie validation](https://aws.amazon.com/blogs/networking-and-content-delivery/external-server-authorization-with-lambdaedge/), then attach this function to the Amazon CloudFront distribution to protect the static web assets (see ‘Configuration’ section). You’d especially want to consider this if you modify the sample application to include your own data, such as example threat statements.

### Identity and Access Management (IAM) permissions for CDK

It’s recommended that you use a scoped down [IAM policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html) to when interacting with CDK and it’s recommended that you consider customising and attaching the below example to the IAM Principal being used. This policy is scoped down, but does include some powerful permissive actions such as `iam:*`  as CDK requires a role to do things like create IAM Roles, S3 Buckets, ECR repositories and SSM parameters when [bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html). The policy does scope each of the allowed actions to resources typically associated with CDK only (specifically, `CDKToolkit/*` stack, and resources with a `cdk-` prefix). 

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

When using the default CloudFront domain and certificate (*.[cloudfront.net](http://cloudfront.net/)), CloudFront automatically sets the security policy to [TLSv1](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html). It’s recommended that you use a [custom domain](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html) and certificate with the CloudFront distribution and configure it to use use a [Security Policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html) that does not allow older protocols such as TLS 1.0. Consider using the  `TLSv1.2_2021` Security Policy.

### AWS Well-Architected Framework

The [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) helps you understand the pros and cons of decisions you make while building systems on AWS. By using the Framework you will learn architectural best practices for designing and [operating](https://docs.aws.amazon.com/wellarchitected/latest/framework/operational-excellence.html) [reliable](https://docs.aws.amazon.com/wellarchitected/latest/framework/reliability.html), [secure](https://docs.aws.amazon.com/wellarchitected/latest/framework/security.html), [efficient](https://docs.aws.amazon.com/wellarchitected/latest/framework/performance-efficiency.html), [cost-effective](https://docs.aws.amazon.com/wellarchitected/latest/framework/cost-optimization.html), and [sustainable](https://docs.aws.amazon.com/wellarchitected/latest/framework/sustainability.html) systems in the cloud.

## Preview of future direction

We have begun laying the foundations to address the end-to-end threat modeling workflow, this includes coverage of:

* The [“What are we working on?”](https://catalog.workshops.aws/threatmodel/en-US/what-are-we-working-on) step - Allowing you to provide and store application information, architecture diagram and data flow diagram
* The [“What are we going to about it?”](https://catalog.workshops.aws/threatmodel/en-US/what-are-we-going-to-do-about-it) step allowing you to capture mitigation candidates and link to threats
* Supporting the capture and linkage of assumptions that you can link back to both threats and mitigations
* And bringing it all together, will generate a threat model document based off of your input.

This application only uses browser storage, hence it does not send user supplied input anywhere. The tool provides import and export capabilities where we envision you storing and version controlling your threat model in your version control system; effectively having a threat model as code along side your application code.

![Screenshot of full mode](/docs/screenshot-full-mode.png)

You can preview the above functionality [here](https://awslabs.github.io/threat-composer/?mode=Full).

## Learn how to threat model

* [Threat modeling for builders training - AWS Skill Builder](https://explore.skillbuilder.aws/learn/course/external/view/elearning/13274/threat-modeling-the-right-way-for-builders-workshop) - This free eLearning aims to teach you the fundamentals of performing threat modeling, with knowledge checks and exercises that use the threat-composer tool.
* [How to approach threat modeling - AWS Security Blog](https://aws.amazon.com/blogs/security/how-to-approach-threat-modeling/) provides observations and tips for practical ways to incorporate threat modeling into your organization, which center around communication, collaboration, and human-led expertise to find and address threats that your end customer expects.

## **Deployment**

****Important****: This application uses various AWS services and there are costs associated with these services after the Free Tier usage - please see the AWS Pricing page for details. You are responsible for any AWS costs incurred. 

### **Prerequisites**

* [NodeJS](https://nodejs.org/en/) (version  16 or higher)
* [Yarn](https://yarnpkg.com/) (installed  via `npm install -g yarn`)
* [AWS CLI](https://aws.amazon.com/cli/) (version 2 or higher)
* [AWS  CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) (configured via `aws  configure`)
* [AWS  CDK v2](https://aws.amazon.com/cdk/) CLI  (installed via `npm install -g aws-cdk`)
* [CDK Bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) (e.g. `cdk bootstrap aws://<your_aws_account_id>/<aws-region>)`

See Deployment section below for more instructions about CDK bootstrapping.

* [git-remote-codecommit](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-git-remote-codecommit.html) (e.g. `pip install git-remote-codecommit`)

### Configuration 

The threat-composer Infra CDK app support customization like custom domain name. You can update the configuration in the configuration file to set it up. The configuration file is located at *packages/threat-composer -infra/cdk.context.json*. 
Note that all the configurations are **OPTIONAL**.

**Important note:** The default values for `cidrRangesDev` and `cidrRangesProd` are non-routable CIDR ranges. In order to access threat-composer you've need to update these values to ranges that align with your access needs.

** **** **

| Configuration Property	| Description	|
|---	|---	|
| repositoryName	| (Optional) The CodeCommit repository name  if Deployment with CI/CD option is used	|
| accountPipeline	| (Optional) The AWS account for deploying CodeCommit  repository and CI/CD pipeline if Deployment with CI/CD option is used. Default  value: current account	|
| accountDev	| (Optional) The AWS account for deploying  dev instance of application stack. Default value: current account	|
| accountProd	| (Optional) The AWS account for deploying prod  instance of application stack if Deployment with CI/CD option is used.	|
| cidrTypeDev	| (Optional) The IP address type for dev instance of [WAF WebAcl IPSet](https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html). Options are IPV4 or IPV6. Default value: IPV4.	|
| cidrTypeProd	|(Optional) The IP address type for prod instance of [WAF WebAcl IPSet](https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html). Options are IPV4 or IPV6. Default value: IPV4.	|
| cidrRangesDev	|(Optional) The IP address ranges for dev instance of [WAF WebAcl IPSet](https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html). Multiple values is supported via `,` separator. Default value: `192.168.0.0/24`. |
| cidrRangesProd |(Optional) The IP address ranges for prod instance of [WAF WebAcl IPSet](https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html). Multiple values is supported via `,` separator. Default value: `192.168.0.0/24`.	|
| domainNameDev	| (Optional) The custom domain name for dev deployment |
| domainNameProd	|(Optional) The custom domain name for prod deployment |
| certificateDev	| (Optional) The AWS Certificate Manager certificate ARN for the custom domain name of dev deployment if custom domain name is used |
| certificateProd	| (Optional) The AWS Certificate Manager certificate ARN for the custom domain name of prod deployment if custom domain name is used |
| hostZoneNameDev	| (Optional) The Route 53 host zone for the custom domain name of prod deployment if host zone record creation is required |
| hostZoneNameProd | (Optional) The Route 53 host zone for the custom domain name of prod deployment if host zone record creation is required |
| lambdaEdgeDev	|(Optional) The lambda edge function ARN attached to CloudFront VIEWER_REQUEST event for CloudFront dev instance or the AWS Systems Manbager(SSM) parameter name (in us-east-1) storing the Lambda edge function ARN |
| lambdaEdgeProd |(Optional) The lambda edge function ARN attached to CloudFront VIEWER_REQUEST event for CloudFront prod instance or the AWS Systems Manbager(SSM) parameter name (in us-east-1) storing the Lambda edge function ARN |

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

It is recommended to watch this GitHub repository for any updates and run the commands below periodically to deploy the latest changes in our GitHub repository:

`git pull origin main`

`/scripts/deployDev.sh`

### Deployment – With CI/CD 

If you are planning to customize the configurations or update code to fit your use cases, it is recommended to deploy the whole CI/CD infrastructure CloudFormation Stack. The CI/CD infrastructure includes a [CodeCommit](https://aws.amazon.com/codecommit/) repository and a [CodePipeline](https://aws.amazon.com/codepipeline/). The CodePipeline deploys the application stack ([CloudFront distribution](https://aws.amazon.com/cloudfront/) + [S3 website bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html) + [AWS WAF WebACL](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl.html)) into the nominated dev and prod environments.

This deployment option does create resources beyond what is created in the ‘Static website only’ deployment, such as CodeCommit repository, CodePipeline and KMS keys, hence requires additional permissions within it’s CloudFormation execution policy. At the time of writing there appears to be a bug with CDK (see [issue](https://github.com/aws/aws-cdk/issues/21973)) when using a cross-account keys within the pipeline that the deployment will only be successful if one attaches the `AdministratorAccess` policy to the CloudFormation execution role, as follows:

`cdk bootstrap aws://<aws-account-id>/<aws-region> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`

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

|Project	|Path	|Description	|Tech stack	|
|---	|---	|---	|---	|
|threat-composer	|packages/threat-composer	|UI components for threat-composer	|[React](https://react.dev/), [CloudScape design system](https://cloudscape.design/)	|
|threat-composer-app	|packages/threat-composer-app	|threat-composer Single Page App (SPA) bootstraped by [create-react-app](https://create-react-app.dev/)	|React	|
|threat-composer-infra	|packages/threat-composer-infra	|threat-composer Infrastructure CDK App 	|[aws-prototyping-sdk constructs](https://github.com/aws/aws-prototyping-sdk)	|

### Prerequisites

* [git-secrets](https://github.com/awslabs/git-secrets#installing-git-secrets)
* [oss-attribution-generator](https://www.npmjs.com/package/oss-attribution-generator)

`npm install -g oss-attribution-generator`

### Commands

* Install dependencies

    `yarn install --frozen-lockfile & npx projen`
 

* Build all the projects

    `yarn run build`
 

* Run Storybook

    `yarn run storybook`
 
    Runs storybook to navigate all the threat-composer UI components
    Open [http://localhost:6006](http://localhost:6006/) to view it in the browser. The page will reload if you make edits.


    **It is recommended to use storybook as development environment.**
 
* Start website in dev mode

    `yarn run dev`

## **Contribution guide** 

Contribution guide are available at the [Contributing Guidelines](https://github.com/awslabs/threat-composer/blob/main/CONTRIBUTING.md).

## License

This project is licensed under the Apache-2.0 License.



