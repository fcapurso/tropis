# The framework is released from a green self-check — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Task 4 stops for the developer; do not start Task 5 before it is
> resolved.

**Goal:** The framework can be released: a CI job runs the self-check on every push, and
a release job started by hand runs it again and, only if it passes, moves the notes'
Unreleased section under the next version, tags it and pushes — and the self-check no
longer borrows another project's test tools.

**Spec:** `docs/superpowers/specs/2026-10-15-framework-is-developed-with-itself-design.md`,
§2 and §3 *Step 1*. Read both sections before starting. This is step 1 of two; step 2
(installing the release here) is a later plan.

**What this delivers:** nothing ships. `framework-is-developed-with-itself` completes with
step 2's plan; this plan advances it. Its criteria this plan makes true: the first three
(release job, self-check on every push, self-check stands alone) and, after merge, the
fifth (v0.1.0 exists, see *After merge*).

**What the specifying session verified on 2026-10-15, against `main` at `d43106c`:**

- The repository has no tags, no `.github/`, no `.gitignore`, no `.gitattributes`, no
  `RELEASES.md`, and no `package.json` at the root.
- `scripts/check-blueprint.sh` requires `NODE_MODULES` (line 20) and exits otherwise. With
  `NODE_MODULES=../first-adopter/.framework/node_modules` it passes on `main`: 12 defects
  caught, clean baseline ok.
- Every guard the self-check runs gets `FRAMEWORK_ROOT` pointed at the composed sample
  project (`scripts/check-conformance.sh`, lines 106, 112, 123), and the stage's Jest
  config has the single root `<rootDir>/guards` (`templates/framework-jest.config.js`).
  So no guard reads the stage's own backlog or plans. Recorded in the spec, §3.
- `templates/package.json` names exactly `jest` (^29.5.0) and `yaml` (^2.9.0) — what a
  set-up project installs in `.framework/`.
- `guards/framework-integrity.test.js` fails on any backticked path starting `src/`,
  `docs/`, `scripts/`, `.claude/` or `.github/` in the shipped rules, framework documents,
  commands or entry-file template that does not exist in the sample project. See
  *Global Constraints*.
