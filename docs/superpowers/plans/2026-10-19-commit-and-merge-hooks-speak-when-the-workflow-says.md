# The commit and merge hooks speak when the workflow says they do — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** the commit hook and the merge hook speak exactly when `framework/workflow.md`
says they do. They fire only when the command they watch is actually being run, never
when a command merely mentions it. The commit hook names every file that belongs on a
branch, not only rules and framework documents.

**Spec:** the entries `hooks-match-at-command-position` and
`commit-check-gates-what-the-workflow-gates` in `feature-catalog.yaml`. Read their
criteria and the comments above them. Both change the same scripts, and together they
make one claim true, so they are one plan.

**Why now:** since `fc6dbe6`/`d9c46d7` (2026-10-19), `framework/workflow.md` *Branching*
says that `.claude/commands/` and `.claude/rule-additions/` need a branch, and that
`framework-commit-check.sh` "speaks only when the commit carries something that belonged
on a branch". The hook watches only `.claude/rules/` and `.claude/framework/`. Without
this plan, the next release ships that false claim to every project.

**What the specifying session verified on 2026-10-19, against `main` at `ea60865`:**

- **`scripts/framework-commit-check.sh`** (86 lines):
  - It reads `tool_input.command` with an inline `python3`.
  - It matches the commit with `case "$command" in *'git commit'*) ;; *) exit 0 ;; esac`,
    a substring match.
  - It collects changed paths with `git status --porcelain -uall | sed 's/^...//; s/.* -> //'`.
  - It keeps only `grep -E '^\.claude/(rules|framework)/'`, and exits 0 when none match.
  - It prints "This commit touches the instruction layer:" with the list. On `main` it adds
    a paragraph starting "You are on main. workflow.md requires a change under
    .claude/rules/ or". It always ends with the fresh-agent paragraph.
  - Its second line reads `# Shared machinery: no part of this file is project-owned.`
- **`scripts/capture-at-merge.sh`** matches `*'gh pr merge'*` the same way, by substring.
- **`scripts/capture-at-write.sh`** speaks for `DECISIONS.md|.claude/rules/*|.claude/framework/*`
  only. It is silent on `.claude/rule-additions/`.
- **Every hook already depends on `python3`** to read its payload, and
  `scripts/check-prerequisites.sh` checks for it.
- **Hooks are installed from `scripts/installed-hooks.txt`.** It lists `hook-reply.sh`,
  `capture-at-merge.sh`, `capture-at-write.sh` and `framework-commit-check.sh`.
  `set-up-project.sh` (line 62) and `check-conformance.sh` (line 88) copy every file it
  names into `.tropis/hooks/`.
- **The hooks' tests are in `guards/rule-delivery.test.js`.** The relevant describes are
  *capture-at-merge fires on a plan merge…*, *a hook sends the same reply…*,
  *framework-commit-check fires when a commit carries the instruction layer*, and
  *capture-at-write surfaces Phase 2…*. The commit-hook tests run the hook in a temporary
  git repository on a chosen branch with a chosen file changed.
- **`scripts/check-drift.sh` already skips** lines between `# project-owned: begin` and
  `# project-owned: end`. Its header comment (lines 6–7) says "none of the scripts shipped
  today has one". `rules/harness-scripts.md` line 71 says the same.
- **CI** (`.github/workflows/ci.yml`) has no path filter. The workflow's list of what may
  go straight to `main` is encoded nowhere else.

**Model tier: Medium.** The matcher is specified by behaviour and by a table of cases,
not verbatim. Writing a small tokenizer that passes it takes care.

**Requires:** `python3` and `node`, as the existing hooks and guards do.

**Merge authority: parent review.** This changes shipped hooks that run in every project.

Do not store a kick-off prompt on this plan.

---

## Delivers

