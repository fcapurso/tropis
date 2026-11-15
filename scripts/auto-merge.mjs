#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * Sets a pull request to merge itself, on the developer's computer and in a Claude Code
 * cloud session alike. Two command lines:
 *
 * usage: auto-merge.mjs <number> --subject <subject> --body <body>
 *        auto-merge.mjs <number> --rebase
 *
 * The first sets a squash, with the squash commit's subject and body: it runs
 * `gh pr merge <number> --auto --squash --subject … --body …`. The second sets a rebase
 * merge, which keeps each of the pull request's commits on the main branch, and only for a
 * pull request of prose alone (workflow.md, *A session's prose lands as one pull
 * request*): it reads the pull request, takes its base and head commits and asks
 * `planStages` from ./pipeline.mjs, the function behind `pipeline.mjs plan`, so there is
 * no second definition of prose. A rebase sets no title or message because it writes no
 * commit of its own, so `--rebase` with `--subject` or `--body` is a command line it does
 * not understand. It runs no fetch: a commit missing locally is refused with a line that
 * says to fetch origin. The maintainer's flushed groups run `gh pr merge --rebase` themselves
 * and never come here.
 *
 * GitHub's REST API has no auto-merge endpoint, so gh uses GraphQL, which a cloud
 * session's proxy refuses with "GitHub GraphQL is not available". Only on that refusal
 * does it call the proxy's own route, `PUT repos/{owner}/{repo}/pulls/<number>/ccr/auto_merge`,
 * which exists only there, with `merge_method` squash and the subject and body, or rebase
 * and nothing else. Any other refusal is gh's real answer and is reported, never
 * retried by the other route. Prints one line; exits 0 when set, 1 when not, 2 on a
 * command line it does not understand. gh is run only when origin is on GitHub.
 *
 * The cloud route answered "enabled" for a pull request already merged (2026-11-05), so
 * its answer is not proof: `main-status.mjs --pull-request` reads auto_merge afterwards
 * and stops on "auto-merge is off". For a rebase, the route answered enabled with
 * `merge_method` rebase (2026-11-13, Claude Code 2.1.323, Linux x86_64).
 */
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { originOnGitHub } from './main-status.mjs';
import { planStages } from './pipeline.mjs';

const GRAPHQL_REFUSED = 'GitHub GraphQL is not available';
const USAGE = 'usage: auto-merge.mjs <number> --subject <subject> --body <body>\n'
  + '       auto-merge.mjs <number> --rebase\n';

const firstLine = (text) => (text || '').split('\n').map((l) => l.trim()).find(Boolean);

/** The options the command line asks for, or null when it is not understood. */
export function parseArgs(argv) {
  const [number, ...rest] = argv;
  if (!/^[1-9]\d*$/.test(number ?? '')) return null;
  if (rest.length === 1 && rest[0] === '--rebase') return { number: Number(number), rebase: true };
  const opts = { number: Number(number) };
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (value === undefined) return null;
    if (flag === '--subject' && value.trim() !== '') opts.subject = value;
    else if (flag === '--body') opts.body = value;
    else return null;
  }
  return opts.subject !== undefined && opts.body !== undefined ? opts : null;
}

/**
 * Why a rebase merge is refused for the pull request, or null when it is prose by the
 * pipeline's own plan. Reads the pull request through gh and runs git locally, no fetch.
 * @returns {string | null}
 */
function refuseUnlessProse(root, number, gh) {
  const read = gh(['api', `repos/{owner}/{repo}/pulls/${number}`]);
  if (read.error?.code === 'ENOENT') return 'gh is not installed';
  if (read.error) return `gh could not run: ${read.error.message}`;
  if (read.status !== 0) {
    return `gh could not read the pull request: ${(firstLine(read.stderr) ?? `exit ${read.status}`).replace(/\.$/, '')}`;
  }
  let pull;
  try {
    pull = JSON.parse(read.stdout);
  } catch {
    return 'gh answered the pull request read with something other than JSON';
  }
  const base = pull?.base?.sha;
  const head = pull?.head?.sha;
  if (!base || !head) return 'the pull request read named no base or head commit';
  for (const sha of [base, head]) {
    const found = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
    if (found.status !== 0) return `${sha.slice(0, 7)} is not in this repository; run git fetch origin and run this again`;
  }
  const plan = planStages(root, { base, head });
  if (plan.error) return `the pipeline's plan failed: ${plan.error}`;
  const others = Object.entries(plan.stages).filter(([stage]) => stage !== 'framework');
  if (plan.reason === null && others.every(([, value]) => value === 'skipped')) return null;
  const running = others.filter(([, value]) => value !== 'skipped').map(([stage]) => stage);
  return `it is not prose: the pipeline's plan runs ${running.join(', ')} on it, and only prose merges by rebase`;
}

/**
 * Sets auto-merge on the pull request, by gh pr merge or, on the GraphQL refusal, by the
 * cloud session's route.
 * @returns {{ line: string, exit: number }}
 */
export function autoMerge(root, { number, subject, body, rebase = false }, { env = process.env } = {}) {
  const name = `Pull request #${number}`;
  const notSet = (why) => ({ line: `${name}: not set to merge itself — ${why}.`, exit: 1 });
  const origin = originOnGitHub(root, env);
  if (origin.error) return notSet(origin.error);
  const gh = (args) => spawnSync('gh', args, { cwd: root, env, encoding: 'utf8' });

  if (rebase) {
    const refused = refuseUnlessProse(root, number, gh);
    if (refused) return notSet(refused);
  }
  const how = rebase ? 'by rebase' : 'as a squash';
  const merge = gh(rebase
    ? ['pr', 'merge', String(number), '--auto', '--rebase']
    : ['pr', 'merge', String(number), '--auto', '--squash', '--subject', subject, '--body', body]);
  if (merge.error?.code === 'ENOENT') return notSet('gh is not installed');
  if (merge.error) return notSet(`gh could not run: ${merge.error.message}`);
  if (merge.status === 0) return { line: `${name}: set to merge itself ${how}.`, exit: 0 };
  const said = `${merge.stdout}\n${merge.stderr}`;
  if (!said.includes(GRAPHQL_REFUSED)) {
    return notSet(`gh pr merge answered: ${(firstLine(merge.stderr) ?? `exit ${merge.status}`).replace(/\.$/, '')}`);
  }

  const path = `repos/{owner}/{repo}/pulls/${number}/ccr/auto_merge`;
  const route = gh(['api', '-X', 'PUT', path, ...(rebase
    ? ['-f', 'merge_method=rebase']
    : ['-f', 'merge_method=squash', '-f', `commit_title=${subject}`, '-f', `commit_message=${body}`])]);
  if (route.status !== 0) {
    return notSet(`gh is refused GraphQL here, and the cloud session's route answered: ${(firstLine(route.stderr) ?? `exit ${route.status}`).replace(/\.$/, '')}`);
  }
  let answer;
  try {
    answer = JSON.parse(route.stdout);
  } catch {
    return notSet("the cloud session's route answered with something other than JSON");
  }
  if (answer?.enabled !== true) return notSet("the cloud session's route did not say it was enabled");
  return { line: `${name}: set to merge itself ${how}, through the cloud session's route.`, exit: 0 };
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
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) {
    process.stderr.write(USAGE);
    process.exitCode = 2;
  } else {
    const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
    const root = top.status === 0 ? top.stdout.trim() : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const result = autoMerge(root, opts);
    process.stdout.write(`${result.line}\n`);
    process.exitCode = result.exit;
  }
}
