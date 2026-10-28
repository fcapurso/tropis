# Tropis goes public — design

Date: 2026-10-27. Status: the cleanup has merged (pull request 132). The other entries
are captured as ideas; nothing is planned yet.

## Why

Tropis is to be published as open source, under the MIT licence, from a fresh public
repository at the address it has now, `fcapurso/tropis`. The current private repository
is renamed and kept as the archive. The new repository starts from one commit with no
history, because the history holds material that must not be published, and a fresh
start is simpler and safer than rewriting it.

Before publishing, a cleanup (pull request 132) removed about 300 mentions of a private
adopting project by name, a customer's site, quotations of that project's internal rules,
the developer's home paths and the developer's machine name. None of it was a credential,
so GitHub's secret scanning would have caught none of it. Most of it was not pasted by
mistake: the framework's own process put it there.

- Evidence from an adopting project cites it by its folder name.
- The workflow and two rules ask a measurement to name "tool, version and machine", and
  agents wrote the hostname.
- `/flush-upstream` names its branches and pull requests after the project's folder.

## The entries

| Entry | Where | What becomes true |
|---|---|---|
| `own-files-refuse-private-material` | this repository only | The self-check refuses known patterns and hashed names. Must merge before the repository goes public. |
| `tropis-is-public` | this repository only | The repository is public, under MIT, with the settings below. Blocked by the entry above. |
| `measurements-record-the-platform-not-the-machine` | every project | Records name the operating system and architecture, never the computer. |
| `project-chooses-the-name-it-flushes-under` | every project | A private project can send suggestions to a public framework repository without revealing its name. Until it ships, the first adopter does not flush to the public repository. |
| `public-project-is-checked-for-private-material` | every public project | A judgment check for private material at commit and push, at merge review, and at release. |

## How the checks fit

**Two layers.** A guard is deterministic but knows only what it was given: a name nobody
has listed passes. A reader of the diff catches the next new name but can be skipped. The
first entry is the guard, for this repository; the last is the reader, for every public
project. Neither replaces the other.

**Exposure happens at push, not release.** Once a repository is public, content is
exposed when it is pushed, to any branch, and a pull request from a fork is public once
opened. So the check that prevents a leak runs at commit and push. Review records that it
happened. Release time is a backstop that cleans up, not a guard: by then the content has
been public since it was pushed. It still matters, because a release copies its files
into every adopting project.

**A list of names is published with the repository.** The guard stores specific names
only as SHA-256 hashes of lower-cased words. A plain list would publish what it protects.

**Removing the sources.** The platform and flush-name entries stop the framework itself
from producing this material, which shrinks what the two checks have to catch.

## Order

1. `own-files-refuse-private-material`.
2. A release from the cleaned source, `v0.4.3`, taken into this repository, so the
   installed copies under `.claude/` and `.tropis/` are clean too. A sweep of the whole
   tree then finds no private name, home path or hostname.
3. `tropis-is-public`, by the checklist below.
4. The other three entries, in any order. `public-project-is-checked-for-private-material`
   adds the project setting that says a repository is public.

## Going public — the checklist

The steps `tropis-is-public` is done by. Steps marked *developer* happen on GitHub and are
the developer's to take; the rest an agent can prepare.

**Before**

1. Steps 1 and 2 of *Order* are done, and the sweep is clean.
2. *Developer:* note the names of every Actions secret and variable the private
   repository's workflows use (Settings → Secrets and variables → Actions). A new
   repository starts with none.

**Swap the repositories**

3. *Developer:* rename the private repository to `tropis-archive` (Settings → General).
   It stays private, with its history, pull requests and tags.
4. *Developer:* create an empty public repository `fcapurso/tropis`: no README, no
   licence, no `.gitignore`, so the first push is the only commit.
5. Make the first public commit from the private `main` on a branch with no history:
   `git checkout --orphan public main`, then commit. **Not `git archive`:**
   `.gitattributes` excludes `.claude/`, `.tropis/`, `feature-catalog.yaml` and
   `docs/superpowers/` from archives, so an archive would silently publish an incomplete
   repository. The commit's author is the developer's GitHub noreply address.
6. Run `bash scripts/check-blueprint.sh` and `npm --prefix .tropis test` on that commit,
   and the sweep again. Push it as `main` to the public repository, and tag it `v0.4.3`.
   The archive's tags point at commits the public repository does not have.

**Settings on the public repository** (*developer*, before announcing it)

7. Settings → Code security: turn on secret scanning, push protection, Dependabot alerts
   and private vulnerability reporting.
8. Settings → Actions → General:
   - *Fork pull request workflows from outside collaborators:* at least "Require approval
     for first-time contributors". "All outside collaborators" is safer while the project
     is small.
   - *Workflow permissions:* "Read repository contents" as the default. The release job
     already asks for `contents: write` itself (`.github/workflows/ci.yml`).
   - Leave "Allow GitHub Actions to create and approve pull requests" off.
9. Settings → Secrets and variables → Actions: re-create every secret and variable noted
   in step 2.
10. Settings → Rules → Rulesets:
    - on `main`: block force pushes and deletion. Do not require pull requests, since the
      workflow lets the backlog, plans, specs and prose go straight to `main`.
    - on tags `v*`: block deletion and updates.
11. Settings → General: turn off Wiki and Projects if unused. Turning on Discussions is
    optional.

**After**

12. Say what is enforced, with the date it was checked, in `AGENTS.md`, as the workflow's
    *Branching* section asks: which rulesets exist and whether any check is required.
13. Point every local clone at the new repository (`git fetch`). Its tags are new, so
    the first adopter takes `v0.4.3` with `/update` against the public repository. Until
    `project-chooses-the-name-it-flushes-under` ships, it does not flush there.
