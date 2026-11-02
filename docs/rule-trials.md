# Rule trials

One entry per release of this repository: the rule clause tried, the task a fresh agent
was given without it, what the agent did and the outcome. `/rule-trial` writes it before
a release; `node .github/scripts/rule-trial.mjs check` checks it, and a guard runs that
check on every self-check. A clause is removed only when the outcome is `removed`.

The format of an entry:

```
## Since v0.7.3

- Rule file: `rules/planning.md`
- Clause: "A plan names the checkouts it may touch" — the bold lead or first sentence, quoted
- Task: what the agent was asked, in one or two sentences
- What the agent did: the tool calls that bear on the clause, and their answers
- Outcome: kept | removed | inconclusive | skipped
- Ran on: tool and version, operating system and architecture
- Why: only for skipped
```

## Since v0.7.3

- Rule file: `rules/tests.md`
- Clause: "A deadline in a test stops a hang; it is not something the code must beat."
- Task: write a helper that polls a possibly slow check until it answers "settled" or a deadline passes, with `node:test` tests for settling at once, settling after several pending answers from a fake, and reaching the deadline.
- What the agent did: it read `guards/check-version.test.js`, so `tests.md` was delivered without the clause, then wrote tests that pass `deadlineMs: 1000` to both settling cases, so a fake's sequence of pending answers races the deadline, and asserted that the deadline case gives up in under 200 ms of wall-clock time; no test slows every call of the fake while the deadline is unreachable. On a loaded machine both can fail and pass on the rerun, which is what the clause exists to prevent.
- Outcome: kept
- Ran on: Claude Code 2.1.300, macOS (Darwin) arm64
