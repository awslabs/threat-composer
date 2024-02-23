import { MonorepoTsProject } from "@aws/pdk/monorepo";
import { ApprovalLevel, AwsCdkTypeScriptApp } from "projen/lib/awscdk";
import { ReactTypeScriptProject } from "projen/lib/web";
import { TypeScriptProject } from "projen/lib/typescript";
import { TypeScriptJsxMode, TypeScriptModuleResolution } from "projen/lib/javascript";

const monorepo = new MonorepoTsProject({
  defaultReleaseBranch: "main",
  name: "@aws/threat-composer-monorepo",
  devDeps: [
    "@aws/pdk",
    "eslint-plugin-header",
    "license-checker",
    "husky",
  ],
});

monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.@types/react", "^18.0.27");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.react", "^18.2.0");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.nth-check", "^2.1.1");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.yaml", "^2.2.2");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.js-yaml", "^3.13.1");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.semver", "^7.5.3");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.@babel/traverse", "^7.23.2");
monorepo.tryFindObjectFile("package.json")?.addOverride("resolutions.postcss", "^8.4.31");
monorepo
  .tryFindObjectFile("package.json")
  ?.addOverride("workspaces.nohoist", ["**/wxt"]);
monorepo.addGitIgnore('.temp/');
monorepo.addGitIgnore('oss-attribution/');
monorepo.addGitIgnore('storybook.out/');
monorepo.addGitIgnore(".DS_Store");
monorepo.addGitIgnore(".output/");

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

