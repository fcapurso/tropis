# Manual verification log

Outcomes of checks only a person can perform. Every entry names its kind; the kinds this
project uses are listed in `.claude/commands/manual-check.md`.

A check that is not recorded did not happen — including the ones that passed and the ones
that were skipped. Each entry is written **before** anyone runs it, with the result
`pending`, so a check nobody came back to is visible rather than forgotten. Drafted and
recorded through `/manual-check`. Newest first.

## Entry template

```markdown
### YYYY-MM-DD — <what was checked> (<kind> | <kind> + <kind>)

- **Change:** `plan/<branch>` at `<short sha>`, <where it runs>
- **Pre-conditions:** <what must exist before step 1>

| # | Step | Expected |
|---|---|---|
| 1 | <action> | <what the person should see> |

- **Result:** pending · pass · fail — step N: <what was seen instead> · skipped — <why>
- **Notes:** observed by <who>; anything unexpected
- **Closes:** `<catalog id>` — "<criterion text>" · or none

#### Round 2 — YYYY-MM-DD — <what changed since round 1>

<same fields; earlier rounds are never edited>
```

## Entries

### 2026-10-27 — A release rehearsed on a candidate (Screen)

- **Change:** release candidate at `a6db79a`, `plan/release-is-rehearsed-on-a-candidate`, private repository `fcapurso/tropis-pipeline-probe`, opened in a browser while signed in to that GitHub account
- **Pre-conditions:** the four runs below already finished. Nothing to push or re-run. The repository is private, so the pages 404 until you are signed in. Leave pull requests 2, 3 and 4 open. Leave the tag `v0.0.1`.

| # | Step | Expected |
|---|---|---|
| 1 | Open the run with no release yet: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40438137714 | The stage jobs (`framework`, `sanity`, `unit`, `integration`, `end-to-end`) passed, then `rehearse` passed. The run summary has a *Release candidate* section: candidate `0644a765ff6065e01f7031b330725934e679d9a1`, reset `not needed — no release yet`, deploy `deployed`, and by hand `Approve the new permissions on the pre-production install`. |
| 2 | Open the run after `v0.0.1` was tagged: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40438587388 | The same stage jobs passed, then `rehearse`. The summary names candidate `0644a765ff6065e01f7031b330725934e679d9a1`, reset `to v0.0.1`, deploy `deployed`, and the same by-hand line. |
| 3 | Open the run of the older commit, started after a later commit was pushed: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40438677792 | The summary names candidate `0644a765ff6065e01f7031b330725934e679d9a1`, not the later head `c6285d9c9e0f7ca8d729f17f5b33dc003f22604e`. Reset is `to v0.0.1`, deploy `deployed`, and the same by-hand line. |
| 4 | Open the run whose unit script exits 1: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40438770878 | `unit` failed. `rehearse` is marked skipped. |

- **Result:** pass
- **Notes:** observed by the developer, 2026-10-27, from the four run pages. Run 1 succeeded in 38s: the stage jobs passed, then `rehearse`, and the summary named candidate `0644a765ff6065e01f7031b330725934e679d9a1`, reset `not needed — no release yet`, deploy `deployed`, and by hand `Approve the new permissions on the pre-production install`. Run 2 succeeded in 39s with the same candidate, reset `to v0.0.1`, deploy `deployed`, and the same by-hand line. Run 3 succeeded in 38s; the page's commit is `c6285d9` and the summary still names candidate `0644a765ff6065e01f7031b330725934e679d9a1`, reset `to v0.0.1`. Run 4 failed in 24s: `unit` completed with exit code 1, and `rehearse` shows 0s and did not run.
- **Closes:** `release-is-rehearsed-on-a-candidate` — "A release-candidate step, for a chosen commit, runs every stage, puts the pre-production environment back on the version production runs, deploys the candidate, and says whether anything must be upgraded by hand. It sets no version and makes no tag."

### 2026-10-25 — A pull request's own environment (Setup)

- **Change:** `plan/deploy-stage-offers-an-environment-per-branch` at `e65e653`, private repository `fcapurso/tropis-pipeline-probe`, opened in a browser while signed in to that GitHub account
- **Pre-conditions:** the runs below already finished. Nothing to push or re-run. The repository is private, so the pages 404 until you are signed in. Leave pull requests 2, 3 and 4 open. The queue was pushed twice; judge the second attempt, linked below. The first attempt dropped one of three pushes and cancelled nothing.

