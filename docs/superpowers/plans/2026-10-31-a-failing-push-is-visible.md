# A red main branch is seen by whoever merged and whoever starts next — Implementation Plan

> **For agentic workers:** execute task by task, in order. Read the whole plan first,
> including *Decisions* and *Traps*. Task 0 can stop the plan before it starts, and
> Task 3 can hand back to the specifying session; nothing else stops for the developer.

**Goal:** one read-only command, `node .tropis/scripts/main-status.mjs`, asks GitHub
through `gh` how the pipeline last finished on the main branch and prints one line —
red naming the commit and the run, green, or *could not tell* and why. The backlog
report prints that line first, the isolation helper prints it before it creates a
worktree and creates it anyway, and the workflow's merge sequence ends with
`main-status.mjs --wait HEAD`, which waits for the run the merge started and makes the
merging session stop and say so when it fails. No test reaches the network.

**Spec:** the entry `a-failing-push-is-visible` in `feature-catalog.yaml` and the
comment above it (reshaped 2026-10-31: the host's gate is the sibling entry
`main-is-gated-by-the-host`, a separate plan that lands **first**; this entry keeps what
no gate covers). Its band is in `docs/backlog-board/bands.yaml` (band A, bundle
`main-stays-green`: "The failure that started this, narrowed to what the host's gate
cannot catch. Do it with the gate, after it."). There is no design document; the
decisions below are the design, taken with the developer on 2026-10-31. The 2026-10-31
plans' review records were read: their lessons that apply here are in *Traps*.

**What the specifying session verified on 2026-10-31, against `dd165ba` (the commit
carrying the reshaped entry), with git 2.43.0, Node v22.23.4 and gh 2.89.0, in a Claude
Code cloud session (Opus 5.5) on Linux, x86_64:**

- `scripts/next.mjs` resolves the project root from its own location
  (`const root = resolve(here, '../..')`), parses the catalog and bands at the top, and
  prints nothing until the `if (hasBandRows(bands)) {` block, whose first output is the
  `Next step:` line. It imports `./board-bands.js`, `./next-work.js` and
  `./readme-freshness.js`.
- `scripts/isolate-for-plan.mjs` validates the plan, then resolves **every** row to a
  checkout (the `targets` array) and exits 1 before creating anything if one cannot be
  found; only then does the loop `for (const { isolation, cwd } of targets) {` create
  each worktree and print `isolated in <cwd>: <command>`. `repoRoot` is the checkout it
  was run from. `scripts/isolate-for-plan.sh` only `exec`s it.
- `guards/next-report.test.js` copies `['next.mjs', 'next-work.js', 'board-bands.js',
  'readme-freshness.js']` into a staged `.tropis/scripts/` in **five** places (the
  helper `stageReport`, three inline tests, and `stageShippedSince`). None of its staged
  folders has an `origin` remote: `stageReport` and the three inline tests do not run
  `git init`; `stageShippedSince` does, and adds no remote. The test *is unchanged
  without bands* compares the whole report byte for byte with `UNCHANGED_WITHOUT_BANDS`;
  every other test uses `toContain`, `indexOf` or regular expressions, and every test
  that checks stderr expects it empty. Baseline: 24 tests pass.
- `guards/dispatch.test.js` builds each project by copying every file listed in
  `scripts/installed-scripts.txt` into `.tropis/scripts/`; its repositories have no
  remote. Its three *isolation helper* tests assert exit status, worktree ownership and
  stderr, never stdout. Baseline: 16 tests pass.
- `scripts/installed-scripts.txt` is read by `scripts/set-up-project.sh`,
  `scripts/check-conformance.sh`, `guards/dispatch.test.js` and
  `guards/set-up-project.test.js`; adding a line installs the file everywhere.
- `guards/check-drift.test.js` (*finds a declaration of what is shared in every script
  the blueprint ships*) fails on any `.sh`, `.mjs` or `.js` in `scripts/` that does not
  contain `Shared machinery`.
- `guards/framework-integrity.test.js` fails on a backticked path **starting** with
  `src/`, `docs/`, `scripts/`, `.claude/` or `.github/` that does not exist, in the
  installed rules, framework documents and commands. A path written
  `.tropis/scripts/main-status.mjs` starts with `.tropis/` and is not checked.
- `scripts/pipeline.mjs` calls itself "the host-neutral pipeline", runs only inside CI
  (every command in `commandList()`), and runs its command-line block only when it is
  the program (`ranDirectly`), the pattern the new script copies.
- `templates/pipeline-caller.yml`, installed as `.github/workflows/pipeline.yml`, runs
  on `push` to `[main]` and on `pull_request`; this repository's own
  `.github/workflows/pipeline.yml` is the same.
- **`gh repo view` does not work in a Claude Code cloud session**: it uses GraphQL, and
  this session got `HTTP 403: GitHub GraphQL is not available from Claude Code
  sessions; use the REST API`. `gh api 'repos/{owner}/{repo}'` (REST; gh fills the
  placeholders from the git remote) answered with JSON whose `default_branch` is `main`.
  `gh run list` is REST and worked.
- `gh run list --workflow pipeline.yml --event push --commit <sha> --json …` returned
  this repository's run for a **full** 40-character hash and `[]` for the same commit's
  7-character prefix.
- `git symbolic-ref refs/remotes/origin/HEAD` fails in this checkout ("not a symbolic
  ref"): `origin/HEAD` is not reliably set, so it cannot name the default branch.
- **The code and tests below were run before this plan was written**, in a staged
  `git archive` of `dd165ba` with *Decisions 2–5* applied and the tests of Task 1:
  `guards/main-status.test.js` 21 passed; `guards/next-report.test.js` 25 passed;
  `guards/dispatch.test.js` 18 passed; `check-drift` and `set-up-project` passed. With
  `scripts/next.mjs` and `scripts/isolate-for-plan.mjs` restored to `dd165ba`, exactly
  four tests failed: *is unchanged without bands*, *says on its first line when the
  main branch is red*, and the two new *isolation helper* tests. With the workflow and
  `commands/next.md` text of Task 2 also applied (not the operator guide or the
  catalog), `bash scripts/check-blueprint.sh` on that stage, committed, ended
  `Self-check passed: every guard caught its defect, the clean baseline passed, and the
  framework repository's own guards passed.` The script, run by
  hand in this checkout against the real host, printed `Main branch: green — the
  pipeline passed on 243c1b8 (…).`

**How a single source guard is run.** The repository root has no `package.json`, so a
guard under `guards/` cannot be run in place. Stage committed content the way
`scripts/check-blueprint.sh` does, from the worktree root, after committing:

```bash
S="$(mktemp -d)" && git archive HEAD | tar -x -C "$S" \
  && echo '{"type":"module"}' > "$S/package.json" \
  && cp "$S/templates/framework-jest.config.js" "$S/jest.config.js" \
  && ln -s "$PWD/.tropis/node_modules" "$S/node_modules" \
  && (cd "$S" && node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js guards/main-status.test guards/next-report.test guards/dispatch.test); rm -rf "$S"
```

Name test files by path (`guards/dispatch.test`), not by a bare word: `dispatch` also
matches `guards/plan-dispatchable.test.js`, which fails in an export because
`docs/superpowers/` is export-ignored. To check this plan file itself, run that guard
from the same stage with `FRAMEWORK_ROOT="$OLDPWD"` (the worktree), not the export.

**Model tier: Medium.** The code, the tests, the workflow and command text and the
operator guide's paragraph are given verbatim, and were run. What needs judgment is
re-applying the workflow edit to whatever text the sibling plan leaves, and running two
fresh-agent probes and judging their replies.

**Requires:** the plan `main-is-gated-by-the-host` merged to `main` first (Task 0 checks).

**Merge authority: parent review.** It changes the workflow every session follows at
merge, a command, and two scripts every project runs; and its workflow edit sits on top
of another plan's.

Do not store a kick-off prompt on this plan.

---

## Delivers

a-failing-push-is-visible

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
| `tropis` | execute here | `git worktree add ../tropis-red-main -b plan/a-failing-push-is-visible` |

## Global Constraints

- **Do not edit `.claude/`, `.tropis/`, `.cursor/`, `CLAUDE.md` or `AGENTS.md`.** They
  are the installed release. Edit `framework/`, `commands/`, `scripts/`, `guards/` and
  `templates/`.
- **Add no dependency. Do not lower, skip or delete a guard.** Every commit has a body.
- **Push only to this plan's branch.** Open a pull request; do not merge.
- **No test may reach the network.** A test that gives a repository a `github.com`
  origin puts a stub `gh` first on `PATH` in the same test.
- **This repository is public.** No hostnames, home paths or personal names in anything
  you commit, the handover included. Name the worktree `../tropis-red-main`. The
  example repository in tests is `acme/example`.

## Decisions

Taken by the specifying session with the developer on 2026-10-31.

### 1. One command, in a file of its own

`scripts/main-status.mjs`, installed as `.tropis/scripts/main-status.mjs`: a module
exporting `mainStatus` and `waitForRun`, and a command when run directly. Not a
subcommand of `pipeline.mjs`: that script is the host-neutral pipeline and runs inside
CI, while this one asks GitHub specifically and runs on a person's machine; and the
backlog report would have to import all of `pipeline.mjs` to print one line, which every
staged test of the report would then have to copy. No `npm` script: the merge sequence
and the operator guide name `node .tropis/scripts/main-status.mjs`, the way the guide
already names `node .tropis/scripts/pipeline.mjs`.

### 2. What it asks and what it prints

- **Only a GitHub origin is asked about.** It reads `git remote get-url origin` first,
  and runs `gh` only when that is a `github.com` repository (`https://`, `git@` or
  `ssh://`). So a repository with no origin, or one elsewhere, never runs `gh` — which is
  what keeps every existing test of the report and the helper off the network.
- **The main branch is the repository's default branch, from the REST API:**
  `gh api 'repos/{owner}/{repo}'`, field `default_branch`. Not `origin/HEAD`, which is
  often unset (it is unset in this checkout); not `gh repo view`, which needs GraphQL and
  is refused in Claude Code cloud sessions (verified above). The default branch is also
  what the sibling plan's ruleset gates.
- **The runs:** `gh run list --workflow pipeline.yml --branch <default> --event push
  --limit 20 --json status,conclusion,headSha,url,createdAt,displayTitle`, newest first
  by `createdAt`. The last **finished** run is the newest with `status` `completed` and a
  conclusion of `success` (green) or `failure`, `timed_out` or `startup_failure` (red).
  Any other conclusion — `cancelled`, `skipped`, `neutral`, `stale`, `action_required` —
  says nothing about the code and is skipped.
- **One line, always on stdout, and exit 0 without `--wait`**:
  - `Main branch: red — the pipeline failed on <sha7> (<title>). Run: <url>`
  - `Main branch: green — the pipeline passed on <sha7> (<title>).`
  - `Main branch: could not tell — <reason>.`, the reason one of: `no remote named
    origin`; `origin is not on GitHub`; `gh is not installed`; `gh did not answer within
    20 seconds`; `gh failed: <gh's first stderr line>` (not signed in reads `gh failed:
    To get started with GitHub CLI, please run:  gh auth login`); `gh answered with
    something other than JSON`; `no finished push run of pipeline.yml on <branch>`.
- **Green prints a line, not nothing.** The entry demands a line only when it could not
  tell, but *a hook that emits nothing looks exactly like a hook with nothing to say*
  (`harness-scripts.md`): silence on green is indistinguishable from a status that never
  ran, and the report's first line keeps one shape.
- **`--wait <commit>`** resolves the commit locally to its full hash (`git rev-parse
  --verify --quiet <commit>^{commit}`, since GitHub matches only a full hash), then asks
  `gh run list --workflow pipeline.yml --commit <hash> --event push --limit 20 --json …`
  at once and every 30 seconds (`--interval <seconds>`) for up to 30 minutes
  (`--timeout <minutes>`), until the newest run on that commit is `completed`. It writes
  one progress line to stderr when it starts. Then: green line, exit 0; red line, exit
  1; another conclusion, `could not tell — the pipeline run on <sha7> ended <conclusion>
  (<url>)`, exit 0; no finished run by the timeout, `Main branch: still running — no
  pipeline run on <sha7> finished within <minutes> minutes.`, exit 3. Could not ask, as
  above: exit 0. A command line it does not understand, or `--interval`/`--timeout`
  without `--wait`, prints the usage to stderr and exits 2; a commit it cannot resolve
  prints `main-status: <commit> is not a commit here` and exits 2.
- **Each `gh` call has a 20-second limit**, so a hung `gh` cannot hang the report.

### 3. The three moments

- **The backlog report** (`scripts/next.mjs`) prints the line, then an empty line,
  before anything else.
- **The isolation helper** (`scripts/isolate-for-plan.mjs`) prints the line after it has
  resolved every row and before it creates the first worktree — so a plan it refuses
  prints no status — and then creates the worktrees as before. The kick-off prompt
  `/dispatch` prints is unchanged: the line explains itself, and the executor's work goes
  on.
- **The merge sequence** in `framework/workflow.md` ends with
  `node .tropis/scripts/main-status.mjs --wait HEAD`, after the step that puts the merge
  commit on the local main branch; on exit 1 the session says so and stops, and repairing
  it is the next piece of work, through a pull request. `commands/next.md` tells the agent
  to report the first line first.

Not a hook, and nothing runs on every command: the first proposal was a hook on every
push, dropped as a network call per command (the catalog comment above the entry). No
notifications.

### 4. No decision record

The real alternative — a hook on every push against three existing moments — was
settled with the developer and is recorded in the catalog comment above the entry; the
gate the developer chose instead is the sibling plan's. What this plan decides beyond
that (a separate file, the REST call, printing green) is implementation, recorded here.
If the sibling plan's merged decision record does not mention the dropped hook, say so
under *Outstanding*; do not write a record here.

## Traps

- **The sibling plan must have merged first, and its workflow text wins.** It also
  edits `framework/workflow.md`; where the main branch is gated it changes the merge
  sequence to a pull request that merges itself once green (`gh pr merge --auto`). The
  workflow edit in *Task 2* is written against the text at `dd165ba`. Apply it to the
  sequence as the sibling plan left it: the wait goes **after the step at which the
  merge commit is on the local main branch** (today, `git checkout main && git pull
  origin main`), as the last line of that code block, and the paragraph goes after that
  section's last paragraph. If the sibling plan leaves no step at which the session has
  the merge commit on its main branch — the merge happens later, by itself, and the
  sequence ends before it — **stop after Task 1 and hand back**: say what the sequence
  now says, and do not invent a step. Adjust the selectors of the workflow test in
  *Task 1* (the section heading, the code fence) to the text you find, and keep its two
  assertions: the merge sequence's code block ends with the wait, and the section says
  exit 1 means red and to stop.
- **The byte-for-byte test changes on purpose.** *is unchanged without bands* gains the
  status line and an empty line at the top. That is the change the entry asks for, not a
  weakened test; the rest of the expected report is untouched.
- **Every copy list in `guards/next-report.test.js` must carry `main-status.mjs`**, or
  every test there fails on the import. Task 1 replaces the five literal lists with one
  constant.
- **A `--wait` test with a run that never finishes waits 30 minutes** unless it passes
  `--interval` and `--timeout`. Every `--wait` test below does; keep it so.
- **A test that adds a `github.com` origin without the stub reaches the network.** The
  existing tests of the report and the helper are safe only because their repositories
  have no origin.
- **Write `.tropis/scripts/main-status.mjs` in framework documents and commands**, never
  `scripts/main-status.mjs`: the integrity guard checks backticked `scripts/…` paths
  against the project tree, where the file sits under `.tropis/`.
- **Do not "simplify" `gh api 'repos/{owner}/{repo}'` to `gh repo view`**, nor pass a
  short hash to `--commit`: both were measured to fail (see the verified facts).
- **An agent tool may stop a foreground command after a few minutes** (Claude Code's
  limit is 10). That is why the workflow says to run the wait in the background or run
  it again; it is not a defect of the script.
- **The self-check reads committed content only.** Commit, then run it.
- **One test stays red from Task 1 to Task 2, on purpose.** The last test in
  `guards/main-status.test.js` reads the workflow text Task 2 writes. A 2026-10-31 plan
  asked for "every test green" at a step where one test still waited for a later task;
  this plan names the one test instead. Do not move it, skip it, or write Task 2 early
  to turn it green.
- **`docs/backlog-board/bands.yaml` stays as it is.** A shipped entry's band is dropped
  by the next `/refresh-board`.
- **Status.** Whatever status the entry has on your branch (`shaped` or `building`),
  Task 5 sets it to `shipped`; do not set `building` yourself.

## File Structure

| File | Change |
|---|---|
| `scripts/main-status.mjs` | new: *Decisions 1–2* (Task 1) |
| `scripts/installed-scripts.txt` | add `main-status.mjs` as the last line |
| `scripts/next.mjs` | import `mainStatus`; print its line and an empty line first |
| `scripts/isolate-for-plan.mjs` | import `mainStatus`; print its line before creating worktrees |
| `guards/main-status.test.js` | new (Task 1) |
| `guards/next-report.test.js` | `REPORT_FILES`; the expected report's first two lines; one new test |
| `guards/dispatch.test.js` | `chmodSync` import; two new *isolation helper* tests |
| `framework/workflow.md` | *Merge and clean up*: the wait, and its paragraphs (Task 2) |
| `commands/next.md` | one paragraph after the project-owned block (Task 2) |
| `templates/README.md` | one paragraph in *What to type* (Task 2) |
| `feature-catalog.yaml` | the entry to `shipped`, `modules`, a comment mapping criteria to tests (Task 5) |
| `docs/superpowers/plans/2026-10-31-a-failing-push-is-visible.md` | the handover report |

Nothing else changes: not `scripts/plan-binding.js` (the prompt), not
`scripts/pipeline.mjs`, not the workflow templates, not `framework/DECISIONS.md`
(*Decision 4*), not `guards/framework-integrity.test.js` (no exemption is needed: no
document names `scripts/main-status.mjs`), not the root `README.md` (`/refresh-readme`
keeps it), not the bands file. `guards/check-drift.test.js` and
`guards/set-up-project.test.js` read the new script and the list without changing.

## Tasks

### Task 0 — Is the sibling plan merged? Then set up

1. **First, before creating anything**, from the primary checkout:

   ```bash
   git fetch origin
   git show origin/main:docs/superpowers/plans/2026-10-31-main-is-gated-by-the-host.md | grep -c '^## Review record'
   ```

   Passing prints `1` (a review record is committed only as a plan merges). Anything
   else — `0`, or `fatal: path … does not exist` — means the sibling plan has not
   merged. Then **stop**: print "a-failing-push-is-visible waits for
   main-is-gated-by-the-host to merge, because both edit the merge sequence in
   framework/workflow.md; dispatch it again once that plan's pull request has merged",
   create nothing, and report. On resumption, run the same check again.
2. Isolate (the Repositories table), then in the worktree run `npm --prefix .tropis ci`,
   `git status --porcelain` (expected: nothing) and `bash scripts/check-blueprint.sh`
   (expected: last line starts `Self-check passed`). Record all three, and the commit
   you started from.
3. Read the sibling plan's handover and review record on `main`, and the merge sequence
   in `framework/workflow.md` as it now stands. Note in the handover what changed there.

### Task 1 — The command, its three uses, and their tests

Create `scripts/main-status.mjs` with exactly this content:

```js
#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * Says whether the main branch's pipeline is red, asking GitHub through `gh`.
 *
 * Read-only. With no arguments it prints one line about the last finished push run of
 * the pipeline workflow (.github/workflows/pipeline.yml) on the repository's default
 * branch, and exits 0 whatever it found. With --wait <commit> it waits for the push run
 * on that commit to finish, prints one line, and exits 0 green, 1 red, 3 still running
 * at the timeout. Where it cannot ask — origin not on GitHub, no gh, gh failing — it
 * prints that it could not tell and why, and exits 0.
 *
 * The backlog report and the isolation helper import mainStatus; the workflow's merge
 * sequence runs --wait. gh is never run unless origin is on GitHub, so a repository
 * without such a remote — every test's — never reaches the network. The default branch
 * comes from the REST API (`gh api repos/{owner}/{repo}`), not `gh repo view`, which
 * needs GraphQL, and GraphQL is refused in some agent sessions.
 */
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WORKFLOW = 'pipeline.yml';
const FIELDS = 'status,conclusion,headSha,url,createdAt,displayTitle';
// A finished run counts as red on these; success is green; any other conclusion
// (cancelled, skipped, neutral, stale, action_required) says nothing about the code.
const RED = new Set(['failure', 'timed_out', 'startup_failure']);
const GITHUB_REMOTE = /^(?:https:\/\/(?:[^@/\s]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)[^/\s]+\/[^/\s]+$/;
const LINE = 'Main branch:';

const short = (sha) => String(sha).slice(0, 7);
const unknown = (reason) => ({ state: 'unknown', line: `${LINE} could not tell — ${reason}.` });
const verdict = (run) => (RED.has(run.conclusion)
  ? { state: 'red', line: `${LINE} red — the pipeline failed on ${short(run.headSha)} (${run.displayTitle}). Run: ${run.url}` }
  : { state: 'green', line: `${LINE} green — the pipeline passed on ${short(run.headSha)} (${run.displayTitle}).` });
const newestFirst = (runs) => [...runs].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

/** {} when origin is a GitHub repository, else { error }. Runs git only. */
function originOnGitHub(root, env) {
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, env, encoding: 'utf8' });
  if (r.status !== 0) return { error: 'no remote named origin' };
  const url = r.stdout.trim().replace(/\/$/, '').replace(/\.git$/, '');
  return GITHUB_REMOTE.test(url) ? {} : { error: 'origin is not on GitHub' };
}

/** gh's answer parsed as JSON, as { value }, or { error } saying why there is none. */
function askGh(root, args, { env, ghTimeoutMs }) {
  const r = spawnSync('gh', args, { cwd: root, env, encoding: 'utf8', timeout: ghTimeoutMs });
  if (r.error?.code === 'ENOENT') return { error: 'gh is not installed' };
  if (r.error?.code === 'ETIMEDOUT') return { error: `gh did not answer within ${ghTimeoutMs / 1000} seconds` };
  if (r.error) return { error: `gh could not run: ${r.error.message}` };
  if (r.status !== 0) {
    const first = (r.stderr || '').split('\n').map((l) => l.trim()).find(Boolean);
    return { error: `gh failed: ${(first ?? `exit ${r.status}`).replace(/\.$/, '')}` };
  }
  try {
    return { value: JSON.parse(r.stdout) };
  } catch {
    return { error: 'gh answered with something other than JSON' };
  }
}

function runsOn(root, filter, options) {
  const asked = askGh(root, ['run', 'list', '--workflow', WORKFLOW, ...filter, '--event', 'push',
    '--limit', '20', '--json', FIELDS], options);
  if (asked.error) return asked;
  if (!Array.isArray(asked.value)) return { error: 'gh answered with something other than a list of runs' };
  return { value: newestFirst(asked.value) };
}

/**
 * The last finished push run of the pipeline on the default branch, as one line.
 * @param {string} root the repository root
 * @param {{ env?: NodeJS.ProcessEnv, ghTimeoutMs?: number }} [options]
 * @returns {{ state: 'red' | 'green' | 'unknown', line: string }}
 */
export function mainStatus(root, { env = process.env, ghTimeoutMs = 20000 } = {}) {
  const options = { env, ghTimeoutMs };
  const origin = originOnGitHub(root, env);
  if (origin.error) return unknown(origin.error);
  const repo = askGh(root, ['api', 'repos/{owner}/{repo}'], options);
  if (repo.error) return unknown(repo.error);
  const branch = repo.value?.default_branch;
  if (typeof branch !== 'string' || branch === '') return unknown('GitHub named no default branch');
  const runs = runsOn(root, ['--branch', branch], options);
  if (runs.error) return unknown(runs.error);
  const finished = runs.value.find((run) => run.status === 'completed'
    && (run.conclusion === 'success' || RED.has(run.conclusion)));
  return finished ? verdict(finished) : unknown(`no finished push run of ${WORKFLOW} on ${branch}`);
}

/**
 * Waits for the push run of the pipeline on one commit to finish.
 * @param {string} root the repository root
 * @param {string} sha the full commit hash
 * @returns {Promise<{ state: string, line: string, exit: number }>}
 */
export async function waitForRun(root, sha, {
  env = process.env, ghTimeoutMs = 20000, intervalMs = 30000, timeoutMs = 1800000,
} = {}) {
  const options = { env, ghTimeoutMs };
  const origin = originOnGitHub(root, env);
  if (origin.error) return { ...unknown(origin.error), exit: 0 };
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const runs = runsOn(root, ['--commit', sha], options);
    if (runs.error) return { ...unknown(runs.error), exit: 0 };
    const run = runs.value[0];
    if (run?.status === 'completed') {
      if (run.conclusion === 'success') return { ...verdict(run), exit: 0 };
      if (RED.has(run.conclusion)) return { ...verdict(run), exit: 1 };
      return { ...unknown(`the pipeline run on ${short(sha)} ended ${run.conclusion} (${run.url})`), exit: 0 };
    }
    if (Date.now() >= deadline) {
      return {
        state: 'waiting',
        line: `${LINE} still running — no pipeline run on ${short(sha)} finished within ${timeoutMs / 60000} minutes.`,
        exit: 3,
      };
    }
    await new Promise((done) => { setTimeout(done, intervalMs); });
  }
}

const USAGE = 'usage: main-status.mjs [--wait <commit> [--interval <seconds>] [--timeout <minutes>]]\n';

/** The options the command line asks for, or null when it is not understood. */
function parseArgs(argv) {
  const opts = { intervalMs: 30000, timeoutMs: 1800000 };
  if (argv.length === 0) return opts;
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined || value === '') return null;
    if (flag === '--wait' && !value.startsWith('-')) opts.commit = value;
    else if (flag === '--interval' && Number(value) >= 0) opts.intervalMs = Number(value) * 1000;
    else if (flag === '--timeout' && Number(value) > 0) opts.timeoutMs = Number(value) * 60000;
    else return null;
  }
  return opts.commit ? opts : null;
}

const ranDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (ranDirectly) {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  const root = top.status === 0 ? top.stdout.trim() : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) {
    process.stderr.write(USAGE);
    process.exitCode = 2;
  } else if (!opts.commit) {
    process.stdout.write(`${mainStatus(root).line}\n`);
  } else {
    const resolved = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${opts.commit}^{commit}`], { cwd: root, encoding: 'utf8' });
    if (resolved.status !== 0) {
      process.stderr.write(`main-status: ${opts.commit} is not a commit here\n`);
      process.exitCode = 2;
    } else {
      const sha = resolved.stdout.trim();
      process.stderr.write(`main-status: waiting for the pipeline run on ${short(sha)}, asking every ${opts.intervalMs / 1000} s for up to ${opts.timeoutMs / 60000} min\n`);
      const result = await waitForRun(root, sha, opts);
      process.stdout.write(`${result.line}\n`);
      process.exitCode = result.exit;
    }
  }
}
```

Append `main-status.mjs` as the last line of `scripts/installed-scripts.txt`.

In `scripts/next.mjs`, after the line
`import { readmeFreshnessAt } from './readme-freshness.js';` add
`import { mainStatus } from './main-status.mjs';`, and after the line
`const bundles = bandRows ? bandBundles(bandRows) : {};` add:

```js

