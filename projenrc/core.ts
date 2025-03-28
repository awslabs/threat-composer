import { Project } from "projen";
import { TypeScriptProject } from "projen/lib/typescript";

class ThreatComposerCoreProject extends TypeScriptProject {
  constructor(parent: Project) {
    super({
      parent: parent,
      outdir: "packages/threat-composer-core",
      defaultReleaseBranch: "main",
      name: "@aws/threat-composer-core",
      sampleCode: false,
      deps: [
        "zod", // Required for schema validation
      ],
      devDeps: [],
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

export default ThreatComposerCoreProject;
