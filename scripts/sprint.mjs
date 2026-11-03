#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * The sprint: a proposal of about 20 story points from the top of the backlog's ranking,
 * the agreed sprint kept on origin, a team member's wait for what blocks it, and
 * where the sprint stands (framework/workflow.md, *Delivering a backlog item*; the /sprint
 * command; decisions FW-055 and the one that follows it).
 *
 * The sprint's record is the file `sprint.json` in the last commit of the branch
 * `tropis/sprint` on origin, so a session in a new cloud container or on another machine
 * finds the sprint under way, and a team member's `mark` or `note` from its own checkout
 * reaches it. Each change is a commit on the one before, pushed with a lease on the commit
 * it read; a push refused because another session got there first reads again and
 * applies the same change again. The branch is never deleted (a cloud session cannot
 * delete one): an ended sprint is a commit with an empty tree. Without a remote named
 * origin the record is the local file `<git common dir>/tropis/sprint.json`, as before,
 * and a record an earlier release left there is carried to the branch by the next change
 * and the file removed. The team folder below stays on this machine.
 *
 * Every command that reads the backlog first fetches origin and reads `feature-catalog.yaml` and `docs/backlog-board/bands.yaml` at
 * origin/main, so a team member in a worktree and the sprint session see one backlog.
 *
 *   sprint.mjs propose [--points <n>]            the proposal; exit 0
 *   sprint.mjs start <id> ... [--points <n>] [--way session|here|claude|cursor]
 *                                                writes the record; exit 1 when
 *                                                one exists or an id is unknown
 *   sprint.mjs add <id> | drop <id>              change the sprint; exit 1 on a bad id
 *       (for a `session` sprint, start and add also name the team member's model)
 *   sprint.mjs mark <id> planning|parked|stopped|clear [<reason> ...]
 *   sprint.mjs note <id> <text> ...              a decision a team member reports
 *   sprint.mjs wait <id> [--interval <seconds>]  exit 0 when what the entry is blocked
 *       by has shipped, 3 (`PARKED: depends on <id>`) when a blocker was dropped, parked
 *       or stopped, 1 for an id not in the backlog. No time limit; works with no sprint.
 *   sprint.mjs brief <id>                        the team member's brief
 *   sprint.mjs launch <id> [--tool claude|cursor] [--model <m>] [--interval <seconds>]
 *       starts the entry's team member in that tool's command line, in print mode, in a
 *       worktree `<checkout>-team-<id>` beside the checkout, as a detached `run`, and
 *       returns at once. Records `launched[id]` ({ tool, model, worktree, pid, started,
 *       log }) in the record and marks the entry planning.
 *   sprint.mjs run <id> --tool <t> [--model <m>] [--interval <seconds>]
 *       what launch starts: waits for what blocks the entry, runs the tool on exact
 *       grants and no API key, judges its last line against origin/main and writes the
 *       result. Not for a person to run.
 *   sprint.mjs watch [--interval <seconds>]      exit 0 with the line of the first ended
 *       command-line team member not yet reported, 1 when none is running or unreported.
 *   sprint.mjs status | report | end             where it stands, the report, the report
 *                                                and then the sprint ended
 *
 * The team folder `<git common dir>/tropis/team/` holds, per launched entry, `<id>.brief.md`
 * (the prompt), `<id>.log` (the run's output, stream-json) and `<id>.json` (the result:
 * { tool, line, denied, sessionId, exit, finished, reported? }). It is written by this
 * script only, and outlives the sprint.
 *
 * Every command except propose, start, wait and run exits 1 with one line when no sprint is
 * under way; an unknown command exits 2 with the usage line. Every line is on stdout,
 * except the notes of `brief`, which go to stderr so the brief stays whole.
 * TROPIS_SPRINT_NOW (an ISO 8601 time) replaces the clock, for tests; TROPIS_TEAM_PROMPT (a
 * file) replaces the prompt launch writes, for live runs of the launcher. No other file
 * imports this one. Never runs gh unless origin is on GitHub.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from './load-yaml.mjs';
import { bandBundles, bandLetters, bandScores } from './board-bands.js';
import { mergesAfterIds, pickToUse, pickForTool, NO_PICKS_USE } from './plan-binding.js';
import { bandOf, inRankOrder, isClosed } from './next-work.js';
import { readSubscriptions } from './subscriptions.js';
import { originOnGitHub } from './main-status.mjs';
import { tokenStatus } from './merge-token.mjs';
import {
  TOOLS, agentEnv, commandLine, cursorGrants, judge, openCommand, readRun,
} from './team-member-cli.mjs';

const DEFAULT_BUDGET = 20;
const WAYS = ['session', 'here', 'claude', 'cursor'];
const TEAM_TIER = 'Large';
const COMMANDS = ['propose', 'start', 'add', 'drop', 'mark', 'note', 'wait', 'brief', 'launch', 'run', 'watch',
  'status', 'report', 'end'];
const PLANS_DIR = 'docs/superpowers/plans/';
const USAGE = 'usage: sprint.mjs propose [--points <n>] | start <id> ... [--points <n>] [--way session|here|claude|cursor] | '
  + 'add <id> | drop <id> | mark <id> planning|parked|stopped|clear [<reason>] | note <id> <text> | '
  + 'wait <id> [--interval <seconds>] | brief <id> | launch <id> [--tool claude|cursor] [--model <m>] | '
  + 'run <id> --tool <t> (started by launch) | watch | status | report | end';
const NONE_UNDER_WAY = 'Sprint: none under way; run propose, then start.';

const firstLine = (text) => String(text ?? '').split('\n').map((l) => l.trim()).find(Boolean);
const isoSeconds = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });
const hours = (ms) => (ms / 3600000).toFixed(1);

function clock(env) {
  const fake = env.TROPIS_SPRINT_NOW ? Date.parse(env.TROPIS_SPRINT_NOW) : NaN;
  return Number.isNaN(fake) ? Date.now() : fake;
}

/** A failure to report to the developer: the line to print and the exit status. */
class Refusal extends Error {
  constructor(line, exit = 1) {
    super(line);
    this.exit = exit;
  }
}

