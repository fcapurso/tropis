# The framework is called Tropis — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Task 1 is a handover to the developer: it stops the
> plan until the GitHub repository has been renamed.

**Goal:** The framework's repository is `fcapurso/tropis`, and wherever the framework names
itself it is called Tropis — the README, which now tells in a few lines what the name
means and how the framework helps, the operator page every set-up project gets, and this
repository's entry files. Nothing in a set-up project moves.

**Spec:** `docs/superpowers/specs/2026-10-15-framework-name-design.md` — the name, and the
README section approved word for word by the developer. The entry
`blueprint-tool-agnostic-name` in `feature-catalog.yaml` is the definition of done: its
five acceptance criteria and the comments above it, which record the name search and the
decision about the folder.

**What this delivers:** `blueprint-tool-agnostic-name`, all five criteria. See *Criteria
and their evidence* at the end.

**What the specifying session verified on 2026-10-15, against `main` at `b53cbf1`:**

- The repository is `fcapurso/claude-project-framework`, private
  (`gh repo view --json nameWithOwner,visibility`). `gh repo view fcapurso/tropis` fails
  with "Could not resolve to a Repository", so the name is free on that account. The
  local remote is `https://github.com/fcapurso/claude-project-framework.git`. GitHub
  redirects a renamed repository's old address for web, API, clone, fetch and push.
- The framework names itself "project governance framework" in exactly these
  non-installed places (`grep -rn -i governance`, excluding `docs/`, `.claude/`,
  `.framework/`, the backlog):
  - `README.md` line 1, `# Project governance framework`; line 3 begins "A governance
    layer for a codebase…" — that line describes what it is, and stays.
  - `templates/README.md` line 3, "This project is developed with the project governance
    framework, set up inside this repository: …". This template becomes every set-up
    project's `.framework/README.md`.
  - `CLAUDE.md` line 9, `# Project governance framework — project config`, and line 11,
    "This repository builds the project governance framework: the rules, …". `AGENTS.md`
    is identical to `CLAUDE.md` from line 9 on (`diff` prints nothing).
- `README.md`'s opening paragraph is lines 3–5, followed by a blank line and
  `## What it gives you` on line 7.
- No guard asserts the README's title or the word "governance"
  (`grep -rn -i governance guards` prints nothing). `guards/readme-usable.test.js` asserts
  phrases elsewhere on the page; Task 5 runs it against the real tree, because the
  self-check only runs its skip case (`blueprint-page-guards-run-in-the-self-check`).
- `RELEASES.md` has an `## [Unreleased]` section with one subsection, *Correction to
  0.1.0's notes*. It defines a breaking release as one where a project must act by hand,
  including "a file in `.claude/` or `.framework/` moved, renamed or removed".
- The installed copy `.claude/commands/release.md` line 20 names
  `https://github.com/fcapurso/claude-project-framework/actions/workflows/ci.yml`. It is
  the installed release and is not edited here; the redirect keeps it working until the
  next release is installed. The source `commands/release.md` names no address.

**Model tier: Small–medium.** Every edit is stated; the README section is quoted from the
design note.

**Requires:** the developer, for Task 1 (renaming the GitHub repository).

**Merge authority: parent review.** The README is what adopters read first, and the repository rename is the developer's.

Do not store a kick-off prompt on this plan.

---

## Delivers

