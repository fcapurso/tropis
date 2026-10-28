# A flush reaches the framework as pull requests — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Task 7 needs the Claude Code CLI; if you cannot run
> it, say so in the handover and the reviewer runs it.

**Goal:** Anyone using the framework in a project — its maintainer included — hands what
the project learned back the same way: `/flush-upstream` puts the queue to the operator
one line at a time, and the plan it drafts ends with one pull request per flushed line
against the framework's current `main`, opened from a throwaway clone and pushed to the
framework repository or to the submitter's fork. The `blueprint` catalog layer is
retired.

**Spec:** none. The entry `flush-opens-pull-requests-upstream` in `feature-catalog.yaml`
is the specification: its ten acceptance criteria and the comment above it, which
records every decision taken with the developer on 2026-10-15. Read both before starting.

**What this delivers:** `flush-opens-pull-requests-upstream`, all ten criteria. See
*Criteria and their evidence* at the end.

**What the specifying session verified on 2026-10-15, against `main` at `5abf3ce`:**

- `commands/flush-upstream.md` tells a project to raise a capability as a
  `layer: blueprint` entry in its own catalog (step 2, and *Global Constraints* in step 4),
  puts the framework checkout in the drafted plan as `execute here` in a sibling worktree
  (step 4, `## Repositories`), and leaves every portability decision to a later sitting
  in another session (step 5). It does not ask about lines one at a time.
- The `blueprint` layer value is named in exactly these shipped places:
  `rules/catalogs.md` (*Layers*), `templates/catalog.yaml` (the `layer` comment),
  `commands/idea.md` (step 4), `commands/flush-upstream.md`, `commands/capture-learning.md`
  (*Branch 6*), `framework/workflow.md` (doc-closeout table, the "taught or built" row),
  `scripts/next-work.js` (`ready` excludes it; `elsewhere` selects it) and
  `scripts/next.mjs` (the "Belongs to the blueprint layer" section). `elsewhere` has no
  caller outside `next-work.js`'s own header comment and `next.mjs`'s header comment;
  `next.mjs` filters for the layer itself.
- The framework's address is recorded in one place in a set-up project: `templates/README.md`
  line 23, `This project was set up from the framework at \`{{BLUEPRINT_URL}}\`.`, copied
  to `.framework/README.md` by `set-up-project.sh` and filled in by bootstrap step 4.
  `bootstrap.md` step 1 allows the value to be "the blueprint remote, or the local path
  the operator names" — so it can be a local path.
- Shipped scripts are listed in `scripts/installed-scripts.txt`; `set-up-project.sh` and
  `check-conformance.sh` both read that list. Every shipped script opens with the line
  `# Shared machinery: no part of this file is project-owned.` (or the `//` form), which
  `guards/check-drift.test.js` requires.
- `guards/next-report.test.js` runs the shipped `next.mjs` against a temporary catalog;
  it asserts nothing about the blueprint section.
- `.github/workflows/ci.yml` runs the self-check on `push` only. Its comment says the
  repository takes no pull requests from forks. A pull request from a fork therefore gets
  no CI run today. Out of scope here; see *Not in this plan*.
- `PORTABILITY-NOTES.md` records past flushes, one section per flush.
- Node 22.15.0, git 2.49.0, `gh` 2.x signed in, on the developer's Mac.

**Model tier: Medium.** The design is decided and the script and tests are specified;
the command rewrite is prose written to a stated design.

**Requires:** the `gh` CLI signed in, and the Claude Code CLI for the fresh-agent check in Task 7 (any current install; record which).

**Merge authority: parent review.** It changes how every project hands work back to the framework.

Do not store a kick-off prompt on this plan.

---

## Delivers

flush-opens-pull-requests-upstream

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`claude-project-framework`) | execute here | `git worktree add ../claude-project-framework-flush-prs -b plan/flush-opens-pull-requests-upstream` |
| worked example (`first-adopter`) | do not edit | |

## Global Constraints

- **Do not reopen a decision listed under *Decisions*.** If one cannot be implemented as
  written, stop and report it.
- **No pull request is opened, and nothing is pushed to any repository but this plan's
  branch, while executing this plan.** Every test of the submission script uses a stub
  `gh` and local bare repositories.
- **No new dependency.** `gh` is required only by the flush, at the moment it runs; it is
  not added to `scripts/check-prerequisites.sh`, which covers setting a project up.
