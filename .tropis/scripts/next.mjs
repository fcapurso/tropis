// Shared machinery: no part of this file is project-owned.
/**
 * Prints what is next from the backlog: in flight, ready, blocked.
 *
 * Reads `feature-catalog.yaml` at the repository root. Wire it to a named command
 * (`npm run next` or your language's equivalent) — see bootstrap.md step 6.
 *
 * REFERENCE IMPLEMENTATION. A project in another language writes its own. There is no
 * separate statement of what it must report — the framework decided against written
 * properties beside working code (framework/DECISIONS.md, amended 2026-08-16) — so this
 * file is the definition, and guards/next-report.test.js holds the order of its sections.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';
import { bandBundles, bandLetters, bandScores } from './board-bands.js';
import { inFlight, blocked, arcs, nextStep, bandOf, readyInBandOrder, hasBandRows, blockedAhead } from './next-work.js';
import { readmeFreshnessAt } from './readme-freshness.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const catalog = YAML.parse(readFileSync(resolve(root, 'feature-catalog.yaml'), 'utf8'));
const queuePath = resolve(root, 'docs/BLUEPRINT-UPSTREAM.md');
const bandsPath = resolve(root, 'docs/backlog-board/bands.yaml');
// A missing file is no bands. A header-only file parses as null and becomes {},
// which has no rows and must not change the report.
const bandRows = existsSync(bandsPath) ? YAML.parse(readFileSync(bandsPath, 'utf8')) : null;
const bands = bandRows ? bandLetters(bandRows) : null;
const scores = bandRows ? bandScores(bandRows) : null;
const bundles = bandRows ? bandBundles(bandRows) : {};

function tag(entry) {
  return `[${entry.type}]`;
}

/**
 * Where to read about this entry: its plan if one exists, otherwise the spec that
 * governs it.
 *
 * Showing only plans left an entry governed by a design document with no path at all,
 * so the reader had nowhere to start and needed telling separately — which is the
 * thing this command exists to avoid.
 */
function sourcePath(entry) {
  const refs = entry.refs ?? [];
  const ref = refs.find((r) => r.includes('/plans/')) ?? refs.find((r) => r.includes('/specs/'));
  return ref ? ` — ${ref}` : '';
}

function line(entry) {
  const prefix = hasBandRows(bands) ? `[${bandOf(entry.id, bands)}] ` : '';
  const decision = hasBandRows(bands) && bandOf(entry.id, bands) === 'C' ? ' (needs a decision)' : '';
  return `  - ${prefix}${tag(entry)} ${entry.id}: ${entry.title}${sourcePath(entry)}${decision}`;
}

const step = nextStep(catalog, bands, scores);

// The suggestion's bundle-mates that are still open, best band first, then value over
// effort (unscored last), then id.
function bundleMates(of) {
  const open = (e) => e.status !== 'shipped' && !e.shelved && !(e.supersededBy ?? []).length;
  const rank = (id) => (scores?.[id] ? scores[id].value / scores[id].effort : -1);
  return catalog
    .filter((e) => e.id !== of.id && bundles[e.id] === bundles[of.id] && open(e))
    .sort((a, b) => bandOf(a.id, bands).localeCompare(bandOf(b.id, bands)) || rank(b.id) - rank(a.id) || a.id.localeCompare(b.id))
    .map((e) => e.id);
}
if (hasBandRows(bands)) {
  if (step) {
    const spec = (step.refs ?? []).find((r) => r.includes('/specs/'));
    console.log(`Next step: ${step.id} — band ${bandOf(step.id, bands)}${spec ? ` (${spec})` : ''}`);
  } else {
    const decisions = readyInBandOrder(catalog, bands, scores)
      .filter((entry) => bandOf(entry.id, bands) === 'C')
      .map((entry) => entry.id);
    console.log(decisions.length > 0
      ? `Next step: none — nothing ready is banded A or B; ${decisions.join(', ')} need a decision, not a plan.`
      : 'Next step: none — nothing ready is banded A or B; the rest is banded to leave for now.');
  }
  const mates = step && bundles[step.id] ? bundleMates(step) : [];
  if (mates.length) console.log(`  With it, bundle ${bundles[step.id]}: ${mates.join(', ')}`);
  const ahead = blockedAhead(catalog, bands, scores, step);
  if (ahead) {
    const waitingIds = ahead.waitingOn.map((b) => b.id).join(', ');
    console.log(`  ${step ? 'Ahead of it, blocked' : 'Highest blocked'}: ${ahead.entry.id} — band ${bandOf(ahead.entry.id, bands)}, waiting on ${waitingIds}`);
  }
  console.log('');
} else if (step) {
  const spec = (step.refs ?? []).find((r) => r.includes('/specs/'));
  console.log(`Next step: ${step.id}${spec ? ` (${spec})` : ''}`);
  console.log('');
}

