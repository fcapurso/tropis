# The README says in one place what the project needs to work — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** both README outlines — the default one set-up projects receive and this
repository's own — have a section *What it needs*, directly after *Who it is for*, and
the jobs of *Who it is for* and *Where it stands* send requirements there; a check fails
when either outline loses that.

**Spec:** the entry `readme-says-what-it-needs` in `feature-catalog.yaml` and the comment
above it. There is no design document; the decisions below, taken with the developer on
2026-10-31, are the design. The plan that last changed the README outline machinery is
docs/superpowers/plans/2026-10-21-readme-rescue.md.

**What the specifying session verified on 2026-10-31, against `main` at `ed45b3e`, with
git 2.49.0, Node v22.15.0 and Jest 30.5.2, in Claude Code on macOS 26.2, arm64:**

- **The README is rebuilt from an outline, section by section.** `commands/refresh-readme.md`
  reads `docs/readme/skeleton.md` when it exists, otherwise
  `.tropis/templates/readme-skeleton.md`. Each `## <Heading>` carries **Job**, **Facts
  from** and **Length** lines, or `Fixed text:`. When the README's `##` headings are not
  the outline's in the outline's order, the refresh restructures the page to the outline.
  So a section added to the outline is written on the next refresh and kept on every one
  after it.
- **Set-up projects receive the default outline.** `scripts/set-up-project.sh` (line 78)
  copies `templates/readme-skeleton.md` into a project's `.tropis/templates/`.
  `commands/update.md` (around line 182) already tells a project that has its own
  `docs/readme/skeleton.md` when an update replaced the default outline, and offers to show
  the difference. Nothing more is owed to such projects.
- **The two outlines differ only above *What it does for you*.** `diff
  templates/readme-skeleton.md docs/readme/skeleton.md` shows a different header comment,
  a different **Facts from** line under *What it is*, and this repository's extra
  `## What is Tropis?` section with `Fixed text:`. From *What it does for you* down, the
  eight sections are identical in both files.
- **The requirements are on this repository's README today, split in two.**
  `README.md` *Who it is for* (lines 59–64) names git, bash, python3, node 18.14 or later,
  and an agent tool that runs hooks before a command and reads a project instruction
  file, with Claude Code and Cursor supported. *Where it stands* (lines 144–146) says the
  pipeline runs as CI on GitHub only and that running without node is not yet possible.
  Nothing on the page says that the `gh` command is used.
