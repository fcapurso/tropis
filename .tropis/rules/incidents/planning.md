# Incidents behind rules/planning.md

Not delivered to any session: read on demand, from a pointer in `rules/planning.md`.

## Untrue claims that cost review rounds

A plan that asserted something untrue about the repository has cost a review round more
than once.

## Three checks that could not pass

Three checks written for one plan, the first-adopter-harness plan of 2026-08-12 on the
blueprint's technology scope, could not pass, and each was caught only by the agent
running it: a search for a phrase the plan itself wrapped across two lines, a listing
the backlog command withholds until something has shipped, and a count of zero for a
string that the replacement text the plan authorised contains.

## A plan written by doing the work

One plan was written by doing the whole change on a throwaway copy to measure exact
figures for its checks, and was then dispatched to an executor who did it again.

## Two plans that verified one checkout

Two plans listed verification commands only for the first of their checkouts while
their own tasks edited the second, so that suite was run by nobody until review found
it red.

## A shim left for a deleted component

Each of the five answers in the File Structure section has been got wrong here. One
plan ordered a component deleted while forbidding catalog edits; a guard requires the
modules of a shipped entry to exist, so the executor left a documented re-export shim
rather than break one instruction to obey the other. It was right to.

## Two required fields and three commands

One plan made two catalog fields required and did not list the three commands that
create catalog entries; the first use of `/idea` after it merged would have produced an
entry that failed the build.

## An architecture document left stale

Another plan changed a module boundary and left the architecture document out of its
File Structure table, so its executor correctly left the document stale and reported it.

## A plan that forbade its own regeneration

One plan listed a rule's source and not the files the rules command writes from it. The
executor regenerated the projection and reported the table as wrong, which was the right
call. The refusal in `/dispatch` and the plan checker came after.

## One import and twelve test files

One import invalidated twelve test files, none of them listed, forcing the executor to
choose between an incomplete table and the work the plan demanded. It chose correctly
and said so, and the review had to verify all twelve by hand.

## An empty grep on macOS

`git grep -nE "\bcomplete\.md"` found nothing in one project where `-P` found 4 hits
and `-F` found 6.

## What earned the handover sections

Each of the six sections was earned by something that went wrong here. Verification
results is one: a plan reported all retained rules verified against a check that ran as
written, passed, and was incomplete, and two false rules shipped.

## Ticks read as abandonment

A framework review inferred abandonment from a count of ticks on the main branch, called
the tick instruction "decoration", and recommended deleting it. The instruction was
fine; the inference was measuring state the mechanism never produced.

## A self-merge with no review record

A self-merged plan with no review record left the main branch red once. The sibling
branch that caught it could as easily have merged first and buried it.

## A diagnosis false in both halves

A handover here reported that another tool loads this repository's hooks and
fail-closes on their reply, and that this blocked its commits. Every figure in that
report was re-run and every figure was correct. The diagnosis was not checked, and it
was false in both halves: that tool reads a different configuration file, of which this
repository has none, and its documentation states hook failure is fail-open. A bug was
filed against work merged an hour earlier on the strength of it. The symptom was real
and the cause was invented.

## A tool diagnosis got wrong both ways

Got wrong in both directions on the same defect, hours apart. An executor reported that
another tool was executing this repository's hooks and refusing its commands. That was
checked against the tool's documentation, which describes hooks living in a file this
repository does not have and failure as fail-open, and declared false, with a bug filed
against the correction. A later dispatch captured the refusal verbatim, and it named
this repository's script by path. The executor had been right, and the check that
overturned it cited this very rule while reading the wrong source.

## The fourth of four hypotheses

One review recorded a vendor field as unstable, routed it as a learning, and wrote it
into user-facing documentation. It was the fourth of four hypotheses, and it was wrong.

## A learning left in a commit message

Before the review record had a *Learnings routed* section, one learning a review found
went into a commit message, where it was saved and never read.

## Ten pull requests with no review

Review was required by three documents and produced no artifact anywhere: ten merged
pull requests carried no review, and one plan merged with its verification record still
reading `<paste the run URL>`.

## A handover that broke the check it reported

In this framework an executor ran the self-check, saw it pass, then committed its
handover report and pushed. The report quoted a variable name the private-material check
reads as a hostname, so the pushed branch failed the check the report said had passed.
Review caught it on its own run.
