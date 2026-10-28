# The maintainer takes in a flush group by group — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** the framework's maintainer can take in a project's flush with one command,
`/absorb-flush`, which lists the flush's pull requests, proposes groups, builds each
decided group as one pull request with one commit per contribution, and closes each
original once the commit carrying it has landed.

**Spec:** the entry `maintainer-absorbs-contributions-in-groups` in
`feature-catalog.yaml` — its value, its nine acceptance criteria and the comments above
it — and the finding it cites,
`docs/superpowers/specs/2026-10-19-absorbing-a-flush-finding.md`. Read both. The finding
records what absorbing first-adopter's 38 pull requests by hand took, which steps were
mechanical, and where the hand-made versions went wrong (a union merge that dropped
fields, a rewrap that merged numbered steps, a push made before the maintainer's answer
took effect). This plan automates the mechanical steps and writes the rest into the
command as instructions.

**What the specifying session verified on 2026-10-19, against `main` at `37e068e`:**

- **Where a repository-only tool lives.** `.github/scripts/release.mjs` is this
  repository's own release script. It is tested by `guards/release.test.js`, which
  imports it with `'../.github/scripts/release.mjs'`, and no release ships it:
  `scripts/set-up-project.sh` lines 68–71 copy only five named guards into a project, and
  `scripts/installed-scripts.txt` does not list it. The new script follows the same
  pattern.
- **A command file of this repository's own survives updates.** `scripts/take-version.mjs`
  (lines 553–610) acts only on paths in the installed baseline or the next release. A file
  in neither is never touched. `.tropis/installed.json` records the installed files, and
  `recordProblems` in `scripts/installed-files.js` (line 177) checks only recorded paths,
  so an unrecorded `.claude/commands/absorb-flush.md` raises no problem.
  `.claude/settings.json` denies edits to `.claude/rules/**` and `.claude/framework/**`
  but not to `.claude/commands/**`.
- **A backticked path in a command must exist.** `guards/framework-integrity.test.js`,
  installed and run by `npm --prefix .tropis test`, fails on a backticked
  `.github/…`, `scripts/…` or `docs/…` path in `.claude/commands/*.md` that does not
  resolve. Paths containing `<`, `>` or `*` are skipped.
- **The self-check runs every file under `guards/` as a Jest test** (roots `guards`,
  match `**/*.test.js`, from `templates/framework-jest.config.js`) on a `git archive`
  of `HEAD`, which includes `.github/`. A unit-level guard needs no entry in
  `scripts/check-conformance.sh`'s `CASES`; those cases are for guards with planted
  defects.
- **Tooling here:** gh 2.102.0, Node v22.15.0. `gh pr list --json` accepts
  `number,title,url,headRefName,files`; `files` gives `path`, `additions`, `deletions`.
  GitHub serves every pull request's head as `refs/pull/<N>/head`, fork or not.
- **The squash rule is stated in the source workflow** at `framework/workflow.md` line
  226, under `## Merging`: "Every plan lands as **one squash-merge commit**; per-task
  commits are working history."
- **The decision record's last entry is `## FW-017`** in `framework/DECISIONS.md`.
  FW-011 (line 368) is the flush's decision; its 2026-10-19 amendment already names this
  entry as where grouping belongs.
- **`RELEASES.md` `## [Unreleased]`** holds three sections already; add after the last.
- **This repository's markdown wraps at 88 columns.** The finding's rewrap used 88.

**Model tier: Medium.** The pure functions and the command's text are specified, but the
rewrap and hunk logic need careful work against the tests, and the git plumbing needs
debugging inside the stated approach.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 6 (record which).

**Merge authority: parent review.** It changes a framework document and adds a command
whose instructions are judged by reading them, and the fresh-agent check's result needs
reading by the session that wrote the criteria.

Do not store a kick-off prompt on this plan.

---

## Delivers

maintainer-absorbs-contributions-in-groups

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-absorb -b plan/maintainer-absorbs-contributions-in-groups` |

## Global Constraints

- **The script never calls `gh`.** It reads `gh`'s JSON from standard input and does
  everything else with `git`. Every outward step — pushing, opening, merging, closing —
  is a `gh` or `git push` line in the command, run by the agent after the maintainer's
  answer. This keeps the script testable without GitHub and usable from a session that
  reaches GitHub another way.
- **The script never pushes, and never writes to `main`.**
- **Nothing in this plan ships to projects.** Do not add the script to
  `scripts/installed-scripts.txt`, the guard to `scripts/set-up-project.sh`, or the
  command to `commands/`.
- **Do not edit `.claude/framework/`, `.claude/rules/`, `.tropis/`, `.cursor/`,
  `CLAUDE.md` or `AGENTS.md`.** They hold the installed release. The one exception is the
  new file `.claude/commands/absorb-flush.md`, which belongs to this repository, not to
  a release.
- **No new dependency.** Node built-ins only (`node:child_process`, `node:fs`,
  `node:path`, `node:os`).
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body.

## Decisions

Taken by the specifying session on 2026-10-19. Do not reopen them.

1. **Where things live.** The script is `.github/scripts/absorb-flush.mjs`, the
   command is `.claude/commands/absorb-flush.md`, and the tests are
   `guards/absorb-flush.test.js`, with `// Level: unit` on line 1 like every other guard.
