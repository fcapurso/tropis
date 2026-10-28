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
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateDispatchable, isSiblingWorktree, checkoutName } from './plan-binding.js';

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
  targets.push({ isolation: row.isolation, cwd });
}

for (const { isolation, cwd } of targets) {
  const r = spawnSync(isolation, { cwd, shell: true, encoding: 'utf8' });
  if (r.status !== 0) {
    process.stderr.write(r.stderr || r.stdout || 'worktree add failed\n');
    process.exit(1);
  }
  process.stdout.write(`isolated in ${cwd}: ${isolation}\n`);
}
