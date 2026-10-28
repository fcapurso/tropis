# A project's model picks live in a file it owns — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Nothing in this plan needs the developer until the
> handover.

**Goal:** Tropis ships the tier definitions and `/refresh-model-tiers`, and no picks.
`/refresh-model-tiers` writes a project's picks to `docs/model-picks.md`, which no update
touches and no fingerprint covers; `/dispatch` reads the picks and their date from there,
and says to run `/refresh-model-tiers` when the file does not exist.

**Spec:** the entry `tier-picks-are-project-data` in `feature-catalog.yaml`. Read its five
criteria and the comment above it. The maintainer's decision to ship no starter roster is
recorded in `docs/superpowers/specs/2026-10-19-absorbing-a-flush-finding.md`, *Decisions*,
the bullet on #80.

**What the specifying session verified on 2026-10-19, against `main` at `37e068e`:**

- **Where the picks are today.** `framework/model-tiers.md` holds the tier definitions
  (`### What the tiers mean` and its five-row `| Tier | Can be trusted with |` table) and, in
  the same file, the picks: a `**Last verified: 2026-10-07.**` line, a
  `| Tier | Models | Indicative price (in/out per Mtok) |` table, benchmark notes and a source
  list. It is installed as `.claude/framework/model-tiers.md`, under a fingerprinted root
  (`SHIPPED_ROOTS` in `scripts/installed-files.js` is `.tropis`, `.claude/framework`,
  `.claude/commands`), and has no project-owned block. So `/refresh-model-tiers`, which says
  "Update `.claude/framework/model-tiers.md`", makes the installed-files check name it, and
  the next update writes the new version's text beside it as `.new`.
- **How dispatch reads them.** `scripts/dispatch.mjs` reads
  `.claude/framework/model-tiers.md` into `tiersText` (an empty string when missing), then
  passes `renderThinPrompt` the result of
  `picksForTier(tiersText, protocol.tier) || '(no roster row for this tier)'`,
  `lastVerified ?? '(missing)'` from `parseLastVerified(tiersText)`, and
  `stale: lastVerified ? isStale(lastVerified, new Date()) : false`. With no file it already
  prints a prompt, with "(no roster row for this tier)" and "(missing)".