hooks-match-at-command-position
commit-check-gates-what-the-workflow-gates

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-plan-hooks -b plan/commit-and-merge-hooks-speak-when-the-workflow-says` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.** They hold the
  installed release, which takes this change only when this repository takes the release
  that ships it.
- **Do not change `templates/settings.json`.** The `if` on each Bash hook stays as it is.
  Removing it would change a hook entry in `settings.json`, which `RELEASES.md` counts as
  breaking. That is a separate decision.
- **Add no dependency.** The matcher is Python 3 standard library only.
- **Do not lower, skip or delete a guard to get green.** Existing hook tests may be changed
  only where Decision 4 changes the text they assert, and the handover must name each
  change.
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-19. Do not reopen them.

1. **One matcher, shipped as a hook file: `scripts/command-at-position.py`.** Add it to
   `scripts/installed-hooks.txt` so it lands in `.tropis/hooks/` beside the hooks.

   **Interface:**
   `python3 command-at-position.py '<words>' ['<words>' …]` reads a shell command on
   stdin. It exits 0 when any of the given commands is at command position, and 1
   otherwise. Each argument is one watched command, written as its words separated by
   spaces: `'git commit'`, `'gh pr merge'`. It prints nothing. It never exits with
   anything but 0 or 1: an internal error falls back as in rule 6 below. Its first lines
   say, as the other hooks' do, `# Shared machinery: no part of this file is
   project-owned.`, and say what it does.

   **Behaviour.** The table under *Tasks › Task 1* is the contract:

   1. **Command position** is the start of the command, or the point after any of `;`,
      `&&`, `||`, `|`, `&`, `(`, or an unquoted newline.
   2. At a command position, skip any `NAME=value` assignments, then any wrapper: `env`,
      `npx`, `command`, `exec`, `nohup`, `time` or `sudo`. After a wrapper, skip tokens
      starting with `-`; `-u` consumes the token after it. Then skip further assignments.
      Then compare the tokens with the watched command's words.
   3. Between the watched command's words, skip option tokens (starting with `-`). The
      options `-C`, `-c`, `-R` and `--repo` also consume the token after them. So
      `git -C ../x commit` and `gh -R o/r pr merge` match. A word must equal a whole
      token: `git commit-tree` does not match `git commit`.
   4. **Text inside quotes is never a command,** except the inside of a `$( … )` or a
      backtick pair. Those are checked as commands in their own right, recursively,
      including when they sit inside double quotes.
   5. **Heredoc bodies are not commands.** Remove each heredoc body (`<<WORD`, `<<'WORD'`,
      `<<"WORD"`, `<<-WORD`, through the line equal to `WORD`) before matching. Exception:
      when the command that the heredoc feeds is `bash`, `sh` or `zsh`, check the body as
      a command too.
   6. **A command that cannot be tokenized** (unbalanced quotes, or any exception) counts as
      a match if any watched command appears in it as a substring, once heredoc bodies
      are removed, and as no match otherwise.

2. **Both Bash hooks match through it.** In `framework-commit-check.sh` and
   `capture-at-merge.sh`, replace each `case "$command" in *'…'*) ;; *) exit 0 ;; esac`
   with:

   ```bash
   printf '%s' "$command" | python3 "$(dirname "${BASH_SOURCE[0]}")/command-at-position.py" 'git commit' || exit 0
   ```

   Use `'gh pr merge'` in the merge hook. Keep the comment above each match. Change its
   text to: `# Match a commit at command position (command-at-position.py). Do not rely
   on settings.json \`if\` alone.`, and the same with "a plan merge" in the merge hook.

3. **The paths that may go straight to `main` are a project-owned block in the commit
   hook.** The workflow names them as the backlog, generated documentation, plan and spec
   files, and prose under `docs/`. Only a project knows where its generated documentation
   lives, so the list is the project's. Change the hook's second line to:
   `# One part of this file is project-owned: the block naming the paths that may go straight to main.`
   Then add, before the first use:

   ```bash
   # project-owned: begin — the paths that may go straight to main (workflow.md, Branching).
   # One extended regular expression, matched against each changed path. As shipped: the
   # backlog, and everything under docs/ (plans, specs, generated documentation, prose).
   # Add your own generated documentation here if it lives elsewhere.
   may_go_to_main='^(feature-catalog\.yaml$|docs/)'
   # project-owned: end
   ```

