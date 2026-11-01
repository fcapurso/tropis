#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * Plans that share a file merge in the order they were claimed.
 *
 * --claim <plan>: compares the plan's File Structure table with the plan of every
 * catalog entry in `building`. Where they share a file it names the entry and the files
 * and writes `**Merges after:** <ids>` into the plan's header (adding to the field, never
 * removing). Exit 0 whether or not there was an overlap; 2 when the catalog or the plan
 * cannot be read, or the plan lists no file.
 *
 * --wait <plan> [--interval <seconds>] [--timeout <minutes>]: before a merge, waits until
 * every entry in the plan's `Merges after` is `shipped` or `dropped` in the catalog on
 * origin's main branch, fetching every time. Defaults 30 seconds and 60 minutes. Exit 0
 * when they have, or when the plan merges after nothing (git is not run); 2 when origin
 * or its catalog cannot be read, or names an id the catalog lacks; 3 at the timeout,
 * printing `STOPPED: waiting on <ids>`.
 *
 * Pure functions are exported for the guard; the command line runs only when this file is
 * run directly.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  fileStructurePaths, deliversIds, mergesAfterIds, withMergesAfter,
} from './plan-binding.js';

// Every plan touches these, so counting them would make every pair of plans overlap; a
// conflict in them on rebase is resolved mechanically. The one list to extend.
export const BOOKKEEPING = new Set([
  'feature-catalog.yaml',
  'docs/backlog-board/bands.yaml',
  'docs/backlog-board/index.html',
  'RELEASES.md',
  'DECISIONS.md',
  'framework/DECISIONS.md',
]);

/** The files both plans list, bookkeeping files excluded, sorted. */
export function sharedFiles(planA, planB) {
  const b = new Set(fileStructurePaths(planB));
  return [...new Set(fileStructurePaths(planA))]
    .filter((f) => b.has(f) && !BOOKKEEPING.has(f))
    .sort();
}

/**
 * The plans of entries in `building` that share a file with this plan, in catalog order.
 * An entry this plan delivers is itself, not a rival. `readPlan(path)` gives a plan's
 * text or null; those that cannot be read are returned apart, not compared.
 * @returns {{found: Array<{id: string, plan: string, files: string[]}>, unreadable: Array<{id: string, plan: string}>}}
 */
export function overlaps(catalog, planPath, planText, readPlan) {
  const own = new Set(deliversIds(planText));
  const found = [];
  const unreadable = [];
  for (const entry of catalog) {
    if (entry.status !== 'building' || own.has(entry.id)) continue;
    for (const ref of entry.refs ?? []) {
      if (typeof ref !== 'string' || !ref.includes('/plans/') || !ref.endsWith('.md') || ref === planPath) continue;
      const text = readPlan(ref);
      if (text == null) {
        unreadable.push({ id: entry.id, plan: ref });
        continue;
      }
      const files = sharedFiles(planText, text);
      if (files.length) found.push({ id: entry.id, plan: ref, files });
    }
  }
  return { found, unreadable };
}

const USAGE = 'usage: plan-overlap.mjs --claim <plan> | --wait <plan> [--interval <seconds>] [--timeout <minutes>]\n';

function parseArgs(argv) {
  const [mode, plan, ...rest] = argv;
  if (!['--claim', '--wait'].includes(mode) || !plan || plan.startsWith('--')) return null;
  const opts = { mode: mode.slice(2), plan, intervalS: 30, timeoutMin: 60 };
  if (mode === '--claim') return rest.length ? null : opts;
  for (let i = 0; i < rest.length; i += 2) {
    const n = Number(rest[i + 1]);
    if (!['--interval', '--timeout'].includes(rest[i]) || rest[i + 1] === undefined || !(n >= 0)) return null;
    if (rest[i] === '--interval') opts.intervalS = n;
    else opts.timeoutMin = n;
  }
  return opts;
}

