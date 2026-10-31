# The host check passes a gated branch when GitHub does not report auto-merge — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** the pipeline's `host` job passes when the main branch requires a pull request
and a check and GitHub does not say whether auto-merge is allowed, saying so in one line,
and still fails when GitHub says auto-merge is off. Today it fails, so every project that
applied the ruleset reads red on every run.

**Spec:** the entry `host-check-passes-when-github-does-not-say` in `feature-catalog.yaml`
and the comment above it. There is no design document; *Decisions* below is complete.

**What the specifying session verified on 2026-10-31, against `main` at `e4aa273`, with
git 2.43.0 and Node v22.23.4, in a Claude Code cloud session on Linux x86_64:**

- This repository has the ruleset applied: GitHub's API, read unauthenticated, returns
  the rules `deletion`, `non_fast_forward`, `pull_request` and `required_status_checks`
  (`pipeline / gate`, strict) for `main`, and `allow_auto_merge: true` for the repository.
- The push run on `e4aa273` (run 41227062902) failed only in `pipeline / host`, whose log
  reads: `host: the main branch main is not gated: GitHub did not say whether auto-merge
  is allowed.` So the pipeline's token read the rules — no rule gap was reported — but the
  repository answer it got carries no `allow_auto_merge`. The unauthenticated answer does;
  the job's token's does not.
- `scripts/pipeline.mjs`: `gateGaps(repository, rules)` pushes
  `'auto-merge is not allowed'` when `repository.allow_auto_merge === false`, and
  `'GitHub did not say whether auto-merge is allowed'` when it is not a boolean.
  `readHost(repo)` returns `{ branch, gaps: gateGaps(repository, rules.value) }`.
  `hostCommand` prints
  `host: ${answer.branch} requires a pull request and a passing check, and auto-merge is allowed.`
  and exits 0 when `gaps` is empty, and otherwise `notGatedText(...)` and exits 1. Its
  JSDoc and `gateGaps`'s say the job fails until auto-merge is allowed.
- `guards/pipeline.test.js`, `describe('host')`, has the test
  *says when GitHub did not report auto-merge*, which expects exit 1 and that sentence;
  *fails on a branch with no rules, naming each gap, the command and the opt-out*, which
  passes `allow_auto_merge: false` and expects `auto-merge is not allowed`; and *names only
  what is missing*. Its stub `gh` answers `api repos/acme/app` with `$STUB_REPO`.
- `framework/workflow.md`, *Say whether anything enforces this*, and `templates/README.md`
  (the operator guide) each say the job fails until auto-merge is allowed.
  `framework/DECISIONS.md` FW-037's *Evidence* says the repository's answer carries
  `allow_auto_merge`, which held for the unauthenticated read only.

**Model tier: Small.** Every change is given verbatim.

**Requires:** nothing beyond the repository.

**Merge authority: self-merge.** The criteria are checked by tests. You write the
`## Review record` yourself before merging (see Task 5).

Do not store a kick-off prompt on this plan.

---

## Delivers

host-check-passes-when-github-does-not-say

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-host-unknown -b plan/host-check-passes-when-github-does-not-say` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit `.claude/`, `.tropis/` or
  `.cursor/`.
- **Add no dependency. Do not lower, skip or delete a guard** other than replacing the one
  test *Decision 2* names. Every commit has a body.
- **The main branch is gated.** Push only to this plan's branch, open a pull request, and
  merge it with auto-merge (squash) once the review record is on the branch.

## Decisions

Taken by the specifying session on 2026-10-31, with the developer.

### 1. Unknown is not a gap

Only an answer that says auto-merge is off is a gap. A missing answer is not checked: it
is no safety gap, because `gh pr merge --auto` refuses loudly where auto-merge is off, and
the branch rules — the real gate — stay strictly checked.

In `scripts/pipeline.mjs`:

- In `gateGaps`, delete the line
  `else if (typeof repository.allow_auto_merge !== 'boolean') gaps.push('GitHub did not say whether auto-merge is allowed');`
- `readHost` returns
  `{ branch, gaps: gateGaps(repository, rules.value), autoMergeKnown: typeof repository.allow_auto_merge === 'boolean' }`.
- In `hostCommand`, when `gaps` is empty, the line is the existing one when
  `answer.autoMergeKnown` is true, and otherwise exactly:
  `host: ${answer.branch} requires a pull request and a passing check. GitHub does not tell the pipeline whether auto-merge is allowed, so that is not checked.\n`
  It goes to stdout and the summary, as the existing line does, and the job exits 0.
- `gateGaps`'s JSDoc gains: `A repository answer with no allow_auto_merge is not a gap:
  GitHub leaves it out for the pipeline's token.` `hostCommand`'s JSDoc becomes:
  `Whether the default branch is gated by GitHub, or the project has said why not. Fails
  until the branch requires a pull request and a check and GitHub does not say auto-merge
  is off, or .claude/project.json records ungated.`