- Two shipped documents name the borrowed tools: `commands/flush-upstream.md` line 53 and
  `framework/DECISIONS.md` line 180 (FW-005's 2026-10-07 amendment).
- `README.md` *Getting started* step 1 reads "Clone this blueprint anywhere outside the
  project." It names no release. `guards/readme-usable.test.js` makes no assertion about
  step 1's wording.
- The GitHub repository `fcapurso/claude-project-framework` is private, default branch
  `main`; branch protection is unavailable on its plan (the API answers 403), so nothing
  stops the release job pushing to `main`.
- Node 22.15.0, git 2.49.0, on the developer's Mac.

**Model tier: Medium.** The code is given verbatim; the first CI run on Linux may need
independent debugging inside the approach the plan states.

**Requires:** network access (npm install, pushing to GitHub), the `gh` CLI signed in to an account that can push to the repository, and the developer for Task 4.

**Merge authority: parent review.** It adds the pipeline every later release goes through.

Do not store a kick-off prompt on this plan.

---

## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-releases -b plan/framework-releases-from-a-green-self-check` |
| worked example (`first-adopter`) | do not edit | |

## Global Constraints

- **No new dependency.** The self-check installs exactly what `templates/package.json`
  names. The repository gains no `package.json` at the root.
- **Nothing is published.** No npm publish, no GitHub Release object. A release is a
  commit promoting the notes and an annotated tag `vX.Y.Z`.
- **Versions:** the first release is `0.1.0`. Below 1.0, a `major` bump raises the middle
  number and resets the last; `minor` and `patch` raise the last. From 1.0, ordinary
  semantic versioning. There is no route from 0.x to 1.0 in this plan; that is decided
  when 1.0 is due.
- **Notes readers:** people who set up and run projects with the framework.
- **No backticked repository-only path in a shipped document.** In `rules/`,
  `framework/`, `commands/` and `templates/CLAUDE.md`, never write a backticked path
  starting `.github/` or naming `RELEASES.md` under `docs/` — the integrity guard checks
  them against a sample project that does not have them.
- **Do not lower, skip or delete a guard to get green.**
- **An agent never starts the release job.** Only the developer does, after merge.
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Review Focus

Inputs no task's tests reach, most likely first:

1. **The release job's git half** — commit, tag and push — runs for the first time after
   merge. Expected: one commit `chore(release): v0.1.0` on `main`, one annotated tag
   `v0.1.0`, both pushed together or neither. Task 3 makes the push `--atomic` and
   refuses any ref but `main`; *After merge* checks the result.
2. **`main` moves while the release job runs.** Expected: the push is refused as
   non-fast-forward, no tag lands, the job fails, and the developer starts it again.
   Covered by `--atomic`; not tested.
3. **Linux differences** in the shipped hooks and scripts the self-check exercises
   (GNU `sed`, `find`, `mktemp`). Expected: the self-check passes on `ubuntu-latest` as on
   macOS. Task 3 runs it there before merge.
4. **A stale tool install.** `templates/package.json` changes on a branch. Expected: the
   next local self-check reinstalls before running. Task 2 tests it.
5. **The notes still say `(ask)`** when someone starts the release job. Expected: the job
   fails before committing anything. Task 1 tests the refusal.

## Traps

- **The dispatch prompt may tell you to isolate with `.framework/scripts/isolate-for-plan.sh`,
  which this repository does not have yet** (step 2 installs it). Create the one worktree
  by running the Repositories row's command from this checkout.
- **Any text matching the worktree command outside a Repositories table makes a plan
  undispatchable** (`guards/plan-dispatchable.test.js`). Do not write it anywhere else.
- **`check-blueprint.sh` checks committed content only** (`git archive HEAD`). Commit
  before running it.
- **The page checks skip inside `check-blueprint.sh`** (`readme-usable` and
  `operator-page-closeout` look for `bootstrap.md` in their root, and the self-check
  points them at the sample project). Task 3 runs them separately.
- **The release job cannot be tried before merge.** It refuses any ref but `main`, by
  design. Its arithmetic and notes handling are tested in Task 1; its git half is checked
  after merge.
- **Zsh treats a word starting with `=` as a command lookup.** Do not `echo =====`.

## File Structure

| File | Change |
|---|---|
| `.github/scripts/release.mjs` | New — the next version from the last tag and a bump; the notes promotion; a small CLI the release job calls |
| `guards/release.test.js` | New — tests for both |
| `scripts/check-blueprint.sh` | Installs its own test tools from `templates/package.json` when `NODE_MODULES` is unset; `NODE_MODULES` stays an override |
| `.gitignore` | New — `.self-check/`, where those tools are installed |
| `commands/flush-upstream.md` | Line 53: the self-check command without the borrowed tools |
| `framework/DECISIONS.md` | FW-005: a dated amendment — the self-check installs its own tools |
| `.github/workflows/ci.yml` | New — the self-check on every push; the release job, started by hand |
| `RELEASES.md` | New — from `templates/RELEASES.md`, readers set, the first release's notes under Unreleased |
| `README.md` | Getting started step 1: set up from the latest release; *What is here*: `RELEASES.md` |
| `docs/superpowers/plans/2026-10-15-framework-releases-from-a-green-self-check.md` | Handover report |

Doc closeout: the README row (adopters are now told to use a release) is above. No rule
file changes, so no Cursor projection. No decision between alternatives is new beyond
the spec; FW-005's amendment records the changed fact.

---

### Task 1: The version arithmetic and the notes promotion

**Files:**
- Create: `.github/scripts/release.mjs`
- Create: `guards/release.test.js`

**Interfaces:**
- Produces: `nextVersion(bump: 'patch'|'minor'|'major', lastTag: string): string` —
  `lastTag` is `''` when nothing was released, otherwise `vX.Y.Z`; returns `X.Y.Z` with
  no `v`. Throws on an unknown bump or an unreadable tag.
- Produces: `promote(text: string, version: string, date: string): string` — throws when
  there is no Unreleased section, nothing to release, `(ask)` still present, or a section
  for `version` already exists.
- Produces: CLI, used by Task 3:
  `node .github/scripts/release.mjs version <bump> [<lastTag>]` prints the version;
  `node .github/scripts/release.mjs promote <file> <version> <date>` rewrites the file.
  An error exits non-zero with its message.

- [ ] **Step 1: Write the failing tests**

`guards/release.test.js`:

```js
// Level: unit
/**
 * This repository's own release job: which version comes next, and how the notes'
 * Unreleased section becomes that version's section. Not shipped to projects.
 */
import { nextVersion, promote } from '../.github/scripts/release.mjs';

describe('nextVersion', () => {
  it('starts at 0.1.0 when nothing has been released, whatever the bump', () => {
    expect(nextVersion('patch', '')).toBe('0.1.0');
    expect(nextVersion('minor', '')).toBe('0.1.0');
    expect(nextVersion('major', '')).toBe('0.1.0');
  });

  it('below 1.0, a breaking release raises the middle number and anything else the last', () => {
    expect(nextVersion('major', 'v0.1.3')).toBe('0.2.0');
    expect(nextVersion('minor', 'v0.1.3')).toBe('0.1.4');
    expect(nextVersion('patch', 'v0.2.0')).toBe('0.2.1');
  });

  it('from 1.0, follows semantic versioning', () => {
    expect(nextVersion('major', 'v1.4.2')).toBe('2.0.0');
    expect(nextVersion('minor', 'v1.4.2')).toBe('1.5.0');
    expect(nextVersion('patch', 'v1.4.2')).toBe('1.4.3');
  });

  it('refuses a bump it does not know and a tag it cannot read', () => {
    expect(() => nextVersion('huge', 'v0.1.0')).toThrow(/bump/);
    expect(() => nextVersion('patch', 'release-3')).toThrow(/tag/);
  });
});

const head = '# Releases\n\nIntro.\n\n---\n\n';
const unreleased =
  '## [Unreleased]\n\n### Setting a project up\n\n- You can do X.\n\n' +
  'Checked on the release candidate: yes\n';

describe('promote', () => {
  it('moves Unreleased under the dated version and leaves an empty Unreleased above it', () => {
    expect(promote(`${head}${unreleased}\n---\n`, '0.1.0', '2026-10-16')).toBe(
      `${head}## [Unreleased]\n\n_Nothing yet._\n\n## [0.1.0] — 2026-10-16\n\n` +
        '### Setting a project up\n\n- You can do X.\n\n' +
        'Checked on the release candidate: yes\n\n---\n'
    );
  });

  it('keeps earlier versions below the new one', () => {
    const earlier = '## [0.1.0] — 2026-10-16\n\n- Old.\n';
    const out = promote(`${head}${unreleased}\n${earlier}`, '0.1.1', '2026-11-01');
    expect(out).toContain('## [0.1.1] — 2026-11-01\n\n### Setting a project up');
    expect(out.indexOf('## [0.1.1]')).toBeLessThan(out.indexOf('## [0.1.0]'));
    expect(out).toContain(earlier);
  });

  it('refuses notes with nothing to release', () => {
    expect(() =>
      promote(`${head}## [Unreleased]\n\n_Nothing yet._\n\n---\n`, '0.1.0', '2026-10-16')
    ).toThrow(/Nothing to release/);
  });

  it('refuses notes whose release-candidate line still reads (ask)', () => {
    const asking = unreleased.replace(': yes', ': (ask)');
    expect(() => promote(`${head}${asking}`, '0.1.0', '2026-10-16')).toThrow(/\(ask\)/);
  });

  it('refuses a version the notes already have', () => {
    const earlier = '## [0.1.0] — 2026-10-16\n\n- Old.\n';
    expect(() => promote(`${head}${unreleased}\n${earlier}`, '0.1.0', '2026-11-01')).toThrow(
      /already/
    );
  });

  it('refuses notes without an Unreleased section', () => {
    expect(() => promote(head, '0.1.0', '2026-10-16')).toThrow(/Unreleased/);
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

The self-check needs committed content and its own tools, which Task 2 adds; for now run
Jest directly against a stage of the working tree, with the first-adopter tools:

```bash
NM=../first-adopter/.framework/node_modules
STAGE=$(mktemp -d) && cp -R guards .github templates "$STAGE"/ \
  && echo '{"type":"module"}' > "$STAGE/package.json" \
  && cp templates/framework-jest.config.js "$STAGE/jest.config.js" \
  && ln -s "$(cd "$NM" && pwd)" "$STAGE/node_modules" \
  && (cd "$STAGE" && node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js release 2>&1 | tail -5); rm -rf "$STAGE"
```

Expected: the suite fails to run — `Cannot find module '../.github/scripts/release.mjs'`.

- [ ] **Step 3: Write the implementation**

`.github/scripts/release.mjs`:

```js
// This repository's release job: the next version, and the notes promotion.
// Called by the release job in ci.yml; tested by guards/release.test.js.
// Not shipped to projects.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BUMPS = ['patch', 'minor', 'major'];
const PLACEHOLDER = '_Nothing yet._';

/**
 * The version after `lastTag` for a `bump`. Below 1.0 a breaking (`major`) release raises
 * the middle number and anything else the last; from 1.0, semantic versioning.
 * @param {string} bump patch, minor or major
 * @param {string} lastTag the last release tag, vX.Y.Z, or '' when there is none
 * @returns {string} X.Y.Z, without the v
 */
export function nextVersion(bump, lastTag) {
  if (!BUMPS.includes(bump)) throw new Error(`Unknown bump "${bump}": use patch, minor or major.`);
  if (!lastTag) return '0.1.0';
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(lastTag);
  if (!m) throw new Error(`Cannot read the last tag "${lastTag}" as vX.Y.Z.`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (major === 0) return bump === 'major' ? `0.${minor + 1}.0` : `0.${minor}.${patch + 1}`;
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * The notes with the Unreleased section moved under `version`, dated, and an empty
 * Unreleased section left above it. The section ends at the next `## [` heading or a
 * `---` line.
 */
export function promote(text, version, date) {
  const lines = text.split('\n');
  const start = lines.indexOf('## [Unreleased]');
  if (start === -1) throw new Error('The notes have no "## [Unreleased]" section.');
  if (lines.some((l) => l.startsWith(`## [${version}]`))) {
    throw new Error(`The notes already have a section for ${version}.`);
  }
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('## [') && lines[end] !== '---') end++;
  const body = lines.slice(start + 1, end).join('\n').trim();
  if (body === '' || body === PLACEHOLDER) {
    throw new Error('Nothing to release: the Unreleased section is empty. Run /release first.');
  }
  if (body.includes('(ask)')) {
    throw new Error('The notes still say (ask): answer "Checked on the release candidate" first.');
  }
  const section = ['## [Unreleased]', '', PLACEHOLDER, '', `## [${version}] — ${date}`, '', body, ''];
  return [...lines.slice(0, start), ...section, ...lines.slice(end)].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'version') {
    console.log(nextVersion(args[0], args[1] ?? ''));
  } else if (command === 'promote') {
    const [file, version, date] = args;
    writeFileSync(file, promote(readFileSync(file, 'utf8'), version, date));
  } else {
    console.error('usage: release.mjs version <bump> [<lastTag>] | promote <file> <version> <date>');
    process.exit(2);
  }
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run the command from Step 2. Expected: `Tests: 10 passed, 10 total`.

Then check the CLI by hand:

```bash
node .github/scripts/release.mjs version minor        # 0.1.0
node .github/scripts/release.mjs version major v0.1.0 # 0.2.0
node .github/scripts/release.mjs version huge; echo "exit $?"  # Unknown bump …, exit 1
```

- [ ] **Step 5: Commit**

```bash
git add .github/scripts/release.mjs guards/release.test.js
git commit -m "framework: the release job knows the next version and how to promote the notes" \
  -m "The version after the last tag for a given bump, with releases below 1.0 raising the middle number only when breaking, and the notes' Unreleased section moved under that version. Notes that are empty, still asking whether the candidate was checked, or already carry the version are refused, so the job stops before tagging anything."
```

### Task 2: The self-check stands alone

**Files:**
- Modify: `scripts/check-blueprint.sh` (header comment, lines 11–25)
- Create: `.gitignore`
- Modify: `commands/flush-upstream.md:53`
- Modify: `framework/DECISIONS.md` (FW-005, after the paragraph starting
  `**Amended 2026-10-07`)

**Interfaces:**
- Produces: `bash scripts/check-blueprint.sh` runs with no environment. CI (Task 3) calls
  exactly that.

- [ ] **Step 1: Replace the tool lookup**

In `scripts/check-blueprint.sh`, replace everything from the line `# Usage, from anywhere:`
through the closing `fi` of the `No jest under` check (lines 12–25 on `main`, which
include `set -euo pipefail` and the `BP=` line) with:

```bash
# Usage, from anywhere:
#   bash scripts/check-blueprint.sh
#
# Its test tools are the ones a set-up project gets: what templates/package.json names
# at HEAD, installed into .self-check/ (ignored by git) on first use and again whenever
# that file changes. NODE_MODULES=<a folder holding jest and yaml> uses those instead.
#
# Only committed content is checked. Commit first.

set -euo pipefail

BP="$(cd "$(dirname "$0")/.." && pwd)"
if [ -n "${NODE_MODULES:-}" ]; then
  NM="$(cd "$NODE_MODULES" && pwd)"
else
  TOOLS="$BP/.self-check"
  mkdir -p "$TOOLS"
  git -C "$BP" show HEAD:templates/package.json > "$TOOLS/package.json.next"
  if ! cmp -s "$TOOLS/package.json.next" "$TOOLS/package.json" \
     || [ ! -x "$TOOLS/node_modules/.bin/jest" ]; then
    mv "$TOOLS/package.json.next" "$TOOLS/package.json"
    echo "Installing the self-check's test tools from templates/package.json…"
    npm install --prefix "$TOOLS" --no-audit --no-fund --loglevel=error >/dev/null
  else
    rm "$TOOLS/package.json.next"
  fi
  NM="$TOOLS/node_modules"
fi
if [ ! -x "$NM/.bin/jest" ]; then
  echo "No jest under $NM." >&2
  exit 2
fi
```

Keep the earlier header lines (what the script does) and everything from `STAGE=` on.
Reword the header's sentence "it stages HEAD in a temporary directory, links that
project's `.framework/node_modules`" to "it stages HEAD in a temporary directory, links
the test tools".

- [ ] **Step 2: Ignore the tools folder**

`.gitignore`:

```
.self-check/
```

- [ ] **Step 3: Run it with no environment, twice**

```bash
git add scripts/check-blueprint.sh .gitignore
git commit -m "framework: the self-check installs its own test tools" \
  -m "The self-check no longer needs another set-up project's installed dependencies: it installs what templates/package.json names, the tools a project gets, into an ignored folder, and reinstalls when that file changes. So it can run in CI and on a fresh clone; NODE_MODULES still overrides."
env -u NODE_MODULES bash scripts/check-blueprint.sh | tail -4
env -u NODE_MODULES bash scripts/check-blueprint.sh | head -3
```

Expected: the first run prints `Installing the self-check's test tools…`, then ends
`Every guard caught its defect and passed the clean baseline.` The second does not print
the install line. If `release` fails in the clean baseline, Task 1's import path is
wrong for the stage; fix it there.

- [ ] **Step 4: Show it reinstalls when the tool list changes**

```bash
echo '{}' > .self-check/package.json
env -u NODE_MODULES bash scripts/check-blueprint.sh | head -3
```

Expected: the install line again, and the run passes.

- [ ] **Step 5: Update the two documents that name the borrowed tools**

`commands/flush-upstream.md` line 53, replace
`` `NODE_MODULES=<project worktree>/.framework/node_modules bash <blueprint worktree>/scripts/check-blueprint.sh` ``
with `` `bash <blueprint worktree>/scripts/check-blueprint.sh` ``.

`framework/DECISIONS.md`, FW-005: after the paragraph beginning
`**Amended 2026-10-07 — how the blueprint checks itself without a runner.**`, add:

```markdown
**Amended 2026-10-15 — the self-check brings its own tools.** It no longer borrows a
set-up project's: it installs the tools a set-up project gets, as the blueprint's
package template names them, into a folder of its own that git ignores, so it runs in
CI and on a fresh clone. The blueprint still has no package file of its own and no
runner of its own.
```

(No backticked path in it: see *Global Constraints*.)

- [ ] **Step 6: Commit and check**

```bash
git add commands/flush-upstream.md framework/DECISIONS.md
git commit -m "framework: the documents run the self-check without borrowed tools" \
  -m "The flush command and the decision record now say the self-check runs on its own, so a flush no longer needs a set-up project beside the blueprint."
env -u NODE_MODULES bash scripts/check-blueprint.sh | tail -2
```

Expected: `Every guard caught its defect and passed the clean baseline.`

### Task 3: CI, the notes file and the README

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `RELEASES.md`
- Modify: `README.md` (Getting started step 1; *What is here* table)

**Interfaces:**
- Consumes: `bash scripts/check-blueprint.sh` (Task 2); the CLI of
  `.github/scripts/release.mjs` (Task 1).

- [ ] **Step 1: The workflow**

`.github/workflows/ci.yml`:

```yaml
# The framework's own CI: the self-check on every push, and the release job.
# A push to any branch covers pull requests: this private repository takes none from forks.
# The release job is started by hand, on main, by the developer — never by an agent:
#   gh workflow run ci.yml --ref main -f bump=<patch|minor|major>
name: Self-check and release

on:
  push:
  workflow_dispatch:
    inputs:
      bump:
        description: patch, minor or major (major means breaking; see RELEASES.md)
        type: choice
        options: [patch, minor, major]
        required: true

jobs:
  self-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: bash scripts/check-blueprint.sh

  release:
    if: github.event_name == 'workflow_dispatch'
    needs: self-check
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Releases are cut from main only
        if: github.ref != 'refs/heads/main'
        run: |
          echo "Started on $GITHUB_REF. Start the release job on main."
          exit 1
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Work out the version
        id: version
        env:
          BUMP: ${{ inputs.bump }}
        run: |
          last=$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || true)
          echo "version=$(node .github/scripts/release.mjs version "$BUMP" "$last")" >> "$GITHUB_OUTPUT"
      - name: Promote the notes, commit, tag, push
        env:
          VERSION: ${{ steps.version.outputs.version }}
        run: |
          node .github/scripts/release.mjs promote RELEASES.md "$VERSION" "$(date -u +%F)"
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit -am "chore(release): v$VERSION" \
            -m "Promotes the release notes under $VERSION and tags the commit, so a project can be set up from this release."
          git tag -a "v$VERSION" -m "Release v$VERSION"
          git push --atomic origin HEAD:main "v$VERSION"
```

- [ ] **Step 2: The notes file**

`RELEASES.md` — the template's frame with the readers named, and the first release's
notes as drafted by the specifying session from `commands/release.md` Stage 3 (*a first
release describes the product as it stands*). Write it exactly:

```markdown
# Releases

What changed in each release, for the people who set up and run projects with this
framework — not for whoever wrote it. `/release` drafts the next section; the release
job promotes it under a version heading when it runs.

A release is breaking when a project taking it must act by hand: a file in `.claude/`
or `.framework/` moved, renamed or removed; a command removed or renamed; a hook entry
in `settings.json` changed; a block the project fills in changed shape; or a rule's
`paths:` header changed so the project's own paths need revisiting.

For the full development history, see the git log.

---

## [Unreleased]

The first release: the framework as it stands.

### Setting a project up

- `scripts/set-up-project.sh` sets the framework up inside your project's own
  repository: rules, commands and hook wiring in `.claude/`, the framework's code and
  checks in `.framework/`, the backlog at the root. All of it is committed, so a clone or
  a worktree is a working copy, and an exported copy of your project carries none of it.
- `/bootstrap` runs the setup, then a shaping conversation that writes the project
  brief, the first backlog entries, the entry file and the first rules.

### Working with it

- In Claude Code each rule loads when the agent first touches a file in its area. Cursor
  receives the workflow and a generated copy of the rules, but no area rule reaches a
  Cursor agent yet.
- `/idea`, `/feature` and `/next` keep the backlog; `/dispatch` hands a plan to an agent
  working in its own worktree; `/capture-learning` routes what a change taught;
  `/release` drafts release notes and never releases.
- `npm --prefix .framework test` runs checks that fail when the backlog, the rules, the
  plans and their review records stop agreeing.

### What you need

- `git`, `bash`, `python3` and `node` on your machine, and Claude Code or Cursor.

Checked on the release candidate: (ask)

---
```

- [ ] **Step 3: The README**

In `README.md`, *Getting started*, replace step 1:

```markdown
1. Clone this blueprint anywhere outside the project, and check out its latest
   release — the newest `v…` tag; [RELEASES.md](RELEASES.md) says what each one
   changed. `main` carries the next release while it is being built.
```

In *What is here*, add a row after `fixtures/`:

```markdown
| `RELEASES.md` | What changed in each release, for the people who set up and run projects |
```

- [ ] **Step 4: Commit, check the pages, push, watch CI**

```bash
git add .github/workflows/ci.yml RELEASES.md README.md
git commit -m "framework: the framework is checked on every push and released by a job" \
  -m "Every push runs the self-check in CI. A release job, started by hand on main, runs it again and only then promotes the notes, tags the version and pushes both at once, so no release is cut from a red check. RELEASES.md carries the first release's notes, and the README tells adopters to set up from a release rather than from main."
env -u NODE_MODULES bash scripts/check-blueprint.sh | tail -2
STAGE=$(mktemp -d) && git archive HEAD | tar -x -C "$STAGE" \
  && echo '{"type":"module"}' > "$STAGE/package.json" \
  && cp "$STAGE/templates/framework-jest.config.js" "$STAGE/jest.config.js" \
  && ln -s "$PWD/.self-check/node_modules" "$STAGE/node_modules" \
  && (cd "$STAGE" && FRAMEWORK_ROOT="$STAGE" node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js readme-usable operator-page-closeout 2>&1 | grep -E "^Tests:|✕|failed to run"); rm -rf "$STAGE"
git push -u origin plan/framework-releases-from-a-green-self-check
gh run watch --exit-status "$(gh run list --branch plan/framework-releases-from-a-green-self-check --limit 1 --json databaseId -q '.[0].databaseId')"
```

Expected: self-check passes locally; the page checks print `Tests: N passed, N total`
with N greater than 2 and no `✕` (N of 2 means both skipped); the CI run's
`self-check` job succeeds and its `release` job is skipped.

If CI fails where the local run passed, it is a Linux difference (*Review Focus* 3).
Fix the script it names so it runs on both GNU and BSD tools, add that file to the
handover's *Judgment calls* (it is outside the File Structure table — say so), commit,
push, and watch again.

### Task 4: The developer confirms the first release's notes — handover

**Check first:** `grep -c '(ask)' RELEASES.md`. If it prints `0` and the line reads
`Checked on the release candidate: yes` or `no`, the developer already answered: record
that in the handover report and go to Task 5.

**Otherwise, print this and stop:**

> The first release's notes are in `RELEASES.md` on branch
> `plan/framework-releases-from-a-green-self-check`, under `## [Unreleased]`.
> 1. Read them and tell me what to change, or confirm them.
> 2. Answer *Checked on the release candidate* — yes or no. Yes means you tried this
>    branch as a release: for example, set a throwaway project up from this checkout
>    with `scripts/set-up-project.sh` and ran its checks.
> Done looks like: the notes as you want them, and that line reading yes or no.

Do not start Task 5. On resumption, apply the developer's edits, replace `(ask)` with
their answer, run the check above again, and proceed on its result:

```bash
git add RELEASES.md
git commit -m "framework: the first release's notes are confirmed" \
  -m "The developer confirmed the notes for v0.1.0 and recorded whether the release candidate was checked, so the release job will accept them."
git push
```

### Task 5: Handover report

Append `## Handover report` to this plan file with the six sections
`rules/planning.md` names — Task completion (including Task 4's handover and its
outcome), Verification results (each command above with its actual output, the CI run's
URL and result), Scope (`git diff --stat main...HEAD`, every file in the File Structure
table or named under Judgment calls), Judgment calls, What the plan got wrong,
Outstanding. Commit and push. Open the pull request:

```bash
gh pr create --base main --title "framework: the framework is released from a green self-check" \
  --body "Plan: docs/superpowers/plans/2026-10-15-framework-releases-from-a-green-self-check.md"
```

Do not merge: merge authority is parent review.

## After merge — for the reviewing session and the developer

Not an executor task. The developer starts the first release; an agent never does:

```bash
gh workflow run ci.yml --ref main -f bump=minor
```

(With no earlier tag the bump is ignored and the version is `0.1.0`.) Done looks like:

```bash
git fetch --tags && git tag -l 'v*'                 # v0.1.0
git show v0.1.0 --stat | head -8                    # the chore(release) commit, RELEASES.md only
grep -n '^## \[' RELEASES.md                        # after a pull: Unreleased, then 0.1.0
```

Step 2's plan (install v0.1.0 here) is written after this.

## Handover report

### Task completion

- **Task 1** — done. `cabd549`. `nextVersion` and `promote`, with the CLI the release job calls. 10 tests passed.
- **Task 2** — done. `4cf575b` installs the self-check's own tools into `.self-check/` and ignores that folder. `77334d2` updates the flush command and FW-005. `bash scripts/check-blueprint.sh` runs with `NODE_MODULES` unset, and reinstalls when `templates/package.json` at HEAD no longer matches the installed copy.
- **Task 3** — done. `5dd3a3a`. Workflow, `RELEASES.md`, README step 1 and the *What is here* row. Local self-check passed. Page checks passed (10 tests, 2 suites, so neither skipped). Pushed. CI [run 38719573691](https://github.com/fcapurso/claude-project-framework/actions/runs/38719573691): `self-check` succeeded, `release` skipped.
- **Task 4** — done on resumption. The first check found `(ask)` still present (count 1), so the plan stopped and asked. The developer confirmed the notes as written and said the release candidate was not checked. Re-ran the check: `grep -c '(ask)' RELEASES.md` printed `0`, and line 44 reads `Checked on the release candidate: no`. Commit `aba0961`. The same resumption also rewrote the self-check header (`4d65da9`), which the developer asked for separately — see Judgment calls.
- **Task 5** — this report.

### Verification results

Task 1, step 2, as written:

```
cp: .github: No such file or directory
```

After an empty `.github` directory existed, the same command:

```
FAIL guards/release.test.js
  ● Test suite failed to run

    Cannot find module '../.github/scripts/release.mjs' from 'guards/release.test.js'

Test Suites: 1 failed, 1 total
Tests:       0 total
```

Task 1, step 4:

```
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total

0.1.0
0.2.0
Error: Unknown bump "huge": use patch, minor or major.
exit 1
```

Task 2, step 3, first run (`env -u NODE_MODULES bash scripts/check-blueprint.sh`). First line and ending:

```
Installing the self-check's test tools from templates/package.json…
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

npm also printed its update notice on stderr. Second run, first three lines, no install line:

```
Checking 4cf575b of ~/src/claude-project-framework-releases

Conformance: every guard must fail on its planted defect
```

One earlier second run died in `tar` while creating `fixtures/defects/projection-drift/.cursor` (`Operation not permitted`) inside a sandbox. The output above is the same command outside it. Piping to `head` closed the pipe before the script finished; see *What the plan got wrong*.

Task 2, step 4. The plan's `head -3` shows the install line and then stops the script. A full run after `echo '{}' > .self-check/package.json`, so the pass is visible:

```
exit 0
Installing the self-check's test tools from templates/package.json…
Checking 4cf575b of ~/src/claude-project-framework-releases
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

Task 2, step 6, `tail -2`:

```
Every guard caught its defect and passed the clean baseline.
```

Task 3, local self-check, `tail -2`: the same success line. Page checks (`readme-usable` and `operator-page-closeout` against `git archive HEAD`):

```
Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
```

No `✕` and no `failed to run`. 10 is greater than 2.

Task 3 CI, commit `5dd3a3a`: [run 38719573691](https://github.com/fcapurso/claude-project-framework/actions/runs/38719573691), conclusion `success`. Jobs: `self-check` success, `release` skipped.

Task 4 check, after the edit:

```
ask_count 0
44:Checked on the release candidate: no
```

Self-check after `4d65da9` and `aba0961`, exit 0, ending `Every guard caught its defect and passed the clean baseline.`

CI on `aba0961` (header fix and confirmed notes): [run 38720937782](https://github.com/fcapurso/claude-project-framework/actions/runs/38720937782), conclusion `success`. Jobs: `self-check` success (44s), `release` skipped.

Both CI runs annotated, and did not fail on: `actions/checkout@v4` and `actions/setup-node@v4` target Node.js 20 and were forced onto Node.js 24; `ubuntu-latest` migrates to Ubuntu 26 beginning 2026-10-19.

### Scope

`git diff --stat main...HEAD` at `aba0961`, before this handover commit:

```
 .github/scripts/release.mjs | 65 ++++++++++++++++++++++++++++++++++++++
 .github/workflows/ci.yml    | 62 ++++++++++++++++++++++++++++++++++++
 .gitignore                  |  1 +
 README.md                   |  5 ++-
 RELEASES.md                 | 46 +++++++++++++++++++++++++++
 commands/flush-upstream.md  |  2 +-
 framework/DECISIONS.md      |  6 ++++
 guards/release.test.js      | 76 +++++++++++++++++++++++++++++++++++++++++++++
 scripts/check-blueprint.sh  | 32 ++++++++++++++-----
 9 files changed, 286 insertions(+), 9 deletions(-)
```

This handover commit adds `docs/superpowers/plans/2026-10-15-framework-releases-from-a-green-self-check.md` only. That path is the File Structure row for the handover report.

Every path above is in the File Structure table. The header sentence change is inside `scripts/check-blueprint.sh`, already listed. Nothing sits only under Judgment calls.

### Judgment calls

- Task 1 step 2 copies `.github` before that directory exists. Created an empty `.github` so `cp` could run and Jest could fail on the missing module. Git does not store an empty directory; `cabd549` created the path by adding the script.
- Task 2's pipes to `head` were left as the plan wrote them for the "no install line" observation. The reinstall check was also run to completion, without `head`, because that is the only way to see the run pass.
- The developer asked to fix the stale "borrows" sentence. The plan's reword had replaced only the "links that project's node_modules" clause. `4d65da9` changes the clause to "uses the tools a set-up project gets". Same file the plan already lists.
- Every commit on this branch carries `Co-authored-by: Cursor <cursoragent@cursor.com>`. The messages were written without that trailer; the tool appends it. The plan forbids the trailer. The squash merge has to pass `--subject` and `--body` so it does not land.

### What the plan got wrong

- Task 1 step 2 cannot run as written. `cp -R guards .github templates` exits `cp: .github: No such file or directory` before Jest starts, because the directory is created by the implementation the red step is meant to precede.
- A self-check piped to `head` does not finish. The script sets `pipefail`, `head` closes the pipe, and the run dies on SIGPIPE. "The run passes" is not what that command shows. The install line does appear in the first three lines.
- The prescribed header reword left "so this borrows a set-up project's" in a script that no longer borrows one. The developer caught it.

### Outstanding

- The release job's git half — promote, commit, annotated tag, `--atomic` push — has not run. It refuses any ref but `main`, and an agent does not start it. After merge the developer runs `gh workflow run ci.yml --ref main -f bump=minor`. With no earlier tag the version is `0.1.0`. The notes record that the release candidate was not checked (`no`).
- The two CI annotations above were left as the plan specified the action versions. They did not fail the jobs.
- Not merged. Merge authority is parent review.

## Review record

Reviewed 2026-10-15 by the specifying session (Claude Code, Opus 5.5, on the developer's
Mac), in two passes: Tasks 1–3 at `5dd3a3a` while the executor (Cursor) waited at
Task 4, then the whole branch after its handover, rebased onto `origin/main` at `d03e815`
(two catalog commits from another session; no conflict).

### Checks re-run

- `env -u NODE_MODULES bash scripts/check-blueprint.sh` on a fresh clone at `5dd3a3a`:
  printed the install line, then `Every guard caught its defect and passed the clean
  baseline.` A second run printed no install line. After `echo '{}' >
  .self-check/package.json` it reinstalled and passed again.
- The same after the rebase, at `f91bc5c`: exit 0, 12 `caught` lines, `ok clean
  baseline`.
- `readme-usable`, `operator-page-closeout` and `release` against `git archive HEAD`,
  at `5dd3a3a` and again at `f91bc5c`: `Tests: 20 passed, 20 total`, no `✕`.
- `plan-dispatchable`, `catalog-drift`, `review-record` against the rebased tree: 8
  passed, 1 failed — `review-record` › *gives every executed plan a review record*,
  which is this record's absence. Re-run after committing it: see the commit below.
- CI: `gh run view 38719573691` — head `5dd3a3a`, `self-check: success`,
  `release: skipped`. `gh run list` on the branch: `aba0961` and `9a934e9` also
  `success`.
- `RELEASES.md` line 44: `Checked on the release candidate: no`.

Diagnoses checked, not only figures:

- *Every commit carries a Cursor co-author trailer*: `git log
  --format='%(trailers:key=Co-authored-by,valueonly)'` prints
  `Cursor <cursoragent@cursor.com>` for all seven. True; the squash below passes
  `--subject` and `--body`.
- *Task 1 step 2 cannot run as written*: `main` at `d5aa3ba` had no `.github/` (verified
  while planning), and the step copies it. True.
- *A self-check piped to `head` does not finish*: consistent with the script's
  `set -euo pipefail` and with this review's own `| head -2` run at `5dd3a3a`, which
  printed the `Checking` line and nothing after it. Not re-run further.

### Found

The self-check header still said it "borrows a set-up project's" tools after Task 2 — the
plan's reword covered half the sentence. Raised at the first pass, fixed in `4d65da9`
(rebased as `51a1211`). Nothing else beyond the handover.

### Outstanding disposition

- **The release job's commit, tag and atomic push have not run** — by design, it refuses
  any ref but `main` and only the developer starts it. The developer runs
  `gh workflow run ci.yml --ref main -f bump=minor` after merge; the plan's *After merge*
  commands are the check. No catalog id: it is this plan's own last step.
- **CI annotations** (`actions/checkout@v4` and `actions/setup-node@v4` forced from
  Node 20 onto Node 24; `ubuntu-latest` moving to Ubuntu 26 from 2026-10-19): dropped for
  now — warnings, not failures, and each fix is a one-line version bump when one fails.
- **The release candidate was not checked**: the developer's answer, recorded as `no` in
  the notes.

### Learnings routed

- **A plan's failing-test step must run before the implementation exists** (Task 1 step 2
  copied a directory the implementation creates) and **a check whose pass matters must not
  be piped to `head`** (Task 2). Both are this plan's author's errors of the kind
  `plans-are-accurate-without-a-rehearsal` and `plan-checks-must-be-falsifiable` address;
  one occurrence each, so not routed into a rule.
- **The dispatch script keeps only the first line of a wrapped header field**, found
  while dispatching this plan (`d5aa3ba` unwrapped the Requires line). A further case for
  `dispatch-refuses-a-blank-header-field`; added as a dated comment on that entry on
  `main` after this merge, since the catalog is outside this plan's file table.
- The co-author trailer is already covered by `framework/workflow.md` (*Merge and clean
  up*): nothing new.

### Merged because

Every check the plan names passed again after the rebase, on macOS and in CI on Linux;
the one part no check reaches before merge, the release job's git half, runs first on
`main` and is checked there.
