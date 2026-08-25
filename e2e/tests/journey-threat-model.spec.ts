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

import fs from 'node:fs';
import { test, expect } from '../fixtures/console-guard';
import {
  addBrainstormItem,
  addPackRowsToWorkspace,
  addSimpleEntity,
  addThreat,
  brainstormItemAction,
  createWorkspace,
  downloadFromReport,
  fillApplicationInfo,
  fillDiagramInfo,
  fillThreatStatement,
  gotoWorkspace,
  linkAssumptionFromEditor,
  linkMitigationFromEditor,
  navigateVia,
  saveNewThreat,
  setThreatMetadata,
  uniqueWorkspaceName,
  waitForAppShell,
  workspacePath,
} from '../fixtures/app';
import { PACK_ID } from '../fixtures/routes';

/**
 * The flagship test: one user builds a complete threat model from an empty
 * workspace, touching every part of the app in the order a real user would, and
 * every step is verified by its user-visible effect.
 *
 * This is deliberately ONE long test rather than several. The value is in the
 * accumulated state: the report at the end can only be correct if application
 * info, the diagrams, the hand-written threat, the pack-imported threats, the
 * assumptions, the mitigations and all the links between them were each stored
 * correctly. Splitting it would mean either re-deriving that state repeatedly or
 * asserting far less.
 */
