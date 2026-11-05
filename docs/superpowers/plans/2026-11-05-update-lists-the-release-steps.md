# An update lists every step the release notes ask for — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** the update helper reads the steps of every version's by-hand section, whatever
its heading's first words, and reports each version whose notes ask for something by
hand that it read no step from; `/update` shows those versions instead of an update with
no steps; and a guard over Tropis's own `RELEASES.md` turns red when a reworded heading
drops steps again.

**Backlog item:** `update-lists-the-release-steps` in `feature-catalog.yaml` (type bug).
No spec: the design is this plan.

**One plan:** what becomes true is one sentence — an update shows every step the release
notes ask for by hand, or says which version's steps it could not read.

**Model tier: Small–medium.** The code, the tests and the command text are given below
nearly verbatim; the executor places them and runs the checks.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 5; do not open a pull request, write a review record
or merge.

**A fresh-agent check is owed, and the specifying session runs it:** the change alters
what `commands/update.md` tells an agent to do. The executor does not run it.

**What the specifying session verified on 2026-11-05, against `origin/main` at `770a494`
(node v22, Linux x86_64):**

- `scripts/update.mjs`, `stepsBetween(text, held, target)`, collects steps only from
  lines after a heading that `startsWith('### After updating')`. `fetchRelease()` puts
  its result in the JSON as `steps`; the early `target: null` output has `steps: []`.
  Nothing else in the repository calls `stepsBetween`.
- `RELEASES.md` headings its by-hand section `### After updating: what to do by hand` in
  0.4.0, 0.4.1, 0.4.2, 0.5.0, 0.5.1, 0.6.0 and 0.7.0, and `### What to do by hand` in
  0.7.2, 0.8.0, 0.8.1 and 0.8.2. So the helper reads no step from 0.7.2 on, 0.8.0's four
  required steps included. Every paragraph in the file that starts `**<n>. ` sits under
  one of those two headings (18 and 11 of them), so a numbered bold lead is a signal of
  a by-hand step independent of the heading.
- `commands/release.md` step 2 sets the format: the section has "its own heading",
  numbered steps, `Optional:` inside the bold lead of a step a project may skip. It does
  not fix the heading's words, and this plan does not either.
- `commands/update.md` reads `steps` in Stage 2, shows them in Stage 4, performs the
  required ones in Stage 6 item 6, and prints the optional ones and any required step
  not done at the end of Stage 8.
- The helper that runs during `/update` is the project's installed copy, from the version
  it holds. So the fix reaches a project's updates only after it has installed the
  release carrying it; the release note tells readers to look back at the missed steps.
- `guards/update.test.js` imports from `../scripts/update.mjs` and names the repository
  root `blueprint`; `RELEASES.md` is not export-ignored, so it is in the tree the
  self-check builds (`guards/readme-level.test.js` already reads it).
- `framework/DECISIONS.md`, FW-023, says in its *Consequences* that "the `After updating`
  heading and the numbered bold leads are a format". That is what this plan changes.

**Decided by the specifying session:**

- A by-hand section is a `###` heading whose text contains the words "by hand", in any
  case. Both headings in the notes match; no other heading in `RELEASES.md` does.
- The helper's JSON gains `unread`: the versions, in version order, whose notes either
  have a by-hand section with no step in it, or have a paragraph shaped as a step under
  a heading that is not a by-hand one. `/update` shows each such version and quotes that
  version's by-hand section, or its stray steps, from the clone's notes, so the user
  still sees what to do; it treats each instruction there as a required step unless it
  says it is optional.
- `stepsBetween` stays as a thin wrapper, so its name and result do not change.
- FW-023 gets a dated amendment, not a new decision.

---

## Delivers

update-lists-the-release-steps

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-update-steps-exec -b plan/update-lists-the-release-steps origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## The change — `scripts/update.mjs`

Replace the whole doc comment and function `stepsBetween` (from the `/**` line above
`export function stepsBetween` to its closing `}`) with:

```js
/** A `###` heading that names steps to do by hand, however it is worded. */
const BY_HAND = /^### .*\bby hand\b/i;
/** A paragraph that starts like a numbered step: `**<n>. `. */
const STEP = /^\*\*\d+\. /;

