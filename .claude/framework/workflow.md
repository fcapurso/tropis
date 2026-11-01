# Development workflow
<!-- layer: framework -->

The spine of a change. Scale the ceremony to the change: a two-line fix does not need a
design document; a new subsystem does. **State which steps you are skipping and why** —
silent skips are what let quality drift, and they are the only thing this document
genuinely forbids.

## Who does what

Specification and execution are done by **different sessions.**

The session that shapes a change and writes its plan acts as business analyst and
technical lead. It writes the plans and does **not** execute them. Execution is
dispatched to separate agents, which may dispatch their own review subagents.

**The one exception is a change whose result can be stated only by producing it.** Its
author may build it and send it to a fresh agent to review, instead of describing it
for an executor, and decides which when writing the plan — never both:
`.claude/rules/planning.md`, *Do not rehearse the work to write its plan*.

A plan must therefore be **self-contained** — every piece of evidence and reasoning its
executor needs is in the plan. If an executor has to ask the specifying session what
something means, the plan was underwritten.

The specifying session decides two things per plan, independently:

- **Model tier** — how much judgment does *executing* it require? A plan that specifies
  its target content verbatim can run on a small model however much thought went into
  writing it. Do not pay twice for reasoning already spent.
- **Merge authority** — **self-merge** when the merge criteria are mechanically
  checkable; **parent review** when correctness depends on context the specifying session
  holds, or when the change is hard to reverse.

It hands each plan over with the **thin prompt `/dispatch` prints** — see
`framework/dispatch.md`.
Prompts state capability, never vendor.

### The handovers, and who owes what at each

A change passes through more hands than "specify, execute, review". Naming them matters,
because for a long time three of these had no stated obligations and things fell through
them.

| # | Handover | The one handing over owes |
|---|---|---|
| 1 | **Specifying session → executing agent** | A self-contained plan, and the thin prompt `/dispatch` prints for it |
| 2 | **Executing agent → reviewing session** | A pull request and a handover report on the branch |
| 3 | **Reviewing session → developer** | A statement of what to look at, once the branch is deployable — drafted with `/manual-check`, which writes the numbered steps to `docs/verification-log.md` as `pending` before the developer runs them |
| 4 | **Developer → reviewing session** | What they found by using it — recorded on that same entry as `pass`, or `fail` naming the step and what was seen instead |
| 5 | **Reviewing session → `main`** | A review record, then the squash-merge |

**3 and 4 are required for anything with a screen.** A reviewer can re-run every check and
still miss what one minute of clicking finds — a deploy that shipped an interface with no
script, a read path that had never worked, a control that opened the wrong thing. None of
those was visible to a green suite. For changes with no user-visible surface, say so in the
review record and skip them.

**The developer is not a second reviewer.** They use the thing. Findings come back as
symptoms — "this looks wrong", "my triggers are gone" — and diagnosing them is the
reviewing session's job, not theirs.

### When review finds a defect

The reviewing session may fix it, or send it back out. The test is: **could I be wrong
about what the fix should be?**

- **No — it is understood and mechanical.** Fix it on the branch. Every agent is a fresh
  session, so sending back means paying for a whole dispatch to change twenty lines.
  **Say so plainly in the review record**, and let the developer's testing be the check.
- **Yes — it needs judgment, changes behaviour, or reopens a design question.** Write the
  instruction and dispatch it. It then gets its own handover report and a real review.

**A reviewer who fixes and merges has approved their own code.** That is the arrangement
this workflow rejects everywhere else, and it is tolerable only because the fix is small,
declared, and lands in someone else's hands before merge. When those three do not all
hold, dispatch it instead.

**Asking the developer does not convert a judgment call into a mechanical one.** A
reviewer who finds a design defect, puts it to the developer, gets a decision, and then
implements it has satisfied the test above and still ended up approving their own work.
The developer deciding *what* should change is not authority for the *reviewer* to be the
one changing it — that is a second, separate question, and the answer is usually no.

