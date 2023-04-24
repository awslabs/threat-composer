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

monorepo.compileTask.reset('npx nx run-many --target=build --all');
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
    }
  }
});

uiProject.postCompileTask.reset('rsync -arv --prune-empty-dirs --include=*/ --include=*.css --include=*.png --exclude=* ./src/* ./lib');

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
    uiProject.package.packageName,
  ],
  devDeps: [
    "@cloudscape-design/jest-preset",
    "merge",
  ],
  jestOptions: {
    configFilePath: "./jest.config.js",
  },
});

demoAppProject.testTask.reset('react-scripts test --watchAll=false --passWithNoTests');

demoAppProject.eslint?.addPlugins('header');
demoAppProject.eslint?.addRules({
  "header/header": [2, "../../header.js"],
});

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
