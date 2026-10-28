# The framework is developed with an installed release of itself — design

**Date:** 2026-10-15
**Status:** Approved in conversation; awaiting review of this written spec.
**Entry:** `framework-is-developed-with-itself` (`feature-catalog.yaml`).
**Arc:** `docs/superpowers/specs/2026-10-09-framework-updates-like-a-dependency-design.md`.

## 1. What becomes true

This repository holds its last release in `.claude/` and `.framework/`, set up exactly as
any project's, and develops the next release in its source folders (`rules/`,
`framework/`, `commands/`, `scripts/`, `guards/`, `templates/`). So:

- a session here gets the rules, backlog commands, dispatch and checks a project gets;
- it runs a stable copy, so a half-written rule does not govern the session writing it;
- the setup is first tried for real on the framework itself, not on someone's project.

Releases exist for the first time: tagged, with notes, cut only from a green self-check.

## 2. Decisions, as agreed on 2026-10-15

1. **A release is a tag with notes, cut by a pipeline** (option B). `RELEASES.md` at the
   root, from `templates/RELEASES.md`; `/release` drafts, a CI job releases.
2. **CI is part of this entry**, as one GitHub Actions workflow:
   - **self-check** on every push and pull request;
   - **release**, started by hand with the bump (`patch` or `minor`, or `major` once at
     1.0): runs the self-check, promotes `## [Unreleased]` under the new version heading,
     commits, tags `vX.Y.Z`, pushes. Any failure stops it before the tag. Nothing is
     published to npm — that is `framework-installs-as-a-package`.
   The repository is private and `main` has no branch protection (not offered on its
   plan), so the job pushes the notes commit and tag directly.
3. **The first release is `v0.1.0`.** Below 1.0, a breaking release bumps the middle
   number and anything else the last. 1.0 is left to mean installable as a package and
   updatable.
4. **Readers of the notes:** people who set up and run projects with the framework.
5. **Breaking:** a release is breaking when a project taking it must act by hand — a
   file in `.claude/` or `.framework/` moved, renamed or removed; a command removed or
   renamed; a hook entry in `settings.json` changed; a project-owned block changed shape;
   or a rule's `paths:` header changed so the project's own paths need revisiting.

## 3. Two steps, each merged on its own

The release must exist before it can be installed, and the pipeline that cuts it is
built here, so the work is two plans in this order.

### Step 1 — release machinery, then `v0.1.0`

- `RELEASES.md` and the workflow file (§2).
- **The self-check stands alone.** `scripts/check-blueprint.sh` today needs
  `NODE_MODULES` from another set-up project. It gets its test tools from
  `templates/package.json` — what a project receives in the release being built — in CI,
  and locally by default; `NODE_MODULES` stays as an override.
- **The self-check checks the source, not the install — already true, no change.**
  *Corrected 2026-10-15 while planning step 1; this bullet first said the stage would
  lose the backlog and specs and had to keep them.* Checked against the scripts: every
  guard runs with `FRAMEWORK_ROOT` pointed at the composed sample project, so none reads
  the stage's own backlog or specs, and Jest's only root is the stage's `guards/`, so an
  installed `.framework/guards/` is never run. The `export-ignore` lines step 2 adds also
  drop the installed copy from the stage, since it is built with `git archive`. Step 2's
  first self-check run, locally and in CI, is the evidence.
- **First notes.** `/release` is not installed yet, so the specifying session follows
  `commands/release.md` from source by hand: a first-release draft from every shipped
  entry that changes what a reader can do, confirmed by the developer. The developer
  starts the release job; an agent never does.

### Step 2 — install `v0.1.0` here

1. Check the tag out into a temporary worktree.
2. Move `feature-catalog.yaml` aside, run that release's `scripts/set-up-project.sh` on
   this repository, merge the backlog back — the setup's own advice for a project with
   existing content, followed as a customer would. Nothing in the setup is changed to
   suit this repository.
3. Local changes, each recorded in the install commit body as a local edit to installed
   files, because `project-takes-a-framework-version` will meet them:
   - **Rule areas widened to the source folders.** `harness-scripts.md` adds
     `scripts/**` and `guards/**`; `learnings.md` adds `rules/**`, `framework/**`,
     `commands/**`. `tests.md` already matches `guards/*.test.js`. The Cursor
     projection is regenerated.
   - **Hooks left as shipped.** They watch `.claude/rules/` and `.claude/framework/`
     because those files run in every later session. Here that is the installed copy;
     a source rule takes effect only when released.
   - **The installed copy cannot be edited by an agent.** `.claude/settings.json` denies
     Edit and Write on `.claude/rules/**`, `.claude/framework/**` and `.framework/**`.
     The setup writes with a script, so it is unaffected, and the developer can still
     edit. `.claude/settings.json` and the commands' project-owned blocks stay editable.
   - **`CLAUDE.md` for this repository**, from the template, with its gotchas: edit the
     source folders, never the installed copy; a lesson goes straight to the source,
     because there is no upstream above this repository.
   - **`/flush-upstream` removed**, as a project removes a command it cannot use.
   - **Project-owned blocks filled** for this repository: `/next`'s backlog command,
     `/idea`'s docs command, `/release`'s block (§2), and any other the setup leaves.
4. `npm --prefix .framework install`, `npm --prefix .framework test`, commit. The commit
   names `v0.1.0`.
5. **What hurt is a finding.** Every place the setup had to be worked around, or its
   advice was wrong or unclear, is written down — a catalog entry or a line in the
   install commit — not smoothed over.

Later releases come in through `project-takes-a-framework-version`; until it exists, a
re-install repeats step 2.

## 4. Acceptance criteria

Written into the catalog entry; the plans map each to a test, a `/manual-check` record,
or a recorded fresh-agent check.

## 5. Not in scope

- Publishing a package, and what a package ships — `framework-installs-as-a-package`.
- Recording the installed version in a file, fingerprints, and taking later releases —
  `project-takes-a-framework-version`.
- A README rule for every product — `product-readme-is-kept-current`.
- The checks on the blueprint's own pages that skip in the self-check —
  `blueprint-page-checks-run-in-the-self-check`.
- Shipping a CI workflow to projects. This workflow is this repository's own.