**The signal is the kind of defect, not its size.** A review that is turning up code
defects is a review. A review that starts turning up *design* defects — a wrong storage
choice, a wrong UI technology, a feature that means something other than intended — has
stopped being a review, however willing the reviewer is and however clear the fix looks.
Stop and dispatch a plan.

> This is written from a review that did the opposite: it converted a panel from one UI
> technology to another, removed a storage layer, and changed what the feature meant —
> each put to the developer and approved, each then implemented and reviewed by the same
> session. It shipped and worked, because the developer exercised it by hand across
> several deploys. That is the mitigation, not the process.

### How many plans

A plan lands as one commit with one message, so **a plan must be one thing that becomes
true.** State what becomes true in one sentence: if you need the words *"and also"*, it
is two plans. Decide this while writing, not at merge — a squash cannot be split.

Mixing application and framework changes is fine when it passes that test, which it does
when the framework half exists to serve the application half. Full rule:
`.claude/rules/planning.md`.

## Branching

- One branch per plan: `plan/<id>-<slug>`. Do not commit feature work directly to `main`.
- **A session creates its branch in a worktree of its own, never in the main
  checkout.** Two sessions open on one project share the main checkout, so one
  session's checkout or pull moves the branch the other is working on: a commit lands
  on the wrong branch, or starts from the other session's work, and nothing says so
  until a push carries it. So a session about to create a branch — a plan's executor,
  the session landing a backlog edit or a plan, the one dispatching — runs
  `git fetch origin && git worktree add ../<repo>-<slug> -b <branch> origin/main` and
  works there. The base is `origin/main` whatever the main checkout has checked out.
  The main checkout stays on `main`, used only to pull and read. A hook refuses
  `git checkout -b`, `git switch -c` and `git branch <name>` in the main checkout and
  prints that command. Once the branch has merged, remove the worktree and delete the
  branch, as *Merge and clean up* does.
- **Where the main branch is gated, nothing goes directly to `main`.** It is gated when
  its host refuses a merge whose checks have not passed — on GitHub, the ruleset Tropis
  ships — and an agent treats it as gated unless `.claude/project.json` records
  `"ungated"`. There every change, a backlog edit or a plan file included, reaches
  `main` through a pull request that merges itself once green: commit on a branch in a
  worktree of its own (above), push it, open the pull request, run
  `gh pr merge <N> --auto --squash` with `--subject` and `--body`, and then run `node .tropis/scripts/main-status.mjs --pull-request <N>`.
  **Setting auto-merge does not finish the job; the change is done when that command
  reports the main branch green.** Auto-merge does not update a branch, and the host
  requires one up to date with `main`, so a pull request that falls behind sits
  unmerged with nobody told. The command brings it up to date and keeps waiting, and
  stops, naming the pull request, when it conflicts, a check fails, or auto-merge is
  off. Dispatch's move of an entry to `building` is such a change: the
  dispatching session lands it through its pull request and waits until it has merged
  before the executor starts.
- **Where it is not gated, what may go directly to `main` is what cannot change how an
  agent behaves**: the
  backlog, generated documentation, plan and spec files, the release notes `/release`
  commits, the README `/refresh-readme` commits, and prose under `docs/`.
  **Anything under `.claude/rules/`, `.claude/rule-additions/` or `.claude/framework/`
  needs a branch, and so does anything under `.claude/commands/`**: a command changes
  how every later session behaves. A command edit needs a commit body but no fresh-agent
  check, unless it changes what an agent is told to do.
