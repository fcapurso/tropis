#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * The merge token: one ref on `origin` that a session takes before it opens a pull
 * request, waits for while another session holds it, and releases once the main branch
 * has reported (framework/workflow.md, *The merge token*; decisions FW-049 and the one
 * that follows it).
 *
 * The ref is refs/tropis/merge-token, outside refs/heads/ and refs/tags/. It points at a
 * parentless commit whose message names the holder (a branch, or git's user.name for a
 * developer's hold), its kind and when it was taken.
 *
 *   merge-token.mjs [status]                         who holds it, for how long; exit 0
 *   merge-token.mjs take [--holder <name>] [--hold]  exit 0 taken or already held by this
 *       [--interval <seconds>] [--timeout <minutes>] holder, 3 the holder turned stale, or
 *                                                    the --timeout (optional, no default)
 *                                                    passed, 2 it could not be taken
 *   merge-token.mjs release [--holder <name>] [--hold]  exit 0 released or free, 1 held by
 *                                                    another, 2 it could not be released
 *   merge-token.mjs break --holder <name>            as release, for whoever is named
 *
 * Every command also takes --ref <ref> (tests and live checks only). Where `origin` is
 * on GitHub the take is the REST call that creates a reference, which GitHub refuses with
 * HTTP 422 when it exists; anywhere else it is a push in lock form
 * (--force-with-lease=<ref>: with an empty expected value). A release is a push that
 * states the commit it expects; on GitHub, where a push cannot release (a cloud session's
 * git proxy), the holder deletes the ref through the API after reading the marker.
 *
 * next.mjs imports tokenStatus. Every line on stdout starts `Merge token:`, except the
 * `STOPPED:` line. Never runs gh unless origin is on GitHub.
 */
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { originOnGitHub } from './main-status.mjs';

export const TOKEN_REF = 'refs/tropis/merge-token';
export const STALE_MINUTES = 30;
const LINE = 'Merge token:';
const REF_PATTERN = /^refs\/[A-Za-z0-9._/-]+$/;
const TAKEN_PATTERN = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/;

/** The commit message that names a holder. `taken` is an ISO 8601 UTC string. */
export function markerMessage({ holder, kind, taken }) {
  return `merge token\n\nholder: ${holder}\nkind: ${kind}\ntaken: ${taken}\n`;
}

/** { holder, kind, taken } from a marker message; null without a `holder:` line. */
export function parseMarker(message) {
  const field = (name) => String(message).match(new RegExp(`^${name}: *(.*?) *$`, 'm'))?.[1];
  const holder = field('holder');
  if (!holder) return null;
  const taken = field('taken');
  return {
    holder,
    kind: field('kind') === 'hold' ? 'hold' : 'branch',
    taken: taken && TAKEN_PATTERN.test(taken) && !Number.isNaN(Date.parse(taken)) ? taken : null,
  };
}

/**
 * Whether a held token has been abandoned: held by a branch for at least STALE_MINUTES
 * with no open pull request and no push in that time. `tipMinutes` is the age of the
 * branch's last commit, null when the branch does not exist. A hold is never stale.
 */
export function isStale({ kind, minutes, openPull, tipMinutes }) {
  return kind === 'branch' && typeof minutes === 'number' && minutes >= STALE_MINUTES
    && !openPull && (tipMinutes === null || tipMinutes >= STALE_MINUTES);
}

const firstLine = (text) => String(text ?? '').split('\n').map((l) => l.trim()).find(Boolean);
const noStop = (text) => String(text).replace(/\.$/, '');
const isoSeconds = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });
const minutesSince = (ms, now) => Math.max(0, Math.floor((now() - ms) / 60000));

function git(ctx, args) {
  return spawnSync('git', args, { cwd: ctx.root, env: ctx.env, encoding: 'utf8' });
}

/** gh's exit status, stdout and stderr; `error` when it could not run. */
function gh(ctx, args) {
  const r = spawnSync('gh', args, { cwd: ctx.root, env: ctx.env, encoding: 'utf8', timeout: 30000 });
  if (r.error?.code === 'ENOENT') return { error: 'gh is not installed', stdout: '', stderr: '' };
  if (r.error) return { error: `gh could not run: ${r.error.message}`, stdout: '', stderr: '' };
  const failure = r.status === 0 ? undefined : (firstLine(r.stderr) ?? `gh exited ${r.status}`);
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, error: failure };
}

