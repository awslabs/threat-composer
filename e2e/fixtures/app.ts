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

import { expect, type Locator, type Page } from '@playwright/test';
import { cs } from './cloudscape';
import { DEFAULT_WORKSPACE } from './routes';
import {
  CARD,
  byTooltip,
  confirmDeleteButton,
  entityCard,
  grammarToken,
  threatSaveButton,
  workspaceMoreActions,
  workspaceSelect,
} from './selectors';

/**
 * Task-level helpers, written the way a user works rather than the way the DOM
 * is shaped. Specs read as behaviour; the awkward DOM details stay in
 * ./selectors.ts.
 *
 * All helpers assert as they go, so a broken step fails at the step that broke
 * rather than three actions later with a confusing message.
 */

/** Distinct workspace name per test. Deliberately space-free: a space would be
 * percent-encoded into every subsequent URL and make path assertions noisy. */
export const uniqueWorkspaceName = (prefix = 'E2E'): string =>
  `${prefix}${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 100)}`;

/**
 * Build a workspace-relative path. Argument order is (segment, workspace) to
 * match the common case of the default workspace; there is deliberately only ONE
 * such helper in the suite, because an earlier duplicate with the arguments
 * reversed silently produced `/workspaces/threatPacks%2F.../<name>` URLs.
 */
export const workspacePath = (segment: string, workspace = DEFAULT_WORKSPACE): string =>
  `/workspaces/${workspace}/${segment}`;

/**
 * Wait until the app shell has mounted. The Cloudscape side navigation is the
 * reliable signal that the AppRoot -> WorkspaceRoot -> AppLayout lazy chunks all
 * loaded and rendered, so a route whose chunk failed fails fast here rather than
 * passing on a blank page.
 */
export async function waitForAppShell(page: Page): Promise<void> {
  await expect(
    page.getByRole('navigation').getByText('Dashboard', { exact: true }).first(),
  ).toBeVisible();
}

/**
 * Assert the app landed on the default workspace dashboard after the initial
 * redirect chain ( / -> /workspaces/default -> /workspaces/default/dashboard ).
 *
 * An EMPTY workspace (the first-run state) renders the LandingPage rather than
 * the Insights dashboard — WorkspaceHome only shows insights once the workspace
 * has content — so this asserts the URL and the shell, not dashboard content.
 */
export async function expectOnDashboard(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/workspaces\/[^/]+\/dashboard/);
  await waitForAppShell(page);
}

export async function gotoWorkspace(page: Page, workspaceId: string, segment: string): Promise<void> {
  await page.goto(workspacePath(segment, workspaceId));
  await waitForAppShell(page);
}

/**
 * Navigate via the side navigation, the way a user would.
 *
 * This waits for the URL to actually reach the clicked link's target. That matters:
 * `waitForAppShell` only asserts the navigation's own "Dashboard" entry is visible,
 * and that is present on EVERY page, so on its own it is not a signal that the
 * destination rendered at all. Callers were therefore free to start interacting
 * while the PREVIOUS page's content was still mounted.
 *
 * That was a latent race, not a theoretical one. `fillDiagramInfo` on the
 * Architecture page would pick up the Application-info page's "Edit" button, click
 * it as it was being unmounted, and hang until the test timed out. It survived the
 * old dependency set purely on render timing and started failing the journey spec
 * under React 19.
 *
 * The link's own href is used as the expected destination rather than a hand-kept
 * name-to-route table, so this cannot drift out of sync with the nav.
 */
export async function navigateVia(page: Page, linkName: string): Promise<void> {
  const link = page.getByRole('navigation').getByRole('link', { name: linkName, exact: true });
  const href = await link.getAttribute('href');

  await link.click();
  await waitForAppShell(page);

  // "Reference packs" is an expandable group with href="#", not a destination.
  if (href && href !== '#') {
    const target = href.replace(/^\/+/, '');
    await page.waitForURL((url) => url.pathname.replace(/\/+$/, '').endsWith(target));
  }
}

// ---------------------------------------------------------------- workspaces

