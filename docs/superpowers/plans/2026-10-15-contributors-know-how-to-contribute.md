# A contributor can read how contributing to the framework works — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*.

**Goal:** `CONTRIBUTING.md` at the repository root says how a contribution reaches the
framework — by a flush from a project, or by a change made here — and what happens to it;
`README.md` and `bootstrap.md` point at it; the doc-closeout table makes a change to the
contribution mechanism update it; and a guard fails when the page names something that does
not exist or misstates whether fork pull requests get CI.

**Spec:** none. The entry `contributors-know-how-to-contribute` in `feature-catalog.yaml`
is the specification: its seven acceptance criteria and the comments above it. The
mechanism the page describes is decided in `framework/DECISIONS.md` FW-011 and implemented
in `commands/flush-upstream.md` and `scripts/submit-upstream.sh`; read all three before
writing.

**What this delivers:** `contributors-know-how-to-contribute`, all seven criteria. See
*Criteria and their evidence* at the end.

**What the specifying session verified on 2026-10-15, against `main` at `356247e`:**

- There is no `CONTRIBUTING.md` anywhere in the repository.
- How a contribution travels from a project (FW-011; `commands/flush-upstream.md`): lines
  wait in the project's upstream queue, `docs/BLUEPRINT-UPSTREAM.md`; `/flush-upstream`
  runs `submit-upstream.sh preflight`, then puts each line to the operator — flush, hold or
  decline — classifying it as a lesson (travels as the edit it proposes) or a capability
  (travels as a shaped backlog entry); it drafts a plan with one task per flushed line,
  each cloning the framework's `main` afresh, branching
  `upstream/<project-folder>/<flush-date>-<line-slug>`, running
  `bash scripts/check-blueprint.sh` in the clone, and opening one pull request with
  `submit-upstream.sh open`. The branch goes to the framework repository when the
  submitter can push there, otherwise to their fork, which is created if missing. A line
  leaves the queue when its pull request opens. Pull requests are reviewed and merged in
  the framework repository by its maintainer, never by the flush.
- What a flush needs (`scripts/submit-upstream.sh`, its header): `gh` installed and signed
  in, and the project's `.framework/README.md` line "set up from the framework at `X`"
  naming a GitHub repository. Otherwise preflight exits 1 with one line saying what is
  missing.
- `.github/workflows/ci.yml` triggers on `push` and `workflow_dispatch` only; its comment
  says the repository takes no pull requests from forks. FW-011's *Consequences*: "Pull
  requests from forks get no CI until ci.yml also runs on `pull_request`."
- How a change made here travels: `framework/workflow.md` (*Branching*, *Preflight*,
  *Merge and clean up*, *Doc closeout*, the fresh-agent check), `rules/planning.md`,
  `framework/dispatch.md`; the self-check is `bash scripts/check-blueprint.sh`. This
  repository's `CLAUDE.md` says the source folders (`rules/`, `framework/`, `commands/`,
  `scripts/`, `guards/`, `templates/`) are the next release and `.claude/`, `.framework/`
  the installed one.
