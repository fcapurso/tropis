# A plan's date is checked against today in the project's time zone — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** the check that refuses a plan dated after today reads today in the time zone
`.tropis/project.json` names (UTC when it names none), computed from the current moment
and assembled from year, month and day parts, so the answer is the same on a UTC runner
and on the developer's machine whatever its clock zone or locale. The other guards that
compute today use the same function.

**Backlog item:** `plan-dates-follow-the-project-time-zone` in `feature-catalog.yaml`
(type bug). No spec: the backlog item and this plan.

**One plan:** what becomes true is one sentence — today, wherever a check needs it, is
the project's calendar day.

**Model tier: Small–medium.** Every line of code, every test and every document change is
given verbatim below; the work is applying them and running checks.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 6; do not open a pull request, write a review record
or merge.

**No fresh-agent check is owed:** nothing under `framework/` or `rules/` changes.

**What the specifying session verified on 2026-11-05, against `origin/main` at
`770a494` (git 2.43, node v22.23.4, Linux x86_64, a Claude Code cloud session):**

- `guards/catalog-drift.test.js`, test `no live plan filename is dated after today`,
  computes `const today = new Date().toISOString().slice(0, 10);` — UTC — and refuses a
  live plan whose file name's leading `YYYY-MM-DD` is greater than it. The guard sets
  `root` from `FRAMEWORK_ROOT` or two levels above itself; it already imports from
  `node:` modules and `yaml` only.
- The other guards that compute today the same way: `guards/dispatch.test.js` (two
  places: inside a test, `const today = new Date().toISOString().slice(0, 10);`, and at
  describe level, `const today = () => new Date().toISOString().slice(0, 10);`),
  `guards/subscriptions.test.js` (`const TODAY = new Date().toISOString().slice(0, 10);`)
  and `guards/sprint.test.js` (`const today = new Date().toISOString().slice(0, 10);`).
  Each writes a `**Last verified: <today>.**` picks file that `scripts/plan-binding.js`
  judges stale after 45 days from `Date.parse(\`${iso}T00:00:00Z\`)` — UTC — so these
  keep UTC (`todayIn()` with no zone), not the project's zone.
- `.tropis/project.json` is read today by `scripts/pipeline.mjs` (`ungated`) as plain
  JSON; a missing, unreadable or non-object file means the key is absent. No guard
  asserts the set of keys it may hold. `templates/README.md` (the operator guide a
  project receives as `.tropis/README.md`) lists them at the line starting
  "`.tropis/project.json` holds the project's own settings".
- Shipped scripts reach a project through `scripts/installed-scripts.txt`: setup
  (`scripts/set-up-project.sh`), the conformance run (`scripts/check-conformance.sh`,
  which copies each listed script into `.tropis/scripts/`) and several guards read it.
  Guards import shipped scripts as `../scripts/<name>` (for example
  `guards/dispatch.test.js` imports `../scripts/plan-binding.js`), which resolves both in
  the source tree and in a project's `.tropis/guards/`. `guards/check-drift.test.js`
  requires every shipped script to contain the text `Shared machinery`.
- The conformance defect `future-dated-plan` (`fixtures/defects/future-dated-plan/`,
  case `future-dated-plan:catalog-drift`) plants `2099-06-01-future.md`; the base fixture
  has no `.tropis/project.json` time zone, so it stays UTC and stays refused.
- Nothing fakes a module with `jest.unstable_mockModule` or `jest.mock` for a script the
  new module would replace; `scripts/today.js` is new, so nothing fakes it.
- The installed release in this repository (`.tropis/`) keeps its UTC check until a
  release is installed; that is expected.

## Decisions (made by the specifying session; the developer left them to it)

1. **The setting is `"timeZone"` in `.tropis/project.json`**, an IANA name such as
   `"Europe/Rome"`, beside `name`, `public` and `ungated`. Rejected: the machine's own
   clock zone, which makes a UTC runner and the developer's machine disagree — the very
   failure the item fixes.
2. **No key, no file, or an unreadable file means UTC**, as `pipeline.mjs` treats
   `ungated`, so a project that sets nothing behaves as before. **A key that is not a
   time zone throws**, naming the file and the key: a typo must not quietly fall back.
3. **One module, `scripts/today.js`**, shipped like every script, exporting `todayIn`,
   `projectTimeZone`, `projectToday` and `plansDatedAfter`. The date is assembled from
   `Intl.DateTimeFormat#formatToParts` with the locale `en-US`, the `gregory` calendar
   and `latn` digits fixed, never from a formatted string.