/**
 * Create a workspace through the UI and return its id (the name, which is what
 * the router uses). Also asserts the 3-character minimum on the way through.
 */
export async function createWorkspace(page: Page, name: string): Promise<string> {
  await workspaceMoreActions(page).click();
  await page.getByRole('menuitem', { name: 'Add new workspace' }).click();

  const nameField = page.getByLabel('New workspace name');
  await expect(nameField).toBeVisible();

  const addButton = page.getByRole('button', { name: 'Add', exact: true });
  await expect(addButton, 'Add should be disabled before a name is typed').toBeDisabled();
  await nameField.fill('ab');
  await expect(addButton, 'Add should stay disabled below the 3-character minimum').toBeDisabled();

  await nameField.fill(name);
  await expect(addButton).toBeEnabled();
  await addButton.click();

  await expect(page).toHaveURL(new RegExp(`/workspaces/${name}/`));
  await expect(workspaceSelect(page)).toContainText(`Workspace: ${name}`);
  return name;
}

/**
 * A workspace option in the switcher.
 *
 * Not `exact`: Cloudscape appends the option-group label to the *selected*
 * option's text, so the currently-active workspace renders as
 * "MyWorkspace\nWorkspaces MyWorkspace" while every other option is just the
 * name. An exact match therefore finds every workspace except the current one.
 */
export const workspaceOption = (page: Page, name: string): Locator =>
  page.getByRole('option', { name }).first();

export async function switchWorkspace(page: Page, name: string): Promise<void> {
  await workspaceSelect(page).click();
  await workspaceOption(page, name).click();
  await expect(workspaceSelect(page)).toContainText(`Workspace: ${name}`);
}

export async function currentWorkspaceLabel(page: Page): Promise<string> {
  return (await workspaceSelect(page).innerText()).trim();
}

/** Open a workspace-level "More actions" item. */
export async function workspaceAction(page: Page, item: string): Promise<void> {
  await workspaceMoreActions(page).click();
  await page.getByRole('menuitem', { name: item }).click();
}

// ------------------------------------------------------- application details

/**
 * Put an Application-info / Architecture / Dataflow section into edit mode.
 *
 * These sections render in one of two states depending on whether they already
 * hold content: populated shows a single "Edit" button, empty drops straight into
 * the editor with "Cancel" / "Confirm".
 *
 * This deliberately does NOT sample `editButton.isVisible()` and branch on the
 * result. That was the previous implementation and it is a race: `isVisible()` is a
 * point-in-time read with no auto-waiting, so on a freshly created workspace it
 * could catch "Edit" during the render that then swapped it for the editor, and the
 * subsequent click would hang forever on a button that had already gone. It
 * happened to work under the old dependency set and started failing the journey
 * spec on React 19 purely because the render ordering shifted.
 *
 * Instead: wait until the section has settled into EITHER state, then act. The
 * post-condition is the same in both cases -- we are in edit mode with a Confirm
 * button available.
 */
export async function enterEditMode(page: Page): Promise<void> {
  const editButton = page.getByRole('button', { name: 'Edit', exact: true });
  const confirmButton = page.getByRole('button', { name: 'Confirm' });

  // `toPass` rather than a read-then-act sequence. Any variant of
  // "is Edit visible? then click it" is racy here, because during a route change the
  // outgoing page's Edit button can still be mounted when the check runs and gone by
  // the time the click lands — the click then blocks until the test times out.
  // Retrying the whole decision, with short per-attempt timeouts, converges on
  // whichever state the section actually settles into.
  await expect(async () => {
    if (await confirmButton.isVisible()) {
      // Empty sections mount straight into the editor.
      return;
    }

    await editButton.click({ timeout: 2_000 });
    await expect(confirmButton).toBeVisible({ timeout: 2_000 });
  }, 'the section should end up in edit mode').toPass({ timeout: 30_000 });
}