// First, whether the main branch's pipeline is red: main-status.mjs.
console.log(mainStatus(root).line);
console.log('');
```

In `scripts/isolate-for-plan.mjs`, after the `plan-binding.js` import add
`import { mainStatus } from './main-status.mjs';`, and immediately before
`for (const { isolation, cwd } of targets) {` add:

```js
// Before any worktree: whether the main branch is red. It informs; isolation goes on.
process.stdout.write(`${mainStatus(repoRoot).line}\n`);

```

Create `guards/main-status.test.js` with exactly this content (its last test reads the
workflow text Task 2 writes, so it is red until then — see the run order below):

```js
// Level: unit
/**
 * The main branch's pipeline status: one line, from GitHub through gh, or a line saying
 * why it could not tell.
 *
 * Runs the shipped main-status.mjs in throwaway repositories against a stub gh placed
 * first on PATH, so nothing here reaches GitHub. A repository whose origin is not on
 * GitHub must never run gh at all; the stub's log shows it.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync, symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mainStatus } from '../scripts/main-status.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const blueprint = resolve(here, '..');
const script = join(blueprint, 'scripts/main-status.mjs');

// Logs every call as one line. `api` answers the default branch; `run list` answers
// runs-<n>.json on its n-th call when that file exists, and runs.json otherwise.
const STUB_GH = `#!/usr/bin/env bash
echo "$*" >> "$STUB_DIR/gh.log"
case "$1 $2" in
  "api repos/{owner}/{repo}") echo "{\\"default_branch\\":\\"\${STUB_DEFAULT:-main}\\"}"; exit 0 ;;
  "run list")
    n=$(( $(cat "$STUB_DIR/count" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$STUB_DIR/count"
    f="$STUB_DIR/runs-$n.json"; [ -f "$f" ] || f="$STUB_DIR/runs.json"
    cat "$f"; exit 0 ;;
esac
echo "stub gh: unexpected call: $*" >&2
exit 99
`;

const run = (status, conclusion, headSha, createdAt, extra = {}) => ({
  status, conclusion, headSha, createdAt, displayTitle: `title of ${headSha.slice(0, 7)}`,
  url: `https://github.com/acme/example/actions/runs/${headSha.slice(0, 4)}`, ...extra,
});
const RED_RUN = run('completed', 'failure', 'bad0000aaaaaaaa', '2026-10-31T11:00:00Z');
const GREEN_RUN = run('completed', 'success', 'good000bbbbbbbb', '2026-10-31T10:00:00Z');
const GOING = run('in_progress', '', 'busy000cccccccc', '2026-10-31T12:00:00Z');
const CANCELLED = run('completed', 'cancelled', 'gone000dddddddd', '2026-10-31T11:30:00Z');

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

describe('main branch status', () => {
  let dir;
  let repo;
  let env;
  const log = () => readFileSync(join(dir, 'gh.log'), 'utf8');
  const runs = (list, n) => writeFileSync(join(dir, n ? `runs-${n}.json` : 'runs.json'), JSON.stringify(list));
  const cli = (...args) => spawnSync('node', [script, ...args], { cwd: repo, env, encoding: 'utf8' });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'main-status-'));
    mkdirSync(join(dir, 'bin'));
    writeFileSync(join(dir, 'bin/gh'), STUB_GH);
    chmodSync(join(dir, 'bin/gh'), 0o755);
    writeFileSync(join(dir, 'gh.log'), '');
    runs([]);
    repo = join(dir, 'repo');
    mkdirSync(repo);
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'seed');
    git(repo, 'remote', 'add', 'origin', 'https://github.com/acme/example.git');
    env = { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, STUB_DIR: dir };
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('names the commit and the run when the last finished run failed, and exits 0', () => {
    runs([GOING, RED_RUN, GREEN_RUN]);
    const r = cli();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(
      'Main branch: red — the pipeline failed on bad0000 (title of bad0000). '
      + 'Run: https://github.com/acme/example/actions/runs/bad0\n',
    );
    expect(log()).toBe(
      'api repos/{owner}/{repo}\n'
      + 'run list --workflow pipeline.yml --branch main --event push --limit 20 '
      + '--json status,conclusion,headSha,url,createdAt,displayTitle\n',
    );
  });

  it('says green on one line when the last finished run passed', () => {
    runs([GOING, GREEN_RUN, RED_RUN].map((r, i) => ({ ...r, createdAt: `2026-10-31T1${2 - i}:00:00Z` })));
    const r = cli();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('Main branch: green — the pipeline passed on good000 (title of good000).\n');
  });

  it('skips a run that was cancelled', () => {
    runs([CANCELLED, RED_RUN]);
    expect(cli().stdout).toContain('Main branch: red — the pipeline failed on bad0000');
  });

  it('asks about the default branch GitHub names', () => {
    runs([RED_RUN]);
    env.STUB_DEFAULT = 'trunk';
    expect(cli().status).toBe(0);
    expect(log()).toContain('--branch trunk ');
  });

  it.each([
    ['no finished run', () => runs([GOING]), 'no finished push run of pipeline.yml on main'],
    ['gh failing', () => writeFileSync(join(dir, 'bin/gh'),
      '#!/usr/bin/env bash\necho "To get started with GitHub CLI, please run:  gh auth login" >&2\nexit 4\n'),
    'gh failed: To get started with GitHub CLI, please run:  gh auth login'],
    ['gh answering something else', () => writeFileSync(join(dir, 'runs.json'), 'not json'),
      'gh answered with something other than JSON'],
  ])('says it could not tell, and why, for %s', (_, arrange, reason) => {
    arrange();
    const r = cli();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(`Main branch: could not tell — ${reason}.\n`);
  });

  it('says gh is not installed when there is none on PATH', () => {
    const bare = join(dir, 'bare');
    mkdirSync(bare);
    for (const tool of ['node', 'git']) {
      symlinkSync(spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim(), join(bare, tool));
    }
    env.PATH = bare;
    const r = cli();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('Main branch: could not tell — gh is not installed.\n');
  });

  it('says gh did not answer when it hangs', () => {
    writeFileSync(join(dir, 'bin/gh'), '#!/usr/bin/env bash\nsleep 5\n');
    const status = mainStatus(repo, { env, ghTimeoutMs: 300 });
    expect(status.line).toBe('Main branch: could not tell — gh did not answer within 0.3 seconds.');
  });

  it.each([
    ['no origin', () => git(repo, 'remote', 'remove', 'origin'), 'no remote named origin'],
    ['an origin not on GitHub', () => git(repo, 'remote', 'set-url', 'origin', join(dir, 'elsewhere.git')),
      'origin is not on GitHub'],
  ])('never runs gh with %s', (_, arrange, reason) => {
    arrange();
    expect(cli().stdout).toBe(`Main branch: could not tell — ${reason}.\n`);
    expect(cli('--wait', 'HEAD', '--interval', '0', '--timeout', '0.01').stdout)
      .toBe(`Main branch: could not tell — ${reason}.\n`);
    expect(log()).toBe('');
  });

  describe('--wait', () => {
    const fast = ['--interval', '0.05', '--timeout', '0.05'];

    it('waits for the run on the commit to appear and finish, and exits 1 when it failed', () => {
      const head = git(repo, 'rev-parse', 'HEAD');
      runs([], 1);
      runs([run('queued', '', head, '2026-10-31T12:00:00Z')], 2);
      runs([run('completed', 'failure', head, '2026-10-31T12:00:00Z')]);
      const r = cli('--wait', 'HEAD', ...fast);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe(
        `Main branch: red — the pipeline failed on ${head.slice(0, 7)} (title of ${head.slice(0, 7)}). `
        + `Run: https://github.com/acme/example/actions/runs/${head.slice(0, 4)}\n`,
      );
      const calls = log().split('\n').filter((l) => l.startsWith('run list'));
      expect(calls).toHaveLength(3);
      // The full hash: GitHub matches --commit against the whole SHA only.
      expect(calls[0]).toBe(
        `run list --workflow pipeline.yml --commit ${head} --event push --limit 20 `
        + '--json status,conclusion,headSha,url,createdAt,displayTitle',
      );
    });

    it('exits 0 with the green line when the run passed', () => {
      const head = git(repo, 'rev-parse', 'HEAD');
      runs([run('completed', 'success', head, '2026-10-31T12:00:00Z')]);
      const r = cli('--wait', head, ...fast);
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/^Main branch: green — the pipeline passed on /);
    });

    it('says it could not tell when the run was cancelled', () => {
      const head = git(repo, 'rev-parse', 'HEAD');
      runs([run('completed', 'cancelled', head, '2026-10-31T12:00:00Z')]);
      const r = cli('--wait', 'HEAD', ...fast);
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/^Main branch: could not tell — the pipeline run on \w{7} ended cancelled \(/);
    });

    it('exits 3 when nothing has finished by the timeout', () => {
      const r = cli('--wait', 'HEAD', '--interval', '0.05', '--timeout', '0.005');
      expect(r.status).toBe(3);
      expect(r.stdout).toMatch(/^Main branch: still running — no pipeline run on \w{7} finished within 0\.005 minutes\.\n$/);
    });

    it.each([[['--wait']], [['--wait', '--interval']], [['--interval', '1']], [['--wait', 'HEAD', '--timeout', '0']]])(
      'refuses %j with the usage and exit 2', (args) => {
        const r = cli(...args);
        expect(r.status).toBe(2);
        expect(r.stderr).toContain('usage: main-status.mjs');
        expect(log()).toBe('');
      },
    );

    it('refuses a commit that is not here', () => {
      const r = cli('--wait', 'no-such-ref', ...fast);
      expect(r.status).toBe(2);
      expect(r.stderr).toBe('main-status: no-such-ref is not a commit here\n');
      expect(log()).toBe('');
    });
  });

  it('the merge sequence ends by waiting for the run the merge started, and stops on red', () => {
    const workflow = readFileSync(join(blueprint, 'framework/workflow.md'), 'utf8');
    const section = workflow.split('## Merge and clean up')[1].split('\n## ')[0];
    const block = section.split('```bash')[1].split('```')[0].trim().split('\n');
    expect(block.at(-1)).toMatch(/^node \.tropis\/scripts\/main-status\.mjs --wait HEAD(\s|$)/);
    const prose = section.replace(/\s+/g, ' ');
    expect(prose).toContain('Exit 1 means the main branch is red');
    expect(prose).toContain('and stop.');
  });
});
```

In `guards/next-report.test.js`:

1. Add `chmodSync` to the `node:fs` import.
2. After `const shipped = resolve(here, '../scripts');` add:

   ```js
   // What the report imports, copied beside it into .tropis/scripts/ in every staged project.
   const REPORT_FILES = ['next.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js', 'main-status.mjs'];
   ```

   and replace each of the five literal lists
   `['next.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js']` with
   `REPORT_FILES`. Afterwards `grep -c "'readme-freshness.js'" guards/next-report.test.js`
   prints `1`.
3. Replace the comment and first line of `UNCHANGED_WITHOUT_BANDS` so it reads:

   ```js
     // Captured from origin/main's next.mjs and next-work.js against UNCHANGED_CATALOG.
     // A project with no bands file, and one whose bands file is only a header, must
     // keep printing this byte for byte. The first line is the main branch's status, which
     // cannot be asked for in a staged project with no origin.
     const UNCHANGED_WITHOUT_BANDS = `Main branch: could not tell — no remote named origin.

   Next step: ready-step (docs/specs/arc-design.md)
   ```

   (the rest of the literal unchanged).
4. As the last test in `describe('backlog report')`:

   ```js
     it('says on its first line when the main branch is red', () => {
       const dir = mkdtempSync(join(tmpdir(), 'next-red-'));
       try {
         const fw = join(dir, '.tropis');
         mkdirSync(join(fw, 'scripts'), { recursive: true });
         for (const file of REPORT_FILES) copyFileSync(join(shipped, file), join(fw, 'scripts', file));
         writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
         writeFileSync(join(dir, 'feature-catalog.yaml'), CATALOG);
         symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));
         spawnSync('git', ['init', '-q'], { cwd: dir });
         spawnSync('git', ['remote', 'add', 'origin', 'https://github.com/acme/example.git'], { cwd: dir });
         // A stub gh first on PATH: nothing here reaches GitHub.
         mkdirSync(join(dir, 'bin'));
         writeFileSync(join(dir, 'bin/gh'), `#!/usr/bin/env bash
   case "$1 $2" in
     "api repos/{owner}/{repo}") echo '{"default_branch":"main"}' ;;
     "run list") echo '[{"status":"completed","conclusion":"failure","headSha":"bad0000aaaa","url":"https://github.com/acme/example/actions/runs/1","createdAt":"2026-10-31T11:00:00Z","displayTitle":"break it"}]' ;;
     *) echo "stub gh: unexpected call: $*" >&2; exit 99 ;;
   esac
   `);
         chmodSync(join(dir, 'bin/gh'), 0o755);
         const { stdout, stderr } = spawnSync('node', [join(fw, 'scripts/next.mjs')], {
           cwd: dir,
           env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}` },
           encoding: 'utf8',
         });
         expect(stderr).toBe('');
         expect(stdout.split('\n').slice(0, 3)).toEqual([
           'Main branch: red — the pipeline failed on bad0000 (break it). Run: https://github.com/acme/example/actions/runs/1',
           '',
           'Next step: second-step (docs/specs/example-design.md)',
         ]);
       } finally {
         rmSync(dir, { recursive: true, force: true });
       }
     });
   ```

In `guards/dispatch.test.js`, add `chmodSync` to the `node:fs` import (the line
`realpathSync,` becomes `realpathSync, chmodSync,`), and as the last two tests in
`describe('isolation helper')`:

```js
  it('says the main branch is red before it creates the worktree, and still creates it', () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      git(root, 'remote', 'add', 'origin', 'https://github.com/acme/example.git');
      // A stub gh first on PATH: nothing here reaches GitHub.
      const bin = join(parent, 'bin');
      mkdirSync(bin);
      writeFileSync(join(bin, 'gh'), `#!/usr/bin/env bash
case "$1 $2" in
  "api repos/{owner}/{repo}") echo '{"default_branch":"main"}' ;;
  "run list") echo '[{"status":"completed","conclusion":"failure","headSha":"bad0000aaaa","url":"https://github.com/acme/example/actions/runs/1","createdAt":"2026-10-31T11:00:00Z","displayTitle":"break it"}]' ;;
  *) echo "stub gh: unexpected call: $*" >&2; exit 99 ;;
esac
`);
      chmodSync(join(bin, 'gh'), 0o755);
      const r = spawnSync('bash', ['.tropis/scripts/isolate-for-plan.sh', PLAN], {
        cwd: root,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(r.status).toBe(0);
      const out = r.stdout.split('\n');
      expect(out[0]).toBe(
        'Main branch: red — the pipeline failed on bad0000 (break it). Run: https://github.com/acme/example/actions/runs/1',
      );
      expect(out[1]).toMatch(/^isolated in /);
      expect(owner(join(parent, 'example-project-wt'))).toBe(realpathSync(join(root, '.git')));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('says it could not tell where there is no origin, and still creates the worktree', () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      const r = run(root, 'bash', ['.tropis/scripts/isolate-for-plan.sh', PLAN]);
      expect(r.status).toBe(0);
      const out = r.stdout.split('\n');
      expect(out[0]).toBe('Main branch: could not tell — no remote named origin.');
      expect(out[1]).toMatch(/^isolated in /);
      expect(owner(join(parent, 'example-project-wt'))).toBe(realpathSync(join(root, '.git')));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
```

**Run order, and what each run must print.** Commit the tests alone first (with a body
saying they are red until the next commit) and run the three files (the staged command
above): expected, `guards/main-status.test.js` fails as a suite (it cannot import
a module that does not exist yet), and in the other two exactly these fail —
*is unchanged without bands*, *says on its first line when the main branch is red*, and
both new *isolation helper* tests; every other test passes. If anything else fails, or
any of those four passes, stop and report it under *What the plan got wrong*. Then
commit the code and the list, and run again: `guards/next-report.test.js` 25 passed,
`guards/dispatch.test.js` 18 passed, `guards/main-status.test.js` 20 passed and 1
failed — the workflow test, which Task 2 turns green. Record all three runs.

### Task 2 — The workflow, the command and the operator guide

**`framework/workflow.md`** (re-apply per *Traps* if the sibling plan changed the
sequence). In *Merge and clean up — in this order*, the code block's last line today is
`git checkout main && git pull origin main`; add after it, inside the block:

```bash
node .tropis/scripts/main-status.mjs --wait HEAD   # the run this merge started
```

and after the section's last paragraph (today the one ending "…instead of saying what
the plan made true."), add these two paragraphs, each preceded by a blank line:

```markdown
**The sequence ends by waiting for the run the merge started on the main branch.**
`main-status.mjs --wait` asks GitHub, through `gh`, for the pipeline's push run on that
commit every 30 seconds, for up to 30 minutes, and prints one line. Exit 1 means the main
branch is red: say so, with the commit and the run the line names, and stop. Repairing it
is the next piece of work, through a pull request like any other, and nothing else starts
on top of it. Exit 3 means the run had not finished in 30 minutes: say so, and run the
command again later. A line saying it could not tell exits 0: report it as it stands,
with its reason, and do not read it as green. Where an agent tool stops a command sooner
than 30 minutes, run it in the background, or run it again: each run waits for the same
pipeline run.

A gate on the host stops a red pull request merging. It does not stop the main branch
going red after the merge — from a deploy, an environment, or two changes that pass
alone — and a project without the gate has nothing else that tells anyone. In one
project a break lasted ten days while six further commits landed on top of it, and was
found only because someone went to look.
```

If the sibling plan's text already says something these sentences contradict — for
instance about what happens when a check fails — keep both true by changing these
sentences, not its text, and say so under *Judgment calls*.

**`commands/next.md`**, directly after the line `<!-- project-owned: end -->` and a
blank line (outside the block, which belongs to the project):

```markdown
Its first line says whether the main branch's last finished pipeline run passed or
failed, or that it could not tell and why. Report that line first, as it stands. A red
main branch comes before anything in the backlog: say so before suggesting any entry,
and that repairing it, through a pull request, is the next piece of work.
```

**`templates/README.md`**, in *What to type*, after the indented line
`    npm --prefix .tropis test` and a blank line, this paragraph:

```markdown
`/next` opens with one line on the main branch: whether the last finished run of the
pipeline there passed or failed, naming the commit and, when it failed, the run. The
isolation helper that `/dispatch`'s prompt runs prints the same line before it creates a
worktree, and creates it either way, and the workflow's merge sequence ends with
`node .tropis/scripts/main-status.mjs --wait HEAD`, which waits for the run the merge
started and exits non-zero when it fails. Run `node .tropis/scripts/main-status.mjs` for
the line alone. Each asks GitHub through `gh`, for push runs of
`.github/workflows/pipeline.yml`; where it cannot — no `gh`, not signed in, an origin that
is not on GitHub — it says it could not tell, and why.
```

Commit, and run the three guard files: all green — 25, 18 and 21. The integrity guard
reads the installed release here, not the source, so check the source by hand. Plant a
hit first — the first command must print at least one line (the workflow's code block)
— then the second must print nothing:

```bash
git grep -nF '.tropis/scripts/main-status.mjs' -- framework commands rules
git grep -nP '(?<![./])scripts/main-status\.mjs' -- framework commands rules
```

Record both outputs.

### Task 3 — Fresh-agent check

The workflow and a command change what an agent is told to do, so the check is owed. It
is aimed at the two clauses just written. Build one scratch project, outside every
checkout, in a temporary folder:

```bash
X="$(mktemp -d)" && mkdir "$X/p" "$X/bin" && cd "$X/p" && git init -q -b main \
  && bash <worktree>/scripts/set-up-project.sh "$X/p" \
  && ln -s <worktree>/.tropis/node_modules .tropis/node_modules \
  && git add -A && git -c user.email=probe@example.com -c user.name=probe commit -qm "probe: set up" \
  && git remote add origin https://github.com/acme/example.git
```

Write `$X/bin/gh` (and `chmod +x` it) so every probe stays off the network:

```bash
#!/usr/bin/env bash
case "$1 $2" in
  "api repos/{owner}/{repo}") echo '{"default_branch":"main"}' ;;
  "run list") echo "[{\"status\":\"completed\",\"conclusion\":\"failure\",\"headSha\":\"$(git rev-parse HEAD)\",\"url\":\"https://github.com/acme/example/actions/runs/4242\",\"createdAt\":\"2026-10-31T11:00:00Z\",\"displayTitle\":\"feat: an invented change\"}]" ;;
  "pr list") echo "" ;;
  *) echo "gh (probe): not available here: $*" >&2; exit 1 ;;
esac
```

Run each probe as a fresh session started in `$X/p` with `$X/bin` first on `PATH` (for
Claude Code, `PATH="$X/bin:$PATH" claude -p "<prompt>"`; any current agent tool will
do). Before running locally, check whether your own instructions that apply to every
project already say anything about a red main branch; if they do, run the probes in a
cloud session instead and say so.

**Probe A — the backlog report**, verbatim:

> This is a probe and will be discarded; do not push, merge, open or fix anything, and
> do not change any file. Run /next in this project — read `.claude/commands/next.md`
> and do what it says — and tell me what you would work on first.

Pass: before any backlog entry, it says the main branch is red, naming the commit (its
first seven characters) and the run `…/runs/4242`, and puts repairing that first.

**Probe B — the merge sequence**, verbatim:

> This is a probe and will be discarded; do not push, merge or open anything, and do not
> change any file. In this project, pull request 7 has just been squash-merged following
> the merge sequence in `.claude/framework/workflow.md`, and every step up to and
> including the one that puts the merge commit on your local `main` is done: `main` is
> checked out and HEAD is the merge commit. Do what remains of that sequence, then say
> what you will do next.

Pass: it runs `node .tropis/scripts/main-status.mjs --wait HEAD` (or the same with other
options), reports the main branch red with the commit and the run, stops, and proposes
repairing it through a pull request rather than starting other work.

Record each prompt, the reply (abridged where long, never paraphrased into a pass), and
the tool, version, operating system and architecture. A probe that does not pass means
the clause is not finished: revise the clause it exercised, re-run Task 2's checks, and
run that probe again; if after one revision it still does not pass, **stop and hand
back** with both replies. If no agent tool can be started here, say so under
*Outstanding*: the reviewing session then runs both probes before merging. Remove `$X`
afterwards.

### Task 4 — Full checks

Run and record, after committing:

- the three guard files (the staged command): 25, 18 and 21 passed;
- `npm --prefix .tropis test`: counts, all passed;
- `bash scripts/check-blueprint.sh`: last line starts `Self-check passed`;
- `node scripts/main-status.mjs` from the worktree, against the real host: its one line,
  whatever it says (this reaches the network, which is the point; it is not a test);
- `git diff --stat origin/main...HEAD`: every file in the File Structure table.

### Task 5 — Catalog

In `feature-catalog.yaml`, on `a-failing-push-is-visible`: `status: shipped`, and
`modules` set to `scripts/main-status.mjs`, `scripts/next.mjs`,
`scripts/isolate-for-plan.mjs` and `framework/workflow.md`. Below the existing comment
lines above the entry, add:

```yaml
# Shipped by the handover in docs/superpowers/plans/2026-10-31-a-failing-push-is-visible.md.
# Criterion 1: guards/main-status.test.js "the merge sequence ends by waiting..." and the
# --wait tests, and probe B of the fresh-agent check in that plan's handover. Criterion
# 2: guards/dispatch.test.js "says the main branch is red before it creates the
# worktree...". Criterion 3: guards/next-report.test.js "says on its first line when the
# main branch is red" and probe A. Criterion 4: main-status.test.js "says it could not
# tell...", "gh is not installed", "gh did not answer", "never runs gh with..." (also
# with --wait), next-report "is unchanged without bands" and dispatch "says it could not
# tell where there is no origin". Criterion 5: every test that gives a repository a
# GitHub origin puts a stub gh first on PATH, and "never runs gh with..." shows a
# repository without one never runs gh.
```

If Task 3 could not run, set `shipped` all the same (the delivery guard requires it once
the handover is on `main`) and name the probes as owed before merge under
*Outstanding*. Commit, then re-run `npm --prefix .tropis test` and
`bash scripts/check-blueprint.sh` and record both.

### Task 6 — Handover report

Append `## Handover report` with the six sections the planning rule names —
*Task completion* (including Task 0's check and its output), *Verification results*
(each command, its actual output, and the tool, version, operating system and
architecture; never the computer's name), *Scope* (the diff stat, confirmation against
the File Structure table, and the worktree `../tropis-red-main`), *Judgment calls*
(including how the workflow edit was fitted to the sibling plan's text), *What the plan
got wrong*, *Outstanding*. Put both probes' prompts, replies and tool records under
*Verification results*. Commit, push the branch, and open a pull request against `main`
titled `feat(workflow): a red main branch is seen by whoever merged and whoever starts
next`, whose body carries the probes' results. Do not merge.
