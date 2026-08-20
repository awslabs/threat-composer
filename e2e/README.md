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
  data/              import fixtures
tests/               run against the Vite dev server
tests-preview/       run against the production build via `vite preview`
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
yarn e2e:all        # both
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

## What is covered

| Area | Spec | What it guards |
|---|---|---|
| **Console errors** (highest signal) | `fixtures/console-guard.ts`, auto-used by every spec | Every migration bug surfaced in the console, not the build — `global is not defined`, value-erased enums, blanked routes. |
| Full user journey | `tests/journey-threat-model.spec.ts` | One user builds a complete threat model from an empty workspace across 13 stages and exports it. The accumulated state is the assertion. |
| Boot & styling | `tests/smoke.spec.ts` | The app renders; Cloudscape's side-effect CSS import took effect. |
| Every lazy route | `tests/routes.spec.ts` | Each route renders a heading only *it* produces, so a test cannot pass on the shared shell. Side-nav reachability, both pack detail routes, `threats/:threatId` with a real UUID, `/preview/:dataKey`. |
| Workspaces | `tests/workspaces.spec.ts` | Create, duplicate-name rejection, rename, clone, delete and data removal (both friction dialogs), isolation between workspaces, read-only Example workspace. |
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

- The `ide-extension` build variant (memory router + `<meta name="dark-mode">`).
- The WXT browser extension loaded as a real Chromium extension.
- Storybook (`build/storybook`).
- Visual regression: styling is checked functionally (computed backgrounds,
  stylesheet presence, images loading) rather than by screenshot comparison.