2. **The unit of merge is one pull request per group, holding one commit per accepted
   contribution, landed by rebase.** A pull request that edits several files travels
   whole, with the group of its home file (rule 3). The finding records the maintainer
   settling both.
3. **Proposed groups.** A pull request's *home file* is the file it changes most
   (additions plus deletions), ignoring `feature-catalog.yaml` and
   `docs/backlog-board/bands.yaml`. A tie goes to the alphabetically first path. A pull
   request that changes only those two files has `feature-catalog.yaml` as its home.
   Groups are keyed by home file and listed in path order, and the pull requests in each
   group are in number order. A pull request **spans groups** when any other file it
   changes (catalog and bands excepted) is another group's home file.
4. **Pairs that edit the same lines.** Hunks come from `git diff -U0 <base> <head>`, where
   `<base>` is the merge base of the pull request's head with `origin/main`. A hunk
   header `@@ -a,b +c,d @@` (with `b` defaulting to 1 when omitted) covers the old-side
   lines `[a, a+b-1]`, or `[a, a]` when `b` is 0, meaning an insertion after line `a`. Two
   pull requests are flagged when they change the same path and some pair of their
   ranges lies within 3 lines of each other (`s1 <= e2 + 3 && s2 <= e1 + 3`). The slack
   is there because `git apply -3` applies a diff with 3 lines of context, so
   neighbouring edits conflict as well. Two pull requests that both only append to
   `feature-catalog.yaml` (rule 5) are not flagged for that file.
5. **Catalog appends.** A pull request *only appends* to `feature-catalog.yaml` when the
   catalog at its head begins byte-for-byte with the catalog at its merge base and is
   longer. Its tail (the bytes after that prefix) is appended verbatim to the group
   branch's catalog, and its diff is applied with the catalog excluded. Any other change
   to the catalog goes through `git apply -3` like any file. No union merge anywhere: the
   finding shows `merge=union` dropping `type`, `layer`, `modules` and `refs` from
   entries while the self-check stayed green.
6. **One commit per contribution.** A pull request must hold exactly one commit beyond
   its merge base, which is what a flush makes. With more than one, `apply` stops, names
   the count and changes nothing, and the maintainer decides. The new commit keeps the
   contributor's author name, email, author date and message, then adds a blank line and
   `Absorbed from <pull request URL>: <note>`. The note is one line saying what changed in
   absorbing it, `taken unchanged` when nothing did. When the rewrap changed anything,
   `; rewrapped to 88 columns` is appended to the note.
