# A plan runs on the cheapest included model in its tier or any tier above it — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Traps*. Nothing in it stops for the developer.

**Goal:** `/dispatch`, `dispatch.mjs --tier`, and `sprint.mjs start`, `add` and `launch`
name, among the picks for the tier and every tier above it that a subscription the
developer holds includes, the one whose usage per task is least — not the first included
pick going up. The documents that describe the choice, the decision record and the
release notes say so.

**Backlog item:** `tier-falls-through-to-the-cheapest-included-pick` in
`feature-catalog.yaml` (type improvement). No spec: the backlog item and this plan.

**One plan:** what becomes true is one sentence — a plan, team member or reviewer runs on
the included pick that costs least per task in its tier or any tier above it.

**Model tier: Small–medium.** Every line of code, every test and every document change is
given verbatim below; the work is applying them across several files and running checks.

**Merge authority: parent review.** The specifying session reviews, opens the pull
request and merges. Stop after Task 5; do not open a pull request, write a review record
or merge.

**Merges after:** picks-are-judged-at-the-default-effort

**A fresh-agent check is owed, and the specifying session runs it:** the change alters
what `framework/workflow.md`, `framework/model-tiers.md` and `commands/sprint.md` tell an
agent about which model to start. The executor does not run it.

**Why.** Today `pickToUse` and `pickForTool` in `scripts/plan-binding.js` walk the plan's
tier and then each tier above, and return the first pick a held subscription includes.
Once picks are judged at their default effort (the backlog item
`picks-are-judged-at-the-default-effort`), Claude Code has no included pick in Medium or
Medium–large but Claude Fable 5.1, so on Max, Ultra and Team Premium a plan of those
tiers runs on Fable 5.1 — $9.08 per task on CursorBench 4.0 at High — while Opus 5.5, a
Large pick included on the same subscriptions, costs $3.97. Every pick in a tier above is
judged able to do a lower tier's work (FW-057 places on fitness alone), so the cheapest of
them all is the right one. The developer stated it on 2026-11-04: do not look only at the
plan's tier, include every tier above it, and pick the cheapest model among them.

**Decided by the specifying session while shaping** (the developer left these to it):

- **Cost is the first dollar figure in the model's `Usage per task` cell** of the picks
  file's inclusion table (`$3.97 per task (CursorBench 4.0, …)` reads 3.97). A cell with
  no dollar figure, such as `unmeasured`, has no cost.
- **A pick with no cost ranks after every pick with one.** It cannot be shown to cost
  less. Where no included pick has a cost, the first included pick going up is named, as
  today, and the line says why.
- **On a tie, the pick met first going up wins**: the plan's own tier before a tier above,
  and inside a tier the table's own order.
- **A model listed in two tiers counts once,** at the first tier it is met in.
- **`pickForTool` chooses the same way among the picks that tool's subscription
  includes,** then needs that pick's command-line name, failing as today when it has
  none. It does not skip to a dearer pick that has a name: the picks file is then
  incomplete, and `/refresh-model-tiers` is the fix it names.
- **The tier table is unchanged and usage still never moves a model between tiers**
  (FW-057). This changes which tier's pick runs, not where a pick sits.
- **The decision is FW-070.** FW-069 is taken by the in-flight plan for
  `picks-are-judged-at-the-default-effort`. FW-053, FW-057 and FW-060 stay as written;
  FW-070 says what it amends.

**What the specifying session verified on 2026-11-04, against `origin/main` at `07b3996`
(node v22, Linux x86_64):**

- `scripts/plan-binding.js`: `pickToUse` (from about line 427) and `pickForTool` (from
  about line 495) each repeat the same loop over `TIER_ORDER` from the plan's tier,
  splitting `picksForTier(...)` on `;`, dropping `any pick from a higher tier`, and
  stripping a trailing `*(…)*`. `inclusionTable(picksText)` returns model → lower-cased
  tool → `{name, subscriptions}`; `commandLineNames` is private; `INCLUSION_HEADER` is
  `'| Model | Usage per task | Included on |'`.
- Callers: `scripts/dispatch.mjs` (lines 84 and 164) and `scripts/sprint.mjs`
  (`teamModelLine`, `teamModelFor`, and the launch line at about line 547:
  `` `Sprint: ${id} runs on ${found.pick} (${found.model}), the ${TEAM_TIER} tier's first pick your ${name} subscription includes.` ``).
- Tests that assert the current wording or choice: `guards/dispatch.test.js`, describe
  `dispatch names the pick to use` (from about line 562); `guards/sprint.test.js` case
  `† a: start for a session sprint names the first included Large pick, as dispatch does`
  (about line 1000); `guards/team-member-cli.test.js`, describe `pickForTool` (about line
  450) and the launch case expecting `the Large tier's first pick your Claude Code
  subscription includes.` (about line 517).
