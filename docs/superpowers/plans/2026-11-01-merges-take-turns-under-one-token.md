# Pull requests take turns under one merge token — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** any session takes a merge token on `origin` before opening a pull request,
waits while someone else holds it, and releases it once `main` has reported; the
developer can hold it; `/next` shows who holds it, for how long, and when it is stale.

**Spec:** `docs/superpowers/specs/2026-11-01-sprint-design.md`, §3 (*The merge token*),
its *Evidence from the first spike* section, and decision FW-049 in
`framework/DECISIONS.md`; the seven acceptance criteria of the entry
`merges-take-turns-under-one-token` in `feature-catalog.yaml`. Build only the token. The
sprint command, its status view and its team members are other entries: do not build
them, and do not write about a sprint session beyond what *Decision 4* gives verbatim.

**One plan:** what becomes true is one sentence — pull requests open one at a time under
a token every session takes and releases, and that the developer can hold. The script,
its tests, the backlog report's line and the four documents that tell a session when to
run it serve that one thing.

**What the specifying session verified on 2026-11-02, against `origin/main` at `3d2ed61`:**

- **FW-049 decided the mechanism.** The token is a ref outside `refs/heads/` and
  `refs/tags/`, pointing at a commit whose message names the holder and the time. Take:
  the REST call that creates a reference (`POST repos/{owner}/{repo}/git/refs`), which
  GitHub refuses with HTTP 422 "Reference already exists" when the ref exists. Release:
  a push deleting the ref that states the commit it expects
  (`git push --force-with-lease=<ref>:<commit> origin :<ref>`), refused when someone
  else holds it. The API's delete takes no condition. Where a push cannot release (a
  cloud session's git proxy is documented to refuse pushes of anything but a branch),
  the session reads the marker and, when the holder is itself, deletes it through the
  API. A take that fails for any reason other than 422 reads the marker before deciding:
  under simultaneous pushes the spike saw losers fail on a storage error instead.
- **The lock form of a push is also a lock.** `git push --force-with-lease=<ref>: origin
  <commit>:<ref>` (expected value empty) let exactly one of five simultaneous attempts
  through in each of six rounds on GitHub; the losers were refused with `stale info` or
  `cannot lock ref … reference already exists`, or failed on a storage error. A plain
  push is not a lock: it reports `Everything up-to-date` on a held ref, and moves it to a
  descendant.
- **A release push needs no local copy of the commit it expects.** Checked by the
  specifying session with git 2.49.0 on macOS 26.2, arm64, against a local bare
  repository: a clone that did not have the marker commit ran
  `git push --force-with-lease=refs/tropis/u:<full sha> origin :refs/tropis/u` and got
  `- [deleted]`, exit 0. So a marker made through the API can be released by push with
  the sha the API returned. Not yet checked against GitHub: Task 6 does.
- **`url.<path>.pushInsteadOf` keeps the configured URL.** With `remote.origin.url` set
  to `https://github.com/acme/kiln.git` and `url.<local bare>.pushInsteadOf` set to that
  URL, `git remote get-url origin` printed the GitHub URL and `git push origin` wrote to
  the local bare repository; `url.<x>.insteadOf` instead changes what `get-url` prints.
  Checked the same way, same day.
- **`scripts/main-status.mjs`** is the model. It has the private function
  `originOnGitHub(root, env)` (returns `{}` when `git remote get-url origin` matches its
  `GITHUB_REMOTE` pattern, else `{ error }` with `no remote named origin` or `origin is
  not on GitHub`), a private `askGh` that keeps only the first stderr line on failure,
  `--interval <seconds>`/`--timeout <minutes>` parsing, a `ranDirectly` block, resolution
  of the root with `git rev-parse --show-toplevel` falling back to two levels above the
  script, and one line on stdout with its prefix (`Main branch:`). Its module comment
  says which files import it. Nothing imports `originOnGitHub` today.
- **`scripts/next.mjs`** prints `console.log(mainStatus(root).line);` as its first line
  (`// First, whether the main branch's pipeline is red: main-status.mjs.` above it) and
  imports `mainStatus` from `./main-status.mjs`.
- **`guards/next-report.test.js`** copies `REPORT_FILES = ['next.mjs', 'next-work.js',
  'board-bands.js', 'readme-freshness.js', 'main-status.mjs']` into staged projects. Its
  `EXPECTED_WITHOUT_BANDS` begins `Main branch: could not tell — no remote named
  origin.` followed by a blank line and `== Product work ==`, and must match byte for
  byte. Its test `says on its first line when the main branch is red` sets origin to
  `https://github.com/acme/example.git`, puts a stub `gh` first on PATH that answers
  `api repos/{owner}/{repo}` and `run list` and fails every other call with exit 99, and
  asserts the first five lines of output. Both change when `next.mjs` prints a second
  line. No other guard runs `next.mjs` (`guards/check-drift.test.js` copies it but only
  edits the text `console.log('Ready to start');`, which this plan does not touch).