7. **Rewrap.** It applies only to `.md` files the contribution changed, and only to a
   *unit* that contains a touched line *and* a line longer than 88 characters. A touched
   line is a line of the new text that the previous text does not have, counting
   duplicates: a line appearing twice before and three times after has one touched copy.
   The previous text is the file at the group branch's `HEAD` before this contribution.
   - **Never changed, and always ending a unit:** blank lines; YAML front matter (a
     first line `---` through the next `---`); fenced code (between lines starting
     ```` ``` ```` or `~~~`); lines whose first non-space character is `|`, `#`, `→`, or
     `<!--`; and lines that are only bold text (`^\s*\*\*[^*]+\*\*[.:]?\s*$`).
   - **A unit starts** at a list item (`- `, `* ` or `<digits>. ` after any indent) or at
     a plain line following a boundary. It continues over following lines that are
     neither boundaries nor list-item starts. So two numbered steps are two units, and a
     bold-only line is never joined to the text below it.
   - **Wrapping** joins the unit's words with single spaces and fills lines greedily to
     88 characters. The first line keeps its original indent and list marker. Continuation
     lines are indented to the item's text column, which is the indent plus the marker
     and its space, or, in a plain paragraph, to the first line's indent. A word longer
     than the width sits on a line of its own. Rewrapping already-wrapped text changes
     nothing.
8. **Remembering a listing.** `list` records the pull request numbers it saw in
   `<git common dir>/absorb-flush/<prefix with every / replaced by _>.json`
   (`git rev-parse --git-common-dir`), so it is shared by worktrees and never committed.
   A later run prints which numbers arrived and which are gone since then.
9. **Bands.** New catalog entries in a group are banded in one extra commit by the
   maintainer's session, last on the group branch (`backlog: band the entries absorbed
   from <project>'s flush`), following `.claude/commands/refresh-board.md` step 2. The
   finding put each band into its entry's commit, which is more work for no reader.
10. **Closing comments.** An absorbed pull request is closed with
    `Landed on main as <short sha>, reviewed in <group pull request URL>: <note>. Thank you.`
    A declined one is closed with the reason the maintainer gave. Nothing is closed
    before the group's rebase-merge, because a rebase-merge gives every commit a new hash.
11. **The workflow's exception.** In `framework/workflow.md`, directly after the line
    "Every plan lands as **one squash-merge commit**; per-task commits are working
    history." (line 226) and its following blank line, insert:

    ```
    **In the framework's own repository, a group of flushed contributions is the
    exception.** Its maintainer takes in contributions from projects' flushes a group at a
    time. A group is many things, so its pull request keeps one commit per contribution,
    each with its contributor as author, and lands by rebase rather than squash: history
    shows each contribution, and each can be reverted alone. A plan for one catalog entry
    still lands as one squash-merge.
    ```

    followed by one blank line.
12. **Decision record.** Append to `framework/DECISIONS.md`, after the last `## FW-` entry,
    separated by a blank line as the others are, using the next free number (FW-018 if
    the last is still FW-017):

    ```
    ## FW-018: The maintainer takes in a flush a group at a time, one commit per contribution

    **Date:** 2026-10-19 · **Status:** Accepted

    **Decision:** The framework repository's own command, `/absorb-flush`, lists a flush's
    pull requests, proposes groups by the file each changes most, and builds each group
    the maintainer decides as one pull request. That pull request keeps one commit per
    accepted contribution — the contributor's commit with its author, date and message,
    and a line naming the original pull request and what changed in absorbing it — and
    lands by rebase. Each original is closed with the commit on main that carries it,
    once that commit has landed. The command lives in this repository only and is not
    shipped: only the framework receives flushes.

    **Evidence:** absorbing first-adopter's 38 pull requests by hand took about six and a
    half hours, and most of the rework was in mechanical steps
    (`docs/superpowers/specs/2026-10-19-absorbing-a-flush-finding.md`).

    **Rejected:** one squash per group, which carries many unrelated lessons under one
    message and cannot revert one alone. One merge per contribution, which is the review
    load this exists to cut. A line-union merge for the catalog, which dropped fields
    while the self-check stayed green.

    **Consequences:** `main` carries commits authored by contributors and not squashed;
    the squash rule in the workflow names this exception. A flushed pull request with more
    than one commit is put to the maintainer rather than absorbed.
    ```
13. **Release note.** In `RELEASES.md`, after the last section under `## [Unreleased]`:

    ```
    ### The workflow names how flushed contributions land in the framework

    The merge section of the workflow now says that, in the framework's own repository,
    a group of contributions from projects' flushes lands by rebase with one commit per
    contribution, while a plan still lands as one squash-merge. Nothing changes for a
    project. This is not a breaking change.
    ```

## Traps

- **The source checks have one runner, `bash scripts/check-blueprint.sh`, and it checks
  committed content only.** Commit, then run it. `npm --prefix .tropis test` runs this
  repository's installed checks on the repository as a project. It is the run that sees
  the new command file, through `framework-integrity.test.js`, and it must also be green.
- **The merge-time reminder will fire whenever a command mentions `gh pr merge`,**
  including in the command file's text if you `grep` it. It is advice, not a refusal. The
  catalog entry `hooks-match-at-command-position` covers it.
- **The tests build real git repositories.** Use `mkdtempSync` under `os.tmpdir()`,
  configure `user.name`/`user.email` per repository (`git -c` or `git config`), never
  read the developer's global git config for author values, and remove every temporary
  directory in `afterAll`. A local bare repository stands in for `origin`, and a pull
  request is a ref pushed to it as `refs/pull/<N>/head`.
- **Git's default branch name varies by machine.** Create repositories with
  `git init -b main`.
- **`git apply -3` needs the blob of the base side,** which it finds only if the pull
  request's commits have been fetched into the repository. `apply` fetches before
  applying (see Task 3), and the test must not pre-fetch, or it will hide a missing
  fetch.
- **This plan spells out no worktree command except in its Repositories table,** because
  the plan check refuses one anywhere else. The command file Task 4 writes does carry the
  full worktree line for a group branch. That is right: the command file is not a plan.
- **The fresh-agent check must not run the command against GitHub.** Its subject is an
  invented flush, and it is a probe whose output is discarded.

## File Structure

| File | Change |
|---|---|
| `.github/scripts/absorb-flush.mjs` | Create: pure functions plus the `list`, `apply`, `commit` and `landed` subcommands |
| `guards/absorb-flush.test.js` | Create: unit tests for the pure functions, and runs of the subcommands against local repositories |
| `.claude/commands/absorb-flush.md` | Create: the command |
| `framework/workflow.md` | Decision 11 |
| `framework/DECISIONS.md` | Decision 12 |
| `RELEASES.md` | Decision 13 |
| `docs/superpowers/plans/2026-10-19-maintainer-absorbs-contributions-in-groups.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Interfaces

All exported from `.github/scripts/absorb-flush.mjs`. The file runs its command line only
when executed directly (`import.meta.url === pathToFileURL(process.argv[1]).href`), so
the tests can import it.

```js
/** @typedef {{ path: string, start: number, end: number }} Range */
/** @typedef {{ number: number, url: string, headRefName: string, title: string,
 *              files: { path: string, additions: number, deletions: number }[] }} Pr */

parseHunks(diffText: string): Range[]                     // Decision 4, from git diff -U0
overlappingPairs(rangesByPr: Map<number, Range[]>,
                 appendOnly: Set<number>, slack = 3): [number, number, string][]  // [a, b, path], a < b, sorted
homeFile(pr: Pr): string                                  // Decision 3
proposeGroups(prs: Pr[]): { home: string, prs: number[], spans: { pr: number, also: string[] }[] }[]
catalogTail(baseText: string, headText: string): string | null   // Decision 5
arrivedSince(previous: number[], current: number[]): { arrived: number[], gone: number[] }
touchedLines(before: string, after: string): Set<number>  // 0-based indexes into after's lines, Decision 7
rewrapTouched(before: string, after: string, width = 88): string
absorbedMessage(original: string, url: string, note: string): string  // throws on an empty or multi-line note
landedFrom(logText: string): { number: number, url: string, sha: string, note: string }[]
```

**Command line** (run from a checkout of this repository; every subcommand resolves the
repository with `git rev-parse --show-toplevel` from the working directory):

- `list <head-prefix>`: reads `gh pr list --state open --limit 200 --json
  number,title,url,headRefName,files` on standard input, keeps the pull requests whose
  `headRefName` starts with the prefix, and fetches each head with
  `git fetch origin +refs/pull/<N>/head:refs/absorb/<N>`. It prints, in order: the arrivals
  and departures since the last listing (or `First listing.`), each proposed group with
  its pull requests (number, title, files), the spans, and the overlapping pairs. Then it
  records the listing (Decision 8). Exit 0.
- `apply <N> <url> [--note <text>]`: run in the group branch's worktree. It refuses a
  dirty tree with exit 2. It fetches `refs/pull/<N>/head` as `list` does, then applies
  Decisions 5–7 and commits. On a conflict it leaves the conflict in the working tree and
  the index, writes `{ number, url, note }` to `<git dir>/absorb-flush/pending.json`, names
  the conflicted files, and exits 3. It exits 2 on more than one commit.
- `commit [--note <text>]`: after the maintainer's session has resolved a conflict. It
  reads `pending.json` and refuses (exit 2) while any staged file still contains a line
  beginning `<<<<<<< ` or `>>>>>>> `. Otherwise it rewraps, commits as `apply` would with
  the new note when one is given, and deletes `pending.json`.
- `landed <since-sha>`: reads `git log --reverse --format=%H%x1f%B%x1e
  <since-sha>..origin/main` and prints one line per absorbed commit, as
  `#<N>\t<short sha>\t<url>\t<note>`.

## Tasks

### Task 1: Grouping and overlaps

**Files:** `.github/scripts/absorb-flush.mjs` (create), `guards/absorb-flush.test.js` (create).

- [ ] Write tests for `parseHunks`, `overlappingPairs`, `homeFile`, `proposeGroups`,
      `catalogTail` and `arrivedSince`. At least these cases:
  - `parseHunks` on a `-U0` diff with `@@ -5,2 +5,3 @@`, `@@ -9 +10 @@` and `@@ -20,0 +22,4 @@`
    returns ranges `[5,6]`, `[9,9]`, `[20,20]` for that path. A diff touching two files
    keeps each range with its own path.
  - `overlappingPairs`: two insertions after the same line are flagged (the finding's
    #55/#56). Ranges 10 lines apart are not flagged. Ranges 3 apart are flagged. Two
    catalog appends listed in `appendOnly` are not flagged on `feature-catalog.yaml`, but
    the same pair is still flagged on another file they both edit.
  - `homeFile`: most-changed file wins; catalog and bands are ignored; a tie goes to the
    alphabetically first path; a catalog-only pull request's home is
    `feature-catalog.yaml`.
  - `proposeGroups` on the finding's #70 (edits `rules/planning.md` most, and also
    `framework/workflow.md`, `templates/README.md`, `feature-catalog.yaml`) together with
    a pull request whose home is `framework/workflow.md`: #70 sits in the
    `rules/planning.md` group and is listed as spanning `framework/workflow.md`.
  - `catalogTail`: an exact-prefix head returns the tail; a head that edits a middle line
    returns `null`; an identical head returns `null`.
  - `arrivedSince([49, 50], [50, 86])` → `{ arrived: [86], gone: [49] }`.
- [ ] Run `bash scripts/check-blueprint.sh` after committing the tests and see them fail.
- [ ] Implement the functions. Commit, then run the self-check again: green.

### Task 2: Rewrap and messages

**Files:** the same two.

- [ ] Tests for `touchedLines`, `rewrapTouched`, `absorbedMessage` and `landedFrom`. For
      `rewrapTouched`, one test per kind in Decision 7, each with a touched line longer
      than 88 characters placed so it would be changed if the kind were not protected:
  - front matter, fenced code, a table row, a `→` line, a heading and a `<!--` line are
    each returned unchanged;
  - two numbered steps, each touched and too long, are wrapped as two separate items and
    not joined into one;
  - a bold-only line followed by a touched, too-long line stays on its own line;
  - an untouched paragraph with a 100-character line is unchanged;
  - a touched `- ` item of 150 characters becomes lines of at most 88 characters, with
    continuation lines indented by two spaces;
  - a touched paragraph that is already wrapped is unchanged, and running
    `rewrapTouched` on its own output changes nothing.

  For `absorbedMessage`: it appends a blank line and
  `Absorbed from https://github.com/o/r/pull/7: taken unchanged` to a message, trailing
  whitespace of the original trimmed. It throws on `''` and on a note containing a
  newline. For `landedFrom`: a log of three commits, two carrying `Absorbed from` lines,
  gives two records in log order with their numbers, shas and notes.
- [ ] Commit the tests, run the self-check, see them fail. Implement. Commit, run: green.

### Task 3: The subcommands

**Files:** the same two.

- [ ] Tests that run `node .github/scripts/absorb-flush.mjs` with `spawnSync` against a
      temporary setup: a bare `origin` and a working clone on `main`, holding a
      `feature-catalog.yaml` and a `rules/planning.md` of a few paragraphs. Three
      contributions are made as single commits on branches from `main`, each by its own
      author, and pushed as `refs/pull/1/head`, `refs/pull/2/head`, `refs/pull/3/head`:
      #1 appends a catalog entry and adds one 120-character bullet to
      `rules/planning.md`; #2 appends a different catalog entry; #3 inserts a line after
      the same line #1 inserted after. A fourth, #4, has two commits.
  - **`list`** with JSON for #1–#3 on standard input prints `First listing.`, one group
    for `rules/planning.md` holding #1 and #3, one for `feature-catalog.yaml` holding #2,
    and flags #1 and #3 as editing the same lines of `rules/planning.md`. It does not flag
    #1 and #2 on the catalog. Run again with #1–#3 plus a new #5, it prints #5 as arrived.
  - **`apply 2`**, then **`apply 1`** on a branch from `origin/main` gives two commits.
    Each keeps its contributor's author and author date
    (`git log --format='%an %ad' --date=raw`) and ends with its `Absorbed from` line. The
    catalog holds both appended entries byte-for-byte, and #1's long bullet is wrapped,
    with `; rewrapped to 88 columns` in #1's note.
  - **`apply 3`** then exits 3, leaves `pending.json`, and names `rules/planning.md`.
    `commit` refuses with exit 2 while the conflict markers remain. After the test
    resolves the file and stages it, `commit --note "resolves the conflict with #1 by keeping both lines"`
    makes the commit with that note.
  - **`apply 4`** exits 2, names the commit count, and leaves `HEAD` and the tree unchanged.
  - **`apply`** on a dirty tree exits 2.
  - **`landed`**: after the test pushes the group branch to `origin` as `main`, `landed
    <old main sha>` prints the lines for #2, #1 and #3, in that order.
- [ ] Commit the tests, run the self-check, see them fail. Implement the command line.
      Commit, run: green.

### Task 4: The command

**Files:** `.claude/commands/absorb-flush.md` (create).

Write the command. Front matter `description:` is one line: *Take in a project's flush:
list its pull requests, decide them a group at a time, and land each group as one pull
request with one commit per contribution.* Say near the top that it lives in this
repository only and never ships. The body has these steps, in this order, each with the
exact command line it runs:

1. **Preflight.** `gh auth status` must succeed, and the account must be able to push to
   this repository. Otherwise say so and stop, because nothing in the command works
   without both. Ask for the flush's branch prefix (for example
   `upstream/first-adopter/2026-10-19-`) if it was not given.