// ---------------------------------------------------------------- reading the backlog

const git = (root, env, args) => spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });

/**
 * The backlog as origin's main branch has it after a fetch. `notes` holds the lines to
 * print first: a failed fetch, or no origin/main at all. `read(path)` returns a file at
 * the same commit, or null.
 */
export function readBacklog(root, env = process.env) {
  const notes = [];
  const fetched = git(root, env, ['fetch', '--quiet', 'origin']);
  if (fetched.status !== 0) {
    notes.push(`Sprint: could not fetch origin — ${firstLine(fetched.stderr) ?? `git exited ${fetched.status}`}; reading origin/main as last fetched.`);
  }
  const head = git(root, env, ['rev-parse', '--verify', '--quiet', 'origin/main^{commit}']);
  const onMain = head.status === 0;
  if (!onMain) notes.push('Sprint: no origin/main, so this reads the working tree.');
  const read = (path) => {
    if (onMain) {
      const shown = git(root, env, ['show', `origin/main:${path}`]);
      return shown.status === 0 ? shown.stdout : null;
    }
    return existsSync(resolve(root, path)) ? readFileSync(resolve(root, path), 'utf8') : null;
  };
  const catalogText = read('feature-catalog.yaml');
  if (catalogText === null) throw new Refusal('Sprint: no feature-catalog.yaml to read.');
  const bandsText = read('docs/backlog-board/bands.yaml');
  return {
    catalog: YAML.parse(catalogText) ?? [],
    bandRows: (bandsText && YAML.parse(bandsText)) || {},
    read,
    sha: onMain ? head.stdout.trim().slice(0, 7) : 'working tree',
    notes,
  };
}

/** { value: [{ number, headRefName }] }, or { error } saying why the list is unknown. */
function openPullRequests(root, env) {
  const origin = originOnGitHub(root, env);
  if (origin.error) return { error: origin.error };
  const r = spawnSync('gh', ['pr', 'list', '--state', 'open', '--limit', '100', '--json',
    'number,headRefName'], { cwd: root, env, encoding: 'utf8', timeout: 20000 });
  if (r.error?.code === 'ENOENT') return { error: 'gh is not installed' };
  if (r.error?.code === 'ETIMEDOUT') return { error: 'gh did not answer within 20 seconds' };
  if (r.error) return { error: `gh could not run: ${r.error.message}` };
  if (r.status !== 0) return { error: firstLine(r.stderr) ?? `gh exited ${r.status}` };
  try {
    const list = JSON.parse(r.stdout);
    if (!Array.isArray(list)) throw new Error('not a list');
    return { value: list };
  } catch {
    return { error: 'gh answered with something unexpected' };
  }
}

// ---------------------------------------------------------------- the sprint record

const SPRINT_BRANCH = 'tropis/sprint';
const SPRINT_REF = `refs/heads/${SPRINT_BRANCH}`;

function sprintPath(root, env) {
  const r = git(root, env, ['rev-parse', '--git-common-dir']);
  if (r.status !== 0) throw new Refusal('Sprint: this is not a git checkout.');
  return resolve(root, r.stdout.trim(), 'tropis/sprint.json');
}

// The line naming the model a session starts team members on: the pick /dispatch names
// for a TEAM_TIER plan, from the project's picks and the subscriptions record.
function teamModelLine(root, env) {
  const picksPath = resolve(root, 'docs/model-picks.md');
  const use = existsSync(picksPath)
    ? pickToUse(readFileSync(picksPath, 'utf8'), TEAM_TIER, readSubscriptions(root, env))
    : NO_PICKS_USE;
  const none = use.startsWith('**Use:** not chosen') || use.startsWith('**Use:** none');
  return `Sprint: team members run on the ${TEAM_TIER} tier. ${use}${none ? " Start them on the tool's default model." : ''}`;
}

// The Large pick in `toolName`, by the name that tool's command line takes, from the
// project's picks and the subscriptions record. See `pickForTool`.
function teamModelFor(root, env, toolName) {
  const picksPath = resolve(root, 'docs/model-picks.md');
  return pickForTool(
    existsSync(picksPath) ? readFileSync(picksPath, 'utf8') : null,
    TEAM_TIER,
    readSubscriptions(root, env),
    toolName,
  );
}

const hasOrigin = (root, env) => git(root, env, ['remote', 'get-url', 'origin']).status === 0;

