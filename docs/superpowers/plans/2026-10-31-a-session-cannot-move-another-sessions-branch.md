# A session that creates a branch does it in its own worktree — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** no agent session creates a branch in a project's main checkout. The workflow
tells a session to create its branch in a sibling worktree of its own, based on
`origin/main`, and to remove it once merged. A new hook refuses `git checkout -b`,
`git switch -c` and `git branch <name>` in the main checkout and prints the command to
run instead, and `/update`, the one command that creates a branch there today, creates
its branch in a worktree.

**Spec:** the entry `a-session-cannot-move-another-sessions-branch` in
`feature-catalog.yaml`. There is no design document; the decisions below are the design.

**What the specifying session verified on 2026-10-31, against `main` at `4b5e2bf` and
the branch `plan/a-self-merging-pull-request-is-seen-through` at `a8a6a0d` (pull request
55, open and unreviewed), with git 2.49.0 in Claude Code on macOS 26.2 arm64:**

- **What happened.** Two agent sessions worked in this repository's main checkout at
  once. One checked out its branch, and the other's next commit landed on it; a pull by
  one moved the branch the other was building on. Nothing said so until a push carried
  the wrong commit. The entry's `value` records it.
- **What the workflow says today.** `framework/workflow.md`, *Branching*: "One branch
  per plan: `plan/<id>-<slug>`", and "A dispatched agent always works in its own
  worktree, never in the directory the specifying session is using", with the command
  shown as the worktree command `../<repo>-<id> -b plan/<id>-<slug>` and **no base**. So
  the new branch starts from whatever the checkout running it has checked out. Nothing
  tells any other session (the one specifying, the one landing a backlog edit, the one
  dispatching) where to create a branch, and they create it in the main checkout.
- **Which instructions create a branch.** `git grep -nE 'checkout -b|switch -c|git branch
  [a-z<]|worktree add' -- commands framework rules templates scripts README.md` finds:
  `commands/update.md` Stage 5 (`git switch -c update/<target>`) and line 91 (its failure
  case); `framework/workflow.md` line 186 (the dispatched-agent worktree command);
  `rules/planning.md` line 110 (the example Repositories row); and `scripts/plan-binding.js`,
  which only matches the worktree command. No other command creates a branch.
- **How hooks are built here.** Every PreToolUse hook sources `scripts/hook-reply.sh`
  and filters the command itself with `scripts/command-at-position.py`, because Cursor
  ignores `if` on a Bash hook (`rules/harness-scripts.md`, *Wire a hook once*).
  `scripts/command-at-position.py` defines `tokenize(text)` and `is_at_position(text,
  watched)` and runs `main` only under `if __name__ == '__main__'`, so it can be imported
  by path. **A hook that must stop a call exits 2 with its message on stderr**: measured
  to refuse the call and reach the agent in both Claude Code and Cursor
  (`rules/harness-scripts.md`, the table and the bullet after it). A permission key does
  neither.
- **How a hook is shipped.** `scripts/installed-hooks.txt` lists the hooks;
  `scripts/set-up-project.sh` and `scripts/check-conformance.sh` read it, and
  `guards/set-up-project.test.js` builds its expected file list from it.
  `templates/settings.json` wires them; its `_comment` says "The Bash matcher carries
  three hooks". `scripts/take-version.mjs` merges the framework's hook entries into a
  project's `.claude/settings.json` on update; `guards/take-version.test.js` (around
  line 409) enumerates the Bash hooks it expects after an update. The precedent is
  `docs/superpowers/plans/2026-10-28-public-project-is-checked-for-private-material.md`,
  which added `public-exposure-check.sh` the same way; its tests sit in
  `guards/rule-delivery.test.js`, *public-exposure-check speaks at commit and push*.
- **Telling the main checkout from a linked worktree.** In the main checkout `git
  rev-parse --path-format=absolute --git-dir` and `--git-common-dir` print the same
  directory; in a linked worktree `--git-dir` is under `.git/worktrees/`. Checked in
  this repository and in `../tropis-see-through`.
- **`/update` already runs in a worktree.** `scripts/take-version.mjs`, `setupName`:
  "an update run in a worktree or a renamed folder builds its scratch copies under the
  same name". A fresh worktree has no `.tropis/node_modules`, so Stage 7's
  `npm --prefix .tropis test` needs `npm --prefix .tropis ci` there first.
  `guards/release.test.js`, *the pipeline offer*, pins four sentences of Stage 6 item 7
  of `commands/update.md`; none changes.