export async function fillApplicationInfo(
  page: Page,
  { name, description }: { name: string; description: string },
): Promise<void> {
  await enterEditMode(page);
  await expectSingleMarkdownEditor(page);

  await page.getByPlaceholder('Enter application name').fill(name);
  await typeIntoMarkdownEditor(page, description);
  await page.getByRole('button', { name: 'Confirm' }).click();

  // Save is explicit, so returning to view mode is the signal it committed.
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
}

/**
 * The markdown editor is MDXEditor: a contenteditable div, not a textarea. Its
 * Cloudscape FormField label ("Description" / "Introduction") is therefore not
 * a usable typing target, so we click the editable region and type.
 */
export async function typeIntoMarkdownEditor(page: Page, text: string, index = 0): Promise<void> {
  const editable = page.locator('[contenteditable="true"]').nth(index);
  await expect(editable).toBeVisible();

  // MDXEditor is Lexical-backed and SILENTLY DROPS keystrokes sent before its editor
  // state has finished initialising. The element is visible, and it even reports
  // focused, while still swallowing input — so neither a visibility nor a
  // `toBeFocused` wait is sufficient, and nor is `data-lexical-editor="true"`, which
  // is already set on the element while input is still being discarded.
  //
  // The signature is always a lost LEADING prefix, and the amount lost scales with
  // machine load: "API Gateway fronts a Lambda authoriser…" has arrived as
  // "ay fronts a Lambda authoriser…", "ts a Lambda authoriser…" and
  // "a authoriser…" on different runs. That is an editor becoming ready partway
  // through the typing, not keystrokes being dropped at random.
  await editable.click();
  await expect(editable, 'the markdown editor should take focus before typing').toBeFocused();

  // Both callers fill a freshly mounted, empty section. Asserted rather than assumed,
  // because the probe below clears the editor: if this helper is ever pointed at an
  // editor that already has content, fail here rather than silently discard it.
  await expect(editable, 'the markdown editor should be empty before typing').toHaveText(/^\s*$/);

  // Readiness probe. Since every proxy signal lies, the only trustworthy one is a
  // keystroke that demonstrably SURVIVES: send a single character, wait for it to
  // appear, then confirm it is still there a beat later.
  //
  // Persistence is the part that matters. Keystrokes sent before Lexical finishes
  // initialising do reach the DOM, but are then thrown away when Lexical applies its
  // initial (empty) editor state — which is exactly why the loss was always a leading
  // prefix. So "the character appeared" is not sufficient; "the character was not
  // subsequently wiped" is. If it does get wiped, this block throws and the retry
  // runs against an editor that has by then initialised.
  //
  // `toContainText` rather than an equality check because a probe from an earlier
  // attempt can arrive late, leaving more than one character behind; the select-all
  // clear that follows removes however many accumulated.
  const PROBE = 'x';
  await expect(
    async () => {
      await page.keyboard.type(PROBE);
      await expect(editable).toContainText(PROBE, { timeout: 500 });
      await page.waitForTimeout(150);
      // Short, bounded: this is a "still there?" check, not another wait for it to
      // arrive. (`timeout: 0` would mean wait indefinitely, which would hang here.)
      await expect(editable).toContainText(PROBE, { timeout: 500 });
    },
    'a keystroke should survive in the markdown editor, proving it has initialised',
  ).toPass({ timeout: 15_000 });

  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await expect(editable, 'the probe should be cleared before typing').toHaveText(/^\s*$/);

  await page.keyboard.type(text);

  // Note what is and is not retried. The probe above retries a single character, which
  // is a readiness wait. The payload is still typed exactly ONCE and verified once, so
  // a truncated write still fails the test loudly — that was the point of the previous
  // no-retry note, and it is preserved. Verifying here also pins the positional
  // `nth(index)` pick to the intended editor, which matters during a route change when
  // the outgoing page's editor can still be mounted.
  await expect(editable, 'the typed text should be in the editor at this index').toContainText(
    text,
  );
}

