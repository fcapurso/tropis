# A product's README stays current — design

**Date:** 2026-10-20 · **Status:** approved by the developer on 2026-10-20
**Catalog entry:** `product-readme-is-kept-current`, reshaped from this document
**Replaces:** the approach of the two abandoned plans of 2026-10-20 (PR fcapurso/tropis#110,
closed unmerged), which made every plan patch the README and checked that at dispatch.

## Intent

Someone who has just found a project — any project set up with Tropis, and Tropis itself —
reads its README to decide whether it is for them, whether to use it or fork it, and then
how to start and how it works. That page should be complete, correct and readable at the
moment they read it, without anyone having to remember to update it.

The developer's goal, in their words: *"a tested mechanism for the README.md to stay up to
date, and that the same mechanism applies to Tropis itself as well as to any other project
using it."*

### Why the earlier approach was dropped

- **Patching per plan accrues.** Each plan adds a sentence; nobody rewrites the page; it
  becomes a pile of additions.
- **A check at dispatch can be bypassed.** Work built without `/dispatch` never meets it.
- **No automatic check can judge a README.** It can confirm the facts the page names still
  exist. It cannot tell whether the page is complete, means what it says, or reads well.
  That needs a writer (an agent) and a reader (the developer).

## The reader

Someone who has just discovered the project. They read in three passes, and the page
follows that order:

1. **Should I care?** What it is, what it does for me, who it is for and who it is not for.
2. **How do I start?** The shortest path to a first success.
3. **How does it work, and what is daily use like?** An overview that links to the deeper
   documents rather than copying them.

It ends with **where it stands** (what works today, known limits) and **where to go next**
(deeper documents, how to contribute, licence).

## Goals

1. Every set-up project and Tropis itself use one mechanism, configured per project.
2. The README is rewritten as a whole page, section by section, from what the project
   already records — never patched one change at a time.
3. Nothing is committed to the README without the developer's yes.
4. The project decides how much Tropis does, down to nothing at all.
5. Someone is told when the README has probably fallen behind, without waiting for a
   release.

## Non-goals

- Judging prose automatically. The automatic part checks facts only.
- Generating the README deterministically. An agent writes it; the skeleton guides it.
- Changing the operator guide (`.tropis/README.md`, about working with the framework).

## Anti-goals — a failure even if it works

- Overwriting a page someone manages by hand, or surprising a project that already had a
  README when it adopted Tropis.
- A README that grows by accretion.
- Nagging a project that chose to manage its README itself.
- A check that only fires on one path through the workflow.

## How it works

### The skeleton

Tropis ships a default skeleton: a short file listing the README's sections in order. For
each section it says what the section is for, where its facts come from, and roughly how
long it should be. A section may instead hold **fixed text**, copied into the README word
for word (Tropis's "What is Tropis?" ship's-keel story is such a section).

The default skeleton's sections, in order: what it is · what it does for you · who it is
for and not for · getting started · how it works · using it day to day · where it stands ·
where to go next. A skeleton may drop sections; the default keeps this order.

**The project may have its own copy.** If it does, Tropis always uses it, and updates never
touch it, as with every other file a project owns. If it does not, the project follows the
default, including later improvements to it. When the default changes and a project has its
own copy, `/update` says so, so the project can decide whether to bring anything over.

### Where the facts come from

`/refresh-readme` reads what the project already records: the project brief
(`docs/project-brief.md` — what it is, who it is for), the shipped catalog entries (what it
does), the installed commands and scripts (how to use it), and the decision record (why).
For Tropis, its own source folders and `RELEASES.md` as well.

### Three levels, chosen by the project

| Level | `/refresh-readme` | Nudge | Step in `/release` |
|---|---|---|---|
| **Tropis writes it** | rewrites out-of-date sections from the skeleton | on | on |
| **Tropis suggests** | reports what is missing or out of date; never edits | on | on (report only) |
| **Manual** | if run by hand, reports only; never edits | off | off |

At the *writes* level the skeleton is the source and the README is the result: a refresh
may rewrite any section it judges behind, hand edits included, though each rewrite is shown
and needs a yes. Anything that must stick goes in the skeleton. A project that wants the
README itself to be the source picks *suggests* or *manual*.

The level and the point the README was last refreshed are recorded in a small file the
project owns. The level is set:

- **at setup** — `/bootstrap` asks, defaulting to *writes* for a new project and to
  *suggests* when the repository already had a README;
- **by the command** — `/refresh-readme` given a level records it and does nothing else;
- **for projects set up before this** — the first `/update` that brings this in asks once.
  Until someone answers, `/refresh-readme`, the nudge and the `/release` step behave as at
  *suggests*.

### How a section is judged out of date

By the agent, not by code. It reads each README section against the skeleton's job for it
and the facts that section draws on, paying most attention to what has shipped since the
refresh point. The refresh point is one commit for the whole page; nothing is tracked per
section. With no refresh point yet, every section is a candidate. A README whose sections do
not match the skeleton — a project moving to *writes* from another level — is restructured
to the skeleton on its first refresh, each section still shown and approved.

### `/refresh-readme`

One command, run on its own, from `/release`, or from anything else later. Its options:

- **no option** — refresh according to the project's level;
- **a level** — record that level and stop;
- **skeleton** — copy the default skeleton into the project for editing, or rewrite it with
  the developer in conversation.

