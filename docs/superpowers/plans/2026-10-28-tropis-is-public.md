# Anyone can read, install and contribute to Tropis — Implementation Plan

> **For agentic workers:** this plan stops for the developer five times. Each stop is a
> handover built the way `rules/planning.md` (*A step only the developer can perform
> stops the plan*) says: run its check first; if it passes, record that and go on; if
> not, print what to do, where, and what done looks like, then stop. On resumption, run
> the same check again and go on only on its result. **Do not start this plan
> unattended**, and never push to the public repository yourself: that is publishing.

**Goal:** `fcapurso/tropis` is a public repository whose history starts with one commit
made from the cleaned `main`, tagged `v0.4.3` (or the release taken in Gate 1), with
secret scanning, push protection, private vulnerability reporting, approval for
first-time contributors' workflows, read-only workflow tokens by default, and protected
`main` and `v*` tags. The private repository is kept, renamed `tropis-archive`.
`AGENTS.md` says what is enforced and when that was checked.

**Spec:** the entry `tropis-is-public` and docs/superpowers/specs/2026-10-27-tropis-goes-public-design.md,
*Order* and *Going public — the checklist*. This plan is that checklist with checks
attached; where the two differ, the spec wins and the difference goes in the handover.

**What the specifying session verified on 2026-10-28, against `main` at `7507bf7`, with
git 2.49.0, in Claude Code desktop (Opus 5.5) on macOS 26.2, arm64:**

- The installed release is `v0.4.2` (`.tropis/installed.json`, `version`), whose
  `.claude/framework/DECISIONS.md` still names the first adopter by its real name; the
  cleaned source is not released yet. Tags `v0.4.0`–`v0.4.2` exist.
- `.gitattributes` export-ignores `.claude/`, `.tropis/`, `feature-catalog.yaml`,
  `docs/superpowers/` and more, so `git archive` would publish an incomplete
  repository; the spec's step 5 uses an orphan branch for that reason.
- The release job lives in `.github/workflows/ci.yml` and asks for `contents: write`
  itself.

**Model tier: Medium.** The steps are given; the judgment is in reading the gates'
results honestly.

**Requires:** the developer, at five gates, with GitHub admin rights on `fcapurso`.

**Merge authority: parent review.** Publishing cannot be undone.

Do not store a kick-off prompt on this plan.

---

## Delivers