- Prose that says "first pick": `framework/model-tiers.md` (two places),
  `framework/workflow.md` (*Run the probe on the Large tier's included pick*),
  `commands/sprint.md` (two places), `commands/refresh-model-tiers.md` (the picks file's
  header text inside its template), `templates/README.md` (the sprint paragraph),
  `docs/model-picks.md` (its header). Each is quoted under *The documents*.
- With the subscriptions `Claude Code: Max; Cursor: Pro` and this repository's picks,
  every Claude Code pick in a tier is already listed least usage first, so a Large plan
  keeps Opus 5.5 and a Small–medium one keeps Haiku 5.5.

---

## Delivers

tier-falls-through-to-the-cheapest-included-pick

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-cheapest-pick -b plan/tier-falls-through-to-the-cheapest-included-pick origin/main` |

## Global Constraints

- **Edit the source, never the installed release.** Do not edit anything under
  `.claude/`, `.cursor/`, `.tropis/`, `CLAUDE.md` or `AGENTS.md`.
- **Add no dependency. Do not lower, skip or delete a guard or a test.** Changing the
  expected text or name of a case named below is part of the plan; nothing else is.
- **Every commit has a body** saying what becomes true.
- **This repository is public.** No home paths, hostnames, personal or computer names in
  anything committed or in the handover.
- **Every agent runs on the developer's plan (FW-053):** no API key, no cloud agent API.
- **Write the code yourself against this repository's own names**, and say in the
  handover which named source, if any, you worked from. (The code below is the
  specifying session's own; say so.)

## The change — `scripts/plan-binding.js`

### 1. Three helpers, inserted directly above the doc comment of `pickToUse`

Insert exactly this block immediately before the line
`/**` that opens `pickToUse`'s doc comment (the comment starting
` * The prompt line naming the pick to run a plan on`):

```js
/**
 * Each model the tier table lists for the tier at `from` in the tier order and every
 * tier above it — tier by tier, each in the table's own order — with the tier it is
 * listed in. A model listed in two tiers keeps the first.
 * @param {string} picksText
 * @param {number} from
 * @returns {{model: string, tier: string}[]}
 */
function picksFrom(picksText, from) {
  const seen = new Set();
  const out = [];
  for (let i = from; i < TIER_ORDER.length; i++) {
    const models = picksForTier(picksText, TIER_ORDER[i])
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part !== '' && !/^(or\s+)?any pick from a higher tier\.?$/i.test(part))
      .map((part) => part.replace(/\s*\*\([^)]*\)\*\s*$/, ''));
    for (const model of models) {
      if (seen.has(model)) continue;
      seen.add(model);
      out.push({ model, tier: TIER_ORDER[i] });
    }
  }
  return out;
}

/**
 * Each model's usage per task, from the first dollar figure in its `Usage per task`
 * cell of the picks file's inclusion table; null where the cell has none, such as
 * `unmeasured`. Empty when the file has no such table.
 * @param {string} picksText
 * @returns {Map<string, number|null>}
 */
export function usagePerTask(picksText) {
  const all = picksText.split('\n');
  const start = all.findIndex((l) => l.startsWith(INCLUSION_HEADER));
  const usage = new Map();
  if (start === -1) return usage;
  for (const line of all.slice(start + 1)) {
    if (!line.startsWith('|')) break;
    if (/^\|\s*-{3}/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const m = cells[1].match(/\$\s*(\d[\d,]*(?:\.\d+)?)/);
    usage.set(cells[0], m ? Number(m[1].replace(/,/g, '')) : null);
  }
  return usage;
}

/**
 * The candidate whose usage per task is least. One with no figure ranks after every one
 * with a figure; on a tie the earlier candidate wins, so the plan's own tier comes before
 * a tier above it. Null when there is no candidate.
 * @template {{model: string}} T
 * @param {T[]} candidates in the order `picksFrom` gives
 * @param {Map<string, number|null>} usage
 * @returns {(T & {cost: number|null})|null}
 */
function cheapest(candidates, usage) {
  let best = null;
  for (const candidate of candidates) {
    const cost = usage.get(candidate.model) ?? null;
    if (best === null || (cost !== null && (best.cost === null || cost < best.cost))) {
      best = { ...candidate, cost };
    }
  }
  return best;
}

```

### 2. `pickToUse`, whole function and doc comment replaced

Replace `pickToUse`'s doc comment and body (from ` * The prompt line naming the pick to
run a plan on` through the function's closing `}`) with:

```js
/**
 * The prompt line naming the pick to run a plan on: of the picks for the plan's tier and
 * every tier above it that one of the developer's recorded subscriptions includes
 * without a charge on top (FW-053), the one whose usage per task is least (FW-070).
 * Null when the tier is not one of the five.
 * @param {string} picksText
 * @param {string} tier
 * @param {string|null} subscriptionsText the local record, or null when there is none
 * @returns {string|null}
 */