blueprint-tool-agnostic-name

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-tropis -b plan/blueprint-tool-agnostic-name` |
| worked example (`first-adopter`) | do not edit | |

The local checkout keeps its folder name, `claude-project-framework`; renaming it is the
developer's, outside this plan.

## Global Constraints

- **The folder `.framework/` keeps its name everywhere**, in source and installed copies.
  Do not rename it, and do not change any command, hook entry, path or package name that
  contains it. That move belongs to `project-takes-a-framework-version`.
- **Do not edit `.claude/` or `.framework/`** — the installed release.
- **The README section is quoted, not written.** Copy it from the design note's fenced
  block byte for byte. If it seems to need a change, stop and report: a change goes back
  to the developer first.
- **Do not rename the repository yourself.** It is Task 1's handover.
- **Do not edit `docs/`** other than this plan's handover report: plans and specs are
  history and keep the old name.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken with the developer on 2026-10-15; do not reopen them.

1. **The name is Tropis**, Ancient Greek τρόπις, a ship's keel.
2. **The folder stays `.framework/`** until `project-takes-a-framework-version`, whose
   first run moves it, so no project migrates by hand.
3. **"Framework" stays as the common noun.** Tropis *is* a framework; sentences that say
   "the framework" keep saying it. Only the places where it names itself change.
4. **The README section lands directly under the opening paragraph**, word for word.
5. **Not breaking.** Nothing in a set-up project moves, so the release that carries this
   is not marked breaking.

## Traps

- **`CLAUDE.md` and `AGENTS.md` are this repository's entry files, not the shipped
  template.** Edit lines 9 and 11 of both, identically, and nothing else in them —
  their `.framework` commands describe this repository's installed release, which still
  lives there.
- **`templates/CLAUDE.md` does not name the framework**; leave it.
- **`readme-usable` skips in the self-check.** Run it against the real tree as Task 5
  shows; a green self-check alone says nothing about the README.

## File Structure

| File | Change |
|---|---|
| `README.md` | Title `# Tropis`; the *What is Tropis?* section after line 5 |
| `templates/README.md` | Line 3: "developed with Tropis, the agent-project framework, set up inside…" |
| `CLAUDE.md` | Lines 9 and 11 name Tropis |
| `AGENTS.md` | The same two lines, identically |
| `RELEASES.md` | `## [Unreleased]`: a subsection on the name |
| `feature-catalog.yaml` | `blueprint-tool-agnostic-name` to `shipped`, at merge, by the reviewer |
| `docs/superpowers/plans/2026-10-15-blueprint-tool-agnostic-name.md` | Handover report |

Doc closeout: the README is adopter-facing and is above. No decision is taken here that the
backlog does not already record, so no `DECISIONS.md` entry. No rule or framework document
changes, so no fresh-agent check.

---

### Task 1: Handover — rename the repository

**The task is the handover.**

**Check first:** `gh repo view fcapurso/tropis --json name -q .name` prints `tropis`. If it
does, the developer acted early: record that in the handover report and go to step 3.

**If not, print this to the developer and stop:**

> Please rename the GitHub repository — one minute.
>
> Run `gh repo rename tropis -R fcapurso/claude-project-framework`, or on GitHub open the
> repository's **Settings**, set **Repository name** to `tropis`, and press **Rename**.
>
> Done looks like: `gh repo view fcapurso/tropis --json name -q .name` prints `tropis`.
> Then tell me to carry on.

**On resumption,** run the check again and proceed on its result.

**Once the check passes:** point the remote at the new address. The worktree shares its configuration with the
   main checkout, so this changes both, which is intended:
   `git remote set-url origin https://github.com/fcapurso/tropis.git`, then
   `git fetch origin` must succeed. Record both outputs.

### Task 2: The README

1. Line 1 becomes `# Tropis`.
2. After line 5 (the end of the opening paragraph), insert one blank line and then the
   fenced block from `docs/superpowers/specs/2026-10-15-framework-name-design.md`, section
   *The README story* — its contents, not the fence lines. A blank line follows it, then
   the existing `## What it gives you`.
3. Check it is byte-identical: extract the block from the design note and the section from
   the README (from `## What is Tropis?` to the line before `## What it gives you`, trailing
   blank line removed) and `diff` them. Expected output: nothing.

Commit.

### Task 3: Where the framework names itself

- `templates/README.md` line 3: replace "with the project governance framework, set up
  inside this repository" with "with Tropis, the agent-project framework, set up inside
  this repository". Leave the rest of the sentence and the `{{…}}` placeholders.
- `CLAUDE.md` and `AGENTS.md`, line 9: `# Tropis — project config`. Line 11: replace
  "This repository builds the project governance framework:" with "This repository builds
  Tropis:". Change nothing else in either file.

Then, from the worktree root:

```bash
grep -rn -i "project governance framework" --exclude-dir=node_modules --exclude-dir=.self-check --exclude-dir=docs -I . | grep -v "^\.claude/\|^\.framework/\|^feature-catalog"
```

Expected: no output. On `b53cbf1` the same command prints six lines — `README.md:1`
(changed by Task 2), `templates/README.md:3`, and lines 9 and 11 of `CLAUDE.md` and
`AGENTS.md` — so any line left is a place missed.

Commit.

### Task 4: The release notes

In `RELEASES.md`, under `## [Unreleased]`, add after the existing subsection:

```markdown
### The framework is called Tropis

- The framework now has a name: Tropis, the Ancient Greek word for a ship's keel. The
  README says why. Its repository is `https://github.com/fcapurso/tropis`; the old
  address redirects there.
