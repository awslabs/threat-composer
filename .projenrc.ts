import ThreatComposerReactAppProject from "./projenrc/app";
import ThreatComposerBrowserExtensionProject from "./projenrc/browser-extension";
import ThreatComposerInfraProject from "./projenrc/infra";
import ThreatComposerMonorepoProject from "./projenrc/monorepo";
import ThreatComposerUIComponentsProject from "./projenrc/ui-components";

const monorepo = new ThreatComposerMonorepoProject();
const uiProject = new ThreatComposerUIComponentsProject(monorepo);
const appProject = new ThreatComposerReactAppProject(monorepo, uiProject);
const infraProject = new ThreatComposerInfraProject(monorepo);
const browserExtensionProject = new ThreatComposerBrowserExtensionProject(
  monorepo
);

monorepo.addImplicitDependency(appProject, uiProject);
monorepo.addImplicitDependency(infraProject, appProject);
monorepo.addImplicitDependency(browserExtensionProject, appProject);

monorepo.package.addPackageResolutions(...[
  "**/@typescript-eslint/eslint-plugin@6.21.0",
  "**/@typescript-eslint/parser@5.49.0"
],
);

monorepo.synth();