- **This plan edits text pull request 55 rewrites.** That pull request replaces the
  gated bullet in *Branching* and the last sentence of the gated paragraph in *Merge and
  clean up*, and adds FW-039. *Decision 4* is written against its text. Hence
  **Requires** below.
- **Review records read.** None exists yet from this entry. The public-exposure plan's
  record found its handover's placeholder text matching a private-material pattern once
  `main` moved; run the self-check again after any rebase.
- **Re-checked after pull request 55 merged**, against `main` at `8ee3ed8`: every text
  *Decisions 3 and 4* anchor on appears exactly once in its file, and the last decision
  is FW-039.

**Model tier: Medium.** Every printed line, the matched commands and the documentation
text are given. The hook's parsing and its tests are the executor's to write.

**Requires:** pull request 55 (a-self-merging-pull-request-is-seen-through) merged into main; check with gh pr view 55 --json state before isolating.

**Merge authority: parent review.** The hook refuses commands in every project's main
checkout; a false refusal blocks ordinary work, and the fresh-agent check needs the
specifying session's reading. Stop after the handover report (Task 6). Do not write a
review record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

a-session-cannot-move-another-sessions-branch

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-session-branch -b plan/a-session-cannot-move-another-sessions-branch origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's own entry
  pair. This repository's own sessions are not refused by the new hook until a release
  carrying it is installed; that is expected.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body. A commit touching `framework/` or `rules/` states in its body what the
  fresh-agent check found, or that it is recorded in the handover report because the
  probe runs later.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, in the handover or in the probe's scratch project.

## Decisions

### 1. A new hook, `scripts/branch-in-worktree.sh`, that refuses

Shared machinery throughout (second line `# Shared machinery: no part of this file is
project-owned.`), with a header comment in the voice of `framework-commit-check.sh`
saying what it refuses, why it refuses rather than advises, and that it filters the
command itself. It reads `tool_input.command` from the payload as that hook does, and:

1. **Exits 0 silently** unless the command has, at command position, one of
   `git checkout`, `git switch` or `git branch`
   (`python3 "$(dirname "${BASH_SOURCE[0]}")/command-at-position.py" 'git checkout' 'git switch' 'git branch'`).
2. **Finds a branch being created.** Load `command-at-position.py` from beside the hook
   with `importlib.util.spec_from_file_location`, tokenize the command with its
   `tokenize`, and for each occurrence at command position read the words that follow up
   to the next separator (`&&`, `||`, `|`, `&`, `;`, newline):
   - `git checkout`: `-b <name>` or `-B <name>`.
   - `git switch`: `-c <name>`, `-C <name>`, `--create <name>`, `--force-create <name>`,
     or the `=` forms of the long options.
   - `git branch`: the first word not starting with `-`, provided none of these options
     appears: `-d`, `-D`, `--delete`, `-m`, `-M`, `--move`, `-l`, `--list`, `-u`,
     `--set-upstream-to`, `--unset-upstream`, `--edit-description`, `--contains`,
     `--no-contains`, `--merged`, `--no-merged`, `--points-at`, `--show-current`, `-a`,
     `--all`, `-r`, `--remotes`, `-v`, `-vv`, `--verbose`. (`-c`/`-C`/`--copy` create a
     branch: the name is the last word not starting with `-`.)
   - Options between `git` and the subcommand (`-C <dir>`, `-c <key=value>`) are
     skipped, as `command-at-position.py` already does when matching.
   The first such name wins. No name: exit 0 silently. Do not change
   `command-at-position.py`.
3. **Exits 0 silently** when the hook's working directory is not in a git repository,
   or is a linked worktree: `git rev-parse --path-format=absolute --git-dir` differs from
   `--git-common-dir`. The hook judges the directory it runs in; it does not follow a
   `cd` inside the command.
4. **Otherwise exits 2**, with the message of *Decision 2* on stderr and nothing on
   stdout. It does not source `hook-reply.sh`: a refusal is the stderr channel, and a
   JSON reply on top of it is not measured.

