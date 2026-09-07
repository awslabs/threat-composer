# Threat Composer end-to-end (Playwright) tests

Functional browser tests for the **web app** (`packages/threat-composer-app`).

The app had **zero** runtime coverage: every existing check is build-time, a unit
test, or HTTP-level, and nothing asserted that the app actually renders, let
alone works, in a browser. These specs are that layer. They are deliberately
written against the app as it stands today so that later build-system work has a
behavioural baseline to be judged against, rather than "the build still passes".

They live **outside `packages/*`** so that Playwright and its browser download
stay out of the monorepo dependency tree: `e2e` is a standalone package with its
own lockfile and is not a workspace member. A Playwright upgrade therefore cannot
perturb the app's dependency resolution.

## Layout

```
fixtures/
  console-guard.ts   test fixture that fails a test on any console.error/pageerror
  selectors.ts       low-level selectors for DOM that getByRole cannot reach
  app.ts             task-level helpers written the way a user works
  routes.ts          the route table, with a per-route assertion for each
  cloudscape.ts      wraps Cloudscape's official test-utils selectors
  data/              import fixtures
scripts/
  serve-github-pages.mjs  static server that mounts under a prefix and 404s,
                          for the manual GitHub Pages check described below
tests/               20 specs, run against the dev server
```

`selectors.ts` and `app.ts` exist so specs read as behaviour. Each awkward
selector carries a comment explaining *why* the obvious approach does not work,
so nobody "simplifies" it back into something that silently matches nothing.

`fixtures/variants.ts`, `fixtures/extension.ts`, `scripts/serve-static.mjs` and
`scripts/serve-extension-fixtures.mjs` are also present but are not exercised
here. They are scaffolding for the extension and production-preview suites that
arrive with the build-system migration.

## Running

### First, build the library

From a fresh clone this is required, not optional. The app resolves
`@aws/threat-composer` through its `"main": "lib/index.js"` and `lib/` is
gitignored, so without it the dev server cannot resolve the library at all. The
library's images (5 PNG, 1 GIF) sit in `src` and are copied into `lib` separately
from the TypeScript build, which does not carry non-code files across, and
`tests/assets-and-css.spec.ts` asserts they load. The `*.css` pattern in the
command below is inherited from CI and currently matches nothing in this package;
the stylesheet the suite checks for comes from Cloudscape, not from `src`.

```bash
yarn install --frozen-lockfile
yarn nx run @aws/threat-composer:compile
cd packages/threat-composer && rsync -ar --prune-empty-dirs --include='*/' \
  --include='*.css' --include='*.png' --include='*.gif' --exclude='*' ./src/* ./lib
```

This mirrors what CI does. It is the first step of the package's projen
`post-compile` task; the second step is a full Storybook build, which the suite
does not need.

### Then the tests

Playwright is not part of the monorepo dependencies. Install it here once:

```bash
cd e2e && yarn install     # postinstall also runs `playwright install chromium`
```

Everything then runs from `e2e/`:

```bash
cd e2e
BROWSER=none yarn test     # the suite (Playwright starts the dev server itself)
yarn typecheck             # tsc --noEmit over the specs
BROWSER=none yarn test:headed   # same, but watch it drive a visible browser
yarn test:ui               # Playwright UI mode
yarn test:debug            # step through with the inspector
yarn report                # open the HTML report from the last run
```

`BROWSER=none` stops react-scripts opening a browser tab of its own each time
Playwright boots the dev server. It is not required, just much less irritating.

There is one config (`playwright.config.ts`) and one project, `chromium-dev`.
Playwright brings up the app itself with
`yarn workspace @aws/threat-composer-app run dev`, so no separate terminal is
needed. To run against a server you already have up, skip Playwright's own:

```bash
cd e2e && TC_BASE_URL=http://localhost:3000 yarn test
```

Expect **126 passed, 5 skipped**. The five are the GitHub Pages deep-link tests
in `tests/github-pages-rewrite.spec.ts`, which need a base-path build and a
server that reproduces the `404.html` rewrite. They skip rather than give a false
pass; the header comment in that file has the full recipe, using
`scripts/serve-github-pages.mjs`, `TC_GITHUB_PAGES=1` and `TC_ROUTE_BASE_PATH`.

One test reports as failed-and-expected: see Known defects below.

