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

import { test, expect } from '../fixtures/console-guard';
import {
  addSimpleEntity,
  createWorkspace,
  gotoWorkspace,
  navigateVia,
  switchWorkspace,
  uniqueWorkspaceName,
  waitForAppShell,
  workspaceAction,
  workspaceOption,
} from '../fixtures/app';
import { confirmDeleteButton, workspaceSelect } from '../fixtures/selectors';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * Workspace management. Workspaces are the app's isolation boundary — all data
 * is client-side and scoped to the selected workspace — so switching, cloning
 * and deleting are the operations most likely to lose a user's work if they
 * regress.
 */
test.describe('workspace management', () => {
  test('the Default workspace cannot be renamed or deleted', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');

    await page.getByRole('button', { name: 'More actions' }).first().click();

    // Both are gated on there being a real (named) current workspace; "Default"
    // is represented by a null workspace internally.
    await expect(page.getByRole('menuitem', { name: 'Delete workspace' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.getByRole('menuitem', { name: 'Rename workspace' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  test('creating a workspace switches to it and lists it in the switcher', async ({ page }) => {
    const name = uniqueWorkspaceName('Ws');
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');

    await createWorkspace(page, name);

    // A "Workspaces" option group only appears once a user workspace exists.
    await workspaceSelect(page).click();
    await expect(workspaceOption(page, name)).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('a duplicate workspace name is rejected with an error', async ({ page }) => {
    const name = uniqueWorkspaceName('Dup');
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await createWorkspace(page, name);

    await workspaceAction(page, 'Add new workspace');
    await page.getByLabel('New workspace name').fill(name);
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.getByText('A workspace already exists with that name')).toBeVisible();
    // The modal must stay open rather than silently creating a second workspace.
    await expect(page.getByLabel('New workspace name')).toBeVisible();
  });

  test('renaming a workspace updates the switcher and the URL', async ({ page }) => {
    const name = uniqueWorkspaceName('Before');
    const renamed = uniqueWorkspaceName('After');
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await createWorkspace(page, name);

    await workspaceAction(page, 'Rename workspace');
    // The rename modal pre-fills the current name.
    await expect(page.getByLabel('New workspace name')).toHaveValue(name);
    await page.getByLabel('New workspace name').fill(renamed);
    await page.getByRole('button', { name: 'Update', exact: true }).click();

    await expect(workspaceSelect(page)).toContainText(`Workspace: ${renamed}`);
  });

  test('data is isolated between workspaces', async ({ page }) => {
    const first = uniqueWorkspaceName('IsoA');
    const second = uniqueWorkspaceName('IsoB');

    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await createWorkspace(page, first);
    await navigateVia(page, 'Assumptions');
    await addSimpleEntity(page, 'assumption', 'Only visible in the first workspace.');
    await expect(page.getByRole('heading', { name: /^Assumptions \(1\)/ })).toBeVisible();

    await createWorkspace(page, second);
    await navigateVia(page, 'Assumptions');
    await expect(page.getByRole('heading', { name: /^Assumptions \(0\)/ })).toBeVisible();
    await expect(page.getByText('Only visible in the first workspace.')).toHaveCount(0);

    // Switching back must restore the first workspace's data.
    await switchWorkspace(page, first);
    await navigateVia(page, 'Assumptions');
    await expect(page.getByRole('heading', { name: /^Assumptions \(1\)/ })).toBeVisible();
    await expect(page.getByText('Only visible in the first workspace.')).toBeVisible();
  });

  /**
   * KNOWN DEFECT — pre-existing upstream, not a migration regression.
   *
   * "Clone current workspace" always produces an EMPTY workspace. In
   * hooks/useCloneWorkspace, `addWorkspace()` is awaited first, and
   * `handleAddWorkspace` (contexts/WorkspacesContext/useWorkspaces.ts) calls
   * `setCurrentWorkspace(newWorkspace)` + `onWorkspaceChanged(...)`. So by the
   * time `getWorkspaceData()` runs on the next line it is reading the brand-new
   * empty workspace rather than the source, and `cloneWorkspaceData` writes
   * empty arrays. Verified directly in localStorage: the clone's
   * `AssumptionList_<newId>` key is written as `[]`.
   *
   * `useCloneWorkspace/index.ts` was last touched by upstream commit c273356
   * (v1.0.61) and is absent from the migration diff; the only migration change
   * anywhere near it is an `import type` rewrite in CrossWorkspaceContext.
   *
   * Fix: capture `getWorkspaceData()` BEFORE calling `addWorkspace`.
   *
   * Marked `test.fail()` so the suite stays honest — it records the bug and will
   * report an "unexpected pass" the moment someone fixes it, prompting removal
   * of this annotation.
   */
  test.fail(
    'cloning a workspace copies its content',
    async ({ page }) => {
      const source = uniqueWorkspaceName('Src');
      const clone = uniqueWorkspaceName('Clone');

      await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
      await createWorkspace(page, source);
      await navigateVia(page, 'Assumptions');
      await addSimpleEntity(page, 'assumption', 'This assumption should be cloned.');

      await workspaceAction(page, 'Clone current workspace');
      await page.getByLabel('New workspace name').fill(clone);
      await page.getByRole('button', { name: 'Clone', exact: true }).click();

      // The clone is created and switched to correctly...
      await expect(workspaceSelect(page)).toContainText(`Workspace: ${clone}`);

      // ...but its content is empty, so this is the assertion that fails.
      await navigateVia(page, 'Assumptions');
      await expect(page.getByRole('heading', { name: /^Assumptions \(1\)/ })).toBeVisible();
      await expect(page.getByText('This assumption should be cloned.')).toBeVisible();
    },
  );

  test('cloning a workspace at least creates and switches to it', async ({ page }) => {
    // The half of clone that does work, asserted separately so the defect above
    // does not leave the whole feature uncovered.
    const source = uniqueWorkspaceName('CloneOk');
    const clone = uniqueWorkspaceName('CloneNew');

    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await createWorkspace(page, source);

    await workspaceAction(page, 'Clone current workspace');
    await page.getByLabel('New workspace name').fill(clone);
    await page.getByRole('button', { name: 'Clone', exact: true }).click();

    await expect(workspaceSelect(page)).toContainText(`Workspace: ${clone}`);
    await expect(page).toHaveURL(new RegExp(`/workspaces/${clone}/`));
  });

  test('removing data empties the workspace but keeps it', async ({ page }) => {
    const name = uniqueWorkspaceName('Purge');
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await createWorkspace(page, name);
    await navigateVia(page, 'Assumptions');
    await addSimpleEntity(page, 'assumption', 'Doomed assumption.');

    await workspaceAction(page, 'Remove data from current workspace');
    await expect(
      page.getByRole('heading', { name: 'Delete data from current workspace?' }).first(),
    ).toBeVisible();

    // This is a "friction" dialog: the confirm button stays disabled until the
    // word "delete" is typed. That guard is the point of the dialog, so assert it.
    const confirm = confirmDeleteButton(page);
    await expect(confirm).toBeDisabled();
    await page.getByPlaceholder('delete').fill('delete');
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(page.getByRole('heading', { name: /^Assumptions \(0\)/ })).toBeVisible();
    // The workspace itself must survive.
    await expect(workspaceSelect(page)).toContainText(`Workspace: ${name}`);
  });

  test('deleting a workspace removes it and falls back to Default', async ({ page }) => {
    const name = uniqueWorkspaceName('Gone');
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await createWorkspace(page, name);

    await workspaceAction(page, 'Delete workspace');
    await expect(page.getByRole('heading', { name: 'Delete Workspace?' }).first()).toBeVisible();

    const confirm = confirmDeleteButton(page);
    await expect(confirm).toBeDisabled();
    await page.getByPlaceholder('delete').fill('delete');
    await confirm.click();

    await expect(workspaceSelect(page)).toContainText('Workspace: Default');

    // And it must be gone from the switcher.
    await workspaceSelect(page).click();
    await expect(page.getByRole('option', { name })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  test('the read-only Example workspace is offered and loads content', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');

    await workspaceSelect(page).click();
    // Example workspaces are a system-defined option group.
    const exampleOption = page.getByRole('option').filter({ hasText: /Threat Composer|Example/ });
    await expect(exampleOption.first()).toBeVisible();
    await exampleOption.first().click();

    await waitForAppShell(page);
    // An example workspace has content, so the dashboard shows insights.
    await expect(page.getByRole('heading', { name: /^Insights dashboard/ })).toBeVisible();

    // Import and data removal must be disabled for a read-only example.
    await page.getByRole('button', { name: 'More actions' }).first().click();
    await expect(
      page.getByRole('menuitem', { name: 'Import into current workspace' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
