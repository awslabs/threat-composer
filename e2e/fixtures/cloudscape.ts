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

import { createRequire } from 'node:module';

/**
 * Cloudscape's OFFICIAL test-selectors API, for the few places the suite has to
 * target Cloudscape internals. Everything else uses roles, labels and text.
 *
 * Why go through the API rather than hand-writing class patterns: Cloudscape's
 * class names are hashed (`awsui_root_14iqq_fl8v6_189`). That hash is baked into
 * the PUBLISHED package — it is a literal string in
 * `@cloudscape-design/components/container/styles.css.js` — so it does not change
 * when we rebuild, and is unaffected by Vite vs webpack or dev vs production. It
 * changes only on dependency upgrade. Reading the names from the installed package
 * at test time means an upgrade updates these selectors automatically, instead of
 * silently breaking a hard-coded `[class*="awsui_root_"]` guess.
 *
 * Preference order when writing a selector:
 *   1. Role / label / text (`getByRole`, `getByLabel`, `getByPlaceholder`)
 *   2. Repo-owned hooks (`#WorkspacesSelect`, `#root`, `.tooltipText`)
 *   3. These Cloudscape selectors
 *   4. Nothing else.
 *
 * Only selectors the suite actually uses are exported — an unused selector is an
 * untested claim about Cloudscape's DOM.
 *
 * KNOWN TRAP, do not reintroduce: `findEnteredTextOption()` looks like the right
 * way to target an Autosuggest's `Use: "…"` / `Add new …: "…"` entry, but in
 * selectors mode it resolves to `has-background` — a class EVERY highlighted item
 * carries — so it matches the wrong element as soon as anything is highlighted.
 * Conversely `findOptions()` matches only entries carrying `data-test-index`, which
 * excludes the entered-text entry entirely. Assert on the option's visible label
 * instead (see createViaAutosuggest in ./app.ts).
 */

/**
 * `test-utils/selectors` is published as CommonJS with `module.exports.default`.
 * A plain ESM `import` yields the namespace object rather than the factory
 * ("createWrapper is not a function"), so it is loaded through createRequire,
 * which resolves the interop unambiguously.
 *
 * `@cloudscape-design/components` is declared in this package's own
 * devDependencies even though only the selectors helper is used. It has to be:
 * `e2e` is a standalone npm project rather than a workspace member, so it
 * cannot rely on the monorepo hoisting the copy packages/threat-composer
 * depends on -- and pnpm does not hoist at all. The version is kept in step
 * with that package deliberately, because these selectors encode Cloudscape's
 * internal class names and a mismatch would produce selectors that silently
 * match nothing.
 */
const require = createRequire(import.meta.url);
const createWrapper = require('@cloudscape-design/components/test-utils/selectors')
  .default as () => any;

/**
 * Cloudscape returns selectors rooted at `body`, which breaks composition: a
 * scoped `card.locator('body [class*=…]')` looks for a `body` INSIDE the card and
 * matches nothing. Stripping the prefix makes each selector usable both standalone
 * and chained inside another locator.
 */
const scopable = (selector: string): string => selector.replace(/^body\s+/, '');

const wrapper = createWrapper();

export const cs = {
  /**
   * Root of a Cloudscape Container. Every entity card (threat, assumption,
   * mitigation) is a Container, as is the filter panel above the cards, so this
   * must always be narrowed — usually with `.filter({ has: heading })`.
   */
  container: scopable(wrapper.findContainer().toSelector()),

  /** Root of a Select, used by the selector-contract canary. */
  select: scopable(wrapper.findSelect().toSelector()),
  /** Root of a Multiselect, used by the selector-contract canary. */
  multiselect: scopable(wrapper.findMultiselect().toSelector()),

  /**
   * Real options in an open Autosuggest dropdown. Excludes the entered-text
   * entry, which is exactly what makes it safe to filter by text without
   * accidentally matching `Use: "<typed>"`.
   */
  autosuggestOptions: scopable(wrapper.findAutosuggest().findDropdown().findOptions().toSelector()),

  /**
   * Selection control for a specific table BODY row, 1-indexed. Using this avoids
   * needing to know that the first checkbox on the page is "select all".
   */
  tableRowSelection: (rowIndex: number) =>
    scopable(wrapper.findTable().findRowSelectionArea(rowIndex).toSelector()),
  /** Rows currently selected. */
  tableSelectedRows: scopable(wrapper.findTable().findSelectedRows().toSelector()),

  /** Root of a Modal, for scoping assertions to a dialog. */
  modal: scopable(wrapper.findModal().toSelector()),
  /** Root of a Toggle, used by the theme switch which has no accessible name. */
  toggle: scopable(wrapper.findToggle().toSelector()),
} as const;