/**
 * Wait for a section that owns exactly one markdown editor to have settled.
 *
 * Application info, Architecture and Dataflow each render a single MDXEditor. Route
 * changes overlap, though: the URL updates and the new section mounts while the
 * previous one is still tearing down, so there can transiently be two editors on the
 * page. `typeIntoMarkdownEditor` picks by index, so it has to wait for the extra one
 * to go before choosing.
 */
async function expectSingleMarkdownEditor(page: Page): Promise<void> {
  await expect(
    page.locator('[contenteditable="true"]'),
    'expected exactly one markdown editor once the section settled',
  ).toHaveCount(1);
}

/** Architecture and Dataflow share one component (BaseDiagramInfo). */
export async function fillDiagramInfo(
  page: Page,
  { introduction, imageUrl }: { introduction: string; imageUrl?: string },
): Promise<void> {
  await enterEditMode(page);
  await expectSingleMarkdownEditor(page);

  await typeIntoMarkdownEditor(page, introduction);

  if (imageUrl) {
    // The upload/url controls are not in the DOM until the radio is switched
    // away from the default "No Image".
    await page.getByRole('radio', { name: 'From url' }).check();
    await page.getByLabel('Image Url').fill(imageUrl);
  }

  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
}

// -------------------------------------------------------------------- threats

export interface ThreatFields {
  threatSource?: string;
  prerequisites?: string;
  threatAction?: string;
  threatImpact?: string;
  impactedGoal?: string;
  impactedAssets?: string;
}

/**
 * Fill the guided threat-statement grammar. No field editor is mounted when the
 * page loads, so each field requires clicking its token in the statement strip
 * first — which is exactly the interaction the app is built around.
 *
 * Note the threat source should NOT include a leading article: the template
 * prepends "A"/"An", so "an insider" renders as "An an insider".
 */
export async function fillThreatStatement(page: Page, fields: ThreatFields): Promise<void> {
  if (fields.threatSource !== undefined) {
    await grammarToken(page, 'threat source').click();
    await page.getByPlaceholder('Enter threat source').fill(fields.threatSource);
  }
  if (fields.prerequisites !== undefined) {
    await grammarToken(page, 'prerequisites').click();
    await page.getByPlaceholder('Enter prerequisites').fill(fields.prerequisites);
  }
  if (fields.threatAction !== undefined) {
    await grammarToken(page, 'threat action').click();
    await page.getByPlaceholder('Enter threat action').fill(fields.threatAction);
  }
  if (fields.threatImpact !== undefined) {
    await grammarToken(page, 'threat impact').click();
    await page.getByPlaceholder('Enter threat impact').fill(fields.threatImpact);
  }
  if (fields.impactedGoal !== undefined) {
    // While empty the impacted-goal token is collapsed behind an expander, so
    // the visible handle is the "Impacted goal" label rather than a lowercase
    // grammar token. It also appears in the Metrics panel, hence .first().
    await page.getByRole('button', { name: 'Impacted goal', exact: true }).first().click();
    const goal = page.getByPlaceholder('Select an impacted goal or enter new one');
    await expect(goal).toBeVisible();
    await goal.fill(fields.impactedGoal);
    await page.keyboard.press('Enter');
  }
  if (fields.impactedAssets !== undefined) {
    await grammarToken(page, 'impacted assets').click();
    const asset = page.getByPlaceholder('Select an existing asset or enter new asset');
    await expect(asset).toBeVisible();
    await asset.fill(fields.impactedAssets);
    await page.keyboard.press('Enter');
  }
}

/** Expand a Cloudscape ExpandableSection only if it is currently collapsed. */
export async function expandSection(page: Page, name: string | RegExp): Promise<Locator> {
  const header = page.getByRole('button', { name }).first();
  await header.scrollIntoViewIfNeeded();
  if ((await header.getAttribute('aria-expanded')) === 'false') {
    await header.click();
  }
  await expect(header).toHaveAttribute('aria-expanded', 'true');
  return header;
}

/**
 * Set threat metadata. The Metadata section is collapsed on load and its
 * contents, while present in the DOM, are hidden — so it must be expanded
 * before the controls can be driven.
 */