4. **What the commit hook says.** Once Decision 2 has matched a commit, the hook reads the
   changed paths as today and sorts them into three lists:
   - **instruction layer:** `^\.claude/(rules|rule-additions|framework)/`;
   - **commands:** `^\.claude/commands/`;
   - **elsewhere:** every other path that does not match `$may_go_to_main`.

   It prints the sections that have entries, in this order, and nothing at all when none
   do:

   a. **Instruction layer.** Print the existing section unchanged, with the list. In the
      on-`main` paragraph, change `.claude/rules/ or` / `.claude/framework/` to
      `.claude/rules/, .claude/rule-additions/ or .claude/framework/`, re-wrapped to the
      paragraph's width. Keep the fresh-agent paragraph as it is.
   b. **Commands**, on any branch:

      ```
      This commit touches commands:
        <one path per line>

      A command changes how every later session behaves. The commit body must say what
      changed and why. A fresh-agent check is owed only if the edit changes what an agent
      is told to do; if it does, record it in the body as for a rule.
      ```

      If the commit is on `main`, add a blank line and `You are on main. workflow.md
      requires a change under .claude/commands/ to arrive on a branch.`
   c. **Elsewhere**, only on `main`:

      ```
      You are on main, and this commit carries files the workflow says belong on a branch:
        <one path per line>

      What may go directly to main is the backlog, generated documentation, plan and spec
      files, and prose under docs/ (workflow.md, Branching). Commit these on a branch.
      ```

   Off `main`, a commit carrying only *elsewhere* files gets no reply. On `main`, a commit
   carrying only files matching `$may_go_to_main` gets none either.

5. **`capture-at-write.sh` treats rule additions as rules.** Its `case "$path" in` pattern
   becomes `DECISIONS.md|.claude/rules/*|.claude/rule-additions/*|.claude/framework/*)`.
   Update the header comment's "a rule, decision record, or framework document" to "a
   rule, rule addition, decision record, or framework document".
6. **The two sentences that say no shipped script has a project-owned region.**
   - In `rules/harness-scripts.md`, bullet *Change a shared script only inside its
     project-owned regions*, replace `none of the scripts shipped today has one` with
     `framework-commit-check.sh has one, for the paths that may go straight to main`.
   - In `scripts/check-drift.sh`, lines 6–7, make the same replacement.

   Re-wrap only if a line now exceeds the width of its neighbours.
7. **The rule names the shipped matcher.** In `rules/harness-scripts.md`, bullet *Wire a
   hook once, and let the script do the filtering — at command position*, after `Match
   where a command begins, never inside quoted text.`, insert:
   `The framework ships the matcher: pipe the command to python3
   .tropis/hooks/command-at-position.py with the command's words, as in 'git commit', and
   it exits 0 when one is at command position.` Re-wrap the bullet to its width.
8. **`RELEASES.md`**, under `## [Unreleased]`, after the last section already there:

   ```
   ### The commit and merge hooks speak only for the command being run, and for every file that needs a branch

   The commit and merge hooks no longer fire when a command merely mentions `git commit`
   or `gh pr merge`, such as a search or a commit message. They match the command where it
   is run, through `.tropis/hooks/command-at-position.py`, which a project's own hooks can
   use too. On `main`, the commit hook now names every file the workflow says belongs on a
   branch: commands, rule additions and source, not only rules and framework documents.
   The paths that may go straight to `main` are a project-owned block at the top of
   `framework-commit-check.sh`; as shipped, the backlog and everything under `docs/`. This
   is not a breaking change.
   ```

9. **Fresh-agent check: deferred to the release.** This plan changes `rules/`. Source rules
   reach an agent only once a release installs them, and on 2026-10-19 the maintainer
   decided that the check for the flush's rule changes runs at that release. This plan
   joins it. Say so in the commit body of the commit that touches `rules/`.

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs the installed
  release's checks on this repository as a project, and is not a check of this change.
- **Task 1 is red on purpose.** The matcher's tests are written before the matcher. They
  must fail because the script is missing, not for any other reason.
- **Task 3 must be seen red with the substring match restored.** After Task 2, restore the
  `case … *'git commit'*` match in your working tree only. Run the new tests and paste the
  failures. Then put the matcher call back. Never commit the restored match.
- **The hook tests run the hook from different places.** `capture-at-merge` and
  `framework-commit-check` run from `.tropis/hooks/` under `FRAMEWORK_ROOT` (the staged tree
  in the self-check); `capture-at-write` runs from `../scripts/`. The matcher is found
  beside the hook through `dirname "${BASH_SOURCE[0]}"`. So it must be in
  `installed-hooks.txt`, or the first group goes red with an exit-0 silence, the failure
  shape `harness-scripts.md` warns about.
