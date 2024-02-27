import ThreatComposerMonorepoProject from "./projenrc/monorepo";
import ThreatComposerUIComponentsProject from "./projenrc/ui-components";
import ThreatComposerReactAppProject from "./projenrc/app";
import ThreatComposerInfraProject from "./projenrc/infra";
import ThreatComposerBrowserExtensionProject from './projenrc/browser-extension';

const monorepo = new ThreatComposerMonorepoProject();
const uiProject = new ThreatComposerUIComponentsProject(monorepo);
const appProject = new ThreatComposerReactAppProject(monorepo, uiProject);
const infraProject = new ThreatComposerInfraProject(monorepo);
const browserExtensionProject = new ThreatComposerBrowserExtensionProject(monorepo);

monorepo.addImplicitDependency(appProject, uiProject);
monorepo.addImplicitDependency(infraProject, appProject);
monorepo.addImplicitDependency(browserExtensionProject, appProject);

monorepo.synth();
