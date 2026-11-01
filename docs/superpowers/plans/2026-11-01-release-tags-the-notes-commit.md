# The release tags the commit that carries its notes — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** this repository's release job takes the commit to tag as an input, next to the
version, and tags that commit — refusing when it is not on `main` or its notes do not
name the version — so work merged after the notes commit is in no tag until the next
release. `/release` prints the trigger with that commit filled in.

**Spec:** the entry `release-tags-the-notes-commit` in `feature-catalog.yaml` (band B in
`docs/backlog-board/bands.yaml`). There is no design document; the entry's acceptance
criteria and the decisions below are the design. The neighbouring entry
`release-tags-what-main-holds` is about *projects'* release pipelines and their candidate
step; this plan does not touch the shipped `/release` text or the pipeline scripts, so it
neither builds nor contradicts it.

**What the specifying session verified on 2026-11-01, against `main` at `55be12e`:**

- **The job.** `.github/workflows/ci.yml` has one job, `release`, started by
  `workflow_dispatch` with one required input, `version`. Its steps: a refusal unless
  `github.ref` is `refs/heads/main`; `actions/checkout@v7` with `fetch-depth: 0`;
  `actions/setup-node@v7`; a step with `id: notes` running
  `node .github/scripts/release.mjs check RELEASES.md "$VERSION"` and refusing a version
  already tagged; `bash scripts/check-blueprint.sh`; and a step that runs
  `git tag -a "v$VERSION" -m "Release v$VERSION"` and `git push origin "v$VERSION"`. So it
  tags whatever `HEAD` the checkout gave it — `main`'s head when the job started — and the
  header comment says the trigger is `gh workflow run ci.yml --ref main -f version=<X.Y.Z>`.
- **The check.** `checkReleased(text, version)` in `.github/scripts/release.mjs` throws
  unless the Unreleased section is empty and the newest section below it is `version`;
  its messages say which (`The newest version in the notes is 0.2.0, not 0.3.0.`). The
  `check` command prints the message and exits 1. Nothing in it needs changing.
- **The tests.** `guards/release.test.js`, `describe('the release job')`, reads `ci.yml`,
  takes the steps after `setup-node` (`after`), and finds the notes step by `id: notes`,
  the self-check step by its `run` being exactly `bash scripts/check-blueprint.sh`, and
  the tag step by `git tag` in its `run`. Its first test asserts the inputs are exactly
  `['version']`, that no step commits, that the only push line is
  `git push origin "v$VERSION"`, and the order notes < self-check < tag. Its `release()`
  helper builds a scratch world (a bare `origin.git` and a `work` clone on `main` with
  promoted notes and a stub self-check that records the commit it saw), asserts no step's
  `env` has a key other than `VERSION`, runs each `run` step with `bash -e -c` and
  `env: { ...process.env, VERSION }`, and returns where it stopped and what origin holds.
  Four cases: a good release, a failing self-check, a version the notes do not name, and a
  version already tagged.
- **The trigger `/release` prints.** It is not in the source `commands/release.md`: there
  the project-owned block is an unfilled template, and Stage 6 says, for a project with no
  candidate, "Print the release trigger named above with the confirmed bump". This
  repository's fill-in is the project-owned block of the installed
  `.claude/commands/release.md`, lines 14–31, whose *Trigger* line reads
  `gh workflow run ci.yml --ref main -f version=<version>`, once the notes are on main.
  An update carries a project-owned block's fill-in over (`scripts/check-version.mjs`,
  tested in `guards/check-version.test.js`), and `main-is-gated-by-the-host` (commit
  `2c4e91e`) edited this same block directly. The permissions in `.claude/settings.json`
  deny edits under `.claude/rules/` and `.claude/framework/`, not `.claude/commands/`.
  Its Stage 5 says that where `main` is gated "the commit Stage 6 names is then the one
  the merge made on `main`".
- **Other mentions.** `git grep -nF "version=<"` outside `docs/superpowers` finds only
  `.claude/commands/release.md:29` and `.github/workflows/ci.yml:7`. FW-037 in
  `framework/DECISIONS.md` says "This repository's release tags a commit the main branch
  already holds and pushes only the tag", which stays true. The operator guide
  (`.tropis/README.md`) and `AGENTS.md` name no release trigger.
- **The developer's user-level instructions** on the specifying session's machine say
  nothing about release triggers or commit hashes, so a local fresh-agent probe is a real
  one.

**Model tier: Medium.** A workflow edit and its tests against stated behaviour, red checks to run, and one fresh-agent probe to set up and judge; the decisions are made.

