# Spec and plan rules
<!-- layer: framework -->

<!--
  Precondition: the first section assumes plans land as one squash commit. Under a
  merge model that preserves branch commits, the granularity test below is advice
  rather than a constraint — see `.claude/framework/commit-format.md`, "What these conventions
  assume". Everything from "Plans must be self-contained" down holds either way.
-->

## One plan, one thing that becomes true

A plan lands on `main` as a **single squash commit with a single message**. So a plan
must be one unit of work, and that is decided here — when the plan is written — not by
the executing agent and not at merge. There is no splitting a squash.

**The test:** state what becomes true in one sentence. If you need the words *"and
also"*, it is two plans.

Mixing application and framework changes in one plan is fine when it passes that test,
which it does when the framework half exists *to serve* the application half — a catalog
and the commands operating on it, a rule set and the script projecting it. It fails when
two unrelated changes ride together and the squash message can only describe one.

## Plans must be self-contained

The executor is a different session with none of this one's context. Every piece of
evidence and reasoning it needs is in the plan. If an executor would have to ask the
specifying session what something means, the plan was underwritten.

- **Carry the evidence, not just the conclusion.** A deletion needs its justification
  inline; a "verified" claim needs what was verified against.
- **Verify every claim the plan makes about the code before dispatching.** A plan that
  asserts something untrue sends the agent into a contradiction it was told not to
  resolve. This has cost a review round more than once.
- **A verification step must test every claim, not a sample.** An incomplete check that
  passes manufactures confidence.
- **A red check of an uncommitted change needs a commit when the check reads committed
  content only.** A check that exports `HEAD` cannot see a revert left in the working
  tree, so "restore the old code and watch it fail" proves nothing there. Say how to run
  it: make the revert a throwaway commit, run the check, and drop the commit — or name a
  check that reads the working tree.
- **State claims about the code as invariants that survive the plan's own commit.** A
  plan is verified before dispatch and executed after its commit has added the plan
  file, a catalog entry and regenerated documentation, so "exactly one grep hit" is
  already false when the executor runs it, while "nothing imports it" still holds.
- **A table mapping acceptance criteria to tests is a claim too.** A test named beside a
  criterion reads as coverage and hides the gap a blank cell would show. Check that the
  named test runs the sequence the criterion describes, not a unit test of one side of
  it.
- **Before writing a plan, read the review records of the plans already written from the
  same spec.** They record what those plans got wrong — traps, untrue claims, file lists
  that forbade the work they asked for — and the next plan from the same spec repeats
  those mistakes when its author has not read them.
- **Name the traps** — deliberately-failing steps, steps that are optional in some
  environments. Unflagged, an agent "fixes" them. A step *needing the developer* is not a
  trap to flag but a handover to build around — see the next bullet.
- **A step only the developer can perform stops the plan.** Naming it is not enough:
  "flagged" is satisfied by an executor that mentions the step and carries on, and then
  the work downstream of it is done against a thing that never happened. Publishing a
  page, creating an account or a credential, triggering a release, looking at a rendered
  document — an agent cannot do any of these, and a plan containing one is built around
  it:

  - **The task is the handover.** Not a step to work around, approximate with a
    placeholder, or record as skipped.
  - **It looks before it stops.** The plan names a check the executor can run that says
    whether the step has already been done — a secret listed, an address resolving, an
    install present. The executor runs it *first*. If it passes, the developer acted
    early: record that in the handover report and carry on without asking. A handover
    that stops unconditionally asks for work that may already be done, and the only
    reply available is "look".
  - **If the check fails, the executor prints what to do, where, and what done looks
    like** — specifically enough to act on without reading the plan.
  - **Then it stops.** It does not attempt the action, does not simulate it, and does not
    start any task that depends on it.
  - **On resumption it runs the same check again**, and proceeds on its result rather than
    the developer's word. Where the plan cannot specify such a check, it says so and says
    what to look for instead — and then the stop is unconditional.
  - **The handover and its outcome go in the handover report**, under Task completion —
    including the case where the check passed first time and nobody was asked.

  Manual verification is the case that arises most often, and there the developer's
  action *is* the deliverable: an executor that proceeds without it has skipped the only
  thing that was being asked for.