### The app under test is the BUILT library, not library source

`@aws/threat-composer` resolves through the workspace symlink to
`packages/threat-composer/lib/index.js`, and there is no alias back to `src`. So
**editing `packages/threat-composer/src/**` has no effect on a running dev
server.** After changing library source you must recompile it:

```bash
yarn workspace @aws/threat-composer run compile
```

and restart the dev server. If you changed a library image rather than TypeScript,
re-run the rsync from the section above as well, since `tsc` does not copy those. This is good for fidelity, because the suite exercises the artefact
that actually ships, but it is an easy way to waste an hour wondering why an edit
changed nothing.

## Seeing what the tests actually did

A green suite is not evidence on its own. These are the ways to inspect it,
roughly best-first.

### UI mode, the one to reach for

```bash
cd e2e && yarn test:ui
```

Pick any test and step through it. For each action you get the DOM snapshot as it
was at that moment (inspectable with real devtools), the before/after
screenshots, the network log, the console, and the exact locator used. It also
watches files and re-runs on save, and has a locator picker for writing new
assertions. This is the fastest way to confirm a test is really doing what its
name claims.

**Do not run UI mode and the CLI suite at the same time.** Both drive the same
dev server on :3000 and the contention roughly doubles wall-clock time: the full
suite measured 1.5 min alone and 2.8 min with UI mode also running, and
`packs --repeat-each=8` went from 46 s to 2.1 min. The `expect` timeout is 15 s,
so a heavy page under that load can cross it and fail for no reason other than
the load. If tests look flaky in UI mode, check nothing else is hitting the dev
server first. `packs.spec.ts` is the most exposed, since the pack detail page
renders a paginated 37-row table off a 152 KB JSON module.

### Watch it drive a real browser

```bash
cd e2e
yarn test:headed                                    # whole suite, visible
npx playwright test status-and-tags --headed --workers=1
```

Add `--workers=1` or the parallel windows are unwatchable. Note the suite forces
`reducedMotion: 'reduce'`, so Cloudscape animations are suppressed and it will
look snappier than the real app.

### Trace viewer, post-mortem of a run

Artefacts are only kept on failure by default, and since `retries` is 0 locally
`trace: 'on-first-retry'` means **traces are never recorded on a passing local
run**. To force them:

```bash
cd e2e
yarn test:trace -- journey-threat-model
yarn trace test-results/<test-dir>/trace.zip
```

`test:trace` sets `TC_CAPTURE=1`, which turns trace, video and per-step
screenshots on for every test. The journey spec alone records ~200 actions with a
screenshot and DOM snapshot at each one.

### HTML report

```bash
cd e2e && yarn report
```

Written to `playwright-report/` on every run. Failures embed the screenshot,
video and trace inline.

## Proving the suite would catch a regression

The useful question is not "does it pass" but "does it fail when the app breaks".
Two worked examples, both reverted afterwards. Recompile the library and restart
the dev server between each, per the note above.

**1. Silent status data loss.** In
`packages/threat-composer/src/components/threats/ThreatStatementList/index.tsx`,
in `handleUpdateStatementStatus`, change `status,` to `status: statement.status,`.
The save still runs, nothing throws, but the new status is dropped.

Result: 1 of 11 tests in `status-and-tags.spec.ts` fails,
`threat status › can be changed from the card badge and survives a reload`, with
`waiting for ... getByRole('button', { name: 'Resolved' })`. The editor-Metadata
status test still passes, correctly, because that path uses a different handler.
Note `tsc` also catches this one via `noUnusedParameters`.

**2. Inverted sort order.** In the same file, in the `else` branch of the sort,
swap `op1`/`op2`:
`output.sort((op1, op2) => (op1.numericId || Number.MAX_VALUE) - (op2.numericId || Number.MAX_VALUE))`.

Result: `tsc` and eslint are both clean, so this mutation is invisible to static
analysis. 2 of 12 tests in `filters-and-sorting.spec.ts` fail
(`defaults to Id descending, and Ascending reverses it`, and
`sorting survives filtering`). All 8 filter tests and the Priority-sort test
still pass, because only the Id comparator was touched.