4. **The check stays exact**: a plan dated one day after today in the zone is refused.
   The backlog band records the rejected one-day margin.
5. **This repository names no zone**: the developer's zone is not recorded anywhere here,
   and guessing it would be worse than UTC. They can add it.
6. **No decision record entry**: the choice between the project's zone and the
   machine's is recorded in the backlog item's acceptance criteria and here; it changes
   no mechanism a later decision builds on.

## Delivers

plan-dates-follow-the-project-time-zone

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-plan-dates-tz -b plan/plan-dates-follow-the-project-time-zone origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Do not lower, skip or delete a guard or a test.**
- **Every commit has a body.**
- **This repository is public.** No home paths, hostnames, personal or computer names.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.

## Traps

- `bash scripts/check-blueprint.sh` checks **committed** content only: commit before
  running it.
- Set up the worktree before its suite: `npm --prefix .tropis ci` inside it. Never borrow
  the main checkout's `node_modules`.
- `npm --prefix .tropis test` runs the *installed* release's guards against this
  repository, so it does not exercise the new code. It must still pass; the source is
  checked by the self-check and by running the source guards directly (Task 5).
- Keep the test name `no live plan filename is dated after today` unchanged.
- Do not set `timeZone` in this repository's own `.tropis/project.json` (Decision 5, and
  `.tropis/` is not edited).

## File Structure

| File | Change |
|---|---|
| `scripts/today.js` | new: the shared date function |
| `scripts/installed-scripts.txt` | ships `today.js` |
| `guards/today.test.js` | new: unit tests of the module |
| `guards/catalog-drift.test.js` | the future-dated check reads today in the project's zone |
| `guards/dispatch.test.js` | its two `today`s use `todayIn()` |
| `guards/subscriptions.test.js` | its `TODAY` uses `todayIn()` |
| `guards/sprint.test.js` | its `today` uses `todayIn()` |
| `templates/README.md` | the operator guide names the setting |
| `feature-catalog.yaml` | the item to `shipped`, `modules` set, a comment mapping criteria to evidence |
| `docs/backlog-board/bands.yaml` | `seen.status` follows the item |
| `docs/superpowers/plans/2026-11-05-plan-dates-follow-the-project-time-zone.md` | the handover report |

## Tasks

### Task 1 — the module

Create `scripts/today.js` with exactly:

```js
// Shared machinery: no part of this file is project-owned.
/**
 * Today's date in the project's time zone, as YYYY-MM-DD.
 *
 * `.tropis/project.json` may name an IANA time zone as `"timeZone"`; without one, today
 * is UTC's. The date is assembled from the year, month and day parts Intl gives for that
 * zone, with the locale, calendar and digits fixed, so neither the machine's clock zone
 * nor its locale changes the answer.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} [timeZone] an IANA time zone; UTC when omitted
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD
 */
export function todayIn(timeZone = 'UTC', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}

/**
 * The time zone `.tropis/project.json` names as `"timeZone"`, or UTC. A missing,
 * unreadable or non-object file, or no key, is UTC. A key that is not a time zone
 * throws, naming the file, so a typo does not fall back to UTC unseen.
 * @param {string} root the project root
 * @returns {string}
 */
export function projectTimeZone(root) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(join(root, '.tropis', 'project.json'), 'utf8'));
  } catch {
    return 'UTC';
  }
  if (!doc || typeof doc !== 'object' || doc.timeZone === undefined) return 'UTC';
  const zone = doc.timeZone;
  try {
    if (typeof zone !== 'string' || zone === '') throw new RangeError();
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    throw new Error(
      `.tropis/project.json: "timeZone" must be an IANA time zone such as "Europe/Rome", not ${JSON.stringify(zone)}.`,
    );
  }
  return zone;
}

/**
 * Today in the project's time zone.
 * @param {string} root the project root
 * @param {Date} [now]
 */
export const projectToday = (root, now = new Date()) => todayIn(projectTimeZone(root), now);

/**
 * The plan file names, `YYYY-MM-DD-<slug>.md`, dated after `today`.
 * @param {string[]} names
 * @param {string} today YYYY-MM-DD
 * @returns {string[]}
 */
export function plansDatedAfter(names, today) {
  return names.filter((n) => {
    const m = /^(\d{4}-\d{2}-\d{2})-/.exec(n);
    return m !== null && m[1] > today;
  });
}
```