- **`guards/release.test.js`** asserts these strings, which must survive: in
  `framework/workflow.md`, `gh pr merge <N> --auto --squash`, `waits until it has merged
  before the executor starts`, ``then run `node .tropis/scripts/main-status.mjs
  --pull-request <N>` ``, `Setting auto-merge does not finish the job`, `Where it is not
  gated, what may go directly to`; in `commands/release.md`, at least two occurrences of
  `node .tropis/scripts/main-status.mjs --pull-request <N>` and the Stage 7 strings.
- **The documents.** `framework/workflow.md`: the Branching bullet starting `**Where the
  main branch is gated, nothing goes directly to \`main\`.**` contains "push it, open the
  pull request, run `gh pr merge <N> --auto --squash` with `--subject` and `--body`, and
  then run `node .tropis/scripts/main-status.mjs --pull-request <N>`." Section `## Plans
  that touch the same files` is followed by `## Merge and clean up — in this order`,
  whose gated paragraph ends "…if the check is missing again, stop and report both runs.
  Pull `main` once it has reported." `## Merging` has the list `1.` plan-overlap wait,
  `2.` fetch and rebase, `3.` re-run the merge criteria, `4.` Squash-merge.
  `commands/release.md` has `## Stage 1 — Pre-flight` directly after its project-owned
  block, Stage 1b and Stage 5 and Stage 7 open pull requests, and *Resume at staging*.
  `commands/next.md` has a paragraph starting "Its first line says whether the main
  branch's last finished pipeline run passed". `templates/README.md` has the
  plan-overlap paragraph ending "…decision record do not count as shared." directly
  before `## Where the framework lives`.
- **The integrity guard** checks backticked paths starting `src/`, `docs/`, `scripts/`,
  `.claude/` or `.github/` in framework documents and commands. Write
  `.tropis/scripts/merge-token.mjs`, never `scripts/merge-token.mjs`, in backticks there.
- **Installed scripts.** `scripts/installed-scripts.txt` lists every file setup copies
  into a project's `.tropis/scripts/`; `plan-overlap.mjs` is its last line.
- **No entry is in `building`** besides this one at claim; no other plan shares a file.
- **The developer's own user-level instructions** on the specifying session's machine say
  nothing about a merge token, so a local fresh-agent probe in a scratch folder outside
  this repository is a real one.
- **The last plan from this spec** (`2026-11-01-overlapping-plans-merge-in-order.md`,
  review record read): in ES modules a named import the module does not export fails the
  whole test file at link time, so import modules as namespaces
  (`import * as token from '../scripts/merge-token.mjs'`); and a red self-check stops at
  its clean-baseline step for a new script lacking the shared-machinery line, so get red
  test names by running the new test file alone (*Traps*).

**Model tier: Medium.** One script with four commands over two kinds of origin, stateful
`gh` stubs and real concurrency against local bare repositories, a live check on GitHub,
and prose given verbatim; the approach is fixed, the error handling needs care.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 9; do not open a pull request, write a review record
or merge.

**Requires:** `gh` signed in with write access to this repository's refs, for the live check in Task 6, and an agent command-line tool that starts a fresh session from a prompt, for the fresh-agent check in Task 7 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