- **The commit-hook helper `repoWith(paths, branch = 'plan/x')` runs off `main` by
  default.** So the existing case *stays silent for a commit that touches no
  instruction-layer file* stays valid unchanged: off `main`, a file elsewhere gets no
  reply. Pass `'main'` explicitly for the new on-`main` cases. No existing case is
  expected to change. If one must, name it and why in the handover.
- **Two File Structure rows are not to be edited.** This repository's installed dispatch
  reads any `rules/<name>.md` as a shipped rule that is generated into `.claude/rules/` and
  `.cursor/rules/`, and refuses a plan that does not list both. The source fix for that is
  on `main` but not yet released. In this repository `rules/` is the next release's source,
  and nothing is generated from it. Leave both files untouched; their absence from the diff
  is expected.
- **This plan quotes a worktree command only in its Repositories table.** Keep it that way
  in the handover report.

## File Structure

| File | Change |
|---|---|
| `scripts/command-at-position.py` | New — Decision 1 |
| `scripts/installed-hooks.txt` | Decision 1 |
| `scripts/framework-commit-check.sh` | Decisions 2–4 |
| `scripts/capture-at-merge.sh` | Decision 2 |
| `scripts/capture-at-write.sh` | Decision 5 |
| `scripts/check-drift.sh` | Decision 6 (comment only) |
| `rules/harness-scripts.md` | Decisions 6 and 7 |
| `.claude/rules/harness-scripts.md` | **Not edited.** Listed only so the installed dispatch accepts the plan; see *Traps* |
| `.cursor/rules/harness-scripts.mdc` | **Not edited.** Same reason |
| `guards/rule-delivery.test.js` | Task 1 and Task 3 cases; the one changed case named in *Traps* |
| `RELEASES.md` | Decision 8 |
| `docs/superpowers/plans/2026-10-19-commit-and-merge-hooks-speak-when-the-workflow-says.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes both entries |
| `docs/backlog-board/bands.yaml` | Not edited by the executor; the reviewer removes the two bands when the entries ship |

## Tasks

### Task 1: The matcher's contract, red

Add a `describe('command-at-position', …)` block to `guards/rule-delivery.test.js`. It runs
`python3 <scripts>/command-at-position.py <words…>` with the command on stdin (resolve the
script as `resolve(here, '../scripts/command-at-position.py')`) and asserts the exit code.
One `it` per row. In the table, `\|` is a literal `|`, escaped for the table only, and row
8's command is the word `echo`, a space, then `git commit` between backticks.

| # | Command on stdin (`\n` is a newline) | Watched | Expected |
|---|---|---|---|
| 1 | `git commit -m "x"` | `git commit` | match |
| 2 | `git add -A && git commit -m "x"` | `git commit` | match |
| 3 | `cd sub; git commit` | `git commit` | match |
| 4 | `(cd sub && git commit)` | `git commit` | match |
| 5 | `echo hi \| git commit -F -` | `git commit` | match |
| 6 | `git status\ngit commit -m x` | `git commit` | match |
| 7 | `echo $(git commit -m x)` | `git commit` | match |
| 8 | ``echo `git commit` `` | `git commit` | match |
| 9 | `GIT_AUTHOR_NAME=x git commit -m y` | `git commit` | match |
| 10 | `env -u HOME FOO=1 git commit` | `git commit` | match |
| 11 | `git -C ../other commit -m x` | `git commit` | match |
| 12 | `npx gh pr merge 3 --squash` | `gh pr merge` | match |
| 13 | `gh -R o/r pr merge 3` | `gh pr merge` | match |
| 14 | `gh pr view 3 && gh pr merge 3` | `gh pr merge` | match |
| 15 | `grep -rn "git commit" scripts/` | `git commit` | no match |
| 16 | `grep -rn 'gh pr merge' docs/` | `gh pr merge` | no match |
| 17 | `echo git commit` | `git commit` | no match |
| 18 | `git commit-tree HEAD^{tree}` | `git commit` | no match |
| 19 | `git log --grep 'git commit'` | `git commit` | no match |
| 20 | `cat > notes.md <<'EOF'\nrun git commit later\nEOF` | `git commit` | no match |
| 21 | `bash <<'EOF'\ngit commit -m x\nEOF` | `git commit` | match |
| 22 | `git commit -m "$(cat <<'EOF'\nfix: say when to gh pr merge\nEOF\n)"` | `gh pr merge` | no match |
| 23 | the same command as row 22 | `git commit` | match |
| 24 | `echo "unterminated && git commit` | `git commit` | match |
| 25 | `echo "unterminated quote` | `git commit` | no match |
| 26 | `git commit -m x` | `git commit` `gh pr merge` (two arguments) | match |

