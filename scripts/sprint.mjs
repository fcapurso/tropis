#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * The sprint: a proposal of about 20 story points from the top of the backlog's ranking,
 * the agreed sprint kept in a local file, a team member's wait for what blocks it, and
 * where the sprint stands (framework/workflow.md, *Delivering an entry*; the /sprint
 * command; decisions FW-055 and the one that follows it).
 *
 * The sprint file is `<git common dir>/tropis/sprint.json`: local, shared by every
 * worktree of the checkout, never committed. Every command that reads the backlog first
 * fetches origin and reads `feature-catalog.yaml` and `docs/backlog-board/bands.yaml` at
 * origin/main, so a team member in a worktree and the sprint session see one backlog.
 *
 *   sprint.mjs propose [--points <n>]            the proposal; exit 0
 *   sprint.mjs start <id> ... [--points <n>] [--way session|here]
 *                                                writes the sprint file; exit 1 when
 *                                                one exists or an id is unknown
 *   sprint.mjs add <id> | drop <id>              change the sprint; exit 1 on a bad id
 *   sprint.mjs mark <id> planning|parked|stopped|clear [<reason> ...]
 *   sprint.mjs note <id> <text> ...              a decision a team member reports
 *   sprint.mjs wait <id> [--interval <seconds>]  exit 0 when what the entry is blocked
 *       by has shipped, 3 (`PARKED: depends on <id>`) when a blocker was dropped, parked
 *       or stopped, 1 for an id not in the backlog. No time limit; works with no sprint.
 *   sprint.mjs brief <id>                        the team member's brief
 *   sprint.mjs status | report | end             where it stands, the report, the report
 *                                                and then the sprint file removed
 *
 * Every command except propose, start and wait exits 1 with one line when no sprint is
 * under way; an unknown command exits 2 with the usage line. Every line is on stdout,
 * except the notes of `brief`, which go to stderr so the brief stays whole.
 * TROPIS_SPRINT_NOW (an ISO 8601 time) replaces the clock, for tests. No other file
 * imports this one. Never runs gh unless origin is on GitHub.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { bandBundles, bandLetters, bandScores } from './board-bands.js';
import { mergesAfterIds } from './plan-binding.js';
import { bandOf, inRankOrder, isClosed } from './next-work.js';
import { originOnGitHub } from './main-status.mjs';
import { tokenStatus } from './merge-token.mjs';

const DEFAULT_BUDGET = 20;
const WAYS = ['session', 'here'];
const COMMANDS = ['propose', 'start', 'add', 'drop', 'mark', 'note', 'wait', 'brief', 'status', 'report', 'end'];
const PLANS_DIR = 'docs/superpowers/plans/';
const USAGE = 'usage: sprint.mjs propose [--points <n>] | start <id> ... [--points <n>] [--way session|here] | '
  + 'add <id> | drop <id> | mark <id> planning|parked|stopped|clear [<reason>] | note <id> <text> | '
  + 'wait <id> [--interval <seconds>] | brief <id> | status | report | end';
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

// ---------------------------------------------------------------- the sprint file

function sprintPath(root, env) {
  const r = git(root, env, ['rev-parse', '--git-common-dir']);
  if (r.status !== 0) throw new Refusal('Sprint: this is not a git checkout.');
  return resolve(root, r.stdout.trim(), 'tropis/sprint.json');
}