function byVersion(a, b) {
  if (a === b) return 0;
  return newer(parseVersion(a), parseVersion(b)) ? 1 : -1;
}

function paragraphs(lines) {
  return lines.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/**
 * What the release notes ask a project to do by hand, from each `## [x.y.z] — date`
 * section with held < x.y.z ≤ target, in version order. Steps are read from every
 * `###` subsection whose heading names steps to do by hand ("After updating: what to do
 * by hand" and "What to do by hand" alike). A step is a paragraph whose first line
 * starts `**<n>. `; it is optional when that lead starts `**<n>. Optional:`.
 * `unread` lists each version whose notes ask for something by hand that no step was
 * read from: a by-hand subsection with no step in it, or a paragraph shaped as a step
 * under any other heading.
 * @param {string} text
 * @param {string} held
 * @param {string} target
 * @returns {{ steps: { version: string, optional: boolean, text: string }[], unread: string[] }}
 */
export function releaseSteps(text, held, target) {
  const heldParts = parseVersion(held);
  const targetParts = parseVersion(target);
  const sections = [];
  let section = null;
  for (const line of text.split('\n')) {
    const heading = /^## \[(\d+\.\d+\.\d+)\] — /.exec(line);
    if (heading) {
      section = { version: `v${heading[1]}`, lines: [] };
      sections.push(section);
      continue;
    }
    if (line.startsWith('## ')) {
      section = null;
      continue;
    }
    if (section) section.lines.push(line);
  }

  const steps = [];
  const unread = [];
  for (const item of sections) {
    const parts = parseVersion(item.version);
    if (!parts || !heldParts || !targetParts) continue;
    if (!newer(parts, heldParts) || newer(parts, targetParts)) continue;
    let inHand = false;
    let hasHand = false;
    const hand = [];
    const other = [];
    for (const line of item.lines) {
      if (line.startsWith('### ')) {
        inHand = BY_HAND.test(line);
        if (inHand) hasHand = true;
        hand.push('');
        other.push('');
        continue;
      }
      (inHand ? hand : other).push(line);
    }
    const read = paragraphs(hand).filter((p) => STEP.test(p));
    for (const textOf of read) {
      steps.push({
        version: item.version,
        optional: /^\*\*\d+\. Optional:/.test(textOf),
        text: textOf,
      });
    }
    const stray = paragraphs(other).some((p) => STEP.test(p));
    if ((hasHand && read.length === 0) || stray) unread.push(item.version);
  }
  steps.sort((a, b) => byVersion(a.version, b.version));
  unread.sort(byVersion);
  return { steps, unread };
}

/** The steps alone, as `releaseSteps` reads them. */
export function stepsBetween(text, held, target) {
  return releaseSteps(text, held, target).steps;
}
```

`Array.prototype.sort` is stable, so steps of one version keep their order, as before.

In `fetchRelease()`:

1. The `target: null` output becomes
   `source, clone: null, held, target: null, breaking: false, steps: [], unread: [],`.
2. Before the final `process.stdout.write`, add
   `const { steps, unread } = releaseSteps(notes, held, target);` and in the object
   replace `steps: stepsBetween(notes, held, target),` with `steps,` and `unread,` on
   two lines.

## The change — `commands/update.md`

1. **Stage 2**, the sentence `Read \`source\`, \`clone\`, \`held\`, \`target\`, \`breaking\` and \`steps\`.`
   becomes `Read \`source\`, \`clone\`, \`held\`, \`target\`, \`breaking\`, \`steps\` and \`unread\`.`
2. **Stage 4**, add a bullet after the `every step from \`steps\`` bullet:

   ```
   - each version in `unread`, saying that its notes ask for something by hand that the
     helper could not read as steps. Quote that version's by-hand section from the
     clone's `RELEASES.md` (under its `## [x.y.z]` heading, the `###` heading that names
     what to do by hand, or else each paragraph that starts like a numbered step), so
     the user sees what it asks. Never show an update as having no steps while `unread`
     names a version
   ```
3. **Stage 6, item 6**, append after `Those are printed at the end and left to the user.`:

   ```
   Treat each instruction quoted for a version in `unread` (Stage 4) as a required
   step, unless it says it is optional.
   ```
4. **Stage 8**, in the list after `Then discard the clone. Print:`, add after
   `- any required step not done`:

   ```
   - each version in `unread`, and what was done about its quoted section
   ```

Keep the surrounding wrapping at the file's width (about 88 columns).

## The change — `framework/DECISIONS.md`

At the end of FW-023 (after its *Consequences* paragraph, before `## FW-024`), add,
with one blank line before and after:

```
**Amended 2026-11-05 — the section is found by what it is.** The notes renamed the
heading to *What to do by hand* in 0.7.2, and the helper, which matched the words
`After updating`, read no step from any release after, 0.8.0's required steps included,
with nothing saying any were missed. It now reads every `###` heading that names steps
to do by hand, reports each version whose notes ask for something by hand that it read
no step from, and a guard reads Tropis's own notes, so a reworded heading fails the
self-check. The numbered bold leads, and `Optional:` inside them, remain the format;
the heading's words do not.
```

## Tests — `guards/update.test.js`

1. Change the import `import { versionBreaks } from '../scripts/update.mjs';` to
   `import { releaseSteps, versionBreaks } from '../scripts/update.mjs';`.
2. In the existing case `returns only the steps between the held version and the
   target`, after the `expect(json.steps).toEqual([...]);` statement, add
   `expect(json.unread).toEqual([]);`.
3. Append, at the end of the file, these two `describe` blocks:

```js
const NOTES = `# Releases

## [Unreleased]

**1. Not a release yet.** Never read.

## [0.6.0] — 2026-10-04

### Steps to do by hand after updating

**1. Read a reworded heading.** Still a by-hand section.

## [0.5.2] — 2026-10-03

### What to do by hand

Delete the old folder; this section has no numbered step.

### Smaller corrections

- Nothing to do.

## [0.5.1] — 2026-10-02

### Manual work

**1. A step under another heading.** Not read as a step.

## [0.5.0] — 2026-10-01

### What to do by hand

**1. Required.** Do it.

**2. Optional: maybe.** Or not.

### What you can now do

- A change.

## [0.4.0] — 2026-09-30

### What to do by hand

Held already, so never reported.
`;

describe('releaseSteps', () => {
  it('reads every by-hand section and names each version it could not read', () => {
    const { steps, unread } = releaseSteps(NOTES, 'v0.4.0', 'v0.6.0');
    expect(steps).toEqual([
      { version: 'v0.5.0', optional: false, text: '**1. Required.** Do it.' },
      { version: 'v0.5.0', optional: true, text: '**2. Optional: maybe.** Or not.' },
      {
        version: 'v0.6.0',
        optional: false,
        text: '**1. Read a reworded heading.** Still a by-hand section.',
      },
    ]);
    expect(unread).toEqual(['v0.5.1', 'v0.5.2']);
  });

  it('reports nothing outside the versions between held and target', () => {
    const { steps, unread } = releaseSteps(NOTES, 'v0.5.2', 'v0.6.0');
    expect(steps.map((s) => s.version)).toEqual(['v0.6.0']);
    expect(unread).toEqual([]);
  });
});

