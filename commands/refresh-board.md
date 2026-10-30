---
description: Rebuild the backlog board from the catalog and band what is new
---

Five steps, in this order, from the repository root.

**1. Build.**

```bash
npm --prefix .tropis run board
```

If the developer invoked this as `/refresh-board all`, they want every band, verdict and
score re-read, not only the ones the build would flag:

```bash
npm --prefix .tropis run board -- --reevaluate
```

Either way it writes the page and reports what needs a person:
active entries with no band, bands whose entry has shipped, been replaced, been shelved
or gone, bands whose entry has moved since the verdict was written — its status changed,
or a blocker it was waiting on shipped (with `--reevaluate`, every band) — bands that
are not A to D, and bands with no value or effort score from 1 to 5. If it reports
nothing, skip to step 4.

**2. Band and prune.** When `docs/backlog-board/bands.yaml` does not exist, copy
`.tropis/templates/backlog-bands.yaml` there first. Then edit `docs/backlog-board/bands.yaml`:

- For each unbanded entry, read the entry in `feature-catalog.yaml` — its value and
  criteria, not only its title — and add a row: `band` (A do now: high value, and urgent
  or blocking other work · B do next: worth doing, no deadline · C decide first: an open
  question only the developer can answer stands between the entry and a plan, and the
  verdict names the question · D leave it: nothing to do until something happens, and the
  verdict names what), `value` and `effort` as whole numbers from 1 to 5 with a line each
  saying why (`valueWhy`, `effortWhy`), a `verdict` of one or two sentences in plain
  English, and `evidence` only where you checked something against the code, dated. Do
  not band from the title alone, and do not invent evidence.
- When the entry belongs to an arc already under way — some of the arc's entries have
  shipped; `npm --prefix .tropis run next` lists them under *Arcs under way* — ask
  whether finishing that arc is worth a higher band, and band accordingly. If it moved the
  band, say so in the verdict. `/next` suggests by band and uses the arc only to break a
  tie inside one band, so this is the one place an arc's value is weighed.
- Band an entry that waits on another on its own value, as though what it waits on were
  done. The board marks the wait; the band does not.
- For each band the build called not A to D, choose A to D. For each band with no score,
  write `value` and `effort` with their reasons. On the first refresh after taking the
  release that brought four bands and scores, every existing row is reported this way:
  re-judge each one under the new bands rather than converting the old letter to a new
  one.
- Delete each row the build called stale.
- For each band the build called moved (or every band, after `--reevaluate`), re-read
  the entry as it now stands and either rewrite the verdict — and the band, if the move
  changed it — or leave it, having looked. Leaving it is a judgment too, and the stamp
  below is its only record: nothing else is written for a band that stands. Then bring
  the records up to date:

  ```bash
  npm --prefix .tropis run board -- --stamp
  ```

  That rewrites each row's `seen` block to the catalog as it is now and touches nothing
  else. Run it once, after the last edit; a band stamped mid-edit is recorded as judged.

The file is sorted by id; keep it that way.

**3. Build again.** `npm --prefix .tropis run board` must now report nothing needing a person.

**4. Look.** Open the page the build printed in a browser and look at it.

<!-- project-owned: begin — a project's own step for publishing the page, if it has one. -->
<!-- What this block is for: publishing the page somewhere else. As shipped, there is no publishing step. -->
<!-- project-owned: end -->

**5. Commit `bands.yaml`.** Directly on `main`, when step 2 changed
it — which, after a stamp, it always has — it is a file under `docs/`, so no branch is needed. The build product is gitignored;
the bands are the durable record of the judgment, and a band left in the working tree is
reported as missing again by the next checkout to run the build. Do not leave this to the
person: it was skipped once and the next refresh re-asked for four bands that already
existed.

Report what moved: entries banded, scores written, bands pruned, and the arc figures that changed. Do not
touch the catalog from this command; a wrong status is a `/feature` matter.
