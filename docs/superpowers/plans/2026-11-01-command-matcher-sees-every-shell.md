# The command matcher finds a watched command wherever a shell would run it — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** `scripts/command-at-position.py`, the matcher every command-position hook
shares, checks a heredoc body as commands whenever a shell reads it (dash, ksh, ssh, a
shell named by path, a shell later in the same pipeline, a shell behind redirections),
ignores a heredoc operator that sits inside a comment, and answers "match" for a command
it cannot parse or a heredoc that never closes, instead of falling back to a substring
search.

**Spec:** the entry `command-matcher-sees-every-shell` in `feature-catalog.yaml`, and its
row in `docs/backlog-board/bands.yaml`. There is no design document; the decisions below
are the design.

**What the specifying session verified on 2026-11-01, against `main` at `f80339e`, with
Python 3.12.10, git 2.49.0 and Node v22.15.0 in Claude Code on Darwin arm64:**

- **The matcher as it stands.** `scripts/command-at-position.py` (289 lines) has
  `SHELLS = {'bash', 'sh', 'zsh'}`. `_feeder_is_shell(before)` looks only at the text
  *before* the heredoc operator, back to the last `\n ; | & (`, drops the tokens
  `< > >> <<`, and compares the first command word with `SHELLS` exactly, so a path
  (`/bin/bash`) never matches, a pipeline after the operator (`cat <<EOF | bash`) is never
  seen, and the `&` inside `2>&1` cuts the fragment so `bash > log 2>&1 <<EOF` is missed.
  `strip_heredocs` searches for `<<WORD` everywhere, comments included; `tokenize` sets
  `lexer.commenters = ''`, so `#` is an ordinary token. `is_at_position` and `main` fall
  back to `substring_match` on any exception, and an unclosed heredoc (`_heredoc_body`
  returning `None`) is left in place and the rest parsed as commands.
- **Measured, piping each command into `python3 scripts/command-at-position.py <words>`**
  (exit 0 match, 1 no match). Today every one of these exits **1**: a `dash`, `ksh`,
  `ssh host`, `ssh -p 2222 host` or `/bin/bash` heredoc holding the watched command;
  `cat <<'EOF' | bash`; `cat <<'EOF' | sh -s`; `bash > log.txt 2>&1 <<'EOF'`;
  `2>/dev/null bash <<'EOF'`; `<<'EOF' bash`; `# notes: cat <<EOF` followed by a
  `git commit -m x` line and an `EOF` line; `cat > f <<'EOF'` followed by `nothing here`
  and no closing line; `echo 'unterminated` watching `gh pr merge`; and
  `echo "unterminated quote` (row 25 of the guard, which today
  expects 1). These exit **0** today: `echo hi # ; git commit`; `git commit -m fix#12`;
  `echo 'a # b' && git commit`; `cat <<'EOF'` then `git commit -m x` with no closing line.
  These exit **1** today and must stay 1: `cat <<'EOF' | grep x`, `cat <<'EOF' > bash.txt`,
  `cat <<'EOF' || bash`, `bashful <<'EOF'` (each with the watched command in the body),
  `# git commit`, `# don't` followed by `echo hi`.
- **Who uses the matcher.** `scripts/framework-commit-check.sh` (`git commit`),
  `scripts/capture-at-merge.sh` (`gh pr merge`), `scripts/public-exposure-check.sh`
  (`git commit`, `git push`) speak and never refuse. `scripts/branch-in-worktree.sh`
  refuses (exit 2), but only after a second pass: it imports the module and calls
  `cap.tokenize`, `cap.skip_prefix`, `cap.SEPARATORS` and `cap.CONSUMES_NEXT` to find the
  branch being created, exits 0 when `tokenize` raises `ValueError`, and exits 0 when it
  finds no branch. So a "match" on an unparseable command makes three hooks speak and
  refuses nothing. Those four names are an interface: keep them, with their behaviour.
- **The guard.** `guards/rule-delivery.test.js`, `describe('command-at-position')`, holds
  rows `'1'` to `'33'` as `[n, command, watched, expected]` and runs each through the
  script. The hooks' own cases are elsewhere in the same file; the whole file must stay
  green.
- **The rule that describes the matcher.** `rules/harness-scripts.md`, the bullet *Wire a
  hook once, and let the script do the filtering — at command position*, ends "and it
  exits 0 when one is at command position. Which other command shapes that tool cannot
  parse is not settled: a loop ran the hook once on the same version." It says nothing
  about what the matcher answers for an unparseable command. `templates/rule-areas.json`
  gives `harness-scripts` the path `.tropis/**`; no area changes.
