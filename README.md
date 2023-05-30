# **threat-composer**

A key phase of the threat modeling process is the "What can go wrong?" step. Feedback we received is that there are two key challenges in this step, firstly there is little industry guidance on what a 'good' threat statement looks like; Secondly, no canonical list of possible things that can wrong hence it necessitates brainstorming and collaboration between the individuals involved in the threat modeling process often starting from a "blank page".

threat-composer aims to provide prescriptive and flexible threat statement structure that allows a user to create a structured threat statement by supplying their own contextual input into the structure, whilst meeting them where they are by allowing them to start from any input that they desire. The tool encourages the user to be more complete and descriptive to help ensure the threat statement allows for both for prioritisation for mitigation and sufficient information to devise mitigation strategies. In addition, the tools aims to aid the brainstorming and collaboration process by including full threat statement examples and per field examples which a customer can use as inspiration or as a starting point for their own custom and contextual threat statements.

## Development 

This monorepo hosts the code for threat-composer UI components, a [create-react-app](https://create-react-app.dev/) website, and a [CDK app](https://docs.aws.amazon.com/cdk/v2/guide/apps.html) to allow you to deploy the demo website to your AWS account.

### Prerequisites

* [git-secrets](https://github.com/awslabs/git-secrets#installing-git-secrets)
* [oss-attribution-generator](https://www.npmjs.com/package/oss-attribution-generator)
```
npm install -g oss-attribution-generator
```

### Commands
*	Install dependencies
```
yarn install --frozen-lockfile & npx projen
```

*	Build all the projects
```
yarn run build
```

*	Run Storybook
```
yarn run storybook
```

Runs storybook to navigate all the threat composer UI components

Open http://localhost:6006 to view it in the browser. The page will reload if you make edits. It is recommended to use storybook as development environment.

* Start website in dev mode
```
yarn run dev
```