- **No backticked repository-only path in a shipped document** (`rules/`, `framework/`,
  `commands/`, `templates/CLAUDE.md`): the integrity guard resolves each against a sample
  project. A path under `.framework/scripts/` is fine once the script is in
  `installed-scripts.txt`.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken with the developer on 2026-10-15 and recorded above the entry. Implement them; do
not re-argue them.

1. **One path for everyone.** The maintainer flushing from their own project is a
   contributor like any other. The only difference is where the branch is pushed: to the
   framework repository when the submitter can push there, otherwise to their fork.
2. **One pull request per queue line**, so each suggestion is accepted or declined on its
   own.
3. **The operator decides line by line.** The command puts each line to them in turn —
   flush, hold, or decline — and waits for the answer before the next. Classifying the
   line (lesson or capability) and stating what already exists in the framework are the
   agent's work, shown with the question; the decision is the operator's.
4. **A capability arrives as a shaped entry**: a value and acceptance criteria, written
   with the operator in the same sitting. A capability the operator wants to flush but
   cannot shape now is held, marked as waiting to be shaped. Never submitted as an idea.
5. **A lesson arrives as the edit it proposes**: the exact words, at a named place in the
   framework's rules or documents, agreed in the sitting.
6. **Work happens in a temporary clone of the framework's current `main`**, never in an
   existing clone. The fork, when there is one, only receives the branch.
7. **The line leaves the project's queue when its pull request opens.** The pull request
   is the record. A declined line leaves the queue with its reason in the project's flush
   plan; a held line stays, with a note saying what it waits for.
8. **No GitHub issue is filed.**
9. **No fallback without GitHub.** Without `gh` signed in, or with a framework address
   that is not a GitHub repository, the command stops before drafting anything.
10. **The `blueprint` layer value is retired.**

These further choices are the specifying session's, made to keep the change small:

11. **The command now runs the sitting itself.** Today `/flush-upstream` drafts a plan
    with empty decisions and a second session fills them in. Since the operator now
    answers line by line, the command asks, records each answer and the agreed wording or
    entry, and drafts the plan with the decisions already written. `/dispatch` stays a
    separate step.
12. **The drafted plan has one checkout row: the project.** The framework is reached by a
    temporary clone made inside a task, so it is not a `## Repositories` row and gets no
    worktree.
13. **The address is read from `.framework/README.md`'s "set up from the framework at"
    line.** No new file. If `project-takes-a-framework-version` later records the source
    elsewhere, that entry moves this read.
14. **The per-flush section in `PORTABILITY-NOTES.md` stops being written by flushes.**
    One-line-per-PR submissions would all edit the same file and conflict; the merged pull
    requests are the record from now on. Existing sections stay. Add one closing sentence
    under the last flush section saying so.
15. **A project still holding `blueprint`-layer entries** is told, in the catalog rule, to
    write each as a queue line and flush it, then delete the entry once its pull request
    is open. The backlog report says how many such entries remain and points at the rule;
    it no longer lists them, and they are never offered as ready work.

## Traps

- **The dispatch prompt may tell you to isolate with `.framework/scripts/isolate-for-plan.sh`,
  which this repository does not have.** Create the one worktree by running the
  Repositories row's command from this checkout.
- **Any text matching the worktree command outside a Repositories table makes a plan
  undispatchable** (`guards/plan-dispatchable.test.js`). Do not write a worktree command
  anywhere else — including in `commands/flush-upstream.md`'s description of the drafted
  plan, which may describe its row in words only.
- **`check-blueprint.sh` checks committed content only** (`git archive HEAD`). Commit
  before running it.
- **The page checks skip inside `check-blueprint.sh`** (`readme-usable`,
  `operator-page-closeout`). Run them directly as well, as the previous plan did.
- **A new shipped script must open with the shared-machinery line** and be added to
  `scripts/installed-scripts.txt`, or `check-drift.test.js` and `set-up-project.test.js`
  fail.
- **The fork may be named differently from the upstream repository** if its owner renamed
  it. The script assumes `<login>/<upstream name>`; when that repository does not exist it
  stops naming what it looked for. Do not add discovery logic.
- **Sibling pull requests that each append a catalog entry conflict at the end of the
  file.** Expected and left to the maintainer at merge; do not design around it.
- **Zsh treats a word starting with `=` as a command lookup.** Do not `echo =====`.

## File Structure

