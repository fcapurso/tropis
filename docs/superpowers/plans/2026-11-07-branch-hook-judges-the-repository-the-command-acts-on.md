# The branch hook judges the repository a command acts on — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `scripts/branch-in-worktree.sh` works out which directory a branch-creating
command acts on — from a leading `cd` or `pushd`, and from `git -C` — and refuses the
branch only when that directory is in a repository's main checkout, so a session in a
project's main checkout can make a branch in another clone, as every flush does, with
the command the flush gives.

**Backlog item:** `branch-hook-judges-the-repository-the-command-acts-on` in
`feature-catalog.yaml` (type bug). No spec: the backlog item's acceptance criteria are
the spec.

**One plan:** what becomes true is one sentence — the branch hook refuses a branch only
where the command makes it in a main checkout.

**Model tier: Medium.** The behaviour and every test case are given below; the parsing
code is the executor's to write, against the existing tokenizer, and needs care with
shell separators.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 5; do not open a pull request, write a review record
or merge.

**No fresh-agent check is owed:** nothing under `framework/`'s workflow, `rules/` or
`commands/` changes what an agent is told to do; the hook keeps the refusal FW-040
decided. The decision record gains an entry, which is a record, not an instruction.

**What the specifying session verified on 2026-11-07, against `origin/main` at
`71248ba`:**

- `scripts/branch-in-worktree.sh` reads the command from the payload, exits 0 unless
  `command-at-position.py` finds `git checkout`, `git switch` or `git branch` at command
  position, then compares `git rev-parse --path-format=absolute --git-dir` with
  `--git-common-dir` **in the directory the hook runs in**, exits 0 when they differ (a
  linked worktree) or outside a repository, and only then parses the command with an
  inline Python program that imports `scripts/command-at-position.py` as a module
  (`tokenize`, `skip_prefix`, `SEPARATORS`, `CONSUMES_NEXT`) and prints the branch name
  created, if any. The refusal names the folder from `git rev-parse --show-toplevel` and
  prints the worktree line for `../$folder-$leaf`, based on `origin/main` with a
  fetch first when `origin` exists, else on `main`.
- The inline program skips `git`'s global options by `CONSUMES_NEXT`
  (`-C`, `-c`, `-R`, `--repo`), so for `git -C dir checkout -b x` it already finds the
  branch; it never reads the `-C` value. The header comment says: "The hook judges the
  directory it runs in, not a cd inside the command".
- `tokenize` uses `shlex` with `punctuation_chars='();<>|&\n'`, so `&&`, `||`, `;`,
  `|`, `&`, `(`, `)` and newline come out as their own tokens; `SEPARATORS` is
  `{'&&', '||', '|', '&', ';', '\n', '('}` — `)` is not in it. Quotes are removed:
  `cd "a b"` gives the tokens `cd`, `a b`. A `$VAR` stays as the literal text `$VAR`.
- The hook's tests are the `describe('branch-in-worktree refuses a branch created in
  the main checkout')` block in `guards/rule-delivery.test.js`, which run
  `.tropis/hooks/branch-in-worktree.sh` under `root` (`FRAMEWORK_ROOT`, set by the
  self-check to an install of the source) against real git in scratch repositories made
  by `checkout()` (a `main-checkout` folder in its own scratch parent, with a bare
  `origin.git` beside it). Its `refused` list includes `'git -C . checkout -b feature/x'`
  and `'git fetch origin && git checkout -b feature/x'`; its `is silent in a linked
  worktree` case runs every `refused` command with the linked worktree as the hook's
  directory. `guards/fresh-clone.test.js` runs the hook once with
  `git checkout -b x` in a fresh repository and expects exit 2.
- `framework/DECISIONS.md` ends at FW-073. FW-040's *Consequences* say: "A command that
  `cd`s into a worktree before creating a branch is judged by where the hook runs, and
  may be refused; the command it prints is still correct." Decision entries are
  appended, and an entry that changes an earlier one says `Amends FW-0NN's …` in its
  *Consequences* (FW-072 does so for FW-063).
- `RELEASES.md` has `## [Unreleased]` holding `_Nothing yet._`.
- A flush (`commands/flush-upstream.md`) clones the framework into a temporary
  directory and creates `upstream/<flush name>/<date>-<slug>` there, from a session
  whose own directory is the project's main checkout.