merges-take-turns-under-one-token

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-merge-turns -b plan/merges-take-turns-under-one-token origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency.** Use `node:` built-ins only.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`. Test identities use `example.com` addresses.
- **Never touch `refs/tropis/merge-token` on GitHub.** Other sessions are working on this
  repository right now. The live check in Task 6 uses only throwaway refs named
  `refs/tropis/merge-token-probe-<random>` and deletes every one.
- **No test reaches the network.** A test whose origin is a `github.com` URL puts a stub
  `gh` first on PATH and, if anything in it can push, sets `url.<local path>.pushInsteadOf`
  to that URL (*What the specifying session verified*).
- **Write the code yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from. `main-status.mjs`, `plan-overlap.mjs` and
  their tests are this repository's own and may be followed.
- **Tests isolate git, the script does not.** Per `.claude/rules/harness-scripts.md`: set
  `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_NOSYSTEM` (or `HOME`) only in the environment a test
  spawns git or the script with, give each temporary repository its own `user.name` and
  `user.email`, and never set them inside `merge-token.mjs`.

## Decisions

### 1. The marker

- **Ref:** `refs/tropis/merge-token`, as `export const TOKEN_REF`. Every command takes
  `--ref <ref>` to use another; it must start `refs/`, must not start `refs/heads/` or
  `refs/tags/`, and must match `/^refs\/[A-Za-z0-9._\/-]+$/`, or exit 2. It exists for
  tests and the live check; the documents never mention it.
- **Message** (`export function markerMessage({ holder, kind, taken })`):

  ```
  merge token

  holder: <holder>
  kind: <branch | hold>
  taken: <ISO 8601 UTC, seconds, e.g. 2026-11-02T06:30:00Z>
  ```

  `export function parseMarker(message)` returns `{ holder, kind, taken }` from those
  lines (`taken` a string, or `null` when absent or not a date; `kind` `branch` when
  absent), or `null` when there is no `holder:` line. A holder containing a newline is
  refused with exit 2.
- **Tree:** the marker commit has no parent and the tree of `origin`'s main branch as
  this clone last saw it: `git rev-parse --verify --quiet refs/remotes/origin/HEAD^{tree}`,
  else `refs/remotes/origin/main^{tree}`, else exit 2 saying neither is known. A tree
  that was ever on `origin` is on `origin` still, which the API needs.
- **Holder.** `take` and `release` use `--holder <name>` when given. Otherwise, with
  `--hold`, `git config user.name` (kind `hold`); without, `git branch --show-current`
  (kind `branch`). Neither available: exit 2 saying to pass `--holder`. A session holds
  the token when the marker's holder equals its holder name; the kind is not compared.

### 2. Two kinds of origin

`originOnGitHub` decides, once per command. Export it from `scripts/main-status.mjs`
(add `export`, change nothing else in it except its module comment, which gains that
`merge-token.mjs` imports it) and import it from there.

| | `origin` on GitHub | any other `origin` |
|---|---|---|
| **read** | `gh api repos/{owner}/{repo}/git/ref/<ref without refs/>`: a reply naming HTTP 404 is free; otherwise `.object.sha`, then `gh api repos/{owner}/{repo}/git/commits/<sha>` for `.message` | `git ls-remote --exit-code origin <ref>`: exit 2 is free; otherwise the sha, then `git fetch --quiet --no-write-fetch-head origin <ref>` and `git log -1 --format=%B <sha>` |
| **take** | `gh api -X POST repos/{owner}/{repo}/git/commits -f message=… -f tree=<tree>` for the marker's sha, then `gh api -X POST repos/{owner}/{repo}/git/refs -f ref=<ref> -f sha=<sha>`. HTTP 422 with "Reference already exists" means held | `git commit-tree <tree> -m <message>` (the identity in force), then `git push --porcelain --force-with-lease=<ref>: origin <sha>:<ref>`. A reply naming `stale info` or `already exists` means held |
| **release** | the push below; if it fails for any reason other than `stale info`, read again and, when the marker still has this sha, `gh api -X DELETE repos/{owner}/{repo}/git/refs/<ref without refs/>` (FW-049's fallback) | `git push --porcelain --force-with-lease=<ref>:<sha> origin :<ref>` |

The non-GitHub column exists so that the concurrency can be tested for real, against
local bare repositories, and so a project whose origin is elsewhere still has a lock.
Write a small `gh` runner in `merge-token.mjs` that returns the exit status, stdout and
stderr (main-status's `askGh` drops what this needs); a reply "names HTTP 404/422" when
its stderr or stdout contains `HTTP 404`/`HTTP 422` or a JSON body with that `status`.
Any failure that is none of the cases above is an **error**, carrying the first line of
stderr.

### 3. The script (`scripts/merge-token.mjs`, new)

Line 1 `#!/usr/bin/env node`, line 2 `// Shared machinery: no part of this file is
project-owned.`, then a module comment saying what it does, its commands, their exit
codes, that the take goes through GitHub's API where `origin` is on GitHub and a
lock-form push elsewhere, and that `next.mjs` imports `tokenStatus`. Committed
executable, like `main-status.mjs`. Pure functions and the four command functions are
exported; the command line runs only when run directly (`ranDirectly`). Every line on
stdout starts `Merge token:`, except the `STOPPED:` line.

**`node .tropis/scripts/merge-token.mjs`** (or `status`): prints `tokenStatus(root).line`,
exits 0. `export function tokenStatus(root, { env, now })` returns `{ state, line }`:

- no origin, or a read error: `Merge token: could not tell — <reason>.` (the reason is
  `originOnGitHub`'s error, or the error's first line, without a final full stop);
- free: `Merge token: free.`;
- held: `Merge token: held by <holder> for <n> min.`, where `<n>` is whole minutes since
  `taken` (`held by <holder>.` when `taken` is unreadable); a hold reads
  `Merge token: held by <holder> (a hold) for <n> min.`;
- stale — only when `origin` is on GitHub, kind `branch`, `n ≥ STALE_MINUTES` (30,
  exported), no open pull request whose `head.ref` is the holder
  (`gh api "repos/{owner}/{repo}/pulls?state=open&per_page=100"`), and the holder's branch
  either absent (`gh api repos/{owner}/{repo}/branches/<holder>` names HTTP 404) or with
  `.commit.commit.committer.date` at least 30 minutes old: the held line, without its
  full stop, then ` — stale: no open pull request and no push for 30 min. Break it only on
  the developer's word: node .tropis/scripts/merge-token.mjs break --holder <holder>`. Any
  error while judging means not stale, silently.

Put the judgement in `export function isStale({ kind, minutes, openPull, tipMinutes })`
(`tipMinutes` `null` for no branch) so the guard can test it without `gh`.

**`take [--holder <name>] [--hold] [--interval <seconds>] [--timeout <minutes>]`**,
defaults 30 seconds and 60 minutes, both accepting fractions. Loop:

1. Read the marker. On an error, count it; on three errors in a row, print
   `Merge token: could not take — <reason>.` and exit 2. A read that succeeds resets the
   count.