function readSprint(root, env) {
  const path = sprintPath(root, env);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

/** Written to a sibling file and renamed, so a reader never sees half a file. */
function writeSprint(root, env, sprint) {
  const path = sprintPath(root, env);
  mkdirSync(dirname(path), { recursive: true });
  const partial = `${path}.${process.pid}`;
  writeFileSync(partial, `${JSON.stringify(sprint, null, 2)}\n`);
  renameSync(partial, path);
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
    byId[id] = statusOf(id, { catalog: backlog.catalog, marks: sprint.marks, pulls: pulls.value ?? null, planOf });
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
  const sprint = readSprint(ctx.root, ctx.env);
  if (!sprint) throw new Refusal(NONE_UNDER_WAY);
  return sprint;
}

function requireEntry(sprint, id) {
  if (!sprint.entries.some((e) => e.id === id)) throw new Refusal(`Sprint: ${id} is not in the sprint.`);
}

function requireInBacklog(backlog, id) {
  const entry = backlog.catalog.find((e) => e.id === id);
  if (!entry) throw new Refusal(`Sprint: no entry ${id} in the backlog.`);
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
    return ['Sprint: nothing to propose — no idea or shaped entry banded A or B is free to start.'];
  }
  return [
    `Sprint: proposed ${total} of ${budget} points, from main at ${backlog.sha}.`,
    ...entries.map((e, i) => `  ${i + 1}. ${e.id} — ${e.points} pts, band ${e.band}${e.bundle ? `, bundle ${e.bundle}` : ''} — ${e.title}`),
    ...(nextInLine ? [`Sprint: next in line, over the budget — ${nextInLine.id} (${nextInLine.points} pts).`] : []),
  ];
}

function start(ctx, opts) {
  const existing = readSprint(ctx.root, ctx.env);
  if (existing) throw new Refusal(`Sprint: one is under way since ${existing.started}; end it first.`);
  if (!opts.ids.length) throw new Refusal('Sprint: start takes at least one entry id.');
  if (opts.way !== undefined && !WAYS.includes(opts.way)) {
    throw new Refusal(`Sprint: --way takes ${WAYS.join(' or ')}.`);
  }
  const budget = opts.points === undefined ? DEFAULT_BUDGET : parseBudget(opts.points);
  const backlog = ctx.backlog();
  const entries = opts.ids.map((id) => {
    requireInBacklog(backlog, id);
    return sprintEntry(backlog, id);
  });
  const twice = opts.ids.find((id, i) => opts.ids.indexOf(id) !== i);
  if (twice) throw new Refusal(`Sprint: ${twice} is listed twice.`);
  const way = opts.way ?? 'here';
  writeSprint(ctx.root, ctx.env, {
    started: isoSeconds(ctx.now()),
    budget,
    way,
    entries,
    baseline: backlog.catalog.map((e) => e.id),
    marks: {},
    notes: {},
  });
  return [`Sprint: started with ${entries.length} entries, ${entries.reduce((s, e) => s + e.points, 0)} of ${budget} points; team members start as ${way}.`];
}

function add(ctx, opts) {
  const sprint = requireSprint(ctx);
  const id = opts.ids[0];
  const backlog = ctx.backlog();
  requireInBacklog(backlog, id);
  if (sprint.entries.some((e) => e.id === id)) throw new Refusal(`Sprint: ${id} is already in the sprint.`);
  const added = sprintEntry(backlog, id);
  sprint.entries.push(added);
  writeSprint(ctx.root, ctx.env, sprint);
  const total = pointsOf(sprint);
  const out = [`Sprint: added ${id} (${added.points} pts); ${total} of ${sprint.budget} points.`];
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
      ? `Sprint: over the budget by ${over} points — ${leaving.join(', ')} not started yet would leave the sprint to make room.`
      : `Sprint: over the budget by ${over} points — no entry not started yet could leave to make room.`);
  }
  return out;
}

function drop(ctx, opts) {
  const sprint = requireSprint(ctx);
  const id = opts.ids[0];
  requireEntry(sprint, id);
  sprint.entries = sprint.entries.filter((e) => e.id !== id);
  delete sprint.marks[id];
  delete sprint.notes[id];
  writeSprint(ctx.root, ctx.env, sprint);
  return [`Sprint: dropped ${id}; ${pointsOf(sprint)} of ${sprint.budget} points.`];
}