**Decided by the specifying session:**

- **Which directory a command acts on.** Walk the command's segments in order, keeping a
  *current directory*, which starts as the hook's own directory:
  - A segment whose command (after `skip_prefix`) is `cd` or `pushd` with exactly one
    argument that is not an option sets the current directory to that argument, resolved
    against the current directory, with a leading `~` or `~/` expanded from `HOME` —
    **but only when the next token is `&&`, `;` or a newline**. After any other token
    (`||`, `|`, `&`, `)`, end of command) the cd may not have happened where the later
    command runs, so the current directory becomes *unknown*.
  - `cd` or `pushd` with no argument, `-`, an option, or an argument containing `$` or a
    backtick; and any `popd`: the current directory becomes *unknown*.
  - `(` saves the current directory and `)` restores the saved one, so a `cd` inside a
    subshell does not outlive it.
  - For the `git` segment that creates the branch, each `-C <dir>` among its global
    options resolves against the current directory in turn (git's own rule), and the
    result is the directory the command acts on. A `-C` value containing `$` or a
    backtick, or a global option `--git-dir` or `--work-tree` (separate value or `=`),
    makes it *unknown*.
  - *Unknown* means the hook judges its own directory, as today (acceptance criterion 3).
- **A directory that does not exist yet** (a `git clone … tmp && cd tmp && git checkout
  -b x` in one command) is judged by its nearest existing ancestor. A clone into a
  temporary directory then passes, since its ancestor is in no repository, and a new
  folder inside the main checkout is still refused.
- **The judgment is unchanged**, only its directory: in a repository whose git dir equals
  its common git dir, refuse; in a linked worktree or outside any repository, exit 0.
- **The refusal names the repository it judged.** The folder in `This is the main
  checkout of <folder>.` and in the printed worktree line comes from that repository's
  top level, and `origin` is looked up there. When that top level is not the top level
  of the hook's own directory, the printed line starts with `cd <top level> && `, the
  path quoted with `printf %q`, so the line works when pasted from where the session is.
- **Parse before asking git.** The early `git rev-parse` in the hook's own directory
  moves after the parse, since the directory to ask about is known only then. The inline
  program prints the branch on its first line and the directory, absolute, on its second
  (empty for unknown).
- **A new decision entry, FW-074,** amends FW-040's consequence, as the acceptance
  criterion asks; FW-040 itself is not edited (decision entries are not rewritten).

---

## Delivers

branch-hook-judges-the-repository-the-command-acts-on

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-branch-hook -b plan/branch-hook-judges-repository origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test**; every existing
  case in the hook's `describe` block keeps passing unchanged.
- **Leave `scripts/command-at-position.py` unchanged**: other hooks call it, and the
  inline program in the hook can do all the work.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## File Structure

| File | Change |
|---|---|
| `scripts/branch-in-worktree.sh` | resolves the directory a command acts on, judges that; header comment follows |
| `guards/rule-delivery.test.js` | new cases in the branch-in-worktree `describe` block |
| `framework/DECISIONS.md` | FW-074 appended |
| `RELEASES.md` | one line under `## [Unreleased]`, replacing `_Nothing yet._` |
| `feature-catalog.yaml` | the backlog item moves to `shipped` (the specifying session does this at merge; the executor does not touch it) |
| `docs/superpowers/plans/2026-11-07-branch-hook-judges-the-repository-the-command-acts-on.md` | this plan; the handover report |

## Task 1 — the tests, red first

In `guards/rule-delivery.test.js`, inside the branch-in-worktree `describe` block, after
the `is silent outside a repository` case, add the cases below. Each builds what it needs
with the block's own `checkout()`, `git()` and `runBranchHook()`; "other" means a second
repository made with `git init -q -b main` and one commit (write a small helper in the
block for it, `otherRepo(parent)`, creating `<parent>/other-repo`). Quote paths in
commands with single quotes, since scratch paths may hold no spaces but the hook must
not depend on that.

Let through — `expect(r).toEqual({ status: 0, stdout: '', stderr: '' })` — with the
hook run in the main checkout `dir`:

1. `cd '<other>' && git checkout -b feature/x`
2. `cd '<other>' && git switch -c feature/x`
3. `git -C '<other>' checkout -b feature/x`
4. `git -C '<other>' switch -c feature/x`
5. `cd '<other>'; git branch feature/x`
6. `cd '<parent>' && git -C other-repo checkout -b feature/x` (a relative `-C` after a cd)
7. `git -C '<parent>' -C other-repo switch -c feature/x` (two `-C`, git's rule)
8. `cd '<linked>' && git checkout -b feature/x`, and the same with `git -C '<linked>'`,
   where `<linked>` is a linked worktree of the main checkout (as the existing linked
   case makes it)
9. `git clone -q '<other>' '<parent>/fresh' && cd '<parent>/fresh' && git checkout -b feature/x`,
   where `<parent>/fresh` does not exist when the hook runs, and `<parent>` is in no
   repository: judged by the nearest existing ancestor.

Still refused — exit 2, empty stdout, stderr containing
`This is the main checkout of main-checkout.` — with the hook run in `<other>`:

10. `cd '<dir>' && git checkout -b feature/x`
11. `git -C '<dir>' switch -c feature/x`
12. `cd '<dir>/src' && git branch feature/x` (a subdirectory that exists)
13. `cd '<dir>' && mkdir -p new && cd new && git checkout -b feature/x` (a folder that
    does not exist yet, inside the main checkout)

    For 10 to 13, the printed line is
    `` `  cd ${dir} && git fetch origin && <the worktree line> origin/main` `` — check
    that stderr contains `  cd ` followed by the main checkout's path and
    ` && git fetch origin && `, and, running that line with `bash -c` from `<other>`,
    that it creates `<parent>/main-checkout-x` on `origin/main` (as the existing
    *prints a command that bases the branch on origin/main* case does; remove the
    worktree after).

Judged where the hook runs, as today — run in the main checkout `dir`, each refused
with `This is the main checkout of main-checkout.`, and its printed line with no
leading `cd `:

14. `cd "$OTHER" && git checkout -b feature/x` (literal `$OTHER`)
15. `cd '<other>' || git checkout -b feature/x`
16. `(cd '<other>') ; git checkout -b feature/x`
17. `cd - && git checkout -b feature/x`
18. `cd && git checkout -b feature/x` — with `HOME` set in the hook's environment to
    `<other>`: a bare `cd` is unknown, not resolved from `HOME`. Pass `env` to
    `runBranchHook` for this one (add an optional third parameter, `env`, defaulting to
    `process.env`).
19. `git --git-dir='<other>/.git' checkout -b feature/x`
20. `cd '<other>' | cat; git checkout -b feature/x`

And one with `~`:

21. Run in `dir` with `HOME` set to `<parent>`: `cd ~/other-repo && git checkout -b feature/x`
    is let through, and `cd ~/main-checkout && git checkout -b feature/x` run in
    `<other>` is refused.

Commit the tests alone. Run the block staged as *Verification* step 2 says, and see it
red against the unchanged hook: cases 1 to 9 and 21's first half fail (the old hook
refuses them, judging the main checkout); 10 to 13 and 21's second half fail (it runs in
`<other>`, judges that, and is silent); 14 to 20 pass, because they pin today's
behaviour. Record the failing and passing counts in the handover. If any of 14
to 20 fails against the old hook, the test is wrong: fix it.