2. Held by this holder: print `Merge token: already held by <holder>; keeping it.`,
   exit 0.
3. Held by another: past the deadline, print `STOPPED: waiting for the token, held by
   <holder>` and exit 3. The first time, write
   `merge-token: held by <holder>; asking every <s> s for up to <m> min` on stderr.
   Sleep the interval and go to 1.
4. Free: try to take it (*Decision 2*). Taken: print `Merge token: taken by <holder>.`,
   exit 0. Held (someone was faster): go to 1 without sleeping. Any other failure
   **counts as an error and goes to 1 without deciding**: step 1's read is what tells a
   session whose create in fact succeeded that it holds the token (step 2).

With no `origin` at all: `Merge token: could not take — no remote named origin.`, exit 2.

**`release [--holder <name>] [--hold]`**: read the marker (an error: `Merge token: could
not release — <reason>.`, exit 2). Free: `Merge token: free — nothing to release.`,
exit 0. Held by another: `Merge token: held by <other>, not <holder>; left as it is.`,
exit 1. Held by this holder: release it with the sha just read (*Decision 2*); done:
`Merge token: released by <holder>.` (with ` through the API` before the full stop for
the fallback), exit 0; refused with `stale info`: read again and report as above; any
other failure, with no fallback or a failed one: `Merge token: could not release —
<reason>.`, exit 2.

**`break --holder <name>`** (required): as `release`, except that it acts for whoever is
named, prints `Merge token: broken — it was held by <holder>.`, `Merge token: free —
nothing to break.`, or `Merge token: held by <other>, not <holder>; not broken.` (exit
1). The documents say it runs only on the developer's word.

Anything else on the command line: a usage line on stderr, exit 2. Add
`merge-token.mjs` as the last line of `scripts/installed-scripts.txt`.

### 4. The documents

**`framework/workflow.md`.** Insert this section between `## Plans that touch the same
files` and `## Merge and clean up — in this order`, verbatim:

```markdown
## The merge token

A gated main branch that requires branches to be up to date lets one pull request
merge at a time, and each merge puts every other open pull request behind, to update
and run its checks again. So sessions working at the same time take turns, under one
token on `origin` that any session can take: the ref `refs/tropis/merge-token`, whose
commit names its holder and when it was taken.

- **Every pull request opens under the token** — a plan's, a claim's, a backlog
  edit's, a release's — whoever opens it: a session started by hand as much as one a
  sprint started. Once the plan's wait has gone ahead (*Plans that touch the same
  files*), run `node .tropis/scripts/merge-token.mjs take`. It takes the token in the
  current branch's name, or waits, asking every 30 seconds, while someone else holds
  it. Then rebase once on `origin/main`, re-run the merge criteria, push, open the pull
  request, set it to merge itself, and run `main-status.mjs --pull-request <N>`
  (*Merge and clean up*).
- **Release it once that command has reported**, green or red:
  `node .tropis/scripts/merge-token.mjs release`. Keep it instead for a follow-up pull
  request straight after, such as a move to `shipped`, and release it after the last
  one; from another branch, pass the name it was taken in with
  `--holder <branch>`. A release removes the token only for its holder; otherwise it
  says who holds it and leaves it.
- **Hand it back before a fix that needs judgement.** When the merge criteria fail
  after the rebase in a way that is not mechanical, release the token first, then fix.
  A clean rebase needs no new review; a conflict needs its resolution reviewed, except
  in the files every plan touches (*Plans that touch the same files*).
- **The wait has a time limit.** After 60 minutes `take` exits 3 and prints
  `STOPPED: waiting for the token, held by <holder>`: report that line and stop. A
  holder that died leaves every waiter stopped and reported, not waiting forever.
- **A hold is the developer's.** `node .tropis/scripts/merge-token.mjs take --hold`
  takes the token in their own name, git's `user.name`, for example while a release
  runs, and `release --hold` gives it back. An agent runs these only on the
  developer's word, as `/release` does. Every other session waits meanwhile.
- **A stale token is broken only on the developer's word.** `/next` says who holds the
  token and for how long. A token held by a branch with no open pull request and no
  push for 30 minutes is shown as stale, with the command that breaks it,
  `node .tropis/scripts/merge-token.mjs break --holder <holder>`. A hold is never stale.
- **Nothing about the main branch's safety depends on it.** A session that ignores the
  token, a project on an older release, or a person merging on GitHub still cannot put
  a red or out-of-date change on a gated main branch; the cost is the extra update and
  re-run the token avoids. No check refuses a pull request opened without it. Where
  `take` cannot reach the token at all, it exits 2 saying why: report the line, and go
  on without it.
```

In the Branching bullet on a gated main, change "push it, open the pull request, run"
to "take the merge token, push it, open the pull request, run", and directly after the
sentence ending "…and then run `node .tropis/scripts/main-status.mjs --pull-request
<N>`." add "Release the token once that command has reported (*The merge token*)." Keep
line wrapping near the file's width.

In `## Merge and clean up — in this order`, change the gated paragraph's last sentence
"Pull `main` once it has reported." to "Pull `main` once it has reported, and release
the merge token (*The merge token*)."