2. **List.** `gh pr list … | node .github/scripts/absorb-flush.mjs list <prefix>`. Show
   the output, and state the unit of merge before anything else: *one pull request per
   group; one commit per contribution, with its contributor as author; landed by rebase;
   a pull request that edits several files travels whole with the group of the file it
   changes most*. Invite the maintainer to move pull requests between groups. Re-run the
   listing whenever the maintainer asks or a new group starts, and say what arrived.
3. **Decide one group at a time.** For each pull request, read its whole diff
   (`git diff $(git merge-base refs/absorb/<N> origin/main) refs/absorb/<N>`). Where it
   claims something about how code or a tool behaves, read that code or run that tool
   first, and name the file and line, or the command and machine, in the recommendation.
   Check the claim against the whole file the contribution lands in, not only the nearest
   evidence. The finding records a claim cut as unmeasured that the same rule already
   stated a few lines above the table the reviewer had checked. The finding also records
   three recommendations that rested on code nobody had read, and one that was false. Give a recommendation for each. Present a judgment call with its
   impact, pros and cons, and present pairs the listing flagged together. Ask the
   maintainer for each to be taken, taken with a stated change, or declined with a
   reason. Wait for the answers.
4. **Build.** In a sibling worktree, `../tropis-absorb-<group-slug>`, on a new branch
   `absorb/<group-slug>` started from `origin/main` (the command file gives the full
   worktree line; see *Traps*), run `apply <N> <url> --note "<note>"` for each accepted pull request in number order.
   On exit 3, resolve the conflict in the later contribution, keeping both where both
   stand, and run `commit --note` saying how. A conflict between two that cannot both
   stand goes back to the maintainer. Make a stated change as one more edit inside that
   contribution's commit (`git commit --amend`, keeping the author and
   `Absorbed from` line, with the note updated). Band new catalog entries in one last
   commit (Decision 9).