Wire it in `templates/settings.json` once, under the `Bash` matcher, with **no `if`**,
after `framework-commit-check.sh` and before `public-exposure-check.sh`. Hooks in one
matcher run in sequence and the comment says a blocking one goes before one that only
adds context; the commit hook never sees a branch command, so before
`public-exposure-check.sh` is the place. Change the comment's "carries three hooks for
moments no file path marks: merging a plan, committing a change to the rules or
framework, and committing or pushing in a public project" to "carries four hooks for
moments no file path marks: merging a plan, committing a change to the rules or
framework, creating a branch in the main checkout, and committing or pushing in a public
project", and "The first two are narrowed" stays as it is. Add `branch-in-worktree.sh`
to `scripts/installed-hooks.txt` after `framework-commit-check.sh`.

### 2. The refusal, verbatim

`<dir>` is the base name of `git rev-parse --show-toplevel`. `<leaf>` is the branch
name after its last `/`. `<branch>` is the name as given. `WORKTREE-ADD` below stands
for the two words `worktree add`: this plan cannot spell that command whole outside its
Repositories table (*Traps*). Write it whole in the hook.

When `git remote get-url origin` succeeds:

```
This is the main checkout of <dir>. Other sessions may be working in it, and a branch
created here moves under them. Create the branch in a worktree of its own, based on
origin/main, and work there:

  git fetch origin && git WORKTREE-ADD ../<dir>-<leaf> -b <branch> origin/main

Leave this checkout on main, for pulling and reading. Once the branch has merged, remove
the worktree and delete the branch (workflow.md, Branching).
```

When it fails (no `origin`), the same with `based on main` in place of `based on
origin/main`, and the command line `  git WORKTREE-ADD ../<dir>-<leaf> -b <branch> main`.

### 3. `/update` creates its branch in a worktree

In `commands/update.md`:

- **Stage 1.** After `Remember the current branch as *the starting point*.` (its
  sentence on a detached repository stays), add: `Remember the base name of the
  repository's top folder (`git rev-parse --show-toplevel`) as *the folder*.`
- **Stage 5.** Replace the code block and the paragraph after it with:

  ````markdown
  ```bash
  git WORKTREE-ADD ../<the folder>-update-<target> -b update/<target> <the starting point>
  cd ../<the folder>-update-<target>
  npm --prefix .tropis ci
  node <clone>/scripts/take-version.mjs . [--accept-breaking]
  ```

  The update gets a worktree of its own, beside this checkout, so a session working in
  this checkout is not moved onto `update/<target>`. **From here on, run every command
  in that worktree**; this checkout stays as it was.

  If the worktree command fails because `update/<target>` already exists, an earlier
  update was left there. Stop, say so, and leave that branch alone; discard the clone.
  The user decides whether to finish it, merge it or delete it.
  ````

  (`WORKTREE-ADD` as in *Decision 2*: write it whole.)
- **Stage 7.** Replace `and do not switch away from `update/<target>`.` with `and leave
  the worktree in place.`
- **Stage 8.** Replace `On `update/<target>`, commit everything the update changed.`
  with `In the worktree, on `update/<target>`, commit everything the update changed.`
  Replace the last bullet's quoted words with: `Review the branch, then merge
  update/<target> the way this project merges a branch, and remove its worktree,
  ../<the folder>-update-<target>, once it has merged.`
- **Stage 9.** Replace the code block with:

  ```bash
  cd <this checkout>
  git worktree remove --force ../<the folder>-update-<target>
  git branch -D update/<target>
  node .tropis/scripts/update.mjs discard <clone>
  ```

  and replace `Use the commit hash as the starting point when the repository was
  detached. Before the branch exists, only discard the clone.` with `Before the
  worktree exists, only discard the clone.` Its last line stays.

### 4. The workflow and the rule, verbatim

`framework/workflow.md`, *Branching*, as it stands after pull request 55 merged:

**a. A new bullet, directly after `- One branch per plan: `plan/<id>-<slug>`. Do not
commit feature work directly to `main`.`:**

```markdown
- **A session creates its branch in a worktree of its own, never in the main
  checkout.** Two sessions open on one project share the main checkout, so one
  session's checkout or pull moves the branch the other is working on: a commit lands
  on the wrong branch, or starts from the other session's work, and nothing says so
  until a push carries it. So a session about to create a branch — a plan's executor,
  the session landing a backlog edit or a plan, the one dispatching — runs
  `git fetch origin && git WORKTREE-ADD ../<repo>-<slug> -b <branch> origin/main` and
  works there. The base is `origin/main` whatever the main checkout has checked out.
  The main checkout stays on `main`, used only to pull and read. A hook refuses
  `git checkout -b`, `git switch -c` and `git branch <name>` in the main checkout and
  prints that command. Once the branch has merged, remove the worktree and delete the
  branch, as *Merge and clean up* does.
