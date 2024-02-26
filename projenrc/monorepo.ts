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
      ],
    });

    this.tryFindObjectFile("package.json")?.addOverride("resolutions.@types/react", "^18.0.27");
    this.tryFindObjectFile("package.json")?.addOverride("resolutions.react", "^18.2.0");
    this.tryFindObjectFile("package.json")?.addOverride("resolutions.nth-check", "^2.1.1");
    this.tryFindObjectFile("package.json")?.addOverride("resolutions.yaml", "^2.2.2");
    this.tryFindObjectFile("package.json")?.addOverride("resolutions.js-yaml", "^3.13.1");
    this.tryFindObjectFile("package.json")?.addOverride("resolutions.semver", "^7.5.3");
    this.tryFindObjectFile("package.json")?.addOverride("resolutions.@babel/traverse", "^7.23.2");
    this.tryFindObjectFile("package.json")?.addOverride("resolutions.postcss", "^8.4.31");
    this.tryFindObjectFile("package.json")
      ?.addOverride("workspaces.nohoist", ["**/wxt"]);
    this.addGitIgnore('.temp/');
    this.addGitIgnore('oss-attribution/');
    this.addGitIgnore('storybook.out/');
    this.addGitIgnore(".DS_Store");
    this.addGitIgnore(".output/");

    this.addTask('export:examples', {
      steps: [
        {
          "spawn": "build"
        },
        {
          "exec": 'node ./scripts/exportExamples.js',
        }
      ]
    });

    this.addTask('prepare', {
      steps: [
        {
          "exec": 'husky install',
        }
      ]
    });

    this.addTask('generate:attribution', {
      exec: 'git secrets --scan && generate-attribution && mv oss-attribution/attribution.txt LICENSE-THIRD-PARTY'
    });

    this.addTask('license:checker', {
      exec: "yarn license-checker --summary --production --excludePrivatePackages --onlyAllow 'MIT;Apache-2.0;ISC;'"
    });

    this.addTask('dev', {
      exec: 'GENERATE_SOURCEMAP=false npx nx run @aws/threat-composer-app:dev'
    });

    this.addTask('storybook', {
      exec: 'GENERATE_SOURCEMAP=false npx nx run @aws/threat-composer:storybook'
    });

    this.compileTask.reset('npx nx run-many --target=build --all --skip-nx-cache --nx-bail');
    this.postCompileTask.reset('yarn run generate:attribution && yarn run license:checker');

  }
}

export default ThreatComposerMonorepoProject;