/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import type { Locator, Page } from '@playwright/test';

/**
 * Low-level selectors for DOM shapes that cannot be reached with plain
 * getByRole/getByLabel. Every one of these was verified against the running app;
 * the comments record *why* the obvious approach does not work, so nobody
 * "simplifies" them back into something that silently matches nothing.
 */

/**
 * Root element of a Cloudscape `Container`. Every entity card (threat,
 * assumption, mitigation) is a Container, as is the filter panel above the
 * cards, so this must always be narrowed with `.filter({ has: heading })`.
 */
export const CARD = 'div[class*="awsui_root_"][class*="awsui_variant-default"]';

/**
 * The card action buttons (remove / edit) are Cloudscape icon buttons with no
 * text and NO aria-label. The library wraps them in its own `Tooltip`, which
 * renders `<span><button/><span class="tooltipText">Remove From Workspace</span></span>`.
 * So the tooltip text is the only stable handle, and getByRole('button', { name })
 * cannot find them.
 *
 * @see packages/threat-composer/src/components/generic/Tooltip/index.tsx
 * @see packages/threat-composer/src/components/generic/GenericCard/index.tsx
 */
export const byTooltip = (scope: Page | Locator, tooltip: string): Locator =>
  scope.locator(`span:has(> span.tooltipText:text-is("${tooltip}")) button`);

/**
 * Confirm button of an @aws-northstar/ui DeleteConfirmationDialog.
 *
 * The button renders visible text ("Remove", "Delete workspace", "Remove data")
 * but also carries `aria-label="delete"`, which OVERRIDES the text for the
 * accessible name. So matching on the visible text fails and this is the only
 * name that resolves. Cancel is likewise `aria-label="close"`.
 */
export const confirmDeleteButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'delete', exact: true });

export const cancelDeleteButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'close', exact: true });

/**
 * An entity card scoped by its heading. Threat card headings are multi-line —
 * "Threat 1\nIdentified\nHigh\nLLM09 Misinformation" — because the status badge,
 * priority badge and tags all live inside the heading element. Hence a
 * `^`-anchored regex rather than an exact string.
 */
export const entityCard = (page: Page, kind: 'Threat' | 'Assumption' | 'Mitigation', numericId: number): Locator =>
  page
    .locator(CARD)
    .filter({ has: page.getByRole('heading', { name: new RegExp(`^${kind} ${numericId}\\b`) }) })
    .first();

/** The workspace switcher trigger. `controlId` gives it a stable id. */
export const workspaceSelect = (page: Page): Locator => page.locator('#WorkspacesSelect');

/** The workspace-level "More actions" menu (top strip, next to the switcher). */
export const workspaceMoreActions = (page: Page): Locator =>
  page.getByRole('button', { name: 'More actions' }).first();

/**
 * Save button in the threat statement editor. The label is workspace-dependent:
 * "Add to list" / "Save" when only the unnamed Default workspace exists, but
 * "Add to workspace <name>" / "Save to workspace <name>" as soon as any named
 * workspace exists. Tests must not hard-code either form.
 *
 * @see packages/threat-composer/src/components/threats/ThreatStatementEditor/index.tsx saveButtonText
 */
export const threatSaveButton = (page: Page, mode: 'new' | 'existing'): Locator =>
  page.getByRole('button', {
    name: mode === 'new' ? /^(Add to list|Add to workspace .+)$/ : /^(Save|Save to workspace .+)$/,
  });

/** A clickable grammar token in the threat statement strip. */
export const grammarToken = (page: Page, token: string): Locator =>
  page.getByRole('button', { name: token, exact: true }).first();