```

**b. The gated bullet.** Replace `commit on a branch, push it, open the pull request,`
with `commit on a branch in a worktree of its own (above), push it, open the pull
request,`.

**c. The dispatched-agent bullet.** Its command becomes
`git WORKTREE-ADD ../<repo>-<id> -b plan/<id>-<slug> origin/main` (add the base, nothing
else).

`rules/planning.md`, *A plan names the checkouts it may touch*: the example row's
isolation becomes `git WORKTREE-ADD ../the-project-readme-shell -b plan/readme-shell
origin/main`.

`templates/README.md`, after the paragraph ending `An update never touches the file.`
that describes `.claude/worktree-setup.txt`, add:

```markdown
An agent creates every branch in a worktree of its own beside this folder, never in this
folder: two sessions sharing it would move each other's branch. A hook refuses
`git checkout -b`, `git switch -c` and `git branch <name>` here and prints the command
that creates the worktree instead. Your own commands in a terminal are not affected.
```

### 5. The decision record

Add to `framework/DECISIONS.md` the next free `FW-` number (FW-040 unless another plan
has taken it), in the format of FW-037 (heading, `**Date:** 2026-10-31 · **Status:**
Accepted`, then **Decision**, **Evidence**, **Rejected**, **Consequences**):

- **Heading:** `A session creates its branch in a worktree of its own`.
- **Decision:** Every session that creates a branch does it in a sibling worktree based
  on `origin/main`, and the main checkout stays on `main`. A hook refuses the
  branch-creating commands in the main checkout, and `/update` creates its branch in a
  worktree.
- **Evidence:** two sessions in this repository's main checkout moved each other's
  branch, found only when a push carried the wrong commit (the entry). The workflow's
  worktree command had no base, so it branched from whatever was checked out.
- **Rejected:** Advising instead of refusing: the hook's reply arrives with the call,
  which still runs, so the main checkout has moved before the agent reads the advice.
  Refusing every `git checkout` and `git switch` in the main checkout: a session
  switching back to `main` is the repair, and refusing it blocks that. Exempting
  `/update`: the same hazard applies to its branch.
- **Consequences:** An agent that is asked to switch the main checkout to an existing
  branch is not stopped. A command that `cd`s into a worktree before creating a branch
  is judged by where the hook runs, and may be refused; the command it prints is still
  correct. The developer's own terminal is not affected.

### 6. What this owes, and does not

- **A fresh-agent check** (Task 4), because `framework/workflow.md` and `rules/` change.
- **The operator guide** (`templates/README.md`), because an agent in a project is now
  refused a command.
- **No rule-area change** and no generated rule file: `rules/` is the next release's
  source, and nothing in this repository is generated from it.
- **No release-notes edit.** `/release` drafts the notes from the backlog.

## Traps

- **Write `WORKTREE-ADD` as the two words `worktree add` in every target file.** It
  is a placeholder only in this plan: the plan check refuses a worktree command anywhere
  in a plan except its Repositories table. The handover report must not spell it whole
  either; write "the worktree command".
- **The tests must fail first.** Task 1 commits the tests before the hook exists; the
  self-check must then fail on them. That is the red step.
- **The self-check reads `HEAD` only.** Commit before each run. Red runs are ordinary
  commits on this branch; they disappear in the squash.
- **The hook test needs a real linked worktree.** Create it in the test with the
  worktree command from a temporary main checkout; a directory named like a worktree is
  not one.
- **Criterion 3's test runs git for real**, against a temporary bare repository as
  `origin`; never the network.
- **The existing hook tests must keep passing**, in particular the take-version test
  that enumerates the Bash hooks after an update: add the new hook where the merge puts
  it, and change `scripts/take-version.mjs` only if that test shows the merge does not
  carry a new framework hook.
- **If the text *Decision 4* anchors on is not in `framework/workflow.md`**, pull
  request 55 changed it in review. Stop and hand back to the specifying session; do not
  rewrite around it.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/branch-in-worktree.sh` | new — *Decisions 1 and 2* |