- **Where CI skips some paths, that filter and the list above are one list.** What may
  skip a pull request should be exactly what CI may skip. Encode it once, in the CI
  configuration, and have each place point at the other rather than restate it — two
  copies of one claim drift. A generated or guarded file inside an excluded directory
  must be re-included, or its guard fails later on an unrelated branch: a document a test
  checks is not prose. **Prove an exclusion on a pull request whose entire diff is the
  excluded file**, based on the branch carrying the filter. A pull request path filter
  is evaluated against the whole pull request diff, not the latest push, so once a
  checked file is in the diff every later commit matches: in one project a prose-only
  commit on a pull request already carrying the workflow started a run in seven seconds,
  and the same change as its own pull request started none in 201.
- **Say whether anything enforces this.** Tropis's pipeline asks the host on every run,
  and its `host` job fails until the main branch requires a pull request and a passing
  check and auto-merge is not turned off, or `.claude/project.json` records `"ungated"` with the
  reason, which every run then repeats in its summary. Where the project records a
  reason, also write in its own `AGENTS.md` that nothing refuses a push to `main` or a
  red merge, with the date it was checked: a reader who assumes a gate exists will trust
  a green tick that nothing was checking. The moment to repeat it is the commit itself:
  `framework-commit-check.sh` speaks at any commit on `main` where no reason is
  recorded, and otherwise only when the commit carries something that belonged on a
  branch.
- **A release pipeline is a third writer to `main`.** Where the project includes the
  optional release section, its pipeline sets the version and promotes the notes on
  `main` itself. That is not a breach of the list above; name the files it commits in
  the project's own `AGENTS.md`, so a reader of the list does not take them for one.
  Where the main branch is gated it cannot be: nothing bypasses the gate, so a project
  whose release pipeline pushes to `main` records why it is ungated until its release
  only tags what `main` holds.
- **A commit touching `.claude/rules/`, `.claude/rule-additions/` or
  `.claude/framework/` states what its fresh-agent check found, in the body.** One or
  two sentences: what the agent was asked to do, whether it found what the change
  intended it to find, and **which tool and version ran it, on which operating system
  and architecture — never the computer's name**. A check whose result lives only in
  the session that ran it is a check nobody after you can see, and one that does not
  name its tool cannot be told apart from a check of something else.

  Not a PR, not a plan — a branch and two sentences. The cost is minutes and the thing it
  buys is a moment where the change is separable from `main` while somebody looks at it.

  **This path still owes the doc closeout a plan would have owed**, in particular
  whether the change taught or built something portable. A *no durable change* answer
  goes in the commit body here, as it goes in the review record's *Learnings routed* on
  a plan.

  **This carve-out used to cover "documentation, backlog, and workflow changes", and that
  is the path most framework changes took.** In the installation where this was measured,
  more than half the commits touching the instruction layer landed on `main` with no
  branch and no recorded check — among them the handover requirement itself, every fix for
  rules delivered where nothing loads them, and a rule that was false about the code for
  two days while being delivered into every session in that area.
  These are the highest-leverage files in the repository: an error
  in one is executed silently by every later session until something external catches it.
  They were receiving the least process, and FW-004 names why that is structural rather
  than careless — the framework is the only part of the system authored and reviewed in
  the same context.

  **The fresh-agent check is the reviewer this arrangement otherwise has no way to get**,
  which is why its outcome goes in the commit body rather than staying in the session that
  ran it. Where it ran, it worked; there was previously no way to tell from the repository
  whether it had run at all.
- **A dispatched agent always works in its own worktree**, never in the directory the
  specifying session is using:
  `git worktree add ../<repo>-<id> -b plan/<id>-<slug> origin/main`
  This is not only for concurrency. A shared working directory means a `git checkout` by
  either party silently redirects the other's commits onto the wrong branch.
  The `../` is load-bearing: a worktree nested inside the repository that gets its own
  install breaks tools that resolve upward. `rules/planning.md`, *A plan names the
  checkouts it may touch*, says why and what to do where a tool chooses the location.

## Preflight — before creating a branch

```bash
git fetch origin
git status --porcelain          # must print nothing
git rev-parse main origin/main  # the two hashes must be identical
```

