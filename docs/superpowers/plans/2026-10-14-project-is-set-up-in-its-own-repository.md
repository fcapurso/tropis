# A project is set up inside its own repository — Implementation Plan

> **For agentic workers:** execute task by task, in order. Each task ends with
> `check-blueprint.sh` green before its commit; the last task runs the setup on a
> throwaway project end to end. Read the whole plan first, including *Traps*.

**Goal:** Someone starting a project with this framework runs one script that sets the
framework up inside the project's own repository — rules, framework documents, commands
and hook wiring in `.claude/`, the framework's code in `.framework/` — with every rule
loading by its area, and nothing in the blueprint describes or creates a sibling
repository, an overlay or a second checkout any more.

**What this delivers:** `project-is-set-up-in-its-own-repository` in
`feature-catalog.yaml`. Its six acceptance criteria are the definition of done; Task 5
checks each one.

**Spec:** this repository has no design document for the entry; its criteria are the
spec, and the worked example is first-adopter, which made the same move by hand on
2026-10-13. Read, in the `first-adopter` checkout (read-only):

- `docs/superpowers/specs/2026-10-13-project-lives-in-one-repository-design.md` — why
  (*Why*, *The end state*). Its inventory and order are that project's, not this plan's.
- `docs/superpowers/plans/2026-10-13-project-lives-in-one-repository/edits.patch` — the
  kind of edit each file needed there. **Do not apply it here**: first-adopter's copies of
  the rules, commands and scripts have diverged from this repository's by hundreds of
  lines, so this plan edits this repository's own files. The patch's hunks for
  `.claude/settings.json`, `capture-at-write.sh`, `dispatch.mjs`, `isolate-for-plan.sh`,
  `isolate-for-plan.mjs`, `plan-binding.js` and `rule-areas.js` are the closest models.
- `.claude/framework/DECISIONS.md`, FW-011 and FW-012 — the decisions this plan ports as
  FW-009 and FW-010 here.

**What the specifying session verified on 2026-10-14, against `main` at `1eb7429`:**

- `git grep` for the old layout's names (`seed-sidecar`, `install-overlay`,
  `setup-working-copy`, `sidecar`, `overlay`, `harness`, `sibling`, `.claude/scripts`,
  `other checkout`, `two checkouts`, `app-root`) outside `docs/superpowers/` and
  `feature-catalog.yaml` hits 54 files. Every one is in the File Structure table below,
  except `PORTABILITY-NOTES.md`, which is a dated porting record and stays as written.
- No shipped rule has a `paths:` header today. There is deliberately **no size limit**:
  first-adopter's 9,500-character check existed because a hook carried rules across its two
  checkouts and a hook's reply was cut above about 10,000 characters. One repository needs
  no such hook, so the limit has no mechanism here, and `rules/planning.md` (21,112
  characters) stays one file. Decided with the developer on 2026-10-14; the entry's
  fifth criterion was narrowed to the header in the same commit as this plan.
- No shipped script has a project-owned region except `generate-cursor-rules.mjs` (its
  glob table) and `setup-working-copy.sh`; this plan removes both regions.
- `check-blueprint.sh` runs every guard with `FRAMEWORK_ROOT` set to a composed fixture
  project. The guards gated on `isBlueprintTree` (`readme-usable`,
  `operator-page-closeout`, `sidecar-seed`) therefore **skip** in that run — the fixture
  has no `bootstrap.md`. Task 4 runs the two that survive directly.
- `NODE_MODULES=../first-adopter/.framework/node_modules bash scripts/check-blueprint.sh`
  passes on `main` (12 defects caught, clean baseline ok). Node 22.15.0, git 2.49.0 on
  the developer's Mac.

**Model tier: Large.** The code is specified below; the prose rewrites across roughly
forty documents need judgment about what is a dated record and what still instructs.

**Requires:** the `first-adopter` checkout beside this one with `.framework/node_modules` installed (it is), network access for one `npm install` in Task 5, and the Claude Code CLI for one measurement in Task 5 (optional — the reviewer runs it otherwise).

**Merge authority: parent review.** It changes how every future project is set up.

Do not store a kick-off prompt on this plan.

---

## Delivers

