import { MonorepoTsProject } from "@aws/pdk/monorepo";

class ThreatComposerMonorepoProject extends MonorepoTsProject {
  constructor() {
    super({
      defaultReleaseBranch: "main",
      name: "@aws/threat-composer-monorepo",
      devDeps: [
        "@aws/pdk",
        "eslint-plugin-header",
        "license-checker",
        "husky",
        "@babel/helper-split-export-declaration",
      ],
    });

    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.@types/react",
      "^18.0.27"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.react",
      "^18.2.0"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.nth-check",
      "^2.1.1"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.yaml",
      "^2.2.2"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.js-yaml",
      "^3.13.1"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.semver",
      "^7.5.3"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.@babel/traverse",
      "^7.25.0"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.postcss",
      "^8.4.31"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.web-ext-run",
      "^0.2.1"
    );
    this.tryFindObjectFile("package.json")?.addOverride(
      "resolutions.esbuild",
      "^0.25.4"
    );

    this.tryFindObjectFile("package.json")?.addOverride("workspaces.nohoist", [
      "**/wxt",
    ]);
    this.addGitIgnore(".temp/");
    this.addGitIgnore("oss-attribution/");
    this.addGitIgnore("storybook.out/");
    this.addGitIgnore(".DS_Store");
    this.addGitIgnore(".output/");
    this.addGitIgnore(".threat-composer/");

    // Python-specific patterns
    this.addGitIgnore("__pycache__/");
    this.addGitIgnore("*.py[cod]");
    this.addGitIgnore("*$py.class");
    this.addGitIgnore("*.so");
    this.addGitIgnore(".Python");
    this.addGitIgnore("*.egg-info/");
    this.addGitIgnore(".pytest_cache/");
    this.addGitIgnore(".coverage");
    this.addGitIgnore(".env");
    this.addGitIgnore(".venv/");
    this.addGitIgnore("venv/");

    this.addTask("export:examples", {
      steps: [
        {
          spawn: "build",
        },
        {
          exec: "node ./scripts/exportExamples.js",
        },
      ],
    });

    this.addTask("prepare", {
      steps: [
        {
          exec: "husky install",
        },
      ],
    });

    this.addTask("generate:attribution", {
      exec: "git secrets --scan && generate-attribution && mv oss-attribution/attribution.txt LICENSE-THIRD-PARTY",
    });

    this.addTask("license:checker", {
      exec: "yarn license-checker --summary --production --excludePrivatePackages --onlyAllow 'MIT;Apache-2.0;ISC;'",
    });

    this.addTask("dev", {
      exec: "GENERATE_SOURCEMAP=false npx nx run @aws/threat-composer-app:dev",
    });

    this.addTask("storybook", {
      exec: "GENERATE_SOURCEMAP=false npx nx run @aws/threat-composer:storybook",
    });

    this.addTask("ai:cli", {
      exec: "uv run --project packages/threat-composer-ai threat-composer-ai-cli",
      receiveArgs: true,
    });

    this.addTask("build:packs", {
      exec: "npx ts-node ./scripts/data/buildPacks.ts ThreatPack && npx ts-node ./scripts/data/buildPacks.ts MitigationPack",
    });

    this.addTask("build:schema", {
      exec: 'npx ts-node --compiler-options \'{"lib":["es2019","dom"]}\' ./scripts/generateSchema.ts',
    });

    this.buildTask.reset();
    this.buildTask.spawn(this.tasks.tryFind("build:packs")!);
    this.buildTask.exec(
      "yarn nx run-many --target=build --output-style=stream --nx-bail"
    );

    this.buildTask.spawn(this.tasks.tryFind("build:schema")!);

    this.compileTask.reset(
      "npx nx run-many --target=build --all --skip-nx-cache --nx-bail"
    );

    this.postCompileTask.reset(
      "yarn run generate:attribution && yarn run license:checker"
    );
  }
}

export default ThreatComposerMonorepoProject;
