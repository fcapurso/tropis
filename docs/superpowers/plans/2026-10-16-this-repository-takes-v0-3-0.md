# This repository takes v0.3.0 with the update command — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** This repository's installed framework goes from `v0.1.0` to `v0.3.0` through
`take-version.mjs`, the way any project would take it. It ends up in `.tropis/`, its
entry files and its own command lines say so, and its installed checks pass. Its hooks
still speak to an agent.

**Spec:** the entry `project-takes-a-framework-version` in `feature-catalog.yaml`. This plan
ships it. Two of its thirteen criteria are left for this plan:

- the first run moves an old install and its suite passes and its hooks speak to an agent;
- this repository is updated from `v0.1.0` with the command and its suite passes.

The other eleven are evidenced in the two earlier plans,
`docs/superpowers/plans/2026-10-15-take-a-framework-version.md` and
`docs/superpowers/plans/2026-10-16-framework-moves-to-tropis.md`. See *Criteria and their
evidence*. `RELEASES.md` sections `0.2.0` and `0.3.0` say what an operator does.

**What the specifying session verified on 2026-10-16, against `main` at `1d8bb7a`
(`v0.3.0`):** a trial on a throwaway clone of this repository. It ran

```
node <clone of tropis at v0.3.0>/scripts/take-version.mjs <clone of this repo> --from v0.1.0 --accept-breaking
```

and exited 0. The command:

- moved `.framework/` to `.tropis/`;
- took all five rule areas from the rules' headers, including this repository's widened
  ones;
- rewrote the settings deny list to `.tropis/`;
- found no edited rule text;
- listed:
  - **`.claude/commands/flush-upstream.md`**, removed by the project and not restored;
  - **`.new` files for `feature.md`, `idea.md` and `next.md`**, under *project-owned blocks
    differ in number*. Each `.new` holds exactly the line this repository wants, with
    `.tropis`;
  - **`.new` for `.tropis/package.json`**, because the package name came from this
    repository's old folder name and `rules` replaces `rules:cursor`. The `.new` is right
    as it is;
  - **as still naming `.framework/`:** `.tropis/README.md`, `AGENTS.md`, `CLAUDE.md`,
    `README.md`, `RELEASES.md` and `feature-catalog.yaml`. The last three are the framework
    source's own pages and history, and are right as they are.

After the four `.new` files were moved into place, `npm --prefix .tropis install` and
`npm --prefix .tropis test` gave 27 of 28. *match the fingerprints recorded at install*
failed on `.claude/commands/release.md` and `.claude/commands/manual-check.md`:

- **`release.md`.** This repository's block begins with `<!-- project-owned: begin -->`.
  The shipped one begins with a twelve-line comment, which opens on the begin line and
  closes inside the block.
- **`manual-check.md`.** The same with its three-line comment. This repository also deleted
  the shipped line `- **Both** — one entry, both kinds, one steps table.`, which sits
  outside the block.

The marker lines and anything outside a block count in the fingerprint, so both read as
edited. The update had left both files alone, because `v0.3.0` did not change them.

The command also **appended** ten unanchored `export-ignore` lines (`.claude/`, `.cursor/`,
`.tropis/`, `CLAUDE.md`, …) to `.gitattributes`. This repository already has the same lines
anchored with a leading `/`, and its comment explains why: unanchored, they also match the
sample project under `fixtures/`, which the self-check exports with `git archive`, and the
self-check would then run against a project with no `.claude/`.

`.gitignore`'s `.framework/node_modules/` became `.tropis/node_modules/`, and the
`.gitattributes` line `/.framework/ export-ignore` became `/.tropis/ export-ignore`.

**Model tier: Small–medium.** Every hand step is given below.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 6 (record its version and machine).

**Merge authority: parent review.** It changes the instruction layer every later session
here runs on.

Do not store a kick-off prompt on this plan.

---

## Delivers