### 2. The tests

In `guards/pipeline.test.js`, `describe('host')`, replace the test
*says when GitHub did not report auto-merge* with one named
*passes, saying so, when GitHub does not say whether auto-merge is allowed*: with
`repo: { default_branch: 'main' }` and the default gated rules, it expects exit 0, stderr
`''`, stdout exactly the new line followed by `\n`, the summary containing it, and stdout
not containing `auto-merge is allowed.`. Keep *fails on a branch with no rules…* and
*names only what is missing* as they are: they hold the failing case.

### 3. The words

- `framework/workflow.md`: replace `check and auto-merge is allowed, or` with
  `check and auto-merge is not turned off, or`.
- `templates/README.md`: replace
  `the main branch requires a pull request and a check and auto-merge is allowed, or until`
  with
  `the main branch requires a pull request and a check and auto-merge is not turned off, or until`,
  and after the sentence `Only rulesets are read: a classic branch protection rule does not count.`
  insert the sentence
  `GitHub does not tell the pipeline whether auto-merge is allowed, so the job checks it only where GitHub says, and turning it on stays your step.`
  Rewrap the paragraph to the file's line width.
- `framework/DECISIONS.md`: at the end of FW-037, after its *Consequences* paragraph and
  before the `---` line, add a blank line and:
  `**Amended 2026-10-31:** GitHub leaves allow_auto_merge out of the repository answer it
  gives the pipeline's own token, so on the first gated run here the job failed on a
  branch that was gated. The job now fails on auto-merge only when GitHub says it is off;
  a missing answer is reported and not checked. The Evidence above was read
  unauthenticated, which returns the field.`

## Traps

- **The self-check reads committed content only.** Commit, then run it.
- **In `templates/README.md` the sentence `Only rulesets are read: …` is wrapped across
  two lines** (`…does not` / `count.`). Match it across the line break; a one-line
  search for it finds nothing.
- **The new test passes the default rules on purpose.** Do not add `allow_auto_merge` to
  its `repo`: the missing field is the case under test.
- **Red first:** add the test, commit, run it, and record that it fails (exit 1, the old
  sentence on stderr) before changing `pipeline.mjs`.

## File Structure

| File | Change |
|---|---|
| `scripts/pipeline.mjs` | *Decision 1* |
| `guards/pipeline.test.js` | *Decision 2* |
| `framework/workflow.md` | *Decision 3* |
| `templates/README.md` | *Decision 3* |
| `framework/DECISIONS.md` | *Decision 3* |
| `feature-catalog.yaml` | the entry to `shipped`, a comment naming this plan's handover |
| `docs/superpowers/plans/2026-10-31-host-check-passes-when-github-does-not-say.md` | the handover report and the review record |

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, `git status --porcelain` (expected: nothing) and
`bash scripts/check-blueprint.sh` (expected last line starts `Self-check passed`).

To run one source guard, from the worktree root, after committing:

```bash
S="$(mktemp -d)" && git archive HEAD | tar -x -C "$S" \
  && echo '{"type":"module"}' > "$S/package.json" \
  && cp "$S/templates/framework-jest.config.js" "$S/jest.config.js" \
  && ln -s "$PWD/.tropis/node_modules" "$S/node_modules" \
  && (cd "$S" && node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/pipeline.test -t host); rm -rf "$S"
```

### Task 1 — Test first

Apply *Decision 2*. Commit. Run the command above and record that the new test fails.

### Task 2 — The fix

Apply *Decision 1*. Commit. Run the command above: every `host` test passes. Paste the
summary line.

### Task 3 — The words, and the fresh-agent check

Apply *Decision 3*. The change to `framework/workflow.md` owes a fresh-agent check. Start
a fresh agent session in the worktree (for Claude Code, `claude -p`; any current agent
tool will do) with, verbatim:

