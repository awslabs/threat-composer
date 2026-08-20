/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { expect, type Locator, type Page } from '@playwright/test';
import { DEFAULT_WORKSPACE } from './routes';
import {
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

/** Navigate via the side navigation, the way a user would. */
export async function navigateVia(page: Page, linkName: string): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name: linkName, exact: true }).click();
  await waitForAppShell(page);
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

export async function fillApplicationInfo(
  page: Page,
  { name, description }: { name: string; description: string },
): Promise<void> {
  // An empty workspace opens this page already in edit mode; a populated one
  // needs the Edit button first.
  const editButton = page.getByRole('button', { name: 'Edit', exact: true });
  if (await editButton.isVisible().catch(() => false)) {
    await editButton.click();
  }

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
  await editable.click();
  await page.keyboard.type(text);
}

/** Architecture and Dataflow share one component (BaseDiagramInfo). */
export async function fillDiagramInfo(
  page: Page,
  { introduction, imageUrl }: { introduction: string; imageUrl?: string },
): Promise<void> {
  const editButton = page.getByRole('button', { name: 'Edit', exact: true });
  if (await editButton.isVisible().catch(() => false)) {
    await editButton.click();
  }

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
 * Pick a specific option from a Cloudscape Autosuggest.
 *
 * Three approaches were tried before this one; the notes matter because the
 * failures are intermittent and easy to reintroduce:
 *
 *  - A plain `.click()` fails with "element is not stable" and then "element was
 *    detached from the DOM". The dropdown is positioned relative to its input, so
 *    it moves while the surrounding card list reflows.
 *  - `.click({ force: true })` skips the stability wait but still clicks at
 *    coordinates, so it misses intermittently under parallel load.
 *  - Pressing Enter commits the *entered text* rather than the matching option,
 *    because Cloudscape keeps the `Use: "<typed>"` entry highlighted at index 0.
 *    On the "Search threat" field that silently links nothing, since free text
 *    there only resolves against existing ids. ArrowDown sent to the input does
 *    not move the highlight either.
 *
 *  - `dispatchEvent` never resolves: Playwright keeps retrying the locator while
 *    the dropdown re-renders.
 *
 * So the option is selected with the keyboard, which touches no coordinates and
 * is how a keyboard user does it. The one subtlety is the off-by-one: on open
 * there is NO highlight (`aria-activedescendant` is null, and the `aria-selected`
 * flag on the `Use: "<typed>"` entry reflects the selected *value*, not the
 * highlight). So the first ArrowDown lands on index 0, and reaching index N takes
 * N+1 presses.
 */
export async function chooseFromAutosuggest(
  page: Page,
  input: Locator,
  text: string,
  optionPattern: RegExp,
): Promise<void> {
  const target = page.getByRole('option', { name: optionPattern });

  // This widget is genuinely racy, and the whole open → locate → select sequence
  // has to complete before anything closes the dropdown again:
  //  - The app moves focus asynchronously after a save (the creation card calls
  //    focusTextarea), which closes an open dropdown.
  //  - Cloudscape only opens the dropdown in response to a real keystroke;
  //    `fill()` alone sets the value without opening it.
  //  - The option list re-renders while filtering, so the option's position is
  //    only valid for as long as the list is untouched.
  //
  // So one bounded retry wraps the entire sequence. Only *getting into* the right
  // state is retried; the caller's assertions about the resulting link are
  // untouched.
  const ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      await input.click();
      // `fill` for the bulk (atomic), then the final character as a real keystroke
      // so the dropdown opens and re-filters on the complete text.
      await input.fill(text.slice(0, -1));
      await input.press(text.slice(-1));
      await expect(input).toHaveValue(text, { timeout: 2_000 });
      await expect(target.first()).toBeVisible({ timeout: 3_000 });

      // Click the option with the stability check skipped.
      //
      // Keyboard selection is NOT usable here: Cloudscape's highlight offset is
      // not predictable from the option index (the first ArrowDown after opening
      // does not move the highlight), so arrowing lands on the wrong entry and
      // silently commits the `Use: "<typed>"` text instead — which resolves to
      // nothing on the "Search threat" field and creates no link at all.
      //
      // `force` is safe here because the preceding assertions already established
      // that the option is present and visible; it only skips the "has it stopped
      // moving?" wait, which never settles while the dropdown is anchored to a
      // reflowing list.
      await target.first().click({ force: true });

      // Selection committed: the dropdown closes and the input is cleared.
      await expect(target).toHaveCount(0, { timeout: 3_000 });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `could not select an autosuggest option matching ${optionPattern} after ${ATTEMPTS} attempts. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

/** Link a mitigation from inside the threat editor, creating it if new. */
export async function linkMitigationFromEditor(page: Page, content: string): Promise<void> {
  await expandSection(page, /^Linked mitigations \(\d+\)$/);
  const search = page.getByPlaceholder('Search mitigation');
  await chooseFromAutosuggest(page, search, content, /Add new mitigation/);
}

/** Link an assumption from inside the threat editor, creating it if new. */
export async function linkAssumptionFromEditor(page: Page, content: string): Promise<void> {
  await expandSection(page, /^Linked assumptions \(\d+\)$/);
  const search = page.getByPlaceholder('Search assumption');
  await chooseFromAutosuggest(page, search, content, /Add new assumption/);
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
  await page.getByRole('button', { name: label }).click();

  const creationCard = page
    .locator('div[class*="awsui_root_"][class*="awsui_variant-default"]')
    .filter({ has: page.getByRole('heading', { name: label }) })
    .first();

  const textarea = creationCard.locator('textarea').first();
  await expect(textarea).toBeVisible();
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

  const textarea = card.locator('textarea').first();
  await expect(textarea).toBeVisible();
  await textarea.fill(newContent);
  await card.getByRole('button', { name: 'Save', exact: true }).click();

  // Edit mode is over once the textarea is gone; only then is the card showing
  // rendered content rather than an editor.
  await expect(card.locator('textarea')).toHaveCount(0);
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
 * Add rows from a reference pack to the current workspace.
 * Checkbox 0 is the table's select-all, so row checkboxes start at index 1.
 */
export async function addPackRowsToWorkspace(page: Page, rowCount: number): Promise<void> {
  const addButton = page.getByRole('button', { name: 'Add to workspace' });
  await expect(addButton, 'disabled with an empty selection').toBeDisabled();

  const rowCheckboxes = page.locator('table input[type="checkbox"]');
  for (let i = 1; i <= rowCount; i++) {
    await rowCheckboxes.nth(i).check();
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