Rows 15, 16, 19 and 22 are the criterion's grep and commit message that mention each
watched command.

Commit, then run `bash scripts/check-blueprint.sh`. Expected: red only on these new cases,
each failing because the script does not exist. Paste the summary.

### Task 2: The matcher, green

Write `scripts/command-at-position.py` to Decision 1. Python's `shlex` with
`punctuation_chars` and newline removed from `whitespace` tokenizes most of this; extract
`$( … )` and backtick contents, and heredoc bodies, before tokenizing. Add it to
`scripts/installed-hooks.txt`. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 3: The hooks use it, and speak for every file that needs a branch

Decisions 2–5. Add these cases to `guards/rule-delivery.test.js`, using the existing helpers
that run a hook in a temporary repository:

- **framework-commit-check**, on `main`:
  - a change to `.claude/commands/x.md` gets the *Commands* section and the on-`main`
    sentence;
  - a change to `.claude/rule-additions/x.md` gets the instruction-layer section;
  - a change to `src/app.js` gets the *Elsewhere* section naming it;
  - a change to `docs/notes.md` alone gets no reply;
  - a change to `feature-catalog.yaml` alone gets no reply.
- **framework-commit-check**, on a branch:
  - `src/app.js` alone gets no reply;
  - `.claude/commands/x.md` gets the *Commands* section without the on-`main` sentence.
- **framework-commit-check**, with `.claude/rules/x.md` changed, on `main`:
  - the command `grep -rn "git commit" .` gets no reply;
  - a `git commit -m "$(cat <<'EOF' … EOF)"` whose message mentions `gh pr merge` gets the
    instruction-layer reply.
- **capture-at-merge**:
  - `grep -rn 'gh pr merge' docs/` gets no reply;
  - `git commit -m "say when to gh pr merge"` gets no reply;
  - `gh pr merge 3 --squash` still gets the routing questions.
- **capture-at-write** emits the check for `.claude/rule-additions/planning.md`.

Then do the red check in *Traps*: restore both substring matches in the working tree, run
the self-check, and paste which of the new cases fail. Put the matcher calls back. Commit,
then run `bash scripts/check-blueprint.sh`: green.

### Task 4: The words

Decisions 6–8. Run:

```bash
git grep -n "none of the scripts shipped today" -- rules scripts framework commands templates
```

Expected: no output. Commit, then run `bash scripts/check-blueprint.sh`: green. The body of
the commit touching `rules/` carries Decision 9's sentence.

### Task 5: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only files from *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. In *Verification results*, paste the Task 1 red, the Task 3 red with the substring
match restored, and the final green. In *Outstanding*, say that the fresh-agent check is
deferred to the release (Decision 9), that the reviewer promotes both entries, and whether
anything in the table of cases had to change.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Both hooks decide through one shipped matcher | Decision 2; the two hooks' diffs |
| The matcher finds a command at every listed position, never inside quotes | Task 1 rows 1–14, 17–19 |
| Unparseable counts as a match after heredocs are removed; a heredoc fed to a shell is checked | Rows 20–25 |
| The watched commands are a parameter | Interface in Decision 1; row 26 |
| A grep and a commit message mentioning each watched command, red with the substring match | Rows 15, 16, 19, 22 and the Task 3 hook cases, seen red in Task 3 |
| On `main` the hook names every file outside the may-go-to-main paths, silent for only those | Task 3 *on main* cases |
| `.claude/commands/` named, told branch and body, fresh-agent check only when it changes what an agent is told | Task 3, Decision 4b |
| `.claude/rule-additions/` treated as `.claude/rules/` | Task 3 rule-additions case |
| capture-at-write speaks for `.claude/rule-additions/` | Task 3 last case |
| Each case runs the hook on a real payload and goes red when reverted | Task 3 red check |

## Not in this plan

- **Removing the `if` from the Bash hooks in `templates/settings.json`**, as
  `harness-scripts.md` advises ("wire once"). With this matcher in place it becomes safe,
  but it changes a hook entry, which is a breaking change. That is a separate decision.
- **Pointing CI's path filter at the may-go-to-main list.** This repository's CI has none,
  and a set-up project gets no CI until `setup-offers-ci-for-its-host` ships.
