# Whether an existing rule-sync tool should replace our own projection — Spike Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Task 1 checks that the Cursor spike's finding is on
> `main`; if it is not, stop and report — this plan cannot be done without it.

**Goal:** A written finding judges rulesync, AlignTrue, Ruler and any tool found doing the
same job, from trial runs, against what the framework needs from the thing that turns its
rules into each agent tool's files — and recommends adopting one, borrowing from one, or
keeping the framework's own generator.

**Spec:** none. The entry `rule-tooling-spike` in `feature-catalog.yaml` is the
specification: its four acceptance criteria and the comment above it. Also read the entries
it names — `rule-areas-are-project-data`, `shipped-rules-have-project-companions`,
`project-takes-a-framework-version`, `harness-does-not-need-node` — because the needs below
come from them, and the arc
`docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`
(*Decided: copy with fingerprints*). And read the Cursor spike's finding,
`docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md`, whole: it says which
mechanism delivers an area rule in Cursor.

**What this delivers:** `rule-tooling-spike`, all four criteria. See *Criteria and their
evidence* at the end.

**What the specifying session verified on 2026-10-15, against `main` at `994defa`:**

- The framework's own projection today is four files: `scripts/rule-areas.js` (reads a
  rule's one-line `paths: [...]` JSON header), `scripts/generate-cursor-rules.mjs` (writes
  `.cursor/rules/<name>.mdc` with `globs: <JSON array>`, `alwaysApply: false`),
  `scripts/projections.js` (maps a rule path to its projection path), and the guard
  `guards/cursor-rules-projection.test.js` (compares rule and projection). Also referring
  to them: `guards/rule-areas.test.js`, `scripts/plan-binding.js`,
  `scripts/check-conformance.sh`, `scripts/set-up-project.sh`,
  `scripts/installed-scripts.txt`, `templates/package.json`, `rules/learnings.md`,
  `commands/capture-learning.md`, `framework/DECISIONS.md`.
- The shipped rules and their sizes in bytes: `rules/catalogs.md` 5,653,
  `rules/harness-scripts.md` 5,589, `rules/learnings.md` 4,371, `rules/planning.md`
  21,395, `rules/tests.md` 2,900.
- The hooks a project gets are wired in `templates/settings.json` (this repository's own
  copy is `.claude/settings.json`): `PreToolUse` on `Edit` and `Write` running
  `capture-at-write.sh`, and on `Bash` running `capture-at-merge.sh` and
  `framework-commit-check.sh`, each narrowed by an `if` condition. Each replies through
  `scripts/hook-reply.sh`. Cursor ignores `if` and runs every wiring on every shell command
  (audit S2 2.8); the scripts' own filters keep them quiet.
- The framework currently needs Node for its scripts and checks; `harness-does-not-need-node`
  is an open entry asking for that to end.
- The first wording of this entry named "rule size limits" because of a hook reply limit
  of about 10,000 characters; that hook is gone. Size still matters: a tool that splits,
  truncates or summarises a rule fails silently.

**Model tier: Medium–large.** Trial runs against stated needs, with a judgment at the end
that the developer decides on.

**Requires:** network access to install the tools into a throwaway folder, and any current Claude Code CLI for Task 3 (record which).

**Merge authority: parent review.** The developer decides on the recommendation.

Do not store a kick-off prompt on this plan.

---

## Delivers