> This is a probe and will be discarded; change no file. Read `framework/workflow.md`,
> section *Branching*. A project's pipeline `host` job printed: "host: main requires a
> pull request and a passing check. GitHub does not tell the pipeline whether auto-merge
> is allowed, so that is not checked." and the project's `.claude/project.json` records no
> `ungated`. Is this project's main branch gated, and what command would you use to merge
> a green pull request number 7?

Pass: it says the branch is gated and gives `gh pr merge 7 --auto --squash` with a subject
and body. Record the prompt, the reply, and the tool, version, operating system and
architecture in the commit body of this task's commit. If no agent tool can be started
here, say so under *Outstanding*.

### Task 4 — Catalog and verification

Set the entry's `status: shipped` and `modules` to `scripts/pipeline.mjs`. Above the
entry, a comment: `# Shipped by docs/superpowers/plans/2026-10-31-host-check-passes-when-github-does-not-say.md;
# criteria 1 and 2 by guards/pipeline.test.js, describe host; criterion 3 by Task 3's
# fresh-agent check.` Commit. Run `npm --prefix .tropis test` and
`bash scripts/check-blueprint.sh`, and record both.

### Task 5 — Handover report, review record, merge

Append `## Handover report` with the six sections `rules/planning.md` names, then
`## Review record` with its five sections (this repository is public, so *Found* opens
with a `Public exposure:` line). As the merging party you re-break the fix — a throwaway
commit restoring the deleted line in `gateGaps`, the new test going red, then drop it —
and record that. Commit, push the branch, open a pull request against `main`, and turn on
auto-merge with squash, subject
`fix(pipeline): the host check passes a gated branch when GitHub does not report auto-merge`
and a body stating the intent, `Implements: host-check-passes-when-github-does-not-say`
and `Plan: docs/superpowers/plans/2026-10-31-host-check-passes-when-github-does-not-say.md`.
If the pull request falls behind `main`, rebase it on `origin/main` and push; it merges
once green again.

## Handover report

Executed by the session that also merges (self-merge authority). Tools: git 2.43.0,
Node v22.23.4, Linux x86_64. Worktree used: `../tropis-host-unknown` on
`plan/host-check-passes-when-github-does-not-say`, not the directory the session started in.

**Task completion**

- Task 0 — done. `npm --prefix .tropis ci` ran; `git status --porcelain` clean; baseline
  self-check passed before any change.
- Task 1 — done, commit `7270ef2`. Red run (before the fix):
  `jest … -t host` → `Tests: 1 failed, 88 skipped, 10 passed, 99 total`. The failing test
  was *passes, saying so, when GitHub does not say whether auto-merge is allowed*, failing
  at `expect(result.status).toBe(0)` (Expected 0, Received 1). The run stopped at that
  assertion, so the stderr check was not reached.
- Task 2 — done, commit `4cce10c`. Host guard after the fix:
  `Tests: 88 skipped, 11 passed, 99 total`; every `host` test passes.
- Task 3 — done, commit `48880a6`. Fresh-agent probe run with `claude -p`, Claude Code
  2.1.316, Linux x86_64, tools limited to Read, Glob and Grep, from the worktree, with the
  probe prompt verbatim. The reply said the branch is gated and gave
  `gh pr merge 7 --auto --squash` with a subject and body, which passes the check. The
  reply also raised one gap (see *Outstanding*). The record is in the commit body.
- Task 4 — done, commit `994bcd2`. Catalog entry `status: shipped`,
  `modules: [scripts/pipeline.mjs]`, and the plan/criteria comment above it. The YAML
  parses and the entry reads back as shipped.
- Task 5 — this section and the review record below. Re-break done, see *Checks re-run*.

**Verification results**

- `bash scripts/check-blueprint.sh` on `994bcd2`: exit 0; last line
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test` on `994bcd2`: `Test Suites: 13 passed, 13 total`,
  `Tests: 125 passed, 125 total`, exit 0.
- Host guard after the fix (Task 2): `Tests: 88 skipped, 11 passed, 99 total`.
- The task's summary line is the new pass line in `pipeline.mjs`, printed by the job
  when GitHub does not say (see `guards/pipeline.test.js`, the host test that now passes).

**Scope**

`git diff --stat origin/main...HEAD` before this section was added:

```
 feature-catalog.yaml    |  8 ++++++--
 framework/DECISIONS.md  |  6 ++++++
 framework/workflow.md   |  2 +-
 guards/pipeline.test.js | 10 +++++++---
 scripts/pipeline.mjs    | 17 ++++++++++++-----
 templates/README.md     | 10 ++++++----
 6 files changed, 38 insertions(+), 15 deletions(-)
