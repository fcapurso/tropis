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
 * Entries sharing a spec path, so an arc can be shown together.
 * Entries are ordered by `after`; shipped/total is how far the arc has got.
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
      return { ref, entries: ordered, shipped, total: ordered.length };
    });
}

const BAND_RANK = { A: 0, B: 1, C: 2, D: 3, E: 4 };

/** Bands /next may suggest. D wants a decision and E is left alone; both are only listed. */
const SUGGESTABLE = new Set(['A', 'B', 'C']);

/**
 * An entry's band. An id with no band, or a band that is not A–E, counts as E.
 * @param {string} id
 * @param {Record<string, string> | null | undefined} bands id to letter
 * @returns {'A'|'B'|'C'|'D'|'E'}
 */
export function bandOf(id, bands) {
  const band = bands?.[id];
  return Object.hasOwn(BAND_RANK, band ?? '') ? band : 'E';
}

/** A parsed bands file with at least one row. Null and a header-only file are neither. */
export function hasBandRows(bands) {
  return !!bands && Object.keys(bands).length > 0;
}

function underWayIds(catalog) {
  const ids = new Set();
  for (const arc of arcs(catalog)) {
    const shipped = arc.entries.filter((e) => e.status === 'shipped').length;
    if (shipped > 0 && shipped < arc.entries.length) {
      for (const entry of arc.entries) ids.add(entry.id);
    }
  }
  return ids;
}

/**
 * Ready entries in band order; inside a band, an entry in an arc already under way
 * first, then the order `ready()` gave. Sort is stable, so that last tie-break is free.
 * @param {object[]} entries
 * @param {Record<string, string>} bands
 * @param {Set<string>} underWay
 * @returns {object[]}
 */
function byBand(entries, bands, underWay) {
  const arcFirst = (entry) => (underWay.has(entry.id) ? 0 : 1);
  return [...entries].sort((a, b) => (
    BAND_RANK[bandOf(a.id, bands)] - BAND_RANK[bandOf(b.id, bands)]
    || arcFirst(a) - arcFirst(b)
  ));
}

/**
 * Ready entries in the order the report lists them. With no bands — null, or a
 * file that parsed to no rows — that is the order `ready()` already gave.
 * @param {object[]} catalog
 * @param {Record<string, string> | null} [bands]
 * @returns {object[]}
 */
export function readyInBandOrder(catalog, bands = null) {
  const startable = ready(catalog);
  if (!hasBandRows(bands)) return startable;
  return byBand(startable, bands, underWayIds(catalog));
}

/**
 * The single entry a reader should start with.
 *
 * With no bands (null, or no rows), the earliest ready entry in an arc already
 * under way (some shipped, some not), or null. Do not guess.
 *
 * With bands, the first ready entry banded A, B or C, in band order, an entry
 * in an arc already under way first within a band. D and E are never returned.
 * @param {object[]} catalog
 * @param {Record<string, string> | null} [bands] id to letter; omit when no bands exist
 * @returns {object|null}
 */
export function nextStep(catalog, bands = null) {
  const startable = readyInBandOrder(catalog, bands);
  if (!hasBandRows(bands)) return startable.find((e) => underWayIds(catalog).has(e.id)) ?? null;
  return startable.find((e) => SUGGESTABLE.has(bandOf(e.id, bands))) ?? null;
}