const say = (line) => process.stdout.write(`${line}\n`);
const fail = (line) => { say(line); return 2; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const git = (root, ...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const firstLine = (text) => (text || '').split('\n').map((l) => l.trim()).find(Boolean) ?? 'no reason given';

function claim(root, planPath) {
  let catalog;
  let text;
  try {
    catalog = YAML.parse(readFileSync(resolve(root, 'feature-catalog.yaml'), 'utf8'));
    text = readFileSync(resolve(root, planPath), 'utf8');
  } catch (e) {
    process.stderr.write(`plan-overlap: ${e.message}\n`);
    return 2;
  }
  if (!Array.isArray(catalog)) {
    process.stderr.write('plan-overlap: feature-catalog.yaml is not a list of entries\n');
    return 2;
  }
  if (!fileStructurePaths(text).length) {
    process.stderr.write(`plan-overlap: ${planPath} lists no file under File Structure, so it cannot be compared\n`);
    return 2;
  }
  const readPlan = (p) => {
    try { return readFileSync(resolve(root, p), 'utf8'); } catch { return null; }
  };
  const { found, unreadable } = overlaps(catalog, planPath, text, readPlan);
  for (const u of unreadable) say(`Cannot read ${u.plan}, named by ${u.id}; not compared.`);
  if (!found.length) {
    say(`No overlap: ${planPath} shares no file with a plan in building.`);
    return 0;
  }
  for (const f of found) say(`Overlaps ${f.id} (${f.plan}): ${f.files.join(', ')}`);
  const next = withMergesAfter(text, found.map((f) => f.id));
  if (next !== text) writeFileSync(resolve(root, planPath), next);
  const all = mergesAfterIds(next).join(', ');
  say(`Merges after: ${all} — ${next !== text ? 'written to' : 'already in'} ${planPath}.`);
  return 0;
}

async function wait(root, opts) {
  let text;
  try {
    text = readFileSync(resolve(root, opts.plan), 'utf8');
  } catch (e) {
    process.stderr.write(`plan-overlap: ${e.message}\n`);
    return 2;
  }
  const ids = mergesAfterIds(text);
  if (!ids.length) {
    say('Merges after: none — go ahead.');
    return 0;
  }
  process.stderr.write(`plan-overlap: waiting for ${ids.join(', ')} to ship, asking origin every ${opts.intervalS} s for up to ${opts.timeoutMin} min\n`);
  const deadline = Date.now() + opts.timeoutMin * 60000;
  for (;;) {
    const fetched = git(root, 'fetch', '--quiet', 'origin');
    if (fetched.status !== 0) return fail(`Could not fetch origin — ${firstLine(fetched.stderr)}.`);
    const head = git(root, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD');
    const branch = head.status === 0 && head.stdout.trim() ? head.stdout.trim() : 'origin/main';
    const shown = git(root, 'show', `${branch}:feature-catalog.yaml`);
    if (shown.status !== 0) return fail(`Could not read the catalog on ${branch} — ${firstLine(shown.stderr)}.`);
    let catalog;
    try {
      catalog = YAML.parse(shown.stdout);
    } catch (e) {
      return fail(`Could not read the catalog on ${branch} — ${firstLine(e.message)}.`);
    }
    const byId = new Map((Array.isArray(catalog) ? catalog : []).map((e) => [e.id, e]));
    const missing = ids.find((id) => !byId.has(id));
    if (missing) return fail(`${opts.plan} merges after ${missing}, which the catalog on ${branch} does not have.`);
    const pending = ids.filter((id) => !['shipped', 'dropped'].includes(byId.get(id).status));
    if (!pending.length) {
      say(`Merges after: ${ids.join(', ')} — shipped on ${branch}; go ahead.`);
      return 0;
    }
    if (Date.now() >= deadline) {
      say(`STOPPED: waiting on ${pending.join(', ')}`);
      return 3;
    }
    await sleep(opts.intervalS * 1000);
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
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) {
    process.stderr.write(USAGE);
    process.exitCode = 2;
  } else {
    process.exitCode = opts.mode === 'claim' ? claim(root, opts.plan) : await wait(root, opts);
  }
}