Append the line `today.js` to `scripts/installed-scripts.txt`, keeping the file's
existing order convention (if the list is alphabetical, insert it in order; otherwise
append it), and keep the trailing newline.

### Task 2 — its tests

Create `guards/today.test.js` with exactly:

```js
// Level: unit
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { plansDatedAfter, projectTimeZone, projectToday, todayIn } from '../scripts/today.js';

const here = dirname(fileURLToPath(import.meta.url));
const script = pathToFileURL(resolve(here, '../scripts/today.js')).href;

// 2026-11-05 at 23:30 UTC: already the 6th in Rome, still the 5th in UTC.
const LATE = new Date('2026-11-05T23:30:00Z');

/** A project root whose .tropis/project.json holds `text`, or none when undefined. */
function project(text) {
  const root = mkdtempSync(join(tmpdir(), 'today-'));
  mkdirSync(join(root, '.tropis'));
  if (text !== undefined) writeFileSync(join(root, '.tropis', 'project.json'), text);
  return root;
}

describe('todayIn', () => {
  it('is the UTC date when no zone is named', () => {
    expect(todayIn(undefined, LATE)).toBe('2026-11-05');
  });

  it('is the date in the named zone', () => {
    expect(todayIn('Europe/Rome', LATE)).toBe('2026-11-06');
    expect(todayIn('America/Los_Angeles', LATE)).toBe('2026-11-05');
    expect(todayIn('America/Los_Angeles', new Date('2026-11-05T03:00:00Z'))).toBe('2026-11-04');
  });

  it('gives the same answer whatever the machine clock zone and locale', () => {
    const code = `import { todayIn } from ${JSON.stringify(script)};
const at = new Date('2026-11-05T23:30:00Z');
process.stdout.write(todayIn('Europe/Rome', at) + ' ' + todayIn(undefined, at));`;
    for (const [TZ, LANG] of [
      ['Pacific/Kiritimati', 'ar_EG.UTF-8'],
      ['America/Adak', 'th_TH.UTF-8'],
      ['UTC', 'C'],
    ]) {
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        env: { ...process.env, TZ, LANG, LC_ALL: LANG },
        encoding: 'utf8',
      });
      expect(r.stderr).toBe('');
      expect(`${TZ} ${r.stdout}`).toBe(`${TZ} 2026-11-06 2026-11-05`);
    }
  });
});

describe('projectTimeZone', () => {
  const roots = [];
  const at = (text) => {
    const root = project(text);
    roots.push(root);
    return root;
  };
  afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

  it('is UTC with no settings file, no key, or a file that is not JSON', () => {
    expect(projectTimeZone(at(undefined))).toBe('UTC');
    expect(projectTimeZone(at('{ "name": "Example" }'))).toBe('UTC');
    expect(projectTimeZone(at('not json'))).toBe('UTC');
  });

  it('is the zone the settings file names', () => {
    expect(projectTimeZone(at('{ "timeZone": "Asia/Tokyo" }'))).toBe('Asia/Tokyo');
  });

  it('refuses a name that is not a time zone, naming the file and the key', () => {
    for (const bad of ['"Mars/Olympus_Mons"', '""', '5']) {
      expect(() => projectTimeZone(at(`{ "timeZone": ${bad} }`))).toThrow(
        /\.tropis\/project\.json: "timeZone" must be an IANA time zone/,
      );
    }
  });

  it('dates a plan written just after midnight in the zone ahead of UTC, and refuses one a day later', () => {
    // 11:00 UTC on the 5th is already the 6th in Kiritimati (UTC+14).
    const now = new Date('2026-11-05T11:00:00Z');
    const names = ['2026-11-05-a.md', '2026-11-06-b.md', '2026-11-07-c.md', 'notes.md'];
    const ahead = projectToday(at('{ "timeZone": "Pacific/Kiritimati" }'), now);
    expect(ahead).toBe('2026-11-06');
    expect(plansDatedAfter(names, ahead)).toEqual(['2026-11-07-c.md']);
    const utc = projectToday(at(undefined), now);
    expect(utc).toBe('2026-11-05');
    expect(plansDatedAfter(names, utc)).toEqual(['2026-11-06-b.md', '2026-11-07-c.md']);
  });
});
```

Run it once Task 3 is done, as Task 5 says, and fix the work (not the expectations) if
it fails. If `todayIn('Europe/Rome', LATE)` is not `2026-11-06`, the Node build lacks full
ICU: stop and report it under *Outstanding*.