| `scripts/installed-hooks.txt` | add the hook |
| `templates/settings.json` | wire it, and the comment — *Decision 1* |
| `guards/rule-delivery.test.js` | the hook's tests (Task 1) |
| `guards/take-version.test.js` | the enumerated Bash hooks after an update |
| `guards/set-up-project.test.js` | only if an assertion enumerates the hooks by name |
| `scripts/take-version.mjs` | only if the take-version test shows a new hook is not merged |
| `guards/release.test.js` | assertions on `commands/update.md` and `framework/workflow.md` (Task 1) |
| `commands/update.md` | *Decision 3* |
| `framework/workflow.md` | *Decision 4* |
| `rules/planning.md` | *Decision 4* |
| `templates/README.md` | *Decision 4* |
| `framework/DECISIONS.md` | *Decision 5* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` set, a comment mapping criteria to tests |
| `docs/superpowers/plans/2026-10-31-a-session-cannot-move-another-sessions-branch.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Run `gh pr view 55 --json state` and confirm `"state":"MERGED"`; if not, stop and say
so. Isolate (the Repositories table). In the worktree run `npm --prefix .tropis ci`,
then `git status --porcelain` (expected: nothing), then `bash scripts/check-blueprint.sh`
(expected: last line starts `Self-check passed`). Record `git --version`,
`node --version`, `python3 --version` and `uname -sm`, and the commit you started from.

### Task 1 — The tests, red

In `guards/rule-delivery.test.js`, add `describe('branch-in-worktree refuses a branch
created in the main checkout')`, built like the public-exposure tests: run the installed
hook (`.tropis/hooks/branch-in-worktree.sh` under `root`, as `exposureHook` is) with the payload
Claude Code sends, `{ tool_name: 'Bash', tool_input: { command } }`, in a temporary
repository made with `git init -q -b main` and one commit. Tests:

1. **Refuses** with exit 2, empty stdout, and stderr containing
   `This is the main checkout of <dir>.` and the exact command line of *Decision 2*, for
   each of: `git checkout -b feature/x`, `git checkout -B feature/x`,
   `git switch -c feature/x`, `git switch --create feature/x`,
   `git switch --create=feature/x`, `git branch feature/x`, `git branch feature/x main`,
   `git -C . checkout -b feature/x`, `git fetch origin && git checkout -b feature/x`.
   The repository has a bare repository as `origin`, so the line ends `origin/main`, and
   `<leaf>` is `x`.
2. **Refuses from a subdirectory** of the main checkout.
3. **Says `main` with no origin:** a repository without `origin` gets the
   `based on main` text and the command line ending `-b feature/x main`.
4. **Is silent in a linked worktree:** exit 0, empty stdout and stderr, for every
   command in test 1, run inside a worktree of the temporary repository.
5. **Is silent in the main checkout** (exit 0, no output) for: `git checkout main`,
   `git switch main`, `git branch`, `git branch -d x`, `git branch -D x`,
   `git branch -m a b`, `git branch --list 'p*'`, `git branch --show-current`,
   `git branch -a`, the worktree command creating `../y` with `-b y origin/main`,
   `git commit -m "git checkout -b x"`, `grep -rn "git switch -c" .`, `git status`.
6. **Is silent outside a repository.**
7. **Its command bases the branch on origin/main** (criterion 3): a bare `origin` whose
   `main` is commit A; the main checkout on a branch `other` with a commit B on top of
   A. Take the command line from the refusal, run it with `bash -c` in the main
   checkout, and assert that the worktree `../<dir>-x` exists, that
   `git -C ../<dir>-x rev-parse HEAD` is A, and that the main checkout is still on
   `other` at B. Remove the worktree afterwards.
8. **Is wired once**, under the `Bash` matcher with no `if`, in
   `templates/settings.json`, after `framework-commit-check.sh` and before
   `public-exposure-check.sh`; and `scripts/installed-hooks.txt` lists it.

In `guards/release.test.js`, in *the pipeline offer* (it already reads `update.md` and
`workflow.md` whitespace-collapsed), add a test: `update.md` does not contain
`git switch -c`, and contains `-b update/<target> <the starting point>` and
`From here on, run every command in that worktree`; `workflow.md` contains
`A session creates its branch in a worktree of its own, never in the main checkout.`
and `-b plan/<id>-<slug> origin/main`.