- **This repository's installed hooks** (`.tropis/hooks/`) keep the substring match until
  it takes the release that ships this.

## Handover report

Ran on dev-laptop.local (macOS 26.2), Node v22.15.0, Python 3.12.10.
The self-check is `bash scripts/check-blueprint.sh`. The matcher is that Python.

### Task completion

| Task | Status |
|---|---|
| 1 — The matcher's contract, red | Done — commit `1660440`. The self-check went red on all 26 new rows |
| 2 — The matcher, green | Done — commit `387441d`. Self-check exit 0 |
| 3 — The hooks use it | Done — commit `39578bb`, plus `3b35f80` so the suite could see the owned block. Substring restoration was never committed |
| 4 — The words | Done — commit `9a6fead`. `git grep` for the retired sentence printed nothing. The body carries Decision 9 |
| 5 — Handover | Done — this section |

No task skipped. Nothing in the table of cases had to change.

### Verification results

**Task 1 — `bash scripts/check-blueprint.sh` on `1660440`.** Exit 1. `rule-delivery` fails on the clean project, so its planted defect is reported as cannot-run, and the clean baseline names every new row. A missing script makes this Python exit 2 (`can't open file`), which is neither 0 nor 1.

```
  CANNOT RUN  plain-reply            rule-delivery fails on the clean project, so its failure proves nothing

Clean baseline: every guard must pass
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● rule delivery › command-at-position › row 1 matches
              ● rule delivery › command-at-position › row 2 matches
              ● rule delivery › command-at-position › row 3 matches
              ● rule delivery › command-at-position › row 4 matches
              ● rule delivery › command-at-position › row 5 matches
              ● rule delivery › command-at-position › row 6 matches
              ● rule delivery › command-at-position › row 7 matches
              ● rule delivery › command-at-position › row 8 matches
              ● rule delivery › command-at-position › row 9 matches
              ● rule delivery › command-at-position › row 10 matches
              ● rule delivery › command-at-position › row 11 matches
              ● rule delivery › command-at-position › row 12 matches
              ● rule delivery › command-at-position › row 13 matches
              ● rule delivery › command-at-position › row 14 matches
              ● rule delivery › command-at-position › row 15 does not match
              ● rule delivery › command-at-position › row 16 does not match
              ● rule delivery › command-at-position › row 17 does not match
              ● rule delivery › command-at-position › row 18 does not match
              ● rule delivery › command-at-position › row 19 does not match
              ● rule delivery › command-at-position › row 20 does not match
              ● rule delivery › command-at-position › row 21 matches
              ● rule delivery › command-at-position › row 22 does not match
              ● rule delivery › command-at-position › row 23 matches
              ● rule delivery › command-at-position › row 24 matches
              ● rule delivery › command-at-position › row 25 does not match
              ● rule delivery › command-at-position › row 26 matches
              ● take-version.mjs › removes its scratch folder on every exit path

2 problem(s). A guard that cannot fail is not evidence.
```

The scratch-folder failure did not reproduce. The self-check of `387441d` (the matcher, tests still present) exited 0, and so did every later green run. That test was not changed.

**Task 2 — `bash scripts/check-blueprint.sh` on `387441d`.** Exit 0. `Every guard caught its defect and passed the clean baseline.`

**Task 3 red, substring match restored in the working tree only.** `bash scripts/check-blueprint.sh` archives HEAD, so it cannot see an uncommitted restoration. The new tests were run with the self-check's Jest (Node v22.15.0) against the working tree, hooks copied from `scripts/` the way conformance copies `installed-hooks.txt`. Three new cases failed; 60 passed:

```
FAIL guards/rule-delivery.test.js (11.351 s)
  ● rule delivery › capture-at-merge fires on a plan merge and stays silent otherwise › stays silent when a search only mentions gh pr merge
  ● rule delivery › capture-at-merge fires on a plan merge and stays silent otherwise › stays silent when a commit message only mentions gh pr merge
  ● rule delivery › framework-commit-check fires when a commit carries the instruction layer › stays silent when the command only mentions git commit
Test Suites: 1 failed, 1 total
Tests:       3 failed, 60 passed, 63 total
```

The heredoc commit whose message mentions `gh pr merge` stayed green: `git commit` is the command being run, so a substring match still fires. No pre-existing case failed. The matcher calls were put back before the commit.

