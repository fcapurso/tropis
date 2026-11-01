# Historical documents sit apart from the ones still maintained — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in it stops for the developer.

**Goal:** the portability notes move from the repository root to
`docs/history/PORTABILITY-NOTES.md`, labelled as a historical record; every live
reference points at the new place; and the five guards that recognised this repository
partly by the file at the root recognise it by `framework/workflow.md` instead, still
running here and still failing when the marker is planted away.

**Spec:** the entry `history-is-kept-apart-from-living-docs` in `feature-catalog.yaml`:
its acceptance criteria and the comment above it. There is no design document.

**One plan:** what becomes true is one sentence — a reader can tell from where a
document sits whether anything still maintains it. The guard changes exist only because
the move would otherwise silently switch five guards off.

**What the specifying session verified on 2026-11-01, against `origin/main` at `f80339e`:**

- **The file is at the root and nothing writes to it.** `PORTABILITY-NOTES.md`, 488
  lines. Its per-flush sections stopped on 2026-10-14 (its last section heading in that
  series is `## Upstream queue flush — 2026-10-14`); merged pull requests are the record
  now. It contains none of the markers the doc-currency guard looks for (`✅`, `⚠️`,
  `❌`, a line starting `Status:`, `COMPLETED`, `Needs review`, `WIP`): `grep -nP` for
  them prints nothing.
