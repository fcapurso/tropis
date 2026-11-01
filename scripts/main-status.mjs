#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * Says whether the main branch's pipeline is red, asking GitHub through `gh`.
 *
 * Read-only. With no arguments it prints one line about the last finished push run of
 * the pipeline workflow (.github/workflows/pipeline.yml) on the repository's default
 * branch, and exits 0 whatever it found. With --wait <commit> it waits for the push run
 * on that commit to finish, prints one line, and exits 0 green, 1 red, 3 still running
 * at the timeout. With --pull-request <number> it waits for a pull request set to merge
 * itself, bringing its branch up to date whenever it falls behind, then waits for the run
 * on the merge commit as --wait does; it exits 4 naming why when the pull request did not
 * merge, naming why: a conflict, a failed check, auto-merge off, the pull request closed,
 * or a blocked pull request whose pipeline runs have all finished while a check the base
 * branch's rules require has no check run (nothing will start it). Where it cannot ask — origin not on GitHub, no gh, gh failing — it prints that it
 * could not tell and why, and exits 0.
 *
 * The backlog report and the isolation helper import mainStatus; the workflow's merge
 * sequence runs --wait, and the workflow's gated merge, /release and the commit hook name
 * --pull-request. gh is never run unless origin is on GitHub, so a repository
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

function listRuns(root, filter, options) {
  const asked = askGh(root, ['run', 'list', '--workflow', WORKFLOW, ...filter,
    '--limit', '20', '--json', FIELDS], options);
  if (asked.error) return asked;
  if (!Array.isArray(asked.value)) return { error: 'gh answered with something other than a list of runs' };
  return { value: newestFirst(asked.value) };
}

const runsOn = (root, filter, options) => listRuns(root, [...filter, '--event', 'push'], options);

/** The contexts the base branch's rules require, in order; [] when GitHub cannot say. */
function requiredChecks(root, base, options) {
  const asked = askGh(root, ['api', `repos/{owner}/{repo}/rules/branches/${encodeURIComponent(base)}?per_page=100`], options);
  if (asked.error || !Array.isArray(asked.value)) return [];
  return asked.value
    .filter((rule) => rule?.type === 'required_status_checks')
    .flatMap((rule) => rule.parameters?.required_status_checks ?? [])
    .map((check) => check?.context)
    .filter((context) => typeof context === 'string' && context !== '');
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

/**
 * Waits for a pull request set to merge itself to merge, then for the push run on its
 * merge commit. While it waits, a branch behind its base is brought up to date through
 * GitHub's update-branch endpoint, once per head commit. A blocked pull request whose
 * pipeline runs on the head have all finished, while a check the base branch's rules
 * require has no check run, stops with exit 4: nothing will start that check. The rules
 * are asked once, and an answer that cannot be read means no required check. Reads only,
 * apart from update-branch; makes no local git change.
 * @param {string} root the repository root
 * @param {number} number the pull request's number
 * @returns {Promise<{ state: string, line: string, exit: number }>}
 */
export async function seeThrough(root, number, {
  env = process.env, ghTimeoutMs = 20000, intervalMs = 30000, timeoutMs = 1800000,
} = {}) {
  const options = { env, ghTimeoutMs };
  const name = `Pull request #${number}`;
  const cannotTell = (reason) => ({ state: 'unknown', line: `${name}: could not tell — ${reason}.`, exit: 0 });
  const stopped = (why) => ({ state: 'stopped', line: `${name}: did not merge — ${why}`, exit: 4 });
  const origin = originOnGitHub(root, env);
  if (origin.error) return cannotTell(origin.error);
  const updated = new Set();
  let required;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const asked = askGh(root, ['api', `repos/{owner}/{repo}/pulls/${number}`], options);
    if (asked.error) return cannotTell(asked.error);
    const pull = asked.value ?? {};
    const head = pull.head?.sha;
    const base = pull.base?.ref;
    if (pull.merged === true) {
      if (!pull.merge_commit_sha) return cannotTell('GitHub named no merge commit');
      const run = await waitForRun(root, pull.merge_commit_sha, { env, ghTimeoutMs, intervalMs, timeoutMs });
      return { ...run, line: `${name} merged as ${short(pull.merge_commit_sha)}. ${run.line}` };
    }
    if (pull.state === 'closed') return stopped('it was closed without merging.');
    if (pull.auto_merge === null) return stopped('auto-merge is off.');
    const checks = askGh(root, ['api', `repos/{owner}/{repo}/commits/${head}/check-runs?per_page=100`], options);
    if (checks.error) return cannotTell(checks.error);
    const failed = (checks.value?.check_runs ?? []).find((check) => RED.has(check.conclusion));
    if (failed) return stopped(`the check ${failed.name} failed on ${short(head)}. Run: ${failed.html_url}`);
    if (pull.mergeable_state === 'dirty') return stopped(`it conflicts with ${base}.`);
    if (pull.mergeable_state === 'behind' && !updated.has(head)) {
      const update = askGh(root, ['api', '-X', 'PUT', `repos/{owner}/{repo}/pulls/${number}/update-branch`,
        '-f', `expected_head_sha=${head}`], options);
      if (update.error) {
        const reason = update.error.replace(/^gh failed: /, '').replace(/^gh: /, '');
        return stopped(`it is behind ${base} and could not be brought up to date: ${reason}.`);
      }
      updated.add(head);
      process.stderr.write(`main-status: pull request #${number} was behind ${base}; brought it up to date\n`);
    }
    if (pull.mergeable_state === 'blocked') {
      required ??= requiredChecks(root, base, options);
      const present = new Set((checks.value?.check_runs ?? []).map((check) => check.name));
      const missing = required.find((context) => !present.has(context));
      if (missing !== undefined) {
        const onHead = listRuns(root, ['--commit', head], options);
        if (!onHead.error && onHead.value.length > 0 && onHead.value.every((r) => r.status === 'completed')) {
          return stopped(`the pipeline finished on ${short(head)} without the required check ${missing}, `
            + `and nothing will start it now. Run: ${onHead.value[0].url}`);
        }
      }
    }
    if (Date.now() >= deadline) {
      return { state: 'waiting', line: `${name}: still open — not merged within ${timeoutMs / 60000} minutes.`, exit: 3 };
    }
    await new Promise((done) => { setTimeout(done, intervalMs); });
  }
}

const USAGE = 'usage: main-status.mjs [--wait <commit> | --pull-request <number>] [--interval <seconds>] [--timeout <minutes>]\n';

/** The options the command line asks for, or null when it is not understood. */
function parseArgs(argv) {
  const opts = { intervalMs: 30000, timeoutMs: 1800000 };
  if (argv.length === 0) return opts;
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined || value === '') return null;
    if (flag === '--wait' && !value.startsWith('-')) opts.commit = value;
    else if (flag === '--pull-request' && /^[1-9]\d*$/.test(value)) opts.pullRequest = Number(value);
    else if (flag === '--interval' && Number(value) >= 0) opts.intervalMs = Number(value) * 1000;
    else if (flag === '--timeout' && Number(value) > 0) opts.timeoutMs = Number(value) * 60000;
    else return null;
  }
  return (opts.commit === undefined) !== (opts.pullRequest === undefined) ? opts : null;
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
  } else if (opts.pullRequest) {
    process.stderr.write(`main-status: waiting for pull request #${opts.pullRequest} to merge, asking every ${opts.intervalMs / 1000} s for up to ${opts.timeoutMs / 60000} min\n`);
    const result = await seeThrough(root, opts.pullRequest, opts);
    process.stdout.write(`${result.line}\n`);
    process.exitCode = result.exit;
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
