# Incidents behind rules/harness-scripts.md

Not delivered to any session: read on demand, from a pointer in
`rules/harness-scripts.md`.

## A guard that passed two silent failures

In the project this came from, two total, silent failures shipped in one hook script,
while the guard written to prove the script worked passed against both of them.

## Where the hook reply table was measured

The reply table was measured on 2026-10-09 in the project this framework came from, with
the probe script the rule names, against the Claude Code and Cursor versions in its
header.

## A hook change measured in a subagent

That a subagent loads its own start, and so misses a hook changed after its parent
session began, was measured on 2026-10-09 in Claude Code, in the project this came from.

## A heredoc that ran one hook four times

In desktop Claude Code 2.1.293, on 2026-10-10, a heredoc followed by another command ran
a script wired four times, under four `if`s, four times. On the same version a loop ran
the hook once, so a loop is not known to be one of the shapes it cannot parse.

## A script that unset its own git config

One framework script set both git config variables on every git call it made. Its tests
passed only because each temporary repository set its own identity, and review caught
it before merge.
