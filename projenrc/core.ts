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
        "zod@3.22.4", // Required for schema validation
        "rehype-stringify@^9.0.3", // Required for parseTableCellContent
        "remark-gfm@^3.0.1", // Required for parseTableCellContent
        "remark-parse@^10.0.2", // Required for parseTableCellContent
        "remark-rehype@^10.1.0", // Required for parseTableCellContent
        "unified@^10.1.2", // Required for parseTableCellContent
        "sanitize-html@^2.13.0", // Required for sanitizeHtml
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
