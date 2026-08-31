# Threat Composer — end-to-end (Playwright) tests

Functional browser tests for the **web app** (`packages/threat-composer-app`).

Before this suite the app had **zero** runtime coverage: every check in the Yarn
workspaces + Vite + ESM migration was build-time or HTTP-level, and the app was
never asserted to actually render, let alone work, in a browser. These specs are
that layer.

They live **outside `packages/*`** deliberately: the app's Vitest config globs
`src/**/*.{spec,test}.{ts,tsx}` and would otherwise try to run Playwright specs
as unit tests. For the same reason `e2e` is a standalone npm package rather than
a Yarn workspace.

## Layout

```
fixtures/
  console-guard.ts   test fixture that fails a test on any console.error/pageerror
  selectors.ts       low-level selectors for DOM that getByRole cannot reach
  app.ts             task-level helpers written the way a user works
  routes.ts          the route table, with a per-route assertion for each
  variants.ts        helpers + shared contract for the extension build variants
  extension.ts       loads the built WXT extension as a real Chromium extension
  data/              import fixtures
scripts/
  serve-github-pages.mjs      static server that mounts under a prefix and 404s
  serve-static.mjs            static server rooted at a build dir (variants)
  serve-extension-fixtures.mjs fake GitHub/GitLab/Bitbucket/AmazonCode pages
tests/               run against the Vite dev server
tests-preview/       run against the production build via `vite preview`
tests-variants/      run against build/browser-extension and build/ide-extension
tests-extension/     run against the loaded WXT extension (.output/chrome-mv3)
```

`selectors.ts` and `app.ts` exist so specs read as behaviour. Each awkward
selector carries a comment explaining *why* the obvious approach does not work,
so nobody "simplifies" it back into something that silently matches nothing.

## Running

Playwright is not part of the monorepo dependencies. Install it here once:

```bash
cd e2e && npm ci        # also runs `playwright install chromium`
```

Then, from the repo root:

```bash
yarn e2e            # dev-server suite (Playwright starts the server itself)
yarn e2e:preview    # production-preview suite (needs a built website first)
yarn e2e:variants   # extension build variants (needs yarn e2e:build:variants first)
yarn e2e:extension  # the WXT extension, loaded for real (needs yarn e2e:build:extension)
yarn e2e:all        # all four
yarn e2e:typecheck  # tsc --noEmit over the specs
```

Or from `e2e/`: `npm test`, `npm run test:preview`, `npm run test:headed`,
`npm run test:ui`, `npm run report`.

The preview suite serves `build/website`, so build it first:

```bash
yarn workspace @aws/threat-composer-app run compile:website
```

To run against a server you already have up, skip Playwright's own:

```bash
TC_BASE_URL=http://localhost:3000 npx playwright test
```

### The extension build variants

`vite build` produces three artifacts from one config. The variant suite covers
the two that are embedded rather than hosted:

```bash
yarn e2e:build:variants   # builds build/browser-extension and build/ide-extension
yarn e2e:variants
```

Build them with `yarn e2e:build:variants`, not a bare `yarn build`. CI's
`deploy.yml` sets `VITE_ROUTE_BASE_PATH=/threat-composer` and
`VITE_GITHUB_PAGES=true` for `yarn build`, which runs *all three* compile targets
— so a plain `yarn build` puts a basename on the extensions' memory router and
enables a GitHub Pages banner. The artifact under test would not be the one the
extensions ship. `e2e:build:variants` strips those vars with `env -u`.

Each variant is served at its own **server root** (ports 4180 and 4181) because
both are compiled with `base: '/'`, so their asset URLs are absolute — mounting
under a sub-path 404s everything. Don't pick ports 5060/5061: Chromium blocks
them as SIP ports and every navigation fails with `net::ERR_UNSAFE_PORT`.