function mark(ctx, opts) {
  const sprint = requireSprint(ctx);
  const [id, state, ...reason] = opts.ids;
  requireEntry(sprint, id);
  if (!['planning', 'parked', 'stopped', 'clear'].includes(state)) {
    throw new Refusal('Sprint: mark takes planning, parked, stopped or clear.');
  }
  if (state === 'clear') {
    delete sprint.marks[id];
    writeSprint(ctx.root, ctx.env, sprint);
    return [`Sprint: ${id} mark cleared.`];
  }
  if ((state === 'parked' || state === 'stopped') && !reason.length) {
    throw new Refusal(`Sprint: a ${state} mark needs a reason.`);
  }
  sprint.marks[id] = reason.length ? { state, reason: reason.join(' ') } : { state };
  writeSprint(ctx.root, ctx.env, sprint);
  return [`Sprint: ${id} marked ${state}.`];
}

function note(ctx, opts) {
  const sprint = requireSprint(ctx);
  const [id, ...words] = opts.ids;
  requireEntry(sprint, id);
  sprint.notes[id] = [...(sprint.notes[id] ?? []), words.join(' ')];
  writeSprint(ctx.root, ctx.env, sprint);
  return [`Sprint: noted for ${id}.`];
}

function brief(ctx, opts) {
  const sprint = requireSprint(ctx);
  const id = opts.ids[0];
  requireEntry(sprint, id);
  const entry = requireInBacklog(ctx.backlog(), id);
  const specs = (entry.refs ?? []).filter((r) => r.includes('/specs/')).map((r) => `\`${r}\``);
  return [
    `Take the backlog entry \`${id}\` (${entry.title}) in \`feature-catalog.yaml\` to shipped.`,
    ...(specs.length ? [`Its design: ${specs.join(', ')}.`] : []),
    '',
    'Follow `.claude/framework/workflow.md`, *Delivering an entry*, from the wait for what it',
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
    `Sprint: started ${sprint.started}, ${hours(elapsed)} h ago; ${shippedPoints} of ${pointsOf(sprint)} points shipped, ${sprint.budget} budgeted.`,
    tokenStatus(ctx.root, { env: ctx.env }).line,
  ];
  const stopped = sprint.entries.filter((e) => needsYou(byId[e.id]));
  if (stopped.length) {
    out.push(`Sprint: needs you — ${stopped.length} stopped or parked.`);
    out.push(...stopped.map((e) => `  ${e.id} — ${byId[e.id]}`));
    out.push('Sprint: the rest.');
  }
  out.push(...sprint.entries.filter((e) => !needsYou(byId[e.id])).map((e) => `  ${e.id} — ${byId[e.id]}`));
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
    `Shipped: ${done.length} entries, ${points} points, ${perHour} points per hour.`,
    ...(done.length ? done.map((e) => `  ${e.id} — ${e.points} pts`) : ['  none.']),
    ...section('Parked, needs your decision:', reasons('parked')),
    ...section('Stopped:', reasons('stopped')),
    ...section('Not done:', sprint.entries.filter((e) => byId[e.id] !== 'shipped' && !needsYou(byId[e.id]))
      .map((e) => `  ${e.id} — ${byId[e.id]}`)),
    ...section('Decisions team members reported:', notes),
    ...section('New entries:', newSinceStart(sprint, backlog.catalog)
      .map((e) => `  ${e.id} [${e.type}] — ${e.title}`)),
  ];
}

function end(ctx) {
  const lines = report(ctx);
  rmSync(sprintPath(ctx.root, ctx.env));
  return [...lines, 'Sprint: ended; the sprint file is removed.'];
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
    const marks = readSprint(ctx.root, ctx.env)?.marks ?? {};
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
    } else if (['--points', '--way', '--interval'].includes(word) && rest[i + 1] !== undefined) {
      const value = rest[i + 1];
      i += 1;
      if (word === '--points') opts.points = value;
      else if (word === '--way') opts.way = value;
      else if (/^\d+(\.\d+)?$/.test(value)) opts.intervalMs = Number(value) * 1000;
      else return null;
    } else {
      return null;
    }
  }
  if (['add', 'drop', 'wait', 'brief'].includes(command) && opts.ids.length !== 1) return null;
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
        else if (opts.command === 'wait') print(line);
        else first.push(line);
      }
      return backlog;
    },
  };
  try {
    if (opts.command === 'wait') return await wait(ctx, opts, print);
    const commands = { propose, start, add, drop, mark, note, brief, status, report, end };
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