function readLocalSprint(root, env) {
  const path = sprintPath(root, env);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

/** The record in the tree of `sha`, or null when that commit holds no `sprint.json`. */
function recordAt(root, env, sha) {
  const shown = git(root, env, ['show', `${sha}:sprint.json`]);
  return shown.status === 0 ? JSON.parse(shown.stdout) : null;
}

/**
 * The sprint and the commit it was read from: `{ sprint, sha, fromLocal }`. With an origin
 * the record is the file `sprint.json` in the last commit of `tropis/sprint` there; no
 * branch, or a commit with no file, means none under way (`sha` is null for no branch).
 * When origin cannot be reached the last fetched copy is read, and `unreachable` is set.
 * A record an earlier release kept in the local file is returned (`fromLocal`) where the
 * branch holds none, so the next change carries it to origin. Without an origin it is the
 * local file, `sha` null.
 */
export function readSprint(root, env) {
  if (!hasOrigin(root, env)) {
    return { sprint: readLocalSprint(root, env), sha: null, fromLocal: false, local: true };
  }
  const tracking = `refs/remotes/origin/${SPRINT_BRANCH}`;
  const listed = git(root, env, ['ls-remote', 'origin', SPRINT_REF]);
  let unreachable = false;
  let sha = null;
  if (listed.status !== 0) {
    unreachable = true;
    const last = git(root, env, ['rev-parse', '--verify', '--quiet', `${tracking}^{commit}`]);
    sha = last.status === 0 ? last.stdout.trim() : null;
  } else if (listed.stdout.trim() !== '') {
    const fetched = git(root, env, ['fetch', '--quiet', 'origin', `+${SPRINT_REF}:${tracking}`]);
    if (fetched.status !== 0) throw new Refusal(`Sprint: could not fetch the sprint record — ${firstLine(fetched.stderr) ?? `git exited ${fetched.status}`}`);
    sha = git(root, env, ['rev-parse', `${tracking}^{commit}`]).stdout.trim();
  }
  const sprint = sha ? recordAt(root, env, sha) : null;
  if (sprint) return { sprint, sha, fromLocal: false, unreachable };
  const local = readLocalSprint(root, env);
  return { sprint: local, sha, fromLocal: local !== null, unreachable };
}

/** Writes the commit holding `record` (or an empty tree) on `parent`, returns its hash. */
function commitRecord(root, env, record, parent) {
  const lone = { ...env };
  if (git(root, env, ['var', 'GIT_AUTHOR_IDENT']).status !== 0
    || git(root, env, ['var', 'GIT_COMMITTER_IDENT']).status !== 0) {
    Object.assign(lone, {
      GIT_AUTHOR_NAME: 'Tropis sprint', GIT_AUTHOR_EMAIL: 'sprint@tropis.invalid',
      GIT_COMMITTER_NAME: 'Tropis sprint', GIT_COMMITTER_EMAIL: 'sprint@tropis.invalid',
    });
  }
  const step = (args, input) => {
    const r = spawnSync('git', args, { cwd: root, env: lone, encoding: 'utf8', input });
    if (r.status !== 0) throw new Refusal(`Sprint: could not write the sprint record — ${firstLine(r.stderr) ?? `git exited ${r.status}`}`);
    return r.stdout.trim();
  };
  let tree;
  if (record === null) {
    tree = step(['mktree'], '');
  } else {
    const blob = step(['hash-object', '-w', '--stdin'], `${JSON.stringify(record, null, 2)}\n`);
    tree = step(['mktree'], `100644 blob ${blob}\tsprint.json\n`);
  }
  return step(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m',
    record === null ? 'sprint: ended' : 'sprint: record changed']);
}

const MOVED = /stale info|fetch first|already exists|non-fast-forward|rejected/;
const ATTEMPTS = 5;

/**
 * Changes the sprint: reads it, calls `change(sprint)` (null when none is under way) for
 * the new record, or null to end the sprint, and pushes that as a commit on the one read,
 * with a lease on exactly that commit. A push refused because another session moved the
 * branch first reads again and calls `change` again, up to ATTEMPTS times, so `change`
 * must hold no state of its own. Returns the new record. Without an origin the local file
 * is written, or removed for null. The branch is never deleted: an ended sprint is a
 * commit with an empty tree, because a cloud session cannot delete a branch.
 */
export function updateSprint(root, env, change) {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const read = readSprint(root, env);
    const next = change(read.sprint);
    if (read.local) {
      const path = sprintPath(root, env);
      if (next === null) {
        rmSync(path, { force: true });
      } else {
        mkdirSync(dirname(path), { recursive: true });
        const partial = `${path}.${process.pid}`;
        writeFileSync(partial, `${JSON.stringify(next, null, 2)}\n`);
        renameSync(partial, path);
      }
      return next;
    }
    if (read.unreachable) throw new Refusal('Sprint: could not reach origin, so the sprint record was not changed.');
    const commit = commitRecord(root, env, next, read.sha);
    const pushed = git(root, env, ['push', '--quiet',
      `--force-with-lease=${SPRINT_REF}:${read.sha ?? ''}`, 'origin', `${commit}:${SPRINT_REF}`]);
    if (pushed.status === 0) {
      if (read.fromLocal) rmSync(sprintPath(root, env), { force: true });
      return next;
    }
    if (!MOVED.test(pushed.stderr)) {
      throw new Refusal(`Sprint: could not push the sprint record — ${firstLine(pushed.stderr) ?? `git exited ${pushed.status}`}`);
    }
  }
  throw new Refusal('Sprint: the record kept changing under this command; run it again.');
}

const pointsOf = (sprint) => sprint.entries.reduce((sum, e) => sum + e.points, 0);

// ---------------------------------------------------------------- the proposal

/**
 * The sprint to propose: ideas and shaped entries banded A or B with scores, in the order
 * /next suggests them, each added when what blocks it has shipped or is already in the
 * sprint and it (with its whole bundle) fits what is left of the budget. The walk repeats
 * until nothing more is added, so an entry waiting for a lower-ranked one that came in
 * joins after it. Inside the sprint an entry moves to directly after the last entry it
 * names in `after` or `blockedBy`.
 * @returns {{ entries: { id: string, points: number, band: string, bundle?: string, title: string }[],
 *   total: number, nextInLine: { id: string, points: number } | null }}
 */
export function proposeSprint(catalog, bandRows, budget = DEFAULT_BUDGET) {
  const bands = bandLetters(bandRows);
  const scores = bandScores(bandRows);
  const bundles = bandBundles(bandRows);
  const shipped = new Set(catalog.filter((e) => e.status === 'shipped').map((e) => e.id));
  const candidates = inRankOrder(
    catalog.filter((e) => (e.status === 'idea' || e.status === 'shaped')
      && !isClosed(e) && !e.shelved
      && (e.layer === 'product' || e.layer === 'framework')
      && ['A', 'B'].includes(bandOf(e.id, bands)) && scores[e.id]),
    catalog, bands, scores,
  );
  const groupOf = (candidate) => (bundles[candidate.id]
    ? candidates.filter((c) => bundles[c.id] === bundles[candidate.id])
    : [candidate]);
  const sprint = [];
  const inSprint = (id) => sprint.some((e) => e.id === id);
  const unblocked = (group) => group.every((c) => (c.blockedBy ?? [])
    .every((b) => shipped.has(b) || inSprint(b) || group.some((g) => g.id === b)));
  const cost = (group) => group.filter((c) => !inSprint(c.id))
    .reduce((sum, c) => sum + scores[c.id].effort, 0);
  let used = 0;

  for (let added = true; added;) {
    added = false;
    for (const candidate of candidates) {
      if (inSprint(candidate.id)) continue;
      const group = groupOf(candidate);
      if (!unblocked(group) || used + cost(group) > budget) continue;
      for (const member of group) {
        if (inSprint(member.id)) continue;
        sprint.push(member);
        used += scores[member.id].effort;
      }
      added = true;
    }
  }

  const named = (e) => [...(e.after ?? []), ...(e.blockedBy ?? [])];
  for (let guard = sprint.length * sprint.length; guard > 0; guard -= 1) {
    const ids = sprint.map((e) => e.id);
    const misplaced = sprint.findIndex((e, i) => named(e).some((id) => ids.indexOf(id) > i));
    if (misplaced === -1) break;
    const [moved] = sprint.splice(misplaced, 1);
    const last = Math.max(...named(moved).map((id) => sprint.findIndex((e) => e.id === id)));
    sprint.splice(last + 1, 0, moved);
  }

  const skipped = candidates.find((c) => !inSprint(c.id) && unblocked(groupOf(c)));
  return {
    entries: sprint.map((e) => ({
      id: e.id,
      points: scores[e.id].effort,
      band: bandOf(e.id, bands),
      ...(bundles[e.id] ? { bundle: bundles[e.id] } : {}),
      title: e.title,
    })),
    total: used,
    nextInLine: skipped ? { id: skipped.id, points: cost(groupOf(skipped)) } : null,
  };
}