In `guards/take-version.test.js`, add `'bash .tropis/hooks/branch-in-worktree.sh'` to
the enumerated Bash hooks where the merge puts it.

Commit. Run `bash scripts/check-blueprint.sh`. It must fail: the new hook tests, the new
text assertions and the take-version enumeration fail; the existing tests pass. Paste
the failing test names.

### Task 2 — The hook

Apply *Decisions 1 and 2*. Commit. Run `bash scripts/check-blueprint.sh`. Only the text
assertions may still fail. Paste the result.

### Task 3 — The text and the decision

Apply *Decisions 3, 4 and 5*. Commit, with the fresh-agent check noted as pending in the
body. Run `bash scripts/check-blueprint.sh`. The last line must start
`Self-check passed`. Paste it.

### Task 4 — The fresh-agent check

Aim it at the new *Branching* bullet and the hook. Run it where the developer's own
user-level instructions do not load, such as a cloud session. If you run it locally,
first check whether those instructions say anything about worktrees or where to create a
branch, and say so in the record.

Set up a scratch project with this branch's `scripts/set-up-project.sh`, give it a bare
repository as `origin` with `main` pushed, and leave its checkout on `main`. Start a
fresh agent session in it (for Claude Code, `claude -p`), prompt piped on stdin: "This
is a probe; its output will be discarded. In this project, add a line `- probe` to
`docs/notes.md` on a new branch called `notes/probe`, commit it, and report where the
commit is." **Pass** when the commit is on `notes/probe` in a sibling worktree whose
branch starts from `origin/main`, and the scratch project's own checkout is still on
`main` with no new commit. Record whether the agent tried a branch command in the main
checkout first and was refused, the tool, its version, the operating system and the
architecture, and the reply, abridged. Then remove the scratch project and its worktree.

### Task 5 — Catalog and full verification

In `feature-catalog.yaml`, on `a-session-cannot-move-another-sessions-branch`: set
`status: shipped`, and set `modules` to `scripts/branch-in-worktree.sh`,
`templates/settings.json`, `framework/workflow.md` and `commands/update.md`. Add this
comment directly above the entry's `- id:` line:

```yaml
# Shipped by docs/superpowers/plans/2026-10-31-a-session-cannot-move-another-sessions-branch.md.
# Criteria 1 and 4 are covered by release.test.js (the workflow text) and the
# fresh-agent check in the handover. Criteria 2 and 3 are covered by rule-delivery.test.js
# (branch-in-worktree), which runs the hook and the command it prints against real git.
```

Do not put `: ` (colon and space) inside an unquoted YAML value. Commit. Then, from the
worktree:

- `npm --prefix .tropis test`: paste the `Tests:` line.
- `bash scripts/check-blueprint.sh`: paste the last line, which must start
  `Self-check passed`.
- `git diff --stat origin/main...HEAD`: paste it; every file must be in *File Structure*.

### Task 6 — Handover report, then stop