### Task 3 — the guards use it

In `guards/catalog-drift.test.js`:

- add the import line `import { plansDatedAfter, projectToday } from '../scripts/today.js';`
  after the `import YAML from 'yaml';` line;
- replace the body of the test `no live plan filename is dated after today` with:

```js
    const future = plansDatedAfter(
      livePlanFiles().map((f) => basename(f)),
      projectToday(root),
    );
    expect(future).toEqual([]);
```

In `guards/dispatch.test.js`, `guards/subscriptions.test.js` and `guards/sprint.test.js`:
add `import { todayIn } from '../scripts/today.js';` after each file's last existing
`import` line, and replace each `new Date().toISOString().slice(0, 10)` with `todayIn()`
(dispatch: two places; subscriptions: one; sprint: one). Nothing else in those files
changes.

**Check:** `grep -rn "toISOString().slice(0, 10)" guards` prints nothing when done; before
Task 3 it prints the five lines named above.

### Task 4 — the operator guide

In `templates/README.md`, change the line

```
`.tropis/project.json` holds the project's own settings: `name`, `public` and `ungated`.
```

to

```
`.tropis/project.json` holds the project's own settings: `name`, `public`, `ungated` and
`timeZone`.
```

and, directly after the paragraph that starts "The display name is", insert a blank line
and this paragraph:

```
**Plans are dated on your calendar.** A plan's file name starts with the day it was
written, and a check refuses one dated after today. Today is the UTC date unless the
file names a time zone, as `{ "timeZone": "Europe/Rome" }` (an IANA name). Name yours if
you work far from UTC: otherwise a plan written in the first hours of your day is
refused until UTC reaches the same date. A name that is not a time zone fails the check
and says so.
```

### Task 5 — verify, then commit

Commit Tasks 1–4 as one commit with a body. Then run, from the worktree, and record each
command with its full summary output:

1. The source guards, from a scratch stage built the way `scripts/check-blueprint.sh`
   builds its own (the source guards are ES modules and the repository root has no
   package file, so they cannot run from the worktree as they stand). With `S` a fresh
   directory under the system's temporary folder:

   ```bash
   npm --prefix .tropis ci          # once, in the worktree
   git archive HEAD | tar -x -C "$S"
   echo '{"type":"module"}' > "$S/package.json"
   cp templates/framework-jest.config.js "$S/jest.config.js"
   ln -s "$PWD/.tropis/node_modules" "$S/node_modules"
   (cd "$S" && node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js \
     guards/today.test.js guards/catalog-drift.test.js guards/dispatch.test.js \
     guards/subscriptions.test.js guards/sprint.test.js)
   ```

   Passes: every suite `PASS`. Before Task 1 the `today` suite does not exist and Jest
   reports it cannot find `../scripts/today.js` — a different output.
2. **Red check:** make a throwaway commit that adds
   `docs/superpowers/plans/2099-01-01-probe.md` (any content), rebuild the stage from that
   commit and run the catalog-drift guard as in step 1 and see `no live plan filename is dated after today` fail naming
   that file; then `git reset --hard HEAD~1`. Record both outputs.
3. `bash scripts/check-blueprint.sh` — ends with `Self-check passed`.
4. `npm --prefix .tropis test` — passes.

On a failure: fix the work and run again. If a guard other than the ones above fails for
a reason unrelated to this change, stop and report it.

### Task 6 — close out

- In `feature-catalog.yaml`, item `plan-dates-follow-the-project-time-zone`: `status:
  shipped`, `modules: [scripts/today.js]` (block style, as neighbouring items write it),
  and directly above the item a comment mapping each acceptance criterion to its
  evidence (the test names in `guards/today.test.js` and the catalog-drift change).
  Keep `refs` as it is.
- In `docs/backlog-board/bands.yaml`, the item's `seen.status` to `shipped`.
- The board is generated, not committed (`docs/backlog-board/` holds only
  `bands.yaml`): there is nothing to rebuild.
- Append `## Handover report` to this plan (six sections: Task completion, Verification
  results, Scope, Judgment calls, What the plan got wrong, Outstanding), naming the tool,
  version, operating system and architecture for every result. Commit, then re-run
  Task 5's steps 1, 3 and 4 against that commit and put their final output in the report
  (amend that commit with it). Push the branch:
  `git push -u origin plan/plan-dates-follow-the-project-time-zone`.