export async function setThreatMetadata(
  page: Page,
  { priority, stride }: { priority?: 'High' | 'Medium' | 'Low'; stride?: string[] },
): Promise<void> {
  await expandSection(page, /^Metadata$/);

  if (priority) {
    await page.getByRole('button', { name: 'Select Priority' }).click();
    await page.getByRole('option', { name: priority, exact: true }).click();
  }

  if (stride?.length) {
    const strideControl = page.getByLabel('STRIDE').first();
    await strideControl.click();
    for (const value of stride) {
      await page.getByRole('option', { name: value, exact: true }).click();
    }
    await page.keyboard.press('Escape');
  }
}

/**
 * Type free text into an Autosuggest and commit it as a NEW entity.
 *
 * The link fields offer an entered-text entry (`Add new mitigation: "…"`,
 * `Use: "…"`) which Cloudscape keeps highlighted while the dropdown is open — so
 * Enter is exactly the right gesture here, and no clicking is involved.
 *
 * Cloudscape's `findEnteredTextOption()` identifies that entry precisely, so the
 * test asserts the app actually offered creation before committing, rather than
 * hoping Enter did the right thing.
 */
export async function createViaAutosuggest(
  page: Page,
  input: Locator,
  text: string,
  offerPattern: RegExp = /Add new|Use:/,
): Promise<void> {
  await input.click();
  await input.fill(text);

  // Assert the app actually offered to create, by the option's visible label.
  //
  // Two Cloudscape selectors are deliberately NOT used here:
  //  - `findEnteredTextOption()` resolves to `has-background` in selectors mode,
  //    a class every highlighted item carries, so it matches the wrong element.
  //  - `findOptions()` matches only entries carrying `data-test-index`, and the
  //    entered-text entry has none — so it is excluded by design.
  // The visible label is both simpler and independent of Cloudscape internals.
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(
    page.getByText(new RegExp(`(${offerPattern.source}).*${escaped}`)).first(),
    `expected the autosuggest to offer creating "${text}"`,
  ).toBeVisible();

  await input.press('Enter');
}

/**
 * Pick an EXISTING option from an Autosuggest.
 *
 * Enter cannot be used for this: Cloudscape keeps the entered-text entry
 * (`Use: "<typed>"`) at the top of the highlight order, so a bare Enter commits
 * the typed string. On the "Search threat" field that resolves against nothing and
 * silently creates no link — a false pass, which is exactly the bug this helper
 * exists to avoid.
 *
 * So the intended option is targeted directly, via Cloudscape's official
 * `findOptions()` selector. Earlier revisions needed a retry loop and a forced
 * click because the dropdown moved while the surrounding card list reflowed;
 * suppressing animations (see the `stillPage` fixture) removed that movement, so a
 * plain click is now sufficient.
 */
export async function chooseExistingFromAutosuggest(
  page: Page,
  input: Locator,
  text: string,
  optionPattern: RegExp,
): Promise<void> {
  await input.click();
  await input.fill(text);

  // `findOptions()` gives the real options only (they carry `data-test-index`);
  // the entered-text entry is excluded, so filtering here cannot accidentally
  // match `Use: "<typed>"`.
  const option = page.locator(cs.autosuggestOptions).filter({ hasText: optionPattern }).first();
  await expect(option, `expected an autosuggest option matching ${optionPattern}`).toBeVisible();
  await option.click();
}


/** Link a mitigation from inside the threat editor, creating it if new. */
export async function linkMitigationFromEditor(page: Page, content: string): Promise<void> {
  await expandSection(page, /^Linked mitigations \(\d+\)$/);
  const search = page.getByPlaceholder('Search mitigation');
  await createViaAutosuggest(page, search, content);
}

/** Link an assumption from inside the threat editor, creating it if new. */
export async function linkAssumptionFromEditor(page: Page, content: string): Promise<void> {
  await expandSection(page, /^Linked assumptions \(\d+\)$/);
  const search = page.getByPlaceholder('Search assumption');
  await createViaAutosuggest(page, search, content);
}