export function pickToUse(picksText, tier, subscriptionsText) {
  const from = TIER_ORDER.findIndex((t) => normalizeTier(t) === normalizeTier(tier || ''));
  if (from === -1) return null;
  const included = inclusionTable(picksText);
  if (included === null) {
    return '**Use:** not chosen — the picks do not say which subscriptions include each model. Run /refresh-model-tiers.';
  }
  const held = subscriptionsText === null ? new Map() : parseSubscriptions(subscriptionsText);
  if (held.size === 0) {
    return '**Use:** not chosen — which subscriptions you have is not recorded on this machine. Run /refresh-model-tiers, or set TROPIS_SUBSCRIPTIONS.';
  }
  const candidates = [];
  for (const { model, tier: listedIn } of picksFrom(picksText, from)) {
    for (const [key, { name, subscriptions }] of included.get(model) ?? []) {
      const mine = held.get(key);
      if (mine && [...mine].some((sub) => subscriptions.has(sub))) {
        candidates.push({ model, tier: listedIn, name });
        break;
      }
    }
  }
  const best = cheapest(candidates, usagePerTask(picksText));
  if (best === null) {
    return '**Use:** none — no pick for this tier or above is included in your subscriptions, and a model that costs extra is not used (FW-053).';
  }
  return best.cost === null
    ? `**Use:** ${best.model}, in ${best.name} — no included pick for this tier or above has a usage figure, so this is the first one, from the ${best.tier} tier.`
    : `**Use:** ${best.model}, in ${best.name} — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the ${best.tier} tier.`;
}
```

### 3. `pickForTool`, doc comment and the loop replaced

Replace its doc comment's first sentence

```
 * The model a tool's command line should start a run of this tier on: the first pick of
 * the tier, then each tier above it, that the recorded subscription *in that tool*
 * includes and that has a command-line name for that tool. `model` is that name, or null
 * with `reason` saying why none could be named.
```

with

```
 * The model a tool's command line should start a run of this tier on: of the picks for
 * the tier and every tier above it that the recorded subscription *in that tool*
 * includes, the one whose usage per task is least (FW-070), by its command-line name for
 * that tool. `model` is that name, or null with `reason` saying why none could be named.
```

and replace everything from the line
`  const from = TIER_ORDER.findIndex((t) => normalizeTier(t) === normalizeTier(tier || ''));`
inside `pickForTool` through the function's closing `}` with:

```js
  const from = TIER_ORDER.findIndex((t) => normalizeTier(t) === normalizeTier(tier || ''));
  const candidates = picksFrom(picksText, Math.max(from, 0)).filter(({ model }) => {
    const entry = included.get(model)?.get(key);
    return entry !== undefined && [...mine].some((sub) => entry.subscriptions.has(sub));
  });
  const best = cheapest(candidates, usagePerTask(picksText));
  if (best === null) {
    return fail(`no ${tier} pick or above is included in your ${toolName} subscription, and a model that costs extra is not used (FW-053).`);
  }
  const name = commandLineNames(picksText).get(best.model)?.get(key);
  if (!name || name.toLowerCase() === 'none') {
    return fail(`the picks do not give ${toolName}'s name for ${best.model}.${refresh}`, best.model);
  }
  return { model: name, pick: best.model, reason: null };
}
```

## The change — `scripts/sprint.mjs`

Replace

```
      ? `Sprint: ${id} runs on ${found.pick} (${found.model}), the ${TEAM_TIER} tier's first pick your ${name} subscription includes.`
```

with

```
      ? `Sprint: ${id} runs on ${found.pick} (${found.model}), the pick for the ${TEAM_TIER} tier and above that costs least per task of those your ${name} subscription includes.`
```

Nothing else in the file changes.

## Tests

Write every case below before the code (Task 1).

### `guards/dispatch.test.js`, describe `dispatch names the pick to use`

The shorthand used below: `LINE(model, tool, tier)` stands for
`` `**Use:** ${model}, in ${tool} — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the ${tier} tier.` ``
— write the full string out in each assertion, do not add a helper.

1. Case `names the first included pick of the tier, with its tool, skipping a model
   missing from the inclusion table`: rename it to
   `names the included pick that costs least per task from the tier and above, ranking an unmeasured pick after a measured one`,
   and expect `LINE('Cedar 1', 'Cursor', 'Medium')` in place of the Dogwood 1 line.
   (With `Cursor: Premium`, Small's Dogwood 1 is unmeasured; Cedar 1 at $1 and Birch 2
   at $4 are included above it; Elm 0 is missing from the inclusion table.)
2. Case `goes up a tier when none of this tier's picks is included`: expect
   `LINE('Cedar 1', 'Cursor', 'Medium')`.