## Task 2 — the hook

Change `scripts/branch-in-worktree.sh` as *Decided by the specifying session* says:

1. Move the parse before any git call. The inline program, given the hook's own
   directory (pass `"$PWD"` as a second argument) and `HOME` (from the environment),
   prints the created branch on line 1 and, on line 2, the absolute directory the
   command acts on, or nothing when it is unknown. Keep its existing branch-finding
   logic (`created`, `value_of`, `BRANCH_NOT_CREATING`, `BRANCH_COPY`); add the
   directory tracking alongside the segment walk. Use `os.path.normpath(os.path.join(…))`
   to resolve, never the filesystem (the directory may not exist).
2. In bash: read the two lines; when the directory is empty use `$PWD`. Walk up from it
   to the nearest existing directory. Run the git-dir and common-dir comparison with
   `git -C "$target"`; exit 0 outside a repository or in a linked worktree, as today.
3. Take `folder` from `git -C "$target" rev-parse --show-toplevel`, look up `origin`
   with `git -C "$target" remote get-url origin`, and when that top level differs from
   `git rev-parse --show-toplevel` in the hook's own directory (or the hook's directory
   is in no repository), put `cd $(printf %q "$top") && ` at the start of the printed
   line. The rest of the message is unchanged.
4. Replace the header comment's sentence "The hook judges the directory it runs in, not
   a cd inside the command, …" with one saying the hook judges the directory the command
   acts on — after a leading `cd` or `pushd` joined by `&&`, `;` or a newline, and git's
   `-C` — and its own directory where it cannot tell; keep the clause about filtering the
   command itself because Cursor ignores `if`.

