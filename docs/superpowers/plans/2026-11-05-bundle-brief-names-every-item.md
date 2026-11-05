# A bundle's brief names every backlog item in it — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `sprint.mjs brief <id>`, for the first backlog item of a sprint bundle, names
every backlog item the bundle carries and says to deliver them as one plan and end with
one line only once all have shipped; `brief` and `launch` refuse an id that a bundle's
first carries, naming that first.

**Backlog item:** `bundle-brief-names-every-item` in `feature-catalog.yaml` (type bug).
No spec: the design is this plan, under `docs/superpowers/specs/2026-11-01-sprint-design.md`
("A bundle gets one plan … and one team member … and the bundle reports one final line").

**One plan:** what becomes true is one sentence — a team member started on a bundle is
briefed with every backlog item the bundle carries.

**Model tier: Small–medium.** The code and the test are given verbatim; the executor
places them and runs the checks.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 4; do not open a pull request or merge.

**No fresh-agent check is owed:** nothing under `framework/`, `rules/` or `commands/`
changes. `commands/sprint.md` already says a bundle gets "one brief, for the bundle's
first backlog item, naming the others"; this plan makes the script do what it says.

**What the specifying session verified on 2026-11-05, against `origin/main` at `8f36064`
(node v22, Linux x86_64):**

- `scripts/sprint.mjs`, `brief(ctx, opts)`, prints a brief for `opts.ids[0]` alone. Its
  first line is ``Take the backlog item `<id>` (<title>) in `feature-catalog.yaml` to
  shipped.`` and nothing names the bundle's other items.
- `teamMembers(sprint)` already groups the sprint's entries: an entry alone, or a bundle
  at its first entry, with `carried` holding every id the member carries, in sprint
  order. `archive` uses it and refuses a non-first id with
  ``Sprint: ${id} is carried by ${member.id}'s team member; name ${member.id}.``
- `launch(ctx, opts)` calls `brief` (unless `TROPIS_TEAM_PROMPT` names a prompt file)
  after it has added the worktree, so a refusal from `brief` alone would leave a
  worktree behind for an id that should never have been launched.
- The sprint's 2026-11-05 bundle `readme-outline` had its brief extended by hand to name
  its second item; without that its session would have shipped one and stopped.
- `guards/sprint.test.js`, `describe('brief')`, holds one case built with `makeWorld`,
  `entry`, `row` and `makeClone`; `row(band, value, effort, { bundle })` puts an entry in
  a bundle (see the `archiving team members' sessions` block).

**Decided by the specifying session:**

- A bundle's brief names each carried item with its title, in sprint order, and joins
  the design lines of all of them, each spec once.
- A brief for an id carried by another member is refused, with the same words `archive`
  uses; `launch` checks this before anything else, so it adds no worktree.
- A bundle of one (the others dropped) gets the brief of an item alone.

---

## Delivers

bundle-brief-names-every-item

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-bundle-brief-exec -b plan/bundle-brief-names-every-item origin/main` |

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

## The change — `scripts/sprint.mjs`

1. In the header comment, replace the line
   `` *   sprint.mjs brief <id>                        the team member's brief``
   with:

   ```
    *   sprint.mjs brief <id>     the team member's brief; for a bundle, named by its first
    *       backlog item, it names every one the bundle carries. Exit 1 for an id another
    *       team member carries, naming that one
   ```

2. Add this function directly above `function archive(ctx, opts) {`:

   ```js
   /** The team member carrying `id`; refuses when that member is named by another id. */
   function requireMember(sprint, id) {
     const member = teamMembers(sprint).find((m) => m.carried.includes(id));
     if (member.id !== id) throw new Refusal(`Sprint: ${id} is carried by ${member.id}'s team member; name ${member.id}.`);
     return member;
   }
   ```

   and in `archive`, replace the two lines

   ```js
       const member = teamMembers(current).find((m) => m.carried.includes(id));
       if (member.id !== id) throw new Refusal(`Sprint: ${id} is carried by ${member.id}'s team member; name ${member.id}.`);
   ```

   with `    const member = requireMember(current, id);`.

3. In `launch`, directly after its `requireEntry(sprint, id);` line, add
   `  requireMember(sprint, id);`.

4. Replace the whole function `brief` with:

   ```js
   function brief(ctx, opts) {
     const sprint = requireSprint(ctx);
     const id = opts.ids[0];
     requireEntry(sprint, id);
     const { carried } = requireMember(sprint, id);
     const backlog = ctx.backlog();
     const items = carried.map((c) => requireInBacklog(backlog, c));
     const specs = [...new Set(items.flatMap((e) => (e.refs ?? []).filter((r) => r.includes('/specs/'))))]
       .map((r) => `\`${r}\``);
     const take = items.length === 1
       ? [`Take the backlog item \`${id}\` (${items[0].title}) in \`feature-catalog.yaml\` to shipped.`]
       : [
         `Take every backlog item of this bundle in \`feature-catalog.yaml\` to shipped:`,
         ...items.map((e) => `- \`${e.id}\` (${e.title})`),
         'They are one plan and one team member: shape, claim and merge them together, and',
         'end with SHIPPED only once every one of them has shipped.',
       ];
     return [
       ...take,
       ...(specs.length ? [`Its design: ${specs.join(', ')}.`] : []),
       '',
       'Follow `.claude/framework/workflow.md`, *Delivering a backlog item*, from the wait for what it',
       'is blocked by to the merge: take the merge token yourself and land your own pull',
       'requests. The developer has agreed this sprint, so make the decisions yourself and',
       'report each one. Stop only for what that section allows.',
       '',
       'Run every agent signed in to the plan the developer already pays for, never on a key',
       'billed per use.',
       '',
       'End your last message with exactly one line: SHIPPED, PARKED: <why> or STOPPED: <why>.',
     ];
   }
   ```

## Tests — `guards/sprint.test.js`

Inside `describe('brief', () => { … })`, after the existing `it(…)` case and before the
block's closing `});`, add:

```js
  it('† names every backlog item a bundle carries, and refuses an id the bundle\'s first carries', () => {
    const world = makeWorld([
      entry('k1', { title: 'Kiln one', refs: ['docs/superpowers/specs/k.md'] }),
      entry('k2', { title: 'Kiln two', refs: ['docs/superpowers/specs/k.md', 'docs/superpowers/specs/k2.md'] }),
      entry('solo', { title: 'Alone' }),
    ], {
      k1: row('A', 3, 2, { bundle: 'kiln' }), k2: row('A', 3, 2, { bundle: 'kiln' }), solo: row('A', 3, 1),
    });
    const clone = makeClone(world);
    expect(run(clone, ['start', 'k1', 'k2', 'solo']).status).toBe(0);

    const k = run(clone, ['brief', 'k1']);
    expect(k.status).toBe(0);
    expect(k.stdout).toBe(BRIEF('k1', 'Kiln one', '`docs/superpowers/specs/k.md`, `docs/superpowers/specs/k2.md`')
      .replace('Take the backlog item `k1` (Kiln one) in `feature-catalog.yaml` to shipped.\n', [
        'Take every backlog item of this bundle in `feature-catalog.yaml` to shipped:',
        '- `k1` (Kiln one)',
        '- `k2` (Kiln two)',
        'They are one plan and one team member: shape, claim and merge them together, and',
        'end with SHIPPED only once every one of them has shipped.',
        '',
      ].join('\n')));
    expect(run(clone, ['brief', 'solo']).stdout).toBe(BRIEF('solo', 'Alone', null));

    const refused = run(clone, ['brief', 'k2']);
    expect(refused.status).toBe(1);
    expect(refused.stdout).toBe("Sprint: k2 is carried by k1's team member; name k1.\n");
  });