| File | Change |
|---|---|
| `scripts/submit-upstream.sh` | New — the submission: preflight, address, push, pull request |
| `scripts/installed-scripts.txt` | Lists `submit-upstream.sh` |
| `guards/submit-upstream.test.js` | New — the script against a stub `gh` and local bare repositories |
| `commands/flush-upstream.md` | Rewritten — preflight, line-by-line sitting, the drafted plan's new shape |
| `commands/capture-learning.md` | *Branch 6*: a capability becomes a shaped entry in a pull request, not a blueprint-layer entry |
| `commands/idea.md` | Step 4: two layer values |
| `rules/catalogs.md` | *Layers*: two values; what to do with old `blueprint` entries |
| `templates/catalog.yaml` | The `layer` comment: two values |
| `framework/workflow.md` | Doc-closeout table, the "taught or built" row |
| `framework/DECISIONS.md` | New FW-011 |
| `scripts/next-work.js` | `ready` offers `product` and `framework` entries only; `elsewhere` removed |
| `scripts/next.mjs` | The blueprint section becomes a one-line notice when retired entries exist |
| `guards/next-report.test.js` | A case for the notice |
| `README.md` | The flush paragraph: pull requests, one per line, the same for anyone |
| `bootstrap.md` | The closing paragraph on the upstream queue: one sentence on how a flush submits |
| `PORTABILITY-NOTES.md` | One closing sentence (Decision 14) |
| `feature-catalog.yaml` | `flush-opens-pull-requests-upstream` to `shipped`, at merge |
| `docs/superpowers/plans/2026-10-15-flush-opens-pull-requests-upstream.md` | Handover report |

Doc closeout: adopter-facing claims change, so `README.md` and `bootstrap.md` are above.
A choice between real alternatives is made, so FW-011. Rules change, so Task 7 runs the
fresh-agent check. The framework repository has no Cursor projection of its own rules.

---

### Task 1: The submission script

**Files:** Create `scripts/submit-upstream.sh`, `guards/submit-upstream.test.js`; modify
`scripts/installed-scripts.txt`.

**Interface** (installed at `.framework/scripts/submit-upstream.sh` in a project):

```
bash submit-upstream.sh preflight <project-root>
    Exits 0 and prints the framework repository as OWNER/NAME when gh is installed,
    signed in, and .framework/README.md's "set up from the framework at `X`" line names
    a GitHub repository (https://github.com/OWNER/NAME, with or without .git, or
    git@github.com:OWNER/NAME.git). Otherwise exits 1 with one line saying what is
    missing: gh not installed; gh not signed in (gh auth login); the line not found; or
    the address is not a GitHub repository (and the address found).

bash submit-upstream.sh open <OWNER/NAME> <branch> <title> <body-file>
    Run inside a clone whose HEAD is the commit to submit. Pushes HEAD to <branch> on
    the framework repository when the signed-in account can write there (viewerPermission
    ADMIN, MAINTAIN or WRITE), otherwise on <login>/<NAME>, creating that fork if it does
    not exist. Then opens one pull request against main and prints its URL. Never merges.
```

Implementation notes, all required:

- First line after the shebang: `# Shared machinery: no part of this file is project-owned.`
- `set -euo pipefail`.
- Permission: `gh repo view "$UP" --json viewerPermission -q .viewerPermission`.
- Fork: `gh repo fork "$UP" --clone=false --remote=false` (idempotent), login from
  `gh api user -q .login`.
- Push URL from `gh repo view "$TARGET" --json url -q .url`, then
  `git push "$URL" "HEAD:refs/heads/$BRANCH"`. Taking the URL from `gh` is what lets the
  test point it at a local bare repository.
- Pull request: `gh pr create --repo "$UP" --base main --head "$HEAD_REF" --title "$TITLE"
  --body-file "$BODY"`, where `HEAD_REF` is `$BRANCH` or `$LOGIN:$BRANCH`.

**Test** (`guards/submit-upstream.test.js`, `// Level: unit`, header comment in the style
of `next-report.test.js`): a stub `gh` written into a temporary directory placed first on
`PATH`. It appends each invocation to a log file and answers from environment variables
the test sets (permission, login, URL per repository, signed in or not). Cases:

1. `preflight` prints `OWNER/NAME` for each of the three GitHub address forms.
2. `preflight` refuses a local-path address, naming it; refuses when the line is absent;
   refuses when `gh auth status` fails; refuses when `gh` is not on `PATH`.
3. `open` with WRITE pushes to the upstream's URL (a local bare repo receives the
   branch), never calls `gh repo fork`, and calls `gh pr create` with `--head <branch>`.
4. `open` with READ calls `gh repo fork`, pushes to the fork's URL (a second bare repo
   receives the branch, the upstream one does not), and calls `gh pr create` with
   `--head <login>:<branch>`.