Other one-line mutations worth trying: swap `removeTagFromEntity` for
`addTagToEntity` in `handleRemoveTagFromStatement` (tag removal silently
no-ops); change `if (sortBy.ascending)` to `if (!sortBy.ascending)`; negate the
status filter predicate; or drop a `contentAriaLabel` prop, which should trip the
canary in `selector-contract.spec.ts` rather than a functional test.

## What is covered

| Area | Spec | What it guards |
|---|---|---|
| **Console errors** (highest signal) | `fixtures/console-guard.ts`, auto-used by every spec | Any error that surfaces at runtime rather than at build time. |
| Full user journey | `tests/journey-threat-model.spec.ts` | One user builds a complete threat model from an empty workspace across 13 stages and exports it. The accumulated state is the assertion. |
| Boot & styling | `tests/smoke.spec.ts` | The app renders; Cloudscape's side-effect CSS import took effect. |
| Every lazy route | `tests/routes.spec.ts` | Each route renders a heading only *it* produces, so a test cannot pass on the shared shell. Side-nav reachability, both pack detail routes, `threats/:threatId` with a real UUID, `/preview/:dataKey`. |
| Workspaces | `tests/workspaces.spec.ts` | Create, duplicate-name rejection, rename, clone, delete and data removal (both friction dialogs), isolation between workspaces, read-only Example workspace. |
| Status, tags, comments | `tests/status-and-tags.spec.ts` | Threat status from the card badge *and* the editor; the separate four-value mitigation status set; tag add/remove on all three entity types with reload checks; Comments metadata (which is the entire Metadata section on assumptions and mitigations). |
| Filters & sorting | `tests/filters-and-sorting.spec.ts` | All ten threat filters including the three "Not Set" sentinels, AND-across / OR-within combination, `Clear filters`, and `Sort by` Id/Priority x Ascending/Descending (unset priority ranks lowest). |
| Insights drill-downs | `tests/insights-dashboard.spec.ts` | Accurate counts, and the cross-page contract where a figure navigates to a list with its filter pre-applied via `initialFilter`. |
| Print / preview & images | `tests/preview-and-content.spec.ts` | The real Print handoff (localStorage to new tab to rendered model), the import modal's Preview, and the diagram image controls including URL validation and upload. |
| Dark mode | `tests/theme.spec.ts` | `applyMode(Mode.Dark)` takes effect, persists across reload, and survives navigation. |
| Threat editor | `tests/threat-editor.spec.ts` | The guided grammar composer: token-driven field editors, random example, start over, metadata, custom template, duplicate, edit, remove, filtering. |
| Assumptions & mitigations | `tests/assumptions-mitigations.spec.ts` | CRUD for both, and the linking model, including creating an entity from a link field and the linked-entity filters. |
| Reference packs | `tests/packs.spec.ts` | Pack list to detail, bulk add to workspace, already-imported rows locked, referenced counts. |
| Brainstorm | `tests/brainstorm.spec.ts` | Enter-to-capture, hover-revealed actions, promotion into real assumptions/mitigations, create-threat-from-idea, column toggles. |
| Persistence | `tests/persistence.spec.ts` | Reload survival, remembered workspace, context isolation, full export/import round trip, malformed-JSON handling. |
| Static assets & CSS | `tests/assets-and-css.spec.ts` | Library PNG/GIF imported as URLs load; side-effect CSS resolved. |
| Import + markdown | `tests/import-and-markdown.spec.ts` | `sanitizeHtml` never reaches the throwing **postcss stub**. |
| Word export | `tests/word-export.spec.ts` | Exporting a `.docx` produces a document a word processor can actually open, read back with `mammoth`. |
| Markdown editor | `tests/markdown-editor.spec.ts` | `@mdxeditor/editor` loads and mounts. |
| Selector contract | `tests/selector-contract.spec.ts` | The canary for the structural hooks in the selector policy below. |
| GitHub Pages deep links | `tests/github-pages-rewrite.spec.ts` | The `404.html` `?/...` to `~and~` rewrite. Skipped by default, see Running. |

## Known defects recorded by the suite

**Workspace clone loses all content.** `tests/workspaces.spec.ts` marks
`cloning a workspace copies its content` with `test.fail()`, so it reports as an
expected failure and counts as a pass. This is a real, pre-existing upstream bug:
`hooks/useCloneWorkspace` awaits `addWorkspace()` first, and `handleAddWorkspace`
switches the current workspace, so the `getWorkspaceData()` on the next line
reads the brand-new empty workspace and the clone is written as empty arrays.
Fix: capture the data *before* creating the workspace. Playwright reports an
unexpected pass once that happens, prompting removal of the annotation.

