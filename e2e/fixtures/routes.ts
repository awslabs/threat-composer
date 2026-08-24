/* ********************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 ******************************************************************************************************************** */


/**
 * Every lazy (React.lazy) route, with a route-SPECIFIC assertion for each one.
 *
 * Chunking moved from craco's forced splitChunks to Rollup's, so a bad chunk can
 * blank a route with no build error. An earlier version of this suite only
 * checked "app shell mounted + <main> not empty" for most routes, which the
 * shared shell satisfies on its own — so those tests could not distinguish a
 * rendered route from a broken one. Every route now asserts a heading that only
 * that route renders, plus (where one exists) a control unique to the page.
 */
export const DEFAULT_WORKSPACE = 'default';

export interface WorkspaceRoute {
  /** Path segment under /workspaces/:workspaceId/ */
  path: string;
  /** Side-navigation link text, where the route has one. */
  navLink?: string;
  /**
   * A heading only this route renders. Regex because Cloudscape headings carry
   * counters ("Threats (0)") and ContentLayout appends "| <app name>" once an
   * application name is set.
   *
   * Must be unique to the route. Do NOT fall back to the TopNavigation title
   * ("threat-composer") to fill this in: it appears on every page, so a test
   * anchored on it would pass even for a completely broken route.
   */
  heading?: RegExp;
  /**
   * Route-specific body text, for pages that render no heading of their own.
   * At least one of `heading` or `text` must be set.
   */
  text?: RegExp;
  /** Accessible name of a control unique to this page, if there is one. */
  control?: string;
}

/**
 * Assertions below describe an EMPTY workspace, which is the first-run state
 * every route spec starts from. Notably `dashboard` renders the LandingPage
 * rather than the Insights dashboard until the workspace has content.
 */
export const WORKSPACE_ROUTES: WorkspaceRoute[] = [
  {
    path: 'dashboard',
    navLink: 'Dashboard',
    heading: /^View an example threat model$/,
    control: 'Define workload or feature',
  },
  {
    path: 'application',
    navLink: 'Application info',
    heading: /^Application information$/,
    // Empty workspace opens straight into edit mode.
    control: 'Confirm',
  },
  {
    path: 'architecture',
    navLink: 'Architecture',
    heading: /^Architecture Diagram$/,
    control: 'Confirm',
  },
  {
    path: 'dataflow',
    navLink: 'Dataflow',
    heading: /^Dataflow Diagram$/,
    control: 'Confirm',
  },
  {
    path: 'assumptions',
    navLink: 'Assumptions',
    heading: /^Assumptions \(\d+\)/,
    control: 'Add new assumption',
  },
  {
    path: 'threats',
    navLink: 'Threats',
    heading: /^Threats \(\d+\)/,
    control: 'Add new threat',
  },
  {
    path: 'mitigations',
    navLink: 'Mitigations',
    heading: /^Mitigations \(\d+\)/,
    control: 'Add new mitigation',
  },
  {
    path: 'threatModel',
    navLink: 'Threat model',
    // The report page header renders no title of its own, and its "Threats"
    // table heading only appears once the workspace has data. On an empty
    // workspace the body shows the outstanding-work prompt, which IS specific to
    // this route.
    text: /Suggested next steps:/,
    control: 'Copy as Markdown',
  },
  {
    path: 'brainstorm',
    navLink: 'Brainstorming',
    heading: /^Brainstorm$/,
    control: 'Architecture Diagram',
  },
  {
    path: 'threatPacks',
    navLink: 'Threat packs',
    heading: /^Threat Packs \(\d+\)/,
  },
  {
    path: 'mitigationPacks',
    navLink: 'Mitigation packs',
    heading: /^Mitigation Packs \(\d+\)/,
  },
];

/**
 * Parameterised routes. Previously uncovered entirely: the fixture claimed they
 * were "exercised separately where a real id can be obtained", but nothing did.
 *
 * `GenAIChatBot` is the only reference pack that exists (note the capital B —
 * the source file is GenAIChatbot.json but the pack's `id` field differs).
 * A threat id is a UUID, so it can only be obtained at runtime by creating or
 * importing a threat and reading the URL.
 */
export const PACK_ID = 'GenAIChatBot';

export const PARAMETERISED_ROUTES = [
  {
    path: `threatPacks/${PACK_ID}`,
    heading: /^Threat Pack - GenAI ChatBot Threat Pack$/,
    control: 'Add to workspace',
  },
  {
    path: `mitigationPacks/${PACK_ID}`,
    heading: /^Mitigation Pack - GenAI ChatBot Mitigation Pack$/,
    control: 'Add to workspace',
  },
];

/* `workspacePath` deliberately lives in ./app.ts as the single definition. */