In `## Merging`, make the list:

```markdown
1. `node .tropis/scripts/plan-overlap.mjs --wait <plan>` — *Plans that touch the same
   files*.
2. `node .tropis/scripts/merge-token.mjs take` — *The merge token*.
3. `git fetch origin && git rebase origin/main`
4. **Re-run the plan's full merge criteria, not just the test suite.** …
5. Squash-merge, and once `main-status.mjs` has reported,
   `node .tropis/scripts/merge-token.mjs release`.
```

keeping the text of the old items 2 and 3 exactly as it is.

**`commands/release.md`.** Insert directly before `## Stage 1 — Pre-flight`, verbatim:

```markdown
## The merge token

A release holds the merge token (workflow.md, *The merge token*) in the developer's
name: their running `/release` is their word for it. Take it with
`node .tropis/scripts/merge-token.mjs take --hold` right before the first pull request
this command opens, Stage 1b's or Stage 5's, or where the main branch is not gated,
before the first push to `main`. Keep it through *Step 1* and Stage 6, so nothing
merges between the staged commit and the promotion. Give it back with
`node .tropis/scripts/merge-token.mjs release --hold` once the last pull request has
reported — Stage 7's, or Stage 5's on an empty slot — and whenever this command stops
on a failure or a refusal, so a fix can merge. On *Resume at staging*, take it again
first. Say each take and release in your report.
```

**`commands/next.md`.** Directly after the paragraph starting "Its first line says
whether the main branch's last finished pipeline run passed", add:

```markdown
Its second line says who holds the merge token and for how long, or that it is free
(`.claude/framework/workflow.md`, *The merge token*). Report it as it stands. A token
it marks stale is broken only on the developer's word, with the command the line names.
```

**`templates/README.md`** (the operator guide). Directly after the paragraph ending
"…decision record do not count as shared." and before `## Where the framework lives`,
add:

```markdown
Pull requests open one at a time, under a merge token on `origin`:
`node .tropis/scripts/merge-token.mjs take` before a session opens one, waiting while
another holds it, and `release` once `main-status.mjs` has reported. To make every
session wait — while you run something by hand, say — run
`node .tropis/scripts/merge-token.mjs take --hold`, and `release --hold` after; `/release`
does this itself. `node .tropis/scripts/merge-token.mjs` alone says who holds the token
and for how long, as the second line of `/next` does.
```

**`scripts/next.mjs`.** Import `tokenStatus` from `./merge-token.mjs` and, directly after
the main-status line, print `tokenStatus(root).line`, with a comment
`// Then who holds the merge token: merge-token.mjs.` Update the two tests in
`guards/next-report.test.js` (*What the specifying session verified*): add
`merge-token.mjs` to `REPORT_FILES`; `EXPECTED_WITHOUT_BANDS` gains the line
`Merge token: could not tell — no remote named origin.` after the main-branch line; the
red-main test's stub answers the ref read with a 404 reply, and its expected first lines
gain `Merge token: free.` second.

### 5. The tests (`guards/merge-token.test.js`, new)

`// Level: unit` first line, a short header, then cases. Import the module as a
namespace. The command-line cases copy `merge-token.mjs` and `main-status.mjs` into a
temporary project's `.tropis/scripts/` with a `.tropis/package.json` of
`{"type":"module"}`, as `guards/next-report.test.js` does, and run them with
`spawnSync`, or `spawn` where two must run at once. Every case must be able to fail; the
cases marked † are shown red in Task 4. Waiting cases use `--interval 0` or a fraction of
a second and a fractional `--timeout`; none takes more than a few seconds.

Pure:

- `markerMessage` and `parseMarker` round-trip holder, kind and time; `parseMarker`
  returns `null` without a `holder:` line.
- `isStale`: stale for a branch at 30 minutes with no pull request and no branch, or a
  tip 30 minutes old; not stale at 29 minutes, with an open pull request, with a tip 5
  minutes old, or for a hold at any age.

Against a local bare `origin` and clones of it, each with its own identity, `main`
pushed:

- † status says `free`; `take` from a clone on branch `plan/a` prints `taken by plan/a`
  and the bare repository's `refs/tropis/merge-token` commit message names `holder:
  plan/a`; status then says `held by plan/a for 0 min.`; a second `take` from the same
  clone says `already held`.
- † Two clones run `take --holder a` and `take --holder b` at the same moment, each with
  `--interval 0 --timeout 0.02`: exactly one exits 0, the other exits 3 and its stdout is
  `STOPPED: waiting for the token, held by <the winner>`, and the marker names the winner.
  Repeat it five times in the case, deleting the ref between rounds.
- † A take that waits gets the token when the holder releases: `b` starts `take
  --interval 0.1 --timeout 0.5` while `a` holds it, `a` releases after about a second,
  `b` exits 0 with `taken by b`.
- † `release --holder b` while `a` holds it exits 1, says `held by a, not b`, and the ref
  still points at `a`'s commit; `release --holder a` exits 0 and the ref is gone;
  `release` again says `nothing to release`, exit 0.
- `break --holder a` while `a` holds it exits 0 and removes it; `break --holder b` while
  `a` holds it exits 1 and leaves it.
- `take --hold` uses the `user.name` from a global config file the test points
  `GIT_CONFIG_GLOBAL` at (the repository itself sets no `user.name` for this case), and
  status reads `(a hold)`.
- `take` with no remote named origin exits 2, `could not take — no remote named origin`.
- `--ref refs/heads/x` exits 2.

Against an origin on GitHub, faked: the clone's `remote.origin.url` is
`https://github.com/acme/kiln.git` with `url.<a path that does not exist>.pushInsteadOf`
set to it, and a stateful stub `gh` first on PATH that records every call to a file and
answers from files in its directory, as `guards/main-status.test.js`'s stub does:

- † `take` where the create answers HTTP 500 once, and the ref read that follows returns
  the sha the stub's commit create returned, whose commit message is the one the script
  sent: exit 0, and it says it holds the token (`already held`). This is the read before
  deciding.
- `take` where the create answers HTTP 422 "Reference already exists", and reads then
  show a marker held by `other`: exit 3 with `--timeout 0.01`, naming `other`.
- `take` where every read fails: exit 2 after three tries, `could not take`.
- `release` where the push fails (the path does not exist) and the read shows this
  holder's sha: the stub records a `DELETE` of `git/refs/tropis/merge-token`, and it
  prints `released by <holder> through the API.`; where the read shows another holder,
  no `DELETE` is recorded and it exits 1.
- status where the marker is held by branch `plan/x`, taken 45 minutes before, the pull
  request list is empty and the branch read names HTTP 404: the line contains `stale` and
  `break --holder plan/x`; with an open pull request whose `head.ref` is `plan/x`: no
  `stale`.

Assert the stub's calls by what they are, filtering the recorded list
(`.claude/rules/tests.md`, *Assert a shared fake by name*).

Documents, read as text: `framework/workflow.md`'s `## Merging` list has
`merge-token.mjs take` after `plan-overlap.mjs --wait` and before `git rebase
origin/main`, and `merge-token.mjs release` after it; `commands/release.md` has
`take --hold` and `release --hold`; `commands/next.md` mentions the merge token.

### 6. What this owes, and does not

- **Decision record.** Add to `framework/DECISIONS.md`, after the last entry, a decision
  numbered with the next free `FW-` number on your branch's base, titled `Pull requests
  take turns under one merge token, and nothing depends on it`. Date 2026-11-02, status
  Accepted. Decision: every pull request opens under the token, whoever opens it; the
  ref is `refs/tropis/merge-token`; the holder is the branch, or git's `user.name` for a
  developer's hold; take through the API where `origin` is on GitHub (FW-049) and by
  the lock form of a push elsewhere; release by the holder only, by a push naming the
  commit, falling back on GitHub to the API's delete after reading the marker; a failed
  take reads the marker before deciding; a take waits 30 seconds between tries and stops
  after 60 minutes naming the holder; a token held by a branch with no open pull request
  and no push for 30 minutes is shown as stale and broken only on the developer's word;
  a hold is never stale; `/release` holds it from its first pull request to its last.
  Rejected: a pipeline check that refuses a pull request opened without the token (the
  main branch's safety would then depend on it, and a person merging on GitHub would be
  refused); breaking a stale token automatically (a slow holder would lose it mid-merge,
  with nobody told); keeping the rule in a sprint session (a session started by hand would
  not follow it); the API alone (its concurrency could not be tested without GitHub, and
  an origin elsewhere would have no lock). Consequences: a waiter whose holder died stops
  after an hour and says so; a cloud session's release is unproven, as FW-049 says.
  Source: the sprint design of 2026-11-01, §3, and FW-049. The reviewer renumbers it if
  `main` has taken that number by merge time.
- **Operator guide:** `templates/README.md`, *Decision 4*.
- **Rules:** none changed. The workflow and two commands change what an agent is told to
  do, so Task 7 runs a fresh-agent check.
- **Upstream queue:** none; this is the upstream.
- **README:** not patched; no command it names is removed or renamed.

## Traps

- **The tests must fail first.** Task 2 commits them before the code. Run the new test
  file alone to see them fail — the self-check stops at its clean-baseline step on an
  empty script (it lacks the shared-machinery line) and never lists test names. That is
  the red step, not a breakage.
- **Import the module as a namespace**, or every case fails at link time for the same
  reason instead of its own.
- **The self-check reads `HEAD` only.** Commit before each run. Red runs are ordinary
  commits on this branch; they disappear in the squash.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It shows nothing of this change; it must stay green.
- **This plan quotes commands and lines that are not declarations.** Its header has no
  `Merges after` field and must not gain one.
- **Concurrency cases can pass by luck.** Five rounds in one case, and the Task 4
  mutation (a plain push), are what show the lock is a lock.
- **The live check touches GitHub.** Only `refs/tropis/merge-token-probe-<random>` refs,
  every one deleted, and `git ls-remote origin 'refs/tropis/*'` printing nothing at the
  end. If a probe ref cannot be deleted, stop and hand back naming it.
- **The fresh-agent probe runs in a scratch project set up from this worktree**, not in
  this repository: here the installed release (`.claude/`) is the last one and does not
  have the change.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/merge-token.mjs` | new, *Decisions 1 to 3* |