5. **Check and ask.** Show `git diff origin/main...HEAD` in full: a rewrap still needs
   its diff read. Run `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test`
   on `git rev-parse HEAD` and show both results with that sha. Then ask whether to push
   and open the pull request. Push nothing in this step.
6. **Push and open, after a yes.** `git push -u origin absorb/<group-slug>`, then
   `gh pr create` with a body listing every pull request in the group and what became of
   it: taken, taken with a change (say which), or declined (say why). Wait for CI with
   `gh pr checks <number> --watch`. Then ask whether to merge.
7. **Merge, after a yes.** In the workflow's order: remove the group worktree, delete the
   local branch, then `gh pr merge <number> --rebase --delete-branch`. Never squash a
   group, and never push to `main`.
8. **Close.** `git fetch origin`, then
   `node .github/scripts/absorb-flush.mjs landed <origin/main before the merge>`. Close
   each absorbed pull request with `gh pr close <N> --comment "…"` in the form of
   Decision 10, and each declined one with its reason. List the head branches of the
   closed pull requests and the `refs/absorb/*` refs for the maintainer to delete. Delete
   none of them.

Then a `## Do not` list: push or merge in the step that asks; squash a group; push to
`main`; close a pull request before the commit carrying it has landed; absorb a pull
request with more than one commit without asking; use a union merge.