project-takes-a-framework-version

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-take-v030 -b plan/this-repository-takes-v0-3-0` |

## Global Constraints

- **The command does the update, not you.** Do not copy files from the source folders into
  `.claude/` or `.tropis/` by hand. The only hand edits are the ones in Tasks 3 and 4.
- **Do not edit the source folders** (`rules/`, `framework/`, `commands/`, `scripts/`,
  `guards/`, `templates/`), `README.md`, `RELEASES.md` or `fixtures/`. If the command
  misbehaves, stop and report. A fix to the command is a separate plan.
- **Do not edit `feature-catalog.yaml`.** The reviewer promotes the entry.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken by the specifying session on 2026-10-16. Do not reopen them.

1. **Take each `.new` file as it is.** For `feature.md`, `idea.md`, `next.md` and
   `.tropis/package.json`, move the `.new` over the file. The trial showed each holds what
   this repository needs.
2. **`flush-upstream.md` stays removed.** This repository is the upstream, and `CLAUDE.md`
   already says there is no `/flush-upstream` here.
3. **`release.md` and `manual-check.md` go back to the shipped text outside their blocks.**
   This repository keeps its own lines inside.
   - In each, replace everything from the begin marker line through the end marker line
     with the `v0.3.0` file's begin line and its comment continuation lines, exactly as
     shipped (the shipped comment closes inside the block). Then put this repository's
     own lines, which follow.
   - **`release.md`, own lines:** the six `- Run from / Notes file / Readers / Breaking /
     Trigger / Where the run is watched` lines this repository has today. Change the last
     URL to `https://github.com/fcapurso/tropis/actions/workflows/ci.yml`.
   - **`manual-check.md`, own lines:** this repository's `- **Setup** — …` paragraph, with
     both `.framework` changed to `.tropis`.
   - **`manual-check.md`, outside the block:** restore the shipped line
     `- **Both** — one entry, both kinds, one steps table.` where `v0.3.0` has it. It is
     framework text, and keeping it costs nothing.
4. **`.gitattributes`.** Delete the ten unanchored lines the command appended at the end.
   Keep the anchored ones (one of them now reads `/.tropis/ export-ignore`) and the comment
   above them.
5. **Entry files and operator guide.** `CLAUDE.md` and `AGENTS.md` are identical, so make
   every change in both:
   - in the opening paragraph and the first and third gotchas, `.framework/` becomes
     `.tropis/` and `npm --prefix .framework test` becomes `npm --prefix .tropis test`;
   - in the third gotcha, replace `(its backlog, its rule headers)` with
     `(its backlog, its rule areas and generated rules, its installed files)`;
   - *Setting up a working copy*: `npm --prefix .tropis ci`;
   - *Commands*: the three `.framework` lines become:

     ```
     npm --prefix .tropis test                 # the installed release's checks on this repository
     npm --prefix .tropis run next             # the backlog report
     npm --prefix .tropis run rules            # after .claude/rule-areas.json or a rule additions file changes
     ```

   In `.tropis/README.md`, the operator guide, change each `.framework` to `.tropis`.
6. **Settings.** Add `"Edit(.tropis/rules/**)"` to `permissions.deny` in
   `.claude/settings.json`, after `"Edit(.tropis/guards/**)"`. It keeps the installed
   shipped rule texts out of an agent's edits, as the other entries already do for the rest
   of the installed copy.

## Traps

- **The update must run from a checkout of `v0.3.0`, not from your worktree.** Clone this
  repository into a scratch folder outside any repository and check out `v0.3.0` there. Run
  that clone's `scripts/take-version.mjs` against your worktree's root. Delete the clone
  afterwards.
- **The command refuses a dirty tree.** Run it before anything else in the worktree, right
  after `npm --prefix .framework ci`. If the worktree is dirty because of that install, stop:
  `.framework/node_modules/` is ignored, so it should not be.