3. Case `matches a subscription that carries a note`: expect
   `LINE('Alder 3', 'Claude Code', 'Large')`; keep the `not.toContain('**Use:** Birch 2')`.
4. Case `f: --tier names the pick /dispatch names for a plan of that tier`: the first
   `toBe` expects `LINE('Alder 3', 'Claude Code', 'Large')` followed by `\n`.
5. Case `records the subscriptions it is given, and dispatch then uses them`: expect
   `LINE('Cedar 1', 'Cursor', 'Medium')`.
6. Case `parses the record, the inclusion table and the choice`: change the last
   expectation to `LINE('Birch 2', 'Cursor', 'Large')`, keep its comment line, and add
   after it:

   ```js
   const usage = binding.usagePerTask(PICKS);
   expect(usage.get('Alder 3')).toBe(9);
   expect(usage.get('Cedar 1')).toBe(1);
   expect(usage.get('Dogwood 1')).toBeNull();
   expect(binding.usagePerTask('| Tier | Models |\n|---|---|\n').size).toBe(0);
   expect(binding.usagePerTask('| Model | Usage per task | Included on |\n|---|---|---|\n| X | $1,234.50 per task | Cursor: Pro |\n').get('X')).toBe(1234.5);
   ```
7. Add these three cases at the end of the describe block, after `parses the record, …`:

   ```js
   // A dearer pick in the plan's own tier and a cheaper one above it, both included.
   const dearerBelow = (fig) => `**Last verified: ${today()}.**

   | Tier | Models |
   |---|---|
   | **Large** | Alder 3 *(all)* |
   | **Medium–large** | Fig 5 *(all)*; or any pick from a higher tier |
   | **Medium** | Any pick from a higher tier |
   | **Small–medium** | Any pick from a higher tier |
   | **Small** | Any pick from a higher tier |

   | Model | Usage per task | Included on | Command-line name |
   |---|---|---|---|
   | Alder 3 | $3.97 per task (Example Index v1, high) | Claude Code: Max | Claude Code: alder-3 |
   | Fig 5 | ${fig} per task (Example Index v1, high) | Claude Code: Max | Claude Code: fig-5 |
   `;

   it('† takes a cheaper included pick from a tier above over a dearer one in its own tier', () => {
     const p = withPicks(dearerBelow('$9.08'), 'Claude Code: Max\n');
     try {
       const line = '**Use:** Alder 3, in Claude Code — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Large tier.\n';
       expect(tierRun(p, 'Medium–large').stdout).toBe(line);
       expect(tierRun(p, 'Medium').stdout).toBe(line);
       expect(tierRun(p, 'Small').stdout).toBe(line);
     } finally { rmSync(p.parent, { recursive: true, force: true }); }
   });

   it('† keeps the pick in its own tier when it costs less, or the same', () => {
     for (const fig of ['$2.50', '$3.97']) {
       expect(binding.pickToUse(dearerBelow(fig), 'Medium–large', 'Claude Code: Max'))
         .toBe('**Use:** Fig 5, in Claude Code — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Medium–large tier.');
     }
   });

   it('† names the first included pick going up when no included pick has a usage figure', () => {
     const unmeasured = PICKS.replace('$1 per task', 'unmeasured').replace('$4 per task', 'unmeasured');
     expect(binding.pickToUse(unmeasured, 'Small', 'Cursor: Premium'))
       .toBe('**Use:** Dogwood 1, in Cursor — no included pick for this tier or above has a usage figure, so this is the first one, from the Small tier.');
   });
   ```

   The template literal's rows must start at column 0 inside the file (no indentation
   before `|`), as `picksText` in the same describe block does, or the tables do not
   parse. Indent the `const dearerBelow` line and the `it(` lines as the surrounding
   cases are.

### `guards/sprint.test.js`

Case `† a: start for a session sprint names the first included Large pick, as dispatch
does`: rename it to
`† a: start for a session sprint names the included Large pick that costs least per task, as dispatch does`,
and change its expected line to
`'Sprint: team members run on the Large tier. **Use:** Alder 3, in Claude Code — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Large tier.'`.
Nothing else in the file changes.

### `guards/team-member-cli.test.js`

