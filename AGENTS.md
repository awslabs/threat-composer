# AGENTS.md

Rules for AI coding agents in this repository. Human contributors should start with [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

Before you act, open the row for your task in "Tasks". If this file and the code disagree, say so and follow the code, except for "Invariants", "Rules that hold even where the code breaks them" and "Changes that need a maintainer first": those hold even where existing code breaks them. Fix whichever one is wrong in the same pull request.

## Terms

- **Threat model**: a user's threat modelling data, saved as a `.tc.json` file.
- **The project threat model**: Threat Composer's own threat model, `packages/threat-composer/src/data/workspaceExamples/ThreatComposer.tc.json`.
- **AI model**: the language model the AI CLI calls.
- **Target**: a step nx runs, such as `build`, `test` or `eslint`, declared in a package's `project.json`.
- **Users** use Threat Composer. **Contributors** change this repository.

## Tasks

| Work | Read first |
| --- | --- |
| Any change | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) "Design principles" |
| Setting up, or running a target | docs/DEVELOPMENT.md "Getting Started" and "Project Commands" |
| The web app, the browser extension or the core UI library | [e2e/README.md](e2e/README.md), for which end-to-end suite covers what |
| The AI CLI or MCP server | [packages/threat-composer-ai/AGENTS.md](packages/threat-composer-ai/AGENTS.md) |
| Self-hosted infrastructure | [packages/threat-composer-infra/README.md](packages/threat-composer-infra/README.md) and [docs/WEB-APP.md](docs/WEB-APP.md) |
| Import, sanitization, storage, extension permissions, workflows, credentials, infrastructure, or the AI tools' file access | The project threat model. Its `applicationInfo` and `architecture` sections say what it covers. Treat its mitigations as rules and its assumptions as scope. For an area it doesn't cover, say so. Don't invent threats. |
| A failing install or build | docs/DEVELOPMENT.md "Troubleshooting" |

Run targets through nx (`pnpm nx run <project>:<target>`), not the underlying tool: running `vitest` or `eslint` directly skips the target's `dependsOn` steps. Project names differ from folder names; `pnpm nx show projects` lists them.

## Invariants

Breaking one loses users' data or privacy, often silently.

