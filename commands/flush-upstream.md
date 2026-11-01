---
description: Sit down with the operator, decide each upstream queue entry, and draft a plan that submits the flushed ones to the framework as pull requests
---

This is a **specifying** pass, and it is the sitting itself. It checks that a flush can
reach the framework, goes through the queue with the operator one entry at a time, and
drafts a plan whose decisions are already written. It submits nothing: the plan's tasks
do, after `/dispatch`.

What goes upstream is decided by a person, before dispatch: whether a lesson still says
something once this project's vocabulary is stripped out is a judgment no check can make.
Nothing in this command, and nothing in the plan it drafts, automates that decision.

## Do

1. **Preflight.** Run `bash .tropis/scripts/submit-upstream.sh preflight .`. It exits
   0 and prints the framework repository as `OWNER/NAME` when a flush can reach it. On a
   non-zero exit, show its line and stop: nothing is drafted.

   Then read `Flushes as: <name>.` from the queue's header (`docs/BLUEPRINT-UPSTREAM.md`).
   Whenever you ask for or propose a name, say these two sentences to the operator, word
   for word:

   > This name is how the framework's maintainer knows this project across flushes, and it
   > is public in every branch, commit and pull request a flush opens. Never change it: a
   > new name reads as a new project, and the maintainer loses its history.

   If the line is missing, in this order:
   1. Ask whether this project has flushed before, or is already named in the framework's
      records (a pseudonym in its decisions, catalog or release notes, such as the one the
      framework uses for its first adopter). If so, propose that name.
   2. Otherwise propose the name `bash .tropis/scripts/submit-upstream.sh suggest-name`
      prints.
   3. Never propose a name derived from the folder, the repository or the product.
   4. Whatever name the operator settles on, run
      `bash .tropis/scripts/submit-upstream.sh check-name OWNER/NAME <name>`, with
      `OWNER/NAME` from the preflight. On a non-zero exit, show its line and ask for
      another name. Only once it exits 0, write the line below `Last flushed`, and the two
      sentences above on their own line directly below it, before going on. Create the
      queue's header if the file has none. The sentences go on their own line because the
      script reads the whole rest of the `Flushes as:` line as the name. The name is
      lowercase letters, digits and hyphens, starting with a letter or digit.

   If the line is there, run `check-name` on it too, every sitting: another account may
   have started using it since. If the queue lacks the two sentences, add them below the
   line. If `check-name` refuses, stop the sitting and tell the operator: changing an
   existing name is theirs to decide, against "never change it".
2. **Read the queue** (`docs/BLUEPRINT-UPSTREAM.md`) and list every entry verbatim, with
   all its parts, and any note written under it.

   The queue is one inbox and its entries do not say which kind they are — deliberately,
   so nothing goes unwritten because its author could not decide. Step 4 says which kind
   each entry is, and why.
3. **Clone the framework's current `main`** into a temporary directory
   (`gh repo clone OWNER/NAME <tmp> -- --depth 1`, with `OWNER/NAME` from the preflight)
   to look at it as it is, not as it is remembered. Read its decisions record,
   framework/DECISIONS.md, before advising on any entry. Delete the clone when the
   sitting ends; the plan's tasks make their own.
4. **Put each entry to the operator, one at a time, with all its parts.** For each
   entry, give:
   - the entry itself, with all its parts;
   - whether it is **a lesson** (prose already true here, which travels as prose) or
     **a capability** (a command, a guard, a script, a fixture, which is a build and not
     a copy), and why. An entry you cannot classify is one whose author did not say
     enough; say so rather than guessing;
   - what already exists in the framework that it would land on, duplicate or conflict
     with, citing a decision record where one applies;
   - a recommendation.

   Then ask: **flush, hold, or decline.** Wait for the answer before the next entry. A
   part is flushed, held or declined only with its entry; a part the operator wants to
   decline alone is first split into its own entry.
   - **Flush, a lesson:** agree the exact words and where they land (file and heading).
     Where the words name a file of the framework's own, such as one under scripts/,
     write it as plain text, not in backticks: the framework's integrity guard reads a
     backticked path in shipped text as a file every set-up project must contain, and
     the submission's self-check fails.
   - **Flush, a capability:** shape the entry with the operator — id, title, type,
     value, acceptance criteria, `layer: product` — in the framework's catalog format. If
     it cannot be shaped now, it is held, and marked "waiting to be shaped".
   - **Before moving to the next entry, for either kind of flush:** show the operator the
     text as it will be sent — the entry with anything of the project's own taken out: its
     files, paths and names, its product and customers, and figures the point does not
     need — and get their approval of that text. The plan's `## Decisions` records the
     approved text for each flushed entry.
   - **A reworded entry:** when the operator rewords an entry in the queue itself, say that
     any project file naming that entry by its wording — a comment, a plan, a catalog
     reference — must be changed to match in the same commit, or it no longer points at
     anything.
   - **Hold:** ask what it waits for.
   - **Decline:** ask why.
