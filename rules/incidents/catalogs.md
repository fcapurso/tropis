# Incidents behind rules/catalogs.md

Not delivered to any session: read on demand, from a pointer in `rules/catalogs.md`.

## An entry promoted and called unshipped

Got wrong in both directions on one plan. Its executor left the entry short of
`shipped`, then promoted it while writing the review record to keep the branch green,
and the record's own summary two sections below still said the entry was not being
shipped on an unbacked criterion. The check had in fact been run and reported in
conversation. Nothing wrote it down, so three separate records said outstanding while
the developer believed it closed.

## Two entries filed for one shipped entry

In the five days to 2026-10-20 the backlog this came from gained 49 entries and shipped
21. One review filed two entries for a single shipped one: a warning that was wrong only
before setup's own commit, and a gap the reviewer had already filled by hand. Both were
dropped the same day.

## A guard defect left on a task card

In the framework's own repository, before the rule was written, a guard defect was
raised as a background task card instead of a backlog entry, where neither the backlog,
its report nor its board could see it.

## A refresh taken straight to a branch

In the framework's own repository, before the rule was written, defects found by a
model-tier refresh were taken straight to a branch and then a plan, until the developer
had asked twice where the entry was.