/** Save a brand-new threat and land back on the list. */
export async function saveNewThreat(page: Page): Promise<void> {
  const save = threatSaveButton(page, 'new');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page).toHaveURL(/\/threats$/);
}

/** Create a threat end to end from the threats list. */
export async function addThreat(page: Page, fields: ThreatFields): Promise<void> {
  await page.getByRole('button', { name: 'Add new threat' }).click();
  await expect(page).toHaveURL(/\/threats\/new$/);
  await expect(threatSaveButton(page, 'new'), 'save is disabled until a field is filled').toBeDisabled();
  await fillThreatStatement(page, fields);
  await saveNewThreat(page);
}

// ------------------------------------------------- assumptions & mitigations

type SimpleEntity = 'assumption' | 'mitigation';

/**
 * Add an assumption or mitigation. The primary button does not open a modal — it
 * scrolls to and focuses a persistent creation card pinned below the list. That
 * card's textarea has no label and no placeholder, so it is reached positionally
 * within the card.
 */
export async function addSimpleEntity(page: Page, kind: SimpleEntity, content: string): Promise<void> {
  const label = `Add new ${kind}`;
  const Kind = kind === 'assumption' ? 'Assumption' : 'Mitigation';
  await page.getByRole('button', { name: label }).click();

  const creationCard = page
    .locator(CARD)
    .filter({ has: page.getByRole('heading', { name: label }) })
    .first();

  // The field is visually unlabelled, so it is reached by the accessible name
  // added for it in the library rather than by position within the card.
  const textarea = creationCard.getByLabel(`${Kind} content`, { exact: true });
  await expect(textarea).toBeVisible();

  // Wait for focus to actually arrive before typing. The button's job is to scroll
  // to and focus this field, but it does so via a 300ms setTimeout
  // (GenericEntityCreationCard.focusTextarea). If we race past it, that pending
  // focus fires later and steals focus from whatever the test has moved on to —
  // which showed up as an autosuggest dropdown closing mid-interaction. Asserting
  // it here drains the timer and also verifies the button's documented behaviour.
  await expect(textarea, 'the add button should focus the content field').toBeFocused();

  await textarea.fill(content);

  const save = creationCard.getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText(content).first()).toBeVisible();
}

/**
 * Edit a saved card's content in place.
 *
 * Waits for the card to leave edit mode before returning. Without that, callers
 * race the re-render: while the textarea is still mounted its previous content is
 * present in the DOM, so an assertion that the old text is gone fails
 * intermittently.
 */
export async function editEntityCard(
  page: Page,
  kind: 'Threat' | 'Assumption' | 'Mitigation',
  numericId: number,
  newContent: string,
): Promise<void> {
  const card = entityCard(page, kind, numericId);
  await byTooltip(card, 'Edit').first().click();

  // Reached by accessible name, not position. Threats have no in-card editor, so
  // only assumptions and mitigations get here.
  const textarea = card.getByLabel(`${kind} content`, { exact: true });
  await expect(textarea).toBeVisible();
  await textarea.fill(newContent);
  await card.getByRole('button', { name: 'Save', exact: true }).click();

  // Edit mode is over once the editor is gone; only then is the card showing
  // rendered content rather than an input.
  await expect(textarea).toHaveCount(0);
  await expect(card).toContainText(newContent);
}

/** Remove a saved card, going through its confirmation dialog. */
export async function removeEntityCard(
  page: Page,
  kind: 'Threat' | 'Assumption' | 'Mitigation',
  numericId: number,
): Promise<void> {
  const card = entityCard(page, kind, numericId);
  await byTooltip(card, 'Remove From Workspace').first().click();
  await expect(page.getByRole('heading', { name: `Remove ${kind} ${numericId}?` }).first()).toBeVisible();
  await confirmDeleteButton(page).click();
  await expect(
    page.getByRole('heading', { name: new RegExp(`^${kind} ${numericId}\\b`) }),
  ).toHaveCount(0);
}

// ---------------------------------------------------------------------- packs