**Task 3 green.** The first self-check of `39578bb` exited 1, naming the drift declaration, the setup block list, and the scratch-folder test again. `3b35f80` answers the first two (below). A later official run on `3b35f80` exited 0.

**Task 4 — `git grep -n "none of the scripts shipped today" -- rules scripts framework commands templates`.** Exit 1, no output. **`bash scripts/check-blueprint.sh` on `9a6fead`.** Exit 0:

```
Checking 9a6fead of ~/src/tropis-plan-hooks

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
  caught      edited-framework-file  installed-files
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

**Task 5 — `npm --prefix .tropis test`.** Exit 0. This is the installed release's checks on this repository, not a check of the source change.

```
Test Suites: 5 passed, 5 total
Tests:       28 passed, 28 total
Time:        0.939 s
```

**`git diff --stat origin/main...HEAD`** before this handover commit, branch at `9a6fead`:

```
 RELEASES.md                       |  11 ++
 guards/rule-delivery.test.js      | 159 +++++++++++++++++++++
 guards/set-up-project.test.js     |   1 +
 rules/harness-scripts.md          |  15 +-
 scripts/capture-at-merge.sh       |   8 +-
 scripts/capture-at-write.sh       |   6 +-
 scripts/check-drift.sh            |   5 +-
 scripts/command-at-position.py    | 283 ++++++++++++++++++++++++++++++++++++++
 scripts/framework-commit-check.sh |  94 ++++++++++---
 scripts/installed-hooks.txt       |   1 +
 10 files changed, 545 insertions(+), 38 deletions(-)