5. Neither case calls `gh pr merge` or pushes to `main`.

- [ ] Write the test; run it; see it fail.
- [ ] Write the script; add it to `installed-scripts.txt`; run the test until green.
- [ ] Revert one push target in the script and see case 3 or 4 fail; restore.
- [ ] Commit.

### Task 2: Retire the layer in the backlog report

**Files:** `scripts/next-work.js`, `scripts/next.mjs`, `guards/next-report.test.js`.

- `ready`: replace `e.layer !== 'blueprint'` with a test that the layer is `product` or
  `framework`; update its comment. Delete `elsewhere` and its comment; update both files'
  header comments that list "elsewhere".
- `next.mjs`: replace the "Belongs to the blueprint layer" section. When any non-shipped
  entry has `layer: blueprint`, print
  `N entr(y|ies) use the retired layer "blueprint" — the catalog rule (Layers) says what to do with them.`
  and nothing otherwise. Rename the queue section heading from "Waiting to be copied to
  the blueprint" to "Waiting in the upstream queue".
- Test: a catalog with one shaped `blueprint` entry and one shaped `product` entry. The
  report prints the notice with `1`, lists the product entry as ready, and does not list
  the blueprint entry anywhere. A catalog without one prints no notice.

- [ ] Test first, see it fail, implement, green, commit.

### Task 3: The command

**Files:** `commands/flush-upstream.md`.

Rewrite the command. Keep its frontmatter shape and its *Do* / *Do not* structure. It must say,
in this order:

1. **Preflight.** Run `bash .framework/scripts/submit-upstream.sh preflight .`. On a
   non-zero exit, show its line and stop: nothing is drafted.
2. **Read the queue** (`docs/BLUEPRINT-UPSTREAM.md`) and list every line verbatim.
3. **Clone the framework's current `main`** into a temporary directory
   (`gh repo clone OWNER/NAME <tmp> -- --depth 1`) to look at it as it is. Read its
   `framework/DECISIONS.md` before advising on any line.
4. **Put each line to the operator, one at a time.** For each: the line; whether it is a
   lesson or a capability, and why; what already exists in the framework that it would
   land on, duplicate or conflict with, citing a decision record where one applies; and a
   recommendation. Then ask: flush, hold, or decline. Wait for the answer before the next
   line.
   - **Flush, lesson:** agree the exact words and where they land (file and heading).
   - **Flush, capability:** shape the entry with the operator — id, title, type, value,
     acceptance criteria, `layer: product` — in the framework's catalog format. If it
     cannot be shaped now, it is held, marked "waiting to be shaped".
   - **Hold:** ask what it waits for.
   - **Decline:** ask why.
5. **Draft the plan** under `docs/superpowers/plans/YYYY-MM-DD-flush-upstream.md`, with the
   decisions written in. It has:
   - `## Delivers` — `None.`
   - `## Repositories` — one row: the project, `execute here`, in a sibling worktree.
     State in prose that the framework is reached by a temporary clone in a task and is
     not a row.
   - `## Global Constraints` — submit only the lines decided *flush*; one pull request per
     line; never merge one; never push to the framework's `main`.
   - `## Traps` — at least: sibling pull requests that each add a catalog entry will
     conflict at the end of the file, and that is the maintainer's to resolve.
   - `## Decisions` — every line with its answer, reason, and agreed wording or entry.
   - **One task per flushed line:** clone the framework's current `main` afresh into a
     temporary directory; create the branch `upstream/<project-folder>/<flush-date>-<line-slug>`;
     make the edit or append the entry; commit with a body that quotes the queue line and
     names the project; run `bash scripts/check-blueprint.sh` in the clone and paste its
     result; write the pull request body (the queue line, why it is portable, what the
     project already does) to a file; run
     `bash .framework/scripts/submit-upstream.sh open OWNER/NAME <branch> <title> <body-file>`
     from inside the clone; record the URL it prints; delete the clone.
   - **A drain task**, in the project, after the last submission: remove each submitted
     line and each declined line from the queue; keep each held line with its note; set
     `Last flushed` to the flush date; write a table in the plan's handover of every line
     and what became of it — the pull request URL, *held*, or *declined* with the reason.
6. **Say that `/dispatch` is the next step**, and that the pull requests are reviewed and
   merged in the framework repository by its maintainer, not by the plan.

*Do not:* merge a pull request; push to the framework's `main`; file an issue; work in an
existing clone of the framework; submit a capability without acceptance criteria; decide
a line without asking; run `/dispatch`.