**If `main` is ahead of `origin/main`, stop.** A pull request diff is computed against
`origin/main`, so every unpushed commit on local `main` is swept into the squash-merge —
landing unrelated work under a message that describes none of it, and destroying the
granular history in the process.

If the tree is dirty, stop and report rather than stashing or committing it.

Push `main` before dispatching, or hand the agent an explicitly stated base commit.
Where `main` is gated nothing is committed on it to push: the dispatch's status change
lands through its own pull request first.

## Scope check — before merging

```bash
git diff --stat origin/main...HEAD
```

Every file must appear in the plan's file list. Anything else means the base was wrong.
**This is the cheapest check in the workflow and it catches the most expensive mistake** —
one glance at a file count is enough.

## Merge and clean up — in this order

The order matters. `gh pr merge --delete-branch` deletes the local branch first, and if
that fails it abandons the remote deletion too — leaving an orphaned branch on the
server. A worktree still holding the branch is exactly what makes it fail.

```bash
git worktree remove --force ../<repo>-<id>   # release the branch first
git branch -D plan/<id>-<slug>
gh pr merge <N> --squash --delete-branch \
  --subject "<type>(<scope>): <net functional gain>" \
  --body "<intent — what is now true that was not before>"
git checkout main && git pull origin main
node .tropis/scripts/main-status.mjs --wait HEAD   # the run this merge started
```

`--force` is required, not optional: a plan worktree accumulates untracked files —
dependency directories, tool caches — and plain `git worktree remove` refuses while they
are present. That refusal is what makes `--delete-branch` abandon the remote deletion and
leave an orphaned branch behind.

**Where the main branch is gated, the merge is
`gh pr merge <N> --auto --squash --subject "…" --body "…"`**, in place of the command
above. It returns at once, and the host merges when the required check passes. With
auto-merge enabled, `gh` deletes neither the local nor the remote branch, so the local
branch is deleted beforehand, as above, and the remote one by the repository setting
*Automatically delete head branches*. Then run
`node .tropis/scripts/main-status.mjs --pull-request <N>`, in place of the code block's
last line. It waits until the pull request has merged, bringing its branch
up to date whenever `main` moves under it, then waits for the run the merge started on
`main`, on the merge commit itself rather than on `HEAD`. Its exits are those of
`--wait` below, plus 4 when the pull request did not merge. Its line then names why:
a conflict, a failed check, auto-merge off, the pull request closed, or a pipeline that
finished without a check the main branch requires. On 4, fix what it names, set
auto-merge again if it was off, and run it again. **A pipeline that finished without
its required check** leaves nothing on the branch to fix, and nothing will start the
check: re-run that run once by hand, with `gh run rerun` and the run id from the address
the line gives, say so in your report with that address, and run the wait again. That
re-run starts a check that never ran, so it hides no failure; if the check is missing
again, stop and report both runs. Pull `main` once it has reported.

**Where the host marks no check as required, its auto-merge merges at once.** It does
not wait for checks that are still running, so a merge waits until the pull request's
checks have finished green. In one project a pull request merged with both checks
pending; they passed afterwards, by luck.

Pass `--subject` and `--body` explicitly. Left to itself the squash inherits the branch
commits' messages, and the merged commit then lists working history instead of saying
what the plan made true.

**The sequence ends by waiting for the run the merge started on the main branch.**
`main-status.mjs --wait` asks GitHub, through `gh`, for the pipeline's push run on that
commit every 30 seconds, for up to 30 minutes, and prints one line. Exit 1 means the main
branch is red: say so, with the commit and the run the line names, and stop. Repairing it
is the next piece of work, through a pull request like any other, and nothing else starts
on top of it. Exit 3 means the run had not finished in 30 minutes: say so, and run the
command again later. A line saying it could not tell exits 0: report it as it stands,
with its reason, and do not read it as green. Where an agent tool stops a command sooner
than 30 minutes, run it in the background, or run it again: each run waits for the same
pipeline run.