| # | Step | Expected |
|---|---|---|
| 1 | Open the pull request that was opened, not merged: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40201931774 | `branch-create` passed and its log contains `created feature-try-it`. `deploy` passed and its log contains `deployed feature-try-it`. The gate's summary says the deploy will run to the branch's environment. |
| 2 | Open the three queue runs from the second attempt, in order: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202391891 , https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202398637 , https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202405467 | The middle run's `deploy` is cancelled and has no steps. The first and last `deploy` jobs passed, their times do not overlap, and the last log contains `deployed feature-try-it`. |
| 3 | Open the close of that pull request, without a merge: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202681645 | `branch-remove` passed and its log contains `removed feature-try-it`. `framework`, `sanity`, `unit`, `integration`, `end-to-end`, `gate` and `deploy` are skipped. |
| 4 | Open the close of the pull request that was merged: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202971277 | `branch-remove` passed and its log contains `removed feature-second`. The stage jobs are skipped. |
| 5 | Open the push to `main` from that merge: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40202970501 | `deploy` passed, its log contains `deployed shared`, and it ran `run deploy`. `branch-create` and `branch-remove` are skipped. |
| 6 | List runs for branch `no-pr`, commit `6167c48`: `gh run list --repo fcapurso/tropis-pipeline-probe --branch no-pr` | No run. |

- **Result:** pass
- **Notes:** observed by the developer, 2026-10-25, from the run pages. In the order they named: #20 (close without a merge) plan and branch-remove passed and the other jobs are skipped; #23 (close of the merged pull request) the same; #24 and #26 (first and last of the second queue attempt) succeeded, with deploy green and the summary saying the deploy will run to the branch's environment; #25 (the middle of that attempt) is cancelled, with the annotation "The operation was canceled."; #29 (the opened pull request) branch-create and deploy passed and the summary says `will run — to the branch's environment`; #28 (the push to main) deploy passed, branch-create and branch-remove are skipped, and the summary says deploy `will run`. Step 6, `gh run list` for `no-pr`, printed `no-pr` and `no runs found`. The echo lines in the job logs (`created feature-try-it`, `deployed feature-try-it`, `removed feature-try-it`, `removed feature-second`, `deployed shared`) were read with `gh run view --log` while the probe ran.
- **Closes:** `deploy-stage-offers-an-environment-per-branch` — "Opening a pull request creates its branch's environment, every push whose stages all passed deploys to it, and closing the pull request, merged or not, removes it; a branch with no pull request gets none." and "Two deploys to one environment never run at once; a waiting deploy is replaced by a newer one." and "A push to the main branch deploys to the project's shared development environment, not to any branch's environment."

### 2026-10-25 — The pipeline's GitHub runs (Screen)

- **Change:** `plan/setup-offers-ci-for-its-host` at `5127ab0`, private repository `fcapurso/tropis-pipeline-probe`, opened in a browser while signed in to that GitHub account
- **Pre-conditions:** the four runs below already finished. Nothing to push or re-run. The repository is private, so the pages 404 until you are signed in.

| # | Step | Expected |
|---|---|---|
| 1 | Open run A, a pull request that changes `src/app.js`: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40174449359 | One job per stage. `plan`, `framework` and `unit` passed. `sanity`, `integration` and `end-to-end` are marked skipped. `gate` passed. `deploy` is marked skipped. The gate's summary says `skipped — a pull request does not deploy`. |
| 2 | Open run B, a pull request that changes only `docs/note.md`: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40174450703 | `plan`, `framework` and `gate` passed. The other stage jobs are marked skipped. The summary says `skipped — only prose and framework files changed`. |
| 3 | Open run C, a pull request whose unit script exits 1: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40174453105 | `unit` failed. `deploy` is marked skipped. The gate's summary says `held — unit did not pass`. |
| 4 | Open the push to `main` after the deploy condition was corrected: https://github.com/fcapurso/tropis-pipeline-probe/actions/runs/40175369233 | `deploy` passed, and its log contains the line `deployed`. `sanity`, `integration` and `end-to-end` are still marked skipped. |