/**
 * Add the first `rowCount` rows from a reference pack to the current workspace.
 *
 * `rowCount` must not exceed the table's PAGE SIZE. Pack tables paginate at 10
 * (the GenAI ChatBot threat pack has 37 threats shown 10 at a time behind a "next
 * page" button — the table is paginated, not virtualised, so scrolling does not
 * reveal more). Asking for row 11+ used to fail as a bare 60s `locator.check`
 * timeout with no hint as to why, which reads as flakiness rather than as the
 * caller error it is. The explicit row-count check below turns it into a
 * diagnosable failure. Selecting across pages would need paging support here.
 */
export async function addPackRowsToWorkspace(page: Page, rowCount: number): Promise<void> {
  const addButton = page.getByRole('button', { name: 'Add to workspace' });
  await expect(addButton, 'disabled with an empty selection').toBeDisabled();

  // Wait for the table body to populate before indexing into it, and confirm the
  // requested rows are actually on this page.
  const bodyRows = page.locator('table tbody tr');
  await expect(bodyRows.first()).toBeVisible();
  const available = await bodyRows.count();
  expect(
    available,
    `addPackRowsToWorkspace(${rowCount}) but only ${available} rows are on this page ` +
      '(pack tables paginate at 10); select fewer rows or add pagination support',
  ).toBeGreaterThanOrEqual(rowCount);

  // Cloudscape's per-row selection selector is 1-indexed by BODY row, so there is
  // no need to know that the first checkbox on the page is "select all".
  for (let row = 1; row <= rowCount; row++) {
    await page.locator(cs.tableRowSelection(row)).locator('input[type="checkbox"]').check();
  }

  await expect(addButton).toBeEnabled();
  await addButton.click();
}

// ----------------------------------------------------------------- brainstorm

/** Capture a brainstorm idea. The input commits on Enter; there is no button. */
export async function addBrainstormItem(page: Page, placeholder: string, content: string): Promise<void> {
  const input = page.getByPlaceholder(placeholder);
  await expect(input).toBeVisible();
  await input.fill(content);
  await page.keyboard.press('Enter');
  await expect(page.getByText(content).first()).toBeVisible();
}

/**
 * Brainstorm item actions only render while the card is hovered
 * (`itemShowButtons` is driven by onMouseEnter), so hovering is a required part
 * of the interaction rather than an optimisation.
 */
export async function brainstormItemAction(page: Page, content: string, action: string): Promise<void> {
  await page.getByText(content).first().hover();
  const button = page.getByRole('button', { name: action, exact: true });
  await expect(button.first()).toBeVisible();
  await button.first().click();
}

// -------------------------------------------------------------------- reports

/** Trigger a report download and return the Playwright Download. */
export async function downloadFromReport(page: Page, item: string) {
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: item }).click();
  return download;
}

// --------------------------------------------------------------- status

/**
 * Change an entity's status from the badge on its card.
 *
 * The badge is a bare `<button>` showing the current status; clicking it swaps in
 * a Cloudscape Select and focuses it after a 200ms timeout, and the Select closes
 * again on blur. Two details matter:
 *
 *  - The card already contains hidden Selects (status and priority live in the
 *    collapsed Metadata section), so the editor must be picked with `:visible`.
 *  - Status options render their description alongside the label, so the
 *    accessible name is "Resolved\nAll agreed risk response actions…". An exact
 *    name match silently matches nothing — hence the `^`-anchored regex.
 */
export async function openStatusEditor(
  page: Page,
  kind: 'Threat' | 'Assumption' | 'Mitigation',
  numericId: number,
  currentStatus: string,
): Promise<void> {
  const card = entityCard(page, kind, numericId);
  await card.getByRole('button', { name: currentStatus, exact: true }).click();

  const editor = card.locator(`${cs.select}:visible`).first();
  await expect(editor, 'clicking the status badge should reveal a status select').toBeVisible();

  // The badge focuses the Select via `setTimeout(..., 200)`, and the Select
  // collapses again on blur. Opening it before that focus lands means the
  // late-arriving focus can close the dropdown again — so wait for the focus
  // rather than racing it.
  const trigger = editor.locator('button').first();
  await expect(trigger, 'the status select should receive focus from the badge').toBeFocused();
  await trigger.click();
}