A gate on the host stops a red pull request merging. It does not stop the main branch
going red after the merge — from a deploy, an environment, or two changes that pass
alone — and a project without the gate has nothing else that tells anyone. In one
project a break lasted ten days while six further commits landed on top of it, and was
found only because someone went to look.

## Merging

Every plan lands as **one squash-merge commit**; per-task commits are working history.

**In the framework's own repository, a group of flushed contributions is the
exception.** Its maintainer takes in contributions from projects' flushes a group at a
time. A group is many things, so its pull request keeps one commit per contribution,
each with its contributor as author, and lands by rebase rather than squash: history
shows each contribution, and each can be reverted alone. A plan for one catalog entry
still lands as one squash-merge.

Parallel branches share a base, so `main` moves under them as siblings land. Before each
merge:

1. `git fetch origin && git rebase origin/main`
2. **Re-run the plan's full merge criteria, not just the test suite.** A rebase can
   invalidate a criterion with no textual conflict — new files shift coverage figures and
   can turn another plan's guard red.
3. Squash-merge.

**A check that passes on a rerun with nothing changed is a bug.** Record it in the
backlog with both runs, as any defect. Nothing retries a failed check automatically —
not the pipeline, not an agent — because a retry that passes hides the failure a person
needed to see.

The message states the **net functional gain**, not the files touched:

```
<type>(<scope>): <what is now true that was not before>

<What someone can now do, or what failure is now prevented. Intent, not
inventory.>

Implements: <catalog id, if applicable>
Plan: <plan document path>
```

## The cycle

1. **Understand.** State the problem and, if one exists, the catalog entry it relates to.
2. **Propose.** Approach, files affected, trade-offs. Verify any assumption about
   external API or platform behaviour against the documentation or a probe — **training
   data is not ground truth** about a specific system's current behaviour. Two probes
   only prove a change over time when they were taken the same way: same credentials,
   same client, same code path. Different vantage points return different truths about
   the same record, and the difference reads convincingly as instability. For anything
   beyond a small fix, get agreement before implementing.

   **Where code came from is a second assumption, and it fails differently.** A pointer
   at a working example is a tip about where to look, not a licence to adopt its
   approach wholesale: research how the problem is solved, then write the project's own
   version against its own interfaces and names, and say which named source you worked
   from — in the plan, the handover or the reply — even when the answer is "nothing in
   particular". An agent cannot check this for itself: it has no licence awareness while
   generating and no way to audit its own output for provenance afterwards, so its
   assurance that it wrote something itself is worth nothing as evidence, and the
   declaration is the only record anyone gets. In a closed-source product, this is what
   keeps expression copied from a copyleft project out of the code, along with the
   obligation to publish source that comes with it.

3. **Implement,** with tests. Run the suite immediately after writing or changing a
   test — do not batch and do not proceed with a failing suite.
4. **Verify.** Automated checks, plus any check only a person can perform. Use
   `/manual-check`: it decides the kind from the diff, drafts the steps, writes them to
   `docs/verification-log.md` before the developer runs them, and records the outcome.
5. **Close out.** See below.

## Doc closeout — required

Before the work is considered done, update the durable artifact the change affects,
**or state explicitly that no durable change is warranted**:

| If the change… | Update |
|---|---|
| adds or alters user-visible behaviour | the feature catalog; the backlog board rebuilds itself from it |
| chose between real alternatives | `DECISIONS.md` |
| revealed a constraint an agent would otherwise trip over | `.claude/rules/<area>.md`, with a `paths:` header naming its area; or, to add to a shipped rule, `.claude/rule-additions/<name>.md` — plain text, no header, named after the shipped rule. Its area stays in `.claude/rule-areas.json`. Then run `npm --prefix .tropis run rules`. The additions follow the shipped text in the one rule each tool loads, and win where they contradict. Never edit the shipped text in `.tropis/rules/` or a generated file. A project's additions to a framework document go in its own `AGENTS.md` |
| changed module boundaries or data flow | the architecture document, diagrams included |
| alters what someone developing the project is told about working with the framework (the framework commands it names, how to set up a working copy) | the project's operator guide, `.tropis/README.md` (and any guard that asserts those claims) |
| alters what the product's users are told to do or how they start | nothing in the plan: the product's README is refreshed as a whole page by `/refresh-readme`, on its own or from `/release`. A plan does not patch it, except to correct a command, file or link the README names that the plan removed or renamed — correcting the reference and adding nothing |
| fixed a defect in a file the blueprint also ships — path resolution, payload parsing, control flow, anything that would be wrong in any project | the blueprint upstream queue (**not** project-specific content: a namespaced marker directory, a comment naming a local backlog id — those are customisation and travel nowhere) |
| taught **or built** something portable to any project — a lesson, or a command, guard or script a set-up project would want | the upstream queue. One inbox for both: the flush decides whether a line travels as an edit or as a shaped backlog entry, each in its own pull request to the framework — not the author, at write time |
| changed `.claude/framework/` or `.claude/rules/` | run a fresh-agent check (below) before closing, on a branch, and record what it found in the commit body — see **Branching** |

**This step is the one most worth keeping.** Its absence is the single most common cause
of documentation rot: plan execution that ends at "tests green, merge" leaves reference
documents drifting from the code indefinitely, and nothing ever reports it. One of the
projects this came from found a guideline ten months stale, describing a subsystem that
had been deleted.

**Why that last row is worded around the *kind* of change rather than the filename.** A
project holds customised copies of scripts the blueprint ships, and they are *supposed* to
diverge: marker directories are namespaced on purpose. A rule that fired on every shared filename would
fire mostly on those, and be ignored within a week. The one that must travel is the other
kind — a defect in the shared mechanism, which is wrong in every project that was set up
with it.

**Telling the two apart is a command, not a judgment.** Every shipped script marks the
regions a project owns. `check-drift.sh`, run from the blueprint against a project,
reports each script that differs outside them — the kind this row sends upstream — and
says what to do with each.

This row exists because that did not happen. A hook here was fixed on 2026-07-28 for
emitting nothing when run from a subdirectory; the fix was never queued; the same defect
was found again six weeks later in the blueprint and fixed a second time, differently, in
a test fixture — and the script that actually seeds new projects carried the bug through
both. The obligation was already in this table at the time. It was a row someone had to
remember to consult, and nothing put it in front of them at the moment they merged.

**Fresh-agent check — for framework changes only.** The framework is authored and
reviewed in the same context, which is the arrangement this workflow rejects everywhere
else: a plan's executor is a different session precisely because an author cannot see
the gaps in their own work. Framework edits have no such separation, and in one project
that cost three defects in a day that no guard could catch.

So before closing out a change to `.claude/framework/` or `.claude/rules/`: dispatch an
agent that has only the repository, give it a real task in the area the change affects,
and check whether it finds what the change intended it to find. If it does not, the
change is not finished.

**Whoever wrote the clause dispatches the probe.** That sounds like the self-review this
workflow rejects everywhere else, and it is not: the separation here is the *agent's*
freshness, not the dispatcher's independence. A probe that has only the repository has
none of the author's context, which is the whole mechanism. What the author must not do
is aim it kindly — the task goes at the clause just written, and a probe that finds
nothing because it was pointed somewhere comfortable is worse than no probe, because it
is reported as a pass.

**Choose the task to exercise the clause you just wrote, not the area it sits in.** A
check tests only what its task happens to touch. A rule was once widened to cover schema
changes and declared checked on the strength of a run whose task deleted a file; the new
clause was never exercised, and the wording made that sound like coverage when it was a
spot-check of the paragraph next door.

