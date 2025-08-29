import { Project } from "projen";
import { ApprovalLevel, AwsCdkTypeScriptApp } from "projen/lib/awscdk";

class ThreatComposerInfraProject extends AwsCdkTypeScriptApp {
  constructor(parent: Project) {
    super({
      cdkVersion: "2.128.0",
      defaultReleaseBranch: "main",
      deps: ["@aws/pdk@0.26.7", "cdk-nag"],
      name: "@aws/threat-composer-infra",
      parent: parent,
      outdir: "packages/threat-composer-infra",
      appEntrypoint: "pipeline.ts",
      sampleCode: false,
      requireApproval: ApprovalLevel.NEVER,
      tsconfig: {
        compilerOptions: {
          lib: ["es2019", "es2020", "dom"],
          skipLibCheck: true,
        },
      },
    });

    this.eslint?.addPlugins("header");
    this.eslint?.addRules({
      "header/header": [2, "../../header.js"],
    });
  }
}

export default ThreatComposerInfraProject;