**Merge authority: parent review.** The release job is irreversible when it runs and is never run to test it. Stop after the handover report (Task 5); do not write a review record and do not merge.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 3 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

release-tags-the-notes-commit

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-release-commit -b plan/release-tags-the-notes-commit origin/main` |

## Global Constraints

- **Never run the release.** Do not run `gh workflow run`, do not push a tag, do not
  push anything to any remote except this plan's branch. The job's steps run only in the
  test's scratch world, whose origin is a bare repository in a temporary folder.
- **Edit `.claude/commands/release.md` only between its `project-owned: begin` and
  `project-owned: end` lines.** Everything else under `.claude/`, `.tropis/`, `.cursor/`
  and `CLAUDE.md` is the installed release; do not edit it. Do not edit the source
  `commands/release.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the code yourself against this repository's own names**; say in the handover
  which named source, if any, you worked from.

## Decisions

### 1. The job takes and checks the commit (`.github/workflows/ci.yml`)

- A second `workflow_dispatch` input, after `version`:
  `commit`, `type: string`, `required: true`, description
  `The full hash of the commit on main that carries the promoted notes`.
- A new step directly after `actions/setup-node`, before the notes step, with
  `id: commit`, name `The commit is on main, and is checked out`, `env: COMMIT: ${{ inputs.commit }}`,
  and this `run`:

  ```bash
  if ! [[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
    echo "\"$COMMIT\" is not a full commit hash: give the 40-character hash /release printed."
    exit 1
  fi
  if ! git cat-file -e "$COMMIT^{commit}" 2> /dev/null; then
    echo "$COMMIT is not a commit in this repository."
    exit 1
  fi
  if ! git merge-base --is-ancestor "$COMMIT" HEAD; then
    echo "$COMMIT is not on main: give the commit /release's notes merge put on main."
    exit 1
  fi
  git checkout -q --detach "$COMMIT"
  ```

  The checkout of a `workflow_dispatch` run on `main` puts `HEAD` at `main`'s head when
  the run started, with full history, so "an ancestor of `HEAD`" is "on `main`". After
  the detach, the notes step reads that commit's `RELEASES.md`, and the self-check
  (which exports `HEAD`) checks that commit — the existing steps need no other change to
  check the commit they tag.
- A full hash only, decided: a short one can become ambiguous, and `/release` has the
  full one.
- The tag step gets `COMMIT: ${{ inputs.commit }}` in its `env` beside `VERSION`, and
  tags it by name: `git tag -a "v$VERSION" "$COMMIT" -m "Release v$VERSION"`. The push
  line stays exactly `git push origin "v$VERSION"`.
- The header comment says the job tags the commit it is given, checked to be on `main`,
  and that anything merged after it waits for the next release; the trigger line becomes
  `gh workflow run ci.yml --ref main -f version=<X.Y.Z> -f commit=<full hash>`.
- The notes step is unchanged: `checkReleased`'s message already says which version the
  notes name. No change to `.github/scripts/release.mjs` beyond, if needed, its first
  comment line (it mentions "the check the release job in ci.yml runs before it tags",
  which stays true — leave it if so).

### 2. The trigger `/release` prints (`.claude/commands/release.md`, project-owned block)

Replace the *Trigger* bullet of the block with:

```markdown
- Trigger: `gh workflow run ci.yml --ref main -f version=<version> -f commit=<commit>`,
  once the notes are on main. `<commit>` is the full hash of the commit that carries the
  promoted notes: where the notes went through a pull request, its merge commit,
  `gh pr view <N> --json mergeCommit -q .mergeCommit.oid`; otherwise the notes commit
  Stage 5 pushed. Never `origin/main`'s head, which may already hold later work. The job
  tags that commit, refusing one not on main or whose notes do not name the version, and
  pushes only the tag; anything merged after it waits for the next release.
```

Leave the rest of the block, and everything outside it, as it is.

### 3. The tests (`guards/release.test.js`, `describe('the release job')`)

- The first test: inputs are exactly `['version', 'commit']`, both `required: true`;
  find the commit step by `id: commit` and assert it comes before the notes step; the
  other assertions stay.
- `release()` takes a `commit` option chosen from the scratch world, defaulting to the
  notes commit, and runs every step with `COMMIT` in `env` beside `VERSION`; its
  env-key assertion allows exactly `VERSION` and `COMMIT`. It may grow options to add
  commits after the notes commit and on a side branch before running the steps. It
  returns, besides what it does now, the notes commit's hash and what origin's tag points
  at.
