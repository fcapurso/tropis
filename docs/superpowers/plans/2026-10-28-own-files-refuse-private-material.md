# This repository refuses private material in its own files — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** a guard in the self-check fails on any file committed in this repository that
carries a home path, a computer's hostname, an Atlassian site, a session id, an email
address outside an allowlist, or a word whose hash is on a list of private names — and
names the file and line. The list holds only SHA-256 hashes, so publishing it publishes
no name. `AGENTS.md` says the repository is public and what the guard cannot catch.

**Spec:** the entry `own-files-refuse-private-material` in `feature-catalog.yaml`, its
four criteria and the comment above it, and
docs/superpowers/specs/2026-10-27-tropis-goes-public-design.md (*Why*, *How the checks
fit*). *Decisions* below settles what the entry leaves open. Do not reopen them.

**Read first:** the review records of the plans from the same week that touched the
self-check — docs/superpowers/plans/2026-10-27-export-ignore-lines-match-only-at-the-root.md
and docs/superpowers/plans/2026-10-27-release-job-checks-the-commit-it-tags.md. What they
teach for this plan: the self-check reads committed content only, its export has no
`.git`, and a guard must be seen to fail on a planted defect.

**What the specifying session verified on 2026-10-28, against `main` at `7507bf7`, with
git 2.49.0 and Node v22.15.0, in Claude Code desktop (Opus 5.5) on macOS 26.2, arm64:**