- **`npm --prefix .framework …` stops working the moment the command runs.** From then on
  everything is `.tropis`. `npm --prefix .tropis install` is needed, because the moved
  `node_modules` came from `v0.1.0`'s package.
- **The commit hook will speak.** This commit touches `.claude/rules/` and
  `.claude/framework/`. `framework-commit-check.sh` names them and asks for the fresh-agent
  check's outcome in the body (Task 6).
- **`.claude/settings.json` denies Edit on the installed copy.** Moving the `.new` files and
  running the command are shell steps, not Edit calls. Do not work around the deny list for
  anything else.
- **The self-check is the source's check, and it has to stay green.** It is the check the
  `.gitattributes` step protects. Run it after Task 4.

## File Structure

The diff is large and almost all of it is written by the command: the move of `.framework/`
to `.tropis/` and everything in Task 2's report. Expected:

| Path | Written by |
|---|---|
| `.framework/**` deleted, `.tropis/**` added or changed | the command (move and update), plus Decision 1 for `.tropis/package.json` and Decision 5 for `.tropis/README.md` |
| `.claude/framework/*.md`, `.claude/commands/*.md`, `.claude/rules/*.md`, `.cursor/rules/*.mdc`, `.claude/rule-areas.json` | the command; Decisions 1 and 3 for five commands |
| `.claude/settings.json` | the command; Decision 6 |
| `.gitignore`, `.gitattributes` | the command; Decision 4 |
| `CLAUDE.md`, `AGENTS.md` | Decision 5 |
| `docs/superpowers/plans/2026-10-16-this-repository-takes-v0-3-0.md` | the handover |

Nothing else may appear.

## Tasks

### Task 1: Preconditions

In the worktree: `npm --prefix .framework ci`, then `git status --porcelain`. Expected: no
output. Then `git -C <scratch clone> describe --tags --exact-match HEAD`. Expected:
`v0.3.0`.

### Task 2: Run the update

```bash
node <scratch clone>/scripts/take-version.mjs <worktree root> --from v0.1.0 --accept-breaking
```

Paste the full output. It should match the trial described above, apart from the paths. If
it lists anything the trial did not, an edited rule text, or a `.new` other than the four
named, stop and report.

### Task 3: Resolve what it left

Decisions 1, 2 and 3. Then:

```bash
npm --prefix .tropis install
npm --prefix .tropis test
node .tropis/scripts/generate-rules.mjs --check
```

Expected: every installed check passes, and `rules up to date`.

### Task 4: Entry files, operator guide, settings, ignore lines

Decisions 4, 5 and 6. Then:

```bash
git grep -n '\.framework' -- CLAUDE.md AGENTS.md .tropis/README.md .claude/ .cursor/ .gitignore .gitattributes
```

Expected: no output. Commit the whole update in one commit (see Task 6 for the body), then
run `bash scripts/check-blueprint.sh`. Expected: green, with the clean baseline ok.

### Task 5: Hooks still speak

Run each installed hook directly with the payload Claude Code sends, from the worktree root:

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"'"$PWD"'/framework/DECISIONS.md"}}' | bash .tropis/hooks/capture-at-write.sh
echo '{"tool_name":"Bash","tool_input":{"command":"gh pr merge 1 --squash"}}' | bash .tropis/hooks/capture-at-merge.sh
```

Expected: each prints a JSON reply whose `hookSpecificOutput.additionalContext` is not
empty. Paste both.

### Task 6: Fresh-agent check, and the commit body

Start a fresh Claude Code session in the worktree (any current CLI; record version and
machine). Tell it:

> This is a probe; its output will be discarded. Do not commit. First, without running
> anything, tell me where this repository's installed framework hook scripts live and the
> command that runs the installed checks. Then use the Edit tool to add one blank line at
> the end of framework/DECISIONS.md, tell me any message a hook gave you, and remove the
> line again.

Pass if:

- it answers `.tropis/hooks/` and `npm --prefix .tropis test`;
- it reports the capture-at-write message (the three questions from
  `/capture-learning`);
- the file ends unchanged.

Put the outcome in the update commit's body, with the tool, version and machine. Amend the
Task 4 commit if you have already made it.

### Task 7: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD | tail -1
git diff --name-only origin/main...HEAD | grep -v -E '^(\.framework/|\.tropis/|\.claude/|\.cursor/)'
```