- `README.md` lines 66–70 describe the flush in four sentences ("Lessons meant for every
  adopting project wait in an upstream queue…"). `bootstrap.md` lines 278–283 tell a
  newly set-up project about the queue and the flush.
- The doc-closeout table is in `framework/workflow.md` under *Doc closeout — required*.
  `guards/operator-page-closeout.test.js` asserts its two README rows by regex; a new row
  does not disturb those.
- `scripts/set-up-project.sh` copies named files only; `CONTRIBUTING.md` is not among them.
  `guards/set-up-project.test.js` › *sets a project up in its own repository* builds a
  project in a temporary directory with it.
- **How guards run in the self-check:** `check-conformance.sh` runs every guard under
  `guards/` with `FRAMEWORK_ROOT` set to a composed fixture tree that has no
  `bootstrap.md` or `PORTABILITY-NOTES.md`. A guard that resolves the blueprint from
  `FRAMEWORK_ROOT` and skips outside it therefore skips in every self-check run —
  `readme-usable.test.js` and `operator-page-closeout.test.js` do exactly that (staged at
  `356247e`: 10 passed against the real tree; the skip case only, with `FRAMEWORK_ROOT`
  elsewhere). `check-blueprint.sh` puts the staged blueprint tree in `INSTRUCTIONS`,
  which the guards inherit. Fixing the two existing guards is `blueprint-page-guards-run-in-the-self-check`; this plan's
  guard reads `INSTRUCTIONS` so it is not born with the same defect.

**Model tier: Medium.** The content is stated; the prose and a small guard are written to it.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 5 (record which).

**Merge authority: parent review.** An adopter-facing page and a framework document change.

Do not store a kick-off prompt on this plan.

---

## Delivers

contributors-know-how-to-contribute

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-contributing -b plan/contributors-know-how-to-contribute` |

## Global Constraints

- **Describe the mechanism as it is.** Do not change `commands/flush-upstream.md`,
  `scripts/submit-upstream.sh`, `.github/workflows/ci.yml` or FW-011. If the page cannot be
  written truthfully without a change to one of them, stop and report.
- **Point, do not restate.** The page links to the documents that define a step and says
  in a sentence what the step is for; it does not copy their rules.
- **Do not edit `.claude/` or `.framework/`** — they are the installed release.
- **Do not change `readme-usable.test.js` or `operator-page-closeout.test.js`.** Their
  skipping in the self-check is `blueprint-page-guards-run-in-the-self-check`.
- **No new dependency.**
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. Never add `Co-Authored-By` or "Generated with" trailers.

## Decisions

Taken with the developer on 2026-10-15; do not reopen them.

1. **The name is `CONTRIBUTING.md`**, at the root, because GitHub links that name from a
   new pull request — where someone arriving through a flush will be.
2. **Two ways in, one page:** a flush from a project, and a change made in this repository.
3. **`README.md` and `bootstrap.md` keep one sentence each** about contributing and point at
   `CONTRIBUTING.md`, so the mechanism is described in one place.
4. **Kept current like the operator and adopter pages (FW-006):** a doc-closeout row, plus a
   guard for what can be checked mechanically — the names on the page exist, and its
   statement about CI for fork pull requests matches `ci.yml`.
5. **The fork-CI statement is one fixed sentence**, so the guard can find it:
   `A pull request from a fork gets no CI run yet.` It is on the page exactly when `ci.yml`
   has no `pull_request` trigger.
6. **No `DECISIONS.md` entry.** Nothing is chosen between alternatives that FW-006 and
   FW-011 have not already decided.

## Traps

- **The page names paths in two places.** Most are this repository's
  (`commands/flush-upstream.md`); some are a project's (`docs/BLUEPRINT-UPSTREAM.md`,
  `.framework/README.md`). The guard maps installed paths to their source
  (`.claude/rules/` → `rules/`, `.claude/framework/` → `framework/`, `.claude/commands/` →
  `commands/`, `.framework/scripts/` and `.framework/hooks/` → `scripts/`) and allows a short,
  named list of project-only paths. Keep that list to what the page needs.
- **The guard must not skip in the self-check.** Read the blueprint tree from
  `process.env.INSTRUCTIONS`, falling back to the repository root; skip only when neither is
  a blueprint tree. Run `bash scripts/check-blueprint.sh` and confirm, in its verbose run or
  by a deliberate break, that the guard's real cases executed — not only a skip.
- **The guard must be seen to fail.** It includes a case that writes a broken page into a
  temporary blueprint-shaped directory and expects each problem reported.

## File Structure

| File | Change |
|---|---|
| `CONTRIBUTING.md` | New — the page |
| `README.md` | Lines 66–70: one sentence and a pointer |
| `bootstrap.md` | Lines 278–283: the queue sentence kept, the flush mechanism replaced by a pointer |
| `framework/workflow.md` | Doc-closeout table: a row for the contribution mechanism |
| `guards/contributing-page.test.js` | New — the page's names exist; the fork-CI sentence matches `ci.yml` |
| `guards/set-up-project.test.js` | *Sets a project up*: `CONTRIBUTING.md` is not in the set-up project |
| `feature-catalog.yaml` | `contributors-know-how-to-contribute` to `shipped`, at merge, by the reviewer |
| `docs/superpowers/plans/2026-10-15-contributors-know-how-to-contribute.md` | Handover report |

Doc closeout: an adopter-facing page changes, so `README.md` and `bootstrap.md` are above. A
framework document changes, so Task 5 runs the fresh-agent check. No rule changes, so no
Cursor projection.

---

### Task 1: The page

Write `CONTRIBUTING.md`, plain and short, in this order:

1. **Two ways to contribute** — from a project using the framework, or by changing it here.
   One paragraph.
2. **From a project** — what a contributor does and what happens:
   - a lesson or capability goes into the project's queue, `docs/BLUEPRINT-UPSTREAM.md`,
     when it would be true for any project (point at `/capture-learning`);
   - `/flush-upstream` is a sitting: each line is put to the operator — flush, hold or
     decline — and a lesson travels as the edit it proposes, a capability as a shaped
     backlog entry;
   - the plan it drafts opens one pull request per flushed line, from a fresh clone of the
     framework's `main`, after the framework's self-check passes in that clone; the branch
     goes to the framework repository or, without push access, to the contributor's fork;
   - what is needed: `gh` installed and signed in, and `.framework/README.md` naming the
     framework's GitHub repository;
   - what happens next: the maintainer reviews each pull request on its own and merges or
     declines it; a declined lesson stays applied in the project that raised it.
3. **Changing the framework here** — the path a change takes, each step one line with a
   pointer: a backlog entry (`/idea`), a plan (`rules/planning.md`), a branch and worktree,
   the self-check (`bash scripts/check-blueprint.sh`), a fresh-agent check for a change to
   a rule or framework document, review, a squash-merge (`framework/workflow.md`). Say that
   the source folders are the next release and `.claude/` and `.framework/` the installed
   one, which change only by installing a release.
4. **Not yet** — the fixed sentence of Decision 5, and why: `ci.yml` runs on push only.
5. **Keeping this page true** — one sentence: a change to how a contribution reaches the
   framework updates this page in the same plan (`framework/workflow.md`, *Doc closeout*).

Every path in backticks must exist, under the mapping in *Traps*. Commit.

### Task 2: The pointers

- `README.md`, lines 66–70: replace the four sentences with one — lessons meant for every
  adopting project are flushed back as pull requests — and a pointer to `CONTRIBUTING.md`.
- `bootstrap.md`, lines 278–283: keep the sentence telling the project to append a portable
  learning to `docs/BLUEPRINT-UPSTREAM.md`; replace the description of `/flush-upstream`
  and its pull requests with a pointer to the framework's `CONTRIBUTING.md`.

Commit.

### Task 3: The closeout row

In `framework/workflow.md`, *Doc closeout — required*, add after the adopter row:

```
| alters how a contribution reaches the framework (the upstream queue, the flush, its pull requests, CI for them) | `CONTRIBUTING.md`, in the same plan — only in a plan that executes in the framework repository |
```

Commit.

### Task 4: The guards

`guards/contributing-page.test.js`, in the style of `guards/readme-usable.test.js` (header
comment, `isBlueprintTree`), with the root from `process.env.INSTRUCTIONS`, else
`resolve(here, '..')`. One function, `problems(root)`, returns a list of strings:

- `CONTRIBUTING.md` is missing;
- a backticked path (contains `/`, ends in `.` plus 2–4 letters, no `*`, `<` or `>`) that
  does not exist under the mapping in *Traps* and is not on the project-only list;
- a backticked `/name` with no `commands/name.md`;
- the fork-CI sentence present while `.github/workflows/ci.yml` has a `pull_request`
  trigger, or absent while it has none.

Cases: `problems(root)` is empty on the real tree; and on a temporary blueprint-shaped
directory whose page names a missing script and a missing command and leaves out the
sentence while its `ci.yml` has no `pull_request`, `problems` reports all three.

`guards/set-up-project.test.js`, *sets a project up in its own repository*: add an
assertion that `CONTRIBUTING.md` does not exist in the set-up project.

Run each new or changed test immediately, red then green: break the page on purpose once,
watch the guard fail, restore it.

### Task 5: Checks and fresh-agent check

```bash
npm --prefix .framework test
bash scripts/check-blueprint.sh
git diff --stat origin/main...HEAD
```

Expected: both green; `contributing-page` executed its real cases in the self-check (show
how you know); the diff stat names exactly the files in *File Structure* except
`feature-catalog.yaml`.

**Fresh-agent check** (`framework/workflow.md` changed). In a fresh clone of this branch in a
scratch folder, start a fresh Claude Code session and give it, in one prompt:

> This is a probe and its output will be discarded. An invented plan in this repository
> changes `scripts/submit-upstream.sh` so that a flush submits one pull request per flush
> instead of one per line. Using only this repository, list every document the plan must
> update besides the script itself.

Pass: the answer names `CONTRIBUTING.md`, and does so because of the doc-closeout row.
Record the prompt, the answer's gist, pass or fail, and the tool, version and machine in a
commit body on the branch. A fail means the row is not clear enough: fix it and run again.

### Task 6: Handover

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. The reviewer promotes the entry and writes the review record.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| The page explains a flush from a project, its needs, and what happens after | `CONTRIBUTING.md`, *From a project* |
| The page gives the path of a change made here, by pointing | `CONTRIBUTING.md`, *Changing the framework here* |
| The page says what does not work yet | The fork-CI sentence; `contributing-page.test.js` |
| README and bootstrap point at the page | Task 2 diff |
| Doc-closeout row | `framework/workflow.md`; Task 5 fresh-agent check |
| A check fails on a name that does not exist | `contributing-page.test.js`, the broken-page case |
| Not copied into a set-up project | `set-up-project.test.js` |

## Not in this plan

- **Making `readme-usable` and `operator-page-closeout` run in the self-check.**
  `blueprint-page-guards-run-in-the-self-check`.
- **CI for pull requests from forks.** `ci.yml` keeps running on push only; the page says so.