// ---------------------------------------------------------------- command-line team members

const isTool = (tool) => typeof tool === 'string' && Object.hasOwn(TOOLS, tool);

const COMMAND_LINE_NOTE = (name) => [
  `You were started in ${name}'s command line, in print mode, and nobody is watching this`,
  'run. A background command does not wake you here: run every wait in the foreground,',
  'and run it again whenever the tool stops it, until it ends. Everything this entry is',
  'blocked by has shipped already, so skip the wait for it. When a command you need is',
  'refused, end with STOPPED and name the command.',
];
const CURSOR_NOTE = '`.cursor/cli.json` holds the grants this run was started with. It is not part of your work: never commit it.';

function teamPath(root, env) {
  return resolve(dirname(sprintPath(root, env)), 'team');
}

/** The worktree of one team member, beside the checkout. */
const worktreeFor = (root, id) => resolve(root, '..', `${basename(root)}-team-${id}`);

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function readResult(root, env, id) {
  const path = join(teamPath(root, env), `${id}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

/** Written to a sibling file and renamed, like the sprint file. */
function writeResult(root, env, id, result) {
  const path = join(teamPath(root, env), `${id}.json`);
  mkdirSync(dirname(path), { recursive: true });
  const partial = `${path}.${process.pid}`;
  writeFileSync(partial, `${JSON.stringify(result, null, 2)}\n`);
  renameSync(partial, path);
}

const DIED = 'the run ended without writing a result';

/**
 * The sprint's marks overlaid with what command-line team members reported: a result
 * of PARKED or STOPPED marks its entry, and so does a run that is gone without one. A
 * SHIPPED result adds nothing: the main branch says shipped.
 */
function teamMarks(root, env, sprint) {
  const marks = { ...(sprint?.marks ?? {}) };
  for (const [id, launched] of Object.entries(sprint?.launched ?? {})) {
    const result = readResult(root, env, id);
    const reported = result && /^(PARKED|STOPPED): ([\s\S]*)$/.exec(result.line);
    if (reported) marks[id] = { state: reported[1] === 'PARKED' ? 'parked' : 'stopped', reason: reported[2] };
    else if (!result && !isAlive(launched.pid)) marks[id] = { state: 'stopped', reason: DIED };
  }
  return marks;
}

/** What `status` adds to a launched entry's line. */
function teamNote(root, env, sprint, id) {
  const launched = sprint.launched?.[id];
  if (!launched) return '';
  const name = TOOLS[launched.tool].name;
  const result = readResult(root, env, id);
  if (!result && isAlive(launched.pid)) return ` — in ${name}, running; log ${launched.log}`;
  return result?.sessionId
    ? ` — in ${name}, ended; open it with ${openCommand(launched.tool, launched.worktree, result.sessionId)}`
    : ` — in ${name}, ended`;
}

function launch(ctx, opts) {
  const sprint = requireSprint(ctx);
  const id = opts.ids[0];
  requireEntry(sprint, id);
  const tool = opts.tool ?? (isTool(sprint.way) ? sprint.way : undefined);
  if (!isTool(tool)) throw new Refusal('Sprint: --tool takes claude or cursor.');
  const { command, name } = TOOLS[tool];
  const version = spawnSync(command, ['--version'], { env: agentEnv(ctx.env), encoding: 'utf8' });
  if (version.error || version.status !== 0) {
    throw new Refusal(`Sprint: ${command} is not installed, so ${name} cannot start a team member.`);
  }
  // Without --model the run starts on the Large tier's pick in this tool, when one can be named.
  const found = opts.model ? null : teamModelFor(ctx.root, ctx.env, name);
  const model = opts.model ?? found.model ?? undefined;
  const before = sprint.launched?.[id];
  if (before && isAlive(before.pid) && !readResult(ctx.root, ctx.env, id)) {
    throw new Refusal(`Sprint: ${id}'s team member is still running (pid ${before.pid}).`);
  }

  const backlog = ctx.backlog();
  requireInBacklog(backlog, id);
  const worktree = worktreeFor(ctx.root, id);
  if (!existsSync(worktree)) {
    const added = git(ctx.root, ctx.env, ['worktree', 'add', '--detach', worktree, 'origin/main']);
    if (added.status !== 0) {
      throw new Refusal(`Sprint: could not add the worktree — ${firstLine(added.stderr) ?? `git exited ${added.status}`}`);
    }
  }
  const grants = join(worktree, '.cursor/cli.json');
  if (tool === 'cursor' && !existsSync(grants)) {
    mkdirSync(dirname(grants), { recursive: true });
    writeFileSync(grants, `${JSON.stringify(cursorGrants(), null, 2)}\n`);
  }

  const team = teamPath(ctx.root, ctx.env);
  mkdirSync(team, { recursive: true });
  const promptFile = ctx.env.TROPIS_TEAM_PROMPT;
  const prompt = promptFile
    ? readFileSync(promptFile, 'utf8')
    : `${[...brief(ctx, { ids: [id] }), '', ...COMMAND_LINE_NOTE(name), ...(tool === 'cursor' ? [CURSOR_NOTE] : [])].join('\n')}\n`;
  writeFileSync(join(team, `${id}.brief.md`), prompt);
  rmSync(join(team, `${id}.json`), { force: true });
  // A restarted run must not be read through the last one's events.
  const log = join(team, `${id}.log`);
  if (existsSync(log)) renameSync(log, `${log}.1`);

  const fd = openSync(log, 'a');
  const args = [fileURLToPath(import.meta.url), 'run', id, '--tool', tool,
    ...(model ? ['--model', model] : []),
    ...(opts.intervalGiven ? ['--interval', String(opts.intervalMs / 1000)] : [])];
  const child = spawn(process.execPath, args, {
    cwd: ctx.root, env: ctx.env, detached: true, stdio: ['ignore', fd, fd],
  });
  closeSync(fd);
  child.on('error', () => {});
  child.unref();
  if (!child.pid) throw new Refusal(`Sprint: could not start the run for ${id}.`);

  updateSprint(ctx.root, ctx.env, (current) => {
    if (!current) throw new Refusal(NONE_UNDER_WAY);
    return {
      ...current,
      launched: {
        ...(current.launched ?? {}),
        [id]: {
          tool, ...(model ? { model } : {}), worktree, pid: child.pid,
          started: isoSeconds(ctx.now()), log,
        },
      },
      marks: { ...current.marks, [id]: { state: 'planning' } },
    };
  });
  return [
    `Sprint: ${id} started in ${name}'s command line (pid ${child.pid}), in ${worktree}.`,
    `Sprint: its log is ${log}; status names the command that opens its session.`,
    ...(found === null ? [] : [found.model
      ? `Sprint: ${id} runs on ${found.pick} (${found.model}), the ${TEAM_TIER} tier's first pick your ${name} subscription includes.`
      : `Sprint: ${id} starts on ${name}'s default model — ${found.reason}`]),
  ];
}