## A plan states which entries it completes

Every plan carries `## Delivers`: the catalog ids that become `shipped` when it merges,
or `None.` Completes, not touches — a plan that only advances work another plan will
finish lists nothing. The heading exists so delivery can be checked: a merged plan
whose Delivers ids stay unpromoted must fail the build.

## A plan names the checkouts it may touch

Every plan carries `## Repositories`: one row per checkout, its role — execute here,
execute here too, or do not edit — and where the work happens. A project set up by this
framework lives in one repository, so the table usually has one row: that repository,
execute here. A plan that also edits another repository — the framework's, in a flush —
adds a row for it, as does any repository the plan must leave alone.

Without that table an executor cannot tell a file it may change from a file that merely
looks related, and the failure is silent — it edits another checkout because the change
looked like part of the job.

The table has three columns, and they are these:

| Checkout | Role | Isolation |
|---|---|---|
| `the-project` | execute here | `git worktree add ../the-project-readme-shell -b plan/readme-shell origin/main` |
| `the-framework` | do not edit | |

A **do not edit** row leaves its isolation cell empty: nothing is created in a checkout
nobody may write to. The row still exists, because naming the checkout the plan must
leave alone is the whole point of listing it.

**Dispatch reads the directory as the first backticked span in the Checkout cell**
(`checkoutName()` in scripts/plan-binding.js). A backticked word earlier in the cell
sends the worktree to the wrong checkout, with no error. Put the directory name first,
and nothing in backticks before it.

**Isolation is a sibling worktree — `../` — never one nested inside the repository.**
The reason is not tidiness. A nested worktree that then gets its own dependency install
puts a second copy of every lint plugin on the resolution path; the linter finds two and
refuses to run at all, so the executor cannot satisfy its own merge criteria. A sibling
resolves one copy and is fine even after installing. Where an agent tool places an agent
somewhere nested and the executor did not choose the location, it cannot obey this — it
says so, and pins the plugin path instead of going without lint. A fresh worktree runs
the project's own setup before its suite, and never borrows the parent checkout's test
binary: that passes, and hides that the worktree was never set up.

Do not read `.claude/worktrees/` being skipped by `.tropis/guards/doc-currency.test.js` as
permission: that scan steps around a directory that exists in the wild so it does not
walk into another checkout's documents. Tolerating a directory is not endorsing it as a
plan's declared isolation.

**The table is checked, not merely required.** `.tropis/guards/plan-dispatchable.test.js` reads
every plan carrying a `## Repositories` heading and no handover report and fails the build on one that would be
refused at dispatch: a missing heading, no row anyone may edit, or isolation that is not a
sibling worktree. A plan with no such heading is not claiming to be dispatchable and is
skipped.

Two things about that check are deliberate and will look like bugs the first time they
bite. **The isolation cell is a command field, not a prose field** — a cell carrying a note
after the command does not match, and the error names a command that is sitting in the
table, reading as though the row were missing. And **the scan reaches the whole document**,
so a plan that merely quotes a worktree command it is not declaring — an example, a
reproduction, a fixture — fails identically. Where a plan must show a command it is not
declaring, say so under Traps.

Work happens in a worktree of each checkout, never in the directory the specifying session
is sitting in, or that session's files change under it mid-run.

## A measurement names its tool, version and platform