- **Where the facts for this repository's section live.** `scripts/check-prerequisites.sh`
  requires git, python3 and node 18 or newer, requires the `yaml` package when a backlog
  exists, and lists `gh` as optional ("the workflow's merge commands use it, everything
  else works without"). The installed Jest, 30.5.2, declares `engines.node`
  `^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0` in `.tropis/node_modules/jest/package.json`,
  which is where the README's 18.14 comes from; the prerequisite check accepts any 18.
  `framework/DECISIONS.md` FW-005 is the decision to depend on git, bash, python3 and node.
  `gh` is used by `commands/next.md` (`gh pr list`), `scripts/submit-upstream.sh` (the
  flush) and the merge steps. `commands/bootstrap.md` offers the GitHub pipeline
  workflow; `commands/update.md` (around line 136) handles a host other than GitHub.
- **What reads the outlines.** `guards/readme-usable.test.js` reads
  `docs/readme/skeleton.md` for its `Fixed text:` and runs only in this repository's tree
  (`isBlueprintTree`). `guards/take-version.test.js` appends a line to
  `templates/readme-skeleton.md` in a scratch release and checks a project's own outline
  is kept; it does not read headings. `guards/set-up-project.test.js` lists
  `.tropis/templates/readme-skeleton.md` as an installed path. `guards/framework-integrity.test.js`
  exempts `docs/readme/skeleton.md` as a path named in framework documents; it does not
  read the outlines' contents. None of these is affected by adding a section.

**Model tier: Small.** The new outline text and the test are given verbatim below.

**Requires:** nothing beyond the repository.

**Merge authority: self-merge.** Every criterion is checked by the test Task 1 writes,
which must fail first. The README itself is not changed by this plan (*Decision 3*).

Do not store a kick-off prompt on this plan.

---

## Delivers

readme-says-what-it-needs

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-readme-needs -b plan/readme-says-what-it-needs` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` at the
  repository root.** They are the installed release and this repository's own entry
  pair; the work is in the source folders and `docs/`.
- **Do not edit `README.md`.** See *Decision 3*.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Every commit has
  a body.
- **Push only to this plan's branch.**
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed, the handover or the review record.

## Decisions

Taken by the specifying session with the developer on 2026-10-31.

### 1. The default outline

In `templates/readme-skeleton.md`, make exactly these three changes and no other.

Replace the `## Who it is for` section with:

```markdown
## Who it is for
- **Job:** who it fits and who it does not, so a reader can rule themselves in or out. What it needs to work goes under What it needs, not here.
- **Facts from:** the project brief, the decision record.
- **Length:** two short paragraphs.

## What it needs
- **Job:** what someone must have for it to work, at a high level: tools, accounts, services, platforms. Each is marked required or optional, with what is lost without an optional one. This is the only section that lists them; Getting started shows how to set them up.
- **Facts from:** the setup scripts and package files, the CI configuration, the architecture document, the project brief.
- **Length:** a short list.
```

Replace the **Job** line of `## Where it stands` with:

```markdown
- **Job:** what works today and the known limits, honestly. A requirement goes under What it needs; a limit here is something not supported yet.
```

The header comment stays as it is.

### 2. This repository's outline

In `docs/readme/skeleton.md`, replace the `## Who it is for` section with:

```markdown
## Who it is for
- **Job:** who it fits and who it does not, so a reader can rule themselves in or out. What it needs to work goes under What it needs, not here.
- **Facts from:** the project brief, the decision record.
- **Length:** two short paragraphs.

## What it needs
- **Job:** what a project must have for Tropis to work, at a high level: the tools on the developer's machine, a supported agent tool, and the code host. Each is marked required or optional, with what is lost without an optional one. This is the only section that lists them; Getting started shows how to set them up.
- **Facts from:** scripts/check-prerequisites.sh, for what is required and what is optional; the Node versions the installed Jest accepts (the engines field in .tropis/node_modules/jest/package.json), which are stricter than that script; framework/DECISIONS.md, FW-005; the agent tools rule delivery supports, as How it works describes; commands/bootstrap.md and commands/update.md, for what GitHub adds and what happens on another host; commands/next.md and scripts/submit-upstream.sh, for where the gh command is used.
- **Length:** a short list.
```

Replace the **Job** line of `## Where it stands` with the same line as in *Decision 1*.

The paths in this outline are plain text, not in backticks, matching the outline's other
**Facts from** lines.

### 3. The README is not changed here

`README.md` is rewritten by `/refresh-readme`, which reads this outline and asks the
developer before committing. That is the only way this repository's README changes, so
this plan does not touch it. After the merge, the specifying session runs
`/refresh-readme` on `main`; the refresh sees a heading the page lacks, restructures the
page to the outline, and moves the requirements out of *Who it is for* and *Where it
stands* into the new section. That run is not part of this plan and not one of its
criteria.

### 4. One test, in the guard that already reads this repository's outline

Add to `guards/readme-usable.test.js`, inside the `describe('blueprint README usable', …)`
block after the last `it`, verbatim:

```js
  it('both README outlines list requirements once, under What it needs', () => {
    for (const path of ['templates/readme-skeleton.md', 'docs/readme/skeleton.md']) {
      const text = readFileSync(join(root, path), 'utf8');
      const sections = text.split(/^## /m).slice(1);
      const headings = sections.map((s) => s.split('\n')[0].trim());
      const body = (heading) => sections[headings.indexOf(heading)] ?? '';
      const at = headings.indexOf('What it needs');
      expect({ path, at: at > 0 }).toEqual({ path, at: true });
      expect({ path, before: headings[at - 1] }).toEqual({ path, before: 'Who it is for' });
      expect({ path, after: headings[at + 1] }).toEqual({ path, after: 'Getting started' });
      for (const line of ['- **Job:**', '- **Facts from:**', '- **Length:**']) {
        expect({ path, line, found: body('What it needs').includes(line) })
          .toEqual({ path, line, found: true });
      }
      for (const heading of ['Who it is for', 'Where it stands']) {
        const job = body(heading).split('\n').find((l) => l.startsWith('- **Job:**')) ?? '';
        expect({ path, heading, sends: job.includes('What it needs') })
          .toEqual({ path, heading, sends: true });
      }
    }
  });
```

The `{ path, … }` objects make a failure name the outline and the heading. Add one
sentence to the file's header comment, after the first line: `It also checks that both
README outlines, the default one and this repository's, list requirements once, under
What it needs.`

### 5. What this owes, and does not

- **No fresh-agent check.** Nothing under `rules/`, `framework/`, `commands/` or `.claude/`
  changes. The refresh after merge (*Decision 3*) is where this repository's outline is
  first used.
- **No `framework/DECISIONS.md` entry.** A new section in an outline, with no real
  alternative weighed beyond where in the page it sits.
- **No release-notes edit.** `/release` drafts the notes from the backlog.
- **No operator guide change.** `templates/README.md` does not describe the README outline's
  sections.

## Traps

- **The test must fail first.** Task 1 commits the test before the outlines change, and the
  self-check must then fail on it, for both outlines. That is the red step, not a breakage.
- **The self-check reads `HEAD` only.** Commit before each run. Red runs are ordinary
  commits on this branch; they disappear in the squash.
- **The prerequisite check and the README disagree about Node.** The check accepts node
  18.0; the README says 18.14, which is what Jest needs. Do not fix either here: it is
  outside this plan, and the outline already names both sources. Record it under
  *Outstanding* in the handover.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `templates/readme-skeleton.md` | *Decision 1* |
| `docs/readme/skeleton.md` | *Decision 2* |
| `guards/readme-usable.test.js` | *Decision 4* |
| `feature-catalog.yaml` | the entry to `shipped`, `modules` set, a comment mapping criteria to the test |
| `docs/superpowers/plans/2026-10-31-readme-says-what-it-needs.md` | the handover report and the review record |

Nothing else: no generated feature document exists in this repository, and the backlog
board's bands file is refreshed by `/refresh-board`, not by a plan.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm` for the
handover.

### Task 1 — The test, red

Apply *Decision 4*. Commit. Run `bash scripts/check-blueprint.sh`: it must fail, and the
failing test must be `both README outlines list requirements once, under What it needs`,
with the failure naming `templates/readme-skeleton.md`. Paste the failing assertion.

Then, in a throwaway commit, apply *Decision 1* only, run the self-check, and paste the
failure, which must now name `docs/readme/skeleton.md`. Drop the commit with
`git reset --hard HEAD~1`. This shows the test checks each outline on its own.

### Task 2 — The outlines

Apply *Decision 1* and *Decision 2*. Commit. Run `bash scripts/check-blueprint.sh`; the
last line must start `Self-check passed`. Paste it.

Run `diff templates/readme-skeleton.md docs/readme/skeleton.md` and paste it: the
differences must be the ones the verified notes list above *What it does for you*, plus
the *What it needs* **Facts from** line, and nothing else.

### Task 3 — Catalog

In `feature-catalog.yaml`, on `readme-says-what-it-needs`: set `status: shipped` (it will
read `building` once dispatched; if it still reads `shaped`, set `shipped` anyway and say
so under *Judgment calls*). Set `modules` to `templates/readme-skeleton.md`,
`docs/readme/skeleton.md`, `guards/readme-usable.test.js`. Add a comment directly above
the entry's `- id:` line, below the existing comment:

```yaml
# Shipped by docs/superpowers/plans/2026-10-31-readme-says-what-it-needs.md. Criteria 1, 2
# and 3: readme-usable.test.js, "both README outlines list requirements once, under What
# it needs", which reads both outlines.
```

Do not put `: ` (colon and space) inside an unquoted YAML value. Commit.

### Task 4 — Full verification

From the worktree, after committing everything:

- `npm --prefix .tropis test` — the installed release's checks on this repository; paste
  the `Tests:` line.
- `bash scripts/check-blueprint.sh` — paste the last line, which must start
  `Self-check passed`.
- `git diff --stat origin/main...HEAD` — paste it; every file must be in *File Structure*.

### Task 5 — Handover report, review record, merge

1. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Commit, push the branch, and open a pull
   request against `main` whose body says what is now true, ending with the attribution
   lines your session gives.
2. **Self-merge: you write the review record.** Wait for the pull request's checks to
   finish (`gh pr checks <N> --watch`); they must all be green. Then append
   `## Review record` below the handover with its five sections: *Checks re-run* (re-run
   Task 4's self-check on the final commit, with output, tool, version, OS and
   architecture; and re-break the test by hand — in a throwaway commit, delete the
   `## What it needs` section from `docs/readme/skeleton.md`, run the self-check, paste
   the failure naming that file, then `git reset --hard HEAD~1`), *Found* (opening with
   `Public exposure:` and what reading the diff for names, home paths and hostnames
   found, or `nothing`), *Outstanding disposition* (each Outstanding item with a catalog id
   or a one-line reason to drop; say the change has no screen, so there is no developer
   check, and that the README refresh after merge is the specifying session's, per
   *Decision 3*), *Learnings routed* (or why nothing generalises), *Merged because*.
   Commit and push, and wait for the checks again; all green.
3. Merge, in this order. If `origin/main` moved, first `git fetch origin && git rebase
   origin/main`, re-run Task 4 in full, push with `--force-with-lease`, and wait for
   green. Then, from the main checkout (not the worktree):

   ```bash
   git worktree remove --force ../tropis-readme-needs
   git branch -D plan/readme-says-what-it-needs
   gh pr merge <N> --squash --delete-branch \
     --subject "feat(readme): the README says in one place what the project needs to work" \
     --body "<what is now true: both README outlines, the default one set-up projects receive and this repository's own, have a What it needs section after Who it is for, whose job is to list requirements once, required or optional; Who it is for and Where it stands send requirements there; a check fails if either outline loses this. Then: Implements: readme-says-what-it-needs / Plan: docs/superpowers/plans/2026-10-31-readme-says-what-it-needs.md, and the attribution lines>"
   git checkout main && git pull origin main
   ```

## Handover report

**Task completion.** Tasks 0 to 4 done. The catalog entry read `building`, as expected.

**Verification results.** Run with git 2.49.0, Node v22.15.0, Jest 30.5.2 on Darwin arm64.
- Task 0: baseline `bash scripts/check-blueprint.sh` ended `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Task 1 red: the self-check printed `FAILED readme-usable fails on the framework repository` and `Self-check FAILED`. It does not print test output, so the guard was run directly on a `git archive` of HEAD: `blueprint README usable › both README outlines list requirements once, under What it needs`, `"at": true` expected, `false` received, `"path": "templates/readme-skeleton.md"`.
- Task 1 throwaway commit (Decision 1 only): same test failed with `"path": "docs/readme/skeleton.md"`. Dropped with `git reset --hard HEAD~1`.
- Task 2: self-check ended `Self-check passed: ...`. The `diff` of the two outlines shows only the differences the plan lists plus the What it needs Job and Facts from lines.
- Task 4 (after rebase onto `origin/main` 21fe930): `npm --prefix .tropis test` gave `Tests: 33 passed, 33 total`; self-check ended `Self-check passed: ...`.

**Scope.** `git diff --stat origin/main...HEAD`: docs/readme/skeleton.md, feature-catalog.yaml, guards/readme-usable.test.js, templates/readme-skeleton.md (4 files, 45 insertions, 6 deletions), plus this plan file. All in File Structure. Worktree: `../tropis-readme-needs`.

**Judgment calls.** Branch was rebased onto a newer `origin/main` before pushing. The red-step output was captured by running the guard directly, because the self-check hides test output.

**What the plan got wrong.** Task 1 expects the self-check to show the failing test name; it shows only the guard name.

**Outstanding.** The prerequisite check accepts Node 18.0 while Jest needs 18.14 (already catalogued as `prerequisite-check-refuses-old-node`). The README refresh after merge is the specifying session's (Decision 3).

## Review record

**Checks re-run.** git 2.49.0, Node v22.15.0, Jest 30.5.2, Darwin arm64. On the final commit `bash scripts/check-blueprint.sh` ended `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.` Re-break: in a throwaway commit I deleted `## What it needs` from `docs/readme/skeleton.md`; the guard failed with `both README outlines list requirements once, under What it needs`, `"at"` true expected and false received, `"path": "docs/readme/skeleton.md"`. Dropped with `git reset --hard HEAD~1`. The pull request's checks (framework / checks, plan) passed; the other jobs were skipped.

**Found.** Public exposure: the diff was read for names, home paths and hostnames; nothing found. No defects beyond the handover's note that the self-check hides test output.

**Outstanding disposition.** Node 18.0 versus 18.14: already catalogued as `prerequisite-check-refuses-old-node`. The change has no screen, so there is no developer check. The README refresh after merge belongs to the specifying session, per Decision 3.

**Learnings routed.** Nothing generalises beyond what the plan already records; the self-check printing only the guard name is a small usability gap not worth an entry.

**Merged because.** Every criterion is checked by a guard that was seen failing for each outline and passing after the change, and checks are green.
