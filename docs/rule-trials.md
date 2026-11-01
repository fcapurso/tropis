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