Commit, then run the block staged again: every case passes, the old ones included.

## Task 3 — the decision record

Append to `framework/DECISIONS.md`:

```markdown
## FW-074: The branch hook judges the repository a command acts on

**Date:** 2026-11-07 · **Status:** Accepted; built by the backlog item
`branch-hook-judges-the-repository-the-command-acts-on`.

**Decision:** The hook that refuses a branch in a main checkout works out the directory
the command acts on — after a leading `cd` or `pushd` joined by `&&`, `;` or a newline,
and git's `-C` — and judges the repository there. Where it cannot tell, it judges the
directory it runs in, as before. A directory that does not exist yet is judged by its
nearest existing ancestor.

**Evidence:** first-adopter's flush of 2026-11-07: a flush clones the framework into a
temporary directory and creates its branch there, from a session in the project's main
checkout. The hook judged the project, refused the branch, and printed a worktree command
for the wrong repository, and the flush worked around it with git plumbing. Source: none
in particular.

**Rejected:** Telling a flush to create its branch with `git -C` and leaving the hook as
it was: the hook did not read `-C` either. Running the command's `cd`s for real to find
the directory: a hook must not act. Letting through every command that changes
directory: a `cd` into the main checkout itself would then pass.

**Consequences:** Amends FW-040's "a command that `cd`s into a worktree before creating a
branch is judged by where the hook runs": it is judged where it creates the branch, so a
`cd` into a linked worktree or another clone passes, and one into the main checkout is
refused with a worktree command that starts by changing to it. A `cd` joined by `||`, a
pipe or `&`, a `cd` to a variable, `cd -` and a bare `cd` still leave the hook judging
its own directory.
```

## Task 4 — the release notes

In `RELEASES.md`, replace `_Nothing yet._` under `## [Unreleased]` with:

```markdown
- The hook that refuses a branch in your main checkout now judges the repository the command acts on, after a leading `cd` or git's `-C`. A flush, or any session in your main checkout, can create a branch in another clone or in a worktree with an ordinary `git checkout -b`, and a branch aimed at the main checkout from elsewhere is now refused too.
```

## Task 5 — verification, then the handover report

Commit everything first: the self-check reads committed content only.

1. `bash scripts/check-blueprint.sh` from the worktree. It must end with `Self-check
   passed:`. A red verdict names its log folder; fix and re-run, or stop and report.
2. Run `guards/rule-delivery.test.js` and `guards/fresh-clone.test.js` alone, staged as
   `CLAUDE.md` (*To run one source guard alone*) says. The hook's tests resolve the hook
   as `.tropis/hooks/branch-in-worktree.sh` under `FRAMEWORK_ROOT`, so the staging must
   also give them an installed copy of the source: read how `scripts/check-blueprint.sh`
   sets `FRAMEWORK_ROOT` for the framework repository's own guards and do the same. Run
   with `-t 'branch-in-worktree'` for the block alone. Passing: every case passes. To
   prove the staging runs the source and not `.tropis/`, put `origin/main`'s
   `scripts/branch-in-worktree.sh` back in the export once and see cases 1 to 13 and 21
   fail; report both outputs.
3. Report `git --version`, `python3 --version`, `bash --version | head -1` and
   `uname -sm`, the tools the hook's tests ran on.
4. `npm --prefix .tropis test` from the worktree (after `npm --prefix .tropis ci`): it
   must pass; report its count.
5. `git diff --stat origin/main...HEAD`: every file in the File Structure table, nothing
   else.