1. In the launch case expecting
   `"Sprint: e1 runs on Alder 3 (alder-3), the Large tier's first pick your Claude Code subscription includes."`,
   expect instead
   `"Sprint: e1 runs on Alder 3 (alder-3), the pick for the Large tier and above that costs least per task of those your Claude Code subscription includes."`.
2. Add, inside describe `pickForTool`, after `† skips a pick that only the other tool
   includes`:

   ```js
   it('† takes the included pick that costs least per task, whatever its place in the tier', () => {
     const picks = `${PICK_TIERS}
   | Model | Usage per task | Included on | Command-line name |
   |---|---|---|---|
   | Alder 3 | $9 per task | Claude Code: gold | Claude Code: alder-3 |
   | Birch 2 | $4 per task | Claude Code: gold | Claude Code: birch-2 |
   `;
     expect(binding.pickForTool(picks, 'Large', GOLD, 'Claude Code'))
       .toEqual({ model: 'birch-2', pick: 'Birch 2', reason: null });
     expect(binding.pickForTool(picks, 'Small', GOLD, 'Claude Code'))
       .toEqual({ model: 'birch-2', pick: 'Birch 2', reason: null });
   });
   ```

   As above, the table rows start at column 0. `PICK_TIERS` lists Alder 3 before Birch 2
   in Large, so today's code returns `alder-3` and the case is red until Task 2.

## The documents

Each change is an exact replacement of the quoted text. Line breaks in the quoted
"before" text are where the file has them; re-wrap the "after" text to the file's width
(about 88 columns) if it runs long.

### `framework/model-tiers.md`

Before:

```
holds is kept on their machine, never committed; `/dispatch` names the first pick for a
plan's tier that one of them includes, and never one that would cost extra (FW-053).
```

After:

```
holds is kept on their machine, never committed. `/dispatch` names, of the picks for a
plan's tier and every tier above it that one of them includes, the one that costs least
per task (FW-070), and never one that would cost extra (FW-053). Any pick above a tier
can do that tier's work, so a gap in a tier, or a dearer pick listed first, does not
put a plan on a more expensive model than it needs.
```

Before:

```
Each runs on the first Large pick that a subscription the developer holds includes,
the pick `/dispatch` names for a Large plan; where none is named, on the tool's
default model (FW-053).
```

After:

```
Each runs on the Large pick that costs least per task of those a subscription the
developer holds includes, the pick `/dispatch` names for a Large plan; where none is
named, on the tool's default model (FW-053).
```

### `framework/workflow.md`

Before:

```
`node .tropis/scripts/dispatch.mjs --tier Large` names the model: the first Large pick
that a subscription the developer holds includes, as `/dispatch` would choose for a
Large plan.
```

After:

```
`node .tropis/scripts/dispatch.mjs --tier Large` names the model: the Large pick that
costs least per task of those a subscription the developer holds includes, as
`/dispatch` would choose for a Large plan.
```

### `commands/sprint.md`

Before:

```
team member on the model the last line of `start` names: the first pick of the Large
tier that a subscription the developer holds includes, since a team member shapes,
plans and reviews.
```

After:

```
team member on the model the last line of `start` names: the Large pick that costs
least per task of those a subscription the developer holds includes, since a team
member shapes, plans and reviews.
```

Before:

```
`launch` starts each team member on the Large tier's first pick that the developer's
subscription in that tool includes, by the name that tool's command line takes, or says
```

After:

```
`launch` starts each team member on the Large pick that costs least per task of those
the developer's subscription in that tool includes, by the name that tool's command line
takes, or says
```

