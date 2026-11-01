# Dispatching a plan
<!-- layer: framework -->

Every plan is handed over with the **thin prompt `/dispatch` prints**, not a prompt
written by hand and stored with the plan. Never dispatch by saying "execute this plan"
and leaving the agent to infer the rest, and never by writing a reading list from memory.

A prompt written by hand is a second copy of what the plan says, and two copies drift:
the plan is corrected during review, the stored prompt is not, and the executor reads the
prompt first. The plan is self-contained, so the prompt points at it and carries only
what the plan cannot.

## Prompts are vendor-agnostic

**State the capability a plan needs, never the vendor.** Model tier, tool access, and
whether a human must be available are legitimate requirements. "Use Claude" is not,
except in the one case below.

You will not always know which tool ends up running a prompt, and the mechanisms that
deliver context differ between them — how rules are loaded, entry-file names, and slash
commands are all tool-specific, and **they fail silently**. So the prompt tells the
executor to read the whole plan before starting, rather than relying on anything to
inject it.

**The one legitimate exception:** verifying tool-specific behaviour — does the hook fire,
does a fresh session in *this* tool orient correctly. That is a review activity and
belongs with the parent session. It is never a constraint on the executor.

## What the prompt carries

- **The dispatch header:** the plan's model tier, what it requires, and its merge
  authority; today's picks for that tier from the project's `docs/model-picks.md`, and
  the date they were last verified — with a warning when they are older than ~45 days,
  because picks change and the tier does not. Each field is read to the end of its
  paragraph, and a field that is there but reads empty stops the dispatch, naming its
  line. A project with no picks file is told to run `/refresh-model-tiers`; the prompt
  never invents picks.
- **The plan and its checkouts:** which plan, and which checkouts it may edit.
- **Attaching the other checkouts:** when the plan isolates in more than one checkout, a
  step before isolating tells an executor whose session started with only this one — a
  cloud session does — to attach and clone each other checkout beside it under the
  directory name the table gives.
- **Isolation:** one command that creates every worktree the plan's Repositories table
  names, each in the checkout its row names. It refuses to cut a worktree of this
  checkout from a commit that does not hold the plan, and notes one that is not on the
  remote's main branch. The raw commands are listed beneath it, labelled as not to be
  run by hand — from one checkout they would all land in that one.
  Then what each worktree needs before its suite can run: the commands in that
  checkout's `.claude/worktree-setup.txt`, in order, or `npm --prefix .tropis ci` where
  the checkout has no such file. The file is the project's — one command per line, `#`
  for a comment — and an update never touches it. It replaces the framework's install
  rather than adding to it, so list that install in it too when the checkout needs it.
- **Verification in every checkout,** when the plan edits more than one.
- **An instruction to read the whole plan first.**

Everything else — traps, prohibitions, what to report, how to merge — is on the plan,
under its headings, and is not repeated.

## Handing over in chat

From the project root, run `npm --prefix .tropis run dispatch -- <plan-path>` and paste
what it prints into a **new** session.

**If it exits non-zero, the plan is not dispatchable.** It prints nothing to paste and
names each problem — a missing heading, a header field that reads empty, no checkout
anyone may edit, or isolation that is not a sibling worktree. Fix the plan; do not write a prompt by hand instead. The rules it
applies live in one module, `plan-binding.js`, which the plan-dispatchable guard reads
too, so a plan the guard accepts is a plan the command accepts.

If the picks are stale or missing the prompt says so.
`/refresh-model-tiers` is a separate step.

## Rules

- **A dispatched plan states which catalog entries it completes** (`## Delivers`), or `None.`
- **Name the traps on the plan,** under its **Traps** heading. A deliberately-failing
  intermediate step, a guard that must be observed failing, a step needing the developer
  — say so, or the agent will "fix" it.
- **A verification step must test every claim the plan retains, not a sample.** One plan
  kept three rules and verified two of them; both untested claims turned out false. The
  agent ticked the box honestly, because the check as written passed. An incomplete
  verification is worse than none — it manufactures confidence.
- **Say what to report, not just that it failed or passed.** A parent-review handover is
  only useful if it carries the evidence the review needs.
- **Re-run the full merge criteria after rebasing**, never just the suite. A clean rebase
  can still invalidate a criterion — new files move coverage figures and can turn another
  plan's guard red.
- **Put the prohibitions under Global Constraints.** Anything the plan rules out —
  lowering a threshold, adding a dependency, touching files outside the repository —
  goes there, where the prompt's instruction to read the whole plan reaches it.