/** Whether a failed gh reply names this HTTP status, in its message or its JSON body. */
function namesHttp(r, code) {
  const text = `${r.stderr}\n${r.stdout}`;
  return text.includes(`HTTP ${code}`) || new RegExp(`"status"\\s*:\\s*"?${code}"?`).test(text);
}

const apiPath = (ref) => ref.replace(/^refs\//, '');
const segments = (name) => name.split('/').map(encodeURIComponent).join('/');

/**
 * The checkout and origin a command works against, or { error }. `github` is true when
 * origin is a GitHub repository; any other origin gets the git-only forms.
 */
function open(root, env, ref = TOKEN_REF) {
  const origin = originOnGitHub(root, env);
  if (origin.error === 'no remote named origin') return { error: origin.error };
  return { root, env, ref, github: origin.error === undefined };
}

/** { state: 'free' } | { state: 'held', sha, holder, kind, taken } | { error }. */
function readMarker(ctx) {
  let sha;
  let message;
  if (ctx.github) {
    const ref = gh(ctx, ['api', `repos/{owner}/{repo}/git/ref/${apiPath(ctx.ref)}`]);
    if (ref.error) return namesHttp(ref, 404) ? { state: 'free' } : { error: noStop(ref.error) };
    try {
      sha = JSON.parse(ref.stdout).object.sha;
    } catch {
      return { error: 'GitHub answered the ref read with something unexpected' };
    }
    const commit = gh(ctx, ['api', `repos/{owner}/{repo}/git/commits/${sha}`]);
    if (commit.error) return { error: noStop(commit.error) };
    try {
      message = JSON.parse(commit.stdout).message;
    } catch {
      return { error: 'GitHub answered the commit read with something unexpected' };
    }
  } else {
    const listed = git(ctx, ['ls-remote', '--exit-code', 'origin', ctx.ref]);
    if (listed.status === 2) return { state: 'free' };
    if (listed.status !== 0) return { error: noStop(firstLine(listed.stderr) ?? 'git ls-remote failed') };
    sha = listed.stdout.split(/\s+/)[0];
    const fetched = git(ctx, ['fetch', '--quiet', '--no-write-fetch-head', 'origin', ctx.ref]);
    if (fetched.status !== 0) return { error: noStop(firstLine(fetched.stderr) ?? 'git fetch failed') };
    const logged = git(ctx, ['log', '-1', '--format=%B', sha]);
    if (logged.status !== 0) return { error: noStop(firstLine(logged.stderr) ?? 'git log failed') };
    message = logged.stdout;
  }
  const marker = parseMarker(message) ?? { holder: '(unknown)', kind: 'branch', taken: null };
  return { state: 'held', sha, ...marker };
}

/** The tree of origin's main branch as this clone last saw it, or { error }. */
function markerTree(ctx) {
  for (const name of ['refs/remotes/origin/HEAD', 'refs/remotes/origin/main']) {
    const r = git(ctx, ['rev-parse', '--verify', '--quiet', `${name}^{tree}`]);
    if (r.status === 0) return { tree: r.stdout.trim() };
  }
  return { error: 'neither origin/HEAD nor origin/main is known in this clone' };
}

/** 'taken' | 'held' | { error } for one attempt to create the marker. */
function tryTake(ctx, holder, kind, now) {
  const found = markerTree(ctx);
  if (found.error) return { error: found.error, fatal: true };
  const message = markerMessage({ holder, kind, taken: isoSeconds(now()) });
  if (ctx.github) {
    const made = gh(ctx, ['api', '-X', 'POST', 'repos/{owner}/{repo}/git/commits',
      '-f', `message=${message}`, '-f', `tree=${found.tree}`]);
    if (made.error) return { error: noStop(made.error) };
    let sha;
    try {
      sha = JSON.parse(made.stdout).sha;
    } catch {
      return { error: 'GitHub answered the commit create with something unexpected' };
    }
    const created = gh(ctx, ['api', '-X', 'POST', 'repos/{owner}/{repo}/git/refs',
      '-f', `ref=${ctx.ref}`, '-f', `sha=${sha}`]);
    if (!created.error) return 'taken';
    if (namesHttp(created, 422) && /Reference already exists/i.test(`${created.stderr}${created.stdout}`)) return 'held';
    return { error: noStop(created.error) };
  }
  const commit = git(ctx, ['commit-tree', found.tree, '-m', message]);
  if (commit.status !== 0) return { error: noStop(firstLine(commit.stderr) ?? 'git commit-tree failed') };
  const sha = commit.stdout.trim();
  const pushed = git(ctx, ['push', '--porcelain', `--force-with-lease=${ctx.ref}:`, 'origin', `${sha}:${ctx.ref}`]);
  if (pushed.status === 0) return 'taken';
  if (/stale info|already exists/i.test(`${pushed.stdout}${pushed.stderr}`)) return 'held';
  return { error: noStop(firstLine(pushed.stderr) ?? 'git push failed') };
}

/** 'released' | 'released through the API' | 'stale' | { error } for one release. */
function tryRelease(ctx, sha) {
  const pushed = git(ctx, ['push', '--porcelain', `--force-with-lease=${ctx.ref}:${sha}`, 'origin', `:${ctx.ref}`]);
  if (pushed.status === 0) return 'released';
  if (/stale info/i.test(`${pushed.stdout}${pushed.stderr}`)) return 'stale';
  const failure = { error: noStop(firstLine(pushed.stderr) ?? 'git push failed') };
  if (!ctx.github) return failure;
  const again = readMarker(ctx);
  if (again.state !== 'held' || again.sha !== sha) return failure;
  const deleted = gh(ctx, ['api', '-X', 'DELETE', `repos/{owner}/{repo}/git/refs/${apiPath(ctx.ref)}`]);
  return deleted.error ? { error: noStop(deleted.error) } : 'released through the API';
}

/**
 * The holder name a command acts for, or { error }. `--holder` wins; then, with a hold,
 * git's user.name; otherwise the current branch.
 */
function holderFor(ctx, { holder, hold }) {
  if (holder !== undefined) {
    return holder === '' || /[\r\n]/.test(holder) ? { error: '--holder must be one non-empty line' } : { holder };
  }
  const args = hold ? ['config', 'user.name'] : ['branch', '--show-current'];
  const r = git(ctx, args);
  const name = r.status === 0 ? r.stdout.trim() : '';
  return name === '' ? { error: 'cannot tell the holder here; pass --holder' } : { holder: name };
}

/**
 * Who holds the token, as one line.
 * @param {string} root the repository root
 * @returns {{ state: 'free' | 'held' | 'stale' | 'unknown', line: string }}
 */
export function tokenStatus(root, { env = process.env, now = Date.now, ref } = {}) {
  const ctx = open(root, env, ref);
  const unknown = (reason) => ({ state: 'unknown', line: `${LINE} could not tell — ${noStop(reason)}.` });
  if (ctx.error) return unknown(ctx.error);
  const marker = readMarker(ctx);
  if (marker.error) return unknown(marker.error);
  if (marker.state === 'free') return { state: 'free', line: `${LINE} free.` };
  const minutes = marker.taken === null ? null : minutesSince(Date.parse(marker.taken), now);
  const who = marker.kind === 'hold' ? `${marker.holder} (a hold)` : marker.holder;
  const held = `${LINE} held by ${who}${minutes === null ? '' : ` for ${minutes} min`}`;
  if (judgeHolder(ctx, marker, now)) {
    return {
      state: 'stale',
      line: `${held} — stale: ${staleReason(ctx)}. ${breakAdvice(marker)}`,
    };
  }
  return { state: 'held', line: `${held}.` };
}

const staleReason = (ctx) => `${ctx.github ? 'no open pull request and no push' : 'no push'} for ${STALE_MINUTES} min`;
const breakAdvice = (marker) => `Break it only on the developer's word: node .tropis/scripts/merge-token.mjs break --holder ${marker.holder}`;

/**
 * Whether the held token is stale: a branch marker old enough, then the holder's pull
 * requests (GitHub only) and branch asked about. A hold, a marker with no readable time
 * and any error are never stale. Used by status and by take, so they agree.
 */
function judgeHolder(ctx, marker, now) {
  if (marker.kind !== 'branch' || marker.taken === null) return false;
  const minutes = minutesSince(Date.parse(marker.taken), now);
  if (minutes < STALE_MINUTES) return false;
  return ctx.github ? judgeStale(ctx, marker, minutes, now) : judgeStaleByGit(ctx, marker, minutes, now);
}

/**
 * Where origin is not on GitHub pull requests cannot be asked, so the branch alone
 * decides: no such branch on origin, or no push to it for STALE_MINUTES. Any error means
 * not stale.
 */
function judgeStaleByGit(ctx, marker, minutes, now) {
  const listed = git(ctx, ['ls-remote', '--exit-code', 'origin', `refs/heads/${marker.holder}`]);
  let tipMinutes = null;
  if (listed.status !== 2) {
    if (listed.status !== 0) return false;
    const sha = listed.stdout.split(/\s+/)[0];
    const fetched = git(ctx, ['fetch', '--quiet', '--no-write-fetch-head', 'origin', sha]);
    if (fetched.status !== 0) return false;
    const logged = git(ctx, ['log', '-1', '--format=%ct', sha]);
    const seconds = Number(logged.stdout.trim());
    if (logged.status !== 0 || !Number.isFinite(seconds)) return false;
    tipMinutes = minutesSince(seconds * 1000, now);
  }
  return isStale({ kind: marker.kind, minutes, openPull: false, tipMinutes });
}

/** Asks GitHub about the holder's pull requests and branch; any error means not stale. */
function judgeStale(ctx, marker, minutes, now) {
  const pulls = gh(ctx, ['api', 'repos/{owner}/{repo}/pulls?state=open&per_page=100']);
  if (pulls.error) return false;
  let list;
  try {
    list = JSON.parse(pulls.stdout);
  } catch {
    return false;
  }
  if (!Array.isArray(list)) return false;
  const openPull = list.some((pull) => pull?.head?.ref === marker.holder);
  const branch = gh(ctx, ['api', `repos/{owner}/{repo}/branches/${segments(marker.holder)}`]);
  let tipMinutes = null;
  if (branch.error) {
    if (!namesHttp(branch, 404)) return false;
  } else {
    try {
      const date = Date.parse(JSON.parse(branch.stdout).commit.commit.committer.date);
      if (Number.isNaN(date)) return false;
      tipMinutes = minutesSince(date, now);
    } catch {
      return false;
    }
  }
  return isStale({ kind: marker.kind, minutes, openPull, tipMinutes });
}

/**
 * Takes the token, waiting while another holds it.
 * @returns {Promise<{ exit: number, line: string }>}
 */
export async function take(root, {
  env = process.env, ref, holder, hold = false, intervalMs = 30000, timeoutMs = Infinity,
  now = Date.now, sleep: pause = sleep,
} = {}) {
  const ctx = open(root, env, ref);
  const failed = (reason) => ({ exit: 2, line: `${LINE} could not take — ${noStop(reason)}.` });
  if (ctx.error) return failed(ctx.error);
  const who = holderFor(ctx, { holder, hold });
  if (who.error) return failed(who.error);
  const kind = hold ? 'hold' : 'branch';
  const deadline = now() + timeoutMs;
  let readErrors = 0;
  let takeErrors = 0;
  let said = false;
  for (;;) {
    const marker = readMarker(ctx);
    if (marker.error) {
      readErrors += 1;
      if (readErrors >= 3) return failed(marker.error);
      await pause(intervalMs);
      continue;
    }
    readErrors = 0;
    if (marker.state === 'held' && marker.holder === who.holder) {
      return { exit: 0, line: `${LINE} already held by ${who.holder}; keeping it.` };
    }
    if (marker.state === 'held') {
      if (now() >= deadline) return { exit: 3, line: `STOPPED: waiting for the token, held by ${marker.holder}` };
      if (judgeHolder(ctx, marker, now)) {
        return {
          exit: 3,
          line: `STOPPED: waiting for the token, held by ${marker.holder}, which is stale — ${staleReason(ctx)}. ${breakAdvice(marker)}`,
        };
      }
      if (!said) {
        const limit = Number.isFinite(timeoutMs) ? ` (at most ${timeoutMs / 60000} min)` : '';
        process.stderr.write(`merge-token: held by ${marker.holder}; asking every ${intervalMs / 1000} s until it is free or turns stale${limit}\n`);
        said = true;
      }
      await pause(intervalMs);
      continue;
    }
    const attempt = tryTake(ctx, who.holder, kind, now);
    if (attempt === 'taken') return { exit: 0, line: `${LINE} taken by ${who.holder}.` };
    if (attempt === 'held') {
      takeErrors = 0;
      continue;
    }
    if (attempt.fatal) return failed(attempt.error);
    // The create may have succeeded without telling us: the next read decides.
    takeErrors += 1;
    if (takeErrors >= 3) return failed(attempt.error);
    await pause(intervalMs);
  }
}

/** Shared by release and break: acts for `holder`, whoever that is. */
function relinquish(root, { env, ref, holder, hold }, words) {
  const ctx = open(root, env, ref);
  const failed = (reason) => ({ exit: 2, line: `${LINE} could not ${words.verb} — ${noStop(reason)}.` });
  if (ctx.error) return failed(ctx.error);
  const who = holderFor(ctx, { holder, hold });
  if (who.error) return failed(who.error);
  const report = (marker) => (marker.state === 'free'
    ? { exit: 0, line: `${LINE} free — nothing to ${words.verb}.` }
    : { exit: 1, line: `${LINE} held by ${marker.holder}, not ${who.holder}; ${words.left}.` });
  const marker = readMarker(ctx);
  if (marker.error) return failed(marker.error);
  if (marker.state === 'free' || marker.holder !== who.holder) return report(marker);
  const result = tryRelease(ctx, marker.sha);
  if (result === 'stale') {
    const again = readMarker(ctx);
    if (again.error) return failed(again.error);
    if (again.state === 'free' || again.holder !== who.holder) return report(again);
    return failed('the token changed while it was being released');
  }
  if (result.error) return failed(result.error);
  const via = result === 'released' ? '' : ' through the API';
  return {
    exit: 0,
    line: words.verb === 'break'
      ? `${LINE} broken — it was held by ${who.holder}${via}.`
      : `${LINE} released by ${who.holder}${via}.`,
  };
}

/** Releases the token for its holder only. Returns { exit, line }. */
export function release(root, { env = process.env, ...options } = {}) {
  return relinquish(root, { env, ...options }, { verb: 'release', left: 'left as it is' });
}

/** Releases the token for whoever `holder` names. Returns { exit, line }. */
export function breakToken(root, { env = process.env, ...options } = {}) {
  return relinquish(root, { env, ...options }, { verb: 'break', left: 'not broken' });
}

const USAGE = 'usage: merge-token.mjs [status | take | release | break --holder <name>] [--holder <name>] [--hold] '
  + '[--interval <seconds>] [--timeout <minutes>] [--ref <ref>]\n';

/** The options the command line asks for, or null when it is not understood. */
function parseArgs(argv) {
  const opts = { command: 'status', intervalMs: 30000, timeoutMs: Infinity, hold: false };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('-')) opts.command = rest.shift();
  if (!['status', 'take', 'release', 'break'].includes(opts.command)) return null;
  while (rest.length > 0) {
    const flag = rest.shift();
    if (flag === '--hold') {
      opts.hold = true;
      continue;
    }
    const value = rest.shift();
    if (value === undefined) return null;
    if (flag === '--holder') opts.holder = value;
    else if (flag === '--interval' && value !== '' && Number(value) >= 0) opts.intervalMs = Number(value) * 1000;
    else if (flag === '--timeout' && value !== '' && Number(value) >= 0) opts.timeoutMs = Number(value) * 60000;
    else if (flag === '--ref') {
      if (!REF_PATTERN.test(value) || value.startsWith('refs/heads/') || value.startsWith('refs/tags/')) return null;
      opts.ref = value;
    } else return null;
  }
  if (opts.command === 'break' && opts.holder === undefined) return null;
  return opts;
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
  } else if (opts.command === 'status') {
    process.stdout.write(`${tokenStatus(root, { ref: opts.ref }).line}\n`);
  } else {
    const run = { take, release, break: breakToken }[opts.command];
    const result = await run(root, opts);
    process.stdout.write(`${result.line}\n`);
    process.exitCode = result.exit;
  }
}