export async function setStatusFromBadge(
  page: Page,
  kind: 'Threat' | 'Assumption' | 'Mitigation',
  numericId: number,
  currentStatus: string,
  newStatus: string,
): Promise<void> {
  await openStatusEditor(page, kind, numericId, currentStatus);
  await page.getByRole('option', { name: new RegExp(`^${newStatus}`) }).click();
  await expect(
    entityCard(page, kind, numericId).getByRole('button', { name: newStatus, exact: true }),
  ).toBeVisible();
}

// ----------------------------------------------------------------- tags

/** Add a tag to an entity card. The input commits on Enter; there is no button. */
export async function addTag(card: Locator, tag: string): Promise<void> {
  const input = card.getByPlaceholder('Add tag');
  await expect(input).toBeVisible();
  await input.fill(tag);
  await input.press('Enter');
  await expect(card.getByRole('button', { name: `Remove ${tag}` })).toBeVisible();
}

/** Remove a tag via its TokenGroup dismiss control. */
export async function removeTag(card: Locator, tag: string): Promise<void> {
  await card.getByRole('button', { name: `Remove ${tag}` }).click();
  await expect(card.getByRole('button', { name: `Remove ${tag}` })).toHaveCount(0);
}

// -------------------------------------------------------------- filters

/**
 * Apply a value in one of the list's Multiselect filters.
 *
 * Options here also carry descriptions (status especially), so `optionPattern`
 * should be `^`-anchored rather than an exact string.
 */
export async function applyFilter(
  page: Page,
  placeholder: string,
  optionPattern: RegExp,
): Promise<void> {
  await page.getByRole('button', { name: placeholder }).click();
  await page.getByRole('option', { name: optionPattern }).click();
  // Multiselects stay open for further choices; close so the list is unobstructed.
  await page.keyboard.press('Escape');
}

export async function clearFilters(page: Page): Promise<void> {
  const clear = page.getByRole('button', { name: 'Clear filters' });
  await expect(clear).toBeEnabled();
  await clear.click();
  await expect(clear).toBeDisabled();
}

/** Set the threats list sort field and/or direction. */
export async function setSortBy(
  page: Page,
  { field, direction }: { field?: 'Id' | 'Priority'; direction?: 'Ascending' | 'Descending' },
): Promise<void> {
  if (field) {
    await page.getByLabel('Sort by').click();
    await page.getByRole('option', { name: new RegExp(`^${field}`) }).click();
  }
  if (direction) {
    await page.getByRole('radio', { name: direction }).check();
  }
}

/** Titles of the threat cards, in the order they are rendered. */
export async function threatCardOrder(page: Page): Promise<string[]> {
  const headings = await page.getByRole('heading').allInnerTexts();
  return headings.filter((t) => /^Threat \d/.test(t)).map((t) => t.split('\n')[0]);
}

// ------------------------------------------------------------- insights

/**
 * The drill-down link for a labelled figure on the Insights dashboard.
 *
 * Each figure is an anchor whose only text is the number, so it cannot be
 * identified on its own. The label immediately precedes it, so the link is found
 * by document order from the label — which survives styling changes in a way that
 * class- or index-based lookup would not.
 */
export function insightsDrilldown(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).first().locator('xpath=following::a[1]');
}

// -------------------------------------------------- metadata / comments

/**
 * Expand a card's Metadata section and return its Comments editor.
 *
 * Comments is only mounted once the section is expanded. It is an MDXEditor
 * contenteditable, not a form control, so its `Comments` FormField label is not a
 * usable `getByLabel` target.
 */
export async function openCardComments(card: Locator): Promise<Locator> {
  await card.getByRole('button', { name: /^Metadata$/ }).click();
  const editor = card.locator('[contenteditable="true"]').first();
  await expect(editor, 'Comments should mount once Metadata is expanded').toBeVisible();
  return editor;
}
