# The test tools a project installs lock glob and minimatch at their patched majors — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `templates/package.json` overrides glob to `^14.0.3` and minimatch to
`^11.0.4`, `templates/package-lock.json` is regenerated from it, the dependency-overrides
guard knows both overrides, and the prerequisite check asks for the Node.js versions the
patched minimatch runs on (20, or 22 and later), so a project set up or updated from the
next release has no alert for GHSA-3g3m-2fjr-6pw4 or GHSA-g3hv-75wg-m249.

**Backlog item:** `test-tools-take-patched-glob` in `feature-catalog.yaml` (type
improvement). Spec: `docs/superpowers/specs/2026-11-05-dependabot-alerts.md`.

**One plan:** what becomes true is one sentence — the test tools a project installs
lock glob and minimatch at their patched majors, and the setup check asks for the Node.js
they need.

**Model tier: Small.** Every file's new content is given below, nearly verbatim; the one
generated file, the lockfile, is produced by a named npm command.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 6; do not open a pull request, write a review record
or merge.

**No fresh-agent check is owed:** nothing under `framework/`'s workflow, `rules/` or
`commands/` changes what an agent is told to do. The decision record gains an entry,
which is a record, not an instruction.

**What the specifying session verified on 2026-11-05, against `origin/main` at `8f36064`
(Node.js 22.23.4, npm 10, Linux x86_64):**

- `templates/package.json` has `devDependencies` `jest ^30.0.0` and `yaml ^2.9.0` and one
  override, `"test-exclude": "^8.0.0"`.
- In the installed test tools, `jest-config`, `jest-runtime`, `@jest/reporters` and
  `test-exclude` 8.0.0 ask for `glob ^13.0.6`, and `test-exclude` asks for
  `minimatch ^10.2.2`. glob 14.0.3, the latest 14, asks for `minimatch ^11.0.2` and
  declares `engines.node` `18 || 20 || >=22`. minimatch 11.0.4, the latest 11, declares
  `20 || >=22` (11.0.3 still allowed 18). Jest 30.5.2 declares
  `^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0`.
- `guards/dependency-overrides.test.js` requires one entry in `OVERRIDES` per override in
  `templates/package.json`, and for each checks that its `via` package, installed beside
  the guard, still asks for an older major than the override. `staleReason` compares the
  first number of each range.
- `scripts/check-blueprint.sh` installs its test tools with `npm ci` from
  `templates/package.json` and `templates/package-lock.json` at `HEAD`, and its comment
  names the regeneration command:
  `npm install --package-lock-only --ignore-scripts` from a copy of the package file.
  It plants `"test-exclude": "^8.0.0"` in `templates/package.json` to prove
  `dependency-overrides` catches a stale entry; that line stays.
- `scripts/set-up-project.sh` writes `templates/package-lock.json` into a project as
  `.tropis/package-lock.json`, replacing `PROJECT_SLUG`; the lockfile's own `name` fields
  are `PROJECT_SLUG-framework`.
- `scripts/check-prerequisites.sh` accepts Node 18.14 and later (lines around
  `node_major`), and `guards/check-prerequisites.test.js` asserts that, with messages
  saying `need 18.14 or newer`. Nothing else in `scripts/` or `templates/` checks the Node
  version. The pipeline templates default `node-version` to `'22'`.
- `README.md` says `node` 18.14 or later. **This plan does not edit it**: the README is
  refreshed as a whole page by `/refresh-readme` at release (workflow, *Doc closeout*).
  `RELEASES.md` mentions 18.14 in two shipped sections; those are history and stay.
- The developer accepted dropping Node.js 18 for projects' checks on 2026-11-05 (the
  comment above the backlog item says so): it reached end of life in April 2025.

**Decided by the specifying session:**

- The overrides are top-level `overrides` entries, `"glob": "^14.0.3"` and
  `"minimatch": "^11.0.4"`, beside `test-exclude`, as the spec and backlog item say.
- The guard entry for glob names `via: 'jest-config'`, for minimatch
  `via: 'test-exclude'`: each asks for the old major today, so each entry goes red when
  that package catches up.
- The prerequisite check accepts Node major 20, or 22 and later, and refuses everything
  else, 21 included (minimatch 11.0.4 refuses it).
- A decision record entry, FW-073, records dropping Node.js 18 against the alternative of
  pinning minimatch at 11.0.3.

---

## Delivers

test-tools-take-patched-glob

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-patched-glob -b plan/test-tools-take-patched-glob origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency beyond the two overrides. Do not lower, skip or delete a guard or a
  test.**
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from.

## File Structure

