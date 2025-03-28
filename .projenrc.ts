import ThreatComposerReactAppProject from "./projenrc/app";
import ThreatComposerBrowserExtensionProject from "./projenrc/browser-extension";
import ThreatComposerCoreProject from "./projenrc/core";
import ThreatComposerInfraProject from "./projenrc/infra";
import ThreatComposerMonorepoProject from "./projenrc/monorepo";
import ThreatComposerUIComponentsProject from "./projenrc/ui-components";

const monorepo = new ThreatComposerMonorepoProject();
const coreProject = new ThreatComposerCoreProject(monorepo);
const uiProject = new ThreatComposerUIComponentsProject(monorepo);
const appProject = new ThreatComposerReactAppProject(monorepo, uiProject);
const infraProject = new ThreatComposerInfraProject(monorepo);
const browserExtensionProject = new ThreatComposerBrowserExtensionProject(
  monorepo
);

monorepo.addImplicitDependency(uiProject, coreProject);
monorepo.addImplicitDependency(appProject, uiProject);
monorepo.addImplicitDependency(infraProject, appProject);
monorepo.addImplicitDependency(browserExtensionProject, appProject);

monorepo.synth();
