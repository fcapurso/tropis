#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * Prints the thin kick-off prompt for a plan, or says why the plan cannot be dispatched.
 *
 * Run from the project root: `npm --prefix .tropis run dispatch -- <plan-path>`.
 * Paste what it prints into a new session. On a plan that is not dispatchable it prints
 * nothing to stdout — there is nothing to paste — and names every problem on stderr.
 */
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkoutName,
  parseWorktreeSetup,
  WORKTREE_SETUP,
  OLD_WORKTREE_SETUP,
  validateDispatchable,
  missingProjections,
  parseExecutionProtocol,
  parseLastVerified,
  isStale,
  picksForTier,
  pickToUse,
  isTier,
  NO_PICKS_USE,
  renderThinPrompt,
} from './plan-binding.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// The git directory every worktree of this project shares: where the local, never
// committed subscriptions record lives. Null when git cannot say.
function commonGitDir() {
  const g = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: root, encoding: 'utf8' });
  return g.status === 0 ? resolve(root, g.stdout.trim()) : null;
}

// Writer mode, used by /refresh-model-tiers: the record sits under .git, which Claude
// Code treats as sensitive for every file tool and shell redirect, so a script writes it.
if (process.argv[2] === '--subscriptions') {
  const given = process.argv.slice(3).map((a) => a.trim());
  if (given.length === 0 || !given.every((a) => /^[^:]+:\s*\S/.test(a) && !a.startsWith(':'))) {
    process.stderr.write('usage: node .tropis/scripts/dispatch.mjs --subscriptions "<tool>: <subscription>" ...\n');
    process.exit(1);
  }
  const dir = commonGitDir();
  if (dir === null) {
    process.stderr.write('Cannot record subscriptions: this is not a git checkout.\n');
    process.exit(1);
  }
  mkdirSync(join(dir, 'tropis'), { recursive: true });
  writeFileSync(
    join(dir, 'tropis/subscriptions.txt'),
    `# Written by /refresh-model-tiers. Never committed.\n${given.join('\n')}\n`,
  );
  process.stdout.write(`Subscriptions recorded for ${given.length} tools, on this machine only.\n`);
  process.exit(0);
}

// The project's own picks, written by /refresh-model-tiers. The framework ships none.
let picksText = null;
try {
  picksText = readFileSync(resolve(root, 'docs/model-picks.md'), 'utf8');
} catch {
  // No picks file: the prompt says to run /refresh-model-tiers.
}
// Which subscriptions the developer holds: a local record under the git directory shared
// by every worktree, never committed. No git or no file means none is recorded.
let subscriptionsText = null;
try {
  const dir = commonGitDir();
  if (dir !== null) subscriptionsText = readFileSync(join(dir, 'tropis/subscriptions.txt'), 'utf8');
} catch {
  // No record.
}

// Prints the pick `/dispatch` would name for a plan of this tier: how a session starting
// an agent that runs no plan (a fresh reviewer, a probe) chooses its model.
if (process.argv[2] === '--tier') {
  const tier = process.argv[3];
  if (!isTier(tier)) {
    process.stderr.write(
      'usage: node .tropis/scripts/dispatch.mjs --tier <tier>, where <tier> is one of Small, Small–medium, Medium, Medium–large, Large\n',
    );
    process.exit(1);
  }
  process.stdout.write(`${picksText === null ? NO_PICKS_USE : pickToUse(picksText, tier, subscriptionsText)}\n`);
  process.exit(0);
}

const planArg = process.argv[2];
if (!planArg) {
  process.stderr.write(
    'usage: npm --prefix .tropis run dispatch -- <plan-path>\n'
    + '   or: node .tropis/scripts/dispatch.mjs --subscriptions "<tool>: <subscription>" ...\n'
    + '   or: node .tropis/scripts/dispatch.mjs --tier <tier>\n',
  );
  process.exit(1);
}

let markdown;
try {
  markdown = readFileSync(resolve(root, planArg), 'utf8');
} catch {
  process.stderr.write(`cannot read ${planArg}\n`);
  process.exit(1);
}

const v = validateDispatchable(markdown);
if (!v.ok) {
  process.stderr.write(v.errors.map((e) => `${e}\n`).join(''));
  process.exit(1);
}

// In a project that projects its rules for Cursor, a plan listing a rule file without
// its projection forbids the regeneration its own suite will demand. Refuse it here,
// while its author is in the room, rather than letting the executor find a red suite.
if (existsSync(resolve(root, '.cursor/rules'))) {
  // Shipped rules are generated from .claude/rule-areas.json, so a plan listing that file
  // must also list each shipped rule's generated files.
  const shippedDir = resolve(root, '.tropis/rules');
  const shipped = existsSync(shippedDir)
    ? readdirSync(shippedDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
    : [];
  const unpaired = missingProjections(markdown, shipped);
  if (unpaired.length > 0) {
    for (const { source, projection } of unpaired) {
      process.stderr.write(`${source} is projected to ${projection}, which is not in the File Structure table\n`);
    }
    process.exit(1);
  }
}

const protocol = parseExecutionProtocol(markdown);
const lastVerified = picksText === null ? null : parseLastVerified(picksText);


// Each worktree's setup comes from its own checkout — this one, or the sibling folder the
// row names — the way the isolation helper finds them.
function setupFor(row) {
  const name = checkoutName(row.checkout);
  const dir = name === basename(root) ? root : resolve(root, '..', name);
  for (const file of [WORKTREE_SETUP, OLD_WORKTREE_SETUP]) {
    let text;
    try {
      text = readFileSync(join(dir, file), 'utf8');
    } catch {
      continue;
    }
    return parseWorktreeSetup(text);
  }
  return null;
}
const setups = v.repos
  .filter((row) => row.isolation)
  .map((row) => ({ checkout: row.checkout, steps: setupFor(row) }));

process.stdout.write(
  renderThinPrompt({
    planPath: planArg,
    protocol,
    repos: v.repos,
    picks: picksText === null ? null : (picksForTier(picksText, protocol.tier) || '(no row for this tier)'),
    lastVerified: lastVerified ?? '(missing)',
    stale: lastVerified ? isStale(lastVerified, new Date()) : false,
    setups,
    here: basename(root),
    use: picksText === null ? null : pickToUse(picksText, protocol.tier, subscriptionsText),
  }) + '\n',
);