describe("Tropis's own release notes", () => {
  const notes = readFileSync(join(blueprint, 'RELEASES.md'), 'utf8');
  // Versions whose section has a paragraph that starts like a numbered step, found
  // without the helper's heading match, so a reworded heading cannot hide them.
  const numbered = notes
    .split(/^(?=## \[)/m)
    .map((section) => [/^## \[(\d+\.\d+\.\d+)\] — /.exec(section), section])
    .filter(([heading, section]) => heading && /^\*\*\d+\. /m.test(section))
    .map(([heading]) => `v${heading[1]}`);
  const { steps, unread } = releaseSteps(notes, 'v0.0.0', 'v999.0.0');

  it('has numbered steps under both headings it has used', () => {
    expect(numbered).toEqual(expect.arrayContaining(['v0.7.0', 'v0.8.0']));
  });

  it('gives the update helper steps from every version that numbers one', () => {
    const read = new Set(steps.map((s) => s.version));
    expect(numbered.filter((v) => !read.has(v))).toEqual([]);
    expect(unread).toEqual([]);
  });
});
```

Cases that fail before the script change: both `releaseSteps` cases and both
`Tropis's own release notes` cases (import of a missing export fails the whole file, so
in practice every case in the file fails at Task 1; that is expected).

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards with
  the jest installed under `.self-check/`. Find where that happens and run
  `guards/update.test.js` that way; say the exact command in the handover.
- **The `## [Unreleased]` section is skipped** by the helper because its heading has no
  version; the `section = null` branch makes sure its lines never join the version
  below or above.
- **A colon followed by a space inside an unquoted backlog value breaks the YAML.**
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/update.mjs` | `releaseSteps`, `unread` in the JSON, `stepsBetween` kept as a wrapper |
| `guards/update.test.js` | the import, one assertion, two `describe` blocks |
| `commands/update.md` | `unread` read in Stage 2, shown in Stage 4, done in Stage 6, printed in Stage 8 |
| `framework/DECISIONS.md` | the FW-023 amendment |
| `RELEASES.md` | one bullet under `## [Unreleased]` replacing `_Nothing yet._` (Task 4) |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to cases (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's block removed (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-05-update-lists-the-release-steps.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the operator guide does not describe
how `/update` reads the notes; the decision record gets the amendment above; no upstream
queue, this repository is the upstream. The release note is one bullet, given in Task 4.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Make the `guards/update.test.js` change. Commit. Run the guard alone (*Traps*).
Expected: it fails (the import has no `releaseSteps`). Paste the error line.

### Task 2 — The script

Make the `scripts/update.mjs` change. Commit. Run the guard alone: every case passes.
Paste the `Tests:` line. Then, to show the guard catches a reworded heading, in a scratch
copy of the staged tree (never in the worktree) replace every `### What to do by hand`
in `RELEASES.md` with `### Manual steps`, run the guard there, and paste the failing case
names; it must fail `gives the update helper steps from every version that numbers one`.

### Task 3 — The command and the decision

Make the `commands/update.md` and `framework/DECISIONS.md` changes. Commit.

### Task 4 — Release note, backlog and board

1. In `RELEASES.md`, replace `_Nothing yet._` under `## [Unreleased]` with:
   `- An update shows again every step a release's notes ask you to do by hand, and names any version whose steps it could not read. Updates to 0.7.2 through 0.8.2 showed none of their steps: if you took one of those with /update, read the What to do by hand section of each version you passed, 0.8.0's above all, whose steps are required.`
2. In `feature-catalog.yaml`, on `update-lists-the-release-steps`: set
   `status: shipped` (if it does not read `building`, set it anyway and say so); leave
   `acceptanceCriteria` as they are; set `modules` to `scripts/update.mjs` and
   `commands/update.md`; add this plan to `refs`. Directly above the item add
   `# Shipped by docs/superpowers/plans/2026-11-05-update-lists-the-release-steps.md.`
   and one comment line per criterion naming the case that covers it: criterion 1,
   `releaseSteps` "reads every by-hand section and names each version it could not
   read"; criterion 2, "gives the update helper steps from every version that numbers
   one"; criterion 3, the same `releaseSteps` case for `unread`, plus the Stage 4 prose
   in `commands/update.md`, covered by the fresh-agent check the specifying session
   records in the merge commit.
3. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
4. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 5 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/update-lists-the-release-steps`. **Do not open a pull
   request**, write a review record, set auto-merge or merge. Leave the worktree in
   place.

## Handover report

**Task completion.** Tasks 0 to 5 done on branch `plan/update-lists-the-release-steps`.
Task 1 ran the guard red (the import has no `releaseSteps`). Task 2 made it green
(11 of 11). Task 3 changed `commands/update.md` and added the FW-023 amendment. Task 4
wrote the release note, shipped the backlog item with its criteria mapped, and removed
its band block. No pull request is open and nothing is merged, as the plan asks.

**Verification results.**

- Task 0: `git --version` 2.43.0, `node --version` v22.23.4, `uname -sm` Linux x86_64.
  `npm --prefix .tropis ci` ran; `git status --porcelain` was empty. The self-check at
  the branch base ended `Self-check passed: every guard caught its defect, the clean
  baseline passed, and the framework repository's own guards passed.` (exit 0).
- Task 1, guard on the commit with the tests only: `SyntaxError: The requested module
  '../scripts/update.mjs' does not provide an export named 'releaseSteps'`; `Test Suites:
  1 failed`, `Tests: 0 total`.
- Task 2, guard alone on the script commit: `Tests: 11 passed, 11 total` (`Test Suites:
  1 passed`).
- Task 2, planted rename on a scratch export of HEAD, `### What to do by hand` replaced
  by `### Manual steps` in `RELEASES.md` (4 headings): `Tests: 1 failed, 10 passed, 11
  total`. The failing case is `Tropis's own release notes > gives the update helper
  steps from every version that numbers one`.
- Guard alone, the way the self-check runs it: the self-check stages `git archive HEAD`,
  writes `{"type":"module"}` to the stage's `package.json`, copies
  `templates/framework-jest.config.js` to `jest.config.js`, and symlinks its `node_modules`.
  The command run in such an export was
  `node --experimental-vm-modules .self-check/node_modules/.bin/jest --config jest.config.js guards/update.test.js`,
  using Jest 30.5.2, with Node v22.23.4 and git 2.43.0 on Linux x86_64.
- Task 4, `npm --prefix .tropis test`: `Test Suites: 13 passed, 13 total`, `Tests: 188
  passed, 188 total`. This runs the installed release's checks, so it does not show this
  change; the guard runs above do.
- Task 5, self-check on the committed branch: see the last line of the run recorded after
  the handover commit, below.

**Scope.** `git diff --stat origin/main...HEAD` (before this handover commit):

```
RELEASES.md                   |  2 +-
commands/update.md            | 11 ++++-
docs/backlog-board/bands.yaml | 15 -------
feature-catalog.yaml          | 10 ++++-
framework/DECISIONS.md        |  9 +++++
guards/update.test.js         | 94 +++++++++++++++++++++++++++++++++++++++++++-
scripts/update.mjs            | 75 +++++++++++++++++++++++++---------
7 files changed, 176 insertions(+), 40 deletions(-)
```

Each is in *File Structure*. `docs/backlog-board/index.html` was not touched: the board hook
did not stage it.

**Judgment calls.**

- The Stage 4 bullet, Stage 6 sentence and Stage 8 bullet in `commands/update.md` are
  the plan's text, placed at the file's own indentation.
- The feature-catalog comments for the three criteria name the cases in
  `guards/update.test.js`, as the plan says. Criterion 3 also names the Stage 4 prose,
  which is covered only by the fresh-agent check the specifying session runs.
- The item's `status` was `building`, so it is now `shipped`.
- The planted-rename check was run in a scratch export, never in the worktree.
- The guard-alone command above was run on an export of HEAD, not on the worktree, since
  the runner exports HEAD and the commits had to land first.

**What the plan got wrong.** Task 1 says "commit, run the guard alone". A guard run on
HEAD sees only committed content, so the change has to be committed before the run
shows anything, as the plan's own *Traps* say. The plan's note that every case fails at
Task 1 holds: the import failure takes the whole file down with `Tests: 0 total`.

**Process incident.** A stray shell command, run before Task 1, waited on stdin and was
stopped. It left an empty file outside the repository, which was removed. Nothing
under the worktree changed because of it.

**Outstanding.** The change has no screen, so there is no developer check and no
`/manual-check` entry. Owed by the specifying session, not this executor: the fresh-agent
check on `commands/update.md` and `framework/DECISIONS.md`, which the plan says the
specifying session runs and records in the merge commit. Release-note and backlog edits
are in `RELEASES.md` and `feature-catalog.yaml` as Task 4 says.
