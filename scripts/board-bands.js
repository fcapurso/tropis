// Shared machinery: no part of this file is project-owned.
/**
 * @module board-bands
 * @description The judgment layer's memory. A row in docs/backlog-board/bands.yaml
 * records, under `seen`, the status and the open blockers its entry had when the
 * verdict was written; the board build compares that record with the catalog and
 * reports a band whose entry has moved. `stampBands` rewrites every record to the
 * catalog as it stands — the one action a person takes after re-evaluating, and the
 * backfill on the day this shipped.
 *
 * Text in, text out. The file carries a header comment, hand-wrapped verdicts and
 * quoted evidence that the YAML library would re-flow on the way back out; a stamp
 * must change nothing but the `seen` lines, or the diff hides the judgment.
 */

/**
 * @param {{blockedBy?: string[]}} entry
 * @param {{id: string, status: string}[]} catalog
 * @returns {string[]} the entry's blockers whose own entry has not shipped, sorted.
 */
export function openBlockers(entry, catalog) {
  const shipped = new Set(catalog.filter((e) => e.status === 'shipped').map((e) => e.id));
  return (entry.blockedBy || []).filter((id) => !shipped.has(id)).sort();
}

/**
 * Bands whose entry no longer matches what the band recorded.
 * @param {{id: string, status: string, blockedBy?: string[]}[]} catalog
 * @param {Record<string, {seen?: {status?: string, blockers?: string[]}}>} bands
 * @returns {{id: string, reason: string}[]} in bands.yaml order. A band with no `seen`
 *   is `never stamped`; a band whose entry has shipped or gone is skipped — the build
 *   reports those as stale already.
 */
export function movedBands(catalog, bands) {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const moved = [];
  for (const [id, band] of Object.entries(bands)) {
    const entry = byId.get(id);
    if (!entry || entry.status === 'shipped') continue;
    if (!band.seen) {
      moved.push({ id, reason: 'never stamped' });
      continue;
    }
    const reasons = [];
    if (band.seen.status !== entry.status) reasons.push(`status ${band.seen.status} → ${entry.status}`);
    const now = openBlockers(entry, catalog);
    const then = [...(band.seen.blockers || [])].sort();
    for (const b of then) {
      if (!now.includes(b)) reasons.push(`blocker ${b} ${byId.get(b)?.status === 'shipped' ? 'shipped' : 'removed'}`);
    }
    for (const b of now) if (!then.includes(b)) reasons.push(`blocker ${b} added`);
    if (reasons.length) moved.push({ id, reason: reasons.join('; ') });
  }
  return moved;
}

/**
 * Rewrite `seen` on every row whose entry is in the catalog — replacing the block or
 * adding it as the row's last key — and touch nothing else. A row whose entry is gone
 * is left exactly as it was; the build reports it for deletion.
 * @param {string} text bands.yaml
 * @param {{id: string, status: string, blockedBy?: string[]}[]} catalog
 * @returns {string}
 */
export function stampBands(text, catalog) {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const out = [];
  let id = null;
  let skipping = false;
  const close = () => {
    const entry = id && byId.get(id);
    if (entry) {
      out.push('  seen:', `    status: ${entry.status}`, `    blockers: [${openBlockers(entry, catalog).join(', ')}]`);
    }
    id = null;
    skipping = false;
  };
  for (const line of text.split('\n')) {
    const head = line.match(/^([A-Za-z0-9_.-]+):$/);
    if (head) {
      close();
      id = head[1];
      out.push(line);
      continue;
    }
    if (id && byId.has(id) && line === '  seen:') {
      skipping = true;
      continue;
    }
    if (skipping && line.startsWith('    ')) continue;
    skipping = false;
    if (id && !line.startsWith('  ')) close();
    out.push(line);
  }
  close();
  return out.join('\n');
}

/**
 * The bands as `/next` and the board's top box read them: id to letter, nothing else.
 * @param {Record<string, {band?: string}> | null | undefined} rows bands.yaml, parsed
 * @returns {Record<string, string>}
 */
export function bandLetters(rows) {
  return Object.fromEntries(Object.entries(rows ?? {}).map(([id, row]) => [id, row?.band]));
}

/**
 * The scores behind the rank inside a band: id to value and effort, for rows whose two
 * scores are both integers 1 to 5. A row missing either, or carrying one outside that
 * range, is left out and so has no rank.
 * @param {Record<string, {value?: unknown, effort?: unknown}> | null | undefined} rows bands.yaml, parsed
 * @returns {Record<string, {value: number, effort: number}>}
 */
export function bandScores(rows) {
  const ok = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
  return Object.fromEntries(Object.entries(rows ?? {})
    .filter(([, row]) => ok(row?.value) && ok(row?.effort))
    .map(([id, row]) => [id, { value: row.value, effort: row.effort }]));
}