- [ ] Commit, then run `npm --prefix .tropis test` (green, including
      `framework-integrity`) and `bash scripts/check-blueprint.sh` (green).

### Task 5: Workflow, decision record, release note

- [ ] Make Decisions 11, 12 and 13 exactly. Commit, then run
      `bash scripts/check-blueprint.sh`: green.

### Task 6: Fresh-agent check

`framework/workflow.md` changed, so this check is required. In the plan worktree, start
a fresh Claude Code session and give it, in one prompt:

> This is a probe and its output will be discarded; do not run any command against
> GitHub, and change no file. An invented project, "demo-kit", has flushed six pull
> requests to this repository, #101 to #106, on branches
> `upstream/demo-kit/2026-11-02-*`. Three edit `rules/planning.md`, two add catalog
> entries, and one edits both `framework/workflow.md` and `rules/planning.md`. Following
> this repository's instructions, tell me: what command you would use and where its
> instructions are; how many pull requests you would open and how each would be merged;
> what each commit on main would look like; when you would push and when you would
> merge; when each of #101–#106 would be closed and what its comment would say; and
> whether a plan for one catalog entry lands the same way.

**Pass:** the answer names `/absorb-flush` (or `.claude/commands/absorb-flush.md`); one
pull request per group, merged by rebase; one commit per contribution, carrying the
contributor's authorship and an `Absorbed from` line; a push only after the maintainer
says yes, and a merge only after a second yes; closing only after the merge has landed,
naming the commit; #106 travelling whole with one group; and a single-entry plan still
squash-merged. **Fail:** any of those missing or contradicted. Then the command or
Decision 11's text is unclear: fix it and run the check again.

Record the prompt, the answer's gist, pass or fail, and the tool, version and machine in
a commit body on the branch.

### Task 7: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only the files in *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name,
and commit it. Under *Verification results*, map each of the entry's nine criteria to the
test (file and test name) or the fresh-agent check that covers it:

| Criterion | Covered by |
|---|---|
| 1 Listing, groups, spans, overlaps, arrivals | Tasks 1 and 3 tests (`list`) |
| 2 Recommendations; judgment calls with impact, pros and cons; code read | Task 6 check and the command text |
| 3 One commit per contribution with author, date, message, note | Task 3 test (`apply`) |
| 4 Order; conflicts in the later commit; verbatim catalog append | Tasks 1 and 3 tests |
| 5 Rewrap only touched items; protected kinds unchanged | Task 2 tests |
| 6 Full diff and both checks on the head; no push in the asking step | Task 6 check and the command text |
| 7 Rebase merge after a yes; never push to main | Task 6 check and the command text |
| 8 Close after landing with the commit; declined with reason; branches listed | Task 3 test (`landed`) and Task 6 check |
| 9 Workflow and decision record name the exception | Task 5 and Task 6 check |

Under *Outstanding*, say that the command has not yet run on a real flush. Its first use
is the next flush the framework receives, and the reviewer records that run's outcome
against this entry.

The specifying session reviews and merges. Do not merge.

## Handover report

### Task completion

All seven tasks are done. The plan's checkboxes are still unticked: this session's
tooling tracks tasks in its own list and does not write the boxes back.

### Verification results

Self-checks below are `bash scripts/check-blueprint.sh` with a private `TMPDIR`, so
the take-version scratch-folder count does not see another run's directories. Each
prints `Checking <sha>` and, when green, `Every guard caught its defect and passed
the clean baseline.`

- **Task 1, red.** `git archive` of `4407369`, then Jest on
  `guards/absorb-flush.test.js` only: exit 1, `FAIL guards/absorb-flush.test.js`,
  `Test suite failed to run`, `Cannot find module
  '../.github/scripts/absorb-flush.mjs'`. The full self-check of `4407369` was
  stopped during the clean baseline and printed no result. **Green:** self-check of
  `0d57259`, exit 0. An earlier self-check of that same commit, without a private
  temp directory, failed the clean baseline on `take-version.mjs › removes its
  scratch folder on every exit path` and was re-run.
- **Task 2, red.** Self-check of `e9ae32d`, exit 1: clean baseline
  `● Test suite failed to run`. **Green:** self-check of `d9ebb7b`, exit 0.
