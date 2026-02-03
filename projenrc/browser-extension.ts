import { Project } from "projen";
import { TypeScriptJsxMode } from "projen/lib/javascript";
import { TypeScriptProject } from "projen/lib/typescript";
import browsersList from "./config/browsersList";

class ThreatComposerBrowserExtensionProject extends TypeScriptProject {
  constructor(parent: Project) {
    super({
      parent: parent,
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
        "@wxt-dev/auto-icons",
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

    this.addTask("dev", {
      exec: "wxt",
    });

    this.addTask("dev:firefox", {
      exec: "wxt --browser firefox",
    });

    this.compileTask.reset("wxt build -b chrome");
    this.compileTask.exec("wxt build -b firefox");

    this.addTask("zip", {
      exec: "wxt zip",
    });

    this.addTask("zip:firefox", {
      exec: "wxt zip --browser firefox",
    });

    this.addTask("postinstall", {
      exec: "wxt prepare",
    });

    this.eslint?.addPlugins("header");
    this.eslint?.addRules({
      "header/header": [2, "../../header.js"],
    });

    this.package.addField("browserslist", browsersList);
  }
}

export default ThreatComposerBrowserExtensionProject;