- **Nothing else names the substring fallback.** `git grep -n -i "substring\|bash, sh"`
  over `framework rules commands templates README.md scripts guards` finds only the rule
  bullet above, a general sentence in `rules/tests.md` (not about this script) and one
  comment in the guard. `RELEASES.md` is drafted by `/release`, not by plans.
- **The developer's user-level instructions** say nothing about shell parsing or hooks, so
  the fresh-agent probe can run locally.

**Model tier: Medium.** The behaviour and every test row are given; the parsing code
needs care with quoting and line handling, and the probe needs judgment to run and read.

**Merge authority: parent review.** Every hook every later session runs goes through this
script. Stop after the handover report (Task 6). Do not open a pull request, do not write
a review record and do not merge.

Do not store a kick-off prompt on this plan.

---

## Delivers

command-matcher-sees-every-shell

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-command-matcher-sees-every-shell -b plan/command-matcher-sees-every-shell origin/main` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's entry pair.
- **Add no dependency. Do not lower, skip or delete a guard or a test**, except row 25's
  expected value, which *Decision 3* changes. Every commit has a body. A commit touching
  `rules/` says in its body that the fresh-agent check is recorded in the handover report.
- **Push only to this plan's branch.** Do not open a pull request.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, in the handover, or in the probe's scratch project.
- **Write the code yourself against this script's own names.** Say in the handover which
  named source you worked from, or "none in particular".

## Decisions

### 1. Which shells read a heredoc

`SHELLS` becomes `{'bash', 'sh', 'zsh', 'dash', 'ksh', 'ssh'}`. `ssh` is there because
`ssh host <<EOF` hands the body to the remote shell. A command word counts as a shell when
its last path component is in `SHELLS` (`/bin/bash`, `/usr/bin/ssh`); `bashful` and
`bash.txt` do not.

A heredoc body is checked as commands when a shell reads it, which is any of:

- **directly:** the simple command that carries the operator is a shell. That simple
  command is the text from the previous `\n ; | && || & (` to the next one, on the
  operator's line, with the operator and its word removed and every redirection removed
  — an optional file-descriptor number, one of `> >> < <> >& <& >|`, and its target — so
  `bash > log.txt 2>&1 <<'EOF'`, `2>/dev/null bash <<'EOF'` and `<<'EOF' bash` all read
  as `bash`. `&` inside `>&` and `2>&1` is part of a redirection, not a separator.
  Wrappers, keywords and assignments are skipped with the existing `skip_prefix`, so
  `sudo -u x bash <<EOF` and `env bash <<EOF` still count;
- **piped into one:** a later stage of the same pipeline, on the operator's line, is a
  shell (`cat <<'EOF' | bash`, `cat <<'EOF' | sh -s`). A pipeline ends at
  `; && || &` or the end of the line; `||` is not a pipe, so `cat <<'EOF' || bash` does
  not count.

A quoted remote command (`ssh host 'git push'`) and `sh -c '…'` stay out of scope: they
are quoted text, which the matcher does not read, and no criterion asks for them.

### 2. Comments

A comment is a `#` that begins a word — at the start of a line or after a space, tab,
`;`, `&`, `|` or `(` — outside single and double quotes, through the end of its line.
Bash treats exactly that as a comment; a `#` inside a word (`fix#12`) or inside quotes is
not one.

- A heredoc operator inside a comment opens no heredoc: `strip_heredocs` skips it. Decide
  whether an operator is inside a comment by scanning its own line from the start, with
  quote tracking local to that line. This is enough for every row below; a quote opened
  on an earlier line is out of scope.
- After heredoc bodies are removed, comments are removed from the remaining text before
  it is tokenized. So `# don't` no longer makes the command unparseable, and
  `echo hi # ; git commit` no longer matches. Keep `tokenize` itself unchanged
  (`branch-in-worktree.sh` calls it): do the removal in `is_at_position`.
- A comment never counts as an unclosed heredoc (*Decision 3*).

### 3. Unparseable means match

A command that cannot be parsed — any exception while stripping heredocs, lifting
substitutions or tokenizing, at any depth of recursion — and a command with a heredoc
whose closing line never comes, both make the matcher exit 0, whatever words it was
given. `substring_match` is deleted, and so is every call to it. `main` keeps its
`try`, answering 0 on an exception.

The reason: a substring search is wrong both ways — it warns on a `grep "git commit"`
whose quotes are fine, and misses `git -C x commit` — and when the matcher cannot tell
what would run, the safe answer for a hook that speaks is to speak. The one hook that
refuses already re-reads the command and lets it through when it cannot (*verified*
above), and the rule text in *Decision 4* tells the next hook author to do the same.

Guard row 25, `'echo "unterminated quote'` watching `git commit`, changes from 1 to 0.
No decision record: the choice is local to one script and its reason is in the script's
header comment and the rule; this plan is the record of why.

### 4. The texts, verbatim

Replace the comment block at the top of `scripts/command-at-position.py`, from
`# Read a shell command on stdin.` to the line ending `joins two lines.`, with this
(the first two lines of the file stay as they are):

```python
# Read a shell command on stdin. Exit 0 when any argument — a command written
# as its words, like "git commit" — is at command position, and 1 otherwise.
# Print nothing. Quoted text is not a command, except $(...) and backticks,
# which are checked on their own, including inside double quotes. A comment,
# from a # that begins a word to the end of its line, is not a command, and a
# heredoc operator inside one opens no heredoc. A heredoc body is not a command
# unless a shell reads it: bash, sh, zsh, dash, ksh or ssh, by name or by path,
# as the command the heredoc feeds, after its redirections, or later in the
# same pipeline. A command that cannot be parsed, or a heredoc with no closing
# line, counts as a match: the caller cannot tell what would run. A shell
# keyword (then, do, {, !) opens a command position, and a backslash-newline
# joins two lines.
```

In `rules/harness-scripts.md`, in the bullet *Wire a hook once, and let the script do the
filtering — at command position*, directly after the sentence ending "and it exits 0
when one is at command position.", insert:

> A command it cannot parse, or one whose heredoc never closes, also exits 0, so a hook
> that refuses a call reads the command again for what it refuses, and lets the call
> through when it finds nothing there.

Wrap it as the surrounding paragraph is wrapped; leave the rest of the bullet unchanged.

### 5. What this owes, and does not

- **The catalog and the board** (Task 5): the entry to `shipped`, with modules and a
  comment mapping criteria to rows; its row removed from `docs/backlog-board/bands.yaml`.
- **A fresh-agent check** (Task 4), because `rules/` changes.
- **No decision record, README, operator guide, rule-area or command change.**

## Traps

- **The self-check reads `HEAD` only.** Commit before each run of
  `bash scripts/check-blueprint.sh`.
- **Edit `scripts/`, `guards/` and `rules/`, never `.tropis/` or `.claude/`.** The
  installed copy `.tropis/hooks/command-at-position.py` is the last release and stays as
  it is. Run no rules command.
- **Run the isolation command from the primary checkout of the repository**, the one
  whose directory is named `tropis`, so `../tropis-command-matcher-sees-every-shell` is a
  sibling of it. A checkout under `.claude/worktrees/` would put the worktree inside the
  repository.
- **A red test with the fix reverted is the proof the rows are worth anything.** Task 2
  writes the rows before the code; they must fail against the current script.
- **The probe runs in a scratch project set up from this branch**, not in this
  repository: a session here loads the installed release's rule, which lacks the new
  sentence. Confirm the scratch project's rule carries it before the probe (Task 4).
- **A probe that fails is a finding, not something to fix.** Do not reword the rule to
  make it pass. Record it, with the calls, finish Tasks 5 and 6, and leave the verdict to
  the reviewing session.
- **Do not put a colon followed by a space, or a space followed by a hash, inside an
  unquoted YAML value** in the catalog or the bands file.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/command-at-position.py` | *Decisions 1 to 3*; the header comment of *Decision 4* |
| `guards/rule-delivery.test.js` | rows 34 to 60 of Task 2; row 25's expected value to 0 |
| `rules/harness-scripts.md` | the sentence of *Decision 4* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | the entry's row removed |
| `docs/superpowers/plans/2026-11-01-command-matcher-sees-every-shell.md` | the handover report |

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table, and the Trap about where to run it). In the worktree run
`npm --prefix .tropis ci`, then `git status --porcelain` (passes when it prints nothing),
then `bash scripts/check-blueprint.sh` (passes when its last line starts
`Self-check passed`; any other last line, stop and hand back). Record `python3 --version`,
`git --version`, `node --version`, `claude --version` (or the tool you run the probe
with), `uname -sm` and the commit you started from.

### Task 1 — Read the script and its rows

The decisions above are complete. Read `scripts/command-at-position.py` and the
`command-at-position` block of `guards/rule-delivery.test.js` in full before Task 2.

### Task 2 — The rows, red first

In `guards/rule-delivery.test.js`, change row `'25'`'s expected value from `1` to `0`, and
add these rows after row `'33'`, under a comment saying they cover the shells that read a
heredoc, comments, and the unparseable-means-match answer. `NL` below means a newline:
write each multi-line command as the existing rows do, with `[...].join('\n')`.

| Row | Command | Watched | Expected |
|---|---|---|---|
| 34 | `dash <<'EOF'` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 35 | `ksh <<'EOF'` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 36 | `ssh host <<'EOF'` NL `git push` NL `EOF` | `git push` | 0 |
| 37 | `ssh -p 2222 host <<'EOF'` NL `git push` NL `EOF` | `git push` | 0 |
| 38 | `/bin/bash <<'EOF'` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 39 | `cat <<'EOF' \| bash` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 40 | `cat <<'EOF' \| sh -s` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 41 | `bash > log.txt 2>&1 <<'EOF'` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 42 | `2>/dev/null bash <<'EOF'` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 43 | `<<'EOF' bash` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 44 | `cat <<'EOF' \| grep x` NL `git commit -m x` NL `EOF` | `git commit` | 1 |
| 45 | `cat <<'EOF' > bash.txt` NL `git commit -m x` NL `EOF` | `git commit` | 1 |
| 46 | `cat <<'EOF' \|\| bash` NL `git commit -m x` NL `EOF` | `git commit` | 1 |
| 47 | `bashful <<'EOF'` NL `git commit -m x` NL `EOF` | `git commit` | 1 |
| 48 | `# notes: cat <<EOF` NL `git commit -m x` NL `EOF` | `git commit` | 0 |
| 49 | `# see <<EOF` NL `echo hi` | `git commit` | 1 |
| 50 | `# don't` NL `echo hi` | `git commit` | 1 |
| 51 | `# don't` NL `git commit -m x` | `git commit` | 0 |
| 52 | `echo hi # ; git commit` | `git commit` | 1 |
| 53 | `# git commit` | `git commit` | 1 |
| 54 | `git commit -m fix#12` | `git commit` | 0 |
| 55 | `echo 'a # b' && git commit` | `git commit` | 0 |
| 56 | `cat <<'EOF'` NL `git commit -m x` | `git commit` | 0 |
| 57 | `cat > f <<'EOF'` NL `nothing here` | `git commit` | 0 |
| 58 | `echo 'unterminated` | `gh pr merge` | 0 |
| 59 | `grep -rn "git commit" scripts/ # a search` | `git commit` | 1 |
| 60 | `sudo -u ci bash <<'EOF'` NL `git commit -m x` NL `EOF` | `git commit` | 0 |

The `\|` in the table is a plain `|` in the command. Commit (body: the rows, and that they
are red until Task 3). Then run
`npx --prefix .tropis jest --rootDir . guards/rule-delivery.test.js -t command-at-position`
(or the narrowest way this repository's Jest runs one file; the self-check script shows
how it invokes Jest). **Passes when** exactly these rows fail: 25, 34 to 43, 48, 52, 57, 58.
That is the current script's measured behaviour (*verified* above), so any other set of
failures means a row was written wrong: fix the row, not the script, and re-run.

### Task 3 — The matcher

Apply *Decisions 1 to 3* and the header comment of *Decision 4* to
`scripts/command-at-position.py`. Keep `tokenize`, `skip_prefix`, `SEPARATORS` and
`CONSUMES_NEXT` with their names and behaviour. Then:

1. Run the `command-at-position` block as in Task 2. **Passes when** every row, 1 to 60,
   passes. A failing row: fix the script and re-run.
2. Run the whole of `guards/rule-delivery.test.js`. **Passes when** no test fails; the
   hooks' cases there are criterion 4's "every hook built on the matcher still passes its
   own cases".
3. `grep -n "substring_match" scripts/command-at-position.py` **passes when** it prints
   nothing (exit 1).
4. Prove the rows bite: make a throwaway commit restoring the old script
   (`git show origin/main:scripts/command-at-position.py > scripts/command-at-position.py`),
   run the block again and record that the Task 2 set fails, then drop the throwaway
   commit (`git reset --hard HEAD~1`, only after checking `git log -1` names it).

Commit. Run `bash scripts/check-blueprint.sh`: passes when its last line starts
`Self-check passed`; on a failure in this plan's files, fix and re-run; otherwise stop and
hand back.

### Task 4 — The rule sentence and the fresh-agent check

Insert the sentence of *Decision 4* in `rules/harness-scripts.md`. Check, with line breaks
collapsed:

```bash
tr -s ' \n' ' ' < rules/harness-scripts.md | grep -cF 'A command it cannot parse, or one whose heredoc never closes, also exits 0'
tr -s ' \n' ' ' < rules/harness-scripts.md | grep -cF 'Which other command shapes that tool cannot parse is not settled'
```

Both pass when they print `1`; against `f80339e` the first printed `0`. Commit, noting
in the body that the fresh-agent check is recorded in the handover report.

Then the probe. Make an empty directory outside every checkout (a system temporary
directory). In it: `git init -q -b main`, then
`bash <this worktree>/scripts/set-up-project.sh .`, then `npm --prefix .tropis install`,
then commit everything. Confirm
`tr -s ' \n' ' ' < .claude/rules/harness-scripts.md | grep -cF 'A command it cannot parse, or one whose heredoc never closes, also exits 0'`
prints `1`; a `0` means the scratch project did not get this branch's rule: stop and hand
back. Also confirm `.tropis/hooks/command-at-position.py` there carries the new header
comment (`grep -c 'dash, ksh or ssh'` prints `1`).

Run one fresh agent session in the scratch project with the prompt piped on stdin and its
tool calls visible (for Claude Code, `claude -p --output-format stream-json --verbose`,
with a scoped `--allowedTools` list that lets it read, write, edit, search, and run git,
bash, python3, node and npm; an earlier plan found a bypass-permissions flag refused and
a scoped list working). Save the stream to a file outside the repository. Do not tell the
agent about the rule. Prompt:

"This is a probe; its output will be discarded. Add a Claude Code PreToolUse hook to this
project, .tropis/hooks/no-force-push.sh, that refuses any Bash command which runs git push
with --force or -f, and wire it in .claude/settings.json. Commit it."

Then, in the scratch project, run the hook three times with a payload on stdin and record
each exit code and stderr:

- `{"tool_input":{"command":"git push --force origin main"}}` — **passes when** it exits 2;
- `{"tool_input":{"command":"grep -rn \"git push --force\" docs"}}` — **passes when** it
  exits 0;
- `{"tool_input":{"command":"echo \"don't run git push --force"}}` (unbalanced quote, so
  the matcher answers match) — **passes when** it does not exit 2.

The probe passes when all three pass. Also record whether the hook calls the shipped
matcher, and whether the stream shows the agent reading or receiving
`.claude/rules/harness-scripts.md`. Record the verdict, the tool, its version, the
operating system and the architecture. Delete the scratch directory and the stream file.

### Task 5 — Catalog, board and full verification

In `feature-catalog.yaml`, on `command-matcher-sees-every-shell`: set `status: shipped`,
and set `modules` to `scripts/command-at-position.py`, `guards/rule-delivery.test.js` and
`rules/harness-scripts.md`. Directly above its `- id:` line, below the comment already
there, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-command-matcher-sees-every-shell.md.
# Criterion 1 is rows 34 to 47 and 60, criterion 2 rows 48 to 55, criterion 3 rows
# 25, 56 to 58, all in guards/rule-delivery.test.js, command-at-position; criterion 4
# is that file passing whole.
```

In `docs/backlog-board/bands.yaml`, delete the `command-matcher-sees-every-shell:` key and
every line under it, up to the next top-level key. Commit. Then run, and record each
output:

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite
git diff --stat origin/main...HEAD     # passes: only the File Structure files
```

On a failure in this plan's files, fix and re-run; otherwise stop and hand back.

### Task 6 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*): Task completion, Verification results,
Scope, Judgment calls, What the plan got wrong, Outstanding. Include each check's command
with its actual output, the probe's verdict with the calls quoted, the named source you
worked from, and the worktree path used. Commit and push the branch
(`git push -u origin plan/command-matcher-sees-every-shell`), and stop. Do not open a
pull request, do not write a review record and do not merge.

## Handover report

### Task completion

- Task 0: done. Worktree `../tropis-command-matcher-sees-every-shell` from `origin/main` at `1229093`; `npm --prefix .tropis ci` run; tree clean; baseline self-check ended `Self-check passed`.
- Task 1: done (script and guard block read in full).
- Task 2: done. Row 25 now expects 0; rows 34 to 60 added. Against the old script exactly rows 25, 34 to 43, 48, 52, 57, 58 failed (15 failures), as the plan predicted.
- Task 3: done. All 60 rows pass; the whole self-check passes; `grep -n substring_match scripts/command-at-position.py` prints nothing. Revert proof: with the old script restored in a throwaway commit (dropped afterwards) the failing set was again 25, 34 to 43, 48, 52, 57, 58.
- Task 4: done. Rule sentence inserted; both phrase checks print `1`. Fresh-agent check run (see Verification results).
- Task 5: done. Entry shipped with `modules` set and the criteria comment; bands row removed.
- Task 6: this report.

### Verification results

Tools: Python 3.12.10, git 2.49.0, Node v22.15.0, Claude Code 2.1.300, on Darwin arm64. Started from `1229093`.

- Rows: `command-at-position` block, 60 of 60 pass after Task 3 (run in a staged copy of the working tree; the whole file only runs inside the self-check's project-shaped tree, where it passes).
- `bash scripts/check-blueprint.sh`, run after the matcher commit and again at the end: last line `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 138 passed, 138 total`.
- `tr -s ' \n' ' ' < rules/harness-scripts.md | grep -cF 'A command it cannot parse, or one whose heredoc never closes, also exits 0'` prints 1; the "not settled" phrase check prints 1.
- `git diff --stat origin/main...HEAD`: bands.yaml 15 deletions, feature-catalog.yaml 7, rule-delivery.test.js 32, harness-scripts.md 7, command-at-position.py 211 (the plan file is added by this report).

Fresh-agent check (Claude Code 2.1.300, Darwin arm64, `claude -p --output-format stream-json --verbose`, scoped `--allowedTools`, the developer's user-level instructions loaded, which say nothing about shell parsing). Scratch project set up from this branch with `set-up-project.sh`; its `.claude/rules/harness-scripts.md` carried the new sentence (count 1) and `.tropis/hooks/command-at-position.py` the new header (`dash, ksh or ssh` count 1). Prompt as in Task 4. Stream: the agent ran `cat .claude/rules/harness-scripts.md` and read `.tropis/hooks/command-at-position.py` before writing the hook, so it received the rule. It created its own sibling worktree (the project's workflow), wrote `.tropis/hooks/no-force-push.sh` and wired it in `.claude/settings.json`, and committed (`feat(hooks): refuse force pushes from agent shell commands`). The hook calls the shipped matcher for `git push` and its header comment says: "command-at-position.py also matches a command it cannot parse; this script then reads the command again for the flag, and lets it through if it cannot." Running the hook by hand:

- `git push --force origin main`: exit 2, message on stderr. Pass.
- `grep -rn "git push --force" docs`: exit 0. Pass.
- `echo "don't run git push --force` (unbalanced quote): exit 0. Pass.

Verdict: probe passes. Scratch project and stream deleted.

### Scope

All five changed files are in the File Structure table, plus this plan file. Worktree used: `/Users/filippo/AtlassianForge/Tropis/tropis-command-matcher-sees-every-shell`.

Source worked from: none in particular; written against this script's own names.

### Judgment calls

- `strip_heredocs` now drops the heredoc operator from its output (keeps a space). Without it, a `$(cat <<'EOF'` lifted out of a substitution (guard row 22) held an operator with no body and, under unclosed-means-match, raised. This also makes `<<'EOF' git commit` read as a command.
- Added a `(?<!<)` lookbehind to the heredoc pattern so a here-string `<<<word` is not read as a heredoc that never closes.
- `_shell_reads_heredoc` returns False when the operator's own line has an open quote (`"$(cat <<'EOF'`); the surrounding text is checked as commands on its own anyway.
- `remove_comments` tracks double quotes and `$( )` nesting with a small stack, so a `#` inside a nested substitution is not cut.
- Wherever the old code fell back to substring search, the new code raises and `main` answers 0; `is_at_position` has no `try`.
- To run the guard rows alone I staged the working tree in a scratch directory and ran Jest there; the other tests in the file need the self-check's tree.

### What the plan got wrong

- Nothing that stopped the work. Task 2's predicted failing set was exact. The plan did not mention that an unclosed-heredoc-means-match rule collides with the operator left inside a lifted substitution (row 22); handled as above.
- A heredoc operator in arithmetic such as `$((1<<x))` is read as a heredoc operator and, with no closing line, now matches. This only makes a speaking hook speak.

### Outstanding

- Nothing blocking. Not done by design: no pull request, no review record, no merge.