- **Live references to it**, from `git grep -nF PORTABILITY-NOTES` outside
  `docs/superpowers/`, the installed release and the catalog:
  - `README.md:179`, the bullet *Built from two projects, not a theory.*:
    `  [PORTABILITY-NOTES.md](PORTABILITY-NOTES.md) records what was kept, what was left`
  - `framework/DECISIONS.md:202` (``…the sample of two behind`` / `` `PORTABILITY-NOTES.md`, because it is a property…``)
    and `:207` (`` `PORTABILITY-NOTES.md` already says.``), in the technology-independence decision.
  - `scripts/check-blueprint.sh:148` `plant operator-page-closeout PORTABILITY-NOTES.md`
    and `:150` `plant readme-usable PORTABILITY-NOTES.md`.
  - Five guards define the same `isBlueprintTree(dir)`, requiring `bootstrap.md`,
    `PORTABILITY-NOTES.md`, `commands` and `README.md` at `dir`:
    `guards/operator-page-closeout.test.js:19`, `guards/readme-usable.test.js:20`,
    `guards/private-material.test.js:26`, `guards/dependency-overrides.test.js:26`,
    `guards/contributing-page.test.js:21`. The last also builds a small tree at line 97:
    `for (const f of ['bootstrap.md', 'PORTABILITY-NOTES.md', 'README.md']) writeFileSync(join(dir, f), '');`
  - `.claude/framework/DECISIONS.md` (installed release): **not edited**, it changes only
    by installing a release.
  - `docs/superpowers/plans/` and `docs/superpowers/specs/`: 15 files name it. They are
    dated records and keep their wording; earlier plans set the same precedent ("a dated
    porting record … stays as written").
- **The self-check needs the marker in the export.** `scripts/check-blueprint.sh` exports
  `HEAD` with `git archive`, and `.gitattributes` export-ignores `/docs/superpowers/`,
  `/docs/backlog-board/`, `/docs/verification-log.md` and others, but not `docs/history/`.
  `framework/workflow.md` is in the export. `FRAMEWORK_GUARDS` lists the five guards;
  `run_guard` sets `TROPIS_EXPECT_FRAMEWORK=1`, which turns each guard's skip into a
  failure; `plant <guard> <file>` with no third argument deletes the file from a copy of
  the export and expects the guard to fail.
- **No project tree has `framework/workflow.md` at its root.** A set-up project holds the
  framework under `.claude/framework/`; `find fixtures -name workflow.md` prints only
  `fixtures/base/.claude/framework/workflow.md`.
- **The doc-currency guard already knows how history is labelled.**
  `guards/doc-currency.test.js` scans every `.md` under `docs/` except `superpowers/` and
  `fixtures/`, and skips a file matching `/^>\s*\*\*Historical record\.\*\*/m`. Its comment
  calls `docs/superpowers/` "an archive of dated specs and plans by design".
- **The installed release does not use the file as a marker.** `git grep -lF
  PORTABILITY-NOTES -- .tropis .claude` names only `.claude/framework/DECISIONS.md`, so
  `npm --prefix .tropis test` is unaffected by the move.

**Model tier: Small–medium.** Every edit is given verbatim below; the judgement left is in pasting outputs faithfully and running the fresh-agent check.

**Merge authority: parent review.** The specifying session reviews and merges; `main` is gated. Stop after pushing the branch.

**Requires:** an agent command-line tool that starts a fresh session from a piped prompt, for the fresh-agent check in Task 4 (record which, and its version).

Do not store a kick-off prompt on this plan.

---

## Delivers

history-is-kept-apart-from-living-docs

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-history -b plan/history-is-kept-apart-from-living-docs origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/` or `CLAUDE.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** An existing
  assertion changes only where this plan says so.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover. Paths in the handover are relative to the
  worktree, or written as `$TMPDIR/...`.
- **Write the changes yourself against this repository's own names.** Say in the handover
  which named source, if any, you worked from.

## Decisions

### 1. Where historical documents go: `docs/history/`

`git mv PORTABILITY-NOTES.md docs/history/PORTABILITY-NOTES.md` (keep the name, so a
search for it still finds it). Then insert, as a new paragraph directly below the
`# Portability notes` heading and above `What this blueprint is made of, and how that was
decided.`:

```markdown
> **Historical record.** How the framework was first assembled from two projects, and the
> flushes that followed until 2026-10-14. Nothing updates it; merged pull requests are the
> record since.
```

with one blank line before and after it. That line is the label `doc-currency` already
recognises, so the file is exempt from the current-state markers forever, and a reader
opening it is told at once.

**Plans and specs stay in `docs/superpowers/`.** They are dated records by kind, never
edited after merge, and `doc-currency` already treats that folder as an archive. Moving
finished ones out would break the `refs` and plan paths the catalog and the dispatch
tooling read, and would need doing again at every merge. Renaming that folder is the
later entry `plan-folder-names-no-plugin`. Nothing in this plan touches it.

### 2. The live references

- **`README.md`**, the line quoted above becomes:
  `  [docs/history/PORTABILITY-NOTES.md](docs/history/PORTABILITY-NOTES.md) records what was kept, what was left`
  Nothing else in the README changes (the workflow allows a plan to correct a link to a
  file it moved, and nothing more).
- **`framework/DECISIONS.md`.** This text is shipped into every project, where the file
  has never existed, so it is named in plain text, without backticks. Backticks around a
  `docs/` path would make `framework-integrity` require the file in every project.
  - Line 201–202: replace `` `PORTABILITY-NOTES.md`, because`` with
    `the framework repository's portability notes (docs/history/PORTABILITY-NOTES.md), because`
    so the sentence reads *…the sample of two behind the framework repository's
    portability notes (docs/history/PORTABILITY-NOTES.md), because it is a property…*.
  - Line 207: replace `` `PORTABILITY-NOTES.md` already says.`` with
    `the portability notes already say.`
  Re-wrap the two paragraphs to the file's line width (about 90 characters) if a line
  grows past it; change no other word.
- **`AGENTS.md`**, the *Load on demand* table: add a row directly below the
  `docs/superpowers/specs/` row:
  `` | `docs/history/` | How Tropis came to be. Nothing updates it: read it for provenance, never for how things work now. | ``

### 3. The guards recognise this repository by its framework source

In each of the five guards, inside `isBlueprintTree`, replace

```js
    existsSync(join(dir, 'PORTABILITY-NOTES.md')) &&
```

with

```js
    existsSync(join(dir, 'framework/workflow.md')) &&
```

Files: `guards/operator-page-closeout.test.js`, `guards/readme-usable.test.js`,
`guards/private-material.test.js`, `guards/dependency-overrides.test.js`,
`guards/contributing-page.test.js`. `framework/workflow.md` is the next release's
source, which this repository has by definition and a project never has at its root.

In `guards/contributing-page.test.js`, the small tree at line 97 becomes:

```js
      for (const f of ['bootstrap.md', 'README.md']) writeFileSync(join(dir, f), '');
      mkdirSync(join(dir, 'framework'));
      writeFileSync(join(dir, 'framework/workflow.md'), '');
```

(`mkdirSync` is already imported there; check, and import it if not.)

In `scripts/check-blueprint.sh`, the two plant lines become:

```bash
plant operator-page-closeout framework/workflow.md
plant readme-usable framework/workflow.md
```

Keep them where they are, in the same order. Deleting `framework/workflow.md` makes
`isBlueprintTree` false, so the guard skips, and `TROPIS_EXPECT_FRAMEWORK=1` turns that
skip into the failure the plant expects.

### 4. The catalog and the board

In `feature-catalog.yaml`, on `history-is-kept-apart-from-living-docs`: set
`status: shipped` (it reads `building` once dispatched; if it reads anything else, set
`shipped` anyway and say so under *Judgment calls*). Leave `modules` and `refs` as they
are. Add, directly above the entry's `- id:` line and below the existing comments:

```yaml
# Shipped by docs/superpowers/plans/2026-11-01-history-is-kept-apart-from-living-docs.md.
# Criteria 1 and 2 - the move and the references, checked by git grep in Task 5.
# Criterion 3 - docs/history/ and the Historical record label. Criterion 4 - the
# self-check's framework section and its two plants.
```

Do not put `: ` (colon and space) inside an unquoted YAML value.

In `docs/backlog-board/bands.yaml`, delete the whole `history-is-kept-apart-from-living-docs:`
block, from that line up to (not including) the next top-level key,
`instruction-files-have-a-delivery-map:`.

### 5. What this owes, and does not

- **Fresh-agent check: yes**, because `framework/DECISIONS.md` changes. Task 4.
- **No new decision record.** Where historical documents sit in this repository is
  recorded by the catalog entry and this plan.
- **No rule changes**, so nothing under `rules/` and no regeneration.
- **No release-notes edit** (`/release` drafts them).
- **No operator-guide change:** nothing a developer of a project is told changes.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **Backticks around the new path in `framework/DECISIONS.md` would turn the self-check
  red** in `framework-integrity`, because it would then require the file in every project.
  Plain text, as *Decision 2* gives it.
- **`npm --prefix .tropis test` runs the installed release's guards, not the ones you
  edit.** The edited guards are checked only by `bash scripts/check-blueprint.sh`, in its
  *Framework repository* section.
- **Do not edit the plans and specs that name the old path.** They are dated records.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only the files in
  *File Structure*. Git reports the move as a rename.

## File Structure

| File | Change |
|---|---|
| `PORTABILITY-NOTES.md` → `docs/history/PORTABILITY-NOTES.md` | moved, label added (*Decision 1*) |
| `README.md` | the one link (*Decision 2*) |
| `framework/DECISIONS.md` | two references, plain text (*Decision 2*) |
| `AGENTS.md` | one table row (*Decision 2*) |
| `guards/operator-page-closeout.test.js` | marker (*Decision 3*) |
| `guards/readme-usable.test.js` | marker (*Decision 3*) |
| `guards/private-material.test.js` | marker (*Decision 3*) |
| `guards/dependency-overrides.test.js` | marker (*Decision 3*) |
| `guards/contributing-page.test.js` | marker and small tree (*Decision 3*) |
| `scripts/check-blueprint.sh` | two plant lines (*Decision 3*) |
| `feature-catalog.yaml` | the entry to `shipped`, a comment (*Decision 4*) |
| `docs/backlog-board/bands.yaml` | the entry's band row removed (*Decision 4*) |
| `docs/superpowers/plans/2026-11-01-history-is-kept-apart-from-living-docs.md` | the handover report and the review record |

Nothing else.

## Tasks

### Task 0 — Setup in the worktree

In the worktree: `npm --prefix .tropis ci`, then `git status --porcelain` (expected:
nothing), then `bash scripts/check-blueprint.sh` (expected: last line starts
`Self-check passed`). Record `git --version`, `node --version` and `uname -sm` for the
handover.

### Task 1 — The guards, first

Apply *Decision 3* only. Commit. Run `bash scripts/check-blueprint.sh`. The file is
still at the root and `framework/workflow.md` exists, so every guard still recognises the
repository: the last line must start `Self-check passed`, and the *Framework repository*
section must show `caught      operator-page-closeout: framework/workflow.md planted` and
`caught      readme-usable: framework/workflow.md planted`. Before this task those two
lines read `PORTABILITY-NOTES.md planted` instead. Paste the section.

If a guard fails or a plant prints `NOT CAUGHT`, fix the edit and run again.

### Task 2 — The move

Apply *Decision 1*. Commit. Run `bash scripts/check-blueprint.sh`; the last line must
start `Self-check passed`. Paste it.

### Task 3 — The references

Apply *Decision 2*. Commit. Then run, and paste:

```bash
git grep -nF PORTABILITY-NOTES -- . ':!docs/superpowers' ':!.claude' ':!.tropis' ':!feature-catalog.yaml' ':!docs/backlog-board'
```

Expected: exactly two lines, `README.md:<n>:` with `docs/history/PORTABILITY-NOTES.md`
twice in it, and `framework/DECISIONS.md:<n>:` with `(docs/history/PORTABILITY-NOTES.md)`
(if the re-wrap splits that path across lines, it must not: keep it on one line). Before
the work this printed eleven lines: the root link in `README.md`, the two backticked
names in `framework/DECISIONS.md`, the two plant lines and six guard lines. Then run:

```bash
git grep -nF PORTABILITY-NOTES.md -- README.md AGENTS.md CONTRIBUTING.md bootstrap.md framework scripts guards | grep -vF docs/history/PORTABILITY-NOTES.md
```

Expected: nothing. To trust that empty result, run the same pipeline with `origin/main`
after `-nF PORTABILITY-NOTES.md`: it must print lines.

Run `bash scripts/check-blueprint.sh`; the last line must start `Self-check passed`.

### Task 4 — Fresh-agent check

`framework/DECISIONS.md` changed, so a fresh agent with only this worktree must be seen
to follow its new reference. Run it with its tool calls visible (in Claude Code,
`claude -p --output-format stream-json --verbose --allowedTools Read,Grep,Glob`), from
the worktree.

Prompt, verbatim: *"This is a probe; its output will be discarded. In
framework/DECISIONS.md, the decision on technology independence says some assumptions
are untested, as the portability notes already say. Open the portability notes and
quote the heading of their section on what the evidence does not cover, with the path
of the file you read it from. Change nothing."*

Pass: the stream shows a Read of `docs/history/PORTABILITY-NOTES.md`, and the reply names
that path and the heading `## What this evidence does not cover`. Quote the Read call and
the reply. If it reads another file or fails to find it, the reference is not clear
enough: change the wording in *Decision 2* minimally, commit, and run again; if it fails
twice, stop and hand back with both transcripts' relevant calls. Record the tool, its
version, the operating system and the architecture; these go in the body of the final
commit (`--allow-empty` is fine) and in the handover.

### Task 5 — The catalog and the board

Apply *Decision 4*. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line;
every test must pass. Run `bash scripts/check-blueprint.sh` and paste the last line.

### Task 6 — Verification, handover, push

1. From the worktree, everything committed: `npm --prefix .tropis test` (paste the
   `Tests:` line), `bash scripts/check-blueprint.sh` (paste the *Framework repository*
   section and the last line, which must start `Self-check passed`), and
   `git diff --stat origin/main...HEAD` (paste it; every file must be in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its actual output, and
   the tool, version, operating system and architecture — never the computer's name),
   Scope (diff stat, every file in *File Structure*, the worktree path used), Judgment
   calls, What the plan got wrong, Outstanding. Say in Outstanding that the change has no
   screen, so there is no developer check. Commit.
3. Push the branch (`git push -u origin plan/history-is-kept-apart-from-living-docs`).
   **Stop there.** Do not open a pull request, write a review record, set auto-merge or
   merge: `main` is gated and the dispatching session reviews and delivers. Leave the
   worktree in place; the reviewer removes it.
