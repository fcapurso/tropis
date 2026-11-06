#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * Sets a pull request to merge itself as a squash, with the squash commit's subject and
 * body, on the developer's computer and in a Claude Code cloud session alike.
 *
 * usage: auto-merge.mjs <number> --subject <subject> --body <body>
 *
 * It runs `gh pr merge <number> --auto --squash --subject … --body …`. GitHub's REST API
 * has no auto-merge endpoint, so that command uses GraphQL, which a cloud session's proxy
 * refuses with "GitHub GraphQL is not available". Only on that refusal does it call the
 * proxy's own route, `PUT repos/{owner}/{repo}/pulls/<number>/ccr/auto_merge`, which
 * exists only there. Any other refusal is gh's real answer and is reported, never
 * retried by the other route. Prints one line; exits 0 when set, 1 when not, 2 on a
 * command line it does not understand. gh is run only when origin is on GitHub.
 *
 * The cloud route answered "enabled" for a pull request already merged (2026-11-05), so
 * its answer is not proof: `main-status.mjs --pull-request` reads auto_merge afterwards
 * and stops on "auto-merge is off".
 */
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { originOnGitHub } from './main-status.mjs';

const GRAPHQL_REFUSED = 'GitHub GraphQL is not available';
const USAGE = 'usage: auto-merge.mjs <number> --subject <subject> --body <body>\n';

const firstLine = (text) => (text || '').split('\n').map((l) => l.trim()).find(Boolean);

/** The options the command line asks for, or null when it is not understood. */
export function parseArgs(argv) {
  const [number, ...rest] = argv;
  if (!/^[1-9]\d*$/.test(number ?? '')) return null;
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
 * Sets auto-merge on the pull request, by gh pr merge or, on the GraphQL refusal, by the
 * cloud session's route.
 * @returns {{ line: string, exit: number }}
 */
export function autoMerge(root, { number, subject, body }, { env = process.env } = {}) {
  const name = `Pull request #${number}`;
  const notSet = (why) => ({ line: `${name}: not set to merge itself — ${why}.`, exit: 1 });
  const origin = originOnGitHub(root, env);
  if (origin.error) return notSet(origin.error);
  const gh = (args) => spawnSync('gh', args, { cwd: root, env, encoding: 'utf8' });

  const merge = gh(['pr', 'merge', String(number), '--auto', '--squash', '--subject', subject, '--body', body]);
  if (merge.error?.code === 'ENOENT') return notSet('gh is not installed');
  if (merge.error) return notSet(`gh could not run: ${merge.error.message}`);
  if (merge.status === 0) return { line: `${name}: set to merge itself as a squash.`, exit: 0 };
  const said = `${merge.stdout}\n${merge.stderr}`;
  if (!said.includes(GRAPHQL_REFUSED)) {
    return notSet(`gh pr merge answered: ${(firstLine(merge.stderr) ?? `exit ${merge.status}`).replace(/\.$/, '')}`);
  }

  const route = gh(['api', '-X', 'PUT', `repos/{owner}/{repo}/pulls/${number}/ccr/auto_merge`,
    '-f', 'merge_method=squash', '-f', `commit_title=${subject}`, '-f', `commit_message=${body}`]);
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
  return { line: `${name}: set to merge itself as a squash, through the cloud session's route.`, exit: 0 };
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