(Re-wrap the paragraph's following lines if needed; change no other word.)

### `commands/refresh-model-tiers.md` (inside the picks file template)

Before:

```
least usage per task first, and `/dispatch` names the first one your subscriptions
include; the second table gives each pick's usage and the subscriptions that include it.
```

After:

```
least usage per task first. `/dispatch` names, of the picks for a plan's tier and every
tier above it that your subscriptions include, the one that costs least per task; the
second table gives each pick's usage and the subscriptions that include it.
```

### `docs/model-picks.md`

The same before and after as `commands/refresh-model-tiers.md`, in the header paragraph.
If the file no longer holds the "before" text (another plan rewrote it), make the same
change to whatever sentence says which pick `/dispatch` names, and say so in the
handover.

### `templates/README.md`

Before:

```
starts on the model the sprint names: the Large tier's first pick that your subscriptions
include;
```

After:

```
starts on the model the sprint names: the Large pick that costs least per task of those
your subscriptions include;
```

### `framework/DECISIONS.md`

Append at the end of the file, after the last entry, separated by one blank line:

```
## FW-070: A plan runs on the included pick that costs least per task in its tier or any tier above

**Date:** 2026-11-04 · **Status:** Accepted; built by the backlog item
`tier-falls-through-to-the-cheapest-included-pick`.

**Decision:** `/dispatch`, `dispatch.mjs --tier`, and `sprint.mjs start`, `add` and
`launch` name, of the picks for the tier and every tier above it that a subscription the
developer holds includes, the one whose usage per task is least. Usage is the first
dollar figure in the pick's `Usage per task` cell. A pick with no figure ranks after
every pick with one; on a tie, the pick met first going up wins, so the plan's own tier
keeps it. Where no included pick has a figure, the first included pick going up is named,
as before, and the line says why.

**Evidence:** Stated by the developer on 2026-11-04. Once the picks are judged at the
effort each tool starts a model at (FW-069), Claude Code has no included pick in Medium
or Medium–large but Claude Fable 5.1, so on Max, Ultra and Team Premium a plan of those
tiers ran on Fable 5.1, $9.08 per task on CursorBench 4.0 at High, while Opus 5.5, a
Large pick included on the same subscriptions, costs $3.97. FW-057 places on fitness
alone, so every pick in a tier above is judged able to do a lower tier's work. Source:
none in particular.

**Rejected:** The plan's own tier first, going up only when it has no included pick
(FW-053's and FW-057's rule: it put Medium work on the most expensive pick per task).
Going past the first included pick only to a cheaper one and stopping at the first tier
that has one (the developer's first statement of the item, replaced the same day: it
still misses a cheaper pick two tiers up). Ranking an unmeasured pick by its place in the
table (a pick with no figure cannot be shown to cost less). Letting usage move a model
between tiers (FW-057 still rejects it: this changes which tier's pick runs, never where
a pick sits).

**Consequences:** Amends the "first included pick" of FW-053, FW-057 and FW-060. Inside
a tier the picks are still listed least usage first, so a Large plan, a team member and a
fresh reviewer get the pick they got before unless the table's order and its figures
disagree. A plan of a lower tier may run on a more capable model than it needs when that
model costs less per task.
```

### `RELEASES.md`

Under `## [Unreleased]`, add as the last bullet:

```
- A plan, a sprint's team member and a fresh reviewer run on the model your subscriptions
  include that costs least per task among the picks for their tier and every tier above
  it, rather than on the first included pick, so a gap in one tier no longer puts work on
  its most expensive model.
```

## Traps

- **The self-check reads `HEAD` only.** Commit before each run.
- **`npm --prefix .tropis test` runs the installed release's checks, not this source.**
  It must stay green; it shows nothing of this change.
- **Run one guard alone the way the self-check runs it.** `scripts/check-blueprint.sh`
  builds a project-shaped tree from a `git archive` of `HEAD` and runs the guards through
  `scripts/check-conformance.sh` with the jest installed under `.self-check/`. Find where
  that happens and run the three guard files that way; say the exact command in the
  handover.
- **A table in a template literal must start at column 0.** An indented `|` row is not
  read as a table row by `inclusionTable`/`usagePerTask` (they test `startsWith('|')`).
- **`docs/model-picks.md` may be rewritten under you.** Another plan
  (`picks-are-judged-at-the-default-effort`) rewrites it and `commands/refresh-model-tiers.md`;
  this plan merges after it. Make only the header-sentence change in each.
- **`framework-integrity` fails on a backticked path that does not exist** under
  `docs/`, `scripts/` or `.claude/`. The text above adds none; do not add one.
- **The scope check.** `git diff --stat origin/main...HEAD` must list only files in
  *File Structure*.

## File Structure

| File | Change |
|---|---|
| `scripts/plan-binding.js` | `picksFrom`, `usagePerTask`, `cheapest`; `pickToUse` and `pickForTool` choose the cheapest included pick |
| `scripts/sprint.mjs` | the launch line's wording |
| `guards/dispatch.test.js` | six cases changed, three added |
| `guards/sprint.test.js` | one case renamed and its expected line |
| `guards/team-member-cli.test.js` | one expected line, one case added |
| `framework/model-tiers.md` | two sentences |
| `framework/workflow.md` | one sentence |
| `framework/DECISIONS.md` | FW-070 |
| `commands/sprint.md` | two sentences |
| `commands/refresh-model-tiers.md` | the picks file template's header sentence |
| `docs/model-picks.md` | its header sentence |
| `templates/README.md` | one sentence |
| `RELEASES.md` | one bullet |
| `feature-catalog.yaml` | the item to `shipped`, with comments mapping the criterion to its cases (Task 4) |
| `docs/backlog-board/bands.yaml` | the item's row removed, only if it has one (Task 4) |
| `docs/backlog-board/index.html` | only if the board's hook rebuilt and staged it |
| `docs/superpowers/plans/2026-11-04-tier-falls-through-to-the-cheapest-included-pick.md` | the handover report |

Nothing else. If a guard demands a change to a file not listed, stop and hand back with
its output.

Doc closeout, decided by the specifying session: the decision record is FW-070; the
operator guide (`templates/` operator page) names no pick rule beyond the README sentence
above; no upstream queue, this repository is the upstream; no rule changes.

## Tasks

### Task 0 — Setup in the worktree

`npm --prefix .tropis ci`, then `git status --porcelain` (expected: nothing), then
`bash scripts/check-blueprint.sh` (expected: last line starts `Self-check passed`).
Record `git --version`, `node --version` and `uname -sm`.

### Task 1 — The tests, red

Make every change under *Tests*. Commit. Run the three guard files alone (*Traps*).
Expected: the changed and added cases in `guards/dispatch.test.js`, the renamed case in
`guards/sprint.test.js`, and in `guards/team-member-cli.test.js` the launch case and the
added case fail; every other case passes. Paste the failing names.

### Task 2 — The code

Make the `scripts/plan-binding.js` and `scripts/sprint.mjs` changes. Commit. Run the
three guard files alone: every case passes. Paste the `Tests:` lines.

### Task 3 — The documents

Make every change under *The documents*.
Commit. Run `bash scripts/check-blueprint.sh` and paste its last line.

### Task 4 — Backlog and board

1. In `feature-catalog.yaml`, on `tier-falls-through-to-the-cheapest-included-pick`: set
   `status: shipped` (if it does not read `building`, set it anyway and say so); leave
   `acceptanceCriteria` as they are; set `modules` to `scripts/plan-binding.js` and
   `scripts/sprint.mjs`; keep this plan in `refs`. Above the item, after its existing
   comment lines, add
   `# Shipped by docs/superpowers/plans/2026-11-04-tier-falls-through-to-the-cheapest-included-pick.md.`
   and
   `# Criterion 1: guards/dispatch.test.js, "takes a cheaper included pick from a tier above over a dearer one in its own tier" and "keeps the pick in its own tier when it costs less, or the same"; guards/team-member-cli.test.js, "takes the included pick that costs least per task, whatever its place in the tier".`
   (as one comment line, or wrapped over two `#` lines). The comment must not contain a
   colon followed by a space anywhere other than after `# Criterion 1`; a comment is not
   YAML, but keep it as written.
2. In `docs/backlog-board/bands.yaml`, delete the item's block if it has one; otherwise
   leave the file alone.
3. Commit. Run `npm --prefix .tropis test` and paste the `Tests:` line.

### Task 5 — Verification and handover

1. Everything committed: `npm --prefix .tropis test` (paste the `Tests:` line),
   `bash scripts/check-blueprint.sh` (paste the last line), and
   `git diff --stat origin/main...HEAD` (paste it; every file in *File Structure*).
2. Append `## Handover report` to this plan with the six sections the planning rule
   names: Task completion, Verification results (each command, its output, and the tool,
   version, operating system and architecture — never the computer's name), Scope,
   Judgment calls, What the plan got wrong, Outstanding (say the change has no screen,
   so there is no developer check). Commit, and run the self-check again on that commit.
3. `git push -u origin plan/tier-falls-through-to-the-cheapest-included-pick`. **Do not
   open a pull request**, write a review record, set auto-merge or merge. Leave the
   worktree in place.

## Handover report

### Task completion

- Task 0, setup in the worktree: done. `npm --prefix .tropis ci` ran; `git status` was clean; `scripts/check-blueprint.sh` passed on the untouched base (`e2b6461`).
- Task 1, the tests, red: done, commit `d76e44c`. The three guard files were run alone, on a staged copy of HEAD (method below). 12 cases failed as the plan expects: 9 in `guards/dispatch.test.js` (six changed, three added), the renamed case in `guards/sprint.test.js`, and two in `guards/team-member-cli.test.js` (the launch case and the added `pickForTool` case).
- Task 2, the code: done, commit `3fb2042`. The three guard files: 124 passed, 0 failed.
- Task 3, the documents: done, commit `f360d84`. Every quoted before-text matched the file, with one addition below.
- Task 4, backlog and board: done, commit `02de16a`. The item is `shipped`, `modules` names the two scripts, `refs` keeps the plan, and the criterion comment is added. The item's block in `docs/backlog-board/bands.yaml` was removed, since the item had one. `docs/backlog-board/index.html` was not touched: nothing rebuilt it.
- Task 5, verification and handover: this section, plus the push. No pull request was opened, and no review record, auto-merge or merge was done, as the plan says.

### Verification results

Tools: git 2.43.0, node v22.23.4, on Linux x86_64.

- `npm --prefix .tropis test` after Task 4 (on `02de16a`):
  `Test Suites: 13 passed, 13 total` / `Tests: 181 passed, 181 total`
- Three changed guard files, run alone on a staged copy of HEAD at `02de16a`, with the framework jest config and the worktree's installed jest:
  `Test Suites: 3 passed, 3 total` / `Tests: 124 passed, 124 total`
- Red run after Task 1 (staged `d76e44c`): `Tests: 12 failed, 112 passed, 124 total`. Failing names: the nine dispatch cases above, the sprint case `† a: start for a session sprint names the included Large pick that costs least per task, as dispatch does`, the team-member launch case `† starts the tool on the pick its picks name, and says so`, and `pickForTool › † takes the included pick that costs least per task, whatever its place in the tier`. A tenth name, `launch › † for cursor, writes the grants into a worktree that has none and leaves an existing file alone`, failed once in that red run and passed when run alone and in every later run. It is not in the plan's expected list. It looks like a timing failure under load from the self-check running at the same time, but I did not confirm that.
- Self-check, baseline before any change (`e2b6461`, run in the worktree): last line `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Self-check on committed HEAD `02de16a`, run in the worktree: last line `Self-check passed: every guard caught its defect, the clean baseline passed, and the framework repository's own guards passed.`
- Self-check on the code commit `3fb2042` was started but not completed, and its output was not kept. It was killed and then rerun on `02de16a`.

The self-check is run on the committed HEAD. The report commit added below is a new HEAD, so the self-check is run again on it before the push, and its last line is reported in the final message.

### Scope

`git diff --stat origin/main...HEAD` (at `02de16a`, base `e2b6461`):

```
RELEASES.md                     |   4 ++
commands/refresh-model-tiers.md |   7 +-
commands/sprint.md              |  11 ++--
docs/backlog-board/bands.yaml   |  14 ----
docs/model-picks.md             |   5 +-
feature-catalog.yaml            |   8 ++-
framework/DECISIONS.md          |  36 ++++++++++
framework/model-tiers.md        |  13 ++--
framework/workflow.md           |   6 +-
guards/dispatch.test.js         |  60 +++++++++++++++--
guards/sprint.test.js           |   4 +-
guards/team-member-cli.test.js  |  15 ++++-
scripts/plan-binding.js         | 143 +++++++++++++++++++++++++++++-----------
scripts/sprint.mjs              |   2 +-
templates/README.md             |   4 +-
15 files changed, 245 insertions(+), 87 deletions(-)
```

Every file is in the plan's File Structure table. The worktree actually used is the sibling worktree `../tropis-cheapest-pick`, on branch `plan/tier-falls-through-to-the-cheapest-included-pick`, created from `origin/main` by `isolate-for-plan.sh`. The main checkout was not edited.

### Judgment calls

- `commands/refresh-model-tiers.md` has a second sentence saying `/dispatch` names "the first one the developer's subscriptions include" (in the prose about inside-a-tier ordering, around line 105). It is not in the plan's before-text list, but the change makes it false, and the file is already in the table. I changed it to name the cheapest included pick from the plan's tier and every tier above it.
- The guard-run method for Task 1 onward: the staged copy needed a `package.json` with `"type": "module"` at its root, which the plan's method does not mention. I added it to the staged copy only, not to the repository.
- The FW-070 entry, the RELEASES bullet and every document edit were applied exactly as the plan wrote them. Nothing was re-wrapped beyond what the plan allowed.

### What the plan got wrong

- It names `07b3996` as the base it verified against. `origin/main` was `e2b6461` when the work started, one commit later. The plan's claims were still true on that base: the code, tests and documents it quotes matched.
- The "before" text for `commands/refresh-model-tiers.md` covers only the picks template's header sentence. The same file's prose at line 105 also says "the first one", which the plan's Traps and file list do not mention. See Judgment calls.
- The Task 1 red-run list omits the Cursor grants launch case shown above. It passed on rerun, and it is not caused by this change.
- The method for running the three guards alone says "run them the way the self-check runs them" but does not say that the staged tree needs a root `package.json` with `"type": "module"`. Without it every suite fails to load with `Cannot use import statement outside a module`.

### Outstanding

- No developer check: the change has no screen, so there is no `/manual-check` step.
- The fresh-agent check for `framework/workflow.md`, `framework/model-tiers.md` and `commands/sprint.md` is owed, and the specifying session runs it, as the plan says. The executor did not run it.
- The review record, the pull request and the merge are the specifying session's.
- The timing-looking failure of the Cursor grants case in the red run is unexplained. It did not recur in the three later runs, and no rerun was used to hide it.