/** What `launch` starts: the entry's wait, the tool's run, and the judgement of how it ended. */
async function runMember(ctx, opts, print) {
  const id = opts.ids[0];
  const tool = opts.tool;
  const team = teamPath(ctx.root, ctx.env);
  const log = join(team, `${id}.log`);
  const finish = (line, extra = {}) => {
    writeResult(ctx.root, ctx.env, id, {
      tool, line, denied: [], sessionId: null, exit: null, finished: isoSeconds(ctx.now()), ...extra,
    });
    return { exit: 0, lines: [line] };
  };
  try {
    const waited = await wait(ctx, { ids: [id], intervalMs: opts.intervalMs }, print);
    if (waited.exit === 3) return finish(waited.lines[0]);
    if (waited.exit !== 0) return finish(`STOPPED: ${waited.lines[0]}`);
  } catch (error) {
    if (error instanceof Refusal) return finish(`STOPPED: ${error.message}`);
    throw error;
  }

  const { command, args } = commandLine(tool, {
    prompt: readFileSync(join(team, `${id}.brief.md`), 'utf8'), model: opts.model,
  });
  const fd = openSync(log, 'a');
  const exit = await new Promise((done) => {
    const child = spawn(command, args, {
      cwd: worktreeFor(ctx.root, id), env: agentEnv(ctx.env), stdio: ['ignore', fd, fd],
    });
    child.once('error', (error) => {
      writeFileSync(log, `Sprint: could not start ${command} — ${error.message}\n`, { flag: 'a' });
      done(null);
    });
    child.once('close', (code) => done(code));
  });
  closeSync(fd);

  const entryStatus = ctx.backlog().catalog.find((e) => e.id === id)?.status;
  const run = readRun(readFileSync(log, 'utf8'));
  const { line, denied } = judge({ tool, id, exit, run, entryStatus });
  return finish(line, { denied, sessionId: run.sessionId, exit });
}

/**
 * Ends with the first command-line team member whose end has not been reported: exit 0
 * and its line, or exit 1 when none is running or unreported. A run whose process is
 * gone without a result is written one here. No time limit.
 */
async function watch(ctx, opts) {
  for (;;) {
    const sprint = requireSprint(ctx);
    let running = false;
    for (const [id, launched] of Object.entries(sprint.launched ?? {})) {
      let result = readResult(ctx.root, ctx.env, id);
      if (!result && isAlive(launched.pid)) {
        running = true;
        continue;
      }
      if (!result) {
        result = {
          tool: launched.tool, line: `STOPPED: ${DIED}`, denied: [], sessionId: null, exit: null,
          finished: isoSeconds(ctx.now()),
        };
      }
      if (result.reported) continue;
      writeResult(ctx.root, ctx.env, id, { ...result, reported: true });
      const name = TOOLS[launched.tool].name;
      return {
        exit: 0,
        lines: [
          `Sprint: ${id} ended in ${name} — ${result.line}`,
          ...(result.sessionId ? [`Sprint: open it with ${openCommand(launched.tool, launched.worktree, result.sessionId)}`] : []),
        ],
      };
    }
    if (!running) return { exit: 1, lines: ['Sprint: no team member started by command line is running.'] };
    await sleep(opts.intervalMs);
  }
}

// ---------------------------------------------------------------- an entry's status

/**
 * Where one sprint entry stands: the first of nine rules that applies. `catalog` is the
 * backlog on origin's main branch, `marks` the sprint file's, `pulls` the open pull
 * requests or null when they are not known, and `planOf(entry)` the text of the entry's
 * plan or null.
 * @returns {string}
 */
