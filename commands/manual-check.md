---
description: Draft a check only a person can perform, write it to the log, wait, and record the outcome
---

Some things only a person can confirm: output looked at, a screen clicked through, a
flow followed end to end. This command drafts such a check, writes it to
`docs/verification-log.md` **before** anyone runs it, waits, and records what they
found. Run it at handover 3 of the workflow — when the branch is runnable and the
reviewing session tells the developer what to look at — or after a fix, when it adds the
next round to the same entry.

**Delete this command and the log if nothing the project produces needs a person to look
at it.** A ceremony with no subject reads as though someone decided it applied.

## 1. Decide the kind

From the diff, state which kinds apply and why. Do not ask.

<!-- project-owned: begin — this project's kinds of check. -->
<!-- Replace the two examples
     with your own: what each kind is, what in a change triggers it, and where its full
     procedure lives. -->
- **Output** — anything that can change what the project produces for a person to look
  at: a rendered document, a generated file, printed or played output. Where it is
  produced more than one way — two engines, two devices, two formats — and the change
  touches what they share, **every one of them is required**; say so rather than asking.
  Procedure: `docs/playbooks/<kind>-verification.md`.
- **Screen** — anything a person sees and clicks through in the running application.
<!-- project-owned: end -->

- **Both** — one entry, both kinds, one steps table.
- **Neither** — say so and stop. No entry is written; the review record states that the
  change has nothing a person needs to check.

## 2. Draft the steps

Numbered steps, each an action and the result the person should see — specific enough
that someone who did not write the code can follow it without guessing. Not "check it
looks right" but "on page 2 the footer's third line is present, on both engines". Derive
each step from what the change could plausibly break, and for a change to something
shared, include what the procedure lists as fragile.

State the pre-conditions: where it runs, which commit must be there, what data must
already exist. Offer the cheapest route that is faithful enough — a local harness instead
of a paid service, a simulator instead of a device — and say when it is not.

## 3. Write the entry before anything is run

Read the log; do not infer from context:

```bash
grep -n "plan/<branch>" docs/verification-log.md || echo "NEW"
```

- **`NEW`** — add an entry under the log's last heading, newest first, from the template
  at the head of the file, with the kind in the heading and `Result: pending`.
- **Found** — this is a re-check after a fix. Add `#### Round N` under the existing
  entry, N one more than the last round there, saying what changed since the previous
  round. Do not edit earlier rounds.

Show the entry, then stop.

## 4. Wait

Ask the developer to run it. Do not assume, do not proceed on silence, and do not run the
steps yourself — the developer's observation is the deliverable, and a result written
without it is the false record this log exists to prevent.

## 5. Record

Replace `pending` with one of:

- `pass`
- `fail — step N: <what was seen instead>`. Note whatever the procedure says to keep — a
  debug file, a screenshot — before anyone fixes anything. A fail is not yours to fix
  from here: return to the developer, and when the fix has landed run this command
  again.
- `skipped — <why>`, if the developer declines. A missing entry is indistinguishable
  from a forgotten one; a skipped one is a decision.

## 6. Say what it closes

If a step verified an acceptance criterion of a catalog entry, name the entry and quote
the criterion on the `Closes` line. `/feature` needs that to promote the entry to
`shipped`, and the catalog rule names this log as the evidence an entry ships on.
