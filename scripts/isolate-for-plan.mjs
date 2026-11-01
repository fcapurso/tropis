#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * Creates every worktree a plan's Repositories table names, each in the checkout its
 * row names.
 *
 * Every row's command once ran in whichever checkout the helper was invoked from, so a
 * two-checkout plan got two worktrees of the FIRST repository — one at the path
 * reserved for the second — and the agent sent there found the wrong files at step
 * one. So each row is resolved to a checkout by the directory its first backticked span
 * names: this checkout, or a sibling beside it. Every row is resolved before anything is
 * created, so a name that matches nothing stops the run with nothing half-isolated.
 *
 * Run through `.tropis/scripts/isolate-for-plan.sh`, which sits beside it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateDispatchable, isSiblingWorktree, checkoutName, isolationBase } from './plan-binding.js';
import { mainStatus } from './main-status.mjs';

const planArg = process.argv[2];
if (!planArg) {
  process.stderr.write('usage: isolate-for-plan.sh <plan-path>\n');
  process.exit(1);
}

const repoRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout.trim();
if (!repoRoot) {
  process.stderr.write('not a git repository\n');
  process.exit(1);
}

let markdown;
try {
  markdown = readFileSync(resolve(repoRoot, planArg), 'utf8');
} catch {
  process.stderr.write(`cannot read ${planArg}\n`);
  process.exit(1);
}

const v = validateDispatchable(markdown);
if (!v.ok) {
  process.stderr.write(v.errors.map((e) => `${e}\n`).join(''));
  process.exit(1);
}

/** This checkout if the row names it, a sibling beside it if one exists, else null. */
function checkoutRoot(row) {
  const name = checkoutName(row.checkout);
  if (name === basename(repoRoot)) return repoRoot;
  const sibling = resolve(repoRoot, '..', name);
  return existsSync(join(sibling, '.git')) ? sibling : null;
}

const targets = [];
for (const row of v.repos) {
  if (!row.isolation) continue;
  if (!isSiblingWorktree(row.isolation)) {
    process.stderr.write(`refusing nested isolation: ${row.isolation}\n`);
    process.exit(1);
  }
  const cwd = checkoutRoot(row);
  if (!cwd) {
    process.stderr.write(
      `no checkout named "${checkoutName(row.checkout)}" beside ${repoRoot} — `
      + `refusing to isolate "${row.checkout}" in the wrong repository\n`,
    );
    process.exit(1);
  }
  targets.push({ isolation: row.isolation, cwd, checkout: checkoutName(row.checkout) });
}

const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' });

// A worktree is cut from a commit, and the executor reads the plan from it. In the
// checkout holding the plan, refuse a base that lacks the plan (an uncommitted or
// unpushed plan leaves the executor with nothing to execute), and note one that is not
// on the remote's main branch, where the review record will be read from. The other
// checkouts hold no plan, so nothing is checked in them.
const notes = [];
const planPath = relative(repoRoot, resolve(repoRoot, planArg));
for (const { isolation, cwd, checkout } of targets) {
  if (cwd !== repoRoot) continue;
  const start = isolationBase(isolation);
  const commit = git(repoRoot, 'rev-parse', '--verify', '--quiet', `${start}^{commit}`);
  if (commit.status !== 0) {
    process.stderr.write(`refusing to isolate: ${start} is not a commit in ${checkout}. Nothing was created.\n`);
    process.exit(1);
  }
  const sha = commit.stdout.trim();
  const short = sha.slice(0, 7);
  if (git(repoRoot, 'cat-file', '-e', `${sha}:${planPath}`).status !== 0) {
    process.stderr.write(
      `refusing to isolate: ${planPath} is not committed in ${short} (${start}), the commit ${checkout} would branch from. `
      + 'Commit the plan and push it to that base first. Nothing was created.\n',
    );
    process.exit(1);
  }
  const remoteMain = ['refs/remotes/origin/HEAD', 'refs/remotes/origin/main']
    .find((ref) => git(repoRoot, 'rev-parse', '--verify', '--quiet', ref).status === 0);
  if (remoteMain && git(repoRoot, 'merge-base', '--is-ancestor', sha, remoteMain).status !== 0) {
    notes.push(
      `Note: ${short} (${start}) is not on ${remoteMain.replace('refs/remotes/', '')}, `
      + "where the plan's review record is read from. Push it there before the review.",
    );
  }
}

// Before any worktree: whether the main branch is red. It informs; isolation goes on.
process.stdout.write(`${mainStatus(repoRoot).line}\n`);
for (const note of notes) process.stdout.write(`${note}\n`);

for (const { isolation, cwd } of targets) {
  const r = spawnSync(isolation, { cwd, shell: true, encoding: 'utf8' });
  if (r.status !== 0) {
    process.stderr.write(r.stderr || r.stdout || 'worktree add failed\n');
    process.exit(1);
  }
  process.stdout.write(`isolated in ${cwd}: ${isolation}\n`);
}
