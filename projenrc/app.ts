import { Project } from "projen";
import { TypeScriptProject } from "projen/lib/typescript";
import { ReactTypeScriptProject } from "projen/lib/web";
import browsersList from "./config/browsersList";

class ThreatComposerReactAppProject extends ReactTypeScriptProject {
  constructor(parent: Project, uiProject: TypeScriptProject) {
    super({
      parent: parent,
      outdir: "packages/threat-composer-app",
      defaultReleaseBranch: "main",
      name: "@aws/threat-composer-app",
      deps: [
        "@cloudscape-design/components",
        "@cloudscape-design/global-styles",
        "@cloudscape-design/design-tokens",
        "@aws-northstar/ui",
        "@emotion/react",
        "@uidotdev/usehooks",
        "react-router-dom",
        "uuid",
        "docx",
        "unist-util-visit",
        "remark-frontmatter@^4",
        "remark-gfm@^3",
        "remark-parse@^10",
        "unified@^10",
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

    this.eslint?.addPlugins("header");
    this.eslint?.addRules({
      "header/header": [2, "../../header.js"],
    });

    this.testTask.reset(
      "react-scripts test --watchAll=false --passWithNoTests"
    );
    const compileWebsiteTask = this.addTask("compile:website", {
      exec: "BUILD_PATH=./build/website/ react-scripts build",
    });
    const compileBrowserExtensionTask = this.addTask(
      "compile:browser-extension",
      {
        exec: "INLINE_RUNTIME_CHUNK=false BUILD_PATH=./build/browser-extension/ REACT_APP_APP_MODE=browser-extension react-scripts build",
      }
    );
    const compileIDEExtensionTask = this.addTask("compile:ide-extension", {
      exec: "INLINE_RUNTIME_CHUNK=false BUILD_PATH=./build/ide-extension/ REACT_APP_APP_MODE=ide-extension react-scripts build",
    });

    this.compileTask.reset(
      "echo Building Artifacts for Websites, Browser Extensions and IDE Plugins"
    );
    this.compileTask.spawn(compileWebsiteTask);
    this.compileTask.spawn(compileBrowserExtensionTask);
    this.compileTask.spawn(compileIDEExtensionTask);

    this.postCompileTask.reset(
      "[ -d ./build/storybook ] || mkdir -p ./build/storybook"
    );
    this.postCompileTask.exec(
      "cp -r ../threat-composer/storybook.out/ ./build/storybook/"
    );

    this.package.addField("browserslist", browsersList);
  }
}

export default ThreatComposerReactAppProject;