export function statusOf(id, { catalog, marks = {}, pulls = null, planOf = () => null }) {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const entry = byId.get(id);
  const state = (other) => byId.get(other)?.status;
  if (entry?.status === 'shipped') return 'shipped';
  if (entry?.status === 'dropped') return 'dropped';
  const mark = marks[id];
  if (mark?.state === 'parked' || mark?.state === 'stopped') return `${mark.state}: ${mark.reason}`;
  const pull = pulls?.find((p) => String(p.headRefName).includes(id));
  if (pull) return `${entry?.status === 'building' ? 'merging' : 'claiming'} (#${pull.number})`;
  if (entry?.status === 'building') {
    const open = mergesAfterIds(planOf(entry) ?? '')
      .filter((other) => state(other) !== 'shipped' && state(other) !== 'dropped');
    return open.length ? `waiting to merge, after ${open.join(', ')}` : 'building';
  }
  const blockers = (entry?.blockedBy ?? []).filter((b) => state(b) !== 'shipped');
  if (blockers.length) return `waiting for ${blockers.join(', ')} to ship`;
  if (mark?.state === 'planning') return 'planning';
  return 'not started';
}

/** Every sprint entry's status, and the pull request list they were read with. */
function statuses(ctx, sprint, backlog) {
  const pulls = openPullRequests(ctx.root, ctx.env);
  const planOf = (entry) => {
    const plan = [...(entry.refs ?? [])].reverse().find((r) => r.startsWith(PLANS_DIR));
    return plan ? backlog.read(plan) : null;
  };
  const byId = {};
  for (const { id } of sprint.entries) {
    byId[id] = statusOf(id, { catalog: backlog.catalog, marks: teamMarks(ctx.root, ctx.env, sprint), pulls: pulls.value ?? null, planOf });
  }
  return { byId, pulls };
}

const needsYou = (status) => status.startsWith('parked: ') || status.startsWith('stopped: ');

/** Entries in the catalog the sprint did not know at its start, bugs first. */
function newSinceStart(sprint, catalog) {
  const known = new Set(sprint.baseline);
  const fresh = catalog.filter((e) => !known.has(e.id));
  return [...fresh.filter((e) => e.type === 'bug'), ...fresh.filter((e) => e.type !== 'bug')];
}

// ---------------------------------------------------------------- commands

function requireSprint(ctx) {
  const { sprint } = readSprint(ctx.root, ctx.env);
  if (!sprint) throw new Refusal(NONE_UNDER_WAY);
  return sprint;
}

function requireEntry(sprint, id) {
  if (!sprint.entries.some((e) => e.id === id)) throw new Refusal(`Sprint: ${id} is not in the sprint.`);
}

function requireInBacklog(backlog, id) {
  const entry = backlog.catalog.find((e) => e.id === id);
  if (!entry) throw new Refusal(`Sprint: no backlog item ${id} in the backlog.`);
  return entry;
}

function parseBudget(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new Refusal('Sprint: --points takes a whole number above 0.');
  }
  return Number(value);
}

/** A new sprint entry: its points from the bands file (0 without), and its bundle. */
function sprintEntry(backlog, id) {
  const bundle = bandBundles(backlog.bandRows)[id];
  return { id, points: bandScores(backlog.bandRows)[id]?.effort ?? 0, ...(bundle ? { bundle } : {}) };
}

function propose(ctx, opts) {
  const budget = opts.points === undefined ? DEFAULT_BUDGET : parseBudget(opts.points);
  const backlog = ctx.backlog();
  const { entries, total, nextInLine } = proposeSprint(backlog.catalog, backlog.bandRows, budget);
  if (!entries.length) {
    return ['Sprint: nothing to propose — no idea or shaped backlog item banded A or B is free to start.'];
  }
  return [
    `Sprint: proposed ${total} of ${budget} effort points, from main at ${backlog.sha}.`,
    ...entries.map((e, i) => `  ${i + 1}. ${e.id} — ${e.points} pts, band ${e.band}${e.bundle ? `, bundle ${e.bundle}` : ''} — ${e.title}`),
    ...(nextInLine ? [`Sprint: next in line, over the budget — ${nextInLine.id} (${nextInLine.points} pts).`] : []),
  ];
}

function start(ctx, opts) {
  let way;
  let entries;
  let budget;
  updateSprint(ctx.root, ctx.env, (existing) => {
    if (existing) throw new Refusal(`Sprint: one is under way since ${existing.started}; end it first.`);
    if (!opts.ids.length) throw new Refusal('Sprint: start takes at least one backlog item id.');
    if (opts.way !== undefined && !WAYS.includes(opts.way)) {
      throw new Refusal(`Sprint: --way takes ${WAYS.join(' or ')}.`);
    }
    budget = opts.points === undefined ? DEFAULT_BUDGET : parseBudget(opts.points);
    const backlog = ctx.backlog();
    entries = opts.ids.map((id) => {
      requireInBacklog(backlog, id);
      return sprintEntry(backlog, id);
    });
    const twice = opts.ids.find((id, i) => opts.ids.indexOf(id) !== i);
    if (twice) throw new Refusal(`Sprint: ${twice} is listed twice.`);
    way = opts.way ?? 'here';
    return {
      started: isoSeconds(ctx.now()),
      budget,
      way,
      entries,
      baseline: backlog.catalog.map((e) => e.id),
      marks: {},
      notes: {},
    };
  });
  const out = [`Sprint: started with ${entries.length} backlog items, ${entries.reduce((s, e) => s + e.points, 0)} of ${budget} effort points; team members start as ${way}.`];
  if (way === 'session') out.push(teamModelLine(ctx.root, ctx.env));
  return out;
}

function add(ctx, opts) {
  const id = opts.ids[0];
  let added;
  const sprint = updateSprint(ctx.root, ctx.env, (current) => {
    if (!current) throw new Refusal(NONE_UNDER_WAY);
    requireInBacklog(ctx.backlog(), id);
    if (current.entries.some((e) => e.id === id)) throw new Refusal(`Sprint: ${id} is already in the sprint.`);
    added = sprintEntry(ctx.backlog(), id);
    return { ...current, entries: [...current.entries, added] };
  });
  const backlog = ctx.backlog();
  const total = pointsOf(sprint);
  const out = [`Sprint: added ${id} (${added.points} pts); ${total} of ${sprint.budget} effort points.`];
  if (total > sprint.budget) {
    const { byId } = statuses(ctx, sprint, backlog);
    const over = total - sprint.budget;
    const leaving = [];
    let freed = 0;
    for (const e of [...sprint.entries].reverse()) {
      if (freed >= over) break;
      if (e.id === id || byId[e.id] !== 'not started') continue;
      leaving.push(e.id);
      freed += e.points;
    }
    out.push(leaving.length
      ? `Sprint: over the budget by ${over} effort points — ${leaving.join(', ')} not started yet would leave the sprint to make room.`
      : `Sprint: over the budget by ${over} effort points — no backlog item not started yet could leave to make room.`);
  }
  if (sprint.way === 'session') out.push(teamModelLine(ctx.root, ctx.env));
  return out;
}