rule-tooling-spike

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-rule-tooling -b plan/rule-tooling-spike` |

The trial folder of Task 2 is a throwaway, not a checkout; nothing in it is committed.

## Global Constraints

- **Evaluate; do not adopt.** No change to `scripts/`, `rules/`, `guards/`, `templates/`,
  `commands/`, `framework/`, `.claude/` or `.cursor/` in this repository.
- **Tools are installed only in the trial folder**, from their public registries. Nothing
  is installed in this repository or globally. Read each tool's install instructions
  before running them, and do not run an install script that asks for credentials.
- **A judgment comes from a trial run, not from the tool's documentation alone.** Where a
  need cannot be tried — the tool will not install, a feature needs a paid account — say so
  and mark that need *not tried*, rather than reporting what the documentation claims as a
  result.
- **Do not open a Cursor session or ask the developer for one.** Cursor delivery is judged
  against the form the Cursor finding measured (Decision 3).
- **Never require a particular install, version or machine.** Record the tool, version and
  machine of every run.
- **Do not edit `feature-catalog.yaml`** except the promotion the reviewer makes at merge.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken in the specifying session; do not reopen them.

1. **The needs, as the criteria list them, are the scale.** A tool is judged need by need:
   *meets*, *meets with work* (say what work), *does not meet*, *not tried*. No weighting
   into a score.
2. **Hook-free delivery is a need of its own.** The developer asked, on 2026-10-15, for
   rules delivered by each tool's own mechanism — as the `paths:` header is Claude Code's —
   or by one shared by every tool, not by a hook. A tool that delivers rules through a hook
   does not meet it.
3. **Cursor is judged by form.** The Cursor finding says which file layout and front matter
   reached a Cursor agent. A tool meets the Cursor need if, from the trial rules, it writes
   that form — layout, file location and front matter field by field. If it writes another
   form, it does not meet the need unless the finding measured that form too. If the
   finding found no hook-free mechanism, say so and judge only whether the tool could write
   one later without changing its source format.
4. **Claude Code is judged by a session.** Per-area loading in Claude Code is measured in a
   fresh Claude Code session on the tool's output (Task 3), not inferred from the files.
5. **The finding is named for this plan's date** —
   `docs/superpowers/specs/2026-10-15-rule-tooling-finding.md` — whatever day it runs.

## The needs

From the acceptance criteria and the entries they serve. Each is checked in Task 3.

| # | Need | Why |
|---|---|---|
| N1 | A rule loads only for its area in Claude Code | FW-009; the cost control the framework exists for |
| N2 | The rule reaches Cursor by the mechanism the Cursor finding measured | `cursor-agents-receive-area-rules` |
| N3 | Delivery through each tool's own mechanism, or one both share — not a hook | Decision 2 |
| N4 | Rules arrive whole at their current sizes, `planning.md`'s 21,395 bytes included | A truncated rule fails silently |
| N5 | The framework's hooks keep working in both tools: generated, or left alone untouched | `templates/settings.json`; audit S2 |
| N6 | A project's areas live in a file of its own, not inside shipped rule files | `rule-areas-are-project-data` |
| N7 | A project adds clauses to a shipped rule in a file of its own, and both arrive as one rule | `shipped-rules-have-project-companions` |
| N8 | Shipped files can be replaced by a fingerprinted update without merging, and generation is deterministic | `project-takes-a-framework-version`; *Decided: copy with fingerprints* |
| N9 | Whether it needs Node, or another runtime, in the project | `harness-does-not-need-node` |

## Traps

- **"Supports Cursor" is not N2.** Most such tools write `.cursor/rules/*.mdc` with globs —
  the form the audit found delivered nothing. Compare the output to the finding's working
  form, field by field.
- **A tool may rewrite `CLAUDE.md` or `AGENTS.md`** at the trial root. That is a finding
  (what it would do to a project's entry files), not a mess to clean silently: record it.
- **A tool may concatenate every rule into one always-loaded file.** That meets N4 and
  fails N1 — record both.
- **Claude Code also loads a root `CLAUDE.md`.** In Task 3, a marker arriving from the
  root file is not per-area loading; check which file it came from.

## File Structure

| File | Change |
|---|---|
| `docs/superpowers/specs/2026-10-15-rule-tooling-finding.md` | New — the finding |
| `feature-catalog.yaml` | `rule-tooling-spike` to `shipped`, at merge, by the reviewer |
| `docs/superpowers/plans/2026-10-15-rule-tooling-spike.md` | Handover report |

Doc closeout: no durable page changes — the finding is a recommendation the developer has
not yet taken. No `DECISIONS.md` entry for the same reason. No framework document
changes, so no fresh-agent check.

---

### Task 1: Preconditions

```bash
git fetch origin
git show origin/main:docs/superpowers/specs/2026-10-15-cursor-area-rules-finding.md | head -20
```

If the file is not on `main`, stop and report: the Cursor spike has not merged. Otherwise
read it whole and write down, for the finding, the mechanism it recommends and the exact
form (layout, location, front matter) that delivered.

### Task 2: The trial folder and the candidates

1. Find the current versions of rulesync (`github.com/dyoshikawa/rulesync`), AlignTrue and
   Ruler, and search for any other tool that generates several agent tools' rule files from
   one source. Add each one found that is maintained and supports both Claude Code and
   Cursor; list the ones rejected and why.
2. Create `../rule-tooling-trial/` beside this repository and `git init` it. Into it copy,
   as the source each tool starts from: `rules/*.md` from this repository (with their
   `paths:` headers), `templates/settings.json` as `.claude/settings.json`, and the hook
   scripts it names plus `scripts/hook-reply.sh` into `.framework/hooks/`. Add one invented
   source folder per rule area so the globs match something (`docs/superpowers/plans/`,
   `scripts/`, and so on — empty sample files are enough). Commit it, so each tool starts
   from the same state: reset with `git checkout -- . && git clean -fd` between tools.
3. Run the framework's own generator against the trial folder for the baseline:
   `node <this worktree>/scripts/generate-cursor-rules.mjs` will not work from outside — it
   resolves the root from its own location — so copy `scripts/generate-cursor-rules.mjs`,
   `scripts/rule-areas.js` and `scripts/projections.js` into the trial's
   `.framework/scripts/` and run it there. Save its `.cursor/rules/` output as the baseline.
4. Add one marker sentence to each copied rule's body — `Probe marker R-<rule>: <two
   invented words>.` — for Task 3.

### Task 3: Each tool against each need

For each tool, from the reset trial folder:

1. Install it locally in the trial folder. Record the command, version, and what it added
   (files, folders, `node_modules` size, entries in `package.json`).
2. Write its source configuration so it generates Claude Code and Cursor outputs from the
   trial rules, keeping each rule's area. Record the configuration verbatim.
3. Generate. Record every file it wrote or changed, and diff its Cursor and Claude Code
   outputs against the baseline and the copied rules: every difference named.
4. Check N1: start a fresh Claude Code session in the trial folder on the tool's output.
   Before any tool, ask it to quote every `Probe marker` sentence it was given; then have it
   read one sample file in one area and quote again. Pass: no area marker at start, that
   area's marker after the read, no other area's. Record version and machine.
5. Check N2–N9 against the outputs and the tool's configuration, per *The needs*, and try
   each where trying is possible: N4 by comparing each generated rule's body byte-for-byte
   with its source; N5 by whether the tool generates, rewrites or leaves
   `.claude/settings.json` alone, and whether it writes Cursor hooks; N6 by whether areas
   can be declared outside the rule files; N7 by trying to add a second file to one rule;
   N8 by generating twice and comparing, and by whether shipped rule sources stay
   untouched by a project's settings; N9 from what the install needed.
6. Record each tool's licence, who maintains it, its commits in the last 90 days and its
   latest release date (from its repository), and what the framework would stop
   maintaining if it adopted it — name the files from *What the specifying session
   verified* that would go.

### Task 4: The finding

Write `docs/superpowers/specs/2026-10-15-rule-tooling-finding.md`:

- **Summary** — five lines at most, ending in the recommendation.
- **How this was tried** — tools, versions, machine, dates; the trial folder's contents.
- **The needs** — the table above, unchanged.
- **One section per tool** — install footprint; configuration verbatim; generated files
  beside the baseline, with every difference named; each need marked *meets*, *meets with
  work*, *does not meet* or *not tried*, with the evidence; licence, maintenance; what the
  framework would stop maintaining.
- **Comparison** — tools across, needs down, one word per cell.
- **Recommendation**, put to the developer: adopt one, borrow from one (say what), or keep
  the framework's own generator; and what that changes in `rule-areas-are-project-data` and
  `shipped-rules-have-project-companions` — written as the edit you would propose to each
  entry's `value` or criteria, not made.
- **Tools rejected**, with the reason.

Delete `../rule-tooling-trial/` after the finding carries what it needs. Commit on the
branch, with a body saying what the finding recommends.

### Task 5: Checks

```bash
npm --prefix .framework test
bash scripts/check-blueprint.sh
git diff --stat origin/main...HEAD
```

Expected: both green; the diff stat names the finding and this plan only.

### Task 6: Handover

Append `## Handover report` to this file with the six sections the planning rules name,
and commit. The reviewer puts the recommendation to the developer, promotes the entry and
writes the review record.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Each tool judged against every need, from a trial run | Finding, per-tool sections and *Comparison*; N1 by a Claude Code session |
| Trial on a throwaway copy; generated files beside today's, every difference named | Finding, *How this was tried* and per-tool diffs |
| Licence, maintenance, install footprint, what we would stop maintaining | Finding, per-tool sections |
| Recommendation, and its change to the two entries, put to the developer | Finding, *Recommendation* |

## Not in this plan

- **Adopting a tool or changing the generator.** The developer decides from the finding;
  the work then belongs to `rule-areas-are-project-data`.
- **A Cursor measurement of a tool's output.** The Cursor spike measured the forms; a form
  it did not measure is reported as unmeasured.

## Handover report

Executed on `plan/rule-tooling-spike`, in `../claude-project-framework-rule-tooling`, from
`origin/main` at `901fb45`. Machine: `dev-laptop.local`, Darwin arm64 25.2.0
(macOS 26.2, 25C56), Node v22.15.0, npm 11.6.4. Claude Code 2.1.300 for Task 3, which is the
CLI version the plan asks to be recorded. The plan's checkboxes remain unticked.

### Task completion

| Task | State |
|---|---|
| 1 Preconditions | Done. The Cursor finding is on `origin/main`; its working form and what it did not measure are written into the finding's *How this was tried*. |
| 2 Trial folder and candidates | Done. rulesync 35.0.0, Ruler 0.3.44 and AlignTrue 0.9.3 were the named tools; ai-rulez 5.3.0 was found by search and added as a fourth, because it is maintained and writes both tools. Five others were rejected, each with its reason, in the finding. Baseline taken from the framework's own generator, run twice with identical output. |
| 3 Each tool against each need | Done for all four tools, N1 to N9. N1 was a fresh `claude -p` session on each tool's output, one per output arrangement that mattered. No need is marked *not tried*. Cursor was judged by form only, as Decision 3 says. |
| 4 The finding | Done: `docs/superpowers/specs/2026-10-15-rule-tooling-finding.md`, committed as `97d4947` with a body. The trial folders (`../rule-tooling-trial` and its four siblings, below) were deleted after it was written. |
| 5 Checks | Done; see *Verification results*. |
| 6 Handover | This section. |

No task needed the developer, so no handover to the developer was built.

### Verification results

`npm --prefix .framework test`, run in the worktree after the finding was committed:

```
PASS guards/project-layout.test.js
PASS guards/rule-areas.test.js
PASS guards/catalog-entries.test.js

Test Suites: 3 passed, 3 total
Tests:       4 passed, 4 total
Time:        0.362 s
```

`bash scripts/check-blueprint.sh`, against `97d4947`: all twelve planted defects caught
(`orphan-rule`, `stale-verification`, `missing-review`, `projection-drift`, `plain-reply`,
`unpromoted-delivery`, `future-dated-plan`, `silent-shelf`, `undispatchable-plan`,
`unpaired-projection`, `incomplete-entry`, `idea-omits-a-field`), then `ok clean baseline`
and "Every guard caught its defect and passed the clean baseline."

`git diff --stat origin/main...HEAD`, before this handover commit:

```
 .../specs/2026-10-15-rule-tooling-finding.md       | 390 +++++++++++++++++++++
 1 file changed, 390 insertions(+)
```

`git log --oneline origin/main..HEAD` before this commit listed `97d4947` only.

The finding's own measurements (each with tool, version and machine) are in the finding,
not repeated here: the N1 prompt verbatim, each tool's configuration verbatim, the byte
counts of every body against its source, determinism by `shasum`, and the install footprints.

### Scope

The finding is in the File Structure table, and so is this plan. `feature-catalog.yaml` is
left for the reviewer, as the table says. Nothing under `scripts/`, `rules/`, `guards/`,
`templates/`, `commands/`, `framework/`, `.claude/` or `.cursor/` was edited. After this
commit the diff stat names the finding and this plan only.

Outside the repository, and not committed: the trial folder and four siblings
(`../rule-tooling-trial`, `-used-1`, `-used-2`, `-used-3`, `-out`) and six scratch scripts
in `/tmp`, all deleted. They held the tools' installs (11 MB to 160 MB each) and the
captured outputs. The deletion had to run outside the command sandbox, because the sandbox
writes only inside the workspace. The `claude -p` sessions of Task 3 left their transcripts
under `~/.claude/projects/` for those trial paths; I did not delete them.

### Judgment calls

- **Fresh clones, not resets.** After the first tool, each trial ran in a fresh `git clone`
  of the start commit placed at the same path, instead of `git checkout -- . && git clean
  -fd`. The plan's reset left behind files Ruler's `.gitignore` hid, and a `-x` clean was
  refused by the session's command review. The result is the same start state.
- **The markers went in before the start commit, not after.** See *What the plan got wrong*.
- **The rules went in `.claude/rules/`.** The same section.
- **ai-rulez became a fourth candidate**, and rulesync's release binary was run as well as
  its npm install, because N9 asks whether Node is needed.
- **AlignTrue was kept although it does not start on a fresh install** (js-yaml 5.4.3 broke
  its default import). I pinned `js-yaml` 4.1.1 with an npm `overrides` entry in the trial
  and recorded that as a footprint fact; N-verdicts are for the tool as it ran with that.
- **Verdict conventions.** *Meets with work* always names the work in the finding. Ruler N8
  is the one I tried end to end: a root `.ruler/` file stopped its nested output growing 58
  bytes a run. Ruler N7 and AlignTrue N2 name their work from the tool's output (the
  companion in the area folder's `.ruler/`; a description short enough not to fold), and the
  finding says what in the output the Cursor finding did not measure. Where a tool could not
  do the need and I found no way, it is *does not meet*.
- **N1 was judged with a prompt that asks where each marker arrived from**, so a marker
  from a root `CLAUDE.md` (which Ruler and AlignTrue write) is not read as per-area
  loading. The prompt's last paragraph was added after rulesync's first run returned only
  the second half of the report; that run was repeated.
- **No control session.** I had meant to add a `claude -p` run with no rules at all, to show
  the markers cannot come from anywhere else. The command review refused it, and I did not
  ask for an override. Step 1 of every N1 session, which asks for markers before any tool
  and where each came from, stands as the check.
- **Recommendation: keep the framework's generator and borrow a content hash and a check
  mode from ai-rulez.** The plan asks for a recommendation and I made one; the developer
  decides.

### What the plan got wrong

- **`rules/catalogs.md` is 5,819 bytes, not the 5,653 the plan lists.** The plan says it was
  verified against `main` at `994defa`; `main` has since moved (`901fb45` when I branched,
  `a17dcb5` now) and `catalogs.md` changed. The other four sizes (5,589, 4,371, 21,395,
  2,900) are right. N4's check does not depend on the figure, because it compares each body
  with its source.
- **Task 2 contradicts itself on the markers.** Step 2 commits the trial and says to reset
  with `git checkout -- .` between tools; step 4 then adds the markers. A marker added after
  the commit is an uncommitted edit, and the first reset removes it. I added them before the
  commit.
- **The reset command does not reset.** `git clean -fd` leaves anything a tool's `.gitignore`
  names (Ruler's did), so a later tool started from a dirty folder.
- **`rules/*.md` is the wrong place to copy to.** Claude Code reads `.claude/rules/`, and
  the framework's own generator reads that folder, so the baseline would not run from
  `rules/`. They were copied into `.claude/rules/`, which is where a project has them.

### Outstanding

- **Nothing was measured in Cursor.** Every N2 verdict is a comparison of files with the
  Cursor finding's form. The comma without a space, a quoted glob, and a comment block
  between the front matter and the body are unmeasured there, and so is whether a Cursor
  agent receives a shipped rule and its companion together. Only the developer can run
  those, in Cursor, as the Cursor spike did.
- **The developer has to decide the recommendation**: keep the generator, or take one of
  the tools. The finding writes out the proposed edit to `rule-areas-are-project-data` and
  `shipped-rules-have-project-companions`; neither was made. The finding also says what the
  trial changes for `harness-does-not-need-node`: two tools ship a binary that runs without
  Node, so a generator that needs Node is a choice, not a constraint.
- **The reviewer promotes `rule-tooling-spike` to `shipped`** at merge and writes the review
  record. I did not edit `feature-catalog.yaml`.
- **Rebase.** `origin/main` has moved since this branch was cut; the branch holds a new file
  and an appended section only, so it should rebase without conflict, but I did not rebase.
- **Versions drift.** AlignTrue 0.9.3 does not start on a fresh install today; a later
  release may. The finding is dated 2026-10-15 and its verdicts are for those versions.

## Review record

Reviewed 2026-10-15 by the specifying session (Claude Code, Claude Opus 5.5, on the
developer's Mac). Executor: Claude Sonnet 5.5, a tier above this plan's Medium–large.

### Checks re-run

- Rebased onto `origin/main` at `a17dcb5`; clean (the branch adds a file and appends to
  this plan).
- `npm --prefix .framework test`: `Tests: 4 passed, 4 total`, before and after promotion.
- `bash scripts/check-blueprint.sh` after the review commit: see the merge commit's run.
- The finding's "154 lines across four files":
  `wc -l scripts/generate-cursor-rules.mjs scripts/rule-areas.js scripts/projections.js guards/cursor-rules-projection.test.js`
  prints `154 total`.
- Read the rulesync section's evidence for N1 (a timestamped Claude Code 2.1.300 session:
  no marker before any tool, only `R-tests` after reading `src/a.test.js`), N2 (the one
  difference from the measured form is the bare comma, which `cursor.globs` cannot
  change), N6 and N7 (a project overlay replaced the shipped body; a second file became a
  second rule). Each verdict follows from what is quoted.

### Found

- The branch was not pushed and had no pull request; both made at merge.
- The plan's errors the handover lists are real and are the specifying session's: the
  marker step after the commit, a reset that leaves ignored files, `rules/` as the copy
  target, and a stale byte count for `catalogs.md`. None changes a verdict.

### Outstanding disposition

- Recommendation — **accepted by the developer on 2026-10-15**: keep the framework's
  generator, borrow a content hash and a check mode from ai-rulez. Recorded above
  `rule-areas-are-project-data`, whose last blocker is removed.
- The proposed value and criteria for `rule-areas-are-project-data` and
  `shipped-rules-have-project-companions` — the starting point for shaping each, with the
  developer, as a separate step.
- Nothing measured in Cursor — dropped for this decision: the framework's own generator
  writes the measured form, so the unmeasured variants (bare comma, quoted glob, comment
  block) are never written. The hash's position in a Cursor file is a question for
  `rule-areas-are-project-data`.
- Two binaries that run without Node — recorded in the finding for
  `harness-does-not-need-node`; no decision taken.

### Learnings routed

- How to reset a throwaway trial between tools: a fresh clone of the start commit, not
  `git clean -fd`, which keeps ignored files. Specific to probe plans; recorded in the
  finding and this handover, not a rule.
- Nothing else generalises beyond the decision, which lives on the catalog entries.

### Merged because

The finding judges every named tool need by need from trial runs whose quoted evidence
supports the verdicts, and its recommendation is now the developer's decision.