- **Result:** pass
- **Notes:** observed by the developer, 2026-10-25, from the pull-request checks list. Run A: 4 skipped (`deploy`, `end-to-end`, `integration`, `sanity`) and 4 passed (`framework`, `gate`, `plan`, `unit`). Run B: 5 skipped (those plus `unit`) and 3 passed (`framework`, `gate`, `plan`). Run C: `unit` failed, 4 skipped, 3 passed (`framework`, `gate`, `plan`). Probe A is merged. The developer also opened the corrected push, commit `62a79d8`: plan, framework, unit, gate and deploy passed, and sanity, integration and end-to-end are skipped. The gate summary says `will run` for deploy and `empty — no pipeline/<stage>.sh` for the three empty stages. The deploy job log contains `deployed`, read while the probe was run. Round 1 of runs A–C failed in `npm ci` before any stage script ran. The push that merged pull request A skipped `deploy` even though the gate had decided `run`, because a skipped empty stage makes `success()` false; run 4 is after that condition started naming `always()`.
- **Closes:** `setup-offers-ci-for-its-host` — "A change touching only files the project lists as prose and framework files runs the framework checks only and deploys nothing." and "On GitHub, a Tropis reusable workflow shows one job per stage, runs stages that do not depend on each other side by side once the framework checks passed, and runs the deploy job last."

### 2026-10-20 — The 0.4.0 notes tell a project what the release does for it (Release notes)

- **Change:** `main` at `7708e13`, `RELEASES.md`, section `[Unreleased]`, read on GitHub: https://github.com/fcapurso/tropis/blob/main/RELEASES.md#unreleased
- **Pre-conditions:** none. Read it as someone who runs a project with the framework and has not followed this week's work.

| # | Step | Expected |
|---|---|---|
| 1 | Read only the summary under `## [Unreleased]`. | You can say in a sentence what this release does for a project. |
| 2 | Read only "After updating: what to do by hand". | You know every step to take after updating, in which file or command, and could do them without reading further. |
| 3 | Read the remaining sections. | Each heading says what you get; no paragraph needs the framework's source or backlog open to understand. |
| 4 | Look for anything you would have to act on that is not under step 2. | None. |
| 5 | Read "Smaller corrections". | Each bullet is a one-line fix you would not need explained. |

- **Result:** pass
- **Notes:** observed by the developer, 2026-10-20. The notes were rewritten by hand to the shape `/release` now asks for; they were not produced by a `/release` run on the new wording.
- **Closes:** none. The outstanding criterion of `release-notes-read-as-the-reader-would` needs a `/release` run on the installed new wording, which happens after 0.4.0.

### 2026-10-15 — Cursor follows a project's addition over a shipped clause (Cursor)

- **Change:** `plan/shipped-rules-have-project-companions` at `41e4d20`, scratch project `~/src/shipped-rules-additions-probe` (set up from that commit; the test file Task 6 created has been deleted)
- **Pre-conditions:** that folder is the workspace. `.claude/rule-additions/tests.md` holds the project's sentence (suffix `.spec.js`). `.framework/rules/tests.md` holds the shipped sentence (suffix `.check.js`). `npm --prefix .framework run rules -- --check` has already exited 0. No `cursor-check.md` yet. Open the folder as its own Cursor workspace and start a new Agent chat.

| # | Step | Expected |
|---|---|---|
| 1 | Paste: Before using any tool: quote every sentence beginning "Marker" that you have been given. | No sentence beginning "Marker". |
| 2 | Paste: Read `src/a.test.js`, then quote every sentence beginning "Marker" you have now been given. | The shipped sentence (suffix `.check.js`), the project's sentence (suffix `.spec.js`), and the separator's heading "This project's additions to the rule above". |
| 3 | Paste: Write a test for a function `sum` in `src/app.js`. | The new file's name ends in `.spec.js`, and the agent says it set aside the shipped `.check.js` clause and why. |
| 4 | Write the three answers to `cursor-check.md` in that folder. The first line is `Cursor version: <version>`. | The file is there, with the version line and the three answers. |

- **Result:** pass
- **Notes:** observed by the developer, Cursor 3.24.12 (read from the installed Cursor.app on dev-laptop; the reply did not include an About line). The second answer quoted both marker sentences and did not quote the separator's heading. The third created `src/app.spec.js` and said the addition wins, so the file uses `.spec.js`.

