# Incidents behind rules/tests.md

Not delivered to any session: read on demand, from a pointer in `rules/tests.md`.

## A consumer test that wrote its own field

Two units agreed on a field that one wrote and the other read back. Each had tests
and each passed, but the consumer's test supplied the field itself instead of letting
the caller write it, so it passed against a path that had never worked. Review caught
it; the suite did not.

## A tokenizer that went quiet on real commits

In one project a tokenizer replaced a substring match in a hook. It passed its own table
of cases, and missed a command that followed `then`, `do` or `{`, or that was continued
from the line before. The hook said nothing on real commits until review probed past the
table.

## Two polling cases that lost to a busy machine

In this framework two test cases polled a stub three times under a three-second
deadline. During busy runs they exited "still waiting", and passed on the rerun with
nothing changed.

## Six hook cases that inherited an earlier run's markers

In this framework a self-check on a machine at a load average near 47 failed six cases
of the capture-at-write hook, the hook replying with nothing, and passed on the rerun
with nothing changed. It was filed as load, beside two polling cases that were. The
cases named each session after the process id and a counter, and the hook's
once-per-session markers in the shared temporary folder were never removed; a run that
drew an earlier run's process id found its markers, and the hook stayed silent. Run
twice in a new process-id namespace, so jest had the same process id both times, the
second run failed the same six cases.