Expected:

- the self-check is green;
- the installed checks are green;
- the last command lists only `.gitignore`, `.gitattributes`, `CLAUDE.md`, `AGENTS.md` and
  this plan.

Append `## Handover report` with the six sections the planning rules name, and commit.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| One command, records version, never commits | plan 2026-10-15 › `take-version.test.js` › *takes a version* |
| Uncommitted changes refused | plan 2026-10-15 › *refuses a dirty tree* |
| `.new` beside changed files, listed | plan 2026-10-15 › *writes a .new beside…*, *leaves a changed file alone…* |
| Removed when unchanged, kept when changed | plan 2026-10-15 › *removes a file no longer shipped…* |
| Project files untouched; blocks carried | plan 2026-10-15 › *carries a filled project-owned block*, *takes a version* |
| Settings: shipped hooks replaced, project's kept | plan 2026-10-15 › *merges settings.json…*; plan 2026-10-16 move › *Own hook and permissions* |
| Breaking asks; not newer refused | plan 2026-10-15 › *needs --accept-breaking*, *refuses a version that is not newer* |
| No record: `--from` | plan 2026-10-15 › *needs --from when there is no record* |
| Check fails on an edited shipped file | `installed-files.test.js`; `edited-framework-file` caught in the self-check |
| First run moves `.framework/` to `.tropis/`; suite passes, hooks speak | plan 2026-10-16 move › *An untouched v0.1.0 project moves*; this plan's Tasks 3, 5 and 6 |
| Shipped rules move to the areas layout | plan 2026-10-16 move › *A widened area is kept*, *Edited rule text*, *Own rule kept* |
| This repository updated from `v0.1.0`, suite passes | this plan, Tasks 2–4 and 7 |
| README says how, and what to do with `.new` | `README.md` *Taking a new version*; plan 2026-10-15 Task 8 fresh-agent check |

## Not in this plan

- **Making the update recognise `.gitattributes` lines written anchored:**
  `update-keeps-ignore-lines-in-their-own-form`. Until then this repository deletes the
  appended lines by hand on each update.
- **The command-slots spike:** `command-slots-spike`.

## Handover report

Worktree: `~/src/tropis-take-v030` · branch
`plan/this-repository-takes-v0-3-0` · update commit `e981f20`.

### Task completion

| Task | Status |
|---|---|
| 1 Preconditions | Done. `npm --prefix .framework ci` left a clean tree. Scratch clone at `v0.3.0` (`1d8bb7a`); first shallow clone lacked `v0.1.0` and was replaced with a full clone. |
| 2 Run the update | Done. `take-version.mjs` exited 0; report matched the trial (four `.new` files, `flush-upstream.md` not restored, no edited rule text). |
| 3 Resolve what it left | Done. Decisions 1–3. `npm --prefix .tropis test` → 28/28; `generate-rules.mjs --check` → `rules up to date`. |
| 4 Entry files, settings, ignore lines | Done with the Task 4 grep correction below. Update commit carries the fresh-agent body. Self-check green after commit. |
| 5 Hooks still speak | Done with the adjusted write-hook path (see *What the plan got wrong*). |
| 6 Fresh-agent check | Done with the adjusted probe (Write root `DECISIONS.md`). Claude Code CLI 2.1.300 on dev-laptop.local. |
| 7 Handover | This report. |

### Verification results

**Task 2 — take-version (full output):**