| File | Change |
|---|---|
| `templates/package.json` | two overrides added |
| `templates/package-lock.json` | regenerated |
| `guards/dependency-overrides.test.js` | two `OVERRIDES` entries |
| `scripts/check-prerequisites.sh` | Node 20, or 22 and later |
| `guards/check-prerequisites.test.js` | cases and messages follow |
| `framework/DECISIONS.md` | FW-073 appended |
| `RELEASES.md` | one line under `## [Unreleased]` |
| `feature-catalog.yaml` | the backlog item moves to `shipped` (the specifying session does this at merge; the executor does not touch it) |
| `docs/superpowers/plans/2026-11-05-test-tools-take-patched-glob.md` | this plan; the handover report |

## Task 1 — the overrides and the lockfile

1. In `templates/package.json`, make `overrides`:

   ```json
     "overrides": {
       "glob": "^14.0.3",
       "minimatch": "^11.0.4",
       "test-exclude": "^8.0.0"
     }
   ```

2. Regenerate the lockfile from a scratch copy, so nothing installs in the repository:

   ```bash
   S=$(mktemp -d)
   cp templates/package.json templates/package-lock.json "$S/"
   (cd "$S" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund)
   cp "$S/package-lock.json" templates/package-lock.json
   ```

3. Check it. Each command's passing and failing output:

   - `grep -c '"node_modules/glob"' templates/package-lock.json` prints `1`, and
     `node -e 'const l=require("./templates/package-lock.json").packages;for(const [k,v] of Object.entries(l))if(/node_modules\/(glob|minimatch)$/.test(k))console.log(k,v.version)'`
     prints only `node_modules/glob 14.…` and `node_modules/minimatch 11.…` lines. On
     `origin/main` it prints `glob 13.0.6` and `minimatch 10.2.6`; any 13.x or 10.x line,
     or a nested `…/node_modules/glob` entry, means the override did not take: fix
     step 1 and regenerate.
   - `grep -c PROJECT_SLUG-framework templates/package-lock.json` prints `2` (the two
     `name` fields). `0` means the copy was renamed: regenerate from step 2.
   - `(cd "$S" && npm ci --ignore-scripts --no-fund --loglevel=error && npm audit --json)`
     and read the JSON's `vulnerabilities`: no entry named `glob` or `minimatch`. One
     named `deepmerge` (low, no fix) is expected and stays (the spec dismisses it). On
     `origin/main` both `glob` and `minimatch` are there. If either remains, stop and
     report it in the handover.

## Task 2 — the guard knows both overrides

In `guards/dependency-overrides.test.js`, add to `OVERRIDES`, before `'test-exclude'`:

```js
  glob: {
    via: 'jest-config',
    why:
      'Jest 30 asks for glob 13, which has GHSA-3g3m-2fjr-6pw4 (fixed in 14.0.2), so every ' +
      'project inherits a Dependabot alert for it. glob 14 runs on the same Node.js.',
  },
  minimatch: {
    via: 'test-exclude',
    why:
      'test-exclude 8 asks for minimatch 10, which has GHSA-g3hv-75wg-m249 (fixed in ' +
      '11.0.1), so every project inherits a Dependabot alert for it. minimatch 11.0.4 ' +
      'needs Node.js 20, or 22 and later.',
  },
```

## Task 3 — the prerequisite check asks for Node 20, or 22 and later

In `scripts/check-prerequisites.sh`, replace the comment line and the `if … fi` that
tests `node_major` and `node_minor` with:

```bash
  # minimatch 11, which Jest uses to find the guards, runs on 20 and on 22 and later.
  if [ "$node_major" -eq 20 ] || [ "$node_major" -ge 22 ]; then
    ok node "$node_version  — runs the guards and the backlog command"
  else
    gone node "found $node_version, need 20, or 22 or newer (the test tools that run the guards refuse others)"
  fi
```

Delete the `node_minor=` line, which nothing then reads.

In `guards/check-prerequisites.test.js`:

- The docblock's second paragraph becomes: `minimatch 11, which Jest uses to find the
  guards, runs only on Node 20 and on 22 and later, so the check must accept exactly
  those: otherwise a machine on 18 or 21 passes setup and fails at the first guard.`
  (keep the sentence about running the shipped script from a scratch copy).
- Accepted: `['20.0.0', '20.19.2', '22.15.0', '24.1.0']`.
- Refused, named `'refuses node %s and says 20, or 22 or newer, is needed'`:
  `['16.20.2', '18.14.0', '18.20.4', '21.7.3']`, expecting
  `` `MISSING  node       found ${version}, need 20, or 22 or newer` ``.

Run it red first, then green: commit the test change alone, run the guard staged as
*Verification* says, and see exactly the four refusal cases fail (`18.14.0` and
`18.20.4` are accepted by the old script, `16.20.2` and `21.7.3` get the old message);
then commit the script change and see all eight pass.

## Task 4 — the decision record

Append to `framework/DECISIONS.md`:

```markdown
## FW-073: The test tools lock glob and minimatch at their patched majors, and need Node.js 20 or 22 and later