monorepo.addTask('prepare', {
  steps: [
    {
      "exec": 'husky install',
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
  exec: 'GENERATE_SOURCEMAP=false npx nx run @aws/threat-composer-app:dev'
});

monorepo.addTask('storybook', {
  exec: 'GENERATE_SOURCEMAP=false npx nx run @aws/threat-composer:storybook'
});

monorepo.compileTask.reset('npx nx run-many --target=build --all --skip-nx-cache --nx-bail');
monorepo.postCompileTask.reset('yarn run generate:attribution && yarn run license:checker');

const uiESModules = [
  "unified",
  "@aws-northstar/ui"
].join("|");

const browsersList = {
  production: [
    ">0.2%",
    "not dead",
    "not ie 11",
    "not chrome < 51",
    "not safari < 10",
    "not android < 51",
  ],
  development: [
    ">0.2%",
    "not dead",
    "not ie 11",
    "not chrome < 51",
    "not safari < 10",
    "not android < 51",
  ],
};

const uiProject = new TypeScriptProject({
  parent: monorepo,
  outdir: "packages/threat-composer",
  defaultReleaseBranch: "main",
  name: "@aws/threat-composer",
  sampleCode: false,
  deps: [
    "@cloudscape-design/components",
    "@cloudscape-design/collection-hooks",
    "@cloudscape-design/global-styles",
    "@cloudscape-design/design-tokens",
    "@cloudscape-design/board-components",
    "lodash.isequal",
    "use-local-storage-state",
    "indefinite",
    "uuid",
    "react-simply-carousel",
    "browser-image-compression",
    "remark-parse",
    'remark-gfm',
    "remark-rehype",
    "rehype-stringify",
    'remark-frontmatter',
    'react-markdown',
    "d3",
    "sanitize-html",
    "rehype-raw",
    "@aws-northstar/ui",
    "@emotion/react",
    "zod",
    "unified",
  ],
  devDeps: [
    "@cloudscape-design/jest-preset",
    "@types/lodash.isequal",
    "@types/indefinite",
    "@types/react-dom@^18",
    "@types/react@^18",
    "@types/uuid",
    "@types/sanitize-html",
    "@types/d3",
    "merge",
    "react-dom@^18",
    "react@^18",
    "@babel/preset-env",
    "@babel/preset-react",
    "@babel/preset-typescript",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-links",
    "@storybook/blocks",
    "@storybook/react",
    "@storybook/react-webpack5",
    "@storybook/testing-library",
    "eslint-plugin-storybook",
    "prop-types",
    "storybook",
  ],
  peerDeps: [
    "@types/react-dom@^18",
    "@types/react@^18",
    "react-dom@^18",
    "react@^18",
  ],
  jestOptions: {
    configFilePath: "./jest.config.json",
    jestConfig: {
      transformIgnorePatterns: [
        `[/\\\\]node_modules[/\\\\](?!${uiESModules}).+\\.(js|jsx|mjs|cjs|ts|tsx)$`,
      ],
    },
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

uiProject.preCompileTask.reset('rm -rf {lib,dist}')
uiProject.postCompileTask.reset('rsync -arv --prune-empty-dirs --include=*/ --include=*.css --include=*.png --include=*.gif --exclude=* ./src/* ./lib');
uiProject.postCompileTask.exec('yarn run storybook:build');

uiProject.eslint?.addPlugins('header');
uiProject.eslint?.addRules({
  "header/header": [2, "../../header.js"],
});

uiProject.package.addField("browserslist", browsersList);

const appProject = new ReactTypeScriptProject({
  parent: monorepo,
  outdir: "packages/threat-composer-app",
  defaultReleaseBranch: "main",
  name: "@aws/threat-composer-app",
  deps: [
    "@cloudscape-design/components",
    "@cloudscape-design/global-styles",
    "@cloudscape-design/design-tokens",
    "@aws-northstar/ui",
    "react-router-dom",
    "uuid",
    uiProject.package.packageName,
  ],
  devDeps: [
    "@cloudscape-design/jest-preset",
    "@types/react-router-dom",
    "@types/uuid",
    "merge",
  ],
  jestOptions: {
    configFilePath: "./jest.config.js",
  },
});

appProject.eslint?.addPlugins('header');
appProject.eslint?.addRules({
  "header/header": [2, "../../header.js"],
});

appProject.testTask.reset('react-scripts test --watchAll=false --passWithNoTests');
const compileWebsiteTask = appProject.addTask('compile:website', {
  exec: 'BUILD_PATH=./build/website/ react-scripts build'
});
const compileBrowserExtensionTask = appProject.addTask('compile:browser-extension', {
  exec: 'INLINE_RUNTIME_CHUNK=false BUILD_PATH=./build/browser-extension/ REACT_APP_APP_MODE=browser-extension react-scripts build'
});
const compileIDEExtensionTask = appProject.addTask('compile:ide-extension', {
  exec: 'INLINE_RUNTIME_CHUNK=false BUILD_PATH=./build/ide-extension/ REACT_APP_APP_MODE=ide-extension react-scripts build'
});

appProject.compileTask.reset('echo Building Artifacts for Websites, Browser Extensions and IDE Plugins');
appProject.compileTask.spawn(compileWebsiteTask);
appProject.compileTask.spawn(compileBrowserExtensionTask);
appProject.compileTask.spawn(compileIDEExtensionTask);

appProject.postCompileTask.reset(`[ -d ./build/storybook ] || mkdir -p ./build/storybook`);
appProject.postCompileTask.exec(`cp -r ../threat-composer/storybook.out/ ./build/storybook/`);

appProject.package.addField("browserslist", browsersList);

const infraProject = new AwsCdkTypeScriptApp({
  cdkVersion: "2.128.0",
  defaultReleaseBranch: "main",
  deps: [
    "@aws/pdk",
    "cdk-nag",
  ],
  name: "@aws/threat-composer-infra",
  parent: monorepo,
  outdir: "packages/threat-composer-infra",
  appEntrypoint: "pipeline.ts",
  sampleCode: false,
  requireApproval: ApprovalLevel.NEVER,
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

const browserExtensionProject = new TypeScriptProject({
  parent: monorepo,
  outdir: "packages/threat-composer-app-browser-extension",
  defaultReleaseBranch: "main",
  name: "@aws/threat-composer-app-browser-extension",
  deps: [
    "react-router-dom",
    "@cloudscape-design/components",
    "react",
    "react-dom",
  ],
  devDeps: [
    "wxt",
    "@vitejs/plugin-react",
    "rollup-plugin-copy",
    "@types/react",
    "@types/react-dom",
  ],
  sampleCode: false,
  tsconfig: {
    compilerOptions: {
      lib: ["dom", "dom.iterable"],
      jsx: TypeScriptJsxMode.REACT_JSX,
    },
    include: ["src", ".wxt/types"],
  },
});

browserExtensionProject.addTask("dev", {
  exec: "wxt",
});

browserExtensionProject.addTask("dev:firefox", {
  exec: "wxt --browser firefox",
});

browserExtensionProject.compileTask.reset("wxt build -b chrome");
browserExtensionProject.compileTask.exec("wxt build -b firefox");

browserExtensionProject.addTask("zip", {
  exec: "wxt zip",
});

browserExtensionProject.addTask("zip:firefox", {
  exec: "wxt zip --browser firefox",
});

browserExtensionProject.addTask("postinstall", {
  exec: "wxt prepare",
});

browserExtensionProject.eslint?.addPlugins("header");
browserExtensionProject.eslint?.addRules({
  "header/header": [2, "../../header.js"],
});

browserExtensionProject.package.addField("browserslist", browsersList);

monorepo.addImplicitDependency(appProject, uiProject);
monorepo.addImplicitDependency(infraProject, appProject);
monorepo.addImplicitDependency(browserExtensionProject, appProject);

monorepo.synth();
