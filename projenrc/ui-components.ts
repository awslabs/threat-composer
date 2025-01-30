import { Project } from "projen";
import {
  TypeScriptJsxMode,
  TypeScriptModuleResolution,
} from "projen/lib/javascript";
import { TypeScriptProject } from "projen/lib/typescript";
import browsersList from "./config/browsersList";

const uiESModules = ["unified", "@aws-northstar/ui"].join("|");

class ThreatComposerUIComponentsProject extends TypeScriptProject {
  constructor(parent: Project) {
    super({
      parent: parent,
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
        "remark-gfm",
        "remark-rehype",
        "rehype-stringify",
        "remark-frontmatter",
        "react-markdown",
        "d3",
        "sanitize-html",
        "rehype-raw",
        "@aws-northstar/ui",
        "@emotion/react",
        "zod",
        "unified",
        "yaml",
        "@mdxeditor/editor",
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
        compilerOptions: {},
        include: ["src"],
      },
    });

    this.addTask("storybook", {
      exec: "storybook dev -p 6006",
    });

    this.addTask("storybook:build", {
      exec: "storybook build -o storybook.out",
    });

    this.preCompileTask.reset("rm -rf {lib,dist}");
    this.postCompileTask.reset(
      "rsync -arv --prune-empty-dirs --include=*/ --include=*.css --include=*.png --include=*.gif --exclude=* ./src/* ./lib"
    );
    this.postCompileTask.exec("yarn run storybook:build");

    this.eslint?.addPlugins("header");
    this.eslint?.addRules({
      "header/header": [2, "../../header.js"],
    });

    this.package.addField("browserslist", browsersList);
  }
}

export default ThreatComposerUIComponentsProject;