A refresh at the *writes* level:

1. Refuses to start on a working tree with uncommitted changes.
2. Rewrites, in `README.md`, each section the skeleton and the recorded facts say is out of
   date, as a whole section. Fixed text is copied as written.
3. Lists in chat each changed section with one line on why ("Commands you will type: added
   `/update` and `/release`, shipped since the last refresh").
4. Waits while the developer reads the page and edits it if they like.
5. On yes, commits once, naming what was brought up to date, and records the refresh point.
   On no, restores the page exactly as it was.

No branch: the README cannot change how an agent behaves, so like other documentation it
may go straight to `main`.

### Between refreshes: no mechanical check

*Revised 2026-10-21, by the developer.* This design first had a fact check in every project's
checks: every slash command, link and path the README names must exist. Built and reviewed
(PR fcapurso/tropis#115, closed unmerged), every rule it used either raised false alarms on
ordinary READMEs — a web route, a MIME type, a branch name read as a missing command or path —
or was dropped, until only broken links were left. That is not worth a check in every project,
an exception list and its edge cases, and no check can tell whether a README is complete or
readable anyway. Between releases the README is kept honest by judgment, not by a check:

- **at every merge**, the workflow's doc-closeout step: a change that makes something the
  README names stop existing corrects that reference and adds nothing;
- **the nudge**, when features have shipped since the last refresh;
- **at release**, the whole-page refresh, read by the developer.

### The nudge

At the *writes* and *suggests* levels, `/next` and the backlog board say when the README
was last refreshed and how many catalog entries have shipped since, naming them. Only
entries of `layer: product` and `type: feature` or `improvement` count: bugs, chores and
spikes rarely change what a newcomer is told — for
example *"README last refreshed 3 weeks ago; 5 features shipped since. Run
`/refresh-readme`."* Shipped-since is the difference between the catalog at the recorded
refresh point and now. Nothing is shown when nothing has shipped since.

### In `/release`

At the *writes* and *suggests* levels, `/release` runs `/refresh-readme` before it drafts
the notes, so a release is not cut from a README behind what it ships without someone
deciding so. If the refresh does not come back clean — the developer declines a rewrite, or
at *suggests* it reports gaps — `/release` lists what is behind and asks whether to release
anyway. It never stops on its own and never goes ahead silently.

### The workflow's closeout table

Its row for the framework's own README ("alters what an adopter is told … the blueprint
`README`") is replaced by one that says the product's README is kept current by
`/refresh-readme`, not by each plan. FW-006 is superseded in that part.

## Tropis itself

Tropis uses the same mechanism at the *writes* level with its own skeleton, which carries
the ship's-keel story as fixed text. Tropis's skeleton and settings file are part of this
work, since they are data; its first refresh, and the review of that rewrite, happen after
Tropis takes the release, when it has the command. Its `readme-usable` guard is kept as it
is for now: it asserts things only Tropis needs, and it runs since PR fcapurso/tropis#111. Tropis gets all of this only when it
takes the release that contains it; until then its sessions run the installed v0.3.1. That
lag is known and accepted.

A first refresh of today's Tropis README would, for example, find: "What it gives you"
lists four jobs and misses taking a release with `/update`, releasing, the backlog board
and checks only a person can do; "Commands you will type" lists 7 of 13 commands; "What is
here" describes an older layout; and there is no "who it is not for" or "where it stands".

## Decided with the developer

- The reader and the three passes, as above.
- One mechanism for every project and Tropis; project data overrides Tropis's defaults.
- Three levels; *manual* means Tropis stays out entirely, and `/refresh-readme` run by hand
  only reports.
- The level is an option of the command and a question at setup.
- Review flow: rewrite in place, explain per section, commit only on yes, restore on no.
- A shipped skeleton the project may copy, change or rewrite, as an option of the command.

## Calls made by the specifying session

- The default level is *writes* for a new project and *suggests* for one that already had a
  README; unanswered existing projects are treated as *suggests*.
- Fixed passages live in the skeleton, so the README carries no markers.
- The refresh point and level live in one small file the project owns, under `docs/`, beside
  its other project data.
- A section is judged out of date by the agent, against one refresh point for the whole
  page. A refresh at *writes* may therefore rewrite a hand-edited section, always shown and
  approved first.
- The nudge counts only shipped `product` entries of type `feature` or `improvement`.
- When the refresh in `/release` does not come back clean, `/release` lists what is behind
  and asks whether to release anyway.
- Tropis's skeleton and settings are part of this work; its first refresh comes after
  Tropis takes the release. `readme-usable` stays.
- The specifying session reshapes `product-readme-is-kept-current` from this document once
  it is approved: one entry; if the work is split into several plans, only the last one
  delivers it.

## Left to the builder

- File names and formats for the skeleton and the settings file.
- For Tropis, a slash command counts as existing if it is installed or in its `commands/`
  source folder, since Tropis's README names commands before Tropis installs them.
- How `/release` orders the refresh commit and the notes commit, provided the release is
  cut from a committed and pushed README.
- How the work is split into plans.

## Traps already known

- A guard installed into `.tropis/guards/` resolves the project root two levels up; the
  plans guard uses three and would point above the project. Check the root of any guard
  before installing it.
- The self-check runs guards on a fixture project, not on Tropis; the framework's own pages
  are covered only by the explicit list added in PR fcapurso/tropis#111.
