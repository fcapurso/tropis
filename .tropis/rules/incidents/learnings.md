# Incidents behind rules/learnings.md

Not delivered to any session: read on demand, from a pointer in `rules/learnings.md`.

## Three lessons left in commit bodies in one day

Got wrong three times in one day in the project this came from: a file-list lesson, an
environment note, and the evidence for a framework boundary each went into a commit
body, and each time the developer had to ask before it moved to where it would be read.

## A silent hook that took the rule layer to zero

A hook that emitted nothing, and so looked exactly like one that worked, is the shape of
the defect which once took the entire rule layer to zero.

## A fresh-agent check on an in-flight state rule

That the codebase competes with a rule, and wins unless the rule names the exception,
was verified by a fresh-agent check in the project this came from, on a rule requiring
an in-flight state for every backend call.