tropis-is-public

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-public -b plan/tropis-is-public` |

The public repository is reached by `git push` to its URL from that worktree at Gate 4,
by the developer; it is not a checkout of its own.

## Global Constraints

- **Never push to `fcapurso/tropis`, except Task 5's plan branch after the Gate 1 scan
  passes on it, and Gate 1's kernel-string fix to `main`, which happens before Gate 3,
  while that name is still the private repository; never change a repository setting;
  never create or rename a repository.** Those are the developer's.
- **Never write a private name in plain text** anywhere, including the handover.
- **Do not lower, skip or delete a guard.** Every commit has a body.

## Traps

- **Gate checks read GitHub with `gh`.** If `gh` is not signed in, or cannot read the
  setting, the check cannot pass: say so and stop, never assume.
- **`git archive` is the wrong tool for the first commit** (see *Verified*).
- **The archive's tags point at commits the public repository will not have.** Tag the
  public commit afresh.

## File Structure

| File | Change |
|---|---|
| `AGENTS.md` | Task 5: what is enforced, with the date checked |
| `feature-catalog.yaml` | the entry to `shipped`, `blockedBy` removed, a comment naming this handover |
| docs/superpowers/plans/2026-10-27-export-ignore-lines-match-only-at-the-root.md | Gate 1: the kernel build string removed, on `main` |
| `docs/superpowers/plans/2026-10-28-tropis-is-public.md` | the handover report |

## Tasks

### Gate 1 — The source is clean and released

Check: `own-files-refuse-private-material` is `shipped` in `feature-catalog.yaml` on
`origin/main`; `.tropis/installed.json`'s `version` is `v0.4.3` or later; and
`git grep -nIiE` over the whole tree, `.claude/` and `.tropis/` included, for home paths,
`-MacBook`, `.atlassian.net` and the hashed names (run the private-material guard's scan
over every file, no exemptions) finds nothing but the guard's allowlisted forms; and
`git grep -nIP "Linux \d+\.\d+\.\d+-\S+|Darwin Kernel Version|xnu-\d"` over the same tree prints nothing. Paste the
outputs.

The second command finds kernel build strings: a measurement that recorded the cloud
host's full kernel identifier, or the whole of `uname -a` on a Mac, which the
private-material guard does not look for. A
measurement names the tool, its version, the operating system and the architecture,
never the computer (`rules/planning.md`, *A measurement names its tool, version and
platform*). On 2026-10-28 it found one hit, in the *Verification results* of
docs/superpowers/plans/2026-10-27-export-ignore-lines-match-only-at-the-root.md, which
reads `Machine:` followed by a cloud session and `Linux`, a kernel build string and
`x86_64`. A second form, a Darwin kernel build string in the *Verification results* of
docs/superpowers/plans/2026-10-27-entry-instructions-live-in-one-file.md, was found at
release time the same day. The specifying session fixed both on `main` before dispatch,
so the check should now pass first time.

If not:

- **A kernel build string in a file under `docs/`:** you fix it yourself, directly on
  `main`, since prose and plan files may go there without a branch. Delete the build
  string so the platform reads `Linux x86_64`, or for a Mac `macOS <version> (Darwin
  <version>), arm64`; where the line begins `Machine:`, make it `Platform:`. Change nothing else on the line. Commit with a body, push `main`, then run
  the whole check again. A hit anywhere else, `.claude/` and `.tropis/` included, is not
  yours to fix: stop and report it as below.
- **Anything else:** the developer merges that plan, runs `/release` and its trigger, and
  takes the release into this repository with `/update`. Done looks like the check
  passing.

### Gate 2 — Secrets noted

Check: `gh secret list -R fcapurso/tropis` and `gh variable list -R fcapurso/tropis`
succeed. Record the **names** (never values) in the handover. This gate always stops
once, to ask the developer to confirm the list is complete (Settings → Secrets and
variables → Actions), because a check cannot see a secret the workflows use but the
repository lacks, and to give the GitHub noreply address Task 4 commits as.

### Gate 3 — Repositories swapped

Check: `gh repo view fcapurso/tropis-archive --json visibility -q .visibility` prints
`PRIVATE`, and `gh repo view fcapurso/tropis --json visibility,isEmpty` shows `PUBLIC`
and `true`.

If not: the developer renames the private repository to `tropis-archive` (Settings →
General) and creates an empty public `fcapurso/tropis` with no README, licence or
`.gitignore`.

### Task 4 — The first public commit, prepared

In the worktree: `git checkout --orphan public origin/main`, then commit everything with
the author `git -c user.name="Filippo Capurso" -c user.email=<the noreply address from Gate 2> commit` and a body saying this
is the first public commit of Tropis, from the archive's `main` at `<hash>`. Run
`npm --prefix .tropis ci`, `bash scripts/check-blueprint.sh` and
`npm --prefix .tropis test` on it, and the Gate 1 scan again. Paste all four. Push the
branch `public` to `tropis-archive` (private) so the developer can fetch it.

### Gate 4 — Published

Check: `git ls-remote https://github.com/fcapurso/tropis.git` lists `refs/heads/main`
at the commit Task 4 made, and `refs/tags/v0.4.3` (or the Gate 1 version) on it.

If not: the developer runs, from a clone holding the `public` branch,
`git push https://github.com/fcapurso/tropis.git public:main` and
`git tag v0.4.3 public && git push https://github.com/fcapurso/tropis.git v0.4.3`.

### Gate 5 — Settings

Check each, with its command and output pasted:

- `gh api repos/fcapurso/tropis --jq '.security_and_analysis'` shows secret scanning and
  push protection `enabled`;
- `gh api repos/fcapurso/tropis/private-vulnerability-reporting` shows `enabled: true`;
- `gh api repos/fcapurso/tropis/actions/permissions/workflow` shows
  `default_workflow_permissions: read` and `can_approve_pull_request_reviews: false`;
- `gh api repos/fcapurso/tropis/rulesets` lists a ruleset on `main` blocking force pushes
  and deletion, and one on `v*` tags blocking deletion and updates;
- `gh secret list -R fcapurso/tropis` lists every name from Gate 2.

The approval setting for fork workflows has no read API; the developer confirms it in
words, and the handover says it was confirmed, not checked.

If not: the developer applies the spec's steps 7–11 (Settings → Code security; Actions →
General; Secrets and variables; Rules → Rulesets; General).

### Task 5 — AGENTS.md

On a branch of the **public** repository's `main`, add to `AGENTS.md` under *Gotchas* a
bullet saying which rulesets exist, that no check is required, that fork workflows need
approval, and the date this was checked — as `framework/workflow.md`, *Branching*, asks.
Set `tropis-is-public` to `shipped`, remove its `blockedBy`, and add the comment. Run
both checks and the Gate 1 scan, commit, push the branch `plan/tropis-is-public` to the
public repository, and open a pull request there. Do not merge.

### Task 6 — Handover report

Append `## Handover report` with the six sections the planning rule names, including
every gate's check output and whether it passed first time.

## Handover report

*In progress: written as each gate is reached, completed at Task 6.*

### Task completion