Nothing in `tests/` or `tests-preview/` can be reused, because these builds use a
**MemoryRouter**. The address bar never changes, `page.goto(deepLink)` is
meaningless, and `page.reload()` throws away all router state. Every spec in
`tests-variants/` navigates by clicking. The side nav's active-item highlight is
*not* a usable signal either: items carry relative hrefs (`threats`) while
`activeHref` comes from `location.pathname` and is absolute, so they never match
and `aria-current` is set on nothing. Verified in both variants — assert on
rendered content instead.

### The browser extension, loaded for real

```bash
yarn e2e:build:extension   # browser-extension variant, then wxt build
yarn e2e:extension
```

Follows [Playwright's Chrome extensions guide](https://playwright.dev/docs/chrome-extensions).
Four things about it are non-obvious:

- Extensions require `chromium.launchPersistentContext`, so the browser is
  launched by the `context` fixture in `fixtures/extension.ts`, not by a
  `projects` device preset. `channel: 'chromium'` is what makes extensions work
  **headless**; Chrome and Edge removed the side-loading flags entirely.
- The extension id is not fixed. Chromium derives it from the unpacked path, so it
  is read at runtime from the MV3 service worker's URL and the tests assert its
  shape, not its value. WXT generates `background.js` itself — `wxt.config.ts`
  declares no background script, but the built manifest has one.
- **The fixture pages must be served for real.** The content script does not fetch
  the raw file; it asks the background service worker to, and `page.route` does
  not intercept service-worker requests. With a routed fixture the background
  fetch fails silently, `sendResponse(null)` fires, and the button never enables.
  `scripts/serve-extension-fixtures.mjs` serves fake host pages instead.
- **Do not assert on `onclick`.** Content scripts run in an isolated world, and an
  event-handler property assigned there is not reflected into the main world that
  `page.evaluate` sees — it reads back `null` even after the extension has wired it
  up. Assert on `disabled` / inline `style.pointer-events`, which are real DOM
  state and are visible across worlds. `expectButtonEnabled()` handles the
  tag-dependent difference: GitHub and the raw-file path build a `<button>`,
  GitLab / Bitbucket / Amazon Code build an `<a>`.

Two fixture shapes are dictated by the handlers rather than chosen:
Bitbucket derives its raw URL from `location.pathname` (dropping the first two
segments and rewriting `src/` to `raw/`), so its fixture URL must be
`/<workspace>/<repo>/src/<branch>/<file>`; and its template must contain **no
whitespace** between the action-button elements, because insertion reaches the
inner node with `clone.childNodes[0].childNodes[0]` and indentation makes that a
text node. When that happens the handler throws, swallows the error, and the
button simply never appears.

### The app under test is the BUILT library, not library source

`@aws/threat-composer` resolves through the workspace symlink to
`packages/threat-composer/lib/index.js` — there is no Vite alias back to `src`.
So **editing `packages/threat-composer/src/**` has no effect on a running dev
server.** After changing library source you must recompile it:

```bash
yarn workspace @aws/threat-composer run compile
```

and restart the dev server (clear `node_modules/.vite` if the change still does
not show up). This is good for fidelity — the suite exercises the artefact that
actually ships — but it is an easy way to waste an hour wondering why an edit
changed nothing.

## Seeing what the tests actually did

A green suite is not evidence on its own. These are the ways to inspect it,
roughly best-first.

### UI mode — the one to reach for

**UI mode is per-config.** There are four configs, and `--ui` only ever shows the
tests belonging to the one it was given. A bare `npm run test:ui` uses the default
`playwright.config.ts`, so it shows the dev suite *only* — the preview, variant and
extension tests are simply absent, which looks like they have gone missing.

```bash
yarn e2e:ui             # dev suite (tests/)
yarn e2e:ui:preview     # production preview (tests-preview/)
yarn e2e:ui:variants    # both extension build variants (tests-variants/)
yarn e2e:ui:extension   # the loaded browser extension (tests-extension/)
```

Each of these starts whatever server its config needs, but the same build
prerequisites apply as for the headless runs: `yarn e2e:build:variants` before the
variant UI, `yarn e2e:build:extension` before the extension UI.

Pick any test and step through it. For each action you get the DOM snapshot as
it was at that moment (inspectable with real devtools), the before/after
screenshots, the network log, the console, and the exact locator used. It also
watches files and re-runs on save, and has a locator picker for writing new
assertions. This is the fastest way to confirm a test is really doing what its
name claims.

### Watch it drive a real browser

```bash
yarn e2e:headed                      # whole suite, visible
cd e2e && npx playwright test status-and-tags --headed --workers=1
```

Add `--workers=1` or the parallel windows are unwatchable. Note the suite forces
`reducedMotion: 'reduce'`, so Cloudscape animations are suppressed — it will look
snappier than the real app.

### Do not run UI mode and the CLI suite at the same time

Both drive the same Vite dev server on :3000, and the contention is enough to
roughly double wall-clock time: the full suite measured 1.5 min alone and 2.8 min
with UI mode also running; `packs --repeat-each=8` went from 46 s to 2.1 min. The
`expect` timeout is 15 s, so a heavy page under that load can cross it and fail
for no reason other than the load. If tests look flaky in UI mode, check nothing
else is hitting the dev server first.

`packs.spec.ts` is the most exposed to this — the pack detail page renders a
paginated 37-row table off a 152 KB JSON module, the heaviest page in the suite.

### Trace viewer — post-mortem of a run

By default artefacts are only kept on failure, and since `retries` is 0 locally
`trace: 'on-first-retry'` means **traces are never recorded on a passing local
run**. To force them:

```bash
cd e2e && npm run test:trace -- journey-threat-model
npm run trace test-results/<test-dir>/trace.zip
```

`test:trace` sets `TC_CAPTURE=1`, which turns trace, video and per-step
screenshots on for every test in both configs. The journey spec alone records
~200 actions with a screenshot and DOM snapshot at each one.

### HTML report

```bash
yarn e2e:report      # or: cd e2e && npm run report
```

Written to `playwright-report/` on every run. Failures embed the screenshot,
video and trace inline.

### Step through with the inspector

```bash
cd e2e && npm run test:debug -- status-and-tags
```

Pauses before each action so you can evaluate locators live.

## Proving the suite would catch a regression

The useful question is not "does it pass" but "does it fail when the app
breaks". Two worked examples, both reverted afterwards. Remember to recompile
the library and restart the dev server between each (see above).

**1. Silent status data loss.** In
`packages/threat-composer/src/components/threats/ThreatStatementList/index.tsx`,
in `handleUpdateStatementStatus`, change `status,` to `status: statement.status,`
— the save still runs, nothing throws, but the new status is dropped.

Result: 1 of 11 tests in `status-and-tags.spec.ts` fails —
`threat status › can be changed from the card badge and survives a reload`, with
`waiting for ... getByRole('button', { name: 'Resolved' })`. The
editor-Metadata status test still passes, correctly, because that path uses a
different handler. Note `tsc` also catches this one via `noUnusedParameters`.

**2. Inverted sort order.** In the same file, in the `else` branch of the sort,
swap `op1`/`op2`:
`output.sort((op1, op2) => (op1.numericId || Number.MAX_VALUE) - (op2.numericId || Number.MAX_VALUE))`.

Result: `tsc` and eslint are both clean — this mutation is invisible to static
analysis. 2 of 12 tests in `filters-and-sorting.spec.ts` fail
(`defaults to Id descending, and Ascending reverses it`, and
`sorting survives filtering`). All 8 filter tests and the Priority-sort test
still pass, because only the Id comparator was touched.

**3. Extension variants (needs a variant rebuild, see above).** Two mutations
were verified against `tests-variants/`:

- Drop the guard in `packages/threat-composer-app/src/index.tsx` so it reads
  `serviceWorkerRegistration.register()` instead of
  `!isMemoryRouterUsed() && serviceWorkerRegistration.register()`. Rebuild the
  ide-extension variant and **all 16** of its tests fail, because the app enters
  an infinite reload loop: `checkValidServiceWorker` fetches a
  `/service-worker.js` that the extension build never emits, gets a 404,
  unregisters, and calls `window.location.reload()`. The named failure is
  `the bundle should never fetch service-worker.js`, which recorded three
  requests for it. One deleted guard bricks the whole IDE bundle.

- In `packages/threat-composer/src/hooks/useWorkspaceStorage/index.ts`, change
  `if (appMode === APP_MODE_IDE_EXTENSION)` to
  `if (false && appMode === APP_MODE_IDE_EXTENSION)`. Clean under `tsc`. Exactly
  the two storage tests fail, listing the 12 `ThreatStatementGenerator.*` keys
  that leaked into localStorage — the data-leak regression that spec exists for.

**4. Browser extension.** In
`packages/threat-composer-app-browser-extension/src/entrypoints/content-script/utils/core-utils.ts`,
change `isLikelyThreatComposerSchema` to `return JSONobj ? true : false`. Clean
under `tsc`. Rebuild with `yarn e2e:build:extension` and exactly one test fails —
`JSON without a schema key leaves the button disabled` — which is the guard that
stops the extension offering to open arbitrary JSON as a threat model. The
"content that is not JSON at all" test correctly still passes, because
`JSON.parse` throws before the check is reached.

Other one-line mutations worth trying: swap `removeTagFromEntity` for
`addTagToEntity` in `handleRemoveTagFromStatement` (tag removal silently
no-ops); change `if (sortBy.ascending)` to `if (!sortBy.ascending)`; negate the
status filter predicate; or drop a `contentAriaLabel` prop, which should trip
the canary in `selector-contract.spec.ts` rather than a functional test.

## What is covered

| Area | Spec | What it guards |
|---|---|---|
| **Console errors** (highest signal) | `fixtures/console-guard.ts`, auto-used by every spec | Every migration bug surfaced in the console, not the build — `global is not defined`, value-erased enums, blanked routes. |
| Full user journey | `tests/journey-threat-model.spec.ts` | One user builds a complete threat model from an empty workspace across 13 stages and exports it. The accumulated state is the assertion. |
| Boot & styling | `tests/smoke.spec.ts` | The app renders; Cloudscape's side-effect CSS import took effect. |
| Every lazy route | `tests/routes.spec.ts` | Each route renders a heading only *it* produces, so a test cannot pass on the shared shell. Side-nav reachability, both pack detail routes, `threats/:threatId` with a real UUID, `/preview/:dataKey`. |
| Workspaces | `tests/workspaces.spec.ts` | Create, duplicate-name rejection, rename, clone, delete and data removal (both friction dialogs), isolation between workspaces, read-only Example workspace. |
| Status, tags, comments | `tests/status-and-tags.spec.ts` | Threat status from the card badge *and* the editor; the separate four-value mitigation status set; tag add/remove on all three entity types with reload checks; Comments metadata (which is the entire Metadata section on assumptions and mitigations). |
| Filters & sorting | `tests/filters-and-sorting.spec.ts` | All ten threat filters including the three "Not Set" sentinels, AND-across / OR-within combination, `Clear filters`, and `Sort by` Id/Priority × Ascending/Descending (unset priority ranks lowest). |
| Insights drill-downs | `tests/insights-dashboard.spec.ts` | Accurate counts, and the cross-page contract where a figure navigates to a list with its filter pre-applied via `initialFilter`. |
| Print / preview & images | `tests/preview-and-content.spec.ts` | The real Print handoff (localStorage → new tab → rendered model), the import modal's Preview, and the diagram image controls including URL validation and upload. |
| Dark mode | `tests/theme.spec.ts` | `applyMode(Mode.Dark)` takes effect, persists across reload, and survives navigation. `Mode` is a runtime enum, so this is in the value-erasure risk class from the `import type` codemod. |
| Threat editor | `tests/threat-editor.spec.ts` | The guided grammar composer: token-driven field editors, random example, start over, metadata, custom template, duplicate, edit, remove, filtering. |
| Assumptions & mitigations | `tests/assumptions-mitigations.spec.ts` | CRUD for both, and the linking model — including creating an entity from a link field and the linked-entity filters. |
| Reference packs | `tests/packs.spec.ts` | Pack list → detail, bulk add to workspace, already-imported rows locked, referenced counts. |
| Brainstorm | `tests/brainstorm.spec.ts` | Enter-to-capture, hover-revealed actions, promotion into real assumptions/mitigations, create-threat-from-idea, column toggles. |
| Persistence | `tests/persistence.spec.ts` | Reload survival, remembered workspace, context isolation, full export/import round trip, malformed-JSON handling. |
| Static assets & CSS | `tests/assets-and-css.spec.ts` | Library PNG/GIF imported as URLs load; side-effect CSS resolved. |
| Import + markdown | `tests/import-and-markdown.spec.ts` | `sanitizeHtml` never reaches the throwing **postcss stub**. |
| Word export | `tests/word-export.spec.ts` | The `define: { global: 'globalThis' }` fix — packing a `.docx` needs `global`. |
| Markdown editor | `tests/markdown-editor.spec.ts` | `@mdxeditor/editor` (heavy ESM) pre-bundles and mounts. |
| Production behaviour | `tests-preview/production-interaction.spec.ts` | The same critical paths against the **minified Rollup bundle**, which is not the artifact the dev server serves. |
| Service worker | `tests-preview/service-worker.spec.ts` | Registers only in `PROD`. |
| Build layout | `tests-preview/build-artifacts.spec.ts` | The bundle keeps CRA's `static/{js,css,media}` layout, which the browser extension's copy step depends on. |
| GitHub Pages deep links | `tests/github-pages-rewrite.spec.ts` | The `404.html` `?/…` → `~and~` rewrite. Skipped unless run against a `VITE_GITHUB_PAGES` build — see the header comment in that file. |
| Extension variant contract | `fixtures/variants.ts` (runs under both projects) | The MemoryRouter build actually boots and works: no service worker is registered *or requested*, every side-nav screen renders, the address bar never changes, reload resets the router, workspace mode is singleton, print/download are hidden, and a threat can be created by clicking. |
| browser-extension build | `tests-variants/browser-extension.spec.ts` | `Export data` is the primary action, the theme toggle works, and both the theme and workspace content **are** persisted to localStorage and survive a reload. |
| ide-extension build | `tests-variants/ide-extension.spec.ts` | `Save` replaces `Export data`, the theme toggle is absent, the host's `<meta name="dark-mode">` drives the theme (true/false/absent), and **nothing** about the workspace or theme reaches localStorage — so a threat model cannot leak into the IDE's browser profile. |
| Extension install & popup | `tests-extension/extension-shell.spec.ts` | The extension installs, its MV3 service worker runs, the popup renders all five integration toggles plus debug and Restore defaults, changes persist to extension storage, each per-integration settings view is reachable and shows its shipped patterns, and the bundled viewer boots. |
| Extension content script | `tests-extension/content-script.spec.ts` | The whole four-hop pipeline against fake GitHub, GitLab, Bitbucket and Amazon Code pages plus a raw `<pre>` view: the button is injected, stays disabled until the background fetch returns JSON carrying `schema`, and clicking it stores the model and opens the bundled viewer with content loaded. Plus the negatives that matter — wrong file extension, out-of-scope origin, disabled integration, schema-less JSON, non-JSON — and that config (`urlRegexes`, `fileExtension`) really drives matching. |

## Known defects recorded by the suite

**Workspace clone loses all content.** `tests/workspaces.spec.ts` marks
`cloning a workspace copies its content` with `test.fail()`. This is a real,
pre-existing upstream bug, not a migration regression:
`hooks/useCloneWorkspace` awaits `addWorkspace()` first, and `handleAddWorkspace`
switches the current workspace, so the `getWorkspaceData()` on the next line
reads the brand-new empty workspace and the clone is written as empty arrays.
Fix: capture the data *before* creating the workspace. Playwright reports an
unexpected pass once that happens, prompting removal of the annotation.

The console guard also carries two allow-listed React dev warnings
(`ReactDOM.render` legacy API, and a missing `key` in `ThreatModelView`). Both
were verified against `origin/main` and are absent from the production bundle.
See the comments in `fixtures/console-guard.ts` for the fixes.

**Image upload logs a CSP violation.** `browser-image-compression` tries to run in
a Web Worker created from a `blob:` URL, which the app's own CSP forbids
(`script-src 'self'` with no `worker-src`). The library falls back to the main
thread, so uploading a diagram *does* work — but the browser logs the refusal. The
CSP is byte-identical to `origin/main`, so this is pre-existing. Allowed narrowly,
per-test, in `tests/preview-and-content.spec.ts`; adding `worker-src blob:` to the
CSP would remove it. Note the SVG upload test deliberately does *not* allow it,
since that path skips compression and should stay clean.

## Selector policy

Roughly 92% of the suite matches on accessible names and visible text
(`getByRole`, `getByLabel`, `getByPlaceholder`), which is stable across builds.
React's generated ids (`:r17:`, `formField:r1r:`) are **never** used — they change
between renders. Preference order when writing a new selector:

1. Role / label / text
2. Repo-owned hooks — `#WorkspacesSelect` (an explicit `controlId`), `#root`,
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

- **Animations are suppressed** (`stillPage` fixture + `reducedMotion: 'reduce'`).
  This is load-bearing, verified by control experiment: with animations on, the
  autosuggest tests fail with `locator.click` timeouts because Cloudscape dropdowns
  move while the surrounding list reflows. Fixing the movement at source is what
  let the autosuggest helpers drop a retry loop, a forced click and keyboard index
  arithmetic in favour of a plain click.
- **`reuseExistingServer` can mislead the preview suite.** If a dev server is
  already on :3000, `vite preview` reuses it and the preview specs silently test
  the dev server instead of the built bundle. `tests-preview/build-artifacts.spec.ts`
  catches this (it asserts the `static/js` layout), but the failure reads oddly at
  first. Stop any dev server before `yarn e2e:preview`.
- **Clipboard permissions** are granted in both configs. "Copy as Markdown" calls
  `navigator.clipboard.writeText`, which headless Chromium otherwise rejects with
  an uncaught page error — a false positive for the console guard, and it would
  hide the real assertion about what was copied.
- **Workspace names must not contain spaces** in tests: a space is
  percent-encoded into every subsequent URL. `uniqueWorkspaceName()` handles this.
- **Each test gets a fresh browser context**, so localStorage starts empty and
  the suite is safe to run in parallel. `tests/persistence.spec.ts` asserts this.
- **The dev server registers no service worker** and sets no `VITE_APP_MODE`.
  Anything production-only belongs in `tests-preview/`.
- **Node / Vite pinning.** The repo pins Vite to 6 (root `resolutions`) because
  Vite 7 needs Node ≥ 20.19. Don't unpin without bumping Node.
- **Not wired into the git hooks.** `pre-push` already runs a full build; adding
  browser tests would make every push considerably slower. CI runs them instead,
  in a dedicated `e2e` job (see `.github/workflows/build.yml`).

## Still uncovered

- The CodeCatalyst integration. It is the one handler with no coverage: unlike the
  other four it needs a page script injected into the host page
  (`scriptInjectForCodeCatalyst.js`) which scrapes an Ace editor session and
  writes a hidden `#raw-div`. Faking that convincingly needs an Ace instance, so
  it is better served by unit tests over the handler.
- The Firefox MV2 build (`.output/firefox-mv2`). Playwright cannot side-load
  extensions in Firefox.
The extension's pure logic is covered by unit tests inside that package rather
than here — `yarn workspace @aws/threat-composer-app-browser-extension test`,
67 tests over `core-utils`, `spa-utils`, `raw-file-utils`, `config` and
`debugLogger`. Two constraints are recorded in its `vitest.setup.ts`: test files
must use STATIC imports, and `wxt/testing`'s `fakeBrowser` is deliberately not
used, both because loading esbuild inside jsdom fails on a `TextEncoder`
invariant.
- Storybook (`build/storybook`).
- Visual regression: styling is checked functionally (computed backgrounds,
  stylesheet presence, images loading) rather than by screenshot comparison.