**Give the check an invented subject, not a real backlog entry.** The task has to be real
enough that the agent touches files — rules delivered by path never reach an agent that
only discusses an approach, and the check then proves nothing. But the *subject* should
be hypothetical. A check once exercised its clause by building the next blocked entry in
the catalog, and produced working code for a feature awaiting a spike: no plan, no
review, and output that looks exactly like real work. **Say in the prompt that the output
is a probe and will be discarded.**

**Any current install may run the check; record which one.** The framework does not
depend on a particular version or installation of Claude Code or Cursor, so neither
does its check — a cloud session, another machine, or whatever `claude` is on `PATH`
will do. The record is provenance: if a later version behaves differently, it shows
which version a result came from. A result that holds only on some versions is a
finding about the framework — change it so it no longer depends on what varies — not
a reason to require a version.

**Judge the check by what the agent did, not by what it says it did.** A run that prints
only the agent's final reply hides the commands it ran and what answered them, so a check
whose pass depends on a hook cannot tell a hook that refused a command from an agent that
never ran it. Run the probe so its tool calls show — in Claude Code,
`claude -p --output-format stream-json --verbose` prints each call and each reply, a
hook's included — and quote the call and its answer in the record. Found reviewing the
hook FW-040 added: the executor's probe passed but could not say whether the hook had
fired, and a second run with the calls visible showed the refusal reaching the agent.

**A probe on someone's own machine is not given only the repository.** The agent tool
also loads that person's own instructions, the ones that apply to every project. When
the change repeats something already in them, the probe follows those and passes
whether or not the change works. Before running it, check whether they say what the
change says; if they do, run the probe where they do not load, such as a cloud session,
and say so in the record. Found absorbing a flush, where a probe of a provenance rule
started locally reported seeing its owner's own copy of that rule.

**End the check with a proposal.** Whatever it finds becomes a backlog entry, a rule, or a
shaped plan — put to the developer as a recommendation, not left in the conversation that
ran it — or is dropped with a one-line reason, when the catalog rule's *What does not
become an entry* says it should be. Declining is then a decision someone made, rather
than a thing that quietly did not happen.

This is not ceremony. Run once against the instruction layer, it found a defect the
authoring session had missed.

Use `/capture-learning` when the routing is not obvious.

---

# Optional sections

Say in the project's own `AGENTS.md` which of these apply; this file is replaced on
every update, so do not delete from it. Both were load-bearing in one of the source
projects and absent from the other, which is why they are here and why they are
optional.

## Optional — deploy and verify on a running instance

**Include if the project deploys to a hosted environment** and behaviour can differ there
from local. Insert as steps between *Implement* and *Close out*:

- **Where an agent may act on only one environment, say so at the command.** Name the
  single environment an agent may deploy to and pin the project's deploy command to it, so
  the boundary holds by construction rather than by memory. A rule about it in a document
  reaches everyone except the agent about to cross it: documents are delivered by file
  path, and a task that says "deploy" touches none of the paths that would carry the
  warning. Deliver it at the command shape instead. Staging and production reach a
  customer's live site — an agent asked to deploy there stops and reports the instruction
  rather than running it.
- **Writing deployment automation is not running a deploy.** State the boundary above as
  being about *running* one, and say outright that an agent may write and edit deployment
  automation for any environment. Otherwise every plan that adds a pipeline stage
  contradicts the rule it is executed under.
- **Deploy to the development environment** using the command named in the entry file.
  State the condition under which a plain deploy is insufficient — most platforms have
  one: a permissions or manifest change requiring an install or upgrade rather than a
  deploy. Get it wrong and the deploy succeeds while the change does not take effect.
- **Compare the toolchain version CI installs with the local one at the moment a local
  deploy uses it**, and say so only on a mismatch. A periodic reminder lets them drift:
  in one project a check tied to closing an epic let the pinned command-line tool and
  the installed one drift a major version apart for months, because no epic closed.
