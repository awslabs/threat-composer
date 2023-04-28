import { nx_monorepo, pipeline } from "aws-prototyping-sdk";
import { ApprovalLevel } from "projen/lib/awscdk";
import { ReactTypeScriptProject } from "projen/lib/web";
import { TypeScriptProject } from "projen/lib/typescript";
import { TypeScriptJsxMode, TypeScriptModuleResolution } from "projen/lib/javascript";

const monorepo = new nx_monorepo.NxMonorepoProject({
  defaultReleaseBranch: "mainline",
  name: "threat-statement-generator-monorepo",
  devDeps: [
    "aws-prototyping-sdk", 
    "eslint-plugin-header",
    "license-checker",
  ],
});

monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.@types/react", "^18.0.27");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.react", "^18.2.0");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.nth-check", "^2.1.1");
monorepo.addGitIgnore('.temp/');
monorepo.addGitIgnore('oss-attribution/');
monorepo.addGitIgnore('storybook.out/');

monorepo.addTask('export:examples', {
  steps: [
    {
      "spawn": "build"
    },
    {
      "exec": 'node ./scripts/exportExamples.js',
    }
  ]
});

monorepo.addTask('generate:attribution', {
  exec: 'git secrets --scan && generate-attribution && mv oss-attribution/attribution.txt LICENSE-THIRD-PARTY'
});

monorepo.addTask('license:checker', {
  exec: "yarn license-checker --summary --production --excludePrivatePackages --onlyAllow 'MIT;Apache-2.0;ISC;'"
});

monorepo.addTask('dev', {
  exec: 'npx nx run threat-statement-generator-demo-app:dev'
});

monorepo.addTask('storybook', {
  exec: 'npx nx run threat-statement-generator:storybook'
});

monorepo.compileTask.reset('npx nx run-many --target=build --all --skip-nx-cache');
monorepo.postCompileTask.reset('yarn run generate:attribution && yarn run license:checker');

const uiProject = new TypeScriptProject({
  parent: monorepo,
  outdir: "packages/threat-statement-generator",
  defaultReleaseBranch: "mainline",
  name: "threat-statement-generator",
  sampleCode: false,
  deps: [
    "@cloudscape-design/components",
    "@cloudscape-design/global-styles",
    "use-local-storage-state",
    "indefinite",
    "uuid",
    "react-simply-carousel",
  ],
  devDeps: [
    "@cloudscape-design/jest-preset",
    "@types/indefinite",
    "@types/react-dom@^18",
    "@types/react@^18",
    "@types/uuid",
    "merge",
    "react-dom@^18",
    "react@^18",
    "@babel/preset-env@^7.21.4",
    "@babel/preset-react@^7.18.6",
    "@babel/preset-typescript@^7.21.4",
    "@storybook/addon-essentials@^7.0.6",
    "@storybook/addon-interactions@^7.0.6",
    "@storybook/addon-links@^7.0.6",
    "@storybook/blocks@^7.0.6",
    "@storybook/react@^7.0.6",
    "@storybook/react-webpack5@^7.0.6",
    "@storybook/testing-library@^0.0.14-next.2",
    "eslint-plugin-storybook@^0.6.11",
    "prop-types@^15.8.1",
    "storybook@^7.0.6",
  ],
  peerDeps: [
    "@types/react-dom@^18",
    "@types/react@^18",
    "react-dom@^18",
    "react@^18",
  ],
  jestOptions: {
    configFilePath: "./jest.config.json",
  },
  tsconfig: {
    compilerOptions: {
      jsx: TypeScriptJsxMode.REACT_JSX,
      skipLibCheck: true,
      lib: ["dom", "dom.iterable", "es2015", "es2020", "esnext"],
      module: "commonjs",
      emitDecoratorMetadata: true,
      moduleResolution: TypeScriptModuleResolution.NODE,
    },
  },
  tsconfigDev: {
    compilerOptions: {
    },
    include: [
      "src",
    ]
  }
});

uiProject.addTask('storybook', {
  exec: 'storybook dev -p 6006'
});

uiProject.addTask('storybook:build', {
  exec: 'storybook build -o storybook.out'
});

uiProject.postCompileTask.reset('rsync -arv --prune-empty-dirs --include=*/ --include=*.css --include=*.png --exclude=* ./src/* ./lib');
uiProject.postCompileTask.exec('yarn run storybook:build');

uiProject.eslint?.addPlugins('header');
uiProject.eslint?.addRules({
  "header/header": [2, "../../header.js"],
});

const demoAppProject = new ReactTypeScriptProject({
  parent: monorepo,
  outdir: "packages/threat-statement-generator-demo-app",
  defaultReleaseBranch: "mainline",
  name: "threat-statement-generator-demo-app",
  deps: [
    "@cloudscape-design/components",
    "@cloudscape-design/global-styles",
    "react-router-dom",
    uiProject.package.packageName,
  ],
  devDeps: [
    "@cloudscape-design/jest-preset",
    "@types/react-router-dom",
    "merge",
  ],
  jestOptions: {
    configFilePath: "./jest.config.js",
  },
});

demoAppProject.eslint?.addPlugins('header');
demoAppProject.eslint?.addRules({
  "header/header": [2, "../../header.js"],
});

demoAppProject.testTask.reset('react-scripts test --watchAll=false --passWithNoTests');
demoAppProject.postCompileTask.reset(`[ -d ./build/storybook ] || mkdir -p ./build/storybook`);
demoAppProject.postCompileTask.exec(`cp -r ../threat-statement-generator/storybook.out/ ./build/storybook/`);

const infraProject = new pipeline.PDKPipelineTsProject({
  cdkVersion: "2.62.2",
  defaultReleaseBranch: "mainline",
  devDeps: ["aws-prototyping-sdk"],
  name: "threat-statement-generator-infra",
  parent: monorepo,
  outdir: "packages/threat-statement-generator-infra",
  requireApproval: ApprovalLevel.NEVER,
  deps: [
    "@aws-prototyping-sdk/static-website",
  ],
  tsconfig: {
    compilerOptions: {
      lib: ['es2019', 'es2020', 'dom'],
      skipLibCheck: true,
    },
  }
});

infraProject.eslint?.addPlugins('header');
infraProject.eslint?.addRules({
  "header/header": [2, "../../header.js"],
});

monorepo.addImplicitDependency(demoAppProject, uiProject);
monorepo.addImplicitDependency(infraProject, demoAppProject);

monorepo.synth();