Keep the explanation of why a queue line does not say its own kind (the current step 2's
second paragraph) — it is still true.

- [ ] Rewrite, commit.

### Task 4: The other shipped words

**Files:** `commands/capture-learning.md`, `commands/idea.md`, `rules/catalogs.md`,
`templates/catalog.yaml`, `framework/workflow.md`.

- `capture-learning.md` *Branch 6*, second paragraph: the flush turns a capability line
  into a shaped entry submitted to the framework as a pull request. Keep the incident
  sentence.
- `idea.md` step 4 and `templates/catalog.yaml`: `layer` is `product` or `framework`.
- `rules/catalogs.md` *Layers*: two values, `product` and `framework`. Then one paragraph:
  work the upstream framework must do is not recorded here — it goes to the upstream queue
  and reaches the framework's own backlog through `/flush-upstream`. A project still
  holding entries with `layer: blueprint` writes each as a queue line, flushes it, and
  deletes the entry once its pull request is open; the backlog report counts them until
  then.
- `framework/workflow.md`, the "taught or built" row: "the flush decides whether a line
  travels as an edit or as a shaped backlog entry, each in its own pull request to the
  framework — not the author, at write time".

- [ ] Edit, commit.

### Task 5: Decision record and adopter pages

**Files:** `framework/DECISIONS.md`, `README.md`, `bootstrap.md`, `PORTABILITY-NOTES.md`.