const flying = inFlight(catalog);
const startable = readyInBandOrder(catalog, bands, scores);
const waiting = blocked(catalog);
const ideas = catalog.filter((e) => e.status === 'idea').length;
const shelved = catalog.filter((e) => e.shelved).length;

console.log('Building (catalog status)');
if (flying.length === 0) {
  console.log('  (none)');
} else {
  for (const entry of flying) console.log(line(entry));
}

console.log('');
console.log('Ready to start');
if (startable.length === 0) {
  console.log('  (none)');
} else {
  for (const entry of startable) console.log(line(entry));
}

console.log('');
console.log('Blocked');
if (waiting.length === 0) {
  console.log('  (none)');
} else {
  for (const { entry, waitingOn } of waiting) {
    console.log(`${line(entry)}`);
    console.log(`      waiting on: ${waitingOn.map((b) => b.id).join(', ')}`);
  }
}

const today = new Date();
const freshness = readmeFreshnessAt(
  root,
  catalog,
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
);
if (freshness) {
  console.log('');
  console.log('README');
  console.log(`  ${freshness}`);
}

const retiredLayerEntries = catalog.filter((e) => e.layer === 'blueprint' && e.status !== 'shipped');
if (retiredLayerEntries.length > 0) {
  const noun = retiredLayerEntries.length === 1 ? 'entry' : 'entries';
  const verb = retiredLayerEntries.length === 1 ? 'uses' : 'use';
  console.log('');
  console.log(
    `${retiredLayerEntries.length} ${noun} ${verb} the retired layer "blueprint" — the catalog rule (Layers) says what to do with them.`,
  );
}

// The upstream queue is optional — bootstrap.md step 5 says to create it or to remove
// the branch of /capture-learning that routes to it. A project that chose the second
// gets no section rather than an error about a file it decided not to have.
if (existsSync(queuePath)) {
  console.log('');
  console.log('Waiting in the upstream queue');
  const text = readFileSync(queuePath, 'utf8');
  const flush = text.match(/Last flushed:\s*(\d{4}-\d{2}-\d{2})/);
  const entries = [...text.matchAll(/^- \d{4}-\d{2}-\d{2} —/gm)];
  // Top-level dated lines only: a part is indented under its entry and is not counted.
  const count = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
  if (flush) {
    console.log(`  ${count}; last flushed ${flush[1]}`);
  } else {
    console.log(`  ${count}; no "Last flushed" date found`);
  }
}

// Arc progress comes after the work. An arc spans the whole backlog, and printed above
// the ready list it pushed the work being asked about down the screen.
const underWay = arcs(catalog).filter((arc) => arc.shipped > 0 && arc.shipped < arc.total);
if (underWay.length > 0) {
  console.log('');
  console.log('Arcs under way');
  for (const arc of underWay) {
    console.log(`  ${arc.ref} — ${arc.shipped} of ${arc.total} shipped`);
    for (const entry of arc.entries) {
      const mark = entry.status === 'shipped' ? '✓' : ' ';
      console.log(`    ${mark} ${entry.id}`);
    }
  }
}

console.log('');
console.log(`${ideas} idea(s) not yet shaped.`);
if (shelved > 0) {
  console.log(`${shelved} entry/entries shelved — recorded, deliberately not scheduled.`);
}