- **Gate 1 — passed on the second run.** The first run found one private-material hit,
  in `.tropis/package-lock.json`: the npm deprecation notice of `glob` 7.2.3, which
  names its author's email address, pulled in by Jest 29. With the developer's
  agreement it was fixed at the source rather than accepted: #141 moved
  `templates/package.json` to Jest 30 with an override forcing `test-exclude` 8, plus a
  guard that fails once the override is no longer needed; v0.5.1 was released with it,
  and #142 installed v0.5.1 here. The second run, on `origin/main` at `74d9ca8`, passed.
- **Gate 2 — passed, from the developer's own run.** This session could not run the
  check: `gh auth status` reports `Failed to log in to github.com using token
  (GH_TOKEN)`, and its proxy refuses the Actions secrets path outright (`HTTP 403:
  Access to this GitHub Actions path is not permitted through this proxy`). The
  developer ran both commands on their own computer and sent the output (see
  *Verification results*). The repository has no secrets and no variables, so there are
  no names to record and nothing for Gate 5 to restore.
  The developer gave the noreply address Task 4 commits as:
  `fcapurso@users.noreply.github.com` (the account's older form, without the numeric id).

- **Gate 3 — passed, from the developer's own run**, after the developer renamed the
  private repository to `tropis-archive` and created an empty public `fcapurso/tropis`.
  The executor confirmed the public half itself (see *Verification results*).

- **Task 4 — done.** `git checkout --orphan public origin/main` from the archive's `main`
  at `74d9ca8`, committed as `21b855f25b4866cd1c6f271165cabcaca729c7fd`, author and
  committer `Filippo Capurso <fcapurso@users.noreply.github.com>`, no parent, its tree
  identical to `origin/main`'s. Pushed as the branch `public` to `fcapurso/tropis-archive`.
  Before that push, `origin` in both checkouts was moved from `fcapurso/tropis`, which
  after Gate 3 names the public repository, to `fcapurso/tropis-archive`, with the
  developer's agreement.

- **Gate 4 — passed, checked by the executor after the developer pushed.** The
  developer pointed their own clone's `origin` at `tropis-archive` first (it still named
  `fcapurso/tropis`, now the public repository), fetched `public`, confirmed its hash
  and author, and pushed it with
  `git push https://github.com/fcapurso/tropis.git public:main` and
  `git push https://github.com/fcapurso/tropis.git public:refs/tags/v0.5.1`. The tag was
  pushed by refspec rather than with `git tag v0.5.1 public`, which fails in a clone that
  already holds the archive's `v0.5.1`.

- **Gate 5 — passed on the second round.** The developer applied the spec's steps 7–11,
  guided by the executor, as GitHub's current settings name them: *Security and quality →
  Advanced Security*, *Actions → General*, and *Rulesets* as its own sidebar item. The
  first reading showed `can_approve_pull_request_reviews: true`; the developer turned
  it off and the second reading showed `false`. Secrets: none to re-create (Gate 2).

### Verification results

All with git 2.43.0 and Node v22.22.0 on Linux x86_64, in the worktree `../tropis-public`.

Gate 1, second run, on `origin/main` at `74d9ca8`:

- `own-files-refuse-private-material` on `origin/main`: `status: shipped`.
- `.tropis/installed.json` `version`: `v0.5.1`.
- The private-material guard's own `scanLine` and hash list, run over every file
  `git ls-files` names with no exemptions (`.claude/` and `.tropis/` included):
  `files scanned: 327, hits: 0`. The same scan over a planted file reported
  `p.txt:1: Atlassian site`, so an empty result means something.
- `git grep -nIP "Linux \d+\.\d+\.\d+-\S+|Darwin Kernel Version|xnu-\d"`: one line,
  this plan's own line 92, which quotes the pattern. No build string. The pattern
  matched a planted `Linux 6.1.2-abc x86_64`.

Gate 1, first run, on `origin/main` at `314ffc1`: the same scan reported
`.tropis/package-lock.json:1812: email`, the `glob` deprecation notice above; the other
three checks passed as in the second run.

Gate 2, run by the developer with `gh` on macOS, as they reported it:

```
$ gh secret list -R fcapurso/tropis
no secrets found
$ gh variable list -R fcapurso/tropis
no variables found
```

`grep -rnoE 'secrets\.[A-Za-z_]+|vars\.[A-Za-z_]+' .github/`, run by the executor,
prints nothing: no workflow uses a secret or variable the repository lacks.

Gate 3, run by the developer with `gh` on macOS, as they reported it:

```
$ gh repo view fcapurso/tropis-archive --json visibility -q .visibility
PRIVATE
$ gh repo view fcapurso/tropis --json visibility,isEmpty
{
  "isEmpty": true,
  "visibility": "PUBLIC"
}
```

The executor's own reading of the public half: GitHub's unauthenticated API for
`fcapurso/tropis` returned `visibility: public` and `size: 0`, and
`git ls-remote https://github.com/fcapurso/tropis.git` listed no refs.