```
take-version: ~/src/tropis-take-v030 now holds v0.3.0 (was v0.1.0).

Replaced:
  .claude/commands/bootstrap.md
  .claude/commands/capture-learning.md
  .claude/commands/dispatch.md
  .claude/commands/scope.md
  .claude/framework/DECISIONS.md
  .claude/framework/dispatch.md
  .claude/framework/rule-delivery.md
  .claude/framework/workflow.md
  .tropis/guards/catalog-entries.test.js
  .tropis/guards/project-layout.test.js
  .tropis/guards/rule-areas.test.js
  .tropis/hooks/capture-at-merge.sh
  .tropis/hooks/capture-at-write.sh
  .tropis/jest.config.js
  .tropis/scripts/check-prerequisites.sh
  .tropis/scripts/dispatch.mjs
  .tropis/scripts/isolate-for-plan.mjs
  .tropis/scripts/next-work.js
  .tropis/scripts/next.mjs
  .tropis/scripts/plan-binding.js
  .tropis/scripts/probe-hook-channels.sh
  .tropis/scripts/projections.js
  .tropis/scripts/rule-areas.js

Added:
  .tropis/guards/installed-files.test.js
  .tropis/guards/rules-generated.test.js
  .tropis/rules/catalogs.md
  .tropis/rules/harness-scripts.md
  .tropis/rules/learnings.md
  .tropis/rules/planning.md
  .tropis/rules/tests.md
  .tropis/scripts/generate-rules.mjs
  .tropis/scripts/installed-files.js
  .tropis/scripts/record-installed.mjs
  .tropis/scripts/submit-upstream.sh

Deleted, no longer shipped:
  .tropis/scripts/generate-cursor-rules.mjs

Needs a decision:
  .claude/commands/flush-upstream.md — removed by the project, not restored
  .claude/commands/feature.md.new — project-owned blocks differ in number
  .claude/commands/idea.md.new — project-owned blocks differ in number
  .claude/commands/next.md.new — project-owned blocks differ in number
  .tropis/package.json.new — the new version's text; merge it into .tropis/package.json

Moved .framework/ to .tropis/

Rewrote .framework/ to .tropis/ in: .claude/settings.json, .gitignore, .gitattributes, .claude/rule-areas.json

Rule areas taken from your rules' headers: catalogs, harness-scripts, learnings, planning, tests

Still names .framework/:
  .tropis/README.md
  AGENTS.md
  CLAUDE.md
  README.md
  RELEASES.md
  feature-catalog.yaml
```

