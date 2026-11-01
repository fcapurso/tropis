// Shared machinery: no part of this file is project-owned.
/**
 * Read the backlog as "what now": in flight, ready, blocked.
 * Pure — takes a catalog array; no I/O.
 *
 * REFERENCE IMPLEMENTATION. What these functions must report is stated in
 * CONFORMANCE.md; this file is one way to produce it, not the definition.
 */

/**
 * @param {Array<{ id: string, status: string, blockedBy?: string[], layer?: string, refs?: string[] }>} catalog
 * @returns {Map<string, object>}
 */
function byId(catalog) {
  return new Map(catalog.map((e) => [e.id, e]));
}

/**
 * Blockers that have not yet shipped.
 * @param {object} entry
 * @param {Map<string, object>} index
 * @returns {object[]}
 */
function waitingOn(entry, index) {
  return (entry.blockedBy ?? [])
    .map((id) => index.get(id))
    .filter((blocker) => blocker && blocker.status !== 'shipped');
}

/** Replaced entries are not work anyone can pick up. */
function isSuperseded(entry) {
  return (entry.supersededBy ?? []).length > 0;
}

/**
 * Closed for good: shipped, replaced by other entries, or dropped. A shelved entry is
 * not closed — it is parked until something changes.
 * @param {{status: string, supersededBy?: string[]}} entry
 */
export function isClosed(entry) {
  return entry.status === 'shipped' || entry.status === 'dropped' || isSuperseded(entry);
}

/**
 * Order entries so each follows everything in its `after` that is also in the
 * list. Ties keep the order they already have (catalog order when the list was
 * filtered from the catalog).
 * @param {object[]} entries
 * @returns {object[]}
 */
function orderByAfter(entries) {
  const ids = new Set(entries.map((e) => e.id));
  const catalogIndex = new Map(entries.map((e, i) => [e.id, i]));
  const index = byId(entries);
  const indegree = new Map(entries.map((e) => [e.id, 0]));
  const dependents = new Map(entries.map((e) => [e.id, []]));

  for (const entry of entries) {
    for (const pred of entry.after ?? []) {
      if (!ids.has(pred)) continue;
      indegree.set(entry.id, indegree.get(entry.id) + 1);
      dependents.get(pred).push(entry.id);
    }
  }

  const available = entries
    .filter((e) => indegree.get(e.id) === 0)
    .sort((a, b) => catalogIndex.get(a.id) - catalogIndex.get(b.id));

  const result = [];
  const placed = new Set();
  while (available.length > 0) {
    available.sort((a, b) => catalogIndex.get(a.id) - catalogIndex.get(b.id));
    const next = available.shift();
    result.push(next);
    placed.add(next.id);
    for (const depId of dependents.get(next.id)) {
      indegree.set(depId, indegree.get(depId) - 1);
      if (indegree.get(depId) === 0) {
        available.push(index.get(depId));
      }
    }
  }

  // Cycles among ready entries should not happen — a catalog guard should reject
  // them. Keep any remainder in catalog order so nothing disappears.
  for (const entry of entries) {
    if (!placed.has(entry.id)) result.push(entry);
  }
  return result;
}

/** Entries whose plan is running now. */
export function inFlight(catalog) {
  return catalog.filter((e) => e.status === 'building');
}

/**
 * Shaped entries with every blocker shipped — ready to plan or dispatch.
 * INCLUDES only the active 'product' and 'framework' layers.
 * EXCLUDES superseded entries: they were replaced and are not pickable.
 * EXCLUDES shelved entries: recorded on purpose, and not offered.
 * Ordered by `after` among themselves; catalog order breaks ties.
 */
export function ready(catalog) {
  const index = byId(catalog);
  const startable = catalog.filter(
    (e) =>
      e.status === 'shaped'
      && (e.layer === 'product' || e.layer === 'framework')
      && !e.shelved
      && !isSuperseded(e)
      && waitingOn(e, index).length === 0,
  );
  return orderByAfter(startable);
}

/**
 * Shaped or idea entries still waiting, each with the blockers not yet shipped.
 * EXCLUDES shelved entries: recorded on purpose, and not offered.
 */
export function blocked(catalog) {
  const index = byId(catalog);
  return catalog
    .filter((e) => (e.status === 'shaped' || e.status === 'idea') && !e.shelved && !isSuperseded(e))
    .map((entry) => ({ entry, waitingOn: waitingOn(entry, index) }))
    .filter(({ waitingOn: w }) => w.length > 0);
}

/**
 * Entries sharing a spec path, so an arc can be shown together, ordered by `after`.
 * `shipped` and `total` are raw counts. `counted` leaves out replaced and dropped
 * entries, whose work moved or will not be done. `state` is `under way` (something
 * shipped, something open), `not started` (something open, nothing shipped), `parked`
 * (nothing open, at least one step shelved) or `done` (nothing open or shelved).
 */