- `scripts/check-blueprint.sh` builds `$STAGE` with `git archive HEAD`. `.gitattributes`
  marks `/.claude/`, `/.cursor/`, `/.tropis/`, `/CLAUDE.md`, `/AGENTS.md`,
  `/feature-catalog.yaml`, `/docs/superpowers/`, `/docs/backlog-board/`,
  `/docs/verification-log.md` and two more `export-ignore`, so **`$STAGE` holds none of
  them** — and those are where nearly all the material removed by pull request 132 sat
  (its diff: 236 mentions of the first adopter's real name, about 60 of the developer's
  hostname, home paths under `/Users/`, a customer's `*.atlassian.net` site).
- After the conformance run, `check-blueprint.sh` runs the guards listed in
  `FRAMEWORK_GUARDS="operator-page-closeout readme-usable"` with `FRAMEWORK_ROOT` set and
  `TROPIS_EXPECT_FRAMEWORK=1`, then `plant <guard> <file> [line to delete]` copies the
  stage, deletes a line or a file, and expects the guard to fail. `plant` cannot add a
  line. A guard that calls `isBlueprintTree` and is missing from `FRAMEWORK_GUARDS` is
  reported `UNLISTED`. `guards/readme-usable.test.js` shows the `isBlueprintTree` pattern
  (`bootstrap.md`, `PORTABILITY-NOTES.md`, `commands/`, `README.md` all present).
- `.tropis/installed.json` has the keys `version`, `source` and `files`; `files` maps each
  path the installed release wrote (64 of them, all under `.claude/` or `.tropis/`, plus
  entry files) to a hash. `.claude/commands/absorb-flush.md` is **not** in it: it is this
  repository's own command and has no source under `commands/`.
- Today, outside `.tropis/` and the paths in `installed.json`, the tree has these hits for
  the patterns in *Decision 2* (searched with `git grep -nIE`/`-oE`; each regex below was
  also seen to hit a planted line):
  - home paths: `/home/user/…` in three plans dated 2026-10-27 (cloud sessions' working
    folders), and `/Users/someone/framework` in `guards/submit-upstream.test.js`;
  - email addresses: `git@github.com` (`scripts/submit-upstream.sh`, two guards, one
    plan), `secret@github.com` (inside a URL in `guards/installed-files.test.js`),
    `cursoragent@cursor.com` (four plans), `hello@moxy.studio` (one plan, quoting a
    library's licence header), and addresses at `example.com`;
  - one hashed name: `.claude/commands/absorb-flush.md`, line 21, gives an example
    branch prefix built from the first adopter's real folder name. Every other mention
    of that name is under paths `installed.json` lists (`.claude/framework/DECISIONS.md`),
    which the next release, v0.4.3, replaces with the cleaned source.
  - `dev-laptop.local`, about 50 times in plans, two specs and the catalog: the neutral
    name pull request 132 wrote in place of the developer's hostname.
  - No `*.atlassian.net` site, no session UUID, no `*-MacBook*` hostname and no other
    `<name>.local` hostname outside those paths. Prose such as "the developer's MacBook
    Pro" occurs in several plans and is not a hostname; the hostname rule must not match
    it.
- The two hashes in *Decision 3* were computed with `printf '%s' <word> | shasum -a 256`.

**Model tier: Medium.** The patterns, allowlists and hashes are given; the guard and its
wiring into the self-check need building and seeing fail.

**Requires:** nothing beyond the repository.

**Merge authority: parent review.** This is the gate before the repository is published,
and the review must re-plant each pattern.

Do not store a kick-off prompt on this plan.

---

## Delivers

own-files-refuse-private-material

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-private-material -b plan/own-files-refuse-private-material` |

## Global Constraints

- **Do not edit `.tropis/`, `.cursor/`, or any file listed in `.tropis/installed.json`.**
  They change only by taking a release. `.claude/commands/absorb-flush.md` is not
  listed and is edited in Task 3.
- **Never write a private name in plain text** — not in code, tests, commit messages,
  the pull request, or the handover. The words behind the hashes are not given to you
  and must not be guessed at in writing. Refer to "the hashed names".
- **Add no dependency.** Use `node:` modules (`node:crypto` for SHA-256).
- **Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Open a pull request; do not merge.

## Decisions

Taken by the specifying session on 2026-10-28.

### 1. What is scanned

Every file committed at `HEAD`, export-ignored paths included, **except** `.tropis/`
and every path that is a key of `files` in `.tropis/installed.json`. Those are the
installed release, written by a take from a release of the source this guard already
scans; spec step 2 sweeps them after v0.4.3 is taken. Binary files (a NUL byte in the
first 8000 bytes) are skipped.

`check-blueprint.sh` builds that copy with a temporary index, so nothing in the
checkout's own index or working tree changes:

```bash
FULL="$(mktemp -d "${TMPDIR:-/tmp}/blueprint-full-XXXXXX")"
GIT_INDEX_FILE="$FULL.index" git -C "$BP" read-tree HEAD
GIT_INDEX_FILE="$FULL.index" git -C "$BP" checkout-index -a --prefix="$FULL/"
rm -f "$FULL.index"
```

and removes `$FULL` in its `cleanup`. The guard runs with `FRAMEWORK_ROOT="$FULL"`.

### 2. The patterns and allowlists

Each match is reported as `<path>:<line>: <kind>: <the matched text>`, one per line, and
the test fails listing them all. Kinds and regular expressions (JavaScript, applied per
line):

| Kind | Pattern | Allowed |
|---|---|---|
| home path | `/(?:Users\|home)/([A-Za-z0-9._-]+)` | captured name is `user`, `someone`, `runner`, or starts with `<` |
| hostname | `\b[A-Za-z0-9][A-Za-z0-9-]*-MacBook[A-Za-z0-9-]*` (case-insensitive; a letter or digit must come right before the hyphen's run, so the catalog's own wording `*-MacBook*` does not match), and `\b[A-Za-z0-9-]+\.local\b(?![.\w-])` | `dev-laptop.local`, the neutral name pull request 132 wrote in place of the developer's hostname |
| Atlassian site | `\b([a-z0-9-]+)\.atlassian\.net\b` (case-insensitive) | captured name is `example` or `your-site` |
| session id | `\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b` (case-insensitive), and `\bsession_[A-Za-z0-9]{16,}\b` | nothing |
| email | `[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})` | domain is `example.com`, `example.org`, `example.net`, `example.test` or ends in `.example`; local part is `noreply` or the domain is `users.noreply.github.com`; or the whole address is one of `git@github.com`, `secret@github.com`, `cursoragent@cursor.com`, `hello@moxy.studio` |
| hashed name | each lower-cased run of `[a-z0-9]+` whose SHA-256 hex is in the list | nothing |

The exact-address list holds public identities of tools and libraries, and the SSH
remote form. **If the sweep in Task 1 finds any other address, or any hit of another
kind outside *Verified* above, stop before Task 2 and put it in the handover's
*Outstanding*: a person's address is removed, not allowlisted, and that is the
developer's call.**

`settings.local.json` must not match the `.local` rule (it is followed by `.json`);
Task 2 has a test for it.

### 3. The hashed names

Kept as a constant array in the guard itself, with a comment saying how to add one
(`printf '%s' <word> | shasum -a 256`, lower-cased, letters and digits only) and that a
name nobody has hashed passes:

```
9c3bb2dc2d5961ecd4a1e8112b15da950ca6bb225dc10c34504bce040fe1311c
0eb2b6cff49729f68d65231514874eb08810e19ae5c5e595ec2ea34c5976c969
```

The first is the first adopter's real name, the second the customer whose site the
cleanup removed.

### 4. Where it lives

`guards/private-material.test.js`, a framework-repository guard: it calls
`isBlueprintTree` (copy the function from `guards/readme-usable.test.js`), skips
outside the blueprint tree, and is added to `FRAMEWORK_GUARDS`. Setup does not copy it
into projects (it copies a fixed list of guards; leave that list alone).

### 5. Planting

`check-blueprint.sh` gains a way to plant an **added** line into a copy of `$FULL` and
expect `private-material` to fail. Plant at least one line per kind, in a file under an
export-ignored path (`docs/superpowers/specs/`) so the plant proves the guard sees what
the export hides. The planted text is assembled in the script so that the script's own
committed text does not match (for example `"/Us""ers/alice/"`); see *Traps*.

### 6. The AGENTS.md lines

Under `## Gotchas`, add:

```markdown
- **This repository is public.** Evidence from another project names it by pseudonym
  (the first adopter is `first-adopter`) and never quotes its internals. A measurement
  names the tool, version, operating system and architecture, never the computer.
  `guards/private-material.test.js` refuses home paths, hostnames, Atlassian sites,
  session ids, unlisted email addresses and hashed names in every committed file
  outside the installed release, but **a name nobody has hashed yet passes**: read
  your own diff for names before pushing.
```

## Traps

- **The self-check reads committed content only.** Commit, then run it.
- **The guard's own source, this repository's tests and `check-blueprint.sh` must not
  match their own patterns.** Write regular expressions so the source text is not a
  match (the tables above are not matches as written: check), and build every
  test fixture at run time, e.g. `['', 'Users', 'alice', ''].join('/')`. The plan file
  itself is scanned too: it contains no match (Task 1 shows it).
- **Do not "fix" the hits listed in *Verified* by editing them away,** except
  `.claude/commands/absorb-flush.md` (Task 3). They are allowed by *Decision 2*.
- **A guard must not run git against the tree under test.** `$FULL` has no `.git`.

## File Structure

| File | Change |
|---|---|
| `guards/private-material.test.js` | new — *Decisions* 1–4 |
| `scripts/check-blueprint.sh` | *Decision 1* full copy, `FRAMEWORK_GUARDS`, *Decision 5* plants |
| `.claude/commands/absorb-flush.md` | line 21's example prefix becomes `upstream/first-adopter/2026-10-19-` |
| `AGENTS.md` | *Decision 6* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` filled, a comment naming this handover |
| `docs/superpowers/plans/2026-10-28-own-files-refuse-private-material.md` | the handover report |

## Review Focus

1. Planting each kind, in an export-ignored file, turns the self-check red with that
   file and line named.
2. A plant in a path listed in `installed.json` or under `.tropis/` does not.
3. The hash list contains no plain-text name, and the guard source contains no match.
4. `settings.local.json`, `/home/user/` and `git@github.com` do not match.

## Tasks

### Task 0 — Setup in the worktree

Run `npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`git fetch --tags origin` and `bash scripts/check-blueprint.sh` (expected: its last line
starts `Self-check passed`).

To run one guard alone: put a temporary `{"type":"module"}` `package.json` and a
`node_modules` link to `.tropis/node_modules` at the worktree root, build `$FULL` by
hand as in *Decision 1*, and run
`FRAMEWORK_ROOT=$FULL TROPIS_EXPECT_FRAMEWORK=1 node --experimental-vm-modules .tropis/node_modules/.bin/jest guards/private-material.test.js`.
Remove the two temporary files before every commit.

### Task 1 — Sweep

Write the guard's scan as a function first and run it over a full copy of `HEAD`.
Paste its output. Expected: exactly one hit, the hashed name in
`.claude/commands/absorb-flush.md`. Anything else → *Decision 2*'s stop rule.

### Task 2 — Tests, then the guard

In `guards/private-material.test.js`: one test per kind that feeds a line built at run
time to the scanner and expects it reported, and one per allowlist entry expecting
silence (including `settings.local.json` and prose "MacBook Pro"); a test that the hash
list entries are 64 hex characters and that none of them is the SHA-256 of a word in
the guard's own source; then the test over `root` that fails listing every hit. Run it
against `HEAD` and record that it fails on `absorb-flush.md` only. Commit.

### Task 3 — Clear the one hit

Edit `.claude/commands/absorb-flush.md` as in *File Structure*. Commit. The guard over a
fresh full copy now passes.

### Task 4 — Self-check wiring

Apply *Decisions* 1, 4 and 5 to `scripts/check-blueprint.sh`. Commit, run
`bash scripts/check-blueprint.sh`, paste the `Framework repository` block and the last
line: each plant reads `caught`, last line `Self-check passed`. Then, in a throwaway
commit each, (a) add a home path to a file under `docs/superpowers/`, (b) add the same
line to `.claude/framework/workflow.md` (installed: expect it **not** caught by the
guard over `HEAD`), (c) empty the hash list. Record the outcome of each and drop the
commit.

### Task 5 — AGENTS.md and the catalog

Apply *Decision 6*. In `feature-catalog.yaml`, set the entry to `shipped`, `modules` to
`guards/private-material.test.js` and `scripts/check-blueprint.sh`, and map:

| Criterion | Backed by |
|---|---|
| 1 fails on each pattern, naming file and line | the per-kind tests and the plants |
| 2 fails on a hashed name with no plain-text list | the hashed-name test and the hash-list test |
| 3 passes on the repository after pull request 132 | the guard over `HEAD` in the self-check |
| 4 AGENTS.md says the four things | the text — name it as the parent reviewer's check in the handover |

Add a comment above the entry naming this plan's handover. Commit, then run
`npm --prefix .tropis test` and `bash scripts/check-blueprint.sh` again and record both.

No fresh-agent check: no file under `framework/` or `rules/`, and no command under
`commands/`, changes. `.claude/commands/absorb-flush.md` changes only an example.

### Task 6 — Handover report

Append `## Handover report` to this plan with the six sections the planning rule names,
recording each measurement with its tool, version, operating system and architecture.
Commit, push the branch, open a pull request against `main`. Do not merge.

## Not in this plan

- The judgment check for every public project:
  `public-project-is-checked-for-private-material`.
- Cleaning `.claude/framework/DECISIONS.md` and the other installed copies: the v0.4.3
  take (spec, *Order* step 2).

## Handover report

Measured with Claude Code (Sonnet 5.5), git 2.x and Node 22 on Linux 6.18, x86-64 cloud container; Jest from `.tropis/node_modules`.

### Task completion

- Task 0: worktree `/home/user/tropis-private-material` made by `isolate-for-plan.sh`; `npm --prefix .tropis ci` ran there.
- Task 1: sweep over a full copy of HEAD (temporary index, as in Decision 1). The guard's scan reported exactly one hit besides the new guard's own fixture: `.claude/commands/absorb-flush.md:21: hashed name`. The one extra, a literal session UUID in the guard's own fixture, was rebuilt at run time before the first commit. No other kind of hit, no other address: the stop rule did not fire.
- Task 2: `guards/private-material.test.js`; committed while red on `absorb-flush.md` only (28 passed, 1 failed).
- Task 3: line 21 now reads `upstream/first-adopter/2026-10-19-`.
- Task 4: wiring in `scripts/check-blueprint.sh` (full copy, `FRAMEWORK_GUARDS`, `plant_add`). Throwaway checks below.
- Task 5: AGENTS.md line, catalog entry `shipped` with `modules` and a comment.
- Task 6: this report; branch pushed, pull request opened, not merged.

Criteria map for the catalog entry: 1 per-kind scanner tests and the seven plants; 2 the hashed-name test (invented word, hash built at run time) and the hash-list tests; 3 the guard over the full copy of HEAD in the self-check; 4 the AGENTS.md text, for the parent reviewer to read.

### Verification results

Self-check, `Framework repository` block (run on the commit that added the wiring):

```
  caught      operator-page-closeout: framework/workflow.md planted
  caught      operator-page-closeout: PORTABILITY-NOTES.md planted
  caught      readme-usable: README.md planted
  caught      readme-usable: PORTABILITY-NOTES.md planted
  passed      private-material on the full copy of HEAD
  caught      private-material: home path planted in docs/superpowers/specs/planted-private-material.md:2
  caught      private-material: hostname planted in ... :2   (twice: MacBook form, .local form)
  caught      private-material: Atlassian site planted in ... :2
  caught      private-material: session id planted in ... :2  (twice: UUID, session_ form)
  caught      private-material: email planted in ... :2
Self-check passed: every guard caught its defect, ...
```

Throwaway checks (done on full copies of HEAD run through the guard directly, not as commits; the guard reads a copy, so the result is the same):

- (a) a home path appended to `docs/superpowers/specs/2026-10-27-tropis-goes-public-design.md`: failed, named `...design.md:119: home path`.
- (b) the same line appended to `.claude/framework/workflow.md` (installed): 29 of 29 passed, not caught, as intended.
- (c) the hash list emptied in the guard source: failed `is not empty and holds 64 hex characters per entry`.

`npm --prefix .tropis test`: 5 suites, 31 tests passed.

### Scope

Files: `guards/private-material.test.js` (new), `scripts/check-blueprint.sh`, `.claude/commands/absorb-flush.md`, `AGENTS.md`, `feature-catalog.yaml`, this plan. All are in the File Structure table. Worktree: `/home/user/tropis-private-material` (checkout `tropis`).

### Judgment calls

- The hashed-name kind has no plant in `check-blueprint.sh`: planting needs a plain word whose hash is on the list, and I was not given the words. It is covered by the unit test with an invented word, and by the clean-baseline pass failing on `absorb-flush.md` before Task 3.
- Hashed-name hits print asterisks of the word's length, not the word, so a failing run does not republish a name.
- The scan also skips `.git` and `node_modules` directories, so the guard can run on a working tree.
- `plant_add` checks that the failing output names `<file>:2: <kind>`, not only that the guard fails.
- `cleanup` also removes `$FULL.index` if the script dies between `read-tree` and its removal.

### What the plan got wrong

- Task 4 says to plant in "throwaway commits"; the guard reads a copy, so planting in copies is equivalent and far faster (the full self-check takes about 8 minutes).
- Nothing else: the Verified list matched what the sweep found.

### Outstanding

- Hashed names are unplanted in the self-check (see Judgment calls).
- Criterion 4 (the AGENTS.md text) is for the parent reviewer to read.
- Spec step 2 (sweeping the installed copies after v0.4.3) is not in this plan.

## Review record

Reviewed 2026-10-27 (UTC) by a reviewing session dispatched by the specifying session:
Claude Code (Opus 5.5), git 2.43.0, Node v22.22.0, Linux 6.18, x86-64 cloud container. In
a sibling worktree of the branch, rebased on `origin/main` at `19f1f3c` (already up to
date).

### Checks re-run

- Scope: `git diff --stat origin/main...HEAD` lists `.claude/commands/absorb-flush.md`,
  `AGENTS.md`, this plan, `feature-catalog.yaml`, `guards/private-material.test.js` and
  `scripts/check-blueprint.sh`: six files, all in the File Structure table.
- `bash scripts/check-blueprint.sh`: exit 0, last line `Self-check passed`. Its
  `Framework repository` block reads `passed private-material on the full copy of HEAD`
  and seven `caught` lines for private-material (home path, hostname twice, Atlassian
  site, session id twice, email), each naming
  `docs/superpowers/specs/planted-private-material.md:2`.
- `npm --prefix .tropis test`: 5 suites, 31 tests passed. The catalog guard passes; the
  date concern raised on a sibling plan does not apply here, since this entry gains no
  date.
- The guard alone over a full copy of `HEAD` built as in *Decision 1*: 29 of 29 passed.
- Re-planted by the reviewer, each a line appended to the public-arc spec under
  `docs/superpowers/specs/` in a full copy, with names and addresses different from the
  executor's: a home path under each of the two roots, a MacBook-form hostname, a
  `.local` hostname, an Atlassian site, a UUID, a `session_` id, an email at an unlisted
  domain, and a home path with an upper-case dotted name. Each went red naming
  `...design.md:119` and its kind.
- Hashed name, which the self-check cannot plant: line 21 of
  `.claude/commands/absorb-flush.md` as it stands on `origin/main` (the hit Task 3
  removed), appended to the same spec, went red as `hashed name` printed as asterisks;
  and that whole file from `origin/main` restored in place went red on `:21`. The word
  was never written by the reviewer.
- Review Focus 2: the same home-path line appended to `.claude/framework/workflow.md`
  (in `installed.json`) and to `.tropis/README.md` stayed green. In one throwaway
  *commit* carrying a home path in both the spec and `.claude/framework/workflow.md`, a
  full copy built from that commit by `read-tree`/`checkout-index` failed on the spec
  line only. The commit was dropped.
- Review Focus 4: a line holding the cloud working folder under `user`, a
  `settings.local.json` path, the SSH remote address and `dev-laptop.local` stayed green.
- Emptying `HASHED_NAMES` turns `is not empty and holds 64 hex characters per entry`
  red; a tree that is not the blueprint, with `TROPIS_EXPECT_FRAMEWORK=1`, turns
  `skips outside the blueprint tree` red.
- Review Focus 3: the hash list is two 64-hex strings; `git grep` finds no unallowed
  home path in the guard or the script, and the guard over `HEAD` scans its own source
  and passes. AGENTS.md (criterion 4) read: under Gotchas, it says the repository is
  public, that evidence from another project uses a pseudonym and never quotes its
  internals, and that a name nobody has hashed passes. The text is *Decision 6* verbatim.
- CI on pull request 136: `framework / checks`, `unit`, `gate` and `plan` succeeded.

### Found

- The handover's diagnoses hold. Planting in copies instead of throwaway commits is
  equivalent for the plants, because the guard reads a copy; the one thing a commit adds,
  the `read-tree` path, is exercised by the self-check's own run over `HEAD` and by the
  reviewer's throwaway commit above. The hashed-name kind cannot be planted without
  writing a name, as the handover says.
- The handover's measurement line gives git and Node as `2.x` and `22`, not exact
  versions. Minor; not corrected, as the handover is the executor's record.
- The catalog comment names the handover rather than carrying the criteria map inline as
  older shipped entries do. The handover holds the map, so nothing is missing.

### Outstanding disposition

- Hashed names unplanted in the self-check: dropped, by design. A plant needs a hashed
  word in the script's text, which is what the list exists to avoid. The unit test with
  an invented word and the reviewer's plant from `origin/main` above cover it.
- Criterion 4: read by the reviewer, above. Met.
- Sweeping the installed copies after v0.4.3 is taken: spec step 2, carried by
  `tropis-is-public`, which this entry unblocks.
- No developer check by hand: the change has no screen.

### Learnings routed

None generalises beyond this plan. The guard's limit (a name nobody has hashed passes)
is already in AGENTS.md, and the judgment layer for every project is its own entry,
`public-project-is-checked-for-private-material`.

### Merged because

Every kind of private material the entry names, planted in an export-ignored file, turns
the self-check or the guard red naming file and line, the installed release is exempt as
decided, and the repository as it stands passes.
