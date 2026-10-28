# The framework runs its own last release — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing here stops for the developer; Task 4's measurements need
> the Claude Code CLI, and the reviewer runs them if you cannot.

**Goal:** This repository holds release `v0.1.0` in `.claude/` and `.framework/`, put
there by that release's own setup script, so a session here gets the rules, commands and
checks a project gets — the framework's rules fire on its source folders, and an agent
cannot edit the installed copy.

**Spec:** `docs/superpowers/specs/2026-10-15-framework-is-developed-with-itself-design.md`,
§3 *Step 2*. Step 1 (releases and CI) merged as `ec3ee4c`; `v0.1.0` was cut by the
release job as `8aa2446`.

**What this delivers:** `framework-is-developed-with-itself`. Its ten criteria are the
definition of done; Task 5 maps each to its evidence.

**What the specifying session verified on 2026-10-15, against `main` at `8aa2446` and tag
`v0.1.0`:**

- `v0.1.0` is an annotated tag on `8aa2446`. `git archive v0.1.0` extracts a complete
  blueprint, `scripts/set-up-project.sh` included.
- Of the paths the setup refuses to overwrite, this repository has only
  `feature-catalog.yaml`. No `.claude/`, `.cursor/`, `.framework/`, `CLAUDE.md`,
  `AGENTS.md` or `docs/verification-log.md`. `.gitignore` exists (one line,
  `.self-check/`); `.gitattributes` does not.
- **The setup's export lines would break this repository's self-check.** It appends
  unanchored patterns (`.claude/ export-ignore`, `feature-catalog.yaml export-ignore`,
  and the same for `.cursor/`, `.framework/`, `CLAUDE.md`, `AGENTS.md`). Measured in a
  scratch repository with git 2.49.0: `git archive` then also drops
  `fixtures/base/.claude/` and `fixtures/base/feature-catalog.yaml`, and the self-check
  builds its stage with `git archive`. With the patterns anchored (`/.claude/
  export-ignore`), the root copies are dropped and the sample project's are kept. This
  repository has nested matches for all six: `fixtures/base/{.claude,CLAUDE.md,
  feature-catalog.yaml}`, `fixtures/defects/*/{.claude,.cursor,.framework,
  feature-catalog.yaml}`. `docs/superpowers/` and the other `docs/` lines contain a
  slash, so they are anchored already.
- The `v0.1.0` guard `catalog-entries` passes on this repository's backlog (its other test
  needs `.claude/commands/idea.md`, which the setup installs).
- `v0.1.0` installs three checks into a project: `catalog-entries`, `rule-areas`,
  `project-layout` (`scripts/set-up-project.sh` lines 57–58, and `bootstrap.md` Step 7
  says so). The checks on plans and review records are not installed. **The `v0.1.0`
  notes overstate this**: they say `npm --prefix .framework test` fails "when the
  backlog, the rules, the plans and their review records stop agreeing". Task 5
  corrects it in the next release's notes.
- `v0.1.0`'s `/idea` and `/feature` tell a project to run `<docs command>`, the
  generator of a catalog document, and its `rules/catalogs.md` says to run "the
  generator" after any backlog change. `v0.1.0` installs no such generator
  (`.framework/package.json` scripts: `test`, `next`, `dispatch`, `rules:cursor`).
- `v0.1.0`'s entry-file template says Claude Code "loads all of them [the area rules]
  when a session starts". Since `v0.1.0` every rule carries a `paths:` header and loads
  by area (FW-009).
- `v0.1.0`'s setup names `.framework/package.json` from the project's folder name, so in
  a worktree it takes the worktree's name.
- Project-owned blocks in `v0.1.0`'s commands: `/next` (`<backlog command>`), `/idea` and
  `/feature` (`<docs command>`), `/manual-check` (its kinds of check), `/release` (its
  release). No rule or script has one.
- Installed rule headers in `v0.1.0`: `harness-scripts.md` is
  `paths: [".framework/**"]`; `learnings.md` is
  `paths: ["DECISIONS.md", ".claude/framework/**", ".claude/rules/**", ".claude/commands/**"]`;
  `tests.md` is `paths: ["**/__tests__/**", "**/*.test.*", "**/*.spec.*", "test/**", "tests/**"]`,
  which already matches `guards/*.test.js`.
- Claude Code: a deny rule `Edit(<path>)` applies to every built-in file-editing tool,
  Write included; a path with a slash and no leading `/` is matched from the session's
  working directory. Read in secondary guides of Claude Code's permission rules, not
  measured — Task 4 measures it.
- The method for measuring which rules a fresh Claude Code session receives is the one
  the 2026-10-14 plan used (`claude -p … --allowedTools=Read`; its review record).
- Node 22.15.0, git 2.49.0, Claude Code CLI on the developer's Mac.

**Model tier: Medium.** Most content is verbatim; the measurements in Task 4 need judgment
about what a session reports.

**Requires:** network access (one npm install, pushing to GitHub); the Claude Code CLI for Task 4 (optional — the reviewer runs it otherwise).

**Merge authority: parent review.** It changes what governs every later session here.

Do not store a kick-off prompt on this plan.

---

## Delivers