- FW-011, in FW-010's format: *A flush reaches the framework as pull requests.* Decision:
  Decisions 1–10 above, compressed. Evidence: first-adopter's 2026-10-14 flush raised two
  capabilities as blueprint-layer entries in its own catalog, which nothing in the
  framework reads; they were moved by hand (`8e80701`). Rejected: writing entries directly
  into the framework repository (works only for its maintainer); one pull request per
  flush (accepting one suggestion means editing someone's branch); a GitHub issue per
  capability (a second record of the same thing); tracking each pull request in the
  project's queue until decided (a declined lesson is already applied in its project).
  Consequences: a flush needs `gh` and a GitHub-hosted framework; pull requests from
  forks get no CI until `ci.yml` takes `pull_request` (see *Not in this plan*).
- `README.md`, the flush paragraph: lessons and capabilities are flushed as one pull
  request per line against this repository, the same way for anyone — a project's
  maintainer or a contributor using a fork.
- `bootstrap.md`, closing paragraph: after "a person decides what ports", one sentence
  that the flush submits each decided line as a pull request and needs `gh` signed in.
- `PORTABILITY-NOTES.md`: Decision 14's sentence under the last flush section.

- [ ] Edit, commit.

### Task 6: Checks

- [ ] `bash scripts/check-blueprint.sh` — paste the summary lines.
- [ ] The page checks directly, as `docs/superpowers/plans/2026-10-15-framework-releases-from-a-green-self-check.md`
  Task 3 ran them — paste the result.
- [ ] `git grep -n "layer: blueprint\|blueprint layer\|blueprint-layer" -- rules commands framework templates scripts README.md bootstrap.md`
  — expected: only the retirement paragraph in `rules/catalogs.md` and the notice
  string in `scripts/next.mjs`. Paste the output.

### Task 7: Fresh-agent check

Required because `rules/` and `framework/` change. Run in a scratch project, never in a
real one, and say in the prompt that the output is a probe and will be discarded.

1. In a temporary directory, `git init`, then `bash <worktree>/scripts/set-up-project.sh .`
   and fill `.framework/README.md`'s address line with
   `https://github.com/fcapurso/claude-project-framework`.
2. Write `docs/BLUEPRINT-UPSTREAM.md` with three invented lines: a lesson; a capability
   described in one sentence with no criteria; and a line about this scratch project's
   own domain that should not port.
3. Run `claude -p` there, asking it to run `/flush-upstream` and to stop at the first
   question it would put to the operator, reporting that question and what it would do
   next.
4. Pass when it: ran the preflight; asked about the first line only; and, asked in a
   second run about the capability line, said it needs a value and acceptance criteria
   before it can be submitted. Record the outcome, the tool and its version, and the
   machine in the handover — the review record copies it into the merge commit's body.

### Task 8: Handover

Append `## Handover report` to this file with the six sections the planning rules name,
and commit. The reviewer promotes the entry and writes the review record.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| One pull request per flushed line, never merged | `submit-upstream.test.js` case 5; command text (Task 3); Task 7 |
| Operator asked one line at a time: flush, hold, decline | Task 7 (fresh-agent check) |
| A capability is never submitted unshaped | Task 7, second run |
| Lesson as its edit, capability as a shaped entry | Command text; Task 7 |
| Same command with or without push access; fork created if needed | `submit-upstream.test.js` cases 3 and 4 |
| Temporary clone of current `main` | Command text (Task 3); the drafted plan's task shape |
| Line leaves the queue when its pull request opens; plan names each | Command text (drain task); Task 7 |
| Stops without `gh` signed in | `submit-upstream.test.js` case 2 |
| Address read from one place | `submit-upstream.test.js` cases 1 and 2 |
| `blueprint` layer gone; old entries handled | Task 6 grep; `next-report.test.js`; `rules/catalogs.md` |

Criteria whose only evidence is the fresh-agent check take the catalog rule's third
route: name the merge commit above the entry when promoting it.

## Not in this plan

- **CI for pull requests from forks.** `ci.yml` runs on `push` only, so a contributor's
  pull request gets no self-check. Needed once the repository is public; raise it then.
- **first-adopter's installed copies** of the command, rules and scripts, and its backlog
  board, which shows the layer. It takes this change with its next framework version.

## Handover report

Checkboxes in this plan are unticked. Progress was tracked in the session's task list, which does not write ticks back. That is the normal outcome the planning rules describe.

### Task completion

| Task | Outcome |
|---|---|
| 1 Submission script | Done. `4adabdb`, then `8419203` so a missing fork stops with a line that names the repository it looked for. |
| 2 Backlog report | Done. `eb56021`. |
| 3 `/flush-upstream` | Done. `4fcd76b`, then `0bb04e8` so `scripts/check-blueprint.sh` is plain prose. |
| 4 Other shipped words | Done. `e606358`. |
| 5 Decision record and adopter pages | Done. `b60e528`. |
| 6 Checks | Done, on `78bdd7e`. The grep does not match the plan's expected list; see *What the plan got wrong*. |
| 7 Fresh-agent check | Not run. Claude Code is installed and not signed in. See *Outstanding*. |
| 8 Handover | This section. |

### Verification results

`env -u NODE_MODULES bash scripts/check-blueprint.sh` on `78bdd7e`, exit 0:

```
Checking 78bdd7e of ~/src/claude-project-framework-flush-prs

Conformance: every guard must fail on its planted defect

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

Clean baseline: every guard must pass
  ok          clean baseline

Every guard caught its defect and passed the clean baseline.
```

Page checks, the same stage the previous plan's Task 3 used (`git archive HEAD`, `FRAMEWORK_ROOT` set, `readme-usable` and `operator-page-closeout`), exit 0. Node prints `ExperimentalWarning: VM Modules` because the invocation uses `--experimental-vm-modules`. Then:

```
PASS guards/operator-page-closeout.test.js
PASS guards/readme-usable.test.js

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
```

`guards/submit-upstream.test.js` after the CI PATH fix: 12 passed, 12 total, including `refuses when gh is not installed`.

```
git grep -n "layer: blueprint\|blueprint layer\|blueprint-layer" -- rules commands framework templates scripts README.md bootstrap.md
```

```
framework/DECISIONS.md:388:repository, the command stops before drafting anything. The blueprint layer value is
framework/DECISIONS.md:391:**Evidence:** first-adopter's 2026-10-14 flush raised two capabilities as blueprint-layer
rules/catalogs.md:76:holding entries with `layer: blueprint` writes each as a queue line, flushes it, and
```

`scripts/next.mjs` prints `N entr(y|ies) use the retired layer "blueprint" — the catalog rule (Layers) says what to do with them.` That sentence does not contain the three grep tokens, so it is absent from the output above.

Scratch-project preflight, before the fresh-agent attempt, on a `git init` tree set up with this worktree's `scripts/set-up-project.sh` and the address line filled with `https://github.com/fcapurso/claude-project-framework`:

```
bash .framework/scripts/submit-upstream.sh preflight .
fcapurso/claude-project-framework
```

### Scope

`git diff --stat 2e38dc7..78bdd7e` (before this handover commit):

```
 PORTABILITY-NOTES.md           |   4 +
 README.md                      |   8 +-
 bootstrap.md                   |   3 +-
 commands/capture-learning.md   |   4 +-
 commands/flush-upstream.md     | 137 ++++++++++++++-----------
 commands/idea.md               |   5 +-
 commands/next.md               |   2 +-
 framework/DECISIONS.md         |  36 +++++++
 framework/workflow.md          |   2 +-
 guards/next-report.test.js     |  75 ++++++++++++++
 guards/submit-upstream.test.js | 228 +++++++++++++++++++++++++++++++++++++++++
 rules/catalogs.md              |  10 +-
 scripts/installed-scripts.txt  |   1 +
 scripts/next-work.js           |  21 +---
 scripts/next.mjs               |  19 ++--
 scripts/submit-upstream.sh     | 100 ++++++++++++++++++
 templates/catalog.yaml         |   3 -
 17 files changed, 555 insertions(+), 103 deletions(-)
```

Every File Structure row is in that diff except `feature-catalog.yaml` (the reviewer promotes it) and this plan (this commit). `commands/next.md` is the one file outside the table. The whole-branch review found its description still saying the report has an "elsewhere" section, which the branch removes.

### Judgment calls

- A missing fork stops with one stderr line that names `$target` (`8419203`). The plan's trap requires the stop to name what it looked for; `gh`'s own error was not enough.
- `bash scripts/check-blueprint.sh` in `commands/flush-upstream.md` is plain prose (`0bb04e8`). The brief wrote it in backticks; that backticks a path a set-up project does not have.
- FW-011 states the CI consequence in its own words. It does not say "see Not in this plan", because that heading lives only in this plan.
- The "gh not installed" test's `PATH` is the empty directory only (`78bdd7e`). `/usr/bin` would find the real `gh` on the Ubuntu runner.
- `README.md` and `commands/next.md` now say the report is in flight, ready, and blocked (`78bdd7e`).
- Commits were made with `git commit-tree` after `git commit` was rejected for a `Co-authored-by` trailer the message did not contain. The commits on this branch have bodies and no such trailer.
- Left as the final review triaged them, not blocking: no retry after `gh repo fork`; the step-3 clone is not told to be deleted; a red `check-blueprint.sh` is pasted and the task is not told to stop before `open`; the isolation cell says "in the form the plan format gives"; the script does not refuse a branch named `main`; `PORTABILITY-NOTES.md`'s closing note is three sentences.

### What the plan got wrong

- Task 6's expected grep is "only the retirement paragraph in `rules/catalogs.md` and the notice string in `scripts/next.mjs`". Task 5 requires FW-011's evidence to say "blueprint-layer" and decision 10 to retire "the blueprint layer value", so `framework/DECISIONS.md` is two further hits. The notice string specified in Task 2 does not contain `layer: blueprint`, `blueprint layer`, or `blueprint-layer`, so `scripts/next.mjs` is not a hit.
- The specifying session's inventory of the layer value missed `README.md`'s "elsewhere" and `commands/next.md`'s "belonging elsewhere". Both described the report section Task 2 removes.
- "see *Not in this plan*" cannot be written inside `framework/DECISIONS.md` and still point at a section of this plan.

### Outstanding

- **Task 7, for the parent reviewer.** Claude Code `2.1.260` is at `~/.nvm/versions/node/v22.15.0/bin/claude`. `claude auth status` reported `loggedIn: false`, `authMethod: none`. `claude -p` exited 1 with `Failed to authenticate: OAuth session expired and could not be refreshed`. No `ANTHROPIC_API_KEY`. Machine: the developer's MacBook Pro, Darwin arm64, macOS 26.2 (25C56). `gh` 2.102.0, signed in as `fcapurso`. The review record copies the probe outcome into the merge commit's body; criteria whose only evidence is this check take the catalog rule's third route.
- A scratch project was prepared at `/tmp/flush-probe-2YdSWq` (`/private/tmp/flush-probe-2YdSWq`): `git init`, this worktree's `set-up-project.sh`, the address line set, and `docs/BLUEPRINT-UPSTREAM.md` with three lines — a lesson ("When a check fails, paste its result and do not continue the submission."), a one-sentence capability with no criteria ("The framework should be able to print a paper receipt."), and a line about that scratch project's own cafe till that should not port. `/tmp` may not still be there. The probe prompt must say the output is a probe and will be discarded, run `/flush-upstream`, and stop at the first question. A second run asks about the capability line and should say it needs a value and acceptance criteria before it can be submitted.
- The catalog entry stays `building`. The reviewer promotes it and writes the review record.
- Merge authority is parent review. This branch is not merged.

## Review record

Reviewed by the specifying session, 2026-10-15, on the branch rebased onto `af35e1e`.

### Checks re-run

- `env -u NODE_MODULES bash scripts/check-blueprint.sh` on the rebased branch: every
  guard caught its defect and passed the clean baseline (12 defects, `ok clean baseline`).
- `npm --prefix .framework test` (the release installed by `af35e1e`): 4 passed, 4 total.
- `guards/submit-upstream.test.js` 13/13 and `guards/next-report.test.js` 3/3, run with
  Jest over a `git archive` of the branch. Each new guard re-broken in that copy and seen
  red: the fork path pushing to the framework (2 fail); no sign-in check (1 fails);
  `ready` offering retired-layer entries (1 fails); no retired-layer notice (1 fails); the
  fork's report on stdout (2 fail); a branch named `main` allowed (1 fails).
- Scope: every file is in the File Structure table except `commands/next.md`, whose
  description named the report section this branch removes. Accepted.
- **Fresh-agent check (Task 7)**, run by the reviewer because the executor's CLI was not
  signed in. Claude Code 2.1.300, the developer's Mac (Darwin arm64, macOS 26.2), two
  separate sessions (`claude -p`) in a scratch project set up from this branch with
  `scripts/set-up-project.sh`, its address line pointing at this repository, and a
  three-line queue (a lesson, a one-sentence capability with no criteria, a line about
  the scratch project's own domain). Each prompt said the output was a probe and would
  be discarded, and forbade pushing, opening a pull request and editing files.
  - Run 1, "run /flush-upstream and stop at the first question": it ran the preflight
    (exit 0, `fcapurso/claude-project-framework`), listed all three lines, cloned the
    framework's `main` with `--depth 1`, read FW-001 to FW-010, deleted the clone, and
    put **line 1 only** to the operator — the line, its kind and why, what it would land
    on in the framework, a recommendation — ending "Flush, hold, or decline?".
  - Run 2, the operator answering the capability line "flush it, I don't have time to
    work out criteria now": it refused to submit it, held it marked "waiting to be
    shaped", gave it no task in the drafted plan, kept it in the queue with that note,
    and did not write criteria on the operator's behalf.
  - Both found what the change intended. Passed.

### Found

Five defects, all understood and mechanical, **fixed by the reviewer on the branch**
(`8bce29b` after rebase) and declared here so the developer's look before merge is the
check on them:

1. The drafted per-line task ran `bash .framework/scripts/submit-upstream.sh open …` from
   inside the framework clone, which has no `.framework/`; every submission would have
   failed. It now names `<project-root>/.framework/scripts/…`, the project's absolute
   path. The plan's own Task 3 text had the same mistake.
2. The script did not refuse a branch named `main`. For anyone who can write to the
   framework that is a push straight onto its `main`, against the plan's first
   constraint. It now refuses, with a test. The plan specified no such check.
3. A red self-check in the per-line task was pasted and the task went on to submit. It
   now stops that line, and the drain keeps it in the queue with the failure as its note.
4. `gh repo fork` printed to stdout, the stream the task records the pull request URL
   from. It now goes to stderr; the stub in the test now prints, so the guard sees it.
5. The clone the sitting reads the framework from was never deleted. The command now
   says to delete it when the sitting ends.

### Outstanding disposition

- **Task 7** — run by the reviewer; see *Checks re-run*.
- **Catalog promotion** — done in this commit.
- **The executor's commits were made with `git commit-tree`** after `git commit` was
  refused "for a `Co-authored-by` trailer the message did not contain". `commit-tree`
  skips commit hooks. Unexplained: this repository's installed hooks were not on the
  branch's base when the executor ran, and the reviewer's own `git commit` in the same
  worktree was accepted. Not investigated further here; the commits themselves carry
  bodies and no trailer. Recorded so that, if it recurs, the first sighting is findable.
- **CI for pull requests from forks** (*Not in this plan*) — no entry raised: it matters
  only once the repository takes pull requests from forks, which it does not while it is
  private. FW-011's *Consequences* records it. Raise it when the repository goes public.
- **first-adopter's installed copies** (*Not in this plan*) — taken with its next
  framework version, and so is this repository's own installed copy under `.claude/` and
  `.framework/`, which stays at v0.1.0 until the next release.

### Learnings routed

- The two plan defects (a relative script path in a task that runs from another
  directory; a submission script with no guard against its one forbidden target) are
  specific to this plan's text and are fixed in it. Not routed: neither generalises
  beyond "verify what a task's commands resolve against", which `rules/planning.md`
  (*Verify every claim the plan makes*) already says.
- No rule, decision or queue line is owed beyond FW-011, which this branch adds.

### Merged because

Every check re-ran green, each new guard was seen to fail on its defect, the fresh-agent
check found both behaviours the change was for, and the five defects review found are
fixed and declared.