function drop(ctx, opts) {
  const id = opts.ids[0];
  const sprint = updateSprint(ctx.root, ctx.env, (current) => {
    if (!current) throw new Refusal(NONE_UNDER_WAY);
    requireEntry(current, id);
    const { [id]: _mark, ...marks } = current.marks;
    const { [id]: _notes, ...notes } = current.notes;
    return { ...current, entries: current.entries.filter((e) => e.id !== id), marks, notes };
  });
  return [`Sprint: dropped ${id}; ${pointsOf(sprint)} of ${sprint.budget} effort points.`];
}

function mark(ctx, opts) {
  const [id, state, ...reason] = opts.ids;
  updateSprint(ctx.root, ctx.env, (current) => {
    if (!current) throw new Refusal(NONE_UNDER_WAY);
    requireEntry(current, id);
    if (!['planning', 'parked', 'stopped', 'clear'].includes(state)) {
      throw new Refusal('Sprint: mark takes planning, parked, stopped or clear.');
    }
    if (state === 'clear') {
      const { [id]: _mark, ...marks } = current.marks;
      return { ...current, marks };
    }
    if ((state === 'parked' || state === 'stopped') && !reason.length) {
      throw new Refusal(`Sprint: a ${state} mark needs a reason.`);
    }
    return {
      ...current,
      marks: { ...current.marks, [id]: reason.length ? { state, reason: reason.join(' ') } : { state } },
    };
  });
  return [state === 'clear' ? `Sprint: ${id} mark cleared.` : `Sprint: ${id} marked ${state}.`];
}

function note(ctx, opts) {
  const [id, ...words] = opts.ids;
  updateSprint(ctx.root, ctx.env, (current) => {
    if (!current) throw new Refusal(NONE_UNDER_WAY);
    requireEntry(current, id);
    return { ...current, notes: { ...current.notes, [id]: [...(current.notes[id] ?? []), words.join(' ')] } };
  });
  return [`Sprint: noted for ${id}.`];
}

function brief(ctx, opts) {
  const sprint = requireSprint(ctx);
  const id = opts.ids[0];
  requireEntry(sprint, id);
  const entry = requireInBacklog(ctx.backlog(), id);
  const specs = (entry.refs ?? []).filter((r) => r.includes('/specs/')).map((r) => `\`${r}\``);
  return [
    `Take the backlog item \`${id}\` (${entry.title}) in \`feature-catalog.yaml\` to shipped.`,
    ...(specs.length ? [`Its design: ${specs.join(', ')}.`] : []),
    '',
    'Follow `.claude/framework/workflow.md`, *Delivering a backlog item*, from the wait for what it',
    'is blocked by to the merge: take the merge token yourself and land your own pull',
    'requests. The developer has agreed this sprint, so make the decisions yourself and',
    'report each one. Stop only for what that section allows.',
    '',
    'Run every agent signed in to the plan the developer already pays for, never on a key',
    'billed per use.',
    '',
    'End your last message with exactly one line: SHIPPED, PARKED: <why> or STOPPED: <why>.',
  ];
}