```

If `start` orders the entries differently from `k1, k2, solo` (it keeps the order given)
or puts `k2` first in the bundle, read why before changing the test, and say so in the
handover.

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it** (`CLAUDE.md`, *Gotchas*): in an
  export of `HEAD` made with `git archive`, write a `{"type":"module"}` package file,
  copy `templates/framework-jest.config.js` to `jest.config.js`, link a `node_modules`
  holding Jest (the self-check installs one under `.self-check/`), and run
  `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/sprint.test.js`.
  Say the exact commands in the handover.
- **`brief`'s notes go to stderr** (see `main`); assert on stdout only.
- **A colon followed by a space inside an unquoted backlog value breaks the YAML.**
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/sprint.mjs` | header line, `requireMember`, `archive` and `launch` use it, `brief` rewritten |
| `guards/sprint.test.js` | one case in `describe('brief')` |
| `RELEASES.md` | one bullet under `## [Unreleased]` (Task 3) |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping criteria to cases (Task 3) |
| `docs/backlog-board/bands.yaml` | the item's block removed (Task 3) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-05-bundle-brief-names-every-item.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: `commands/sprint.md` and the workflow
already describe a bundle's brief as naming the others; no decision was between real
alternatives worth a record; no rule; no upstream queue, this repository is the
upstream. The release note is one bullet, given in Task 3.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The test, red

Make the `guards/sprint.test.js` change. Commit. Run the guard alone (*Traps*).
Expected: the new case fails on the `brief k1` output. Paste the failing assertion's
first lines.

### Task 2 — The script

Make the `scripts/sprint.mjs` change. Commit. Run the guard alone: every case passes.
Paste the `Tests:` line.

### Task 3 — Release note, backlog and board

1. In `RELEASES.md`, under `## [Unreleased]`, add (replacing `_Nothing yet._` if that is
   all the section holds, otherwise as a new bullet at its end):
   `- A sprint's brief for a bundle names every backlog item in it, so the team member delivers them all instead of stopping after the first. Asking for the brief of a bundle's later item now names the item to ask for instead.`
2. In `feature-catalog.yaml`, on `bundle-brief-names-every-item`: set `status: shipped`
   (if it does not read `building`, set it anyway and say so); leave
   `acceptanceCriteria` as they are; set `modules` to `scripts/sprint.mjs`; add this plan
   to `refs` if it is not there. Directly above the item, below its existing comment,
   add `# Shipped by docs/superpowers/plans/2026-11-05-bundle-brief-names-every-item.md.`
   and one line: `# Criteria 1 to 3: "names every backlog item a bundle carries, and refuses an id the bundle's first carries" (guards/sprint.test.js).`
3. In `docs/backlog-board/bands.yaml`, delete the item's block, nothing else.
4. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 4 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with six sections: Task completion,
   Verification results (each command, its output, and the tool, version, operating
   system and architecture — never the computer's name), Scope, Judgment calls, What the
   plan got wrong, Outstanding (say the change has no screen, so there is no developer
   check). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/bundle-brief-names-every-item`. **Do not open a pull
   request** or merge. Leave the worktree in place.