```

### Scope

Every file above is in the File Structure table except `guards/set-up-project.test.js`. That test lists the shipped files that contain a project-owned block. The hook's new block is one, and the table did not name the test. The expected list now includes `.tropis/hooks/framework-commit-check.sh`. The guard still fails if a block appears anywhere else.

`.claude/rules/harness-scripts.md` and `.cursor/rules/harness-scripts.mdc` are absent from the diff, as the traps require. `feature-catalog.yaml` and `docs/backlog-board/bands.yaml` were not edited. This handover commit adds only this plan file.

### Judgment calls

- The commit hook's opening comment now says it names commands and, on main, paths outside the project-owned list. The old sentence said it fired only for rules and framework documents.
- Decision 3's second line is verbatim and does not contain the words "Shared machinery". `guards/check-drift.test.js` requires those words in every shipped `.sh`, `.mjs`, and `.js`. The next line says the rest of the file is shared machinery. The second line was not changed to get there.
- The on-main commands sentence is the plan's sentence on one line.

### What the plan got wrong

- The self-check reads committed content only, so restoring the substring match in the working tree cannot turn `bash scripts/check-blueprint.sh` red. The red check is the guard run against that working tree. The three cases above are the ones that fail.
- The specified second line drops the declaration the drift guard looks for, and the setup guard's list of blocks did not include the hook. Both are real. `3b35f80` is the fix. The setup test is not in the File Structure table.
- Task 1's self-check was not red only on the new rows. `take-version.mjs › removes its scratch folder on every exit path` was also named, and it did not reproduce on the next self-check.

### Outstanding

- The fresh-agent check is deferred to the release (Decision 9). Source rules reach an agent only once a release installs them.
- The reviewer promotes `hooks-match-at-command-position` and `commit-check-gates-what-the-workflow-gates`. This session does not. Merge authority is parent review.
- Nothing in the table of cases had to change.
- The reviewer decides whether `guards/set-up-project.test.js` stays in the diff. Without that line the setup guard is red on the hook's block.

## Review record

Reviewed by the specifying session on 2026-10-19, in a cloud session (Linux, git 2.43,
Python 3, Node 22). The executor's branch ended at `6dfa084`. `main` was merged in at
`8c2c8cb`, without rewriting the executor's commits.

### Checks re-run

- **`bash scripts/check-blueprint.sh` at `6dfa084`:** exit 0, every conformance defect
  caught, and the clean baseline ok. **`npm --prefix .tropis test`:** 28 passed.
- **The Task 3 red, re-run as a commit.** The self-check reads committed content only, so
  the substring matches were restored in a throwaway commit, never pushed. Exit 1. The
  same three cases the handover names failed:
  *stays silent when a commit message only mentions gh pr merge*, *stays silent when a
  search only mentions gh pr merge*, and *stays silent when the command only mentions git
  commit*. The planted `plain-reply` defect read as cannot-run, because the clean project
  was red.
- **The handover's two diagnoses, checked against the code.** `guards/check-drift.test.js`
  line 108 does require "Shared machinery" in every shipped script, so the plan's
  Decision 3 second line would have failed it. `guards/set-up-project.test.js` does list
  the shipped files allowed a project-owned block. Both diagnoses are true; `3b35f80` is
  the right fix for both.
- **The matcher, probed beyond the plan's 26 rows.** It returned no match for a commit
  after `then`, `do`, `{` and `!`, and for a command continued with a backslash-newline.
  See *Found*.
- **After the reviewer's fixes, at the commit before this record:** `bash
  scripts/check-blueprint.sh` exit 0. The new cases were seen red first, at the test-only
  commit: rows 27 to 32 and the `RELEASES.md` case failed, and row 33 passed.

### Found

- **The matcher's contract missed shell keywords and continued lines.** It returned no
  match for `if …; then git commit`, `for …; do git commit …; done`,
  `while …; do git commit; done`, `{ git commit; }`, `! git commit`, and
  `git add . && \` followed by `git commit` on the next line. The substring match it
  replaced caught all of these, so the commit hook went silent on a real commit, the
  failure `harness-scripts.md` warns about. This was a gap in the plan's table, not in
  the executor's work.
  **The reviewer fixed it on the branch:** a `KEYWORDS` set skipped at command position,
  a backslash-newline deleted before tokenizing, and rows 27–33. The fix is mechanical
  and declared here; the maintainer's reading of the diff is the check on it.
- **`/release` would have been warned on every run.** `commands/release.md` refuses to
  run off `main` and commits `RELEASES.md` there. The shipped may-go-to-main list did not
  include it. **The reviewer added `RELEASES\.md$`** to the shipped default, with a test
  and a clause in the release note, as the maintainer decided.
- **The plan's other errors,** all found and handled by the executor:
  - Decision 3's second line dropped the drift guard's declaration.
  - The File Structure table omitted `guards/set-up-project.test.js`.
  - Task 3's red check could not use the committed-only self-check.
- **Seen but not fixed:** the matcher also misses `/usr/bin/git commit`, `xargs git
  commit`, and a heredoc piped into `bash` (`cat <<EOF | bash`). All three are rare in
  agent commands, and each is a false negative only. Left as they are.

### Outstanding disposition

- **Fresh-agent check:** deferred to the release that installs these files, by the
  maintainer's decision of 2026-10-19 (Decision 9).
- **Entries promoted to `shipped` in this branch,** with their modules, and their bands
  removed.
  - `hooks-match-at-command-position`:
    - one matcher: Decision 2, both hooks' diffs;
    - positions, never quotes: rows 1–14 and 17–19, plus 27–33;
    - unparseable and heredocs: rows 20–25;
    - the watched commands are a parameter: row 26;
    - a grep and a commit message: rows 15, 16, 19 and 22, and the hook cases, seen red.
  - `commit-check-gates-what-the-workflow-gates`: the on-`main`, off-`main`, commands,
    rule-additions and capture-at-write cases in `guards/rule-delivery.test.js`.
- **`guards/set-up-project.test.js` stays in the diff.** Without it the setup guard is red
  on the hook's block.
- **The workflow's list of what may go straight to `main`** does not name release notes,
  though `/release` commits them there. The hook's behaviour is now right. The wording is
  put to the maintainer as a one-line prose edit; it is not tracked as an entry.
- **The three misses left unfixed** (see *Found*): dropped, as rare false negatives.

### Learnings routed

- **When a precise check replaces a crude one, test that it still catches everything the
  crude one caught.** Here a substring match was replaced by a tokenizer that matched
  every case in its contract, and still went silent on shapes the substring caught. This
  generalises beyond hooks. It is put to the maintainer as an addition to
  `rules/tests.md`; not yet written.
- **A red check against a working-tree change needs a throwaway commit when the check
  reads committed content only.** It is put to the maintainer as an addition to
  `rules/planning.md`, next to the verification bullets; not yet written.

### Merged because

The executor delivered the plan as written, with a correct handover. The review's two
fixes, keywords with continued lines and `RELEASES.md`, are small, tested, seen red and
then green, and declared above.