```
1. I have been given no sentence that begins with "Marker".
2. Marker S: name every test file with the suffix .check.js.
   Marker P: name every test file with the suffix .spec.js.
3. The test is in src/app.spec.js. It imports sum from src/app.js and checks that sum(2, 3) is 5.
   node --test src/app.spec.js passed: 1 test, 0 failures.
   The framework rule says to name test files .check.js. This project's addition says .spec.js, and that addition wins where the two disagree, so the file uses .spec.js.
```
- **Closes:** `shipped-rules-have-project-companions` — "A Cursor agent that reads a file in the area receives both texts, and with the contradicting addition follows it and says so — checked by the developer in Cursor and recorded in docs/verification-log.md."

### 2026-10-15 — Cursor receives generated rules, single-file and `*` globs included (Setup)

- **Change:** `plan/rule-areas-are-project-data` at `HEAD` of that branch, on the developer's Mac in Cursor
- **Pre-conditions:** scratch project `/private/tmp/claude-501/-Users-dev-src-claude-project-framework/<session>/scratchpad/proj7` exists (set up from this branch, rules generated, each rule's text carrying a `MARKER-…` sentence; shipped markers `MARKER-<NAME>-9x4m`, own rule `MARKER-APP-7k2q`).

| # | Step | Expected |
|---|---|---|
| 1 | Open `proj7` as its own workspace in Cursor (File → Open Folder). Start a new Agent chat and paste the prompt below. | The agent starts. |
| 2 | Before any tool, the agent lists every `MARKER-` string it was given. | None (or only always-applied ones; no area rule). |
| 3 | It reads `feature-catalog.yaml` (single-file glob), then lists markers received and files it opened. | `MARKER-CATALOGS-9x4m` attached. |
| 4 | It reads `src/a.test.js` (glob beginning with `*`). | `MARKER-TESTS-9x4m` attached. |
| 5 | It reads `docs/superpowers/plans/x.md` (comma-separated globs). | `MARKER-PLANNING-9x4m` attached. |
| 6 | It reads `src/app.js` (own rule). | `MARKER-APP-7k2q` attached. |
| 7 | `cursor-check.md` exists in `proj7`, first line `Cursor version: <version>`. | Present, with a per-step report. |

Prompt to paste: "Do these in order. Before using any tool, list every string starting with MARKER- you were given. Then read feature-catalog.yaml, then src/a.test.js, then docs/superpowers/plans/x.md, then src/app.js. After each read, list any MARKER- string you received and which files you opened. Do not search for markers. Write the whole report to cursor-check.md in the project root; its first line must be `Cursor version: <version>`."

- **Result:** pass
- **Notes:** observed by the developer, Cursor 3.24.12, the developer's MacBook Pro. No marker before any read; each of the four reads attached its rule (`catalogs`, `tests`, `planning`, `app`), as the agent reported in `cursor-check.md`:

```
Cursor version: 3.24.12

# Marker delivery report

## Before any tool

MARKER- strings given in the prompt/context: none.

## 1. feature-catalog.yaml

MARKER- strings received:
- MARKER-CATALOGS-9x4m

Files opened / attached:
- feature-catalog.yaml
- .cursor/rules/catalogs.mdc (injected as relevant rule)

## 2. src/a.test.js

MARKER- strings received:
- MARKER-TESTS-9x4m

Files opened / attached:
- src/a.test.js
- .cursor/rules/tests.mdc (injected as relevant rule)

## 3. docs/superpowers/plans/x.md

MARKER- strings received:
- MARKER-PLANNING-9x4m

Files opened / attached:
- docs/superpowers/plans/x.md
- .cursor/rules/planning.mdc (injected as relevant rule)

## 4. src/app.js

MARKER- strings received:
- MARKER-APP-7k2q

Files opened / attached:
- src/app.js
- .cursor/rules/app.mdc (injected as relevant rule)

## Summary of all MARKER- strings observed

1. MARKER-CATALOGS-9x4m
2. MARKER-TESTS-9x4m
3. MARKER-PLANNING-9x4m
4. MARKER-APP-7k2q
```
- **Closes:** `rule-areas-are-project-data` — "Cursor: generated rule on a read, single-file glob and `*` glob included"