- project-is-set-up-in-its-own-repository

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-own-repository -b plan/project-is-set-up-in-its-own-repository` |
| worked example (`first-adopter`) | do not edit | |

## Global Constraints

- **No new dependency.** The set-up project's `.framework/package.json` keeps exactly
  `jest` and `yaml`; the blueprint itself gains no `package.json`.
- **Do not lower, skip or delete a guard to get green**, except the two this plan deletes
  by name (`sidecar-seed.test.js`, `setup-working-copy.test.js`) and the two checks it
  replaces by name (framework-integrity's glob-table checks, replaced by `rule-areas`).
- **Dated records stay as written.** A decision record, a catalog comment, a spec, a plan
  or `PORTABILITY-NOTES.md` that describes the old layout as it was is history, not a
  leftover. Change one only where a guard requires it (a backticked path that no longer
  exists — write it without backticks, keeping the sentence's meaning), or to add a
  dated status line.
- **The source layout of this repository does not change.** `rules/`, `framework/`,
  `commands/`, `scripts/`, `guards/`, `templates/` stay where they are; only what is
  installed into a project, and where, changes.
- **Do not edit `first-adopter`.** Read it only.
- Never add `Co-Authored-By` or "Generated with" trailers. Every commit has a body.
- Do not write the literal three-word worktree command anywhere in this repository's
  documents or tests except a Repositories table (see *Traps*).

## Traps

- **The dispatch prompt for this plan tells you to isolate with
  `bash .claude/scripts/isolate-for-plan.sh`, which this repository does not have**, and
  not to run the worktree command yourself. This trap overrides both: the blueprint holds
  the framework as source, not installed (`framework-is-developed-with-itself` changes
  that later), so create the one worktree by running the Repositories row's command from
  this checkout. With one editable row, the hazard the helper exists for — a worktree
  landing in the wrong repository — cannot arise.
- **Any text matching the worktree command outside a Repositories table makes a plan
  undispatchable**, and `guards/dispatch.test.js` and the throwaway plan in Task 5 need
  such rows. In test code, build the command from parts (`['worktree', 'add', …]`, or a
  variable holding the verb); in shell, keep the word `worktree` in a variable. This
  plan already does so.
- **Guards gated on `isBlueprintTree` skip inside `check-blueprint.sh`.** A green
  `check-blueprint` says nothing about `readme-usable` or `operator-page-closeout`; Task 4
  runs them separately. Do not add a gate to any new guard: `set-up-project.test.js`
  locates the setup script from its own path so it runs in `check-blueprint`.
- **`check-blueprint.sh` checks committed content only** (`git archive HEAD`). Commit
  before running it; run it after every commit that changes a guard, script or fixture.
- **The orphan-rule defect must stay caught by `rule-areas`, not by something else.** If `CANNOT RUN` appears, the clean base fails `rule-areas` — a base
  rule lost its header.
- **`npm --prefix .framework …` runs with `.framework/` as the working directory.** Every
  installed script finds the project root from its own location (two levels up), never
  from the working directory. A script that uses `process.cwd()` or `pwd` for the root
  is a defect.
- **Zsh treats a word starting with `=` as a command lookup.** Do not `echo =====`.

## File Structure

| File | Change |
|---|---|
| `scripts/set-up-project.sh` | New — the setup |
| `scripts/installed-scripts.txt` | New — the command scripts a project gets in `.framework/scripts/` |
| `scripts/installed-hooks.txt` | Only the four hooks; `check-prerequisites.sh` and `probe-hook-channels.sh` move to `installed-scripts.txt` |
| `scripts/rule-areas.js` | New — reads a rule's `paths:` header |
| `scripts/generate-cursor-rules.mjs` | Reads headers, not a glob table; root two levels up |
| `scripts/dispatch.mjs`, `scripts/next.mjs` | Root two levels up; header comments |
| `scripts/isolate-for-plan.sh`, `scripts/isolate-for-plan.mjs` | The runner sits beside it; comments |
| `scripts/plan-binding.js` | Thin prompt names `.framework/scripts/isolate-for-plan.sh` and `npm --prefix .framework ci` |
| `scripts/capture-at-merge.sh`, `scripts/capture-at-write.sh` | One root rule: two levels above `.framework/hooks/` |
| `scripts/check-drift.sh` | Compares `.framework/hooks/` and `.framework/scripts/` |
| `scripts/check-conformance.sh` | Composes the project in the installed layout; generates projections; new and retargeted cases |
| `scripts/check-blueprint.sh` | Template config renamed; wording |
| `scripts/probe-hook-channels.sh` | Builds one project with real folders; the linked-folder variant is cut |
| `scripts/seed-sidecar.sh`, `scripts/install-overlay.sh`, `scripts/setup-working-copy.sh` | Deleted |
| `rules/planning.md` | One-repository wording; `paths:` header |
| `rules/catalogs.md`, `rules/learnings.md`, `rules/tests.md`, `rules/harness-scripts.md` | `paths:` headers; one-repository wording |
| `framework/DECISIONS.md` | FW-009, FW-010; current-state paths; FW-008 status line |
| `framework/workflow.md`, `framework/dispatch.md`, `framework/rule-delivery.md` | One-repository wording; operator guide path |
| `commands/bootstrap.md`, `commands/scope.md`, `commands/dispatch.md`, `commands/flush-upstream.md`, `commands/release.md` | One-repository wording |
| `commands/capture-learning.md` | The generator's path (Task 1, Step 7) |
| `bootstrap.md`, `README.md` | Rewritten for the setup |
| `templates/settings.json` | Hooks at `.framework/hooks/`; comment |
| `templates/package.json` | `<slug>-framework`; `rules:cursor` script |
| `templates/README.md` | The operator guide, installed as `.framework/README.md` |
| `templates/CLAUDE.md` | Working-copy section |
| `templates/harness-layout.test.js` → `templates/project-layout.test.js` | Renamed, rewritten |
| `templates/harness-jest.config.js` → `templates/framework-jest.config.js` | Renamed; comment |
| `guards/rule-areas.test.js` | New — shipped to every project |
| `guards/set-up-project.test.js` | New — replaces `sidecar-seed.test.js` |
| `guards/sidecar-seed.test.js`, `guards/setup-working-copy.test.js` | Deleted |
| `guards/framework-integrity.test.js` | Glob-table checks removed (replaced by `rule-areas`) |
| `guards/cursor-rules-projection.test.js` | Compares against the rule without its header |
| `guards/rule-delivery.test.js`, `guards/dispatch.test.js`, `guards/next-report.test.js`, `guards/check-drift.test.js` | Installed layout |
| `guards/catalog-entries.test.js`, `guards/plan-dispatchable.test.js` | Default root / comments |
| `guards/readme-usable.test.js`, `guards/operator-page-closeout.test.js` | One-repository expectations |
| `fixtures/README.md` | Compose and its traps |
| `fixtures/base/.claude/rules/*.md` (10) | `paths:` headers |
| `fixtures/base/.cursor/rules/*.mdc` (10) | Deleted — compose generates them |
| `fixtures/base/scripts/generate-cursor-rules.mjs` | Deleted |
| `fixtures/defects/orphan-rule/.claude/rules/orphan.md` | Unchanged (it already has no header) — retargeted to `rule-areas` |
| `fixtures/defects/plain-reply/.claude/scripts/hook-reply.sh` → `fixtures/defects/plain-reply/.framework/hooks/hook-reply.sh` | Moved |
| `feature-catalog.yaml` | The entry shipped; two entries lose it from `blockedBy` |
| `docs/superpowers/plans/2026-10-14-project-is-set-up-in-its-own-repository.md` | This plan; handover report |

## Review Focus

- **A set-up project that already has a `CLAUDE.md`.** Most existing repositories adopting
  the framework will. The setup refuses, changing nothing, and names the file; bootstrap
  tells the operator to move it aside and merge it back. Pinned in Task 3.
- **The project's own `.gitignore` and `.gitattributes`.** The setup appends its lines,
  once, and never replaces the file — including one with no trailing newline. Pinned in
  Task 3.
- **Running a command from a subdirectory, or through `npm --prefix`.** Every installed
  script finds the root from its own location. Pinned in Task 1 (`dispatch.test.js`,
  isolation from a subdirectory) and Task 5.
- **A plan worktree carries the framework.** The defect the overlay era kept hitting: a
  worktree with no rules or hooks, because they were ignored files. Now they are
  committed; pinned in Task 1 (`dispatch.test.js`) and Task 5.
- **A `.framework/` path a document names that the setup never installs.** Pinned in
  Task 3 (`set-up-project.test.js` resolves every one).

---

## Tasks

### Task 0 — Set up

From this checkout, run the Repositories row's command (see *Traps*), then work in
`../claude-project-framework-own-repository` for the rest of the plan.

```bash
cd ../claude-project-framework-own-repository
export NODE_MODULES="$(cd ../first-adopter/.framework/node_modules && pwd)"
bash scripts/check-blueprint.sh | tail -3
```

Expected: `Every guard caught its defect and passed the clean baseline.` If not, stop and
report: `main` moved since this plan was written.

### Task 1 — The installed layout: `.framework/hooks/` and `.framework/scripts/`

What becomes true: every script a project gets runs from `.framework/`, and the guards
test it there. No setup script yet; the guards' composed project is the first thing laid
out the new way.

**Interfaces:**
- Produces: `scripts/installed-scripts.txt` (one file name per line, read by
  `check-conformance.sh` now and `set-up-project.sh` in Task 3); every installed script's
  root is `resolve(here, '../..')` / `"$here/../.."`.

- [ ] **Step 1: The two install lists.** `scripts/installed-hooks.txt` becomes exactly:

  ```
  hook-reply.sh
  capture-at-merge.sh
  capture-at-write.sh
  framework-commit-check.sh
  ```

  New `scripts/installed-scripts.txt`:

  ```
  next.mjs
  next-work.js
  dispatch.mjs
  plan-binding.js
  projections.js
  isolate-for-plan.mjs
  isolate-for-plan.sh
  generate-cursor-rules.mjs
  check-prerequisites.sh
  probe-hook-channels.sh
  ```

  (`rule-areas.js` is added to it in Task 2.)

- [ ] **Step 2: Compose the guards' project in the installed layout.** In
  `scripts/check-conformance.sh`, `compose()` copies the hooks into
  `$WORK/.framework/hooks/` and the scripts into `$WORK/.framework/scripts/`, and writes
  `$WORK/.framework/package.json` as `{"type":"module"}` (the installed scripts are ES
  modules; a set-up project's package says so):

  ```bash
  compose() {
    rm -rf "$WORK"
    cp -R "$FIXTURES/base" "$WORK"
    mkdir -p "$WORK/.framework/hooks" "$WORK/.framework/scripts"
    while read -r f; do
      [ -n "$f" ] || continue
      cp "$SCRIPTS/$f" "$WORK/.framework/hooks/"
    done < "$SCRIPTS/installed-hooks.txt"
    while read -r f; do
      [ -n "$f" ] || continue
      cp "$SCRIPTS/$f" "$WORK/.framework/scripts/"
    done < "$SCRIPTS/installed-scripts.txt"
    echo '{"type":"module"}' > "$WORK/.framework/package.json"
    [ -n "$INSTRUCTIONS" ] && install_instructions
    [ -n "${1:-}" ] && cp -R "$FIXTURES/defects/$1/." "$WORK/"
    return 0
  }
  ```

  Change the defaults `FIXTURES="${FIXTURES:-fixtures}"` and `SCRIPTS="${SCRIPTS:-scripts}"`,
  and the header's usage line to say it is run by `check-blueprint.sh`. Replace "What
  seed-sidecar.sh installs from the blueprint" with "What the setup installs from the
  blueprint". Keep the comment block above `compose()` (why the base carries no scripts),
  updating its paths. Move `fixtures/defects/plain-reply/.claude/scripts/hook-reply.sh` to
  `fixtures/defects/plain-reply/.framework/hooks/hook-reply.sh` with `git mv`.

- [ ] **Step 3: Scripts find the root two levels up.**
  - `scripts/dispatch.mjs`: `const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');`
    Header: "Run from the project root: `npm --prefix .framework run dispatch -- <plan-path>`."
    Usage message: `usage: npm --prefix .framework run dispatch -- <plan-path>`.
  - `scripts/next.mjs`: `const root = resolve(here, '../..');`
  - `scripts/generate-cursor-rules.mjs`: `const root = resolve(here, '../..');` (rewritten
    in Task 2 anyway).
  - `scripts/isolate-for-plan.sh` — after its first two lines (shebang, shared-machinery
    line):

    ```bash
    set -euo pipefail
    # Resolves the runner from this script's own location, so it is found from any working
    # directory inside the repository.
    here=$(cd "$(dirname "$0")" && pwd -P)
    exec node "$here/isolate-for-plan.mjs" "$@"
    ```

  - `scripts/isolate-for-plan.mjs` header: "Run through `.framework/scripts/isolate-for-plan.sh`,
    which sits beside it." Code unchanged: it already finds the repository with
    `git rev-parse --show-toplevel`, and still resolves a row naming another repository
    to a sibling checkout.
  - `scripts/capture-at-merge.sh`: replace the whole `if [ -f "$script_dir/../src/shared/plan-binding.js" ] … fi`
    block with:

    ```bash
    # Installed at .framework/hooks/, two levels below the project root.
    project_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
    ```

    (keep the `git rev-parse --show-toplevel` preference after it).
  - `scripts/capture-at-write.sh` line 38: the fallback is the hook's own location, never
    the working directory (`rules/harness-scripts.md` says so):

    ```bash
    if ! project_root=$(git rev-parse --show-toplevel 2>/dev/null); then
      # Installed at .framework/hooks/, two levels below the project root.
      project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
    fi
    ```

    Comment on line 48: "A framework-only record lives at .claude/framework/DECISIONS.md."
  - `scripts/probe-hook-channels.sh`: cut the linked-folder variant. It measured a project
    whose `.claude/` and `.cursor/` were links into another folder — the overlay layout,
    which the framework no longer sets up — and found that no tool ran a hook or loaded a
    rule there (2026-10-09). The script now builds one project, `<dir>`, with real
    `.claude/` and `.cursor/` folders and its probe hooks under `<dir>/.framework/hooks/`
    (the settings it writes point there), and the final message names only that folder.
    Delete the `framework/`/`project/`/`direct/` split, the two `ln -s` lines and the copy
    step; keep the hook shapes, the rule nonces, the `if` probe and the prompt unchanged.
    The header comment drops the linked-layout sentences and keeps the 2026-10-09 finding
    as one dated line ("links were measured once and loaded nothing; the framework no
    longer uses them"). Usage: `bash .framework/scripts/probe-hook-channels.sh <dir>`.
    Check: `bash scripts/probe-hook-channels.sh "$(mktemp -d)/p"` exits 0, and the folder
    it names holds `.claude/settings.json`, `.claude/rules/probe.md`,
    `.cursor/rules/probe.mdc`, `PROMPT.md` and no link (`find <dir> -type l` prints
    nothing).
  - `scripts/check-drift.sh`: loop over `"$PROJECT"/.framework/hooks/* "$PROJECT"/.framework/scripts/*`;
    header and the no-match message name those two folders. Its header's example of a
    project-owned region becomes "the blocks commands such as `release.md` mark — none of
    the scripts shipped today has one".

- [ ] **Step 4: The thin prompt.** In `scripts/plan-binding.js` `renderThinPrompt`,
  replace the isolate line and add the install line beneath it:

  ```js
  lines.push(`  bash .framework/scripts/isolate-for-plan.sh ${planPath}`);
  lines.push('');
  lines.push('In each worktree it creates that has a .framework/ folder, before running anything else:');
  lines.push('  npm --prefix .framework ci');
  ```

- [ ] **Step 5: Guards read the installed layout.**
  - `guards/rule-delivery.test.js`: `.claude/scripts/capture-at-merge.sh` and
    `.claude/scripts/framework-commit-check.sh` → `.framework/hooks/…` (lines 33, 161,
    238); the wiring case's `script` → `'bash .framework/hooks/capture-at-write.sh'`
    (line 448, reading `templates/settings.json`, which Step 6 changes); comments naming
    `.claude/scripts`.
  - `guards/next-report.test.js`: copy what it copies into `<dir>/.framework/scripts/`
    and run `node .framework/scripts/next.mjs` with `cwd` the project (and once with `cwd`
    `.framework/`, asserting the same output — the `npm --prefix` case).
  - `guards/check-drift.test.js`: `project()` copies `capture-at-write.sh` to
    `.framework/hooks/` and `next.mjs` to `.framework/scripts/`, and no longer copies the
    generator. The case "reports a replaced glob table and reworded comments as clean"
    becomes "reports reworded comments as clean" (the comment edit only). Paths in the
    other cases' `edit` and `DRIFTED` lines follow. The file's header comment: the
    example of a project-owned region is a command's block, not a glob table.
  - `guards/dispatch.test.js` — rebuild `project()` as **one repository** laid out as the
    setup lays it out: `example-project/` with `.framework/scripts/` (every file in
    `installed-scripts.txt`), `.framework/package.json` `{"type":"module"}`,
    `.claude/framework/model-tiers.md`, `.claude/settings.json` (copy of
    `templates/settings.json`), `.framework/hooks/hook-reply.sh`, the plan under
    `docs/superpowers/plans/`, all committed. Plans: a one-row table naming
    `` project (`example-project`) `` as `execute here`, isolation to
    `../example-project-wt` on branch `plan/example`; a two-row variant adding
    `` other (`example-other`) `` (a second repository created beside it) so a plan
    naming another repository is still isolated in that repository. Cases:
    1. dispatch prints the prompt, including `bash .framework/scripts/isolate-for-plan.sh <plan>`
       and `npm --prefix .framework ci`; run as `node .framework/scripts/dispatch.mjs <plan>`
       from the project root **and** from `.framework/` (the `npm --prefix` case).
    2. the broken and unpaired-projection cases as today, in the new layout.
    3. isolation run from a subdirectory of the project (`src/`) creates
       `../example-project-wt` as a worktree of `example-project`, and that worktree holds
       `.claude/settings.json` and `.framework/hooks/hook-reply.sh` — the framework
       arrives with the worktree because it is committed.
    4. the two-row plan isolates each row in its own repository (today's `BOTH` case).
    5. a row naming no repository beside the project creates nothing (today's case).
    Delete the case that links the application's `.claude` to the harness's (lines
    ~209–222): there is no overlay. Build each table row's command from parts (*Traps*).
  - `guards/plan-dispatchable.test.js` comment: "The setup installs that module in
    `.framework/scripts/`."

- [ ] **Step 6: Hook wiring.** In `templates/settings.json`, every `"command"` becomes
  `bash .framework/hooks/<same script>`. In `_comment`: "Every hook replies through
  .framework/hooks/hook-reply.sh"; replace "Rules are not delivered by a hook: Claude Code
  loads every .claude/rules/*.md at session start" with "Rules are not delivered by a
  hook: Claude Code loads each .claude/rules/*.md when the agent first touches a file its
  paths: header names".

- [ ] **Step 7: Backticked script paths in shipped documents.** `framework-integrity`
  resolves every backticked `src/`, `docs/`, `scripts/`, `.claude/` or `.github/` path in
  the shipped rules, framework documents, commands and entry-file template against the
  composed project. After this task that project has no `.claude/scripts/`, and after
  Task 2 no `scripts/` either, so these ten references (found 2026-10-14) fail it:

  | Where | Path | Becomes |
  |---|---|---|
  | `commands/capture-learning.md:79` | `scripts/generate-cursor-rules.mjs` | `.framework/scripts/generate-cursor-rules.mjs` |
  | `framework/DECISIONS.md:73` | `scripts/generate-cursor-rules.mjs` | as above if the sentence is about now; un-backticked if it is history |
  | `framework/DECISIONS.md:166` | `.claude/scripts/check-prerequisites.sh` | `.framework/scripts/check-prerequisites.sh` |
  | `framework/DECISIONS.md:276` | `.claude/scripts/hook-reply.sh` | `.framework/hooks/hook-reply.sh` |
  | `framework/DECISIONS.md:286` | `.claude/scripts/probe-hook-channels.sh` | `.framework/scripts/probe-hook-channels.sh` |
  | `framework/DECISIONS.md:297` | `scripts/generate-cursor-rules.mjs` | as line 73 |
  | `framework/rule-delivery.md:77` | `.claude/scripts/probe-hook-channels.sh` | `.framework/scripts/probe-hook-channels.sh` |
  | `rules/harness-scripts.md:48` | `.claude/scripts/probe-hook-channels.sh` | `.framework/scripts/probe-hook-channels.sh` |
  | `rules/learnings.md:11` | `scripts/generate-cursor-rules.mjs` | `.framework/scripts/generate-cursor-rules.mjs` |
  | `rules/learnings.md:62` | `.claude/scripts/hook-reply.sh` | `.framework/hooks/hook-reply.sh` |

  The guard does not resolve `.framework/` paths; `set-up-project.test.js` does, in Task 3.
  Re-run the search after the edit; it must print nothing:

  ```bash
  git grep -n -E '`(scripts|\.claude/scripts)/[^` ]+`' -- rules framework commands templates/CLAUDE.md
  ```

- [ ] **Step 8: Run and commit.**

  ```bash
  git add -A && git commit -m "framework: a project's framework scripts run from .framework/" -m "…body…"
  bash scripts/check-blueprint.sh | tail -4
  ```

  Expected: `Every guard caught its defect and passed the clean baseline.` The commit body
  says what a project gets: its hooks in `.framework/hooks/`, its commands in
  `.framework/scripts/`, each finding the project root from its own location.

### Task 2 — Rules load by area

What becomes true: every shipped rule opens with a `paths:` header; the Cursor
projection is generated from the headers; a rule without a header fails a guard that
projects get.

**Interfaces:**
- Consumes: `installed-scripts.txt` (Task 1).
- Produces: `scripts/rule-areas.js` exporting `parseRule(text) → { paths: string[] | null, body: string }`;
  `guards/rule-areas.test.js`.

- [ ] **Step 1: `scripts/rule-areas.js`** (and add `rule-areas.js` to
  `installed-scripts.txt`):

  ```js
  // Shared machinery: no part of this file is project-owned.
  /**
   * A rule's area: the `paths:` header at the top of each `.claude/rules/*.md` file.
   *
   * The header is the only list of rule areas. Claude Code reads it to load a rule when
   * the agent first touches a matching file; generate-cursor-rules.mjs projects it as
   * Cursor globs; the rule-areas guard checks every rule has one. See
   * .claude/framework/DECISIONS.md, "Rules load by area".
   *
   * Pure — text in, values out. No I/O.
   */

  /**
   * A rule file's area and its body without the header.
   * @param {string} text The whole rule file.
   * @returns {{ paths: string[] | null, body: string }} `paths` is null when the file
   *   has no `paths:` header — such a rule loads in every Claude Code session.
   */
  export function parseRule(text) {
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!m) return { paths: null, body: text };
    const line = /^paths:\s*(\[.*\])\s*$/m.exec(m[1]);
    return { paths: line ? JSON.parse(line[1]) : null, body: text.slice(m[0].length) };
  }
  ```

- [ ] **Step 2: `guards/rule-areas.test.js`:**

  ```js
  // Level: unit
  /**
   * Every rule loads by its area.
   *
   * Claude Code loads a rule from .claude/rules/ when the agent first touches a file its
   * `paths:` header matches; a rule with no header loads in every session, whatever the
   * session is about (DECISIONS.md, "Rules load by area"). Copied into every set-up
   * project by set-up-project.sh, so a project's own checks fail on such a rule.
   */
  import { readdirSync, readFileSync } from 'node:fs';
  import { dirname, resolve } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { parseRule } from '../scripts/rule-areas.js';

  const here = dirname(fileURLToPath(import.meta.url));
  // In a set-up project this file is .framework/guards/, two levels below the root.
  // check-conformance.sh points it at a composed fixture instead.
  const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');
  const rulesDir = resolve(root, '.claude/rules');
  const rules = readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
  const text = (f) => readFileSync(resolve(rulesDir, f), 'utf8');

  describe('rule areas', () => {
    it('gives every rule a paths header naming at least one path', () => {
      const missing = rules.filter((f) => {
        const { paths } = parseRule(text(f));
        return !paths || paths.length === 0;
      });
      expect(missing).toEqual([]);
    });
  });
  ```

- [ ] **Step 3: The generator reads the headers.** Rewrite `scripts/generate-cursor-rules.mjs`
  on the model of first-adopter's `.framework/scripts/generate-cursor-rules.mjs` (without its
  `ALWAYS` loop, which this repository's generator does not have): first line
  `// Shared machinery: no part of this file is project-owned.`; imports `parseRule` from
  `./rule-areas.js` and `projectionOf` from `./projections.js`; `root` two levels up; for
  each rule, exit 1 naming the file when `parseRule` returns `paths: null` (message as
  first-adopter's: the file name and an example header); write `body` (not the whole file)
  under the frontmatter, to `projectionOf(...)`. The "ADOPT THIS ONLY IF" paragraph goes:
  every project gets the projection. Header comment: "Run: `npm --prefix .framework run rules:cursor`".

- [ ] **Step 4: Guards follow.**
  - `guards/cursor-rules-projection.test.js`: compare the projected body with
    `parseRule(source).body.trimEnd()` (import from `../scripts/rule-areas.js`); the
    `ADOPT THIS ONLY IF` and `SET ON ADOPTION` paragraphs go — every project gets the
    projection.
  - `guards/framework-integrity.test.js`: delete checks 1 and 2 (`gives every rule file an
    area`, `names only rule files that exist in the list of areas`), `globsPath`,
    `globsKeys` and the header paragraphs about the glob table; the header lists the one
    remaining property and says rule areas are checked by `rule-areas.test.js`.
  - `scripts/check-conformance.sh`: in the case table, `orphan-rule:framework-integrity`
    becomes `orphan-rule:rule-areas`. In `compose()`,
    after `install_instructions` and before the defect overlay, generate the projections
    with the shipped generator:

    ```bash
    node "$WORK/.framework/scripts/generate-cursor-rules.mjs" >/dev/null
    ```

    and simplify `install_instructions` to copying rules, framework documents, commands
    and the entry-file template — the frontmatter-splicing loop goes, since projections
    are generated afterwards.
  - `fixtures/base/.claude/rules/*.md`: prepend a header to each, keeping each area the
    deleted glob table gave it (planning's moves to where plans live):

    | Rule | `paths:` |
    |---|---|
    | `area.md` | `["src/backend/AREA/**"]` |
    | `backend.md` | `["src/backend/**"]` |
    | `frontend.md` | `["src/frontend/**"]` |
    | `shared.md` | `["src/shared/**"]` |
    | `tests.md` | `["**/__tests__/**"]` |
    | `ci.md` | `[".github/workflows/**"]` |
    | `catalogs.md` | `["feature-catalog.yaml"]` |
    | `planning.md` | `["docs/superpowers/plans/**"]` |
    | `learnings.md` | `["DECISIONS.md"]` |
    | `harness-scripts.md` | `[".framework/**"]`, and its title becomes `# Framework script rules (.framework/)` |

    Header shape, exactly — one line, a JSON list:

    ```
    ---
    paths: ["src/backend/**"]
    ---
    ```

  - Delete `fixtures/base/scripts/generate-cursor-rules.mjs` and
    `fixtures/base/.cursor/rules/*.mdc`. `projection-drift`'s planted `backend.mdc` still
    overrides the generated one.
  - `fixtures/README.md`: *Layout* says compose installs the hooks and scripts named in
    `installed-hooks.txt` and `installed-scripts.txt` under `.framework/`, and generates
    the Cursor projections with the shipped generator; the first trap becomes: "**A rule
    file added to the fixtures needs a `paths:` header.** `rule-areas` fails the clean
    baseline without one, and the generator refuses it. Its projection is generated —
    never write a `.mdc` into `base/`."

- [ ] **Step 5: Headers on the shipped rules.**
  - Headers, as the first three lines of each file:

    | Rule | `paths:` |
    |---|---|
    | `rules/catalogs.md` | `["feature-catalog.yaml"]` |
    | `rules/harness-scripts.md` | `[".framework/**"]` |
    | `rules/learnings.md` | `["DECISIONS.md", ".claude/framework/**", ".claude/rules/**", ".claude/commands/**"]` |
    | `rules/tests.md` | `["**/__tests__/**", "**/*.test.*", "**/*.spec.*", "test/**", "tests/**"]` |
    | `rules/planning.md` | `["docs/superpowers/plans/**", "docs/superpowers/specs/**"]` |


- [ ] **Step 6: Run and commit.**

  ```bash
  git add -A && git commit -m "framework: every rule loads by its area" -m "…body…"
  bash scripts/check-blueprint.sh
  ```

  Expected: `caught  orphan-rule  rule-areas`, every other case caught, clean baseline
  ok.

### Task 3 — The setup script

What becomes true: `bash <blueprint>/scripts/set-up-project.sh <project-root>` sets a
project up in its own repository, and the sibling seed, overlay and working-copy scripts
are gone.

**Interfaces:**
- Consumes: both install lists; `guards/rule-areas.test.js`, `guards/catalog-entries.test.js`.
- Produces: the installed layout below, which Task 4's documents describe and Task 5
  checks end to end.

  | In the project | From the blueprint |
  |---|---|
  | `.claude/rules/`, `.claude/framework/`, `.claude/commands/` | `rules/*.md`, `framework/*.md`, `commands/*.md` |
  | `.claude/settings.json` | `templates/settings.json` |
  | `.cursor/rules/*.mdc` | generated by the installed generator |
  | `.framework/hooks/`, `.framework/scripts/` | the two install lists |
  | `.framework/guards/` | `guards/catalog-entries.test.js`, `guards/rule-areas.test.js`, `templates/project-layout.test.js` |
  | `.framework/package.json`, `.framework/jest.config.js`, `.framework/README.md` | `templates/package.json` (slug filled), `templates/framework-jest.config.js`, `templates/README.md` |
  | `.framework/templates/project-brief.md` | `templates/project-brief.md` |
  | `CLAUDE.md`, `AGENTS.md` | `templates/CLAUDE.md` |
  | `feature-catalog.yaml`, `docs/verification-log.md` | `templates/catalog.yaml`, `templates/verification-log.md` |
  | `.gitignore`, `.gitattributes` | lines appended once |

- [ ] **Step 1: Templates.**
  - `git mv templates/harness-jest.config.js templates/framework-jest.config.js`; its
    comment: `/** Jest config for the framework's checks: .framework/jest.config.js in a set-up project. */`
    (roots stay `<rootDir>/guards`). Update `scripts/check-blueprint.sh` to copy the new
    name, and its wording ("a set-up project's `.framework/node_modules`").
  - `git mv templates/harness-layout.test.js templates/project-layout.test.js`, content:

    ```js
    // Level: unit
    /** What the setup installed is where it put it. Copied to .framework/guards/ by set-up-project.sh. */
    import { existsSync, readFileSync } from 'node:fs';
    import { dirname, resolve } from 'node:path';
    import { fileURLToPath } from 'node:url';

    // .framework/guards/, two levels below the project root.
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

    describe('set-up project layout', () => {
      it('has the framework where the setup put it, and parseable settings', () => {
        const expected = [
          '.claude/framework/workflow.md',
          '.claude/settings.json',
          'feature-catalog.yaml',
          '.framework/scripts/next.mjs',
          '.framework/hooks/hook-reply.sh',
        ];
        expect(expected.filter((p) => !existsSync(resolve(root, p)))).toEqual([]);
        JSON.parse(readFileSync(resolve(root, '.claude/settings.json'), 'utf8'));
      });
    });
    ```

  - `templates/package.json`:

    ```json
    {
      "name": "PROJECT_SLUG-framework",
      "version": "1.0.0",
      "private": true,
      "type": "module",
      "scripts": {
        "test": "node --experimental-vm-modules node_modules/.bin/jest",
        "next": "node ./scripts/next.mjs",
        "dispatch": "node ./scripts/dispatch.mjs",
        "rules:cursor": "node ./scripts/generate-cursor-rules.mjs"
      },
      "devDependencies": {
        "jest": "^29.5.0",
        "yaml": "^2.9.0"
      }
    }
    ```

  - `guards/catalog-entries.test.js`: default root `resolve(here, '../..')` (it lives at
    `.framework/guards/` in a project); comment "copied into every set-up project".
  - `templates/README.md` — the operator guide, installed as `.framework/README.md`:

    ```markdown
    # {{PROJECT_NAME}} — working with the framework

    This project is developed with the project governance framework, set up inside this
    repository: rules, commands and hook wiring in `.claude/`, the framework's code and
    checks in `.framework/`, the backlog in `feature-catalog.yaml`, specs and plans in
    `docs/superpowers/`. All of it is committed, so a clone is a working copy.

    ## Setting up a working copy

        npm --prefix .framework ci

    ## What to type

        npm --prefix .framework run next

    `/next` is a report. It does not start the next command. Before merging a change to
    `.claude/` or `.framework/`, run the framework's checks:

        npm --prefix .framework test

    ## Where the framework lives

    This project was set up from the framework at `{{BLUEPRINT_URL}}`. General adoption,
    the development cycle, and maintenance after setup are documented there — start at
    its README, not by copying those pages into this repository.

    Commands you will type here: `/idea`, `/feature`, `/next`, `/dispatch`,
    `/capture-learning`, `/refresh-model-tiers`.
    ```

  - `templates/CLAUDE.md`, section *Setting up a working copy*, replaced with:

    ```markdown
    ## Setting up a working copy

    Run `npm --prefix .framework ci` after cloning. The framework is committed in this
    repository — rules, commands and hook wiring in `.claude/`, its code in `.framework/` —
    so a clone is a working copy, and there is no second repository to fetch.
    ```

- [ ] **Step 2: Write the failing guard, `guards/set-up-project.test.js`.** It locates the
  script from its own path (no `isBlueprintTree` gate — see *Traps*), and runs it on
  throwaway repositories under `os.tmpdir()`, with `git -c user.name=t -c user.email=t@t`
  for commits. Cases:

  1. **sets a project up in its own repository** — a fresh repository with
     `src/app.js` committed: exit 0; every row of the layout table above exists; every
     file named in both install lists exists in its folder; `.claude/settings.json`'s
     every hook command is `bash .framework/hooks/<file>` and that file exists;
     `.framework/package.json`'s `name` is `<folder name>-framework` and the file holds no
     `PROJECT_SLUG`; there is one `.cursor/rules/<name>.mdc` per `.claude/rules/<name>.md`;
     the temporary parent directory holds nothing but the project — no sibling was
     created.
  2. **names only `.framework/` paths it installed** — after setup, every match of
     `/\.framework\/[A-Za-z0-9_./-]*[A-Za-z0-9_-]/g` in `CLAUDE.md`, `.claude/settings.json`
     and every `.md` under `.claude/` exists in the project, except matches under
     `.framework/node_modules` and `.framework/package-lock.json` (created by the first
     install) and matches containing `*` or `<`. A bare folder (`.framework/`,
     `.framework/hooks`) counts if the folder exists.
  3. **leaves the tooling out of an exported copy** — commit everything,
     `git archive HEAD | tar -t`: no entry starts with `.claude/`, `.cursor/`,
     `.framework/`, `docs/superpowers/`, and none is `CLAUDE.md`, `AGENTS.md`,
     `feature-catalog.yaml`, `docs/verification-log.md`; **and** `src/app.js` is present
     (so an empty archive cannot pass).
  4. **refuses an existing CLAUDE.md, changing nothing** — a repository with its own
     `CLAUDE.md`: exit 1, stderr names `CLAUDE.md`, `.framework` and `.claude` do not
     exist afterwards, `git status --porcelain` is unchanged.
  5. **refuses a folder that is not a git repository** — exit 1, nothing created.
  6. **keeps the project's own ignore and attribute lines** — a repository whose
     `.gitignore` is `node_modules` with no trailing newline and whose `.gitattributes`
     holds `*.png binary`: afterwards both original lines are intact on their own lines,
     `.framework/node_modules/` appears once in `.gitignore`, `.claude/ export-ignore`
     once in `.gitattributes`.

  Run it and see it fail (no script yet):

  ```bash
  git add -A && git commit -qm wip-setup-test   # check-blueprint reads HEAD; squashed in Step 5
  bash scripts/check-blueprint.sh 2>&1 | tail -6
  ```

  Expected: the clean baseline fails, listing `set-up-project` cases.

- [ ] **Step 3: `scripts/set-up-project.sh`:**

  ```bash
  #!/usr/bin/env bash
  # Shared machinery: no part of this file is project-owned.
  #
  # Sets this framework up inside a project's own repository: rules, framework documents,
  # commands and hook wiring in .claude/, the framework's code in .framework/, the entry
  # file and the backlog at the root, and the lines that keep all of it out of an
  # exported copy. Every command the framework offers then runs from .framework/.
  #
  # Refuses, changing nothing, when anything it would write is already there — a second
  # run, or a project with its own CLAUDE.md. Never commits.
  #
  # Usage: bash <framework>/scripts/set-up-project.sh <project-root>

  set -euo pipefail

  BP="$(cd "$(dirname "$0")/.." && pwd)"
  PROJECT="$(cd "${1:?usage: set-up-project.sh <project-root>}" && pwd -P)"

  top=$(git -C "$PROJECT" rev-parse --show-toplevel 2>/dev/null || true)
  if [ -z "$top" ] || [ "$(cd "$top" && pwd -P)" != "$PROJECT" ]; then
    echo "set-up-project: $PROJECT is not the root of a git repository. Run git init there first." >&2
    exit 1
  fi

  present=()
  for t in .claude/rules .claude/framework .claude/commands .claude/settings.json \
           .cursor/rules .framework CLAUDE.md AGENTS.md feature-catalog.yaml \
           docs/verification-log.md; do
    if [ -e "$PROJECT/$t" ]; then present+=("$t"); fi
  done
  if [ "${#present[@]}" -gt 0 ]; then
    echo "set-up-project: nothing changed — already present in $PROJECT:" >&2
    printf '  %s\n' "${present[@]}" >&2
    echo "Move them aside, run this again, then merge your own content back in." >&2
    exit 1
  fi

  mkdir -p "$PROJECT"/.claude/rules "$PROJECT"/.claude/framework "$PROJECT"/.claude/commands \
           "$PROJECT"/.framework/hooks "$PROJECT"/.framework/scripts \
           "$PROJECT"/.framework/guards "$PROJECT"/.framework/templates "$PROJECT"/docs

  cp "$BP"/rules/*.md "$PROJECT/.claude/rules/"
  cp "$BP"/framework/*.md "$PROJECT/.claude/framework/"
  cp "$BP"/commands/*.md "$PROJECT/.claude/commands/"
  cp "$BP"/templates/settings.json "$PROJECT/.claude/settings.json"

  # The install lists are the one place each set is named; check-conformance.sh builds the
  # project the guards test from the same two files, so what ships is what is checked.
  while read -r f; do
    if [ -n "$f" ]; then cp "$BP/scripts/$f" "$PROJECT/.framework/hooks/"; fi
  done < "$BP/scripts/installed-hooks.txt"
  while read -r f; do
    if [ -n "$f" ]; then cp "$BP/scripts/$f" "$PROJECT/.framework/scripts/"; fi
  done < "$BP/scripts/installed-scripts.txt"
  chmod +x "$PROJECT"/.framework/hooks/*.sh "$PROJECT"/.framework/scripts/*.sh

  cp "$BP"/guards/catalog-entries.test.js "$BP"/guards/rule-areas.test.js "$PROJECT/.framework/guards/"
  cp "$BP"/templates/project-layout.test.js "$PROJECT/.framework/guards/"
  cp "$BP"/templates/framework-jest.config.js "$PROJECT/.framework/jest.config.js"
  cp "$BP"/templates/README.md "$PROJECT/.framework/README.md"
  cp "$BP"/templates/project-brief.md "$PROJECT/.framework/templates/"
  slug=$(basename "$PROJECT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//')
  sed "s/PROJECT_SLUG/$slug/" "$BP/templates/package.json" > "$PROJECT/.framework/package.json"

  cp "$BP"/templates/CLAUDE.md "$PROJECT/CLAUDE.md"
  cp "$BP"/templates/CLAUDE.md "$PROJECT/AGENTS.md"
  cp "$BP"/templates/catalog.yaml "$PROJECT/feature-catalog.yaml"
  cp "$BP"/templates/verification-log.md "$PROJECT/docs/verification-log.md"

  # Appended once, never replacing the project's own lines.
  append_once() {
    local file="$PROJECT/$1" line="$2"
    if [ -f "$file" ] && grep -qxF -- "$line" "$file"; then return 0; fi
    if [ -s "$file" ] && [ -n "$(tail -c1 "$file")" ]; then printf '\n' >> "$file"; fi
    printf '%s\n' "$line" >> "$file"
  }
  append_once .gitignore '.framework/node_modules/'
  append_once .gitignore '.claude/settings.local.json'
  append_once .gitattributes '# The framework and its planning material: kept out of any exported copy (git archive).'
  for p in .claude/ .cursor/ .framework/ CLAUDE.md AGENTS.md feature-catalog.yaml \
           docs/superpowers/ docs/verification-log.md docs/project-brief.md \
           docs/BLUEPRINT-UPSTREAM.md; do
    append_once .gitattributes "$p export-ignore"
  done

  node "$PROJECT/.framework/scripts/generate-cursor-rules.mjs"

  echo "Set the framework up in $PROJECT."
  echo "Next, from there: npm --prefix .framework install, then npm --prefix .framework test, then commit."
  ```

  The export patterns follow first-adopter's `.gitattributes`, whose `git archive` check
  passed with them on 2026-10-13 (git on the developer's Mac); case 3 is the check here.

- [ ] **Step 4: Delete the old layout.** `git rm scripts/seed-sidecar.sh
  scripts/install-overlay.sh scripts/setup-working-copy.sh guards/sidecar-seed.test.js
  guards/setup-working-copy.test.js`. Then:

  ```bash
  git grep -n -E "seed-sidecar|install-overlay|setup-working-copy|sidecar-seed|harness-layout|harness-jest" -- . ':!docs/superpowers' ':!feature-catalog.yaml' ':!PORTABILITY-NOTES.md'
  ```

  Every hit left is in a document Task 4 rewrites (`bootstrap.md`, `commands/`, `README.md`,
  `fixtures/README.md`, `framework/DECISIONS.md`, `rules/`). Note them for Task 4.

- [ ] **Step 5: Run and commit.** Fold the `wip-setup-test` commit into this one
  (`git reset --soft HEAD~1` before committing).

  ```bash
  git add -A && git commit -m "framework: a project is set up inside its own repository" -m "…body…"
  bash scripts/check-blueprint.sh | tail -4
  ```

  Expected: all caught, clean baseline ok (the clean baseline runs
  `set-up-project.test.js` for real). If case 2 fails, a document names a `.framework/`
  path the setup does not install: fix the document or the setup, whichever is wrong,
  and say which in the handover.

### Task 4 — What the framework tells people

What becomes true: no document still instructs in two-repository terms; the decisions are
recorded; the README guards pass.

- [ ] **Step 1: Decision records** in `framework/DECISIONS.md`, after FW-008, in its
  format (**Date**, **Status**, **Decision**, **Evidence**, **Rejected**,
  **Consequences**):
  - **FW-009: Rules load by area, through Claude Code's `paths:` header.** 2026-10-14,
    Accepted. Decision: every shipped and project rule opens with a one-line `paths:`
    header holding a JSON list; it is the only list of rule areas — Claude Code loads the
    rule when the agent first touches a matching file, the generator turns it into Cursor
    globs, `rule-areas` (shipped to every project) fails a rule without one; the
    generator's glob table removed. Evidence: first-adopter, measured 2026-10-12, desktop
    Claude Code 2.1.295, the developer's Mac — a header-scoped rule loaded on a read or
    write of a matching file inside the session's own folder and not at session start,
    and did not load for a file in another checkout or behind a link; confirmed in one
    repository on 2026-10-13, Claude Code 2.1.260 (no rule at start; the area's rules
    after reading a file in it). Recorded there as "Rules load by area, through Claude
    Code's header and one hook across checkouts". **No size limit:** first-adopter also
    caps rules at 9,500 characters and split `planning.md` to fit, because a hook
    carrying rules across its checkouts had its reply cut above about 10,000 characters.
    One repository has no such hook, so neither the cap nor the split is ported; a
    size check comes back only with a measurement of a limit in a tool. Rejected: every rule
    loaded at session start (FW-008's consequence: every session pays for every rule); a
    glob table beside the headers (two lists of areas that can disagree). Consequences:
    a session starts with no area rule; a header only works for files inside the
    session's own folder, which is why it takes effect with FW-010; a project's areas
    live in shipped rule files until `rule-areas-are-project-data`; after `/compact` is
    `rules-return-after-compaction`'s; Cursor is `cursor-agents-receive-area-rules`'s.
  - **FW-010: A project is set up inside its own repository.** 2026-10-14, Accepted.
    Decision: `set-up-project.sh` installs the framework into the project's `.claude/`
    and `.framework/` and its root, all committed; every command runs from an entry
    point under `.framework/`; `.gitattributes` keeps it out of an exported copy; the
    sibling harness, overlay and working-copy clone are removed with their three
    scripts. Evidence: first-adopter's two-repository layout, 2026-08-14 to 2026-10-13,
    needed a measured workaround at every crossing (links that loaded nothing without a
    one-time approval; `paths:` rules that loaded only inside the session's folder; a
    hook to carry rules across; a personal setting that loaded rules twice in one
    direction); after its move into one repository its checks, product suite and a
    fresh session all passed (first-adopter's plan
    `docs/superpowers/plans/2026-10-13-project-lives-in-one-repository.md`, review
    record); the agent frameworks surveyed in its spec all install into the project's
    repository. Rejected: keeping the sidecar — the workarounds keep growing; a
    submodule for `.framework/` — the developer chose copies with fingerprints on
    2026-10-09 (`project-takes-a-framework-version`). Consequences: plans usually name
    one repository and isolation makes one worktree, which carries the rules and hooks
    because they are committed; a project with its own `CLAUDE.md` moves it aside to set
    up; taking a later version is `project-takes-a-framework-version`'s.
  - FW-008's **Status** line gains: "Its statement that Claude Code loads every rule at
    session start is replaced by FW-009."
  - Every other backticked `.claude/scripts/…` path in the file: a sentence about the
    framework as it is now points at `.framework/hooks/…` or `.framework/scripts/…`; a
    superseded record keeps its words with the path un-backticked (*Global Constraints*).
    FW-006's current-state sentences name the operator guide `.framework/README.md`
    instead of the harness README.

- [ ] **Step 2: Rules.**
  - `rules/harness-scripts.md`: title `# Framework script rules (.framework/)`; the
    root bullet becomes one root:

    > **Resolve paths against the repository root, never the working directory** —
    > `git rev-parse --show-toplevel`, falling back to the script's own location (two
    > levels above `.framework/hooks/` or `.framework/scripts/`), never `pwd`, because a
    > relative lookup misses from every subdirectory and misses silently. A target file
    > outside the repository stays an absolute path and matches nothing, which is right:
    > another repository's files are not this project's to advise on.

    The project-owned-regions bullet: no example naming the glob table or a working copy
    ("the blocks commands such as `release.md` mark; none of the scripts shipped today has
    one"), and "`check-drift.sh`, run from the blueprint against the project". The probe
    is `.framework/scripts/probe-hook-channels.sh`. "Claude Code loads `.claude/rules/` at
    session start by itself" becomes "Claude Code loads each rule by its `paths:` header
    by itself (FW-009)".
  - `rules/planning.md`, *A plan names the checkouts it may touch*: the second
    paragraph says a project set up by this framework lives in one repository, so the
    table usually has one row — that repository, edit here — and a plan that also edits
    another repository (the framework's, in a flush) adds a row, as does any repository
    it must leave alone. Example table rows: `` `the-project` `` edit here (its
    isolation cell a sibling-worktree command as today's example), `` `the-framework` ``
    do not edit. "Where a harness places an agent somewhere nested" → "Where an agent tool
    places…". The File Structure section's step 5: "add the matching README from the
    doc-closeout table (the project's operator guide vs the blueprint README — separate
    rows)". Keep everything about sibling worktrees: isolation is still a sibling
    worktree.
  - `rules/planning.md`, *Verification covers every checkout the plan edits*: unchanged
    in substance (it covers a plan that edits two repositories), "two edit-here rows"
    wording stays.
  - `rules/tests.md`, the path-existence bullet's precondition: "the project executes
    plans in isolated worktrees and has a helper that looks in more than one checkout —
    a plan worktree and the primary checkout, say. Where nothing looks beyond the tree
    under test, the fallback cannot arise." Drop "An overlay symlink that escapes into
    another tree" → "A link that escapes into another tree".
  - `rules/learnings.md`: `.framework/hooks/hook-reply.sh`.

- [ ] **Step 3: Framework documents and commands.**
  - `framework/workflow.md` doc-closeout rows:
    `| alters what an operator is told to do or how to start (commands named, start path, jobs, streams) | the project's operator guide, \`.framework/README.md\` (and any guard that asserts those claims) |`
    and
    `| alters what an adopter is told to do or how to start | the blueprint \`README\` — only in a plan that executes in the blueprint repository; never as a side-effect of a project plan |`.
    The paragraphs below: "A project holds customised copies of scripts the blueprint
    ships" with the glob-table example replaced by namespaced marker directories alone;
    "`check-drift.sh`, run from the blueprint against a project".
  - `framework/dispatch.md` *Handing over in chat* and `commands/dispatch.md`: "From the
    project root, run `npm --prefix .framework run dispatch -- <plan-path>` and paste what
    it prints into a **new** session." Drop the application-checkout sentence.
  - `framework/rule-delivery.md`: the aim is met in Claude Code — rules arrive by their
    `paths:` header when the agent first touches a matching file (FW-009, with its
    measurement); Cursor's half is unchanged. "in the harness" → "in the project";
    probe path `.framework/scripts/probe-hook-channels.sh`; drop the paragraph about a
    linked `.claude/` folder only if it describes this framework's own layout, keep it
    if it is about the tool's behaviour.
  - `commands/scope.md`: work from the project root; preflight
    `test -f .framework/templates/project-brief.md && test -f feature-catalog.yaml && echo "PROJECT ROOT" || echo "NOT PROJECT ROOT"`,
    and its explanation names the repository `set-up-project.sh` set up; Stage 3 reads
    `.framework/templates/project-brief.md` ("copied by the setup"); `layer` is
    "`product` unless the conversation is about the framework itself or an upstream…".
  - `commands/flush-upstream.md`: "this project `execute here too`"; the check-blueprint
    line `NODE_MODULES=<project worktree>/.framework/node_modules bash <blueprint worktree>/scripts/check-blueprint.sh`.
  - `commands/release.md` line 14: the backlog is in this repository.
  - `commands/bootstrap.md`: rewritten as the short form of the new `bootstrap.md` (next
    step) — description line "Set the framework up in a project's own repository, shape
    the project, draft entry files, verify".

- [ ] **Step 4: `bootstrap.md` and `README.md`.**
  - `bootstrap.md`, by section — the structure stays:
    - *Vocabulary*: drop *Harness*; add *Framework folders* — `.claude/` (rules,
      framework documents, commands, hook wiring) and `.framework/` (the framework's code
      and checks), both committed in the project's repository. *Application* becomes
      *Project* — the repository being built; an exported copy of it carries none of the
      framework.
    - *Prerequisites*: "The set-up project runs the framework's own checks with
      `npm --prefix .framework test`."
    - *Step 0*: the project path is the root of a git repository; if it already holds any
      path the setup writes (the script lists them), move those aside first and merge
      your content back afterwards — most often a `CLAUDE.md`. Drop the harness-name check
      and "Do not copy … into the application".
    - *Step 1 — Name the project*: project path, display name, blueprint URL. The package
      slug is derived from the folder name.
    - *Step 2 — Set the framework up in the project*:
      `bash "$BP"/scripts/set-up-project.sh <project-root>`; what it writes (the table in
      Task 3, as prose or a short table); prune list with `.claude/…` paths as today and
      `templates/RELEASES.md` copied to the project root; hook wiring names
      `.framework/hooks/…`; drop "The hook is inert until Step 6 gives it project-area rules".
    - *Step 3*: run `/scope` from the project root.
    - *Step 4 — Fill the operator guide*: `.framework/README.md` placeholders
      `{{PROJECT_NAME}}`, `{{BLUEPRINT_URL}}`. No slug step.
    - *Step 5*: unchanged.
    - *Step 6*: a rule needs a file under `.claude/rules/` **and a `paths:` header naming
      the files it governs** (the exact shape; `rule-areas` fails otherwise); the `tests.md` exception says "path-existence containment across
      worktrees"; Cursor: the setup installed the generator and projection — after writing
      or changing a rule, `npm --prefix .framework run rules:cursor`. The verification:
      a fresh session in the project lists the rules in its context before using any tool
      (expected: none), then reads a file in one area and lists again (expected: that
      area's rule). Drop the glob-table instructions and the linked-`.claude/` paragraph.
    - *Step 7 — Install and verify*: roster paragraph as today; then
      `npm --prefix .framework install`, `npm --prefix .framework test`,
      `bash .framework/scripts/check-prerequisites.sh`, commit everything including
      `.framework/package-lock.json`; then the export check
      `git archive HEAD | tar -t | grep -E '^(\.claude|\.cursor|\.framework)/'` prints
      nothing. Drop the overlay, `.gitignore`-for-links, clean-clone and working-copy
      paragraphs. The guards paragraph names the three checks the setup copied into
      `.framework/guards/`. "Day to day, start from `/next` (or
      `npm --prefix .framework run next`)."
    - *Checklist*: rewritten to match.
  - `README.md`: remove both *Being replaced* notes. *How it works*: the framework is set
    up inside each project's own repository (`.claude/`, `.framework/`, the backlog,
    specs and plans beside the code, all committed) and every session starts there; the
    three roles paragraph stays. *Living with it*: `npm --prefix .framework run next`.
    *Getting started*: clone this blueprint outside the project; run **`/bootstrap`**,
    which runs `scripts/set-up-project.sh` on the project, runs the **shaping
    conversation** (`/scope`), drafts the entry file and first rules, and verifies the
    checks pass; then `/next` in the project. Keep the link to `bootstrap.md` and every
    other claim `readme-usable` asserts.
  - `guards/readme-usable.test.js`: the case becomes "Getting started describes setting
    the framework up in the project's own repository": keeps `/## Getting started/`,
    `/\/bootstrap/`, `/shaping conversation/i`, `/bootstrap\.md/` and the Plan A check;
    replaces `/sibling/i` with `/own repository/i` and `/\.framework\//`, and adds
    `not.toMatch(/sibling/i)`.
  - `guards/operator-page-closeout.test.js`: operator row matches
    `/alters what an operator is told to do or how to start[\s\S]*?operator guide/`;
    `/never as a side-effect of a project plan/i`; blanket check
    `/any (project|framework|blueprint) change.*README/i`; its test names follow.

- [ ] **Step 5: The leftover search.**

  ```bash
  git grep -n -E "seed-sidecar|install-overlay|setup-working-copy|sidecar|overlay|harness|sibling|\.claude/scripts|other checkout|two checkouts|both checkouts|app-root|APP_ROOT" -- . ':!docs/superpowers' ':!feature-catalog.yaml' ':!PORTABILITY-NOTES.md'
  ```

  Every remaining hit must be one of: a dated record in `framework/DECISIONS.md`; the
  file name `harness-scripts.md` (kept, so references keep resolving); "harness" meaning
  a test harness or an agent tool (e.g. `commands/manual-check.md`,
  `guards/doc-currency.test.js`); "sibling" about worktrees or branches; "overlay" about
  `fixtures/defects/` (the fixtures' own word for a defect layer); the probe's throwaway
  tree in `probe-hook-channels.sh`; the multi-repository support kept in
  `isolate-for-plan.mjs` and `plan-binding.js`. List every hit in the handover with its
  class. A hit that still tells someone to use a harness, an overlay or a second
  checkout is a leftover: fix it.

- [ ] **Step 6: Run and commit.** Then run the two guards `check-blueprint` skips, on a
  staged copy of HEAD:

  ```bash
  git add -A && git commit -m "framework: the framework's documents describe one repository" -m "…body…"
  bash scripts/check-blueprint.sh | tail -4
  STAGE=$(mktemp -d) && git archive HEAD | tar -x -C "$STAGE" \
    && echo '{"type":"module"}' > "$STAGE/package.json" \
    && cp "$STAGE/templates/framework-jest.config.js" "$STAGE/jest.config.js" \
    && ln -s "$NODE_MODULES" "$STAGE/node_modules" \
    && (cd "$STAGE" && FRAMEWORK_ROOT="$STAGE" node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js readme-usable operator-page-closeout 2>&1 | grep -E "^Tests:|✕|failed to run"); rm -rf "$STAGE"
  ```

  Expected: check-blueprint all caught and clean; then `Tests: N passed, N total` with no
  `✕` — and N greater than 2 (if N is 2, both guards skipped: the stage was not read as a
  blueprint tree).

### Task 5 — The criteria, end to end, and the entry shipped

Run on a throwaway project in a scratch directory, from the worktree. `$BP` is the
worktree.

```bash
BP=$PWD
T=$(mktemp -d) && P="$T/e2e-project" && mkdir -p "$P/src" && cd "$P" && git init -q \
  && echo 'console.log(1)' > src/app.js && printf 'node_modules' > .gitignore \
  && git add -A && git -c user.name=t -c user.email=t@t commit -qm init
bash "$BP/scripts/set-up-project.sh" "$P"
ls "$T"
```

- **Criterion 1** — copies into `.claude/` and `.framework/`; every command runs from
  `.framework/`:

  ```bash
  npm --prefix .framework install 2>&1 | tail -1
  npm --prefix .framework test 2>&1 | grep -E "^Tests:|^Test Suites:|✕|failed to run"
  npm --prefix .framework run next 2>&1 | head -5
  (cd src && npm --prefix ../.framework run next 2>&1 | head -2)
  bash .framework/scripts/check-prerequisites.sh | tail -2
  ```

  Expected: `Test Suites: 3 passed, 3 total`; `next` reports from the project's catalog
  from both places; prerequisites ok. `ls "$T"` above printed only `e2e-project`.

- **Criterion 2** — nothing sibling: the three scripts are gone
  (`ls "$BP"/scripts/{seed-sidecar,install-overlay,setup-working-copy}.sh` fails for each)
  and Task 4's leftover search is classified; `bootstrap.md` names no sibling:
  `grep -n -i -E "sibling|harness|overlay" "$BP/bootstrap.md"` — every hit, if any, is
  about worktrees.

- **Criterion 3** — dispatch and isolation on one repository. Write a throwaway plan
  whose one row names `e2e-project`, keeping the command's verb in a variable (*Traps*):

  ```bash
  W=worktree; mkdir -p docs/superpowers/plans
  printf '# E2E\n\n**Model tier: Small.** x\n**Merge authority: self-merge.** x\n\n## Delivers\n\nNone.\n\n## Repositories\n\n| Checkout | Role | Isolation |\n|---|---|---|\n| project (`e2e-project`) | execute here | `git %s add ../e2e-project-wt -b plan/e2e` |\n\n## Global Constraints\n\nNone.\n\n## Traps\n\nNone.\n' "$W" > docs/superpowers/plans/2026-10-14-e2e.md
  git add -A && git -c user.name=t -c user.email=t@t commit -qm setup
  npm --prefix .framework run dispatch -- docs/superpowers/plans/2026-10-14-e2e.md
  (cd src && bash ../.framework/scripts/isolate-for-plan.sh docs/superpowers/plans/2026-10-14-e2e.md)
  ls "$T/e2e-project-wt/.claude/settings.json" "$T/e2e-project-wt/.framework/hooks/hook-reply.sh"
  ```

  Expected: a prompt naming `bash .framework/scripts/isolate-for-plan.sh` and
  `npm --prefix .framework ci`; `isolated in …/e2e-project: …`; both files listed.

- **Criterion 4** — Cursor projection: `ls .cursor/rules/*.mdc | wc -l` equals
  `ls .claude/rules/*.md | wc -l` (5), and each `.mdc` has a non-empty `globs:` line.

- **Criterion 5** — paths headers; the project's checks fail without one:

  ```bash
  printf '# No header\n' > .claude/rules/no-header.md
  npm --prefix .framework test 2>&1 | grep -E "^Tests:|no-header"
  rm .claude/rules/no-header.md
  npm --prefix .framework test 2>&1 | grep -E "^Tests:"
  ```

  Expected: one failed test naming `no-header.md`; then
  all passed.

- **Criterion 6** — export:

  ```bash
  git archive HEAD | tar -t | grep -E '^(\.claude|\.cursor|\.framework|docs/superpowers)/|^(CLAUDE|AGENTS)\.md$|^feature-catalog\.yaml$'
  git archive HEAD | tar -t
  ```

  Expected: the first prints nothing; the second lists `src/app.js`, `.gitignore`,
  `.gitattributes`.

- **Rules load by area, in a fresh session** (measurement — name tool, version,
  machine). From `$P`, if `claude` is available:

  ```bash
  claude --version
  claude -p "This is a probe; change nothing. Step 1: before using any tool, list the first heading line of every file from .claude/rules/ whose text is already in your context, or say 'none'. Step 2: read docs/superpowers/plans/2026-10-14-e2e.md with your Read tool. Step 3: list again every .claude/rules/ heading now in your context. Answer only with the two lists." --allowedTools=Read
  ```

  Expected: step 1 `none`; step 3 the heading of `planning.md`. Paste the answer and version. If `claude` is not available, say so;
  the reviewer runs it.

Clean up: `git -C "$P" worktree remove "$T/e2e-project-wt"; rm -rf "$T"`.

**Ship the entry.** In `feature-catalog.yaml`, on `project-is-set-up-in-its-own-repository`:
`status: shipped`; `modules:` `[scripts/set-up-project.sh, scripts/rule-areas.js,
guards/set-up-project.test.js, guards/rule-areas.test.js]`; add this plan's path to
`refs`; first line of its comment block
`# Shipped by plan docs/superpowers/plans/2026-10-14-project-is-set-up-in-its-own-repository.md.`
On `framework-is-developed-with-itself` and `project-takes-a-framework-version`, remove it
from `blockedBy` (delete the key if empty) and add a dated comment line
`# 2026-10-14: blocker project-is-set-up-in-its-own-repository shipped; dropped.` Commit:

```
framework: the one-repository setup is shipped

Its catalog entry records the scripts and guards that now set a project up
in its own repository, and the two entries it blocked can start.
```

### Task 6 — Hand over

```bash
git diff --stat origin/main...HEAD | tail -1
git diff --name-status origin/main...HEAD
bash scripts/check-blueprint.sh | tail -4
```

Every file in the name-status list must be in *File Structure*. Append `## Handover
report` to this plan with the six sections of `rules/planning.md`: every command above with its actual output; the leftover-search classification;
the criterion-by-criterion results, each criterion marked as covered by an automated
test (name it) or by the Task 5 run. End it with the squash message for the reviewer:

```
framework: a project is set up inside its own repository

Someone starting a project now runs scripts/set-up-project.sh on the project's
own repository: rules, framework documents, commands and hook wiring land in
.claude/, the framework's hooks, command scripts and checks in .framework/,
and every command runs from there. Every rule opens with a paths: header, so
Claude Code loads it only when the agent touches a file in its area, and the
Cursor projection is generated from the same headers; a rule without a header
fails the project's own checks. A plan worktree carries
the framework because it is committed, and .gitattributes keeps all of it out
of an exported copy. The sibling harness, the overlay of links and the
working-copy clone are gone with their scripts. FW-009 and FW-010 record why.

Implements: project-is-set-up-in-its-own-repository
Plan: docs/superpowers/plans/2026-10-14-project-is-set-up-in-its-own-repository.md
```

Commit the handover, push the branch, open a pull request, and stop. Do not merge and do
not write the Review record.

---

## Handover report

Executed inline on 2026-10-14 by Claude Opus 5.5 (Claude Code desktop), branch
`plan/project-is-set-up-in-its-own-repository`, on the developer's Mac (Node 22.15.0, git
2.49.0). `NODE_MODULES` was `../first-adopter/.framework/node_modules` throughout.

### Task completion

- **Task 0** — done. The worktree was created by running the Repositories row's command
  from the primary checkout, as *Traps* says. Baseline `check-blueprint.sh` at `548f02b`:
  `Every guard caught its defect and passed the clean baseline.` While setting up, `main`
  moved to `737e923` (a catalog-only idea, `blueprint-page-checks-run-in-the-self-check`,
  `after:` this entry). The branch was rebased onto it before the first commit; nothing
  in the plan depended on it.
- **Task 1** — done (`3fb5228`).
- **Task 2** — done.
- **Task 3** — done. The guard failed first on a `wip-setup-test` commit (every
  `set-up-project.sh` case failed — no script), then the commit was folded in.
- **Task 4** — done.
- **Task 5** — done, including the optional Claude Code measurement. One defect found
  and fixed (see *What the plan got wrong*), in its own commit.
- **Task 6** — this report.

### Verification results

`bash scripts/check-blueprint.sh | tail -4` after each commit that changed a guard,
script or fixture — final run, on the shipping commit:

```
Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

After Task 2 (full case list; Task 3, 4 and 5 runs were identical in the cases):

```
  caught      orphan-rule            rule-areas
  caught      stale-verification     doc-currency
  caught      missing-review         review-record
  caught      projection-drift       cursor-rules-projection
  caught      plain-reply            rule-delivery
  caught      unpromoted-delivery    catalog-drift
  caught      future-dated-plan      catalog-drift
  caught      silent-shelf           catalog-drift
  caught      undispatchable-plan    plan-dispatchable
  caught      unpaired-projection    plan-dispatchable
  caught      incomplete-entry       catalog-entries
  caught      idea-omits-a-field     catalog-entries
```

Task 3 Step 2, the failing run on `wip-setup-test` (tail):

```
              ● set-up-project.sh › refuses a folder that is not a git repository
              ● set-up-project.sh › refuses an existing CLAUDE.md, changing nothing
              ● set-up-project.sh › sets a project up in its own repository
              ● working-copy setup › … (five cases, deleted in Step 4)
1 problem(s). A guard that cannot fail is not evidence.
```

Task 1 Step 3 probe check — `bash scripts/probe-hook-channels.sh "$(mktemp -d)/p"`: exit 0;
the folder held `.claude/settings.json`, `.claude/rules/probe.md`, `.cursor/rules/probe.mdc`,
`.framework/hooks/probe-hook.sh`, `.framework/hooks/probe-if.sh`, `PROMPT.md`;
`find <dir> -type l` printed nothing.

Task 1 Step 7 and Task 3 Step 4 searches: the backticked-script-path search printed
nothing after the edit. The old-script-name search, after the deletions, hit only
`bootstrap.md`, `commands/bootstrap.md` and `commands/scope.md`, all rewritten in Task 4.

Task 4 Step 6, the two guards `check-blueprint` skips, on a staged copy of HEAD:

```
Tests:       10 passed, 10 total
```

Ten, not two: both ran as a blueprint tree.

Task 5, on a throwaway `e2e-project` in a fresh `mktemp -d`:

- **Criterion 1.** `ls "$T"` → `e2e-project`. `npm --prefix .framework install` → ok.
  `npm --prefix .framework test` → `Test Suites: 3 passed, 3 total` / `Tests: 4 passed,
  4 total`. `npm --prefix .framework run next` printed the report (`Building (catalog
  status)` …) from the root, and from `src/` with `--prefix ../.framework`.
  `check-prerequisites.sh` first printed `MISSING  yaml` / `1 required tool(s) missing`
  (the defect below); after the fix: `Everything required is present.` from the root, from
  `src/` and from `.framework/`, and `MISSING  yaml  run: npm --prefix .framework install`
  with `.framework/node_modules` moved away.
- **Criterion 2.** `ls` of the three old scripts: `No such file or directory` for each.
  `grep -n -i -E "sibling|harness|overlay" bootstrap.md`: no output (exit 1).
- **Criterion 3.** `npm --prefix .framework run dispatch -- docs/superpowers/plans/2026-10-14-e2e.md`
  printed the prompt including `bash .framework/scripts/isolate-for-plan.sh
  docs/superpowers/plans/2026-10-14-e2e.md` and `npm --prefix .framework ci`. From `src/`,
  the isolation helper printed `isolated in …/e2e-project:` followed by the row's command.
  `ls` listed `e2e-project-wt/.claude/settings.json` and
  `e2e-project-wt/.framework/hooks/hook-reply.sh`.
- **Criterion 4.** `5` projections, `5` rules; every `.mdc` has a non-empty `globs:` line
  (`["feature-catalog.yaml"]`, `[".framework/**"]`, …).
- **Criterion 5.** With `no-header.md` planted: `+   "no-header.md",` /
  `Tests: 1 failed, 3 passed, 4 total`. Removed: `Tests: 4 passed, 4 total`.
- **Criterion 6.** The tooling grep printed nothing. `git archive HEAD | tar -t`:
  `.gitattributes`, `.gitignore`, `docs/`, `src/`, `src/app.js`.
- **Rules load by area, in a fresh session.** `claude --version` → `2.1.260 (Claude Code)`,
  the developer's Mac, `claude -p … --allowedTools=Read` from the project:

  ```
  **Before:** none

  **After:** # Spec and plan rules
  ```

| Criterion | Covered by |
|---|---|
| 1. Copies into `.claude/` and `.framework/`; commands run from `.framework/` | `set-up-project.test.js` (layout, hook wiring, slug), `dispatch.test.js` and `next-report.test.js` (run from the root and from `.framework/`); Task 5 run |
| 2. No sibling; the three scripts gone; bootstrap names no sibling | `set-up-project.test.js` (nothing beside the project), `readme-usable.test.js` (`not.toMatch(/sibling/i)`); Task 5 run for the deletions and `bootstrap.md` |
| 3. Dispatch and isolation on one repository | `dispatch.test.js` (isolation from `src/`, worktree carries `.claude/settings.json` and `.framework/hooks/hook-reply.sh`); Task 5 run |
| 4. Cursor projection | `set-up-project.test.js` (one `.mdc` per rule), `cursor-rules-projection.test.js`; Task 5 run for non-empty globs |
| 5. `paths:` headers; checks fail without one | `rule-areas.test.js` (catches `orphan-rule`); Task 5 run in a set-up project |
| 6. Export carries no tooling | `set-up-project.test.js` (archive case); Task 5 run |

### Scope

`git diff --stat origin/main...HEAD | tail -1`, before this report:
`82 files changed, 1065 insertions(+), 1175 deletions(-)`.

Every file in `git diff --name-status origin/main...HEAD` is in *File Structure* except
`scripts/check-prerequisites.sh` (see *What the plan got wrong*). Git reports
`templates/harness-layout.test.js` → `templates/project-layout.test.js` as a delete and
an add, because the content was rewritten.

### Judgment calls

- **The glob-table sentences in `commands/capture-learning.md` and `rules/learnings.md`**
  were reworded in Task 2, not Task 4. Once the table was deleted they told someone to
  add a row to a table that no longer exists. They now say: write a `paths:` header,
  then regenerate the projection.
- **`check-conformance.sh` copies `templates/settings.json` into the composed project.**
  The new `/bootstrap` names `.claude/settings.json`, which every set-up project has.
  `framework-integrity` failed the clean baseline because the composed project lacked
  it. I made the composed project match what the setup installs, rather than removing
  the backticks from a real path.
- **`framework/DECISIONS.md` lines 73 and 297** (the glob table as the list of areas) were
  treated as history and lost their backticks; FW-009 replaces them.
- **FW-006's Decision** was rewritten to the current state (the operator guide at
  `.framework/README.md`; the blueprint README edited only by a plan executing in the
  blueprint repository). Its Rejected line stays as written.
- **`framework/rule-delivery.md`**: the paragraph on linked `.claude/` folders was kept,
  because it describes the tool's behaviour, not this framework's layout.
- **`framework/dispatch.md`** gained one line under *Isolation* naming the install step,
  since the prompt now prints it.
- **`plan-dispatchable.test.js`'s header** lost its "two checkouts from the day it is
  created" paragraph, which would otherwise have been a leftover.
- **Final review**: a self-review, not a fresh reviewer. This session does not spawn
  agents unless the developer asks. The parent review is the second pair of eyes.

### What the plan got wrong

- **`check-prerequisites.sh` was missing from the plan.** It looked for `yaml` and
  `feature-catalog.yaml` from the working directory. In a set-up project `yaml` lives in
  `.framework/node_modules`, so the check reported `yaml` missing in every set-up project
  (criterion 1's `prerequisites ok` failed). It now finds both from its own location, as
  *Traps* requires of every installed script. This is the one file outside *File
  Structure*. No guard covers it; the Task 5 run is the evidence.
- The Task 4 Step 6 command assumes `NODE_MODULES` is still exported. Each step here
  ran in a fresh shell, so it had to be exported again (one `check-blueprint.sh` run
  failed with `NODE_MODULES: set NODE_MODULES …` before that).
- Nothing else. Every expected output above matched.

### Outstanding

- The fresh-session measurement ran with the `claude` CLI 2.1.260. first-adopter's
  measurement was on desktop Claude Code 2.1.295; the desktop app was not re-measured
  here.
- `blueprint-page-checks-run-in-the-self-check` (raised on `main` during this run) is
  still open: `readme-usable` and `operator-page-closeout` still skip inside
  `check-blueprint.sh`. They were run by hand above.

### Leftover search (Task 4 Step 5)

Every remaining hit, by class:

- **Worktrees or branches**: `commands/dispatch.md:9`, `commands/flush-upstream.md:35`,
  `framework/dispatch.md:54`, `framework/workflow.md:207`, `rules/planning.md:103,106,119,278`,
  `scripts/plan-binding.js:86,129`.
- **Another repository a plan may name** (multi-repository support kept):
  `commands/flush-upstream.md:37`, `rules/planning.md:89,113`,
  `scripts/isolate-for-plan.mjs:11,47,51,52`, `scripts/plan-binding.js:256`.
- **The file name `harness-scripts.md`**: `framework/DECISIONS.md:245,287`,
  `framework/rule-delivery.md:81`, `guards/rule-delivery.test.js:9`,
  `scripts/capture-at-merge.sh:17`, `scripts/framework-commit-check.sh:27`,
  `scripts/hook-reply.sh:9`, `scripts/probe-hook-channels.sh:38`.
- **"Harness" as a test harness or agent tool**: `commands/manual-check.md:43`,
  `guards/doc-currency.test.js:61`.
- **"Overlay" as the fixtures' defect layer**: `fixtures/README.md:12,26,44`,
  `scripts/check-conformance.sh:72`.
- **Dated or superseded records**: `framework/DECISIONS.md:231,232` (FW-006 Rejected),
  `250,262` (FW-007, superseded), `342,353` (FW-010, naming what it removed).
- **Asserting absence**: `guards/readme-usable.test.js:64`,
  `guards/set-up-project.test.js:8`, `guards/dispatch.test.js:195`.

None tells anyone to use a harness, an overlay or a second checkout.

### Squash message

```
framework: a project is set up inside its own repository

Someone starting a project now runs scripts/set-up-project.sh on the project's
own repository: rules, framework documents, commands and hook wiring land in
.claude/, the framework's hooks, command scripts and checks in .framework/,
and every command runs from there. Every rule opens with a paths: header, so
Claude Code loads it only when the agent touches a file in its area, and the
Cursor projection is generated from the same headers; a rule without a header
fails the project's own checks. A plan worktree carries
the framework because it is committed, and .gitattributes keeps all of it out
of an exported copy. The sibling harness, the overlay of links and the
working-copy clone are gone with their scripts. FW-009 and FW-010 record why.

Implements: project-is-set-up-in-its-own-repository
Plan: docs/superpowers/plans/2026-10-14-project-is-set-up-in-its-own-repository.md
```

## Review record

Reviewed 2026-10-14 by the specifying session (Claude Code desktop, the developer's Mac,
Node 22.15.0, git 2.49.0), against `dfcf2e4`.

### Checks re-run

- `NODE_MODULES=../first-adopter/.framework/node_modules bash scripts/check-blueprint.sh`:
  all 12 cases `caught` (including `orphan-rule  rule-areas`), `ok  clean baseline`,
  `Every guard caught its defect and passed the clean baseline.`
- The two guards `check-blueprint` skips, on a staged copy of HEAD with
  `FRAMEWORK_ROOT` set to it: `Tests: 10 passed, 10 total`.
- `set-up-project`, `dispatch`, `next-report`, `check-drift` run verbosely on a staged
  copy: every case of the four passed — all six `set-up-project.sh` cases ran, none
  skipped. One unrelated failure in that run, `plan-dispatchable › finds the plans
  directory`, came from running without `FRAMEWORK_ROOT` (its default root lies outside a
  staged copy, identically on `main`); in `check-blueprint` it passes.
- A fresh throwaway project set up from the branch: nothing created beside it; a second
  run exits 1 with `nothing changed —` and `git status --porcelain` empty; hooks wired to
  `bash .framework/hooks/…`; 5 rules, 5 projections whose globs come from the headers;
  `.framework/package.json` named `rev-project-framework`; the project's checks
  `Tests: 4 passed, 4 total`, and `1 failed` naming `no-header.md` with a header-less
  rule planted; `/next` and `check-prerequisites.sh` correct from `src/`; dispatch prints
  `bash .framework/scripts/isolate-for-plan.sh …` and `npm --prefix .framework ci`;
  isolation from `src/` created `rev-project-wt` holding `.claude/settings.json`,
  `.claude/rules/planning.md` and `.framework/hooks/hook-reply.sh`; `git archive HEAD`
  listed `.gitattributes`, `.gitignore`, `README.md`, `docs/`, `src/`, `src/app.js`.
  (`.framework/node_modules` was linked from first-adopter rather than installed.)
- Scope: `git diff --name-status origin/main...HEAD` — every path in *File Structure*
  except `scripts/check-prerequisites.sh`, declared in the handover.
- Catalog: the entry `shipped` with four existing modules; `blockedBy` dropped from
  `framework-is-developed-with-itself` and `project-takes-a-framework-version` with dated
  comments.
- Leftover search re-run with the narrower terms: the six remaining hits outside
  `DECISIONS.md` and the fixtures are about other repositories a plan may name,
  worktrees, or the fixtures' defect layer. None instructs a two-repository setup.

### Found

- The handover's diagnosis of `check-prerequisites.sh` holds: on `main` it tests
  `feature-catalog.yaml` and `require.resolve('yaml')` from the working directory, so a
  set-up project, whose `yaml` lives in `.framework/node_modules`, would always report
  `yaml` missing. The fix resolves both from the script's location. The plan missed the
  file: its *Traps* named this defect class, but the specifying session never searched
  the installed scripts for working-directory lookups before dispatch.
- Nothing else.

### Outstanding disposition

- The fresh-session measurement ran on the `claude` CLI 2.1.260, not the desktop app —
  dropped: the property measured (rules load by `paths:` header) is the CLI's and the
  desktop's alike, and first-adopter measured the desktop on 2026-10-12.
- `readme-usable` and `operator-page-closeout` still skip inside `check-blueprint.sh` —
  `blueprint-page-checks-run-in-the-self-check`.
- first-adopter's upstream queue still holds its 2026-10-13 rules-by-area line, which this
  plan ported — drained at the next flush sitting (`/flush-upstream`), which edits that
  repository; this plan could not.

### Learnings routed

- The plan-author miss above is the one `rules/planning.md` already covers (*The File
  Structure table is a claim about the repository*: grep for what produces and consumes
  a shape you change — here, every installed script's notion of the root). Nothing new to
  file; this is another instance.
- No learning routed for `check-prerequisites.sh` itself: `rules/harness-scripts.md`
  already says never to resolve from the working directory.

### Merged because

Every acceptance criterion was re-run on a fresh set-up project and holds, the self-check
and the skipped page guards pass, and the one file outside the plan's table was a correct
fix to a defect the plan should have listed.
