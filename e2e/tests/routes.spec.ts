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

import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/console-guard';
import {
  waitForAppShell,
  gotoWorkspace,
  addThreat,
  navigateVia,
  workspacePath,
} from '../fixtures/app';
import type { WorkspaceRoute } from '../fixtures/routes';
import { WORKSPACE_ROUTES, PARAMETERISED_ROUTES, DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * Route coverage. Each route is a React.lazy() import, so a broken Rollup chunk
 * blanks the route with no build failure.
 *
 * Each test asserts a heading that ONLY that route renders, so it cannot pass on
 * the shared app shell alone — plus, via the auto console guard, that nothing
 * errored. The console guard is what catches a value mistakenly erased by the
 * 264-file `import type` codemod: it surfaces as `undefined is not a function`.
 */
/**
 * Assert a route rendered its OWN content, not merely the shared app shell.
 */
async function expectRouteRendered(page: Page, route: WorkspaceRoute): Promise<void> {
  if (route.heading) {
    await expect(
      page.getByRole('heading', { name: route.heading }).first(),
      `Route "${route.path}" did not render its own heading (possible bad lazy chunk)`,
    ).toBeVisible();
  }
  if (route.text) {
    await expect(
      page.getByText(route.text).first(),
      `Route "${route.path}" did not render its own content (possible bad lazy chunk)`,
    ).toBeVisible();
  }
  if (route.control) {
    await expect(page.getByRole('button', { name: route.control }).first()).toBeVisible();
  }
}

test.describe('lazy route coverage', () => {
  test('every route declares a route-specific assertion', () => {
    // Guards the guard: a route added without `heading` or `text` would other-
    // wise be "covered" by a test that only checks the shared shell.
    for (const route of WORKSPACE_ROUTES) {
      expect(
        route.heading ?? route.text,
        `route "${route.path}" needs a heading or text assertion unique to it`,
      ).toBeDefined();
    }
  });

  for (const route of WORKSPACE_ROUTES) {
    test(`route "${route.path}" renders its own content`, async ({ page }) => {
      await page.goto(workspacePath(route.path));

      await expect(page).toHaveURL(new RegExp(`/workspaces/[^/]+/${route.path}$`));
      await waitForAppShell(page);
      await expectRouteRendered(page, route);
    });
  }

  test('every route is reachable from the side navigation', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');

    for (const route of WORKSPACE_ROUTES.filter((r) => r.navLink)) {
      // The pack links live inside a collapsed "Reference packs" group.
      const link = page
        .getByRole('navigation')
        .getByRole('link', { name: route.navLink!, exact: true });
      if (!(await link.isVisible().catch(() => false))) {
        await page.getByRole('navigation').getByText('Reference packs', { exact: true }).click();
      }
      await navigateVia(page, route.navLink!);
      await expect(page).toHaveURL(new RegExp(`/${route.path}$`));
      await expectRouteRendered(page, route);
    }
  });
});

test.describe('parameterised routes', () => {
  for (const route of PARAMETERISED_ROUTES) {
    test(`route "${route.path}" renders the pack detail`, async ({ page }) => {
      await page.goto(workspacePath(route.path));
      await waitForAppShell(page);

      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: route.control }).first()).toBeVisible();
      // The detail table must actually have rows, not just a header.
      await expect(page.locator('table tbody tr').first()).toBeVisible();
    });
  }

  test('threats/:threatId opens the editor for a real threat id', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, {
      threatSource: 'external threat actor',
      threatAction: 'read records they should not have access to',
    });

    // A threat id is a UUID, so it can only be reached by navigating from the
    // list rather than by constructing a URL.
    await page
      .locator('span:has(> span.tooltipText:text-is("Edit")) button')
      .first()
      .click();

    await expect(page).toHaveURL(/\/threats\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Threat 1', exact: true })).toBeVisible();
    // The editor for an existing threat offers Save rather than Add.
    await expect(page.getByRole('button', { name: /^(Save|Save to workspace .+)$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start over' })).toHaveCount(0);
  });

  test('an unknown pack id renders blank without crashing', async ({ page }) => {
    // The component returns null for an unrecognised id. Asserting the documented
    // behaviour keeps a future change from silently turning it into an error page.
    await page.goto(workspacePath('threatPacks/DoesNotExist'));
    await waitForAppShell(page);
    await expect(page.getByRole('heading', { name: /^Threat Pack - / })).toHaveCount(0);
  });

  test('the /preview/:dataKey route resolves with no matching data', async ({ page }) => {
    await page.goto('/preview/nonexistent-key');
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});