Task 4, on `21b855f`:

- `npm --prefix .tropis ci`: `added 259 packages`.
- `bash scripts/check-blueprint.sh`: exit 0, `Self-check passed: every guard caught its
  defect, the clean baseline passed, and the framework repository's own guards passed.`
  (30 planted defects caught).
- `npm --prefix .tropis test`: `Test Suites: 6 passed, 6 total`, `Tests: 33 passed, 33 total`.
- The Gate 1 scan: `files scanned: 327, hits: 0`; the kernel-string search printed only
  this plan's line 92.

Gate 4, by the executor:

```
$ git ls-remote https://github.com/fcapurso/tropis.git
21b855f25b4866cd1c6f271165cabcaca729c7fd	HEAD
21b855f25b4866cd1c6f271165cabcaca729c7fd	refs/heads/main
21b855f25b4866cd1c6f271165cabcaca729c7fd	refs/tags/v0.5.1
```

GitHub's unauthenticated commits API for the public repository lists one commit,
`21b855f`, author `fcapurso@users.noreply.github.com`, with no parents.

Gate 5. Read by the executor through GitHub's unauthenticated API:

- `rulesets/26066840`: `main: no force pushes or deletion`, `active`, include
  `~DEFAULT_BRANCH`, rules `deletion` and `non_fast_forward`, no bypass actors.
- `rulesets/26066944`: `release tags: never moved or deleted`, `active`, include
  `refs/tags/v*`, rules `deletion` and `update`, no bypass actors.
- `private-vulnerability-reporting`: `{"enabled": true}`.
- The repository: `has_wiki: false`, `has_projects: false`, `has_discussions: false`.

Run by the developer with `gh` on macOS, as they reported it:

```
$ gh api repos/fcapurso/tropis --jq '.security_and_analysis'
{ "dependabot_security_updates": {"status": "disabled"},
  "secret_scanning": {"status": "enabled"},
  "secret_scanning_non_provider_patterns": {"status": "disabled"},
  "secret_scanning_push_protection": {"status": "enabled"},
  "secret_scanning_validity_checks": {"status": "disabled"} }
$ gh api repos/fcapurso/tropis/actions/permissions/workflow
{ "default_workflow_permissions": "read", "can_approve_pull_request_reviews": false }
$ gh api repos/fcapurso/tropis/actions/permissions/fork-pr-contributor-approval
{ "approval_policy": "first_time_contributors" }
$ gh api -i repos/fcapurso/tropis/vulnerability-alerts | head -1
HTTP/2.0 204 No Content
```

The release job in `.github/workflows/ci.yml` pushes `main` and a new `v*` tag in one
atomic push and never moves or deletes a tag, so neither ruleset blocks it.

### Judgment calls

- The kernel-string search matching this plan's own quotation of it is counted as a
  pass: the plan asks for no build strings, and line 92 contains none.
- The Gate 1 hit was not in `docs/`, so per Gate 1 it was not the executor's to fix in
  place. The developer chose the root fix (a dependency change, a release and an
  update) over accepting the hit as public package metadata.

- The first public commit's message leaves out the `Claude-Session:` trailer the
  session's attribution asks for: it carries a session id, which this public repository
  refuses, and the commit is the whole of the public history. It keeps `Co-Authored-By`.

### What the plan got wrong

- Gate 5 says the fork-workflow approval setting "has no read API". It has one:
  `repos/{owner}/{repo}/actions/permissions/fork-pr-contributor-approval`, which returned
  `first_time_contributors`, so the setting was checked rather than taken on the
  developer's word.
- Gate 5's checks do not cover Dependabot alerts, which the spec's step 7 asks for and
  `security_and_analysis` does not report; `vulnerability-alerts` (204 when on) does.
- The menu names in the spec's steps 7, 8 and 10 are out of date: GitHub now has
  *Security and quality → Advanced Security* rather than *Code security*, and
  *Rulesets* as its own sidebar item rather than under *Rules*.

- *What the specifying session verified* is stale: it names `main` at `7507bf7` and the
  installed release `v0.4.2`, with `v0.4.3` as the tag for the public commit. At
  dispatch `main` was at `314ffc1` with `v0.5.0` installed, and after Gate 1 it is
  `v0.5.1`. Gate 4's tag is therefore `v0.5.1`, as the plan's "or the Gate 1 version"
  allows.
- Gate 1's scan says to run "the private-material guard's scan over every file, no
  exemptions", but the guard exempts `.tropis/` and the installed paths by design, and
  that is where the hit was. The executor ran the guard's `scanLine` over every tracked
  file instead.
- The gate checks assume `gh` can read repository settings. From a cloud session it
  cannot (see Gate 2), so Gates 2, 3 and 5 rest on output the developer runs and sends,
  which is their word rather than a check the executor ran.