export function arcs(catalog) {
  const byRef = new Map();
  for (const entry of catalog) {
    for (const ref of entry.refs ?? []) {
      if (!ref.includes('/specs/')) continue;
      if (!byRef.has(ref)) byRef.set(ref, []);
      byRef.get(ref).push(entry);
    }
  }
  return [...byRef.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([ref, entries]) => {
      const ordered = orderByAfter(entries);
      const shipped = ordered.filter((e) => e.status === 'shipped').length;
      const counted = ordered.filter((e) => e.status !== 'dropped' && !isSuperseded(e)).length;
      const open = ordered.some((e) => !isClosed(e) && !e.shelved);
      const parked = ordered.some((e) => !isClosed(e) && e.shelved);
      const state = open
        ? (shipped > 0 ? 'under way' : 'not started')
        : (parked ? 'parked' : 'done');
      return { ref, entries: ordered, shipped, total: ordered.length, counted, state };
    });
}

const BAND_RANK = { A: 0, B: 1, C: 2, D: 3 };

/** Bands /next may suggest. C wants a decision and D is left alone; both are only listed. */
const SUGGESTABLE = new Set(['A', 'B']);

/**
 * An entry's band. An id with no band, or a band that is not A–D, counts as D.
 * @param {string} id
 * @param {Record<string, string> | null | undefined} bands id to letter
 * @returns {'A'|'B'|'C'|'D'}
 */
export function bandOf(id, bands) {
  const band = bands?.[id];
  return Object.hasOwn(BAND_RANK, band ?? '') ? band : 'D';
}

/** A parsed bands file with at least one row. Null and a header-only file are neither. */
export function hasBandRows(bands) {
  return !!bands && Object.keys(bands).length > 0;
}

function underWayIds(catalog) {
  const ids = new Set();
  for (const arc of arcs(catalog)) {
    if (arc.state === 'under way') {
      for (const entry of arc.entries) ids.add(entry.id);
    }
  }
  return ids;
}

/**
 * Rank is value over effort. An entry without both scores has none.
 * @param {string} id
 * @param {Record<string, {value: number, effort: number}> | null | undefined} scores
 * @returns {number | null}
 */
function rankOf(id, scores) {
  const s = scores?.[id];
  return s ? s.value / s.effort : null;
}

/**
 * Comparator for the order entries are suggested in: band, then rank descending with
 * unranked entries last, then an entry in an arc already under way first. Ties return 0,
 * so a stable sort keeps whatever order the caller had.
 */
function compareByBand(bands, scores, underWay) {
  return (a, b) => {
    const band = BAND_RANK[bandOf(a.id, bands)] - BAND_RANK[bandOf(b.id, bands)];
    if (band !== 0) return band;
    const ra = rankOf(a.id, scores);
    const rb = rankOf(b.id, scores);
    if (ra !== rb) {
      if (ra === null) return 1;
      if (rb === null) return -1;
      return rb - ra;
    }
    return (underWay.has(a.id) ? 0 : 1) - (underWay.has(b.id) ? 0 : 1);
  };
}

/**
 * Ready entries in the order the report lists them. With no bands — null, or a
 * file that parsed to no rows — that is the order `ready()` already gave. Scores are
 * optional; without them the order inside a band is arc under way, then `ready()` order.
 * @param {object[]} catalog
 * @param {Record<string, string> | null} [bands]
 * @param {Record<string, {value: number, effort: number}> | null} [scores]
 * @returns {object[]}
 */
export function readyInBandOrder(catalog, bands = null, scores = null) {
  const startable = ready(catalog);
  if (!hasBandRows(bands)) return startable;
  return [...startable].sort(compareByBand(bands, scores, underWayIds(catalog)));
}

/**
 * The single entry a reader should start with.
 *
 * With no bands (null, or no rows), the earliest ready entry in an arc already
 * under way (some shipped, some not), or null. Do not guess.
 *
 * With bands, the first ready entry banded A or B in the order of `readyInBandOrder`.
 * C and D are never returned.
 *
 * Readiness and order are worked out over the whole catalog; `layer`, when given, only
 * narrows which ready entries may be returned.
 * @param {object[]} catalog
 * @param {Record<string, string> | null} [bands] id to letter; omit when no bands exist
 * @param {Record<string, {value: number, effort: number}> | null} [scores]
 * @param {string | null} [layer] only entries of this layer are candidates
 * @returns {object|null}
 */
export function nextStep(catalog, bands = null, scores = null, layer = null) {
  const startable = readyInBandOrder(catalog, bands, scores).filter((e) => !layer || e.layer === layer);
  if (!hasBandRows(bands)) return startable.find((e) => underWayIds(catalog).has(e.id)) ?? null;
  return startable.find((e) => SUGGESTABLE.has(bandOf(e.id, bands))) ?? null;
}