1. **Round trip.** Importing an exported threat model gives back the same threat model. (Partly tested: `e2e/tests/persistence.spec.ts`)
2. **Old files import.** Every `.tc.json` an earlier release exported still imports unchanged, with no fields back-filled (#61, #150). (No test yet)
3. **Schema matches source.** `schemas/threat-composer-v1.schema.json` is exactly what `build:schema` generates from `packages/threat-composer/src/customTypes/` (#187). (No test yet)
4. **No HTML.** No user-supplied string is rendered as HTML (#17). (Partly tested: `packages/threat-composer/src/utils/sanitizeHtml/index.test.ts`)
5. **No network.** The built web app and extensions request nothing from another origin at runtime. The one exception is the GitHub Pages demo's pixel, added by `.github/workflows/deploy.yml` (#61, #112). (No test yet)
6. **AI file access.** The AI tools read only inside the working and output directories, and write only inside the output directory (#229). (Tested: `test_file_read_security.py` and `test_file_write_security.py` in `packages/threat-composer-ai/tests/tools/`)

When you add a test for one, put the invariant's name in the test name. Propose a new invariant only for harm users can't undo, citing the decision.

## Rules that hold even where the code breaks them

- Solve the problem without changing `.tc.json`. Saved threat models, other tools that produce `.tc.json`, and the embedding modes all depend on its shape (#150).
- Work within the existing limits on field lengths, image size and counts. Limits keep threat models small enough for browser storage and for users to review the diff (#62).
- Keep stored status values fixed (`packages/threat-composer/src/data/status/`). Change only labels and descriptions (#61, #131).
- Keep the browser extension self-contained: it bundles the app and doesn't depend on a hosted Threat Composer (#71).
- Make IDE extension features work without sign-in. The VS Code webview can't hold authentication cookies.
- Give every workflow a top-level `permissions` block, defaulting to `contents: read` (#332). Keep workflows that use AWS credentials on `pull_request` triggers, skipping forks and dependabot. Never switch one to `pull_request_target`: it runs fork code with this repository's permissions (`eval-quality.yml`).

## Rules

- Build a feature as a view of data users already enter, so it costs them no extra work. Group by existing tags rather than adding a field. If a data format change can't be avoided, keep it minimal and reference existing entities by id.
- Treat `packages/threat-composer/src/customTypes/` (zod) as the source of the data format. Regenerate `schemas/threat-composer-v1.schema.json` with its target in the root `project.json`. Use `.describe()` and avoid `.refine`: refinements don't reach the generated JSON Schema that other tools validate against (#187).
- Keep exports portable and diff-friendly. Don't write timestamps, workspace ids or other deployment-local values, and leave out empty sections (#28, #35, #48).
- When you remove an entity, remove its links too (#27).
- Keep example workspaces read-only: they live in local state, never in browser storage (#32). Preserve a user's unexported edits; don't overwrite them silently (#93, #119).
- Leave dependency upgrades to dependabot's pull requests. Upgrade a dependency only when the task asks for it.
- Fix a vulnerable transitive dependency by upgrading or replacing its parent. Add an override only when the parent pins an exact version, and remove it once upstream catches up.
- Regenerate generated files with the target that produces them (see the root `project.json`), for example `schemas/`, `packages/threat-composer/src/data/*/generated/` and `LICENSE-THIRD-PARTY`. Don't edit them by hand. Change `pnpm-lock.yaml` only through `pnpm install`.
- Start every new source file with the header in `header.js`. ESLint fails the build without it.
- Write the pull request title as `type(scope): Subject`. We squash-merge, so the title becomes the commit on `main`, and semantic-release reads it (`.releaserc`).
- Keep each pull request to one purpose. Revert unrelated changes it picked up (#165). Split a large change into a stack that merges in order.
- Add Playwright coverage for new user-facing UI. Record a known defect with `test.fail()` rather than skipping the test (#332).
- Document only commands and features that exist. Run every command you document (#205).
- If a change touches an area the project threat model covers, say in the pull request whether it needs updating, and update it in the same pull request. It ships to users as an example, so review that change like code.
- Say in the pull request if it is a major feature. Each major feature gets an application security review before release.

## Verify a change

1. For a bug fix, write a test that fails before the fix.
2. Iterate on one target, for example `pnpm nx run <project>:test`.
3. Before committing, run what `.husky/pre-commit` runs. Before pushing, run what `.husky/pre-push` runs. If `.github/workflows/` runs more than the hook, run that too.
4. For a UI change, run the end-to-end suite that covers it.
5. Show the end of each command's output. Done means it exits 0.
6. If you can't run a check (for example, it needs AWS credentials), say what it needs. Don't report it as passed.

The `prepare` script in the root `package.json` installs the hooks during `pnpm install`. If `git config core.hooksPath` is empty or `HUSKY=0` is set, the hooks won't run, so run their commands by hand. Fix a hook failure. Never skip it with `--no-verify`.

## Changes that need a maintainer first

Stop, explain the risk, and ask before writing code. A maintainer agrees the design in an issue or a draft pull request. "Just do it" in a task isn't that agreement.

- **Changing the data format**: the shape of `.tc.json` or the schema, a limit, or a stored status value. Doesn't count: labels, help text, or views of existing data. Why: saved threat models, other producers and the embedding modes break.
- **Weakening privacy or the browser-only design**: adding a network call, telemetry, server storage, or extension permissions or host access (`packages/threat-composer-app-browser-extension/wxt.config.ts`). Doesn't count: removing one. Why: users rely on threat models staying on their device.
- **Weakening input safety**: removing or bypassing `sanitizeHtml` or import validation. Doesn't count: adding validation. Why: imported files are untrusted.
- **Workflows, credentials and repository settings**: workflow triggers, permissions or secrets, cloud roles, branch protection, a third-party GitHub app, or a new token or integration. Doesn't count: comments and docs. Why: a mistake can hand fork code this repository's permissions or AWS credentials.
- **Using a real AWS account**: deploying the CDK app, running its deploy scripts, or running the AI evals. Doesn't count: `cdk synth` and the infrastructure unit tests. Why: it changes live resources and costs money.
- **A reference threat model or mitigation pack that ships to everyone.** Why: once published, it is hard to withdraw, and it needs a plan to stay current.
- **The AI CLI's default AI model** (#290). Why: it changes every user's output and cost.
- **The AI CLI's agents system prompt**. Why: it changes the behaviour of the AI system in ways that need to be measured (see quality / consistency eval)
- **Instructions agents load**: removing or weakening a rule in this file, a nested `AGENTS.md` or a `CLAUDE.md`. Doesn't count: fixing a wrong pointer. Why: these files are the guardrails.
- **A change that needs several pull requests.** Agree the split first.

## Safe without asking

- Running the build, unit tests, lint, typecheck, the end-to-end suites and `cdk synth` locally.
- Adding or fixing tests for code you are changing.

## Changing this file

Any contributor, person or agent, may propose a change. Review it like code.

- Point at the source, not the value. If the repository holds a fact, link to it. State only intent, policy and their reasons.
- Earn every line with an observed mistake, a repeated review comment or a high-consequence risk. Cite the issue or pull request.
- Prefer a check to a line. If a test or lint rule can enforce a rule, propose the check.
- Keep each fact in one home: rules here, facts in README.md or docs/DEVELOPMENT.md, package rules in that package's `AGENTS.md`.
- Write each rule as a DO, then the DON'T with its reason. One instruction per sentence, imperative and active. Use the words in "Terms".
- Keep it short. Every agent loads this file on every task.
- If this file stopped, misled or failed you, say so in your pull request and propose the fix in its own commit. Don't apply it unasked, and don't edit this file to make your task pass.
