import { Project } from "projen";
import { TypeScriptProject } from "projen/lib/typescript";

class ThreatComposerCliProject extends TypeScriptProject {
  constructor(parent: Project) {
    super({
      parent: parent,
      outdir: "packages/threat-composer-cli",
      defaultReleaseBranch: "main",
      name: "@aws/threat-composer-cli",
      sampleCode: false,
      deps: [
        "@aws/threat-composer-core", // Required for core functionality
        "yargs", // Required for CLI argument parsing
      ],
      devDeps: [
        "@types/yargs", // Required for TypeScript type definitions
      ],
      peerDeps: [],
      tsconfig: {
        compilerOptions: {
          lib: ["es2020", "dom"],
          skipLibCheck: true,
        },
      },
      tsconfigDev: {
        compilerOptions: {},
        include: ["src"],
      },
      bin: {
        "threat-composer-cli": "lib/index.js",
      },
    });

    // Add license header check
    this.eslint?.addPlugins("header");
    this.eslint?.addRules({
      "header/header": [2, "../../header.js"],
    });

    // Pre and post compile tasks
    this.preCompileTask.reset("rm -rf {lib,dist}");
  }
}

export default ThreatComposerCliProject;