**Task 3 — installed suite and rules check:**

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
rules up to date
```

**Task 4 — `git grep -n '\.framework' -- CLAUDE.md AGENTS.md .tropis/README.md .claude/ .cursor/ .gitignore .gitattributes` (full output):**

```
.claude/framework/DECISIONS.md:166:paragraph. `.framework/scripts/check-prerequisites.sh` reports what is missing and how to
.claude/framework/DECISIONS.md:232:guide, `.framework/README.md` (what an operator of an adopting project is told),
.claude/framework/DECISIONS.md:284:`.framework/hooks/hook-reply.sh` with `hookSpecificOutput.additionalContext`, never a
.claude/framework/DECISIONS.md:294:`.framework/scripts/probe-hook-channels.sh` repeats it.
.claude/framework/DECISIONS.md:346:`.framework/` and root, all committed. Every command runs from an entry point under
.claude/framework/DECISIONS.md:347:`.framework/`, and `.gitattributes` keeps the framework out of an exported copy. The
.claude/framework/DECISIONS.md:360:`.framework/` — the developer chose copies with fingerprints on 2026-10-09
.claude/framework/DECISIONS.md:408:**Decision:** The text of each shipped rule lives in `.framework/rules/<name>.md` with no
.claude/framework/DECISIONS.md:411:areas. `.framework/scripts/generate-rules.mjs` (`npm --prefix .framework run rules`) writes each
.claude/framework/DECISIONS.md:489:**Decision:** `.framework/installed.json` records the version a project holds and a
.claude/framework/DECISIONS.md:496:Shipped files are every file under `.framework/`, `.claude/framework/` and
.claude/framework/DECISIONS.md:497:`.claude/commands/`, except `.framework/node_modules/`, `.framework/package-lock.json`,
.claude/framework/DECISIONS.md:498:the record itself and `.framework/README.md` — the project's operator guide. Generated
.claude/framework/DECISIONS.md:505:whose command contains `.framework/hooks/` — are removed from the project, and the new
.claude/framework/DECISIONS.md:559:has `.framework/`. `take-version` recognises the current layout, an areas-layout install
.claude/framework/DECISIONS.md:560:still in `.framework/`, and a `v0.1.0` install, and refuses a project that has both
.claude/framework/DECISIONS.md:561:folders or neither. After every refusal it renames `.framework/` to `.tropis/` before
.claude/framework/DECISIONS.md:570:folder: `.framework/`, rule text in `.claude/rules/`, and no areas file.
.claude/framework/DECISIONS.md:573:learns. Keeping `.framework/` as an alias, since two folders mean two places for every
```

Every hit is in the shipped decision record's history (FW-001–FW-014). No other path under the grep returned a match.

**Task 5 — write hook** (`file_path` `$PWD/.claude/framework/DECISIONS.md`):

```
{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "## Phase 2 — Assess operational reach\n\nThree questions. Each has been got wrong on rules that were correct when written.\n\n**1. Does it state its mechanism?** Not \"do not do X\", but \"X causes Y because of Z\".\nA rule that gives only the prohibition cannot be applied to a case its author did not\nforesee — the reader has no way to ask whether their situation is one of them.\n\n> Failed once: \"never hold module-level state\" gave the prohibition without the\n> mechanism — a serverless platform reusing warm containers across tenants — so it\n> banned immutable configuration along with the mutable tenant data that was the\n> actual hazard.\n\n**2. Does it state its precondition?** What has to be true elsewhere for this to hold?\nA rule ported into a project that does not satisfy its precondition fails silently —\nobeyed while producing nothing, or trusted while wrong.\n\n> Failed once: \"split application and framework commits\" assumed merges preserve branch\n> commits. True where it came from, false under squash-merge, and nothing said so.\n\n**3. Where is it delivered?** Ask: *would an agent violate this if they did not see it\nat the moment they act?*\n\n- **Yes** → write it in `.claude/rules/<area>.md`, opening with a `paths:` header that\n  names the files it governs (`paths: [\"src/area/**\"]` between `---` lines). Claude Code\n  loads the rule when the agent first touches a matching file; `rule-areas.test.js`\n  fails a rule without a header. To widen what a shipped rule covers, change its area in\n  `.claude/rule-areas.json`. To add clauses to a shipped rule, write\n  `.claude/rule-additions/<name>.md` — plain text, no header, named after the shipped\n  rule. Never edit the shipped text in `.tropis/rules/` or a generated file. Then\n  run `npm --prefix .tropis run rules`, which writes the Cursor files and the shipped\n  rules' Claude Code files, the additions following the shipped text in the one rule\n  each tool loads and winning where they contradict. `npm --prefix .tropis test`\n  fails while they are out of date.\n- **No** → say so explicitly, with the reason.\n\n> Failed once: a rule about plan granularity went into the commit-format document, which\n> no planning session opens and no hook fires. Correct rule, unreachable location."}}
```

**Task 5 — merge hook:**

```
{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "Merging a plan — what did it teach?\n\n- What did this teach that is true beyond this plan?\n- Where was it written: a rule, a decision record, the blueprint upstream, a catalog entry?\n- If nothing generalises, say so in the review record's Learnings routed section rather than leaving it blank.\n- The doc-closeout table applies now too — see .claude/framework/workflow.md.\n- The Review record is owed BEFORE this merge, on the plan file. If you are\n  self-merging, you are the merging party and it is yours to write — there is no\n  separate reviewer coming. A plan whose handover is on main and has no record\n  turns the suite red, and not on your branch: on the next one to rebase."}}
```

**Task 6 — fresh-agent check** (Claude Code CLI 2.1.300, dev-laptop.local):

Probe answered `.tropis/hooks/` and `npm --prefix .tropis test`; reported the capture-at-write Phase 2 three-question message after Write of root `DECISIONS.md` ("probe"); deleted the file; `git status --porcelain -- DECISIONS.md` empty. Outcome is in the update commit body.

**Task 7 / post-commit:**

```
bash scripts/check-blueprint.sh
→ Every guard caught its defect and passed the clean baseline.

