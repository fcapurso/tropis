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