- **Task 3, red.** Self-check of `48a828c`, exit 1: clean baseline failed
  `absorb-flush subcommands › applies one commit per contribution, stops on a
  conflict and on two commits, and maps what landed` and `absorb-flush subcommands
  › lists groups, spans nothing here, flags the shared lines, and reports a later
  arrival`. **Green:** self-check of `e3893bb`, exit 0.
- **Task 4.** Self-check of `ca3fe4e`, exit 0. `npm --prefix .tropis test`, exit 0:
  `Test Suites: 5 passed, 5 total`, `Tests: 28 passed, 28 total`. The five suites
  are the installed release's guards. `framework-integrity` is not among them; see
  *What the plan got wrong*.
- **Task 5.** Self-check of `65f3d33`, exit 1: clean baseline
  `● framework integrity › references no file that does not exist`. The evidence
  line named the finding in backticks, and the sample project the self-check builds
  does not contain that file. `0954b59` takes the backticks off. Self-check of
  `0954b59`, exit 0.
- **Task 6.** Fresh Claude Code session, print mode, in this worktree. Tool:
  Claude Code 2.1.300 (`claude` 2.1.300). Machine: Darwin 25.2.0 arm64, macOS 26.2.
  Permission mode `plan`, Bash/Edit/Write disallowed, so it could read the
  repository and could not run `gh` or write a file. The prompt, gist and pass are
  in `4fd0f03`. **Pass.** It named `/absorb-flush` and
  `.claude/commands/absorb-flush.md`; one pull request per group, merged by rebase;
  one commit per contribution with the contributor as author and an `Absorbed from`
  line; push only after a yes and merge only after a second yes; each of #101–#106
  closed only after its commit has landed, with the landed comment or the decline
  reason; the pull request that edits two files stays whole with one group (the
  prompt does not say which number that is); a plan for one catalog entry still
  squash-merged. After that pass, `cb2775d` and `5426055` add the whole-file check
  below. The pass points are unchanged, so the probe was not re-run.
- **Task 7.** On `5426055`, before this report: self-check exit 0, and
  `npm --prefix .tropis test` exit 0 (`Test Suites: 5 passed, 5 total`,
  `Tests: 28 passed, 28 total`). The command's whole-file sentence landed in
  `cb2775d` and was wrapped in `5426055`, after the probe. The probe's pass
  points do not depend on that sentence.

The entry's nine criteria:

1. Listing, groups, spans, overlaps, arrivals — `parseHunks`, `overlappingPairs`,
   `homeFile`, `proposeGroups`, `arrivedSince`, and `lists groups, spans nothing
   here, flags the shared lines, and reports a later arrival`.
2. Recommendations, judgment calls, code read — Task 6, and sections 2 and 3 of
   `.claude/commands/absorb-flush.md`.
3. One commit per contribution with author, date, message and note —
   `applies one commit per contribution, stops on a conflict and on two commits,
   and maps what landed`.
4. Order, conflicts in the later commit, verbatim catalog append — `catalogTail ›
   returns the bytes after an exact prefix, and null when the head edits or
   matches`, and the same apply test.
5. Rewrap only touched items; protected kinds unchanged — the `rewrapTouched`
   tests (front matter, fence, table, arrow line, heading, HTML comment, numbered
   steps, bold-only line, untouched paragraph, 150-character item, already wrapped).
6. Full diff and both checks on the head; no push in the asking step — Task 6 and
   section 5 of the command.
7. Rebase merge after a yes; never push to main — Task 6 and section 7 of the
   command.
8. Close after landing with the commit; declined with a reason; branches listed —
   `landedFrom › reads the absorbed commits in log order and skips the rest`, the
   apply test's landed rows, Task 6, and section 8 of the command.
9. Workflow and decision record name the exception — the paragraph after the
   squash sentence in `framework/workflow.md`, FW-018, and Task 6.

### Scope

`git diff --stat origin/main...HEAD` at `5426055`, before this report:

```
 .claude/commands/absorb-flush.md | 153 ++++++++++
 .github/scripts/absorb-flush.mjs | 630 +++++++++++++++++++++++++++++++++++++++
 RELEASES.md                      |   7 +
 framework/DECISIONS.md           |  26 ++
 framework/workflow.md            |   7 +
 guards/absorb-flush.test.js      | 582 ++++++++++++++++++++++++++++++++++++
 6 files changed, 1405 insertions(+)
```

Every path is in the File Structure table. This commit adds this plan file, the
handover row. `feature-catalog.yaml` is not in the diff.

### Judgment calls

- The fresh-agent session was denied Bash, Edit and Write. The prompt already
  forbids GitHub and file changes; the flags are what made that hold.
- After this branch was cut, `main` gained `b79fe2d`, which adds one sentence
  to this plan's decide step: check a claim against the whole file the
  contribution lands in, not only the nearest evidence. The command carries
  that sentence (`cb2775d`, wrapped in `5426055`). The finding's anecdote
  stays in the plan on `main`.
- The probe record is an empty commit, `4fd0f03`, because the check changed no file.
- Self-checks used a private temp directory after a shared one failed the
  take-version scratch-folder test on a commit whose own guards had passed.