/**
 * The shaped entry, waiting on an unshipped blocker, that sorts highest in the order
 * above — strictly ahead of `step` when there is one, otherwise banded A or B. Null
 * when none qualifies or there are no bands. `layer`, when given, limits the candidates
 * to that layer.
 * @param {object[]} catalog
 * @param {Record<string, string> | null} bands
 * @param {Record<string, {value: number, effort: number}> | null} scores
 * @param {object | null} step the suggestion, or null
 * @param {string | null} [layer]
 * @returns {{entry: object, waitingOn: object[]} | null}
 */
export function blockedAhead(catalog, bands, scores, step, layer = null) {
  if (!hasBandRows(bands)) return null;
  const compare = compareByBand(bands, scores, underWayIds(catalog));
  const candidates = blocked(catalog)
    .filter(({ entry }) => entry.status === 'shaped')
    .filter(({ entry }) => !layer || entry.layer === layer)
    .filter(({ entry }) => (step
      ? compare(entry, step) < 0
      : SUGGESTABLE.has(bandOf(entry.id, bands))));
  candidates.sort((a, b) => compare(a.entry, b.entry) || a.entry.id.localeCompare(b.entry.id));
  return candidates[0] ?? null;
}

/**
 * Ideas worth shaping: not shelved, not superseded, no unshipped blocker, banded A or
 * B. Empty without band rows.
 * @param {object[]} catalog
 * @param {Record<string, string> | null} [bands]
 * @param {Record<string, {value: number, effort: number}> | null} [scores]
 * @param {string | null} [layer]
 * @returns {object[]}
 */
export function toShape(catalog, bands = null, scores = null, layer = null) {
  if (!hasBandRows(bands)) return [];
  const index = byId(catalog);
  const compare = compareByBand(bands, scores, underWayIds(catalog));
  return catalog
    .filter((e) => e.status === 'idea' && !e.shelved && !isSuperseded(e))
    .filter((e) => waitingOn(e, index).length === 0)
    .filter((e) => SUGGESTABLE.has(bandOf(e.id, bands)))
    .filter((e) => !layer || e.layer === layer)
    .sort((a, b) => compare(a, b) || a.id.localeCompare(b.id));
}

/**
 * Arcs under way whose next ready entry sits behind a higher-banded step of its layer.
 * Empty without band rows.
 * @param {object[]} catalog
 * @param {Record<string, string> | null} [bands]
 * @param {Record<string, {value: number, effort: number}> | null} [scores]
 * @returns {{ref: string, entry: object, step: object}[]}
 */
export function lostTurns(catalog, bands = null, scores = null) {
  if (!hasBandRows(bands)) return [];
  const readyIds = new Set(ready(catalog).map((e) => e.id));
  const lost = [];
  for (const arc of arcs(catalog)) {
    if (arc.state !== 'under way') continue;
    const entry = arc.entries.find((e) => readyIds.has(e.id));
    if (!entry) continue;
    const step = nextStep(catalog, bands, scores, entry.layer);
    if (step && step.id !== entry.id && BAND_RANK[bandOf(step.id, bands)] < BAND_RANK[bandOf(entry.id, bands)]) {
      lost.push({ ref: arc.ref, entry, step });
    }
  }
  return lost;
}

/** Blank out fenced code blocks, keeping the line count. */
function stripFences(text) {
  let inFence = false;
  return text
    .split('\n')
    .map((l) => {
      if (/^\s*```/.test(l)) {
        inFence = !inFence;
        return '';
      }
      return inFence ? '' : l;
    })
    .join('\n');
}

/** Entry ids a plan's `## Delivers` section names; null when it has none. */
function deliveredIds(markdown) {
  const heading = /^## Delivers\s*$/m.exec(markdown);
  if (!heading) return null;
  const rest = markdown.slice(heading.index + heading[0].length);
  const next = /^## /m.exec(rest);
  const body = (next ? rest.slice(0, next.index) : rest).replace(/<!--[\s\S]*?-->/g, '').trim();
  if (body === 'None.') return [];
  const ids = [];
  for (const l of body.split('\n')) {
    for (const part of l.split(',')) {
      const token = part.trim().replace(/^[-*]\s*/, '');
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(token)) ids.push(token);
    }
  }
  return ids;
}

/**
 * Plans not yet executed, by the entry ids their Delivers section names.
 * A plan is executed once it has a `## Handover report` outside fenced code blocks.
 * @param {{path: string, text: string}[]} plans in file-name order
 * @returns {Map<string, string>} id to plan path; a later plan wins
 */
export function waitingPlans(plans) {
  const waiting = new Map();
  for (const { path, text } of plans) {
    const visible = stripFences(text);
    if (/^## Handover report/m.test(visible)) continue;
    for (const id of deliveredIds(visible) ?? []) waiting.set(id, path);
  }
  return waiting;
}
