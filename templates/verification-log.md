# Manual verification log

Outcomes of checks only a person can perform. Every entry names its kind; the kinds this
project uses are listed in `.claude/commands/manual-check.md`.

A check that is not recorded did not happen — including the ones that passed and the ones
that were skipped. Each entry is written **before** anyone runs it, with the result
`pending`, so a check nobody came back to is visible rather than forgotten. Drafted and
recorded through `/manual-check`. Newest first.

## Entry template

```markdown
### YYYY-MM-DD — <what was checked> (<kind> | <kind> + <kind>)

- **Change:** `plan/<branch>` at `<short sha>`, <where it runs>
- **Pre-conditions:** <what must exist before step 1>

| # | Step | Expected |
|---|---|---|
| 1 | <action> | <what the person should see> |

- **Result:** pending · pass · fail — step N: <what was seen instead> · skipped — <why>
- **Notes:** observed by <who>; anything unexpected
- **Closes:** `<catalog id>` — "<criterion text>" · or none

#### Round 2 — YYYY-MM-DD — <what changed since round 1>

<same fields; earlier rounds are never edited>
```

## Entries