Then append `## Handover report` to this plan, with the six sections
`.claude/rules/planning.md` names (*Every plan ends with a handover report*), commit it,
run step 1 again on that commit, and push the branch.

## Traps

- **Your own session runs the installed hook.** `.tropis/hooks/branch-in-worktree.sh`
  is the last release's and judges the directory your shell starts in. If your shell
  starts in the main checkout, a test command you type that creates a branch elsewhere
  may be refused; run it from the worktree, which is a linked worktree and is let
  through.
- **Cases 14 to 20 pass before the change.** They pin today's behaviour where the hook
  cannot tell; do not "fix" them to fail first.
- **`)` is not in `SEPARATORS`.** Handle it yourself in the inline program; do not add
  it to `command-at-position.py` (Global Constraints).
- **`npm --prefix .tropis test` runs the installed release**, not this change. Do not
  edit `.tropis/` to make the change show there.
- **A refused branch's printed line is a worktree command.** It is quoted in the tests
  and in the hook already; the plan names it only as "the worktree line" outside its
  Repositories table, because the plan check refuses that command anywhere else.

## Handover report

### Task completion
Tasks 1 to 4 done; Task 5 verification below. The backlog item was not touched.

### Verification results
Ran on git 2.43.0, Python 3.13.18, GNU bash 5.2.21, Linux x86_64.
- `bash scripts/check-blueprint.sh` after the decision/notes commit: "Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed." Run again on the report commit (see the reviewer's re-run note under Outstanding if absent).
- Block staged from an export of HEAD (package file, `framework-jest.config.js`, node_modules from `.tropis`, and `FRAMEWORK_ROOT` an install holding `scripts/*.sh|py` as `.tropis/hooks/`), `-t 'branch-in-worktree|fresh'`: new hook, 45 passed, 2 failed (both in `guards/fresh-clone.test.js`: "a script without its packages says to install them", "no framework script imports yaml except through load-yaml"). The same two fail with origin/main's hook put back, so they are an artefact of my hand-made staging, not of the change; the full self-check runs fresh-clone green.
- Origin/main's hook put back in that staging: 9 failed, 38 passed. The 7 new cases that failed were the let-through, nonexistent-directory, `~`, and four refused-from-elsewhere cases; the 2 others are the staging artefacts above. The cannot-tell cases (plan 14 to 20) passed against the old hook, as the plan says.
- `npm --prefix .tropis test`: 13 suites, 209 tests passed.

### Scope
`git diff --stat origin/main...HEAD`: RELEASES.md, framework/DECISIONS.md, guards/rule-delivery.test.js, scripts/branch-in-worktree.sh, plus this plan. All in the File Structure table. Worktree used: /home/user/tropis-branch-hook.

### Judgment calls
- Source named: none in particular.
- Tests are grouped (cases 1 to 9 in two tests, 14 to 20 as a loop, 21 as one test) rather than one test each.
- **The plan's cases contradict each other, and I resolved it.** Its "other" repository is a main checkout of its own, so the judgment "refuse in a repository whose git dir equals its common dir" refuses cases 1 to 7 and 21 (the first run showed this). Letting a flush's clone through requires a rule telling the project from another clone; the only available one is that the project is the repository the hook runs in. So: when the command names a directory, it is refused only if that directory is in the same repository (same git common dir) as the hook's, in its main checkout; another repository, or a hook outside any repository, is let through. Where the directory is unknown the old behaviour holds exactly.
- Consequence for plan cases 10 to 13 and 21's second half, which ran the hook in `<other>`: they now run the hook in a linked worktree of main-checkout (the "elsewhere" is a worktree of the project), where they are refused with the `cd <top> && ` line. Run from an unrelated repository they are let through, by design.
- FW-074's Decision and Rejected paragraphs were reworded to state this "project = the repository the hook runs in" rule.
- Removed nothing from `command-at-position.py`; `)` and `(` handled in the inline program.

### What the plan got wrong
The contradiction above: cases 1 to 9 and 10 to 13 cannot both hold with "other" a plain main checkout and the hook run in either. Also its failing/passing counts for the red run are not reproducible given the grouping.

### Outstanding
Reviewer to confirm the "project = hook's repository" rule is the intended meaning of "a project's main checkout", and that FW-074's wording is right.