```

Every file is in the File Structure table. This plan file is the sixth row; this section
and the review record are its only change in this commit. The re-break commit was dropped
with `git reset --hard HEAD~1` before the diff was taken, so it is not in the stat.

**Judgment calls**

- Task 1's test passes the default rules, not `allow_auto_merge` in `repo`, as the plan
  says; the missing field is the case under test.
- `templates/README.md`: rewrapped from *the main branch requires…* to the end of the
  paragraph, the line before it left as it was. The sentence `Only rulesets are read: …`
  was matched across its line break.
- `framework/workflow.md`: applied as a one-line replacement, so the line is now a few
  columns wider than the file's usual wrap. Not rewrapped, since the plan gave the words.
- The re-break was done as a commit and dropped with a hard reset of this branch's own
  head, which held nothing else.

**What the plan got wrong**

- Task 1 said the red run shows exit 1 with the old sentence on stderr. It showed exit 1
  failing the status assertion; the stderr assertion was never reached. The plan's
  expectation was otherwise right.
- The plan says "paste the summary line". The guard prints a Jest summary, not a single
  line, so the summary above is the Jest one.
- Consequence the plan did not state: after this merges, `main` stays red. Its push run
  executes the installed release's `pipeline.mjs`, which still has the gap. The run on
  `d7b7d3c` (`41227427705`, job `pipeline / host`) fails with exactly the line the plan
  quotes. The fix reaches `main`'s run only when a release installs it.

**Outstanding**

1. **Probe gap, not dispositioned here.** `framework/workflow.md`, *Branching*, does not
   say what to do when `gh pr merge --auto` is refused because auto-merge is off. The
   probe proposed stopping and reporting, not a plain `--squash` merge. This plan's file
   list does not cover it. It needs a decision: a catalog entry, or a line in the
   framework. Owner: the developer, through the specifying session.
2. **`pipeline / host` on this pull request and on `main` will fail** until a release
   installs this fix. This is expected and does not block the merge; only `pipeline / gate`
   is required. Owner: the next release.
3. **Criterion only the developer can observe:** a gated project's `host` job passes on
   its next run after a release installs the fix. Owner: the developer, when that release
   reaches a gated project.

## Review record

Merged by the executor under self-merge authority (the plan's *Merge authority* line).
This is not an independent review: the same session wrote the change and runs these checks.

**Checks re-run**

Run on the branch head `994bcd2` before merge, same session, same tools as above:

- Host guard: `Tests: 88 skipped, 11 passed, 99 total`.
- Re-break (throwaway commit restoring the deleted `gateGaps` line): host guard
  `Tests: 1 failed, 88 skipped, 10 passed` — the new test
  *passes, saying so, when GitHub does not say whether auto-merge is allowed* went red.
  The commit was then dropped.
- Self-check: exit 0, `Self-check passed` (see Verification results).
- Project tests: `Tests: 125 passed, 125 total`.
- Diagnosis re-checked, not only the figures: unauthenticated
  `GET repos/fcapurso/tropis` returns `"allow_auto_merge": true`, so the field exists
  publicly. The `host` log of `41227427705` shows the message the plan describes,
  `GitHub did not say whether auto-merge is allowed`, on `d7b7d3c`. The claim that the
  pipeline's own token omits the field was not tested directly here; the log is consistent
  with it and is the only evidence available.

**Found**

Public exposure: nothing. The branch diff was read for home paths, hostnames, email
addresses, the project's own name and internals, and session ids; none found. The probe
gap in *Outstanding* is a finding the handover also reported; it is not a new defect here.

**Outstanding disposition**

1. Probe gap — carried forward to the developer as a decision (catalog entry or framework
   line). No catalog id yet; not dropped.
2. `pipeline / host` red on this pull request and on `main` until a release installs the
   fix — expected; carried to the next release.
3. The gated-project pass — developer observes after that release.

**Learnings routed**

The probe gap generalises: a framework section that says a gate exists does not say what
to do when the host refuses the merge it names. Routed as Outstanding item 1, to the
developer as a decision. Not written into a rule here, because the framework files this
plan touched are outside its file list.

**Merged because**

The fix is mechanical and tested: the new test was red before the fix and green after,
the re-break goes red again, and the full installed-release suite passes. The one thing
the merge cannot do is turn `main`'s own run green; that waits on a release, and the
handover says so.