| `scripts/main-status.mjs` | `originOnGitHub` exported, module comment, *Decision 2* |
| `scripts/installed-scripts.txt` | one line, *Decision 3* |
| `scripts/next.mjs` | the token line, *Decision 4* |
| `guards/merge-token.test.js` | new, *Decision 5* |
| `guards/next-report.test.js` | the token line, *Decision 4* |
| `framework/workflow.md` | *Decision 4* |
| `commands/release.md` | *Decision 4* |
| `commands/next.md` | *Decision 4* |
| `templates/README.md` | *Decision 4* |
| `framework/DECISIONS.md` | *Decision 6* |
| `feature-catalog.yaml` | the entry to `shipped`, a comment mapping criteria to tests (Task 8) |
| `docs/backlog-board/bands.yaml` | the entry's row removed (Task 8) |
| `docs/superpowers/plans/2026-11-01-merges-take-turns-under-one-token.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version`, `gh --version` (first
line) and `uname -sm` for the handover.

### Task 1 — Confirm the GitHub replies the script will classify

Before writing code, run against this repository, with a throwaway name
`P=refs/tropis/merge-token-probe-$(openssl rand -hex 4)`:

1. `gh api "repos/{owner}/{repo}/git/ref/${P#refs/}"` — expected: fails, naming HTTP 404.
2. Create a parentless commit through the API on `main`'s tree
   (`gh api repos/{owner}/{repo}/git/commits -X POST -f message='merge token probe' -f tree=$(git rev-parse origin/main^{tree})`),
   then `gh api -X POST repos/{owner}/{repo}/git/refs -f ref=$P -f sha=<it>` twice —
   expected: the second fails naming HTTP 422 and "Reference already exists".
3. Release it by push with the sha, without fetching it:
   `git push --porcelain --force-with-lease=$P:<sha> origin :$P` — expected: deleted.
4. `gh api repos/{owner}/{repo}/branches/plan/does-not-exist-$(openssl rand -hex 4)` —
   expected: HTTP 404; and with a branch name containing a slash that exists (`gh api
   repos/{owner}/{repo}/branches/main` and any `plan/…` branch from
   `git ls-remote origin 'refs/heads/plan/*'`, if there is one) — expected: a JSON body
   with `.commit.commit.committer.date`.
5. `git ls-remote origin 'refs/tropis/*'` — expected: nothing.

Paste where each reply carries the status (stderr or stdout) into the handover. Where a
reply differs from *Decision 2*'s classification, follow the reply and record it under
*What the plan got wrong*.

### Task 2 — The tests, red

Write `guards/merge-token.test.js` (*Decision 5*) and an empty module
`scripts/merge-token.mjs` exporting nothing. Commit. Run the new file alone (*Traps*):
every † case must fail. No test that existed before this plan may fail. Paste the failing
test names.

### Task 3 — The script and the report line

Apply *Decisions 1 to 3*, and the `next.mjs` and `next-report.test.js` part of
*Decision 4*. Commit. Run `bash scripts/check-blueprint.sh`; the last line must start
`Self-check passed`. Paste it.

### Task 4 — Show the † cases can fail

Each a throwaway commit followed by running the new test file, then `git reset --hard
HEAD~1`:

1. Make the local take a plain push (drop `--force-with-lease=<ref>:`). Expected red: the
   simultaneous case.
2. Make `release` skip the holder comparison. Expected red: the release-by-another case.
3. Make a non-422 create failure exit 2 at once. Expected red: the read-before-deciding
   case.
4. Make `take` exit 0 without waiting when held by another. Expected red: the
   wait-then-take case.

Paste the failing test names of each. If one stays green, fix the test, commit, and
repeat.

### Task 5 — The documents and the decision

Apply the rest of *Decision 4* and *Decision 6*. Commit. Run
`git grep -nF "merge-token.mjs" -- framework commands templates` and paste it. Expected:
`framework/workflow.md` (the new section, the Merging list), `commands/release.md` (two),
`templates/README.md`. Before the work it prints nothing. Run
`bash scripts/check-blueprint.sh`; last line `Self-check passed`.

### Task 6 — The live check on GitHub

From the worktree, whose `origin` is this repository, with
`R=--ref refs/tropis/merge-token-probe-$(openssl rand -hex 4)` (the same ref for every
step) and `node scripts/merge-token.mjs`:

1. status → `Merge token: free.`
2. `take $R --holder probe-a` → `taken by probe-a`; status → `held by probe-a for 0 min.`
3. `take $R --holder probe-b --interval 1 --timeout 0.05` → exit 3,
   `STOPPED: waiting for the token, held by probe-a`.