The console guard also carries two allow-listed React dev warnings, the
`ReactDOM.render` legacy API notice and a missing `key` in `ThreatModelView`.
Both were verified against `origin/main`. See the comments in
`fixtures/console-guard.ts` for the fixes.

**Image upload logs a CSP violation.** `browser-image-compression` tries to run
in a Web Worker created from a `blob:` URL, which the app's own CSP forbids
(`script-src 'self'` with no `worker-src`). The library falls back to the main
thread, so uploading a diagram *does* work, but the browser logs the refusal. The
CSP is byte-identical to `origin/main`, so this is pre-existing and is not fixed
here. Allowed narrowly, per-test, in `tests/preview-and-content.spec.ts`; adding
`worker-src blob:` to the CSP would remove it. The allowance matches both
Chromium wordings of the message, since the phrasing changed between versions.
Note the SVG upload test deliberately does *not* allow it, since that path skips
compression and should stay clean.

## Selector policy

Roughly 92% of the suite matches on accessible names and visible text
(`getByRole`, `getByLabel`, `getByPlaceholder`), which is stable across builds.
React's generated ids (`:r17:`, `formField:r1r:`) are **never** used, since they
change between renders. Preference order when writing a new selector:

1. Role / label / text
2. Repo-owned hooks: `#WorkspacesSelect` (an explicit `controlId`), `#root`,
   `.tooltipText` (this repo's own `generic/Tooltip`)
3. Cloudscape's official `test-utils/selectors`, wrapped in `fixtures/cloudscape.ts`
4. Nothing else

Cloudscape's internal classes are hashed (`awsui_root_14iqq_fl8v6_189`), but that
hash lives in the *published* package, so it is unaffected by our builds and
changes only on upgrade. `fixtures/cloudscape.ts` reads the names from the
installed package at test time so an upgrade updates them automatically, rather
than hard-coding a `[class*="awsui_root_"]` guess.

`tests/selector-contract.spec.ts` is the canary: if any of these structural hooks
moves, that one test fails with an explicit message instead of the change
surfacing as dozens of unrelated timeouts.

## Notes and gotchas

- **Animations are suppressed** (`stillPage` fixture plus `reducedMotion:
  'reduce'`). This is load-bearing, verified by control experiment: with
  animations on, the autosuggest tests fail with `locator.click` timeouts because
  Cloudscape dropdowns move while the surrounding list reflows. Fixing the
  movement at source is what let the autosuggest helpers drop a retry loop, a
  forced click and keyboard index arithmetic in favour of a plain click.
- **Clipboard permissions** are granted in the config. "Copy as Markdown" calls
  `navigator.clipboard.writeText`, which headless Chromium otherwise rejects with
  an uncaught page error, a false positive for the console guard that would also
  hide the real assertion about what was copied.
- **Workspace names must not contain spaces** in tests: a space is
  percent-encoded into every subsequent URL. `uniqueWorkspaceName()` handles this.
- **Each test gets a fresh browser context**, so localStorage starts empty and
  the suite is safe to run in parallel. `tests/persistence.spec.ts` asserts this.
- **The dev server registers no service worker.** Anything production-only has no
  home in this suite yet.
- **Not wired into the git hooks.** `pre-push` already runs a full build, and
  adding browser tests would make every push considerably slower. CI runs them
  instead, in a dedicated `e2e` job (see `.github/workflows/build.yml`).

## Still uncovered

- The production bundle. Everything here runs against the dev server, so
  minification, the service worker and the built asset layout are unverified.
- The browser extension and the embedded build variants.
- The CodeCatalyst integration. It is the one handler that needs a page script
  injected into the host page (`scriptInjectForCodeCatalyst.js`) which scrapes an
  Ace editor session and writes a hidden `#raw-div`. Faking that convincingly
  needs an Ace instance, so it is better served by unit tests over the handler.
- Firefox. Playwright cannot side-load extensions there, and the suite runs a
  single Chromium project.
- Storybook.
- Visual regression: styling is checked functionally (computed backgrounds,
  stylesheet presence, images loading) rather than by screenshot comparison.
