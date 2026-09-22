/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test as base, expect, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Console-error guard — the backbone of this suite.
 *
 * Every runtime bug found during the Vite/ESM migration surfaced in the dev
 * console, not as a failed build: `global is not defined` (docx / buffer),
 * `undefined is not a function` from a mistakenly value-imported enum, a route
 * that silently blanked because its Rollup chunk failed to load. A build-time or
 * HTTP-level check catches none of those. Failing a test on any `console.error`
 * or uncaught `pageerror` does.
 *
 * Used by BOTH the dev suite and the production-preview suite. The preview specs
 * originally imported straight from '@playwright/test' and so shipped with no
 * console assertions at all, which left the bundle that actually ships less
 * covered than the dev server.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/console-guard';
 *   test('...', async ({ page }) => { ... });
 *
 * The guard is auto-used: after every test it asserts no unexpected console
 * errors were emitted. A test that intentionally provokes one calls
 * `allowConsoleError(page, /pattern/)`.
 */

/**
 * Allow-list of console.error / pageerror patterns that are known, verified
 * pre-existing defects rather than regressions from the migration. Keep this
 * SHORT and keep every entry justified — the strictness is the whole point.
 *
 * Both React entries below were confirmed against `origin/main` and are absent
 * from the production bundle entirely (React strips these dev-only warnings), so
 * they never mask anything in the preview suite.
 *
 * NOTE: React Router v6 future-flag notices are console.warn, not console.error,
 * so they need no entry here.
 */
const DEFAULT_ALLOWED_PATTERNS: (string | RegExp)[] = [
  // Favicon / manifest assets can 404 on the dev server depending on public/
  // contents. Network noise, not an app fault.
  /Failed to load resource:.*(favicon|manifest\.json|apple-touch)/i,
  // Third-party components still logging React deprecations via console.error.
  /Support for defaultProps will be removed/i,
  //
  // PRE-EXISTING (verified on origin/main, NOT a migration regression):
  // packages/threat-composer-app/src/index.tsx still calls the legacy
  // `ReactDOM.render(...)`, so React 18 logs this on every load and runs the app
  // in React-17 compatibility mode. `git show origin/main:.../src/index.tsx`
  // shows the same call at line 31.
  // Fix: migrate to `createRoot(...).render(...)`, then delete this entry so the
  // guard would catch a regression.
  /ReactDOM\.render is no longer supported in React 18/i,
  //
  // PRE-EXISTING (verified: the migration diff to this file is import-type
  // changes only): ThreatModelView's `getNextStepButtons` ends with a flatMap
  // that wraps buttons in unkeyed <Box> elements, so React logs a missing-key
  // warning on the Threat model report page. The Buttons themselves have keys.
  // Fix: key the flatMap output in
  // packages/threat-composer/src/components/report/ThreatModel/components/ThreatModelView/index.tsx
  /Each child in a list should have a unique "key" prop/i,
];

type ConsoleGuardFixtures = {
  /** Collected error-level console messages + uncaught page errors. */
  consoleErrors: string[];
  /** Disables CSS animations/transitions for the whole page. */
  stillPage: void;
};

/**
 * Cloudscape animates expandable sections, dropdowns and modals. Those animations
 * are the root cause of a whole class of intermittent failures: while a container
 * is still expanding, a control inside it is visible but MOVING, so a click misses,
 * focus fails to settle, or Playwright reports "element is not stable".
 *
 * This is load-bearing, not belt-and-braces. Verified by control experiment:
 * disabling this fixture and re-running `assumptions-mitigations` at
 * `--repeat-each=6` reproduces `locator.click: Test timeout` on the autosuggest
 * tests; with it enabled the same run is 60/60. Fixing the movement at source is
 * what allowed the autosuggest helpers to drop a 3-attempt retry loop, a forced
 * click, and keyboard index arithmetic in favour of a plain click.
 *
 * Test-harness concern only — it changes no application logic. Both configs also
 * set `contextOptions: { reducedMotion: 'reduce' }`, which Cloudscape honours.
 */
const NO_ANIMATION_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

function isAllowed(text: string, extra: (string | RegExp)[]): boolean {
  return [...DEFAULT_ALLOWED_PATTERNS, ...extra].some((p) =>
    typeof p === 'string' ? text.includes(p) : p.test(text),
  );
}

const perPageAllow = new WeakMap<Page, (string | RegExp)[]>();

/**
 * Register an extra allow-pattern for the current test's page. Use only for an
 * error the test deliberately provokes and asserts on some other way.
 */
export function allowConsoleError(page: Page, pattern: string | RegExp): void {
  const list = perPageAllow.get(page) ?? [];
  list.push(pattern);
  perPageAllow.set(page, list);
}

export const test = base.extend<ConsoleGuardFixtures>({
  stillPage: [
    async ({ page }, use) => {
      // Re-applied on every navigation, since a style tag does not survive one.
      await page.addInitScript((css) => {
        const inject = () => {
          const style = document.createElement('style');
          style.setAttribute('data-e2e', 'no-animation');
          style.textContent = css;
          document.head.appendChild(style);
        };
        if (document.head) {
          inject();
        } else {
          document.addEventListener('DOMContentLoaded', inject, { once: true });
        }
      }, NO_ANIMATION_CSS);
      await use();
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];

      const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      };
      const onPageError = (err: Error) => {
        errors.push(`pageerror: ${err.message}`);
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      await use(errors);

      page.off('console', onConsole);
      page.off('pageerror', onPageError);

      if (testInfo.status === 'skipped') {
        return;
      }

      const extra = perPageAllow.get(page) ?? [];
      const unexpected = errors.filter((e) => !isAllowed(e, extra));

      expect(
        unexpected,
        `Unexpected console.error / pageerror output during "${testInfo.title}":\n` +
          unexpected.map((e) => `  - ${e}`).join('\n'),
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
