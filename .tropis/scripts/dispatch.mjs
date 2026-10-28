#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * Prints the thin kick-off prompt for a plan, or says why the plan cannot be dispatched.
 *
 * Run from the project root: `npm --prefix .tropis run dispatch -- <plan-path>`.
 * Paste what it prints into a new session. On a plan that is not dispatchable it prints
 * nothing to stdout — there is nothing to paste — and names every problem on stderr.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkoutName,
  parseWorktreeSetup,
  WORKTREE_SETUP,
  validateDispatchable,
  missingProjections,
  parseExecutionProtocol,
  parseLastVerified,
  isStale,
  picksForTier,
  renderThinPrompt,
} from './plan-binding.js';

const planArg = process.argv[2];
if (!planArg) {
  process.stderr.write('usage: npm --prefix .tropis run dispatch -- <plan-path>\n');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
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

// The project's own picks, written by /refresh-model-tiers. The framework ships none.
let picksText = null;
try {
  picksText = readFileSync(resolve(root, 'docs/model-picks.md'), 'utf8');
} catch {
  // No picks file: the prompt says to run /refresh-model-tiers.
}
const protocol = parseExecutionProtocol(markdown);
const lastVerified = picksText === null ? null : parseLastVerified(picksText);

// Each worktree's setup comes from its own checkout — this one, or the sibling folder the
// row names — the way the isolation helper finds them.
function setupFor(row) {
  const name = checkoutName(row.checkout);
  const dir = name === basename(root) ? root : resolve(root, '..', name);
  try {
    return parseWorktreeSetup(readFileSync(join(dir, WORKTREE_SETUP), 'utf8'));
  } catch {
    return null;
  }
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
  }) + '\n',
);