5. **Draft the plan** under `docs/superpowers/plans/`, named
   `YYYY-MM-DD-flush-upstream.md` with today's date, with the decisions written in. It
   has:
   - `## Delivers` — `None.`
   - `## Repositories` — one row: this project, `execute here`, in a sibling worktree.
     Say in prose, outside the table, that the framework is reached by a temporary clone
     inside a task and is not a row. The sibling-worktree isolation is written once, in
     that row's isolation cell, in the form the plan format gives; nowhere else in the
     plan quotes it.
   - `## Global Constraints` — submit only the entries decided *flush*; one pull request
     per entry; never merge one; never push to the framework's `main`.
   - `## Traps` — at least: sibling pull requests that each add a catalog entry will
     conflict at the end of the file, and that is the maintainer's to resolve.
   - `## Decisions` — every entry with its answer, its reason, and the agreed wording or
     entry.
   - **One task per flushed entry.** The task:
     - clones the framework's current `main` afresh into a temporary directory;
     - creates the branch `upstream/<flush name>/<flush-date>-<entry-slug>`;
     - makes the edit, or appends the entry;
     - commits with a body that quotes the approved text from the plan's Decisions, not
       the queue line, with all its parts, and names
       the project by its flush name, and by nothing else — not its folder, repository
       or product name;
     - runs the framework's own check, bash scripts/check-blueprint.sh, in the clone and
       pastes its result. If it fails, the task stops there: no pull request is opened
       for that entry, and the drain task keeps the entry in the queue with the failure
       as its note;
     - writes the pull request body (the approved text from the plan's Decisions, not the
       queue line, with all its parts, why it is
       portable, what the project already does) to a file, naming the project by its
       flush name and by nothing else — not its folder, repository or product name;
     - before running `open`, reads its commit message (`git log -1 --format=%B`) and its
       pull request body file for anything of the project's own — its files, paths and
       names, its product and customers, figures the point does not need, home paths and
       hostnames — as the exposure check does for the project's own pushes. If it finds
       any, it stops for the operator: no push and no pull request for that entry, and the
       drain task keeps the entry in the queue with that as its note;
     - runs
       `bash <project-root>/.tropis/scripts/submit-upstream.sh open <project-root> OWNER/NAME <branch> <title> <body-file>`
       from inside the clone, where `<project-root>` is this project's absolute path — the
       clone has no `.tropis/` or queue of its own; the script reads the flush name from
       the project's queue and refuses a branch not under it — and records the URL it prints;
     - deletes the clone.
   - **A drain task**, in the project, after the last submission. It removes each
     submitted entry and each declined entry from the queue; keeps each held entry with
     its note; sets `Last flushed` to the flush date; and writes, in the plan's
     handover, a table of every entry and what became of it — the pull request URL,
     *held*, or *declined* with the reason.
6. **Say that `/dispatch` is the next step**, and that the pull requests are reviewed
   and merged in the framework repository by its maintainer, not by the plan.

## Do not

- Merge a pull request.
- Push to the framework's `main`.
- File an issue.
- Work in an existing clone of the framework. Clone afresh, every time.
- Submit a capability without acceptance criteria.
- Decide an entry without asking the operator.
- Run `/dispatch`.