- **Run the end-to-end suite** against the deployed instance.
- **Run the manual checks** for anything the suite cannot reach — native dialogs, file
  pickers, third-party redirects, output only a person can judge — through
  `/manual-check`, which writes each one to `docs/verification-log.md` before it is run
  and records the outcome. A recorded pass is what makes "verified" mean something a
  month later.

**Skip conditions, stated explicitly rather than silently:** early phase, where no deploy
target or suite exists yet; and changes with nothing to observe on a running instance —
pure functions, types, constants — where automated checks suffice.

## Optional — release

**Include if the project ships versioned releases.** Three things transfer from the project
that had this; the rest is release-tool specific.

- **`/release` drafts; the developer starts each step.** The command checks `main` is
  clean and pushed, where Tropis keeps the README brings it up to date with
  `/refresh-readme` (pushing the refreshed page, when there is one, as its own commit),
  proposes the bump, drafts the notes from the backlog for the people who use the
  product, commits the notes, and prints the trigger for the next step. An agent never
  runs a trigger. A release is three steps:
  1. **The release candidate**, for one commit on the main branch that already carries
     the notes. It runs every stage on that commit; puts the pre-production environment
     back on the version production runs; deploys the candidate there; and says whether
     anything must be upgraded by hand. It sets no version and makes no tag. Tropis
     ships this step: the project fills `pipeline/candidate/`, and
     `.github/workflows/tropis-candidate.yml` runs it.
  2. **The check**, by the developer on the pre-production environment, drafted and
     recorded through `/manual-check`. `/release`, run again, prints the release trigger
     only once that entry says `pass`.
  3. **The release**, given the candidate's commit. It is the project's own pipeline,
     and must: run the full suite as a gate; on top of the candidate, make one commit
     that sets the version, promotes `## [Unreleased]` in the notes file and writes
     `Checked on the release candidate: yes`, and changes no other file; tag that
     commit; merge it into the main branch; push the branch and the tag together; deploy
     the tag to production; publish the notes without the `Checked on the release
     candidate` line; and roll back on failure, as below. Nothing merged after the
     candidate reaches production through it.

  **Where the project leaves `pipeline/candidate/` empty, there is no candidate and no
  check.** `/release` records that no candidate was rehearsed, and the release runs on
  the main branch as it stands.
- **The tag sits one commit above the candidate, and its code is the candidate's.** The
  version and the promoted notes belong in the tagged commit, and the candidate cannot
  carry them: they are set only once it has passed. So the release refuses a commit
  that changes anything besides the notes file and the files carrying the version.
  Merging it into the main branch is a fast-forward when nothing landed since the
  candidate, and a merge otherwise; a conflict stops the release before anything is
  pushed.
- **Only a tag of the form `vX.Y.Z` is a release.** A tag such as `v1.5.0-rc.1` may mark
  anything else, and the framework ignores it: the candidate puts the pre-production
  environment back on the highest `vX.Y.Z` tag, and `/release` counts the changes since
  the last one. Without this, a test tag sorts above the release it precedes and above
  the one before it, and the pre-production environment is reset to a version production
  never ran, with nothing to say so.
- **The candidate is an upgrade rehearsal.** Because the pre-production environment is
  first put back on production's version, each candidate deploy is the upgrade
  production will receive, onto data an older version wrote.
- **Production deploy is a manual step, never a CI job.** Merging to the main branch may
  deploy to a development environment. The pre-production environment belongs to the
  release candidate, and production is started by a person after the check on the
  candidate.
- **A job that writes irreversible remote state mid-run needs rollback, not idempotency.**
  Compensating actions on failure (`if: failure()`) keep each run self-contained. Trying
  instead to detect "is this already done?" on a re-run is unreliable, because the
  working tree on the re-run already reflects the previous run's side effects — a version
  file that was bumped, a tag that was pushed. Use `set -euo pipefail` in the rollback
  script; without it a transient network error leaves remote state dirty while the step
  exits zero.