- Cases, each asserting where the run stopped, what the stub self-check saw, and what
  origin holds:
  1. **Tags the named commit, not main's head (criteria 2 and 3).** After the notes
     commit, a further commit lands on `main` and is pushed. Given the notes commit, the
     run completes; the self-check saw the notes commit; origin's `v0.2.0` points at the
     notes commit; origin's `main` is unchanged; and `git tag --contains <later commit>`
     on origin prints nothing.
  2. **Refuses a commit not on main**, at the commit step: a commit on a side branch
     that is not merged into `main`. The self-check did not run; origin has no tag.
  3. **Refuses a short or malformed hash**, at the commit step (e.g. the first 7
     characters of the notes commit).
  4. **Refuses a commit whose notes do not name the version**, at the notes step: the
     notes commit's parent, whose Unreleased section still holds notes (build the scratch
     world so the parent has unpromoted notes). The message names what is wrong.
  5. The existing four cases, given the notes commit, keep their assertions (the good
     case's `workHead` is now the notes commit, which is still `main`'s head there).
- Comment the describe block as it is commented now: what it backs (add
  `release-tags-the-notes-commit`) and how the scratch world works. No other comments.

## Traps

- **The release job is never run.** Its proof is the test running its steps against a
  bare scratch origin. `gh workflow run` appears in this plan and in the files only as
  text to print.
- **`bash scripts/check-blueprint.sh` reads committed content only.** Commit before you
  run it. For a red check, make the revert a throwaway commit, run the guard through the
  snippet in Task 0, and drop the commit (`git reset --hard HEAD~1` on your own branch
  only).
- **The commit hook speaks at every commit touching `.claude/commands/`**, asking for a
  fresh-agent outcome in the body. The commit that changes the block (Task 2) carries
  Task 3's result; make Task 3 run before that commit, or amend the body in it before
  pushing (not after pushing).
- **`guards/set-up-project.test.js` "records every shipped file at version unknown"** is
  known to pass only in the self-check's archive export and to fail from a checkout
  (raised on `set-up-project-installs-from-a-lockfile`). If it is the only failure in
  `npm --prefix .tropis test`, check it fails the same on `origin/main` and record that;
  do not fix it here.
- **A plan header field sits on one line** until a release after 0.7.1 is installed; this
  plan's do. Do not rewrap them.

## File Structure

| File | Change |
|---|---|
| `.github/workflows/ci.yml` | Decision 1 |
| `.github/scripts/release.mjs` | Decision 1, only if its first comment stops being true |
| `.claude/commands/release.md` | Decision 2, inside the project-owned block only |
| `guards/release.test.js` | Decision 3 |
| `feature-catalog.yaml` | Task 4: the entry to shipped |
| `docs/superpowers/plans/2026-11-01-release-tags-the-notes-commit.md` | Task 5: the handover report |

Doc closeout, decided by the specifying session: the job's header comment and the trigger
in the project-owned block are the documents this change owes. No `DECISIONS.md` entry:
FW-037 already says the release tags a commit `main` holds, and naming which commit is
the entry's own design, not a choice between alternatives. No release-note line: the
notes are for people who set up projects, and this repository's own release job changes
nothing for them. No rule: the constraint is enforced by the job and stated where
`/release` reads it. Nothing portable for the upstream queue: this repository is the
upstream, and projects' release flow is `release-tags-what-main-holds`.

## Tasks

### Task 0 — Setup in the worktree

Isolate (the Repositories table; run the command from the primary checkout of
`tropis`, the one whose `.git` is a directory, after `git fetch origin`). In the worktree
run `npm --prefix .tropis ci`, then `git status --porcelain` (passes when it prints
nothing), then `bash scripts/check-blueprint.sh` (passes when its last line starts
`Self-check passed`; any other last line, stop and hand back). Record `git --version`,
`node --version`, `uname -sm`, your tool and version, and the commit you started from.

To run one guard on committed content outside the self-check (used below):

```bash
S="$(mktemp -d)"; git archive HEAD | tar -x -C "$S"
echo '{"type":"module"}' > "$S/package.json"
cp "$S/templates/framework-jest.config.js" "$S/jest.config.js"
ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
(cd "$S" && node --experimental-vm-modules node_modules/.bin/jest guards/release.test.js); rm -rf "$S"
```

### Task 1 — The job and its tests (Decisions 1 and 3)

Write the tests first and run the snippet on a commit holding only the test change:
record the failures (the new cases and the inputs assertion must fail). Then change
`ci.yml`, commit, and run the snippet: passes when `guards/release.test.js` reports no
failed test.