- The command's `description:` stays one line, longer than 88 columns, because the
  plan requires that sentence on one line. The close comment is split with a
  backslash inside double quotes so the shell joins it and keeps the space.

### What the plan got wrong

- Decision 12's evidence path, written in backticks, fails `framework-integrity`
  on the self-check's sample project. That sample copies `framework/*.md` and does
  not contain this repository's spec. `0954b59` keeps the path and drops the
  backticks. The heading is 89 characters, as the plan wrote it.
- `npm --prefix .tropis test` does not run `framework-integrity`. The installed
  suite is five guards under `.tropis/guards`. The source guard runs in the
  self-check, against a sample that copies `commands/*.md` and not
  `.claude/commands/absorb-flush.md`. Neither required command scans the new
  command's backtick paths. The concrete paths in that file exist:
  `.github/scripts/absorb-flush.mjs`, `scripts/check-blueprint.sh`, and
  `.claude/commands/refresh-board.md`. Placeholders with `<` or `>` are skipped
  by the guard.

### Outstanding

The command has not run on a real flush. Its first use is the next flush the
framework receives, and the reviewer records that run's outcome against this
entry. The catalog entry stays `building`; this plan does not edit
`feature-catalog.yaml`.

## Review record

Reviewed by the specifying session on 2026-10-19, in Claude Code (desktop app), Opus 5.5,
on the developer's Mac (Darwin 25.2.0, arm64).

### Checks re-run

- `bash scripts/check-blueprint.sh` on the executor's head `4fd87c9`: `Every guard caught
  its defect and passed the clean baseline.`, exit 0.
- After the review fixes, on `20465d7`: the self-check printed the same line, and
  `npm --prefix .tropis test` gave `Test Suites: 5 passed`, `Tests: 28 passed, 28 total`.
- `guards/absorb-flush.test.js` alone, staged with the self-check's tools: 30 of 30 pass
  with the fixes. With the executor's script restored, 2 fail: the indented-fence test
  and the global-identity test. So both new tests can fail.
- `list plan/` against this repository's real open pull requests (#97, #98, #99):
  fetched all three, grouped each by the file it changes most, and flagged all three
  pairs for `RELEASES.md`, where each appends at the same place. That is correct. The
  `refs/absorb/*` refs and the listing record were deleted afterwards.
- The handover's diagnosis that `framework-integrity` does not scan
  `.claude/commands/absorb-flush.md` was checked: the installed suite is five guards, and
  the self-check's sample copies only `commands/*.md`. It is true. The command's
  concrete backticked paths all exist.

### Found

Four defects, all fixed on the branch by the reviewer in `20465d7`. Each is mechanical,
and none changes what the feature means:

1. **The script hid the maintainer's git config.** Every git call set
   `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL=/dev/null`. On this machine, the
   credential helper for the private origin lives in the system config
   (`/opt/homebrew/etc/gitconfig`, `osxkeychain`), and `user.name` in `~/.gitconfig`.
   So `list` and `apply` would have failed on their first fetch or commit on a real
   flush. The tests passed because each temporary repository set its own identity.
   The isolation now lives in the test's runner, and a new test proves a global
   identity is used.
2. **An indented code fence was not protected from the rewrap.** The opener was matched
   only at the start of a line, and this repository's commands indent their fences
   inside numbered steps (`commands/scope.md`, `commands/refresh-board.md`). This is
   the group 6 failure the finding records. Fixed, with a test.
3. **The command's front matter was invalid YAML.** `description:` held an unquoted
   `: `, the trap `CLAUDE.md` names. Quoted.
4. **Two gaps in the command.** Step 5's checks need `npm --prefix .tropis ci` in the
   new worktree, and step 8 needs the sha of `origin/main` from before the merge, which
   no step recorded. Both are added.

**Renumbered at merge.** `6f7a7fe` landed on main as FW-018 (a project's model picks)
while this branch waited, so this branch's record is FW-019, as Decision 12's "next free
number" allows. Mentions of FW-018 above, in Decision 12 and the handover, mean FW-019.

The plan was wrong on one point the handover names: Decision 12's backticked evidence
path fails `framework-integrity` in the self-check's sample. The executor's fix,
dropping the backticks, is right.

### Outstanding disposition

- **The command has not run on a real flush.** That is not a reason to hold the entry
  back. The mechanics are covered by tests and by a real `list` run, and the agent
  behaviour by the fresh-agent check (`4fd0f03`). The first real flush the framework
  receives is the observation still owed. Whoever runs it records the outcome against
  this entry. Nothing else is outstanding.

### Learnings routed

- **A script must not isolate itself from the user's config to make its tests
  deterministic. The tests isolate the script.** This is true of any harness script
  that runs git, so it belongs in `rules/harness-scripts.md`. It is not written in
  this branch, because it is a rule change and needs its own fresh-agent check. It is
  raised as the backlog entry `scripts-never-hide-the-users-git-config`, in the
  commit that ships this plan.
- The fence defect is covered by this plan's test. Nothing more general came of it.

### Merged because

Every criterion is backed by a test, the fresh-agent check or both. Both checks are
green on the head after the four review fixes, and the one real run behaved correctly.