**Date:** 2026-11-05 · **Status:** Accepted; built by the backlog item
`test-tools-take-patched-glob`.

**Decision:** `templates/package.json` overrides glob to `^14.0.3` and minimatch to
`^11.0.4` under Jest, and the lockfile every project installs is regenerated from it.
minimatch 11.0.4 runs on Node.js 20 and on 22 and later, so the prerequisite check asks
for those and Tropis's checks no longer run on Node.js 18.

**Evidence:** The spike `dependabot-alerts-are-assessed`, 2026-11-05: Jest 30.5.2 asks
for glob ^13 and minimatch ^10, each with a moderate advisory fixed only in the next
major, and every project set up from the release inherited both alerts. With the
overrides, `npm audit` reports neither, and the self-check passes. Source: none in
particular.

**Rejected:** Pinning minimatch at 11.0.3, the last release that allows Node.js 18: it
holds the fix, but locks the projects to a release minimatch has already moved past, and
Node.js 18 reached end of life in April 2025; the developer accepted dropping it.
Waiting for Jest to ask for the patched majors itself: every project carries the alerts
until it does. Dismissing the alerts as unreachable: true today, but the dismissal would
have to be repeated on every project's own repository.

**Consequences:** Two more overrides, each with an entry in
`guards/dependency-overrides.test.js` that fails once Jest's own dependency catches up,
which is when to remove it. A project on Node.js 18 sees the setup check refuse it and
must upgrade Node.js before running its checks; the release notes say so.
```

## Task 5 — the release notes

Under `## [Unreleased]` in `RELEASES.md`, after the existing line, add one line (a blank
line between):

```markdown
- Tropis's checks now need Node.js 20, or 22 or later: the test tools a project installs take the releases of glob and minimatch that fix two moderate advisories (GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249), so a project no longer inherits a Dependabot alert for either, and the newer minimatch does not run on Node.js 18 or 21. If you still run Node.js 18, upgrade it before updating; the setup check now says so.
```

## Task 6 — verification, then the handover report

Commit everything first: the self-check reads committed content only.

1. `bash scripts/check-blueprint.sh` from the worktree. It reinstalls its test tools from
   the new lockfile (it prints `Installing the self-check's test tools…`) and must end
   green. A red verdict names its log folder; fix and re-run, or stop and report.
2. Run `guards/dependency-overrides.test.js` and `guards/check-prerequisites.test.js`
   alone, staged as `CLAUDE.md` (*To run one source guard alone*) says: in an export of
   `HEAD`, a `{"type":"module"}` package file, `templates/framework-jest.config.js`
   copied to `jest.config.js`, and `node_modules` linked to `.self-check/node_modules`;
   then `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/<name>.test.js`.
   Passing: every test passes; `dependency-overrides` lists `glob is still needed`,
   `minimatch is still needed` and `test-exclude is still needed`.
3. Re-break the overrides guard, in the staged export only: change the override to
   `"glob": "^13.0.0"` in its `templates/package.json` and run the guard. It must fail
   `glob is still needed` with `now asks for glob ^13.0.6 itself`. Restore the line and
   see it pass. Report both outputs.
4. `npm --prefix .tropis test` from the worktree (after `npm --prefix .tropis ci`):
   it must pass. It checks this repository as a project with the installed release, so
   the change shows through it only in the backlog; report its count.
5. `git diff --stat origin/main...HEAD`: every file in the File Structure table, nothing
   else.

Then append `## Handover report` to this plan, with the six sections
`.claude/rules/planning.md` names (*Every plan ends with a handover report*), commit it,
run step 1 again on that commit, and push the branch.

## Traps

- **Do not run `npm install` in the repository or in `templates/`.** It would write a
  `node_modules` there. Regenerate in the scratch copy only.
- **The self-check's own plant** writes `"test-exclude": "^8.0.0"` into
  `templates/package.json` to test the guard; that is expected, leave it.
- **`npm --prefix .tropis test` runs the installed release**, whose own
  `.tropis/package.json` still has the old overrides. That is right: `.tropis/` follows
  when a release is installed. Do not edit it.
- **`README.md` still says 18.14 after this plan.** Do not edit it; `/refresh-readme`
  rewrites it at release.