function status(ctx) {
  const sprint = requireSprint(ctx);
  const backlog = ctx.backlog();
  const { byId, pulls } = statuses(ctx, sprint, backlog);
  const shippedPoints = sprint.entries.filter((e) => byId[e.id] === 'shipped').reduce((s, e) => s + e.points, 0);
  const elapsed = ctx.now() - Date.parse(sprint.started);
  const out = [
    `Sprint: started ${sprint.started}, ${hours(elapsed)} h ago; ${shippedPoints} of ${pointsOf(sprint)} effort points shipped, ${sprint.budget} budgeted.`,
    tokenStatus(ctx.root, { env: ctx.env }).line,
  ];
  const stopped = sprint.entries.filter((e) => needsYou(byId[e.id]));
  if (stopped.length) {
    out.push(`Sprint: needs you — ${stopped.length} stopped or parked.`);
    out.push(...stopped.map((e) => `  ${e.id} — ${byId[e.id]}${teamNote(ctx.root, ctx.env, sprint, e.id)}`));
    out.push('Sprint: the rest.');
  }
  out.push(...sprint.entries.filter((e) => !needsYou(byId[e.id]))
    .map((e) => `  ${e.id} — ${byId[e.id]}${teamNote(ctx.root, ctx.env, sprint, e.id)}`));
  if (pulls.error) {
    out.push(`Sprint: open pull requests unknown — ${pulls.error}.`);
  } else {
    const ids = sprint.entries.map((e) => e.id);
    const others = pulls.value.filter((p) => !ids.some((id) => String(p.headRefName).includes(id)));
    if (others.length) {
      out.push(`Sprint: other open pull requests — ${others.map((p) => `#${p.number} ${p.headRefName}`).join(', ')}.`);
    }
  }
  const fresh = newSinceStart(sprint, backlog.catalog);
  if (fresh.length) {
    out.push(`Sprint: new in the backlog since the start — ${fresh.map((e) => `${e.id} [${e.type}] ${e.title}`).join('; ')}.`);
  }
  return out;
}

function report(ctx) {
  const sprint = requireSprint(ctx);
  const backlog = ctx.backlog();
  const { byId } = statuses(ctx, sprint, backlog);
  const now = ctx.now();
  const elapsed = now - Date.parse(sprint.started);
  const done = sprint.entries.filter((e) => byId[e.id] === 'shipped');
  const points = done.reduce((s, e) => s + e.points, 0);
  const perHour = elapsed > 0 ? (points / (elapsed / 3600000)).toFixed(1) : '0.0';
  const section = (heading, items) => [heading, ...(items.length ? items : ['  none.'])];
  const reasons = (state) => sprint.entries.filter((e) => byId[e.id].startsWith(`${state}: `))
    .map((e) => `  ${e.id} — ${byId[e.id].slice(state.length + 2)}`);
  const notes = sprint.entries.flatMap((e) => (sprint.notes[e.id] ?? []).map((n) => `  ${e.id} — ${n}`));
  return [
    `Sprint report: ${sprint.started} to ${isoSeconds(now)}, ${hours(elapsed)} h.`,
    `Shipped: ${done.length} backlog items, ${points} effort points, ${perHour} effort points per hour.`,
    ...(done.length ? done.map((e) => `  ${e.id} — ${e.points} pts`) : ['  none.']),
    ...section('Parked, needs your decision:', reasons('parked')),
    ...section('Stopped:', reasons('stopped')),
    ...section('Not done:', sprint.entries.filter((e) => byId[e.id] !== 'shipped' && !needsYou(byId[e.id]))
      .map((e) => `  ${e.id} — ${byId[e.id]}`)),
    ...section('Decisions team members reported:', notes),
    ...section('New backlog items:', newSinceStart(sprint, backlog.catalog)
      .map((e) => `  ${e.id} [${e.type}] — ${e.title}`)),
  ];
}

function end(ctx) {
  const lines = report(ctx);
  updateSprint(ctx.root, ctx.env, () => null);
  return [...lines, hasOrigin(ctx.root, ctx.env)
    ? 'Sprint: ended; the record on origin says no sprint is under way.'
    : 'Sprint: ended; the sprint file is removed.'];
}

/**
 * The team member's wait: ends when nothing it is blocked by is open (exit 0), or when a
 * blocker was dropped, parked or stopped (exit 3). It reads the backlog afresh every
 * interval and has no time limit. `print` writes a line as it happens.
 */
async function wait(ctx, opts, print) {
  const id = opts.ids[0];
  let told = false;
  for (;;) {
    const backlog = ctx.backlog();
    const entry = requireInBacklog(backlog, id);
    const marks = teamMarks(ctx.root, ctx.env, readSprint(ctx.root, ctx.env).sprint);
    const state = (other) => backlog.catalog.find((e) => e.id === other)?.status;
    const open = [];
    for (const blocker of entry.blockedBy ?? []) {
      if (state(blocker) === 'shipped') continue;
      if (state(blocker) === 'dropped' || ['parked', 'stopped'].includes(marks[blocker]?.state)) {
        return { exit: 3, lines: [`PARKED: depends on ${blocker}`] };
      }
      open.push(blocker);
    }
    if (!open.length) {
      return { exit: 0, lines: [`Sprint: ${id} can start — nothing it is blocked by is still open.`] };
    }
    if (!told) {
      print(`Sprint: ${id} waits for ${open.join(', ')} to ship.`);
      told = true;
    }
    await sleep(opts.intervalMs);
  }
}

// ---------------------------------------------------------------- the command line

/** The command, its words and its flags, or null when the line is not understood. */
function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command)) return null;
  const opts = { command, ids: [], intervalMs: 30000 };
  for (let i = 0; i < rest.length; i += 1) {
    const word = rest[i];
    if (command === 'mark' || command === 'note' || !word.startsWith('--')) {
      opts.ids.push(word);
    } else if (['--points', '--way', '--interval', '--tool', '--model'].includes(word) && rest[i + 1] !== undefined) {
      const value = rest[i + 1];
      i += 1;
      if (word === '--points') opts.points = value;
      else if (word === '--way') opts.way = value;
      else if (word === '--tool') opts.tool = value;
      else if (word === '--model') opts.model = value;
      else if (/^\d+(\.\d+)?$/.test(value)) {
        opts.intervalMs = Number(value) * 1000;
        opts.intervalGiven = true;
      }
      else return null;
    } else {
      return null;
    }
  }
  if (['add', 'drop', 'wait', 'brief', 'launch', 'run'].includes(command) && opts.ids.length !== 1) return null;
  if (command === 'watch' && opts.ids.length) return null;
  if (command === 'run' && !opts.tool) return null;
  if (command === 'mark' && opts.ids.length < 2) return null;
  if (command === 'note' && opts.ids.length < 2) return null;
  return opts;
}

/**
 * Runs one command in the checkout at `root`. `print` is called with each line a wait
 * says while it runs; every other command returns all its lines.
 * @returns {Promise<{ exit: number, lines: string[] }>}
 */
export async function main(argv, { root, env = process.env, print = () => {} } = {}) {
  const opts = parseArgs(argv);
  if (!opts) return { exit: 2, lines: [USAGE] };
  const first = [];
  const told = new Set();
  const ctx = {
    root,
    env,
    now: () => clock(env),
    // Every read of the backlog tells the developer about a fetch that failed, once.
    backlog: () => {
      const backlog = readBacklog(root, env);
      for (const line of backlog.notes.filter((n) => !told.has(n))) {
        told.add(line);
        if (opts.command === 'brief') process.stderr.write(`${line}\n`);
        else if (opts.command === 'wait' || opts.command === 'run') print(line);
        else first.push(line);
      }
      return backlog;
    },
  };
  try {
    if (opts.command === 'wait') return await wait(ctx, opts, print);
    if (opts.command === 'run') {
      if (!isTool(opts.tool)) return { exit: 2, lines: [USAGE] };
      return await runMember(ctx, opts, print);
    }
    if (opts.command === 'watch') return await watch(ctx, opts);
    const commands = { propose, start, add, drop, mark, note, brief, launch, status, report, end };
    const lines = commands[opts.command](ctx, opts);
    return { exit: 0, lines: [...first, ...lines] };
  } catch (error) {
    if (error instanceof Refusal) return { exit: error.exit, lines: [...first, error.message] };
    throw error;
  }
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
  const print = (line) => process.stdout.write(`${line}\n`);
  const result = await main(process.argv.slice(2), { root, print });
  result.lines.forEach(print);
  process.exitCode = result.exit;
}