**Red checks**, each as a throwaway commit, run through the snippet, then dropped; record
the failing test names:

- tag step back to `git tag -a "v$VERSION" -m …` with the commit step's
  `git checkout -q --detach "$COMMIT"` removed — case 1 must fail;
- the `merge-base --is-ancestor` refusal removed — case 2 must fail;
- the full-hash refusal removed — case 3 must fail.

### Task 2 — The trigger (Decision 2)

Edit the block. Check with
`git diff origin/main -- .claude/commands/release.md` that every changed line is between
the two markers. Run `npm --prefix .tropis test` (passes when Jest reports no failed suite,
apart from the Trap's known one). Do not commit yet: Task 3's result goes in this
commit's body.

### Task 3 — The fresh-agent check

The block changes what `/release` tells an agent to print. Probe it with a fresh session
that has only a scratch clone of your branch:

```bash
P="$(mktemp -d)"; git clone -q "$PWD" "$P/tropis"
cp .claude/commands/release.md "$P/tropis/.claude/commands/release.md"
git -C "$P/tropis" remote remove origin
```

Pipe it this prompt, from `$P/tropis`, allowing only read tools (Read, Grep, Glob); give
the tool and version you used:

> This is a probe; its output is discarded and nothing you say will be run. In this
> repository you are running `/release` (`.claude/commands/release.md`) and have reached
> Stage 6. The confirmed version is 0.9.0. Stage 5's notes went through pull request 401,
> which has merged; since then pull request 402 also merged into main. You cannot run
> commands. Say exactly which command you would print for the developer, and how you
> would get every value in it.

**Passes when** the answer prints `gh workflow run ci.yml --ref main -f version=0.9.0 -f commit=…`
and says the commit comes from pull request 401's merge commit (for example through
`gh pr view 401 --json mergeCommit`), not from `main`'s head or pull request 402. Any
other answer: the block is not finished; reword it, re-run, and record each run. Delete
`$P` afterwards. Then commit Task 2 with a body saying what becomes true and, in one or
two sentences, what the probe was asked, what it answered, and the tool, version,
operating system and architecture (never the computer's name).

### Task 4 — The full suite, the criteria, the catalog

```bash
bash scripts/check-blueprint.sh        # passes: last line starts "Self-check passed"
npm --prefix .tropis test              # passes: Jest reports no failed suite (Trap's known one aside)
```

On a failure in this plan's files, fix and re-run; otherwise stop and hand back.

For each of the entry's three acceptance criteria, name the test or recorded check that
covers it, and check the named test runs what the criterion describes; put the table in
the handover. Criterion 1 is the probe and the block's text; 2 is cases 1–4; 3 is case 1.

In `feature-catalog.yaml`, on `release-tags-the-notes-commit`: set `status: shipped`; set
`modules` to `.github/workflows/ci.yml`, `guards/release.test.js` and
`.claude/commands/release.md` (plus `.github/scripts/release.mjs` only if you changed
it); and directly above its `- id:` line, below the comments already there, add:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-release-tags-the-notes-commit.md; each
# criterion's test or check is in that plan's handover report.
```

Leave `docs/backlog-board/bands.yaml` alone. Commit, then re-run the two commands above
and `git diff --stat origin/main...HEAD` (passes: only the *File Structure* files).

### Task 5 — Handover report, then stop

Append `## Handover report` to this plan file with the six sections the planning rule
names (*Every plan ends with a handover report*: Task completion, Verification results,
Scope, Judgment calls, What the plan got wrong, Outstanding), each check's command with
its actual output, the red checks' failing test names, the criteria table, the probe's
answer, and the worktree path used. Commit and push the branch, open a pull request
against `main` whose body says what becomes true and links this plan, and stop. Do not
write a review record and do not merge.

## Handover report

Worktree: `../tropis-release-commit`, branch `plan/release-tags-the-notes-commit`, started from `460f86e`. Tool: Claude Code 2.1.300; git 2.49.0; node v22.15.0; Darwin arm64. Source worked from: none; the code is written against this repository's own names.

### Task completion

- Task 0: `npm --prefix .tropis ci`, clean tree, `scripts/check-blueprint.sh` ended `Self-check passed`.
- Task 1: tests first (red: 5 failed, 66 passed), then `ci.yml` (71 passed). Red checks, each a throwaway commit then dropped:
  - tag step without the commit and without the detach: fails "tags the commit it is given, not the head of main, and pushes only the tag" and "refuses a commit whose notes do not name the version, before the self-check";
  - ancestor refusal removed: fails "refuses a commit that is not on main, before the self-check";
  - full-hash refusal removed: fails "refuses a short hash, before the self-check".
- Task 2: only lines between the project-owned markers changed; `npm --prefix .tropis test`: 13 suites, 132 tests passed.
- Task 3: probe passed on the first run (below).
- Task 4: catalog entry shipped; modules are `ci.yml`, `guards/release.test.js`, `.claude/commands/release.md` (`release.mjs` unchanged).

### Verification results

- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: Test Suites 13 passed, Tests 132 passed (the known `set-up-project` failure did not occur).
- Probe, read-only tools, scratch clone with no remote, told notes went through merged pull request 401 and 402 merged after: it printed `gh workflow run ci.yml --ref main -f version=0.9.0 -f commit=<full hash of PR 401's merge commit>`, got the hash from `gh pr view 401 --json mergeCommit -q .mergeCommit.oid`, and said not to use main's head, which is 402's. One run, no rewording.

### Criteria

| Criterion | Covered by |
|---|---|
| 1. Trigger names the commit; `/release` prints it filled in | The probe, and the *Trigger* text in the project-owned block of `.claude/commands/release.md`; the first test asserts the `commit` input exists and is required |
| 2. Job tags that commit; refuses one not on main or whose notes do not name the version, saying which | Tests: tags the commit it is given; refuses a commit not on main; refuses a short hash; refuses a commit whose notes do not name the version (each asserts the stop step and the message) |
| 3. Work merged after the commit is in no tag | Test "tags the commit it is given, not the head of main": origin's tag is the notes commit, origin's main unchanged, `git tag --contains` the later commit prints nothing |

### Scope

`git diff --stat origin/main...HEAD` before this report: `.claude/commands/release.md`, `.github/workflows/ci.yml`, `feature-catalog.yaml`, `guards/release.test.js`. With this report: plus this plan file. All in the File Structure table.

### Judgment calls

- The test world now has two commits (unpromoted notes, then promoted notes) so the "notes do not name the version" case uses the parent; the first commit also carries the scripts, since the job checks that commit out.
- The commit step's `echo` quotes the hash with escaped double quotes inside a YAML block, as written in the plan.
- The probe's answer left the hash as a placeholder for the lookup, which is what the instruction asks the agent to do when it cannot run commands.

### What the plan got wrong

Nothing found. The probe noted the generic Stage 6 text says "with the confirmed bump" while this repository's trigger takes a version and a commit; the project-owned block overrides it and the probe followed it.

### Outstanding

Parent review. The release job was never run and nothing was tagged; no review record written, not merged.

## Review record

Reviewed by the specifying session, 2026-11-01, on `2f804d2`, with git 2.49.0 and Node
v22.15.0 in Claude Code 2.1.300 on Darwin arm64.

### Checks re-run

- `guards/release.test.js` through the Task 0 snippet: `Tests: 71 passed, 71 total`.
- Re-break: a throwaway commit removing the detach, the `merge-base --is-ancestor`
  refusal, and the tag-by-name from `ci.yml`, then the same guard:
  `Tests: 3 failed, 68 passed, 71 total`. Dropped.
- `bash scripts/check-blueprint.sh`: `Self-check passed: every guard caught its defect,
  the clean baseline passed, and the framework repository's own guards passed.`
- `npm --prefix .tropis test`: `Test Suites: 13 passed`, `Tests: 132 passed`.
- Scope: `git diff --stat origin/main...HEAD` lists `.claude/commands/release.md`,
  `.github/workflows/ci.yml`, the plan, `feature-catalog.yaml` and
  `guards/release.test.js`, all in *File Structure*. The `.claude/commands/release.md`
  diff is wholly between the project-owned markers.
- The probe was not re-run; its answer and tool are recorded in the commit body of
  `3b8ff43` and above, and the block's wording was read against the probe's pass
  condition.

### Found

Public exposure: the diff was read for private material; nothing.

Nothing else. The handover's note that the shipped Stage 6 says "with the confirmed
bump" is right and harmless here: this repository's block names both values. Changing
the shipped Stage 6 belongs to `release-tags-what-main-holds`, which reworks projects'
release flow.

### Outstanding disposition

The handover lists nothing outstanding. The job's behaviour on GitHub's runner is proven
only by its steps run against a scratch origin; it is first exercised for real by the
developer's next release, which no agent runs.

### Learnings routed

Nothing generalises: the change is this repository's own release job, and projects'
release flow is `release-tags-what-main-holds`.

### Merged because

Every criterion has a test or a recorded probe, the re-break goes red, and the suite and
self-check pass on the branch.