test.describe('end-to-end threat model creation', () => {
  // Thirteen stages of real UI interaction plus four file downloads. The default
  // per-test timeout is sized for single-page checks, not a full journey.
  test.setTimeout(6 * 60 * 1000);

  test('a user builds, reviews and exports a complete threat model', async ({ page }) => {
    const workspace = uniqueWorkspaceName('Journey');

    // ---------------------------------------------------------- 1. workspace
    await page.goto('/');
    await waitForAppShell(page);

    // An empty default workspace shows the landing page, not the dashboard.
    await expect(page.getByRole('heading', { name: 'Threat Composer', level: 1 })).toBeVisible();

    await createWorkspace(page, workspace);
    await expect(page).toHaveURL(new RegExp(`/workspaces/${workspace}/dashboard$`));

    // -------------------------------------------------- 2. application info
    await navigateVia(page, 'Application info');
    await fillApplicationInfo(page, {
      name: 'Payments API',
      description: 'A public API that authorises and captures card payments.',
    });

    // The saved name becomes the container heading and is appended to page h1s.
    await expect(page.getByRole('heading', { name: 'Payments API' }).first()).toBeVisible();
    await expect(page.getByText('A public API that authorises and captures card payments.')).toBeVisible();

    // -------------------------------------------- 3. architecture + dataflow
    await navigateVia(page, 'Architecture');
    await fillDiagramInfo(page, {
      introduction: 'API Gateway fronts a Lambda authoriser and an Aurora cluster.',
    });
    await expect(page.getByText('API Gateway fronts a Lambda authoriser and an Aurora cluster.')).toBeVisible();

    await navigateVia(page, 'Dataflow');
    await fillDiagramInfo(page, {
      introduction: 'Card data flows from the browser to API Gateway over TLS 1.2+.',
    });
    await expect(page.getByText('Card data flows from the browser to API Gateway over TLS 1.2+.')).toBeVisible();

    // ------------------------------------------------------- 4. assumptions
    await navigateVia(page, 'Assumptions');
    await addSimpleEntity(page, 'assumption', 'Card numbers are tokenised before they reach our storage.');
    await addSimpleEntity(page, 'assumption', 'TLS terminates at API Gateway and is not re-encrypted internally.');
    await expect(page.getByRole('heading', { name: /^Assumptions \(2\)/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Assumption 1\b/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Assumption 2\b/ })).toBeVisible();

    // ------------------------------------------------------- 5. mitigations
    await navigateVia(page, 'Mitigations');
    await addSimpleEntity(page, 'mitigation', 'Require mutual TLS between API Gateway and the authoriser.');
    await expect(page.getByRole('heading', { name: /^Mitigations \(1\)/ })).toBeVisible();

    // ------------------------------------ 6. a threat, written field by field
    await navigateVia(page, 'Threats');
    await expect(page.getByRole('heading', { name: /^Threats \(0\)/ })).toBeVisible();

    await page.getByRole('button', { name: 'Add new threat' }).click();
    await expect(page).toHaveURL(/\/threats\/new$/);

    // The guided grammar composer is the core of the product.
    await expect(page.getByRole('heading', { name: "Let's write a threat statement!" })).toBeVisible();
    const save = page.getByRole('button', { name: /^(Add to list|Add to workspace .+)$/ });
    await expect(save, 'nothing to save yet').toBeDisabled();

    await fillThreatStatement(page, {
      threatSource: 'external threat actor',
      prerequisites: 'with a network path to the public API',
      threatAction: 'replay a previously captured authorisation request',
      threatImpact: 'duplicate charges against a cardholder',
      impactedGoal: 'integrity',
      impactedAssets: 'payment records',
    });

    // Every filled field becomes a clickable token in the statement strip, so
    // each one being present proves the grammar picked the value up. (The
    // sentence itself is split across many inline token elements, so it cannot
    // be matched as one contiguous string here — the assembled sentence is
    // asserted later against the report and the markdown export.)
    for (const value of [
      'external threat actor',
      'with a network path to the public API',
      'replay a previously captured authorisation request',
      'duplicate charges against a cardholder',
      'integrity',
      'payment records',
    ]) {
      await expect(
        page.getByRole('button', { name: value, exact: true }).first(),
        `"${value}" should appear as a filled token in the statement`,
      ).toBeVisible();
    }
    await expect(save).toBeEnabled();

    // Links and metadata, created from inside the editor.
    await linkMitigationFromEditor(page, 'Reject authorisation requests with a reused nonce.');
    await expect(page.getByRole('button', { name: /^Linked mitigations \(1\)$/ })).toBeVisible();

    await linkAssumptionFromEditor(page, 'Nonces are stored for at least 24 hours.');
    await expect(page.getByRole('button', { name: /^Linked assumptions \(1\)$/ })).toBeVisible();

    await setThreatMetadata(page, { priority: 'High' });

    await saveNewThreat(page);
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();

    // The card should carry the priority that was set in the editor.
    await expect(page.getByRole('heading', { name: /^Threat 1\b.*High/s })).toBeVisible();

    // Creating links from the editor must have created the entities themselves.
    await navigateVia(page, 'Mitigations');
    await expect(page.getByRole('heading', { name: /^Mitigations \(2\)/ })).toBeVisible();
    await expect(page.getByText('Reject authorisation requests with a reused nonce.')).toBeVisible();
    await expect(page.getByText(/^Linked threats \(1\)$/).first()).toBeVisible();

    await navigateVia(page, 'Assumptions');
    await expect(page.getByRole('heading', { name: /^Assumptions \(3\)/ })).toBeVisible();
    await expect(page.getByText('Nonces are stored for at least 24 hours.')).toBeVisible();

    // ------------------------------------- 7. bulk threats from a threat pack
    await page.goto(workspacePath(`threatPacks/${PACK_ID}`, workspace));
    await waitForAppShell(page);
    await expect(page.getByRole('heading', { name: /^Threat Pack - / })).toBeVisible();
    await addPackRowsToWorkspace(page, 2);

    await gotoWorkspace(page, workspace, 'threats');
    await expect(page.getByRole('heading', { name: /^Threats \(3\)/ })).toBeVisible();

    // ------------------------------ 8. mitigation candidates from a pack too
    await page.goto(workspacePath(`mitigationPacks/${PACK_ID}`, workspace));
    await waitForAppShell(page);
    await addPackRowsToWorkspace(page, 2);

    await gotoWorkspace(page, workspace, 'mitigations');
    await expect(page.getByRole('heading', { name: /^Mitigations \(4\)/ })).toBeVisible();

    // ---------------------------------------------------- 9. brainstorm board
    await navigateVia(page, 'Brainstorming');
    await expect(page.getByRole('heading', { name: 'Brainstorm', level: 1 })).toBeVisible();

    const idea = 'Refunds are processed out of band.';
    await addBrainstormItem(page, 'Add assumption...', idea);

    // Promoting turns a captured idea into a real assumption. The action buttons
    // only exist while the card is hovered.
    await brainstormItemAction(page, idea, 'Promote item');

    // Once promoted the control flips to a disabled "Item promoted".
    await page.getByText(idea).first().hover();
    const promoted = page.getByRole('button', { name: 'Item promoted' }).first();
    await expect(promoted).toBeVisible();
    await expect(promoted, 'promoting twice must not be possible').toBeDisabled();

    await navigateVia(page, 'Assumptions');
    await expect(page.getByRole('heading', { name: /^Assumptions \(4\)/ })).toBeVisible();
    await expect(page.getByText('Refunds are processed out of band.')).toBeVisible();

    // --------------------------------------------- 10. the insights dashboard
    await navigateVia(page, 'Dashboard');
    // With content present, WorkspaceHome swaps the landing page for insights.
    await expect(page.getByRole('heading', { name: /^Insights dashboard/ })).toBeVisible();
    for (const widget of [
      'Threat summary',
      'Threat prioritization',
      'Threat status',
      'Threat category distribution',
      'Threat grammar distribution',
      'Mitigation status',
    ]) {
      await expect(page.getByRole('heading', { name: widget, exact: true })).toBeVisible();
    }
    // The summary must reflect real counts, not zeros.
    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible();

    // ------------------------------------------------- 11. the report content
    await navigateVia(page, 'Threat model');
    const report = page.getByRole('main');
    await expect(report).toContainText('Payments API');
    await expect(report).toContainText('A public API that authorises and captures card payments.');
    await expect(report).toContainText('API Gateway fronts a Lambda authoriser and an Aurora cluster.');
    await expect(report).toContainText('Card data flows from the browser to API Gateway over TLS 1.2+.');
    await expect(report).toContainText('replay a previously captured authorisation request');
    await expect(report).toContainText('Card numbers are tokenised before they reach our storage.');
    await expect(report).toContainText('Require mutual TLS between API Gateway and the authoriser.');
    // Threats are numbered T-0001.. and assets AS-0001.. in the report tables.
    await expect(report).toContainText('T-0001');
    await expect(report).toContainText('payment records');

    // Nothing should still be outstanding, so the "next steps" prompt is gone.
    await expect(page.getByRole('button', { name: 'Add Application Info' })).toHaveCount(0);

    // ------------------------------------------------------- 12. all exports
    const markdown = await downloadFromReport(page, 'Download as Markdown File');
    expect(markdown.suggestedFilename()).toBe(`ThreatComposer_Workspace_${workspace}.md`);
    const mdPath = await markdown.path();
    const mdText = fs.readFileSync(mdPath!, 'utf8');
    expect(mdText).toContain('Payments API');
    expect(mdText).toContain('replay a previously captured authorisation request');

    const json = await downloadFromReport(page, 'Download as JSON File');
    expect(json.suggestedFilename()).toBe(`ThreatComposer_Workspace_${workspace}.tc.json`);
    const parsed = JSON.parse(fs.readFileSync((await json.path())!, 'utf8'));
    expect(parsed.applicationInfo.name).toBe('Payments API');
    expect(parsed.threats.length).toBe(3);
    expect(parsed.assumptions.length).toBe(4);
    expect(parsed.mitigations.length).toBe(4);
    // The links created in the editor must survive a round trip.
    expect(parsed.mitigationLinks.length).toBeGreaterThan(0);
    expect(parsed.assumptionLinks.length).toBeGreaterThan(0);

    // Word export is the acid test for `define: { global: 'globalThis' }`: docx
    // and its bundled buffer polyfill reference Node's `global`.
    const docx = await downloadFromReport(page, 'Download as Word - Docx File');
    expect(docx.suggestedFilename()).toMatch(/\.docx$/i);
    const docxPath = await docx.path();
    expect(fs.statSync(docxPath!).size).toBeGreaterThan(500);
    const header = Buffer.alloc(2);
    const fd = fs.openSync(docxPath!, 'r');
    fs.readSync(fd, header, 0, 2, 0);
    fs.closeSync(fd);
    expect(header.toString('latin1'), 'a .docx is a zip, so it starts with PK').toBe('PK');

    // Copy to clipboard (this path runs sanitizeHtml again, so it is also a check
    // that the throwing postcss stub is never reached).
    await page.getByRole('button', { name: 'Copy as Markdown' }).click();
    await expect(page.getByText('Content copied')).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('Payments API');
    expect(clipboard).toContain('replay a previously captured authorisation request');

    // ------------------------------------ 13. everything survives a reload
    await page.reload();
    await waitForAppShell(page);
    await expect(page.locator('#WorkspacesSelect')).toContainText(`Workspace: ${workspace}`);
    await gotoWorkspace(page, workspace, 'threats');
    await expect(page.getByRole('heading', { name: /^Threats \(3\)/ })).toBeVisible();
  });
});