Every measurement a plan asks for, and every one a handover or review record reports —
what a fresh session received, whether a hook spoke, what a tool did — names the tool,
its version, and the operating system and architecture it ran on, such as macOS 26.2 on
arm64 (`uname -sm` and the system's version command give both). **Never the computer**:
not its hostname, not its model, not "the developer's laptop". A later reader needs the
platform to tell results apart, and nothing else about the computer; in a public
repository its name is personal information. That is a record, not a requirement: **a
plan never requires a particular install, path, version or platform**, and never tells
an executor to stop because one is absent. Any current install may run it, locally or
in a cloud session.

The record is what shows a difference between versions or installs when there is one.
A difference found that way is a finding about the framework: design around the
behaviour that varies, as wiring a hook once does (`harness-scripts.md`), rather than
pinning a version.

## Verification covers every checkout the plan edits

A plan with two execute-here rows needs verification commands for **both**. Naming a checkout
throughout the tasks is not the same as covering it: two plans listed commands only for the
first while their own tasks edited the second, so that suite was run by nobody until review
found it red.

Write the per-checkout commands into the verification task. Where a checkout has no runner
of its own, say which checkout's runner is pointed at it, and how.

## The File Structure table is a claim about the repository, not about the diff

The table is enforced: the pre-merge scope check rejects any file that is not in it. So
an incomplete table does not merely omit work — it **forbids** work the plan demands
elsewhere, and an executor told not to resolve contradictions will stall or improvise.

**The question to ask about every file the plan touches is: what is on the other side of
this?** Five answers, all of which have been got wrong here:

- **Something else claims a path you are deleting.** A catalog entry naming a module, a
  guard fixture, a hook test case, a generated document. One plan ordered a component
  deleted while forbidding catalog edits; a guard requires shipped module paths to exist,
  so the executor left a documented re-export shim rather than break one instruction to
  obey the other. It was right to.
- **Something else writes or reads a shape you are changing.** Widen a schema and every
  producer of that shape goes stale — commands, generators, fixtures, other callers. One
  plan made two catalog fields required and did not list the three commands that create
  catalog entries; the first use of `/idea` after it merged would have produced an entry
  that failed the build. **A schema nothing knows how to satisfy is worse than no schema.**
- **The kind of change owes a closeout.** Another plan changed a module boundary and left
  `docs/architecture.md` out of the table, so its executor correctly left the document
  stale and reported it.
- **A rule's source and the files written from it are one edit.** `npm --prefix
  .tropis run rules` writes `.cursor/rules/<area>.mdc` from a project's own
  `.claude/rules/<area>.md`; from a shipped text in `.tropis/rules/<area>.md` it writes
  both `.claude/rules/<area>.md` and the `.mdc`; and a change to
  `.claude/rule-areas.json` rewrites both files of every shipped rule it touches;
  `.claude/rule-additions/<name>.md` — plain text, no header, named after the shipped
  rule — is a source of that rule's `.claude/rules/<name>.md` and
  `.cursor/rules/<name>.mdc`. The additions follow the shipped text in the one rule
  each tool loads, and win where they contradict. Never edit the shipped text in
  `.tropis/rules/` or a generated file; write the additions file and run the command.
  `rules-generated.test.js` fails while they are out of date, so a plan changing a source
  must list **everything written from it**. Listing only the source forbids the
  regeneration the guard then demands, leaving the executor to break the suite or break
  the table. One plan did exactly that; the executor regenerated the projection and
  reported the table as wrong, which was the right call. `/dispatch` now refuses such a
  plan, and the plan checker fails it while it waits to run — but the table is yours to
  get right first.
- **An import you add is a shape you changed.** The bullet above reads as being about data
  — a schema, a record, a file format — so a plan that makes one module start importing
  another does not think to look. Every test that partially fakes the newly imported module
  goes stale at once, and those tests are almost never in the plan's table. One import
  invalidated twelve test files, none of them listed, forcing the executor to choose
  between an incomplete table and the work the plan demanded. It chose correctly and said
  so, and the review had to verify all twelve by hand.

**Before finalising the table:**

1. Grep for every path the plan deletes or renames.
2. For anything whose *shape* changes — a schema, a record, a function signature, a file
   format, **or a module's import surface** — grep for what produces it and what consumes
   it, including commands and generators, not only imports. Where the change adds an
   import, search for the tests that fake the module you now depend on.
3. Check the doc-closeout table for what this kind of change owes.
4. If the plan edits a rule's source — a project's own rule in `.claude/rules/`, a shipped
   text in `.tropis/rules/`, an additions file in `.claude/rule-additions/<name>.md`,
   or `.claude/rule-areas.json` — add the files the rules command writes from it: the
   `.cursor/rules/*.mdc`, and for a shipped rule or its additions file its
   `.claude/rules/*.md` too.
5. If the plan changes what someone developing the project is told about working with
   the framework, add the operator guide from the doc-closeout table. A plan does not
   patch the product's README; `/refresh-readme` keeps it current. The one exception: a
   plan that removes or renames a command, file or link the README names corrects that
   reference in `README.md`, and adds nothing else.

**An empty search is not evidence of absence until the same search is shown to find a
planted hit.** On some platforms (measured on macOS) `git grep -E` does not implement
`\b` and returns nothing rather than an error: `git grep -nE "\bcomplete\.md"` found
nothing in one project where `-P` found 4 and `-F` found 6. Use `-P` or `-F`, or an
explicit `(^|[^x])` guard, and plant a hit before trusting an empty result — in a plan,
a review or a rename check.

All of these belong in the table, or the plan is asking for something it also forbids.

## Decide two things per plan, independently

- **Model tier** — how much judgment does *executing* it need? Content specified
  verbatim can run on a small model however much thought went into writing it.
- **Merge authority** — self-merge when the criteria are mechanically checkable; parent
  review when correctness depends on context this session holds, or when the change is
  hard to reverse.

## Every plan ends with a handover report

The plan must instruct its executor to append `## Handover report` to the plan file and
commit it — **written to the branch, not printed in chat**, so the reviewer reads it from
the work rather than having it relayed.

Six sections, each earned by something that went wrong here:

- **Task completion** — every task done, or skipped with its reason.
- **Verification results** — for each check the plan required, the command **and its
  actual output**, and what ran it: the tool and its version, and the
  **operating system and architecture**, such as git 2.49 on macOS 26.2, arm64. Never the
  computer's name or model (*A measurement names its tool, version and platform*). Not
  "verified": the number, the failing test name, the byte count. A claim without its
  evidence cannot be reviewed. One plan reported all retained rules verified against a
  check that ran as written, passed, and was incomplete — two false rules shipped.
- **Scope** — the diff stat, confirmation every file is in the File Structure table, and
  the worktree path actually used in each checkout, so a reviewer can see whether
  isolation happened at all.
- **Judgment calls** — anything decided that the plan did not specify.
- **What the plan got wrong** — untrue claims about the code, steps that could not work
  as written, checks that could not fail.
- **Outstanding** — what the executor could not do and why, including anything only the
  reviewer or the developer can settle.

**Task completion is recorded here, and only here.** A plan preamble may tell an executor
to tick `- [ ]` checkboxes as it goes. Where the execution tooling tracks progress in its
own task list rather than by editing the plan file, no tick is ever written back — so a
merged plan with unticked boxes is the normal outcome, not a skipped step. Check which is
true of your tooling before reading anything into it, and do not add a check that demands
ticks unless you have confirmed something writes them.

> This paragraph exists because a framework review inferred abandonment from a count of
> ticks on the main branch, called the instruction "decoration", and recommended deleting
> it. The instruction was fine; the inference was measuring state the mechanism never
> produced.

## Who reviews, and who decides

State merge authority in every plan, and mean it:

- **The specifying session reviews** — it re-runs the plan's checks against the
  repository rather than reading their reported results, re-breaks each guard the plan
  added to see it go red, and confirms the diff matches the File Structure table. It is
  the one that can tell where the *plan* was wrong.
- **The developer decides** what the repository cannot settle, as a question with a
  recommendation.
- A **mid-plan gate hands back to the session**, which then puts the strategic question
  to the developer. Say so explicitly in the plan, or the executor will guess. A
  developer who answers a mid-plan gate directly, in the executor's session, tells the
  specifying session what they decided; otherwise it reviews finished work as unreviewed
  and may argue against a decision already made.

Full format and prompt template: `.claude/framework/dispatch.md`. Cycle and merge
sequence: `.claude/framework/workflow.md`.

## Every review leaves a record

A plan that has been reviewed carries `## Review record` at the bottom of its plan file,
below the handover report, written by **whoever merges it** and committed **before the
squash-merge**.

Usually that is the reviewing session. **Where a plan carries self-merge authority there
is no reviewing session, and the obligation does not disappear — it moves to the executor,
who writes the record as part of merging.** Say so in the plan when granting self-merge.

This is not ceremony for its own sake. `.tropis/guards/review-record.test.js` requires a record for any
plan whose handover report is on `main`, so a self-merge without one leaves the main
branch red — and not on the executor's own suite, which was green because its handover was
still on a branch. It surfaces on the next branch to rebase. That happened once, and the
sibling branch that caught it could as easily have merged first and buried it.

Five sections:

- **Checks re-run** — which of the plan's own checks the reviewer executed independently,
  with the command, its output, and the tool and version that ran it, on which
  operating system and architecture, never the computer's name. Not "verified": the
  number, the failing test name, the count. A reviewer who re-ran nothing says so, and
  says why.

  **Re-run the handover's diagnoses too, not only its figures.** A handover reports two
  kinds of thing: measurements, and explanations of what went wrong. Re-running the
  measurements is mechanical and gets done. The explanation arrives as prose, reads as
  authoritative because the numbers around it were right, and is the part most likely to
  be wrong — because it was written by the one party with no way to check it.

  A handover here reported that another tool loads this repository's hooks and fail-closes
  on their reply, and that this blocked its commits. Every figure in that report was
  re-run and every figure was correct. The diagnosis was not checked, and it was false in
  both halves: that tool reads a different configuration file, of which this repository
  has none, and its documentation states hook failure is fail-**open**. A bug was filed
  against work merged an hour earlier on the strength of it. **The symptom was real and
  the cause was invented** — which is the usual shape, and why the fix is to check the
  cause rather than to doubt the executor.

  The cost of checking is a grep. Ask what the diagnosis predicts should be true of the
  repository, and look.

  **Where the diagnosis is about how an external tool behaves, check it against observed
  behaviour — not against that tool's documentation.** A vendor document describes the
  configuration it intends; it is silent about what the product does with someone else's.
  An executor's direct observation of a named error message outranks it.

  This one has been got wrong in both directions on the same defect, hours apart. An
  executor reported that another tool was executing this repository's hooks and refusing
  its commands. That was checked against the tool's documentation — which describes hooks
  living in a file this repository does not have, and failure as fail-open — and declared
  false, with a bug filed against the correction. A later dispatch captured the refusal
  verbatim and it **named this repository's script by path**. The executor had been right,
  and the check that overturned it cited this very rule while reading the wrong source.
- **Found** — what the review turned up that the handover did not, including nothing.

  **A cause goes here only once it is verified. An unexplained symptom goes in
  *Outstanding disposition*.** Review is where someone reports "this looks wrong", and the
  temptation is to write the explanation in the same pass that merges the work, while it
  is still a hypothesis. It then reads as authoritative because the measurements around it
  were right, and correcting it costs a second branch for something that should have
  landed once.

  One review recorded a vendor field as unstable, routed it as a learning, and wrote it
  into user-facing documentation. It was the fourth of four hypotheses and it was wrong.
  So while a reported symptom is unexplained, either hold the merge, or merge and record
  it as unexplained with who is looking. Do not write a cause you have not tested, and do
  not route it as a learning — a learning is the most durable thing a review produces and
  the most expensive to retract.

  **In a public project** — one whose `.claude/project.json` says `"public": true` —
  *Found* opens with a line `Public exposure:` saying the diff was read for private
  material (people's names, customers, other projects' names or internals, home paths,
  hostnames) and what was found, or `nothing`. A guard knows only the names it was
  given; the reviewer is the one reader who sees every line before it lands on `main`.

- **Outstanding disposition** — every item in the handover's Outstanding section, each
  with either a catalog id or a reason for dropping it — the catalog rule's *What does
  not become an entry* says when dropping is right. An item with neither is not
  dispositioned. Two further things belong here: a criterion only the developer can
  observe, named with whoever must observe it, and any symptom reported after the handover
  was written that the review could not explain. This is the only section that carries an
  obligation forward.
- **Learnings routed** — for each finding that generalises beyond this plan, where it was
  written: a rule, an ADR, the blueprint queue, a catalog entry. Or an explicit statement
  that it was not, and why. **Review is the step most likely to find defects in the
  framework itself, and it was the only step with nowhere to put them** — one such
  learning went into a commit message, which is saved and never read. If nothing
  generalises, say so.
- **Merged because** — one sentence on why this was fit to merge, or what was fixed first.

**Why this exists.** Review was required by three documents and produced no artifact
anywhere: ten merged pull requests carried no review, and one plan merged with its
verification record still reading `<paste the run URL>`. Every step of this framework
whose output is committed happens reliably; every step whose output is not, does not.