Append `## Handover report` to this plan with the six sections the planning rule names:
*Task completion*, *Verification results* (each command, its actual output, and the
tool, version, operating system and architecture, never the computer's name), *Scope*
(the diff stat, confirmation that every file is in *File Structure*, the worktree path
used), *Judgment calls*, *What the plan got wrong*, *Outstanding*.

Say where the code came from: nothing outside this repository, unless something was; in
that case, name it. Commit and push. Open the pull request with a body saying what is
now true, ending with the attribution lines your session gives. Do not set auto-merge.
Then stop: parent review merges.

## Handover report

### Task completion

- **Task 0** done. Started from `116137a`; pull request 55 was `MERGED`. Baseline self-check passed. git 2.49.0, Node v22.15.0, Python 3.12.10, Darwin arm64 (macOS).
- **Task 1** done. Tests committed first; the self-check then failed on the new hook tests, the new text assertion in `release.test.js` and the take-version enumeration (and, as a side effect of the missing hook file, the capture-at-write cases that loop over the installed hooks).
- **Task 2** done. Hook written, wired, listed. See *Judgment calls* for one test fix.
- **Task 3** done. `commands/update.md`, `framework/workflow.md`, `rules/planning.md`, `templates/README.md`, `framework/DECISIONS.md` (FW-040). Self-check passed.
- **Task 4** done, locally (see below).
- **Task 5** done. Entry shipped, modules set, comment added.
- **Task 6** this report.

### Verification results

All on git 2.49.0, Node v22.15.0, Python 3.12.10, Claude Code 2.1.300, macOS (Darwin) on arm64.

- Red run (after Task 1): `Self-check FAILED: conformance or the clean baseline`; failing names included every `branch-in-worktree refuses a branch created in the main checkout › refuses …` case, `… › is wired once …`, `take-version.mjs › merges settings.json: the project keeps its keys and hooks, the shipped hooks follow`, and `the pipeline offer › creates every branch in a worktree of its own, never in the main checkout`.
- After the hook (Task 2): only the refusal tests and the text assertion still failed.
- After the text (Task 3) and again after the catalog: `bash scripts/check-blueprint.sh` last line: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total` / `Tests: 127 passed, 127 total`.
- **Fresh-agent check.** Scratch project made with this branch's `scripts/set-up-project.sh`, bare repository as `origin` with `main` pushed, checkout on `main`. Run locally with `claude -p` (Claude Code 2.1.300, macOS arm64), permission mode `acceptEdits` with git, Read, Edit and Write allowed; the prompt was the one in Task 4. The user-level instructions that loaded say nothing about worktrees or where to create a branch. Result: **pass**. The commit `a531a3e` was on `notes/probe` in a sibling worktree started from `origin/main` (`ff94933`); the scratch checkout stayed on `main` at `ff94933`, clean. The agent's reply said the project's workflow requires a separate worktree. `-p` output does not show tool calls, so **I cannot say whether it first tried a branch command in the main checkout and was refused**; it appears to have followed the workflow text. The hook's refusal itself is covered by the tests, not by this probe. The scratch project and worktree were removed.
- `git diff --stat origin/main...HEAD`: 12 files changed, 412 insertions, 21 deletions (the list under *Scope*), plus this report.

### Scope

Files: `commands/update.md`, `feature-catalog.yaml`, `framework/DECISIONS.md`, `framework/workflow.md`, `guards/release.test.js`, `guards/rule-delivery.test.js`, `guards/take-version.test.js`, `rules/planning.md`, `scripts/branch-in-worktree.sh` (new), `scripts/installed-hooks.txt`, `templates/README.md`, `templates/settings.json`, and this plan. All are in *File Structure*. `guards/set-up-project.test.js` and `scripts/take-version.mjs` needed no change. Worktree used: the sibling of the main checkout named `tropis-session-branch`.

Code came from nothing outside this repository: the hook reuses `command-at-position.py` by import and follows `framework-commit-check.sh`'s shape.

### Judgment calls

- The refusal text wraps `based on` / `origin/main` across a line, as *Decision 2* prints it. My first tests looked for the words on one line; I changed the tests to collapse whitespace, not the message.
- A command that cannot be tokenized exits 0 silently (the hook cannot judge it).
- `git branch` with `-c/-C/--copy` takes the last non-option word as the name, as the plan says; `git checkout -bname` (no space) is not detected.
- The no-origin command line omits `git fetch origin &&`, as *Decision 2* shows.
- The `/update` worktree is named from the folder and target; Stage 5 runs `npm --prefix .tropis ci` in it, as the plan gives.

### What the plan got wrong

- Task 1 says only the new tests fail in the red run; the capture-at-write cases that iterate the installed hooks also failed until the hook file existed.
- The hook's wrapped message makes a one-line `based on origin/main` assertion impossible.
- The anchor for the gated bullet in *Decision 4b* is wrapped across two lines in the file; I matched it across the line break and re-wrapped.

### Outstanding

- The fresh-agent run does not show whether the hook refused anything; the specifying session may want a probe where the agent is told explicitly to use `git checkout -b` in the main checkout, to see the refusal reach it.
- Not run on Cursor.
- This repository's own sessions are not covered by the hook until a release carrying it is installed.

## Review record

Reviewed 2026-11-01 by the specifying session, in a sibling worktree of its own
(`tropis-review-58`, detached at the pull request's head, so the executor's worktree was
left alone), on Claude Code 2.1.300 (Opus 5.5), macOS 26.2 arm64, git 2.49.0. The
branch was rebased onto `origin/main` at `116137a` with no conflicts.

### Checks re-run

- `git diff --stat origin/main...HEAD`: 13 files, all in *File Structure*
  (`guards/set-up-project.test.js` and `scripts/take-version.mjs` were not needed).
- `npm --prefix .tropis test`: `Tests: 127 passed, 127 total`.
- `bash scripts/check-blueprint.sh` on the rebased head with the review fixes: `Self-check
  passed: every guard caught its defect, the clean baseline passed, and the framework
  repository's own guards passed.`
- **Re-breaking the hook.** A throwaway commit in a second worktree changed the hook's
  final `exit 2` to `exit 0`, leaving its message. The self-check failed (`Self-check
  FAILED: conformance or the clean baseline`) on 11 tests: every *refuses …* case, *refuses
  from a subdirectory of the main checkout* and *says main, not origin/main, when there is
  no origin*. The criterion-3 test passed, as it should: it checks the printed command,
  not the refusal. The commit and worktree were discarded.
- **The hook by hand**, on a scratch repository with a bare `origin` and a linked
  worktree. Refused (exit 2, the right command line): `git checkout -b feat/a`,
  `git switch -c b`, `git branch c`, `echo $(git checkout -b sub)`,
  `if true; then git switch -c kw; fi`, `git branch -f d main`. Silent (exit 0):
  `git checkout main`, `git checkout -- file.txt`, `git checkout -b` with no name,
  `git log --oneline | head`, the worktree command itself, a commit message quoting
  `git checkout -b x`, any branch command in the linked worktree, and outside a
  repository. Known misses, matching the handover and FW-040: `git checkout -bname`
  and `git stash branch f` pass; `cd ../proj-wt && git checkout -b e` is refused.
- **The probe the handover could not give.** A scratch project set up with this branch's
  `scripts/set-up-project.sh`, with a bare `origin`, checkout on `main`. `claude -p`
  (Claude Code 2.1.300, Sonnet 5.5, macOS 26.2 arm64) with `--output-format stream-json`
  so the tool calls show, prompted: "This is a probe; its output will be discarded. Run
  exactly this command now: git checkout -b notes/probe …". The stream shows one call,
  `git checkout -b notes/probe`, answered with `PreToolUse:Bash hook error: [bash
  .tropis/hooks/branch-in-worktree.sh]: This is the main checkout of scratch. …`, and the
  printed command creating `../scratch-probe` from `origin/main`. The agent quoted the
  message, created nothing, and the checkout stayed on `main`. The developer's own
  instructions that loaded say nothing about worktrees. Scratch project removed.

### Found

Public exposure: the diff was read for names, home paths, hostnames and other projects'
material; nothing.

Four defects, all mechanical, fixed on the branch by the reviewer in one commit
(`fix(review): …`) rather than sent back:

- `commands/update.md`, Stage 9, began with `cd <this checkout>`, a name nothing defines.
  It now says to run the abort from the checkout Stage 1 ran in. (The text came from the
  plan's *Decision 3*: the plan's error, not the executor's.)
- `templates/settings.json`'s comment still said every hook replies through
  `hook-reply.sh`. It now says that of every hook that lets the call run, and that
  `branch-in-worktree.sh` refuses with exit 2.
- Two paragraphs re-wrapped (Stage 7 of `update.md`, the gated bullet in `workflow.md`).

No manual check through `/manual-check`: the change has no screen. The probe above is the
use the developer's check would otherwise give.

### Outstanding disposition

- *The fresh-agent run does not show whether the hook refused anything*: closed by the
  review's probe above.
- *Not run on Cursor*: dropped. The refusal uses exit 2 on stderr, the channel
  `rules/harness-scripts.md` measured refusing the call and reaching the agent in Cursor
  3.23.12; the hook adds no Cursor-specific path.
- *This repository's own sessions are not covered until a release carrying it is
  installed*: dropped; that is how every change here reaches this repository.

### Learnings routed

- `claude -p --output-format stream-json --verbose` shows a probe's tool calls and hook
  replies, which plain `-p` hides. This is what let the review see the refusal the
  executor could not. Not routed in this merge; put to the developer as a proposed
  addition to the fresh-agent check's guidance in `framework/workflow.md`.
- Nothing else generalises: the plan's misses (a red count that left out the
  capture-at-write cases, an anchor wrapped across lines, an undefined name in Stage 9)
  are this plan's own.

### Merged because

Every criterion has a test that fails when its mechanism is broken, the refusal was seen
reaching a real agent, and the review's fixes are wording only.