- Nothing in a set-up project moves. The framework stays in `.framework/` until the
  update command arrives, which moves it to `.tropis/` itself. A project's
  `.framework/README.md` may name the old address; it keeps working.
```

Commit.

### Task 5: Checks

```bash
npm --prefix .framework test
bash scripts/check-blueprint.sh
git diff --stat origin/main...HEAD
```

And `readme-usable` against the real tree, which the self-check does not reach:

```bash
S=$(mktemp -d) && git archive HEAD | tar -x -C "$S" && echo '{"type":"module"}' > "$S/package.json" \
  && cp "$S/templates/framework-jest.config.js" "$S/jest.config.js" && ln -s "$PWD/.self-check/node_modules" "$S/node_modules" \
  && (cd "$S" && node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js readme-usable operator-page-closeout); rm -rf "$S"
```

Expected: the suites green; `readme-usable` and `operator-page-closeout` report their real
cases passing (10 at the time of writing), not one skip case; the diff stat names exactly
the files in *File Structure* except `feature-catalog.yaml`. Run the self-check first, so
`.self-check/node_modules` exists.

### Task 6: Handover

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. The reviewer promotes the entry and writes the review record.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Repository is `fcapurso/tropis`; the old address still reaches it | Task 1 check; `git fetch` through the new remote; the redirect named in the notes |
| README titled Tropis, section word for word under the opening paragraph | Task 2 `diff`, empty |
| Tropis wherever the framework names itself | Task 3 `grep` |
| Release notes say so, and that nothing moves | `RELEASES.md` diff |
| The folder keeps its name; the renaming entry says so | No `.framework` change in the diff; `project-takes-a-framework-version`'s value and comment |

## Not in this plan

- **Renaming `.framework/` to `.tropis/`**, its commands and package name —
  `project-takes-a-framework-version`.
- **The word "blueprint"** in file, script and placeholder names (`check-blueprint.sh`,
  `docs/BLUEPRINT-UPSTREAM.md`, `{{BLUEPRINT_URL}}`). Older vocabulary for the same thing;
  renaming them moves project files, so it waits for the update command too.
- **The local checkout's folder name** and the `claude-project-framework` names in plans'
  Repositories tables. The developer's machine, and history.

## Handover report

### Task completion

All six tasks are done. Task 1 stopped once: `gh repo view fcapurso/tropis --json name -q .name` exited 1 with `Could not resolve to a Repository with the name 'fcapurso/tropis'`. The developer renamed the repository and said to carry on. The same check then printed `tropis`. The remote was pointed at `https://github.com/fcapurso/tropis.git` and `git fetch origin` exited 0. The catalog entry is still `building`; the reviewer promotes it at merge.

### Verification results

`gh repo view fcapurso/tropis --json name -q .name` on resumption printed `tropis`.

`git remote set-url origin https://github.com/fcapurso/tropis.git` printed nothing. `git remote -v` then printed:

```
origin	https://github.com/fcapurso/tropis.git (fetch)
origin	https://github.com/fcapurso/tropis.git (push)
```

`git fetch origin` exited 0 with no output.

`gh repo view fcapurso/claude-project-framework --json nameWithOwner,url` printed `{"name":"fcapurso/tropis","url":"https://github.com/fcapurso/tropis"}`.

Task 2: the design-note fence and the README section from `## What is Tropis?` up to `## What it gives you` (trailing blank line removed) `diff` to nothing.

Task 3, the command as written:

```
./.framework/README.md:1:# Project governance framework — working with the framework
./.framework/README.md:3:This project is developed with the project governance framework, set up inside this
./feature-catalog.yaml:201:      project governance framework.
```

The same lines with the `./` prefix stripped, then the plan's exclusion, print nothing. `diff` of `CLAUDE.md` and `AGENTS.md` from line 9 prints nothing.

`npm --prefix .framework test`, exit 0: 3 suites, 4 tests passed (`project-layout`, `rule-areas`, `catalog-entries`).

`bash scripts/check-blueprint.sh` first exited 1 in the sandbox (`Can't create 'fixtures/defects/projection-drift/.cursor': Operation not permitted`). Re-run outside the sandbox, at `241c9d5`, exit 0:

```
Checking 241c9d5 of ~/src/claude-project-framework-tropis

Conformance: every guard must fail on its planted defect

  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       rules-generated
  caught      hand-edited-rule       rules-generated
  caught      orphan-addition        rules-generated
  caught      stale-addition         rules-generated
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

`readme-usable` and `operator-page-closeout` against `git archive HEAD`, exit 0: 2 suites, 10 tests passed, none skipped.

`git diff --stat origin/main...HEAD` at `241c9d5` (before this handover commit):

```
 AGENTS.md           |  4 ++--
 CLAUDE.md           |  4 ++--
 README.md           | 18 +++++++++++++++++-
 RELEASES.md         |  9 +++++++++
 templates/README.md |  2 +-
 5 files changed, 31 insertions(+), 6 deletions(-)
```

`project-takes-a-framework-version`'s value still says its first run moves the framework from `.framework/` to `.tropis/`. The comment above `blueprint-tool-agnostic-name` still says the folder keeps its name here.

### Scope

Every file in that stat is in *File Structure*. This handover commit adds only this plan file, which is also in the table. `feature-catalog.yaml` is absent because the table assigns it to the reviewer at merge. No path under `.framework/` or `.claude/` is in the diff.

### Judgment calls

`RELEASES.md` no longer had a single Unreleased subsection. Since the plan was verified, two notes were inserted immediately under `## [Unreleased]`. The Tropis subsection is inserted in that same place, immediately under the heading, and its text is the plan's.

### What the plan got wrong

The Task 3 exclusion `^\.claude/\|^\.framework/\|^feature-catalog` does not match the `./` prefix `grep -rn` prints, so the command as written is not empty. The three lines are the installed `.framework/README.md` (not edited) and `feature-catalog.yaml` line 201, which is this entry's acceptance criterion ("not the project governance framework"), not a place the framework names itself. Stripping `./` and applying the same exclusion prints nothing.

The plan's picture of `## [Unreleased]` — one subsection, *Correction to 0.1.0's notes* — was true at `b53cbf1` and not at the execution base `e85569a`.

### Outstanding

The reviewer promotes `blueprint-tool-agnostic-name` to `shipped` and writes the review record. Merge authority is parent review; this session does not merge.

Each branch commit carries `Co-authored-by: Cursor <cursoragent@cursor.com>`, appended by the commit tool. There is no repository hook doing it. The squash needs an explicit `--subject` and `--body`, or that trailer lands on `main`.

## Review record

Reviewed by the specifying session, 2026-10-15, at `ad98b96`, whose base is `origin/main`
at `e85569a`; no rebase needed.

### Checks re-run

- `gh repo view` printed `fcapurso/tropis`; the local remote is
  `https://github.com/fcapurso/tropis.git`. `git ls-remote
  https://github.com/fcapurso/claude-project-framework.git HEAD` returned `e85569a`, the
  current `main` — the old address still reaches the repository.
- The design note's fenced block against README.md's *What is Tropis?* section, up to
  *What it gives you*: `diff` printed nothing. The section sits directly under the opening
  paragraph.
- Task 3's grep with the `./` prefix stripped (the plan's own command could not exclude
  anything, as the handover says): no line outside `.claude/`, `.framework/` and the backlog
  names the framework "governance framework".
- `NODE_MODULES=… bash scripts/check-blueprint.sh` at `ad98b96`: every guard caught its
  defect, clean baseline ok. `readme-usable` and `operator-page-closeout` against
  `git archive HEAD`: 10 of 10 passed, none skipped. `npm --prefix .framework test`: 4 of 4.
- Scope: `AGENTS.md`, `CLAUDE.md`, `README.md`, `RELEASES.md`, `templates/README.md` and
  this plan, plus `feature-catalog.yaml` in this commit — all in *File Structure*. Nothing
  under `.framework/` or `.claude/` changed.

### Found

- The two plan errors the handover names, both mine: Task 3's exclusion could never match
  `grep -rn`'s `./` prefix, and the plan described `## [Unreleased]` as it stood at
  `b53cbf1`. The executor worked around both correctly. Nothing else.

### Outstanding disposition

- Promote the entry and write this record — done in this commit.
- The `Co-authored-by: Cursor` trailers — dropped by the squash's explicit subject and body.

### Learnings routed

- A grep in a plan whose exclusions are anchored at the start of a path must strip the
  `./` that `grep -rn .` prints, or search from named folders. This is the same kind of
  error as a check that cannot fail, which `plan-checks-must-be-falsifiable` already
  covers; it adds nothing that entry does not. Not routed separately.
- No decision record: the backlog already records the name and the folder decision.

### Merged because

Every criterion was re-checked against the repository and GitHub, and every suite is green.