- **The functions.** In `scripts/plan-binding.js` (pure: strings in, values out):
  `parseLastVerified` matches `Last verified:\s*(\d{4}-\d{2}-\d{2})`; `isStale` is more than
  45 days; `picksForTier` splits on the literal `| Tier | Models |` and returns the second
  cell of the row whose first cell, bold stripped and dashes normalised, equals the tier,
  case-insensitively. `renderThinPrompt` prints:
  ```js
      `**Picks today:** ${picks}`,
      `**Last verified: ${lastVerified}** (\`.claude/framework/model-tiers.md\`)`,
  ```
  and, when `stale`, `'Roster is older than ~45 days — run /refresh-model-tiers before trusting picks.'`.
  Nothing else imports `picksForTier`, `parseLastVerified` or `isStale`
  (`git grep -n "picksForTier\|parseLastVerified\|isStale" -- scripts guards templates fixtures`).
- **What tests it.** `guards/dispatch.test.js`, helper `project(planText)`, copies
  `framework/model-tiers.md` to `.claude/framework/model-tiers.md` in a throwaway set-up
  project and commits it; the first case, *prints a thin prompt that points at the plan,
  from the root and from .tropis/*, asserts `'**Picks today:**'` and
  `/\*\*Last verified: \d{4}-\d{2}-\d{2}\*\*/`. The test plan's tier is `small`.
- **The staleness guard.** `guards/doc-currency.test.js`, *framework staleness*, scans every
  `.md` under `.claude/` for `Last verified:` and fails past 45 days. It is not installed into
  set-up projects (`scripts/set-up-project.sh` copies `catalog-entries`, `rule-areas`,
  `rules-generated`, `installed-files` and `project-layout` only); it runs in the self-check
  against the conformance fixtures, where `fixtures/defects/stale-verification/` plants
  `.claude/framework/model-tiers.md` dated 2020-01-01 (`scripts/check-conformance.sh`,
  `CASES`, `stale-verification:doc-currency`). In a set-up project the staleness check is
  dispatch's own `isStale` warning.
- **What an update touches.** `scripts/take-version.mjs` writes only paths under the
  fingerprinted roots, plus `.claude/settings.json`, `.claude/rule-areas.json`,
  `.gitignore` and `.gitattributes`. `docs/model-picks.md` is none of those.
- **Prose that names the old place:** `commands/refresh-model-tiers.md` (whole file),
  `commands/dispatch.md` (its last paragraph), `framework/dispatch.md` (the *dispatch header*
  bullet, and the line "If the roster is stale the prompt says so."), and `bootstrap.md` (the
  Step 2 bullet naming `.claude/framework/model-tiers.md`, and the Step 7 paragraph beginning
  "**Refresh the model roster first, or prune it.**"). That Step 7 paragraph also says
  `doc-currency` fails a new project's stale roster, which is untrue: that guard is not
  installed into projects. `README.md` and `templates/README.md` only name the command and
  stay as they are. `PORTABILITY-NOTES.md` names both files as where the listing rule lives,
  which stays true.
- **Decision numbering.** The last heading in `framework/DECISIONS.md` is
  `## FW-017: The backlog board is a local page, and bands stay the project's`. The plan
  `2026-10-19-maintainer-absorbs-contributions-in-groups.md`, building now, appends one too.

**Model tier: Medium.** Most text is given verbatim, but the change spans code, guards, a
fixture, four documents and a fresh-agent check whose result needs judging.

**Requires:** any current Claude Code CLI for the fresh-agent check in Task 5 (record which).

**Merge authority: parent review.** It removes content from a shipped framework file and is a
breaking release item.

Do not store a kick-off prompt on this plan.

---

## Delivers

tier-picks-are-project-data

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| framework (`tropis`) | execute here | `git worktree add ../tropis-picks -b plan/tier-picks-are-project-data` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md` in this
  repository.** They are the installed `v0.3.1`; this repository's own dispatch keeps reading
  `.claude/framework/model-tiers.md` until it takes the release that ships this.
- **Do not create `docs/model-picks.md` in this repository.** This repository gets its picks by
  running `/refresh-model-tiers` after it takes the release; see *Not in this plan*.
- **Do not search the web or refresh any roster.** No figure in this plan comes from a search.
- **Do not touch other plans.** The plan `2026-10-19-worktree-setup-comes-from-the-project.md`
  edits the same files after this one merges.
- **Do not lower, skip or delete a guard to get green.**
- Every commit has a body. No co-author or tool-attribution trailer in any commit.

## Decisions

Taken by the specifying session on 2026-10-19. Do not reopen them.

1. **The picks file is `docs/model-picks.md`.** Outside every fingerprinted root, so an update
   never touches it and refreshing it never turns the installed-files check red. Under
   `docs/` rather than `.claude/` because the workflow lets prose under `docs/` go straight to
   `main`, which is how `/refresh-model-tiers` has always committed.

2. **`framework/model-tiers.md`.** Replace the whole file with:

   ````
   # Model tiers
   <!-- layer: framework -->

   Which model to hand a plan to. Tiers are anchored on the kind of work a plan demands —
   the definitions are durable. Which models sit in each tier today is the project's own
   data: `docs/model-picks.md`, written by `/refresh-model-tiers` and read by `/dispatch`.
   The framework ships no picks, and an update never touches that file. Until it exists,
   `/dispatch` names no models and says to run `/refresh-model-tiers`.

   **Listed: only models an executor can select in a tool this framework supports.** A
   model in none of them is not a pick however well it scores; the picks file's notes say
   when one matters. `/refresh-model-tiers` says how the list follows the supported tools.

   ### What the tiers mean

   Tiers are anchored on **the kind of work a plan demands**, not on parameter count or
   vendor. Models move between tiers as the field changes; these definitions do not.

   | Tier | Can be trusted with |
   |---|---|
   | **Small** | Applying verbatim specifications; following an explicit checklist; single-file edits with stated expected output. Plans under ~300 lines. |
   | **Small–medium** | The above, plus coherent multi-file changes where the shape is given. Plans to ~700 lines. |
   | **Medium** | Independent debugging inside a stated approach; choosing between options the plan has framed. |
   | **Medium–large** | Exploratory work against an objective bar — "raise this coverage number", "make this suite pass" — where the route is not specified. Long plans. |
   | **Large** | Open-ended judgment with no mechanical check: what is portable, what belongs in an entry-point file, what a deletion loses. Plans over ~1000 lines. |

   The practical question: can the model hold a plan of the length this project actually
   writes — 300 to 1500 lines, in both projects this came from — and follow it without
   drifting?
   ````

   Check the five table rows and the two paragraphs under `### What the tiers mean` against
   the current file before replacing it: they must be byte-identical to what is there. If
   they are not, keep the current file's text for those parts and say so under *Judgment
   calls*.

3. **`commands/refresh-model-tiers.md`.** Replace the whole file with:

   ````
   ---
   description: Refresh the model tier roster from independent sources
   ---

   Write this project's model picks to `docs/model-picks.md`, creating it if it does not
   exist. The tier definitions are in `.claude/framework/model-tiers.md`: read them, and do
   not edit that file — it is the framework's, and an update replaces it.

   **Do not answer from training data.** This topic moves faster than any cutoff — models
   launch, get deprecated, and get repriced monthly. Every figure must come from a search
   performed now.

   ## What to keep fixed

   **The tier definitions do not change.** They are anchored on the kind of work a plan
   demands, not on the current roster. You are moving models between existing tiers and
   updating prices — not redesigning the scale. If you believe a definition is genuinely
   wrong, say so and stop rather than editing it.

   ## Which models count

   **Only models an executor can select in a tool this framework supports.** Read each
   supported tool's own list of selectable models **first**, from the source, every pass —
   do not carry it over from the previous version of the picks. A model in none of those
   lists does not go in the pick table, however well it scores; it may appear in one short
   note saying what is outside the supported tools and why that matters. Tag every model
   in the pick table with the tools that offer it, or *(all)* for one every supported tool
   offers. `/dispatch` prints that cell as the picks line, so the tag tells the operator
   where each pick can run.

   **When the framework supports another tool, add its model list to this step**, re-tag
   every pick by the tools that actually offer it, and reword every sentence in the picks
   that names or counts the supported tools.

   ## What to gather

   For the models that count, search independent aggregators and benchmark leaderboards,
   not vendor marketing:

   - Artificial Analysis (intelligence and coding indices)
   - SWE-bench Pro and LiveCodeBench leaderboards
   - Terminal-Bench, and any agentic-coding benchmark with published methodology
   - LMArena
   - Independent price trackers

   For each model: current price per million input and output tokens, at least one coding
   benchmark score, and the launch or last-update date.

   ## What to record

   - **Corroboration.** Prefer a figure appearing in two or more independent sources. If a
     model appears in only one, either omit it or mark it explicitly as uncorroborated —
     aggregator sites vary in reliability and some list models that do not exist.
   - **Contamination and self-publication.** Note any benchmark known to be compromised, and
     any score published by the model's own vendor. Both change how much weight a reader
     should give them.
   - **Departures.** Models deprecated, withdrawn, or repriced since the last pass.
   - **Token efficiency** where sources report it. On long plans it matters more than the
     per-token price, and it is frequently the deciding factor between two models at the
     same tier.

   ## The file

   `/dispatch` reads two things from `docs/model-picks.md`, and both must keep this shape:

   - one line `**Last verified: YYYY-MM-DD.**` — the date of this pass. `/dispatch` warns when
     it is more than ~45 days old;
   - one table whose header row begins `| Tier | Models |`, with one row per tier, the tier
     named in bold exactly as the definitions name it. `/dispatch` prints the second cell of
     the plan's tier as its picks.

   Start a new file like this, then add the notes and sources below the table:

   ```
   # Model picks

   Which models this project hands each tier to. The tiers are defined in
   `.claude/framework/model-tiers.md`; this file is written by `/refresh-model-tiers`.

   **Last verified: YYYY-MM-DD.**

   | Tier | Models | Indicative price (in/out per Mtok) |
   |---|---|---|
   | **Large** | … | … |
   | **Medium–large** | … | … |
   | **Medium** | … | … |
   | **Small–medium** | … | … |
   | **Small** | … | … |
   ```

   Everything else in the file — caveats, benchmark figures, positioning notes — is for
   people, and `/dispatch` ignores it.

   ## Finishing

   1. Update the `Last verified` date.
   2. Replace the source list with the URLs actually used this time, under
      `### Sources used this pass`.
   3. Summarise what changed since the previous verification — new entries, tier moves,
      price changes, departures — in the commit body, not in the file. The file states the
      current position; git holds the history.
   4. Commit as `docs(workflow): refresh the model picks`.
   ````

4. **`scripts/plan-binding.js`, `renderThinPrompt`.** `picks` may now be `null`, meaning the
   project has no picks file. In the JSDoc of `renderThinPrompt`, change `picks: string,` to
   `picks: string|null,`. Replace

   ```js
     const lines = [
       `**Tier:** ${protocol.tier} · **Requires:** ${protocol.requires} · **Merge:** ${protocol.merge}`,
       `**Picks today:** ${picks}`,
       `**Last verified: ${lastVerified}** (\`.claude/framework/model-tiers.md\`)`,
     ];
     if (stale) {
       lines.push('Roster is older than ~45 days — run /refresh-model-tiers before trusting picks.');
     }
   ```

   with

   ```js
     const lines = [
       `**Tier:** ${protocol.tier} · **Requires:** ${protocol.requires} · **Merge:** ${protocol.merge}`,
     ];
     // No picks file means the project has never refreshed: name no models rather than
     // invent them. The framework ships none.
     if (picks === null) {
       lines.push('**Picks today:** none — this project has no `docs/model-picks.md`. Run /refresh-model-tiers to write it.');
     } else {
       lines.push(`**Picks today:** ${picks}`);
       lines.push(`**Last verified: ${lastVerified}** (\`docs/model-picks.md\`)`);
       if (stale) {
         lines.push('Picks are older than ~45 days — run /refresh-model-tiers before trusting them.');
       }
     }
   ```

5. **`scripts/dispatch.mjs`.** Replace

   ```js
   let tiersText = '';
   try {
     tiersText = readFileSync(resolve(root, '.claude/framework/model-tiers.md'), 'utf8');
   } catch {
     // No roster: the prompt says so rather than inventing picks.
   }
   const protocol = parseExecutionProtocol(markdown);
   const lastVerified = parseLastVerified(tiersText);
   ```

   with

   ```js
   // The project's own picks, written by /refresh-model-tiers. The framework ships none.
   let picksText = null;
   try {
     picksText = readFileSync(resolve(root, 'docs/model-picks.md'), 'utf8');
   } catch {
     // No picks file: the prompt says to run /refresh-model-tiers.
   }
   const protocol = parseExecutionProtocol(markdown);
   const lastVerified = picksText === null ? null : parseLastVerified(picksText);
   ```

   and replace

   ```js
       picks: picksForTier(tiersText, protocol.tier) || '(no roster row for this tier)',
   ```

   with

   ```js
       picks: picksText === null ? null : (picksForTier(picksText, protocol.tier) || '(no row for this tier)'),
   ```

   Leave the `lastVerified` and `stale` arguments as they are.

6. **`guards/dispatch.test.js`.**
   - In the first case, *prints a thin prompt that points at the plan, from the root and from
     .tropis/*, replace the two lines
     `expect(r.stdout).toContain('**Picks today:**');` and
     `expect(r.stdout).toMatch(/\*\*Last verified: \d{4}-\d{2}-\d{2}\*\*/);` with:

     ```js
           // The project has no picks file, and the framework ships no picks.
           expect(r.stdout).toContain('**Picks today:** none — this project has no `docs/model-picks.md`. Run /refresh-model-tiers to write it.');
           expect(r.stdout).not.toContain('Last verified');
     ```

   - Add `import { parseLastVerified, picksForTier } from '../scripts/plan-binding.js';` after
     the last existing import.
   - Insert these cases directly after that first case:

     ```js
       it("prints the picks and their date from the project's own picks file", () => {
         const { parent, root } = project(plan(PROJECT_ONLY));
         try {
           const today = new Date().toISOString().slice(0, 10);
           writeFileSync(join(root, 'docs/model-picks.md'), `# Model picks\n\n**Last verified: ${today}.**\n\n| Tier | Models | Indicative price (in/out per Mtok) |\n|---|---|---|\n| **Small** | Example Model (all) | $1/$2 |\n`);
           const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
           expect(r.status).toBe(0);
           expect(r.stdout).toContain('**Picks today:** Example Model (all)');
           expect(r.stdout).toContain(`**Last verified: ${today}** (\`docs/model-picks.md\`)`);
           expect(r.stdout).not.toContain('older than ~45 days');
         } finally {
           rmSync(parent, { recursive: true, force: true });
         }
       });

       it('warns when the picks file is older than ~45 days', () => {
         const { parent, root } = project(plan(PROJECT_ONLY));
         try {
           writeFileSync(join(root, 'docs/model-picks.md'), '**Last verified: 2020-01-01.**\n\n| Tier | Models |\n|---|---|\n| **Small** | Old Model |\n');
           const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
           expect(r.stdout).toContain('**Picks today:** Old Model');
           expect(r.stdout).toContain('Picks are older than ~45 days — run /refresh-model-tiers before trusting them.');
         } finally {
           rmSync(parent, { recursive: true, force: true });
         }
       });

       it('ships no picks: the framework tier file has no pick table and no date', () => {
         const shipped = readFileSync(join(blueprint, 'framework/model-tiers.md'), 'utf8');
         for (const tier of ['Small', 'Small–medium', 'Medium', 'Medium–large', 'Large']) {
           expect(picksForTier(shipped, tier)).toBe('');
         }
         expect(parseLastVerified(shipped)).toBeNull();
       });
     ```

   `project()` already creates `docs/superpowers/plans/`, so `docs/` exists.

7. **`guards/take-version.test.js`.** Insert this case directly after the case *takes a
   version*:

   ```js
     it("leaves the project's model picks alone, and they are not a fingerprinted file", () => inWorld({}, (w) => {
       const picks = '# Model picks\n\n**Last verified: 2026-01-01.**\n\n| Tier | Models |\n|---|---|\n| **Small** | Example Model |\n';
       write(w.project, 'docs/model-picks.md', picks);
       // Writing picks, as /refresh-model-tiers does, leaves the installed-files check green.
       expect(recordProblems(w.project)).toEqual([]);
       expect(shippedFiles(w.project)).not.toContain('docs/model-picks.md');
       w.commit('refresh the model picks');
       w.release('v0.2.1', (root) => {
         bumpNext(root);
         edit(root, 'framework/model-tiers.md', (t) => `${t}\nA line from the next version.\n`);
       });

       const r = w.take('v0.2.1');
       expect(r.stderr).toBe('');
       expect(r.status).toBe(0);
       expect(read(w.project, 'docs/model-picks.md')).toBe(picks);
       expect(recordProblems(w.project)).toEqual([]);
     }), SLOW);
   ```

   `write`, `edit`, `read`, `bumpNext`, `recordProblems` and `shippedFiles` are already in
   scope in that file.

8. **`guards/doc-currency.test.js`, *framework staleness*.** The guard dates the picks file
   too. Add `existsSync` to the `node:fs` import. Replace

   ```js
     it('has no framework document whose verification has gone stale', () => {
       const stale = [];
       for (const file of claudeDocs(resolve(root, '.claude'))) {
   ```

   with

   ```js
     it('has no framework document or model picks whose verification has gone stale', () => {
       const stale = [];
       const picks = resolve(root, 'docs/model-picks.md');
       const dated = [...claudeDocs(resolve(root, '.claude')), ...(existsSync(picks) ? [picks] : [])];
       for (const file of dated) {
   ```

   In the comment block above that `it`, replace "model-tiers.md is none of those and is
   exempt from being" with "A project's model picks, `docs/model-picks.md`, are none of those
   and are exempt from being", and rewrap the comment.

9. **The conformance fixture.** Create `fixtures/defects/stale-picks/docs/model-picks.md`:

   ```
   # Model picks

   **Last verified: 2020-01-01.**

   | Tier | Models |
   |---|---|
   | **Small** | Example Model |
   ```

   and in `scripts/check-conformance.sh`, in `CASES`, add the line `stale-picks:doc-currency`
   directly after `stale-verification:doc-currency`. Keep `stale-verification`: it still
   proves the `.claude/` scan.

10. **`commands/dispatch.md`.** Replace its last paragraph,
    "The command does not start a session, and it does not refresh the model roster: if the
    roster is stale, the prompt says so, and `/refresh-model-tiers` is a separate step." with:

    ```
    The command does not start a session, and it does not refresh the model picks: if they
    are stale or the project has none, the prompt says so, and `/refresh-model-tiers` is a
    separate step.
    ```

11. **`framework/dispatch.md`.** Replace the *dispatch header* bullet

    ```
    - **The dispatch header:** the plan's model tier, what it requires, and its merge
      authority; today's picks for that tier from `.claude/framework/model-tiers.md`, and the
      date that roster was last verified — with a warning when it is older than ~45 days,
      because the roster changes and the tier does not.
    ```

    with

    ```
    - **The dispatch header:** the plan's model tier, what it requires, and its merge
      authority; today's picks for that tier from the project's `docs/model-picks.md`, and
      the date they were last verified — with a warning when they are older than ~45 days,
      because picks change and the tier does not. A project with no picks file is told to
      run `/refresh-model-tiers`; the prompt never invents picks.
    ```

    and replace "If the roster is stale the prompt says so. `/refresh-model-tiers` is a
    separate step." with "If the picks are stale or missing the prompt says so.
    `/refresh-model-tiers` is a separate step."

12. **`bootstrap.md`.**
    - Replace the Step 2 bullet
      ```
      - `.claude/framework/model-tiers.md`, `.claude/commands/refresh-model-tiers.md` — keep
        only if plans get dispatched to different models. The roster in it is a snapshot and
        is stale by construction; refresh it before relying on any number.
      ```
      with
      ```
      - `.claude/framework/model-tiers.md`, `.claude/commands/refresh-model-tiers.md` — keep
        only if plans get dispatched to different models. The framework ships the tier
        definitions and no picks; `/refresh-model-tiers` writes this project's own to
        `docs/model-picks.md`.
      ```
    - Replace the Step 7 paragraph beginning "**Refresh the model roster first, or prune
      it.**" and ending "dispatched to different models." with:
      ```
      **Model picks come later.** The setup ships the tier definitions and no picks, so
      nothing here is dated on the day it is copied. Before dispatching the first plan, run
      `/refresh-model-tiers`: it writes `docs/model-picks.md`, and `/dispatch` says to run it
      until that file exists.
      ```

13. **`framework/DECISIONS.md`.** Append after the last decision, separated from it by one
    blank line, as the last decisions in the file are (no `---` between them):

    ```
    ## FW-018: A project's model picks are its own data

    **Date:** 2026-10-19 · **Status:** Accepted

    **Decision:** The framework ships the tier definitions, the rule for which models may be
    listed, and `/refresh-model-tiers`, and no picks. `/refresh-model-tiers` writes a
    project's picks to `docs/model-picks.md`, outside the fingerprinted roots, and
    `/dispatch` reads the picks and their `Last verified` date from there. A project with no
    picks file is told by `/dispatch` to run `/refresh-model-tiers`.

    **Evidence:** The picks shipped inside `.claude/framework/model-tiers.md`, which is
    fingerprinted and has no project-owned block, so refreshing them turned the
    installed-files check red, the next update wrote its own snapshot beside them, and every
    project dispatched with the framework's picks as of its last release. Raised by
    first-adopter and taken in from its flush of 2026-10-19 (`tier-picks-are-project-data`).

    **Rejected:** A starter roster beside the definitions — it is stale on the day it is
    copied, and dispatch already prints a prompt without one. A project-owned block inside
    `model-tiers.md` — the picks are most of what changes in that file, and their date would
    still sit in a file the framework replaces.

    **Consequences:** A project taking this release names no models when it dispatches until
    it runs `/refresh-model-tiers`. One that had refreshed `model-tiers.md` itself moves its
    pick table, date and notes to `docs/model-picks.md` and takes the new file.
    ```

    The number is the next free one: `maintainer-absorbs-contributions-in-groups`, building
    now, also adds a decision and may take FW-018 first. Then use FW-019, and so on.

14. **`RELEASES.md`.** Under `## [Unreleased]`, add this section after the last section
    already there:

    ```
    ### Model picks are the project's own file

    The framework no longer ships model picks. `.claude/framework/model-tiers.md` keeps the
    tier definitions; `/refresh-model-tiers` now writes the picks to `docs/model-picks.md`,
    which an update never touches, and `/dispatch` reads them from there. Until that file
    exists, the dispatch prompt names no models and says to run `/refresh-model-tiers`.
    This is a breaking change: the picks were removed from a file in `.claude/`. After
    updating, run `/refresh-model-tiers`. If you had refreshed the roster in
    `model-tiers.md`, the update leaves the new text beside it as `model-tiers.md.new`: move
    your pick table, its `Last verified` line and your notes into `docs/model-picks.md`, then
    replace `model-tiers.md` with the `.new` file.
    ```

## Traps

- **The source checks have one runner: `bash scripts/check-blueprint.sh`,** on committed
  content only. Commit, then run it. `npm --prefix .tropis test` runs this repository's
  installed `v0.3.1` checks on the repository as a project, and is not a check of this change.
- **`npm --prefix .tropis run dispatch` in this checkout still runs the installed copy,** which
  reads `.claude/framework/model-tiers.md`. That is expected; check the change through the
  self-check and the fresh-agent check, not through that command.
- **Task 1 is red on purpose.** The changed and new dispatch cases, the shipped-no-picks case
  and the conformance line for `stale-picks` must fail before the fix. The take-version case
  passes already: it guards a property the code has, which the plan adds a test for.
- **The conformance run reports `stale-picks` as not caught until Decision 8 lands.** That is
  the fixture working: the guard does not yet read the file.
- **A take-version case may fail once and not again** when another self-check runs at the
  same moment on the same machine. Re-run once before diagnosing; report it if it recurs.
- **`RELEASES.md` and `framework/DECISIONS.md` may conflict on rebase.** Keep every section.

## File Structure

| File | Change |
|---|---|
| `framework/model-tiers.md` | Decision 2 |
| `commands/refresh-model-tiers.md` | Decision 3 |
| `scripts/plan-binding.js` | Decision 4 |
| `scripts/dispatch.mjs` | Decision 5 |
| `guards/dispatch.test.js` | Decision 6 |
| `guards/take-version.test.js` | Decision 7 |
| `guards/doc-currency.test.js` | Decision 8 |
| `fixtures/defects/stale-picks/docs/model-picks.md` | Decision 9, new |
| `scripts/check-conformance.sh` | Decision 9 |
| `commands/dispatch.md` | Decision 10 |
| `framework/dispatch.md` | Decision 11 |
| `bootstrap.md` | Decision 12 |
| `framework/DECISIONS.md` | Decision 13 |
| `RELEASES.md` | Decision 14 |
| `docs/superpowers/plans/2026-10-19-tier-picks-are-project-data.md` | Handover report only |
| `feature-catalog.yaml` | Not edited by the executor; the reviewer promotes the entry |

## Tasks

### Task 1: The checks, red

Decisions 6, 7 and 9. Commit, then run `bash scripts/check-blueprint.sh`.

Expected: red on the dispatch cases of Decision 6 and on `stale-picks` not being caught;
the take-version case green. Paste the failing lines.

### Task 2: The fix, green

Decisions 2, 4, 5 and 8. Commit, then run `bash scripts/check-blueprint.sh`: green, including
the conformance lines for `stale-picks` and `stale-verification`.

### Task 3: The command and the documents

Decisions 3 and 10–14. Commit, then run `bash scripts/check-blueprint.sh`: green.

### Task 4: Search for what still names the old place

```bash
git grep -n -F "model-tiers.md" -- rules framework commands scripts guards templates fixtures README.md bootstrap.md
git grep -n -i "roster" -- rules framework commands scripts guards templates README.md bootstrap.md
```

The first command must at least find `guards/dispatch.test.js`, which copies the shipped
file by that name; if it finds nothing, the search is broken, not clean. Every hit must either name the tier definitions, or be the `stale-verification` fixture, the
`dispatch.test.js` helper that copies the shipped file, or the shipped-no-picks case. A hit
that says picks or a roster live in `model-tiers.md` is a miss: fix it, list the file under
*Judgment calls*, and say the File Structure table was incomplete. Paste both outputs.

### Task 5: Fresh-agent check

`framework/` changed, so this is required. In a scratch folder outside any repository,
`git init` a project, run this branch's `scripts/set-up-project.sh` on it, then
`npm --prefix .tropis install` in it, and commit everything. Write a probe plan at
`docs/superpowers/plans/2026-01-01-probe.md` in it, with **Model tier: Small.** and the
headings and Repositories table the dispatch command requires (copy the shape from
`guards/dispatch.test.js`'s `plan()` helper, with the project folder's own name). Then start
a fresh Claude Code session in the scratch project and give it, in one prompt:

> This is a probe and its output will be discarded. Do not search the web. Record an
> invented model, "Probe Model X", at $1/$2 per million tokens, as this project's Small-tier
> pick, verified today, the way this project's commands say picks are recorded. Then show me
> the kick-off prompt for `docs/superpowers/plans/2026-01-01-probe.md`.

**Pass:** the agent writes `docs/model-picks.md` with a `**Last verified: …**` line and a
`| Tier | Models |` table, leaves `.claude/framework/model-tiers.md` unchanged
(`git diff --quiet -- .claude/framework` exits 0), the kick-off prompt shows
`**Picks today:** Probe Model X` (or that cell as written), and
`npm --prefix .tropis test` passes in the scratch project. **Fail:** any of those does not
hold; read where the agent looked and why, fix the text that sent it there, and run again.

Before the probe, also run `node .tropis/scripts/dispatch.mjs docs/superpowers/plans/2026-01-01-probe.md`
in the scratch project and confirm it prints the "Run /refresh-model-tiers" line.

Record the prompt, what the agent wrote and where, the picks line it got, pass or fail, and
the tool, version and machine, in a commit body on the branch (an empty commit is fine).
Delete the scratch folder.

### Task 6: Handover

```bash
bash scripts/check-blueprint.sh
npm --prefix .tropis test
git diff --stat origin/main...HEAD
```

Expected: both green, and only the files in *File Structure* in the diff.

Append `## Handover report` to this file with the six sections the planning rules name, and
commit. In *Outstanding*, say that the release item is breaking and that the reviewer
promotes the entry.

---

## Criteria and their evidence

| Criterion (short) | Evidence |
|---|---|
| Tropis ships the definitions, the listing rule and the command, and no picks | Decision 6, *ships no picks* case; Decision 2's text |
| The command writes picks to a project-owned file outside the fingerprinted roots, and dispatch reads them from there | Decision 6, *prints the picks and their date…*; Decision 7 (`shippedFiles` does not contain it); Task 5 |
| The staleness check dates that file | Decision 6, *warns when the picks file is older…* (dispatch, the check a project has); Decision 9, `stale-picks` caught by `doc-currency` (the self-check) |
| No picks file: dispatch says to run the command, gives no starter roster | Decision 6, first case |
| An update leaves the picks file untouched; running the command leaves installed-files green | Decision 7; Task 5's `npm --prefix .tropis test` |

## Not in this plan

- **This repository's own picks.** It keeps dispatching from its installed
  `.claude/framework/model-tiers.md` until it takes the release that ships this. After that
  take it has no picks until someone runs `/refresh-model-tiers` here, which writes this
  repository's `docs/model-picks.md`. That is part of taking the release, not of this plan.
- **Installing `doc-currency` into set-up projects.** Their staleness check stays dispatch's
  warning.

## Handover report

### Task completion

All six tasks are done. Task 1 committed the red checks (`ad61e63`). Task 2 committed the fix (`12d17f9`) and, after the self-check named a dangling path, the one-path skip in `guards/framework-integrity.test.js` (`6d73839`). Task 3 committed the command and the documents (`70d545b`). Task 4 corrected the staleness comment that still named `model-tiers.md` (`13a8999`). Task 5 recorded the fresh-agent check (`41c8dcc`). This commit is the handover.

### Verification results

**Task 1.** `bash scripts/check-blueprint.sh` on `ad61e63` exited 1.

```
  caught      stale-verification     doc-currency
  NOT CAUGHT  stale-picks            doc-currency passed against a broken project
...
Clean baseline: every guard must pass
  FAILED      clean baseline — a guard fails on a project with nothing wrong
              ● dispatch command › prints a thin prompt that points at the plan, from the root and from .tropis/
              ● dispatch command › prints the picks and their date from the project's own picks file
              ● dispatch command › ships no picks: the framework tier file has no pick table and no date
              ● dispatch command › warns when the picks file is older than ~45 days
              ● take-version.mjs › removes its scratch folder on every exit path

2 problem(s). A guard that cannot fail is not evidence.
```

The four dispatch cases and `stale-picks` are the red the plan asked for. The scratch-folder case is the race the Traps section names. A re-run of that case alone failed again with leftover `take-version-w3XjVC`, while `tropis-absorb`, `tropis-take-names-absent` and `tropis-next-entries` were each running a self-check on this machine. The clean baseline was green on `6d73839`, `70d545b` and `41c8dcc`, so the case did not stay red.

**Task 2.** On `12d17f9` the new conformance lines were caught (`stale-picks` and `stale-verification`) and the clean baseline failed:

```
              ● framework integrity › references no file that does not exist
```

On `6d73839`, after the path skip: `Every guard caught its defect and passed the clean baseline.` Exit 0.

**Task 3.** On `70d545b`: `Every guard caught its defect and passed the clean baseline.` Exit 0.

**Task 4.** After `13a8999`:

```
bootstrap.md:102:- `.claude/framework/model-tiers.md`, `.claude/commands/refresh-model-tiers.md` — keep
commands/refresh-model-tiers.md:6:exist. The tier definitions are in `.claude/framework/model-tiers.md`: read them, and do
commands/refresh-model-tiers.md:78:`.claude/framework/model-tiers.md`; this file is written by `/refresh-model-tiers`.
framework/DECISIONS.md:644:**Evidence:** The picks shipped inside `.claude/framework/model-tiers.md`, which is
framework/DECISIONS.md:652:`model-tiers.md` — the picks are most of what changes in that file, and their date would
framework/DECISIONS.md:656:it runs `/refresh-model-tiers`. One that had refreshed `model-tiers.md` itself moves its
guards/dispatch.test.js:94:  copyFileSync(join(blueprint, 'framework/model-tiers.md'), join(root, '.claude/framework/model-tiers.md'));
guards/dispatch.test.js:167:    const shipped = readFileSync(join(blueprint, 'framework/model-tiers.md'), 'utf8');
guards/doc-currency.test.js:52: *  "~45 days" in dispatch.md and refresh-model-tiers.md; this is that number. */
guards/take-version.test.js:254:      edit(root, 'framework/model-tiers.md', (t) => `${t}\nA line from the next version.\n`);
```

```
commands/refresh-model-tiers.md:2:description: Refresh the model tier roster from independent sources
commands/refresh-model-tiers.md:16:demands, not on the current roster. You are moving models between existing tiers and
fixtures/defects/stale-verification/.claude/framework/model-tiers.md:6:A roster of the outside world, which goes stale on its own.
framework/DECISIONS.md:650:**Rejected:** A starter roster beside the definitions — it is stale on the day it is
guards/doc-currency.test.js:82:  // world — a model roster, prices, launch dates — and no source of truth in this
scripts/plan-binding.js:178: * Older than the ~45 days the roster itself says it stays trustworthy.
scripts/plan-binding.js:192: * The models the roster lists for a tier, from its `| Tier | Models |` table only.
```

`guards/dispatch.test.js` is in the first search. The `doc-currency.test.js:52` hit is the substring `refresh-model-tiers.md`. The decision's three hits are the historical evidence, the rejected block, and the move-off instruction Decision 13 requires. The fixture hit is the planted stale roster. The two `plan-binding.js` comments describe the text those functions parse. They do not say that text lives in `model-tiers.md`.

**Task 5.** Scratch project `/tmp/picks-probe-1FKGzN`, set up from this branch, then deleted. Before the probe, `node .tropis/scripts/dispatch.mjs docs/superpowers/plans/2026-01-01-probe.md` printed `**Picks today:** none — this project has no `docs/model-picks.md`. Run /refresh-model-tiers to write it.`

The agent wrote `docs/model-picks.md` with `**Last verified: 2026-10-19.**` and a `| Tier | Models |` table. The Small cell is `Probe Model X *(all)*` at `$1 / $2`. `git diff --quiet -- .claude/framework` exited 0, and the diff from the setup commit to that file is empty. The kick-off prompt contains `**Picks today:** Probe Model X *(all)*`. `npm --prefix .tropis test`: `Tests: 28 passed, 28 total`. Pass.

Tool: Claude Code CLI 2.1.300 (`~/.nvm/versions/node/v22.15.0/bin/claude`). Machine: Darwin 25.2.0 arm64, macOS 26.2 (25C56).

**Task 6.** On `41c8dcc`:

`bash scripts/check-blueprint.sh` — `Every guard caught its defect and passed the clean baseline.` Exit 0. `stale-picks` and `stale-verification` both caught.

`npm --prefix .tropis test` — `Tests: 28 passed, 28 total`. Exit 0.

`git diff --stat origin/main...HEAD` before this handover commit:

```
 RELEASES.md                                      | 12 +++
 bootstrap.md                                     | 17 ++---
 commands/dispatch.md                             |  5 +-
 commands/refresh-model-tiers.md                  | 47 ++++++++++--
 fixtures/defects/stale-picks/docs/model-picks.md |  7 ++
 framework/DECISIONS.md                           | 25 ++++++
 framework/dispatch.md                            | 10 ++-
 framework/model-tiers.md                         | 96 ++----------------------
 guards/dispatch.test.js                          | 41 +++++++++-
 guards/doc-currency.test.js                      | 19 +++--
 guards/framework-integrity.test.js               |  3 +
 guards/take-version.test.js                      | 19 +++++
 scripts/check-conformance.sh                     |  1 +
 scripts/dispatch.mjs                             | 11 +--
 scripts/plan-binding.js                          | 16 ++--
 15 files changed, 197 insertions(+), 132 deletions(-)
```

### Scope

Every path in that stat is in the File Structure table except `guards/framework-integrity.test.js`. This handover commit adds this plan file, which the table lists. `feature-catalog.yaml` is not in the diff.

### Judgment calls

- The five tier rows and the two paragraphs under `### What the tiers mean` were byte-identical to the current file (1100 bytes). Decision 2's replacement kept them.
- FW-018 was the next free number. The absorb worktree still ended at FW-017.
- `guards/framework-integrity.test.js` is not in the File Structure table. The guard fails a backtick path under `docs/` that does not exist, and Decision 2's text names `docs/model-picks.md`. The plan forbids creating that file here, and a project has none until it refreshes. The guard is not one `set-up-project.sh` installs. The check now skips that single path and still fails every other dangling path. The table was incomplete.
- The staleness comment said the 45-day figure is stated in `model-tiers.md`. The new tier file does not state it. The comment now points at `dispatch.md` and `refresh-model-tiers.md`. That file was already in the table.
- Commit messages were rewritten with `git commit-tree` so the tool's `Co-authored-by` trailer is not on the branch.

### What the plan got wrong

- Task 2's self-check was not green after Decisions 2, 4, 5 and 8. The clean baseline failed `framework integrity › references no file that does not exist` because the new tier file names `docs/model-picks.md` and that file is absent on purpose.
- The comment above `STALE_AFTER_DAYS` still said `model-tiers.md` states the 45-day limit. Decision 8 did not change that sentence, and it became false.

### Outstanding

- The release item is breaking: the picks were removed from a file in `.claude/`. The reviewer promotes `tier-picks-are-project-data`. This executor did not edit `feature-catalog.yaml`.
- Merge authority is parent review. Branch `plan/tier-picks-are-project-data` in worktree `~/src/tropis-picks`. Not merged.
- If `maintainer-absorbs-contributions-in-groups` takes FW-018 before this lands, keep both decision sections on rebase and renumber one.

## Review record

Reviewed by the specifying session on 2026-10-19.

### Checks re-run

- **The guards re-broken:** the branch's tree staged with `origin/main`'s
  `scripts/dispatch.mjs`, `scripts/plan-binding.js` and `framework/model-tiers.md`, then
  `jest guards/dispatch.test.js`: `4 failed, 9 passed` — the first case and the three new
  ones. Node v22.15.0 on dev-laptop.local, Darwin 25.2.0. `stale-picks` not caught
  before Decision 8 is in the handover's Task 1 run; not re-run.
- **`bash scripts/check-blueprint.sh`** on the rebased head with this record, before merging;
  CI's `self-check` runs on the pull request as well.
- **The diff against the plan:** Decisions 2–14 as written, read in full for the scripts,
  guards and the two dispatch documents; the new `framework/model-tiers.md` keeps the five
  tier rows and both paragraphs unchanged.
- **The fresh-agent check** is reported in the handover (Claude Code 2.1.300, this machine):
  the probe wrote `docs/model-picks.md`, left `.claude/framework/` unchanged, and the prompt
  showed its pick. Not re-run.

### Found

- **The File Structure table was incomplete, and the executor's fix is right.** The new tier
  file names `docs/model-picks.md` in backticks, and `framework-integrity` fails any backticked
  `docs/` path that does not exist. The plan forbade creating the file here. The executor
  skipped that single path in `guards/framework-integrity.test.js`, which set-up projects do
  not get; every other dangling path still fails. Accepted as a small, declared fix.
- **The comment above `STALE_AFTER_DAYS`** would have become false; the executor corrected it.
  Accepted.

### Outstanding disposition

- **Promoted to `shipped` in this commit**, with the two scripts, the tier file and the
  command as modules. Evidence per criterion: *ships no picks* — `dispatch` › *ships no picks:
  the framework tier file has no pick table and no date*; *the command writes a project-owned
  file and dispatch reads it* — `dispatch` › *prints the picks and their date from the
  project's own picks file*, `take-version` › *leaves the project's model picks alone, and they
  are not a fingerprinted file*, and the fresh-agent check; *the staleness check dates that
  file* — `dispatch` › *warns when the picks file is older than ~45 days*, and `stale-picks`
  caught by `doc-currency`; *no picks file: told to run the command, no starter roster* — the
  first `dispatch` case; *an update leaves it untouched and installed-files stays green* — the
  take-version case. The entry skipped `building`: the plans were dispatched without the
  status change.
- **Breaking:** confirmed; the release note says what to do after updating.
- **FW-018:** this plan takes it. `maintainer-absorbs-contributions-in-groups` (pull request
  99, open) also writes FW-018 and renumbers when it rebases onto this.
- **This repository's own picks:** after it takes the release, run `/refresh-model-tiers` here.

### Learnings routed

- None new. A plan that adds a backticked path to a framework document must list
  `guards/framework-integrity.test.js` when the path is absent on purpose; the planning
  rule's question "what is on the other side of this?" already covers it, and this plan
  missed it.

### Merged because

The change is the plan's, the guards it added go red without it, the one file outside the
table is a declared one-line skip that the plan made necessary, and the self-check passes.