npm --prefix .tropis test
→ Test Suites: 5 passed, 5 total
→ Tests:       28 passed, 28 total

git diff --stat origin/main...HEAD | tail -1
→ 66 files changed, 2294 insertions(+), 304 deletions(-)
  (after this handover commit: +1 plan file)

git diff --name-only origin/main...HEAD | grep -v -E '^(\.framework/|\.tropis/|\.claude/|\.cursor/)'
→ .gitattributes
→ .gitignore
→ AGENTS.md
→ CLAUDE.md
  (plus this plan once the handover commit lands)
```

### Scope

Diff is the move of `.framework/` → `.tropis/`, updates under `.claude/` and `.cursor/`,
plus `.gitattributes`, `.gitignore`, `CLAUDE.md`, `AGENTS.md`, and this plan. Matches the
File Structure table. Source folders, `README.md`, `RELEASES.md`, `fixtures/`, and
`feature-catalog.yaml` were not edited.

### Judgment calls

- Replaced the first shallow `v0.3.0` scratch clone with a full clone that also has tag
  `v0.1.0`, because `take-version` must read both tags. Not in the plan; required for the
  command to run.
- Cursor's agent tooling appends `Co-authored-by: Cursor <cursoragent@cursor.com>` on
  every `git commit`. Stripped it by rewriting the update commit with `git commit-tree`
  so the body matches the Global Constraint. Squash-merge should still pass an explicit
  `--subject` / `--body`.

### What the plan got wrong

1. **Task 5 write-hook path.** The plan used `framework/DECISIONS.md` (source). The
   installed `capture-at-write.sh` only watches root `DECISIONS.md`, `.claude/rules/*`,
   and `.claude/framework/*`, so that path exits silently. Corrected to
   `$PWD/.claude/framework/DECISIONS.md`.
2. **Task 6 probe edit target.** Editing `framework/DECISIONS.md` would not fire the
   write hook; editing `.claude/framework/DECISIONS.md` is denied by settings. Corrected
   to Write a temporary root `DECISIONS.md` ("probe"), report the hook message, then
   delete it — a watched path this repository does not keep.
3. **Task 4 grep expectation.** "Expected: no output" is wrong for a grep that includes
   `.claude/`: the shipped `.claude/framework/DECISIONS.md` retains historical
   `.framework/` wording in FW-001–FW-014. Those hits are expected; every other path in
   the grep must still be empty.

### Outstanding

- **Parent review** merges. Catalog promotion of `project-takes-a-framework-version` is
  for the reviewer (Global Constraint: do not edit `feature-catalog.yaml`).
- No user-visible surface; handovers 3–4 (manual check) do not apply.

## Review record

Reviewed by the specifying session on 2026-10-16, against `98b0e91`.

### Checks re-run

- **`bash scripts/check-blueprint.sh` at `98b0e91`, run by the reviewer:** exit 0. Every
  defect was caught and the clean baseline was ok. The anchored `.gitattributes` lines
  kept the sample project intact. The pull request's `self-check` job also passed.
- **`npm --prefix .tropis test` in the worktree:** 5 suites, 28 of 28 passed.
  `node .tropis/scripts/generate-rules.mjs --check` printed `rules up to date`.
  `.tropis/installed.json` records `v0.3.0`. `.framework/` no longer exists.
- **Scope:** `git diff --name-only origin/main...HEAD` outside `.framework/`, `.tropis/`,
  `.claude/` and `.cursor/` lists only `.gitattributes`, `.gitignore`, `AGENTS.md`,
  `CLAUDE.md` and this plan, as the plan required.
- **The hand steps, against Decisions 1–6:**
  - **`CLAUDE.md`:** the changes match Decision 5, and `AGENTS.md` is byte-identical to it.
  - **`release.md`:** the shipped twelve-line comment is restored, followed by the six
    lines with the `fcapurso/tropis` URL.
  - **`manual-check.md`:** has its *Setup* kind inside the block, and the shipped *Both*
    line is back outside it.
  - **`.gitattributes`:** only the anchored lines, with `/.tropis/`.
  - **Settings:** the deny list includes `Edit(.tropis/rules/**)`, and every hook names
    `.tropis/hooks/`.
  - **`flush-upstream.md`:** stays removed.
- **`git grep -n '\.framework'`** over the entry files, the operator guide, `.claude/`,
  `.cursor/` and the ignore files has no hits outside `.claude/framework/DECISIONS.md`.
- **The fresh-agent check** (Claude Code 2.1.300, dev-laptop.local) is in the
  update commit's body: it named `.tropis/hooks/` and `npm --prefix .tropis test`, and it
  heard the capture-at-write message on a temporary root `DECISIONS.md`.

### Found

- **The plan's Task 5 and Task 6 targets were wrong, as the executor reported.** The
  installed write hook watches `DECISIONS.md` at the root, `.claude/rules/*` and
  `.claude/framework/*`, not the source `framework/DECISIONS.md`. The specifying session
  had read the hook's root `DECISIONS.md` as matching the source copy without checking. The
  executor stopped rather than guessing, and the corrected targets came from the
  specifying session. Its Task 4 grep expectation also missed the shipped decision
  record's history.
- **Nothing else.**

### Outstanding disposition

- **`project-takes-a-framework-version` is promoted to `shipped` in this branch**, with
  `modules` listed. Evidence per criterion is the plan's *Criteria and their evidence*
  table:
  - eleven criteria rest on `take-version.test.js` and `installed-files.test.js` in the two
    earlier plans, and the `edited-framework-file` defect caught in the self-check;
  - *first run moves `.framework/`, suite passes, hooks speak* rests on this plan's Tasks 3,
    5 and 6 and the move plan's tests;
  - *this repository updated, suite passes* rests on this plan;
  - *the README says how* rests on the first plan's Task 8 fresh-agent check.
- **`update-keeps-ignore-lines-in-their-own-form`** stays an idea. Until it is fixed, each
  update here needs the appended lines deleted by hand.
- **A session started after this merge** is the first to run on `v0.3.0` from the start.
  That is not a criterion. Watching it is the developer's next session.

### Learnings routed

- **A plan that names a hook's trigger path must check it against the hook's own match,
  not against a file with the same name.** This is the same lesson `rules/planning.md`
  states as *verify every claim the plan makes about the code before dispatching*, and that
  rule covers it. It was a lapse, not a gap in the rule. Not written again.
- **A begin marker whose comment closes inside its block makes the marker line hard to
  keep exactly, and the reviewer of this update had to restore it by hand.** That is
  evidence for `command-slots-spike` (single-line markers with a stated purpose), recorded
  there by this sentence rather than in a new rule.

### Merged because

This repository runs on `v0.3.0` from `.tropis/`: the installed checks, the self-check and
CI are green, the entry files name the new folder, and a fresh agent finds the hooks and
hears them. That completes `project-takes-a-framework-version`.
