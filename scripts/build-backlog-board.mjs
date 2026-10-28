// Shared machinery: no part of this file is project-owned.
/**
 * Build the backlog board — one local HTML page of every open catalog entry, grouped
 * by the bands in docs/backlog-board/bands.yaml.
 *
 * Two inputs, deliberately separate: the catalog (facts) and `arcs()` / `nextStep()`
 * from next-work.js, so the page's top box is the same suggestion `/next` prints; and
 * the bands file (judgment), which a project keeps and an update never replaces.
 *
 * Writes docs/backlog-board/index.html and prints that path, then the README line when
 * one is due. Exits 0 even when bands
 * are missing, stale or moved — it prints them. A new idea should not turn anything
 * red until somebody has formed an opinion about it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { bandLetters, movedBands, stampBands } from './board-bands.js';
import { arcs, bandOf, hasBandRows, nextStep } from './next-work.js';
import { readmeFreshnessAt } from './readme-freshness.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const dir = resolve(root, 'docs/backlog-board');
const templatePath = resolve(here, '../templates/backlog-board.html');
const bandsPath = resolve(dir, 'bands.yaml');
const catalog = YAML.parse(readFileSync(resolve(root, 'feature-catalog.yaml'), 'utf8'));

// --reevaluate lists every open band; --stamp rewrites each row's `seen` to the
// catalog as it stands, before the page is read, so the same run shows a clear report.
const flags = new Set(process.argv.slice(2));
const reevaluate = flags.has('--reevaluate');
if (flags.has('--stamp') && !existsSync(bandsPath)) {
  console.log('No bands file yet: copy .tropis/templates/backlog-bands.yaml to docs/backlog-board/bands.yaml first.');
  process.exit(0);
}
if (flags.has('--stamp')) {
  writeFileSync(bandsPath, stampBands(readFileSync(bandsPath, 'utf8'), catalog));
  console.log('Stamped every band in bands.yaml with its entry as the catalog stands.');
}

const bands = existsSync(bandsPath) ? (YAML.parse(readFileSync(bandsPath, 'utf8')) ?? {}) : {};

const label = (ref) => ref.split('/').pop()
  .replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-design$/i, '').replace(/-/g, ' ');
const arcData = arcs(catalog).map((a) => ({
  key: a.ref.split('/').pop().replace(/\.md$/, ''),
  label: label(a.ref),
  spec: a.ref,
  shipped: a.shipped,
  total: a.total,
  order: a.entries.map((e) => ({
    id: e.id, t: e.title, s: e.status, sh: !!e.shelved, sup: !!(e.supersededBy ?? []).length,
  })),
})).sort((x, y) => (y.total - y.shipped) - (x.total - x.shipped));
const arcsOf = new Map();
for (const a of arcData) {
  for (const o of a.order) {
    if (!arcsOf.has(o.id)) arcsOf.set(o.id, []);
    arcsOf.get(o.id).push(a.key);
  }
}

const open = catalog.filter((e) => e.status !== 'shipped');
const entries = open.map((e) => ({
  id: e.id,
  t: e.title,
  s: e.status,
  ty: e.type,
  l: e.layer,
  sh: !!e.shelved,
  sup: e.supersededBy || null,
  bb: e.blockedBy || null,
  af: e.after || null,
  ac: e.acceptanceCriteria || [],
  v: e.value,
  refs: e.refs || [],
  arc: arcsOf.get(e.id) || [],
}));

const anno = {};
for (const [id, b] of Object.entries(bands)) {
  anno[id] = { b: b.band, v: b.verdict ?? '', e: b.evidence ?? '' };
}

const letters = bandLetters(bands);
const step = nextStep(catalog, letters);
const nextUp = step
  ? { id: step.id, t: step.title, b: hasBandRows(letters) ? bandOf(step.id, letters) : null }
  : null;

const openIds = new Set(open.map((e) => e.id));
const unbanded = open.filter((e) => !(e.id in bands)).map((e) => e.id);
const stale = Object.keys(bands).filter((id) => !openIds.has(id));
const moved = reevaluate
  ? Object.entries(bands).filter(([id]) => openIds.has(id))
    .map(([id, b]) => ({ id, reason: `band ${b.band}, ${open.find((e) => e.id === id).status}` }))
  : movedBands(catalog, bands);

const count = (fn) => open.filter(fn).length;
const today = new Date();
const freshness = readmeFreshnessAt(
  root,
  catalog,
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
);
const escapeHtml = (s) => s
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');
const html = readFileSync(templatePath, 'utf8')
  .replaceAll('__TITLE__', `${basename(root)} backlog`)
  .replace('__ENTRIES__', JSON.stringify(entries))
  .replace('__ANNO__', JSON.stringify(anno))
  .replace('__ARCS__', JSON.stringify(arcData))
  .replace('__NEXT__', JSON.stringify(nextUp))
  .replace('__OPEN__', String(open.length))
  .replace('__SHIPPED__', String(catalog.length - open.length))
  .replace('__PRODUCT__', String(count((e) => e.layer === 'product')))
  .replace('__FRAMEWORK__', String(count((e) => e.layer === 'framework')))
  .replace('__ASOF__', new Date().toISOString().slice(0, 10))
  // A function, so a `$` in the line is not read as a replacement pattern.
  .replace('__README__', () => (freshness ? escapeHtml(freshness) : ''));

mkdirSync(dir, { recursive: true });
const out = resolve(dir, 'index.html');
writeFileSync(out, html);
console.log(out);
if (freshness) console.log(freshness);
console.log('Open it in a browser.');
if (unbanded.length) {
  console.log(`\n${unbanded.length} open entr${unbanded.length === 1 ? 'y has' : 'ies have'} no band — the board shows them as E until bands.yaml says otherwise:`);
  for (const id of unbanded) console.log(`  - ${id}`);
}
if (stale.length) {
  console.log(`\n${stale.length} band${stale.length === 1 ? '' : 's'} in bands.yaml for entries that have shipped or gone — delete them:`);
  for (const id of stale) console.log(`  - ${id}`);
}
if (moved.length) {
  console.log(reevaluate
    ? `\n${moved.length} band${moved.length === 1 ? '' : 's'} to re-evaluate (--reevaluate lists every band whose entry is open). Rewrite or confirm each verdict, then run with --stamp:`
    : `\n${moved.length} band${moved.length === 1 ? '' : 's'} whose entry has moved since it was judged — re-evaluate, then run with --stamp:`);
  for (const m of moved) console.log(`  - ${m.id} — ${m.reason}`);
}