4. `release $R --holder probe-b` → exit 1, `held by probe-a, not probe-b`.
5. `release $R --holder probe-a` → `released by probe-a.` (by push, not through the API).
6. Two `take`s started together (`&` and `wait`), `--holder probe-c` and
   `--holder probe-d`, each `--interval 1 --timeout 0.05`: exactly one exit 0 and one
   exit 3; run it three times, releasing the winner after each round.
7. `take $R --holder probe-e`, then `break $R --holder probe-e` → `broken`.
8. `git ls-remote origin 'refs/tropis/*'` → nothing; `gh run list --limit 10 --json
   headBranch,event,createdAt` → no run on a `refs/tropis/` ref.

Paste each command and its output. If any step differs, fix the script, commit, re-run
the self-check and this task.

### Task 7 — Fresh-agent check

The workflow and `/release` now tell an agent to take and release a token around a pull
request, and to hold it on the developer's word; a fresh agent with only a project set
up from this branch must be seen to do so. Run it with its tool calls visible (in Claude
Code, `claude -p --output-format stream-json --verbose`, allowed to run shell commands
and edit files), with the scratch project as its working directory.

1. Set up: `mkdir -p "$TMPDIR/token-agent" && git init -q --bare "$TMPDIR/token-agent/origin.git"`,
   `mkdir "$TMPDIR/token-agent/kiln-yard" && git -C "$TMPDIR/token-agent/kiln-yard" init -q -b main`,
   then from the worktree `bash scripts/set-up-project.sh "$TMPDIR/token-agent/kiln-yard" "Kiln Yard"`
   and `npm --prefix "$TMPDIR/token-agent/kiln-yard/.tropis" ci`. Give the project a local
   identity, a `feature-catalog.yaml` with one entry `glaze-log` in `building` whose refs
   name `docs/superpowers/plans/glaze-log.md`, that plan (delivering `glaze-log`, no
   `Merges after`), commit everything, add the bare repository as `origin`, push `main`,
   then create branch `plan/glaze-log` with one commit and push it.
2. Prompt, verbatim apart from the path: *"This is a probe; its output will be
   discarded. In the project at `<scratch project>`, the branch `plan/glaze-log` has
   been reviewed and is ready to merge. Check it out and do the steps the project's
   `.claude/framework/workflow.md` lists in its Merging section, up to and not including
   the rebase. Report what you ran."*
3. Check, and paste: the `merge-token.mjs take` call from the stream and its output
   (`taken by plan/glaze-log`), and `git -C "$TMPDIR/token-agent/origin.git" log -1
   --format=%B refs/tropis/merge-token` (names `holder: plan/glaze-log`).
4. Second prompt: *"This is a probe; its output will be discarded. In the project at
   `<scratch project>`, the pull request for `plan/glaze-log` has merged and
   `main-status.mjs` reported the main branch green. Finish what the workflow's merge
   sequence still asks of you; there is no worktree to remove. Report what you ran."*
   Check: a `merge-token.mjs release` call, and `git -C … show-ref refs/tropis/merge-token`
   printing nothing.
5. Third prompt: *"This is a probe; its output will be discarded. In the project at
   `<scratch project>`, I am the developer: keep every session from merging while I do
   something by hand, the way the project's workflow says."* Check: a
   `merge-token.mjs take --hold` call, and the marker naming the identity's `user.name`
   with `kind: hold`.

If the agent misses a call, the wording is not clear enough: change it, commit, and run
the probe again. If it fails twice, stop and hand back with both transcripts' relevant
calls. Record the tool, its version, the operating system and the architecture; these go
in the commit body of the final commit (a no-change commit with `--allow-empty` is fine)
and in the handover, with one sentence per prompt on what the agent was asked and
whether it did it. Delete the scratch folder afterwards.

### Task 8 — The catalog and the board

1. In `feature-catalog.yaml`, on `merges-take-turns-under-one-token`: set `status:
   shipped` (it reads `building`; if it reads anything else, set `shipped` anyway and say
   so under *Judgment calls*). Set `modules` to `scripts/merge-token.mjs` and
   `guards/merge-token.test.js`. Leave `refs` as it is. Add, directly above the entry's
   `- id:` line, a comment `# Shipped by docs/superpowers/plans/2026-11-01-merges-take-turns-under-one-token.md.`
   and lines mapping each criterion to the test cases or the Task 6/7 checks that cover
   it, as the comment above `overlapping-plans-merge-in-order` does. Do not put `: `
   (colon and space) inside an unquoted YAML value.
2. In `docs/backlog-board/bands.yaml`, delete the whole `merges-take-turns-under-one-token:`
   block (the key and its indented lines, through `blockers: []`), and nothing else.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line; every test must
   pass.

### Task 9 — Verification and handover

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the last line, which must
   start `Self-check passed`), and `git diff --stat origin/main...HEAD` (paste it; every
   file must be in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has no
   screen, so there is no developer check. Commit.
3. Push the branch (`git push -u origin plan/merges-take-turns-under-one-token`).
   **Do not open a pull request**, write a review record, set auto-merge or merge: `main`
   is gated and the dispatching session reviews, opens the pull request and merges. Leave
   the worktree in place; the reviewer removes it.