- framework-is-developed-with-itself

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-install -b plan/framework-runs-its-own-release` |

## Global Constraints

- **Install from `v0.1.0`, not from the working tree.** The setup script that runs is the
  tag's.
- **No source folder changes.** `rules/`, `framework/`, `commands/`, `scripts/`,
  `guards/`, `templates/`, `fixtures/`, `bootstrap.md` and `.github/` are not edited. A
  defect found in them is recorded as a finding (Task 5), not fixed.
- **Every local edit to an installed file is one of those this plan names.** Each is
  listed in the squash message, because `project-takes-a-framework-version` will meet
  them.
- **Do not lower, skip or delete a check to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Review Focus

1. **A session in this repository edits the installed copy instead of the source.**
   Expected: Claude Code refuses the edit; `CLAUDE.md` says which folder to edit. Task 4
   measures the refusal. Cursor has no equivalent refusal — the entry file is all it gets.
2. **The self-check after the install** sees the sample project whole and never the
   installed copy. Task 1 runs it and lists the archive.
3. **A rule loads on a source file** — the framework-script rule on `scripts/` and
   `guards/`, the learning-capture rule on `rules/`, `framework/`, `commands/`. Task 4
   measures it in a fresh session.
4. **A fresh clone** runs `npm --prefix .framework ci` and then the project's checks.
   Task 3 runs both from a clean clone of the branch.
5. **The backlog survives the install** byte for byte, apart from the edits Task 5 makes.
   Task 1 compares it.

## Traps

- **The dispatch prompt may tell you to isolate with `.framework/scripts/isolate-for-plan.sh`**,
  which this repository does not have until this plan installs it. Create the one
  worktree by running the Repositories row's command from this checkout.
- **Any text matching the worktree command outside a Repositories table makes a plan
  undispatchable.** This plan extracts the tag with `git archive`, not a second worktree.
- **The setup refusing on `feature-catalog.yaml` is expected** — Task 1 moves it aside
  first, as the setup's own message advises.
- **Edit the installed rules before adding the deny list** (Task 2 orders it). Once
  `.claude/settings.json` denies them, a Claude Code session started in the worktree
  cannot edit them either.
- **`check-blueprint.sh` checks committed content only.** Commit before running it.
- **Zsh treats a word starting with `=` as a command lookup.** Do not `echo =====`.

## File Structure

| File | Change |
|---|---|
| `.claude/rules/*.md`, `.claude/framework/*.md`, `.claude/commands/*.md` | New — installed by `v0.1.0`'s setup |
| `.claude/rules/harness-scripts.md` | Local edit: `paths:` adds `scripts/**`, `guards/**` |
| `.cursor/rules/harness-scripts.mdc` | Regenerated from it |
| `.claude/rules/learnings.md` | Local edit: `paths:` adds `rules/**`, `framework/**`, `commands/**` |
| `.cursor/rules/learnings.mdc` | Regenerated from it |
| `.cursor/rules/*.mdc` | New — generated by the setup |
| `.claude/settings.json` | Installed; `_comment` removed; deny list added |
| `.claude/commands/flush-upstream.md` | Installed, then removed |
| `.claude/commands/next.md`, `idea.md`, `feature.md`, `manual-check.md`, `release.md` | Installed; project-owned blocks filled |
| `.framework/` (hooks, scripts, guards, templates, `jest.config.js`, `package.json`, `README.md`) | New — installed; `package.json` name set; `README.md` filled |
| `.framework/package-lock.json` | New — from `npm install` |
| `CLAUDE.md`, `AGENTS.md` | New — this repository's entry file (identical) |
| `docs/verification-log.md` | New — installed |
| `.gitignore` | Two lines appended by the setup |
| `.gitattributes` | New — appended by the setup, then anchored to the root |
| `feature-catalog.yaml` | Restored from before the install; the entry shipped; four findings |
| `RELEASES.md` | Unreleased: the correction to `v0.1.0`'s notes |
| `README.md` | *What is here*: a row for the installed copy |
| `docs/superpowers/plans/2026-10-15-framework-runs-its-own-release.md` | Handover report |

Doc closeout: the README row is the adopter-facing change (people browsing the
repository now see `.claude/` and `.framework/`). No decision between alternatives
beyond the spec. Findings go to the catalog (Task 5).

---

### Task 1: Install `v0.1.0`

**Files:** everything the setup writes; `feature-catalog.yaml`; `.gitattributes`.

- [ ] **Step 1: Extract the release and move the backlog aside**

From the worktree root:

```bash
REL=$(mktemp -d) && git archive v0.1.0 | tar -x -C "$REL"
ASIDE=$(mktemp -d) && mv feature-catalog.yaml "$ASIDE/"
shasum "$ASIDE/feature-catalog.yaml"
```

Record the checksum in the handover.

- [ ] **Step 2: Run the release's setup on this repository**

```bash
bash "$REL/scripts/set-up-project.sh" "$PWD"
```

Expected: `Set the framework up in …` and the `Next, from there:` line. If it refuses,
paste its message into the handover and stop — the list of paths it found is a finding
the specifying session must see.

- [ ] **Step 3: Put the backlog back**

The setup wrote the template backlog. Replace it with the one moved aside, and check it is
byte-identical:

```bash
mv "$ASIDE/feature-catalog.yaml" feature-catalog.yaml
shasum feature-catalog.yaml
git diff --stat -- feature-catalog.yaml
```

Expected: the same checksum as Step 1; no diff.

- [ ] **Step 4: Anchor the export lines**

Replace `.gitattributes` (the setup created it) with exactly:

```
# The framework and its planning material: kept out of any exported copy (git archive).
# Anchored to the root. Unanchored, these also match the sample project under fixtures/,
# which the self-check exports with git archive.
/.claude/ export-ignore
/.cursor/ export-ignore
/.framework/ export-ignore
/CLAUDE.md export-ignore
/AGENTS.md export-ignore
/feature-catalog.yaml export-ignore
/docs/superpowers/ export-ignore
/docs/verification-log.md export-ignore
/docs/project-brief.md export-ignore
/docs/BLUEPRINT-UPSTREAM.md export-ignore
```

- [ ] **Step 5: Name the framework's package for this repository**

The setup named it after the worktree's folder. In `.framework/package.json`, set
`"name": "claude-project-framework-framework"`.

- [ ] **Step 6: Install, test, commit, self-check**

```bash
npm --prefix .framework install
npm --prefix .framework test 2>&1 | tail -5
git add -A
git commit -m "framework: install release v0.1.0 into the framework's own repository" \
  -m "Runs v0.1.0's own setup script on this repository, so sessions here get the rules, commands, hooks and checks a project gets from the last release, while the next one is built in the source folders. The backlog was moved aside for the setup and restored unchanged. Export lines are anchored to the root, because unanchored they also strip the sample project the self-check exports."
env -u NODE_MODULES bash scripts/check-blueprint.sh | tail -2
git archive HEAD | tar -t | grep -E '^(\.claude|\.cursor|\.framework)/|^(CLAUDE|AGENTS)\.md$|^feature-catalog\.yaml$' ; echo "root copies above: none expected"
git archive HEAD | tar -t | grep -cE '^fixtures/base/\.claude/rules/'
```

Expected:
- `npm --prefix .framework test`: `Tests: … passed`, no failures (three suites).
- self-check: `Every guard caught its defect and passed the clean baseline.`
- the first archive listing prints nothing before its echo line; the count is greater
  than 0.

### Task 2: Rules fire on the source; the installed copy is refused

**Files:** `.claude/rules/harness-scripts.md`, `.claude/rules/learnings.md`,
`.cursor/rules/harness-scripts.mdc`, `.cursor/rules/learnings.mdc`,
`.claude/settings.json`.

- [ ] **Step 1: Widen two rule areas**

Line 2 of `.claude/rules/harness-scripts.md` becomes:

```
paths: [".framework/**", "scripts/**", "guards/**"]
```

Line 2 of `.claude/rules/learnings.md` becomes:

```
paths: ["DECISIONS.md", ".claude/framework/**", ".claude/rules/**", ".claude/commands/**", "rules/**", "framework/**", "commands/**"]
```

Nothing else in either file changes. `tests.md` already matches `guards/*.test.js`.

- [ ] **Step 2: Regenerate the Cursor projection**

```bash
npm --prefix .framework run rules:cursor
git status --short .cursor/
```

Expected: exactly `.cursor/rules/harness-scripts.mdc` and `.cursor/rules/learnings.mdc`
modified.

- [ ] **Step 3: The settings: drop the comment, add the deny list**

In `.claude/settings.json`, delete the `_comment` key (bootstrap Step 2: some tools reject
unknown keys) and add, beside `hooks`:

```json
"permissions": {
  "deny": [
    "Edit(.claude/rules/**)",
    "Edit(.claude/framework/**)",
    "Edit(.framework/hooks/**)",
    "Edit(.framework/scripts/**)",
    "Edit(.framework/guards/**)",
    "Edit(.framework/templates/**)",
    "Edit(.framework/jest.config.js)"
  ]
}
```

Left editable on purpose: `.claude/settings.json`, `.claude/commands/` (their
project-owned blocks), `.framework/package.json` and `.framework/README.md` (the
operator guide). Then:

```bash
python3 -c "import json;json.load(open('.claude/settings.json'));print('settings valid')"
```

- [ ] **Step 4: Check and commit**

```bash
npm --prefix .framework test 2>&1 | grep -E '^Tests:'
git add -A
git commit -m "framework: the framework's rules fire on its source, and its installed copy is refused" \
  -m "The framework-script rule now loads for the source scripts and guards, and the learning-capture rule for the source rules, framework documents and commands, so work on the next release is governed by the last one. Claude Code refuses an agent's edit to the installed rules, framework documents and framework code, which change only by installing a release."
```

### Task 3: The entry file, the commands and the operator guide

**Files:** `CLAUDE.md`, `AGENTS.md`, `.claude/commands/{flush-upstream,next,idea,feature,manual-check,release}.md`,
`.framework/README.md`, `README.md`.

- [ ] **Step 1: The entry file**

Write `CLAUDE.md` with exactly this content, then copy it to `AGENTS.md`
(`cp CLAUDE.md AGENTS.md`):

````markdown
@.claude/framework/workflow.md

**If the line above did not expand into the development workflow, read
`.claude/framework/workflow.md` now.** `@` imports are a feature of some agent tools and
not others; a tool that does not expand them reads this file as plain text and would
otherwise get every area rule and none of the process — no preflight, no branching rule,
no merge sequence, no documentation closeout.

# Project governance framework — project config

This repository builds the project governance framework: the rules, framework documents,
commands, hooks and checks that set up and govern agent-assisted projects. It is
developed with its own last release installed, like any project: `.claude/` and
`.framework/` hold that release, and the next one is built in `rules/`, `framework/`,
`commands/`, `scripts/`, `guards/` and `templates/`. Bash and Node (ES modules), checked
with Jest; no package file at the root.

## Gotchas

- **Two copies of the framework: edit the source.** `rules/`, `framework/`, `commands/`,
  `scripts/`, `guards/`, `templates/` are the next release. `.claude/` and `.framework/`
  are the last one, and change only by installing a release. Claude Code refuses an
  edit to the installed rules, framework documents and framework code; in Cursor
  nothing stops you, so check the path before editing.
- **A lesson goes straight into the source.** This repository is the upstream: a
  doc-closeout row that says "the upstream queue" means the source folders here, and
  there is no `/flush-upstream`.
- **The self-check checks committed content only.** `bash scripts/check-blueprint.sh`
  exports `HEAD` with `git archive`; commit first. `npm --prefix .framework test` is a
  different thing — the installed release's checks on this repository as a project (its
  backlog, its rule headers), not on the source.
- **A plan header field must sit on one line.** The dispatch script reads the first line
  of `Requires:` and the other header fields, and drops the rest without saying so.
- **The worktree command may appear in a plan only in its Repositories table.** Anywhere
  else in the plan, the plan check refuses it as undispatchable.
- **A colon followed by a space inside an unquoted backlog value breaks the YAML.**
  Rephrase or quote it.

## Setting up a working copy

Run `npm --prefix .framework ci` after cloning. The self-check installs its own test
tools into `.self-check/` the first time it runs.

## Load on demand

Do not read these at session start. Read the one that matches the work:

| File | When |
|---|---|
| `README.md` | What adopters are told. Before changing how a project is set up or started. |
| `framework/DECISIONS.md` | Before proposing a change to how the framework works — the next release's decision record. |
| `.claude/framework/DECISIONS.md` | The installed release's decisions, which govern this session. |
| `.claude/framework/doc-architecture.md` | Before adding a document, or describing current state in prose. |
| `RELEASES.md` | Before drafting release notes. |
| `docs/superpowers/specs/` | The design behind an arc, before planning in it. |

Area rules under `.claude/rules/` reach you without asking in Claude Code: each loads
when you first touch a file in its area, source folders included. Cursor does not attach
them, so **in Cursor, read the area's rule yourself before changing files there.**

## Commands

```bash
bash scripts/check-blueprint.sh           # the framework's self-check; committed content only
npm --prefix .framework test              # the installed release's checks on this repository
npm --prefix .framework run next          # the backlog report
npm --prefix .framework run rules:cursor  # after an installed rule's paths: header changes
```

## Comment philosophy

Comment API contracts, non-obvious platform behaviour, invariants, and usage of
shared utilities. Do not narrate. A comment that restates the identifier is noise;
a module docstring that re-describes the filename is noise.
````

- [ ] **Step 2: Remove `/flush-upstream`**

```bash
git rm -q .claude/commands/flush-upstream.md
```

- [ ] **Step 3: Fill the project-owned blocks**

`.claude/commands/next.md`: delete the `<!-- On adoption: … -->` comment (lines 5–6) and
replace `` `<backlog command>` `` with `` `npm --prefix .framework run next` ``.

`.claude/commands/idea.md`: delete the `<!-- On adoption: … -->` comment (lines 5–6), and
replace step 7 with:

```markdown
7. Run the project's checks (`npm --prefix .framework test`) and commit the catalog.
   This project generates no catalog document. If the checks fail on the new entry, fix
   the entry, not the check.
```

`.claude/commands/feature.md`: delete the `<!-- On adoption: … -->` comment (lines 5–7)
and the line `` - `<docs command>` has been run and the generated document is committed with it. ``

`.claude/commands/manual-check.md`: replace the two example kinds between
`<!-- project-owned: begin … -->` and `<!-- project-owned: end -->` (keep both markers,
drop the instruction comment inside the begin marker so it reads
`<!-- project-owned: begin -->`) with:

```markdown
- **Setup** — anything that changes what the setup script writes into a project, or what
  a set-up project's commands do. Procedure: in an empty folder, `git init`, run
  `bash <this checkout>/scripts/set-up-project.sh .`, then
  `npm --prefix .framework install && npm --prefix .framework test`, and look at what
  the change touched.
```

`.claude/commands/release.md`: replace the block from `<!-- project-owned: begin` through
`<!-- project-owned: end -->` with:

```markdown
<!-- project-owned: begin -->
- Run from: the root of this repository, where the backlog also lives.
- Notes file: `RELEASES.md` at the root, with an `## [Unreleased]` section the release
  job promotes.
- Readers: people who set up and run projects with the framework.
- Breaking: as `RELEASES.md` defines it — a project taking the release must act by hand.
  Below 1.0 the release job makes a breaking release raise the middle number.
- Trigger: `gh workflow run ci.yml --ref main -f bump=<bump>`
- Where the run is watched: https://github.com/fcapurso/claude-project-framework/actions/workflows/ci.yml
<!-- project-owned: end -->
```

- [ ] **Step 4: The operator guide**

In `.framework/README.md`, replace `{{PROJECT_NAME}}` with `Project governance framework`,
and replace the paragraph under *Where the framework lives* that begins
`This project was set up from the framework at` with:

```markdown
This repository is the framework itself. The release installed here was set up from its
own tag `v0.1.0` with that release's setup script; the source of the next release is in
the folders at the root, starting at `README.md`.
```

`v0.1.0`'s guide does not name `/flush-upstream`: `grep -n flush .framework/README.md`
prints nothing.

- [ ] **Step 5: The README row**

In `README.md`, *What is here*, add after the `commands/` row:

```markdown
| `.claude/`, `.framework/` | The last release, installed here to develop the next one — not the source |
```

- [ ] **Step 6: Check from a fresh clone, and commit**

```bash
git add -A
git commit -m "framework: the framework's repository has its own entry file and commands" \
  -m "Sessions here are told which folders are the next release and which the installed one, that lessons go straight into the source, and the pitfalls that have already cost time. The commands name this repository's backlog report, checks and release job, and the flush command is gone because there is no upstream above this repository."
CL=$(mktemp -d) && git clone -q --branch plan/framework-runs-its-own-release "$PWD" "$CL" \
  && (cd "$CL" && npm --prefix .framework ci --silent && npm --prefix .framework test 2>&1 | grep -E '^Tests:'); rm -rf "$CL"
env -u NODE_MODULES bash scripts/check-blueprint.sh | tail -2
```

Expected: `Tests: … passed` from the clone; the self-check success line.

### Task 4: Measure what a fresh session gets

Run from the worktree root with the Claude Code CLI. Record `claude --version`, the
machine, and each command's full answer. If the CLI is not available, say so in the
handover and leave the measurements to the reviewer — do not substitute another tool's
result for these two criteria.

- [ ] **Step 1: Rules load on source files**

```bash
claude -p "This is a probe; change nothing. Step 1: before using any tool, list the first heading line of every file from .claude/rules/ whose text is already in your context, or say 'none'. Step 2: read scripts/hook-reply.sh with your Read tool. Step 3: list again every .claude/rules/ heading now in your context. Step 4: read rules/tests.md with your Read tool. Step 5: list again every .claude/rules/ heading now in your context. Answer only with the three lists." --allowedTools=Read
```

Expected: the list after Step 3 contains `# Framework script rules (.framework/)`, which
the list after Step 1 did not; the list after Step 5 contains
`# Learning capture — operational check`. If either is missing, stop and hand back: the
area loads differently from what FW-009 records, and that is for the specifying session.

- [ ] **Step 2: The installed copy is refused; the source is not**

```bash
claude -p "This is a probe. 1) Use your Edit tool to append the line '<!-- probe -->' to the end of .claude/rules/tests.md. 2) Use your Write tool to create .framework/scripts/probe.txt containing 'probe'. 3) Use your Write tool to create probe-control.txt containing 'probe'. Report exactly what each tool returned." --allowedTools=Edit,Write
git status --porcelain
rm -f probe-control.txt
```

Expected: 1) and 2) refused by a permission rule; 3) succeeds. `git status --porcelain`
lists only `?? probe-control.txt`. If 1) or 2) succeeded, revert the file
(`git checkout -- <path>` or delete it), try the deny entries in the form
`Edit(/.claude/rules/**)` (leading slash), re-run, and report both results; if neither
form is refused, stop and hand back.

### Task 5: Findings, the backlog and the notes

**Files:** `feature-catalog.yaml`, `RELEASES.md`.

- [ ] **Step 1: Record the findings as backlog entries**

Add these four entries to `feature-catalog.yaml`, after `framework-is-developed-with-itself`:

```yaml
# Found 2026-10-15 while planning framework-is-developed-with-itself: the setup appends
# unanchored export-ignore lines, which git applies at any depth. This repository's
# sample project lost its .claude/ and backlog from the self-check's export until the
# lines were anchored by hand (/.claude/ export-ignore).
- id: setup-export-lines-match-only-the-root
  title: The setup keeps only the project's own framework out of an exported copy
  status: idea
  value: A project whose own files include a folder or file named like the framework's
    — a nested .claude/, a CLAUDE.md in a package, a sample project — keeps them in an
    exported copy. Today the setup's export lines match at any depth, so those files
    silently disappear from every export.
  acceptanceCriteria: []
  type: bug
  layer: product
  modules: []
  refs:
    - docs/superpowers/plans/2026-10-15-framework-runs-its-own-release.md
# Found 2026-10-15 while planning framework-is-developed-with-itself: /idea, /feature and
# rules/catalogs.md tell a project to run a catalog-document generator; v0.1.0 installs
# none, so every set-up project has a step it cannot run.
- id: set-up-project-can-generate-its-catalog-document
  title: A set-up project's backlog commands only ask for what it has
  status: idea
  value: Someone adding or promoting a backlog entry in a set-up project is told to run
    only commands that exist there. Today the commands and the backlog rule require a
    generator for a catalog document that the setup never installs, so every project
    either edits the commands or skips a step it is told is required.
  acceptanceCriteria: []
  type: bug
  layer: product
  modules: []
  refs:
    - docs/superpowers/plans/2026-10-15-framework-runs-its-own-release.md
# Found 2026-10-15: v0.1.0 installs three checks (backlog entries, rule headers, layout);
# the checks on plans, review records and delivered entries run only in the framework's
# own self-check, against a sample project. The v0.1.0 notes claimed otherwise; corrected
# in RELEASES.md under Unreleased.
- id: set-up-project-checks-its-plans
  title: A set-up project's checks cover its plans and review records
  status: idea
  value: A project set up with the framework is told by its own checks when a merged plan
    left its entry unpromoted, lacks a review record, or cannot be dispatched — the
    failures the framework's workflow says the suite catches. Today a set-up project
    runs only the checks on its backlog entries, its rule headers and its layout.
  acceptanceCriteria: []
  type: bug
  layer: product
  modules: []
  refs:
    - docs/superpowers/plans/2026-10-15-framework-runs-its-own-release.md
# Found 2026-10-15: the entry-file template says Claude Code loads every area rule at
# session start; since FW-009 each loads by its paths: header.
- id: entry-template-says-how-rules-load
  title: A new project's entry file says how its rules actually load
  status: idea
  value: An agent reading a freshly set-up project's entry file is told that each area
    rule loads when it first touches a file in the area, which is what happens. Today
    the template says every rule loads at session start, so an agent may assume it has
    a rule it has not received.
  acceptanceCriteria: []
  type: bug
  layer: product
  modules: []
  refs:
    - docs/superpowers/plans/2026-10-15-framework-runs-its-own-release.md
```

Add any further finding from Tasks 1–4 the same way, or, if it is small, as a line in the
handover's *What the plan got wrong* for the reviewer to place.

- [ ] **Step 2: Ship the entry**

In `framework-is-developed-with-itself`: `status: shipped`; `modules:` lists
`.claude/settings.json`, `CLAUDE.md`, `.gitattributes`, `.github/workflows/ci.yml`,
`.github/scripts/release.mjs`, `scripts/check-blueprint.sh`; add above the entry the
comment:

```yaml
# Shipped by plans docs/superpowers/plans/2026-10-15-framework-releases-from-a-green-self-check.md
# and docs/superpowers/plans/2026-10-15-framework-runs-its-own-release.md. The criteria on
# what an agent receives and what it is refused are backed by the fresh-session
# measurements in the second plan's handover and review record.
```

- [ ] **Step 3: Correct the `v0.1.0` notes**

In `RELEASES.md`, replace `_Nothing yet._` under `## [Unreleased]` with:

```markdown
### Correction to 0.1.0's notes

- `npm --prefix .framework test` runs three checks in a set-up project: that every
  backlog entry has its required fields, that every rule has a `paths:` header, and that
  the framework is where the setup put it. The 0.1.0 notes said it also checks plans and
  their review records; it does not yet.
```

`/release` adds the *Checked on the release candidate* line when it drafts the next
release; do not add it here.

- [ ] **Step 4: Check and commit**

```bash
npm --prefix .framework test 2>&1 | grep -E '^Tests:'
git add -A
git commit -m "framework: the install's findings are in the backlog, and the 0.1.0 notes are corrected" \
  -m "Four defects the install exposed in the setup are recorded as entries, so they reach a later release instead of being worked around again. The next release's notes correct what 0.1.0 claimed a project's checks cover. The entry ships."
env -u NODE_MODULES bash scripts/check-blueprint.sh | tail -2
git push -u origin plan/framework-runs-its-own-release
gh run watch --exit-status "$(gh run list --branch plan/framework-runs-its-own-release --limit 1 --json databaseId -q '.[0].databaseId')"
```

Expected: tests pass; self-check success line; the CI run's `self-check` job succeeds.

### Task 6: Handover report

Append `## Handover report` with the six sections `rules/planning.md` names. Under
*Verification results*, map each of the entry's ten criteria to its evidence (a command
and its output, the CI run, or a Task 4 measurement with tool, version and machine).
Commit, push, and open the pull request:

```bash
gh pr create --base main --title "framework: the framework runs its own last release" \
  --body "Plan: docs/superpowers/plans/2026-10-15-framework-runs-its-own-release.md"
```

Do not merge: merge authority is parent review. The squash message the reviewer uses must
list the local edits to installed files: the two widened rule areas, the deny list, the
removed `_comment`, the removed `/flush-upstream`, the filled command blocks, the package
name, and the anchored export lines.

## Handover report

### Task completion

- Task 1 completed in `11fcbde`: installed `v0.1.0` with its own setup, restored the
  backlog byte-identically, anchored the export-ignore lines, and named the installed
  package. The backlog checksum before and after restore was
  `e034f5a2f80586daa375d29238d2fbe643506e71`.
- Task 2 completed in `282f043`: widened the two installed rule areas, regenerated their
  Cursor projections, removed `_comment`, and added the deny list.
- Task 3 completed in `ad7b0eb`: added the repository entry files, removed
  `/flush-upstream`, filled the project-owned command blocks, and updated the installed
  guide and repository README.
- Task 4 could not perform the fresh-session measurements. Claude Code authentication
  failed before the first probe, so the second probe was not run.
- Task 5 completed in `364b7d0`: shipped the entry, recorded four findings, and corrected
  the `v0.1.0` release notes.
- Task 6 appended this handover. The plan checkboxes remain unticked because task
  completion is recorded here.

The four commits above have unchanged trees after the controller removed injected
`Co-authored-by` trailers. Their current messages contain neither `Co-authored-by` nor
`Generated with` trailers.

### Verification results

1. **Release only from a green release job.** CI run
   [38728252061](https://github.com/fcapurso/claude-project-framework/actions/runs/38728252061)
   ran for this branch: the `self-check` job succeeded and the `release` job was skipped.
   This is the non-release path; this execution did not exercise the failing-self-check
   or release/tag path.
2. **Self-check on pushes and pull requests.** The same push CI run's `self-check` job
   succeeded. The local command
   `env -u NODE_MODULES bash scripts/check-blueprint.sh | tail -2` printed:

   ```text
   Every guard caught its defect and passed the clean baseline.
   ```

3. **Self-check is self-contained and uses the release's project tools.** After setup,
   `npm --prefix .framework test 2>&1 | tail -5` printed:

   ```text
   Test Suites: 3 passed, 3 total
   Tests:       4 passed, 4 total
   Snapshots:   0 total
   Time:        0.315 s
   Ran all test suites.
   ```

   The subsequent self-check printed `Every guard caught its defect and passed the clean
   baseline.` without another project.
4. **Self-check checks source, not the installed copy, with export-ignore in place.**
   `git archive HEAD | tar -t | grep -E '^(\.claude|\.cursor|\.framework)/|^(CLAUDE|AGENTS)\.md$|^feature-catalog\.yaml$' ; echo "root copies above: none expected"`
   printed only:

   ```text
   root copies above: none expected
   ```

   `git archive HEAD | tar -t | grep -cE '^fixtures/base/\.claude/rules/'` printed:

   ```text
   11
   ```

5. **Release `v0.1.0` exists with adopter-facing notes.**
   `git rev-parse 'v0.1.0^{}'` printed:

   ```text
   8aa2446b7afd7c95b1048710104d308f8b0e85c2
   ```

   `git cat-file -t v0.1.0` printed:

   ```text
   tag
   ```

   `git show v0.1.0:RELEASES.md | sed -n '20,47p'` printed:

   ```text
   ## [0.1.0] — 2026-10-15

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
   ```

   Task 1 also successfully extracted the tag with
   `git archive v0.1.0 | tar -x -C "$REL"` and ran its setup.
6. **This repository holds `v0.1.0`, installed by its setup, in a commit that names the
   release.** `bash "$REL/scripts/set-up-project.sh" "$PWD"` printed:

   ```text
   Wrote 5 rule files to .cursor/rules/
   Set the framework up in ~/src/claude-project-framework-install.
   Next, from there: npm --prefix .framework install, then npm --prefix .framework test, then commit.
   ```

   Commit `11fcbde` is
   `framework: install release v0.1.0 into the framework's own repository`.
7. **Fresh agents receive the source-script and learning-capture rules.** Not measured.
   On Claude Code 2.1.260, Darwin 25.2.0 (macOS 26.2,
   `dev-laptop.local`), the Step 1 `claude -p` probe exited 1 with:

   ```text
   Failed to authenticate: OAuth session expired and could not be refreshed
   ```

   See Outstanding; the reviewer must run this fresh-session probe.
8. **Fresh agents are refused edits to the installed copy.** Not measured. Per Task 4,
   Step 2 was not run after Step 1's authentication failure. See Outstanding; the
   reviewer must run this fresh-session probe.
9. **The project's checks pass, including backlog entries.**
   `npm --prefix .framework test` printed:

   ```text
   PASS guards/catalog-entries.test.js
   PASS guards/project-layout.test.js
   PASS guards/rule-areas.test.js

   Test Suites: 3 passed, 3 total
   Tests:       4 passed, 4 total
   ```

10. **Every setup workaround is recorded as a finding.** Task 5 added four entries:
    `setup-export-lines-match-only-the-root`,
    `set-up-project-can-generate-its-catalog-document`,
    `set-up-project-checks-its-plans`, and `entry-template-says-how-rules-load`.
    This command checks those ids and the shipped status of their parent entry:

    ```bash
    rg -n --fixed-strings \
      -e 'id: framework-is-developed-with-itself' \
      -e 'id: setup-export-lines-match-only-the-root' \
      -e 'id: set-up-project-can-generate-its-catalog-document' \
      -e 'id: set-up-project-checks-its-plans' \
      -e 'id: entry-template-says-how-rules-load' feature-catalog.yaml
    awk '/^- id: framework-is-developed-with-itself$/{print NR ":" $0; getline; print NR ":" $0; getline; print NR ":" $0}' feature-catalog.yaml
    ```

    It printed:

    ```text
    547:- id: framework-is-developed-with-itself
    596:- id: setup-export-lines-match-only-the-root
    612:- id: set-up-project-can-generate-its-catalog-document
    629:- id: set-up-project-checks-its-plans
    644:- id: entry-template-says-how-rules-load
    547:- id: framework-is-developed-with-itself
    548:  title: The framework is developed with an installed release of itself
    549:  status: shipped
    ```

    Its test printed `Tests:       4 passed, 4 total`, and its self-check printed
    `Every guard caught its defect and passed the clean baseline.`

### Scope

Against the merge base with `main`, `git diff --stat` printed:

```text
 .claude/commands/bootstrap.md                      |   72 +
 .claude/commands/capture-learning.md               |   97 +
 .claude/commands/dispatch.md                       |   13 +
 .claude/commands/feature.md                        |   22 +
 .claude/commands/idea.md                           |   36 +
 .claude/commands/manual-check.md                   |   81 +
 .claude/commands/next.md                           |   18 +
 .claude/commands/refresh-model-tiers.md            |   67 +
 .claude/commands/release.md                        |  128 +
 .claude/commands/scope.md                          |  174 +
 .claude/framework/DECISIONS.md                     |  366 ++
 .claude/framework/commit-format.md                 |   83 +
 .claude/framework/dispatch.md                      |   80 +
 .claude/framework/doc-architecture.md              |   68 +
 .claude/framework/model-tiers.md                   |  113 +
 .claude/framework/rule-delivery.md                 |   88 +
 .claude/framework/workflow.md                      |  400 +++
 .claude/rules/catalogs.md                          |  100 +
 .claude/rules/harness-scripts.md                   |   79 +
 .claude/rules/learnings.md                         |   82 +
 .claude/rules/planning.md                          |  351 ++
 .claude/rules/tests.md                             |   50 +
 .claude/settings.json                              |   50 +
 .cursor/rules/catalogs.mdc                         |  103 +
 .cursor/rules/harness-scripts.mdc                  |   82 +
 .cursor/rules/learnings.mdc                        |   85 +
 .cursor/rules/planning.mdc                         |  354 ++
 .cursor/rules/tests.mdc                            |   53 +
 .framework/README.md                               |   28 +
 .framework/guards/catalog-entries.test.js          |   50 +
 .framework/guards/project-layout.test.js           |   22 +
 .framework/guards/rule-areas.test.js               |   31 +
 .framework/hooks/capture-at-merge.sh               |  111 +
 .framework/hooks/capture-at-write.sh               |   74 +
 .framework/hooks/framework-commit-check.sh         |   86 +
 .framework/hooks/hook-reply.sh                     |   52 +
 .framework/jest.config.js                          |    7 +
 .framework/package-lock.json                       | 3682 ++++++++++++++++++++
 .framework/package.json                            |   16 +
 .framework/scripts/check-prerequisites.sh          |   88 +
 .framework/scripts/dispatch.mjs                    |   75 +
 .framework/scripts/generate-cursor-rules.mjs       |   53 +
 .framework/scripts/isolate-for-plan.mjs            |   80 +
 .framework/scripts/isolate-for-plan.sh             |    7 +
 .framework/scripts/next-work.js                    |  174 +
 .framework/scripts/next.mjs                        |  129 +
 .framework/scripts/plan-binding.js                 |  266 ++
 .framework/scripts/probe-hook-channels.sh          |  141 +
 .framework/scripts/projections.js                  |   21 +
 .framework/scripts/rule-areas.js                   |   24 +
 .framework/templates/project-brief.md              |   76 +
 .gitattributes                                     |   13 +
 .gitignore                                         |    2 +
 AGENTS.md                                          |   74 +
 CLAUDE.md                                          |   74 +
 README.md                                          |    1 +
 RELEASES.md                                        |    7 +-
 .../2026-10-15-framework-runs-its-own-release.md   |  290 ++
 docs/verification-log.md                           |   32 +
 feature-catalog.yaml                               |   79 +-
 60 files changed, 9157 insertions(+), 3 deletions(-)
```

Every path is in the File Structure table: the `.claude/commands/**`,
`.claude/framework/**`, `.claude/rules/**`, `.cursor/rules/**`, and `.framework/**`
paths are covered by their table rows; the table also names `.gitattributes`,
`.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `RELEASES.md`,
`docs/verification-log.md`, and `feature-catalog.yaml` individually. This handover adds
the table's named plan path. `.claude/commands/flush-upstream.md` was installed and then
removed, so it is absent from the net diff.

### Judgment calls

- Evidence is reported at the strength actually observed. The successful CI run is not
  presented as evidence of failure-path or release-path behavior, and the failed
  authentication is not presented as a rule-loading or refusal result.
- Task 4 stopped after the authentication failure and did not try a substitute
  measurement, as required by its brief.

### What the plan got wrong

- `.claude/commands/manual-check.md` line 27 still says
  `Both — one entry, both kinds`. The plan replaced only the text between the
  project-owned markers with a single Setup kind, leaving this contradictory line
  outside the replaced block. The command was not edited during handover.
- The fresh-session probes assumed a usable Claude Code login. Claude Code 2.1.260 could
  not refresh the expired OAuth session on this machine, so neither criterion received
  its planned measurement.

### Outstanding

- The reviewer must run both Task 4 fresh-session probes with authenticated Claude Code:
  source-file rule loading and installed-copy edit refusal.
- The reviewer should settle the contradictory `Both — one entry, both kinds` line in
  `.claude/commands/manual-check.md`; this handover records it but does not change it.
- The controller pushes this branch and opens the pull request after the
  whole-branch review. Merge stays with the parent review. The two fresh-session
  probes above are still outstanding: Claude Code 2.1.260 could not refresh its
  OAuth session on this machine, and the same failure recurred when the
  whole-branch reviewer ran the first probe.
- On merge, the reviewer must use a squash message that lists all local edits to
  installed files: the two widened rule areas; the deny list; the removed `_comment`;
  the removed `/flush-upstream`; the filled command blocks; the package name; and the
  anchored export lines.

## Review record

Reviewed 2026-10-15 by the specifying session (Claude Code, Opus 5.5) on the developer's
Mac (`dev-laptop.local`, macOS 26.2). The branch was already on `origin/main`
(`2e38dc7`); no rebase needed.

### Checks re-run

- **Installed files against the tag.** Every file under `.claude/rules/`,
  `.claude/framework/`, `.claude/commands/`, `.framework/hooks/`, `.framework/scripts/`,
  the three guards, `jest.config.js`, `templates/project-brief.md` and
  `docs/verification-log.md` compared by checksum with its `v0.1.0` source. Seven differ,
  exactly the plan's: `.claude/rules/harness-scripts.md`, `.claude/rules/learnings.md`,
  and `.claude/commands/{next,idea,feature,manual-check,release}.md`. Each diff read
  against the plan's text: as specified.
- **Other local edits:** `.claude/settings.json` has keys `hooks` and `permissions`, the
  seven deny entries as planned; `.framework/package.json` is named
  `claude-project-framework-framework`; `.gitattributes` is the anchored text;
  `CLAUDE.md` and `AGENTS.md` have the same checksum.
- `npm --prefix .framework test` → `Tests: 4 passed, 4 total`.
- `env -u NODE_MODULES bash scripts/check-blueprint.sh` → `Every guard caught its defect
  and passed the clean baseline.`
- `git archive HEAD | tar -t` → no root `.claude/`, `.cursor/`, `.framework/`,
  `CLAUDE.md`, `AGENTS.md` or `feature-catalog.yaml`; 11 entries under
  `fixtures/base/.claude/rules/`.
- A fresh clone of the branch: `npm --prefix .framework ci`, then
  `npm --prefix .framework test` → `Tests: 4 passed, 4 total`, and
  `npm --prefix .framework run next` prints the backlog report.
- No commit carries a `Co-authored-by` trailer.

**Fresh-session measurements (criteria 7 and 8)**, which the executor could not run: the
same Claude Code CLI, 2.1.260, failed here too with `OAuth session expired and could not
be refreshed` until the developer signed in again. Then, from the branch's worktree:

- *Rules load on source files* — the plan's Task 4 Step 1 probe answered:
  1. `none`;
  2. after reading `scripts/hook-reply.sh`: `# Framework script rules (.framework/)`;
  3. after reading `rules/tests.md`: that and `# Learning capture — operational check`.
- *The installed copy is refused* — the Task 4 Step 2 probe: Edit on
  `.claude/rules/tests.md` and Write of `.framework/scripts/probe.txt` both returned
  `File is in a directory that is denied by your permission settings.`; Write of
  `probe-control.txt` succeeded. `git status --porcelain` → `?? probe-control.txt` only;
  removed. The project-relative form `Edit(.claude/rules/**)` works; the leading-slash
  fallback was not needed.

### Found

The executor's *What the plan got wrong*: `/manual-check` still offered **Both** kinds
with only one kind left. Fixed here in `6c7eda8` by removing that line — a local edit to an
installed command outside its project-owned block, listed in the squash message. Nothing
else.

### Outstanding disposition

- Fresh-session probes: run above. Closed.
- The **Both** line: fixed above. Closed.
- The squash message lists every local edit to installed files: done at merge.
- In Cursor nothing refuses an edit to the installed copy; the entry file says so. Known
  and accepted in the spec (§3, Step 2).

### Learnings routed

- **The four setup defects** found while planning are backlog entries
  (`setup-export-lines-match-only-the-root`,
  `set-up-project-can-generate-its-catalog-document`, `set-up-project-checks-its-plans`,
  `entry-template-says-how-rules-load`).
- **A fresh-session measurement can fail on the CLI's login, not on what it measures.**
  Both sessions hit an expired sign-in. One occurrence; not routed — the planning rule
  already lets the reviewer take a measurement the executor cannot.

### Merged because

The install is byte-identical to `v0.1.0` outside the edits the plan names, every check
passes locally, from a fresh clone and in CI, and both fresh-session measurements show
the rules reaching the source folders and the installed copy refused.
