// Shared machinery: no part of this file is project-owned.
/**
 * One line saying the README has probably fallen behind, or null when there is
 * nothing to say. Counts shipped product features and improvements.
 * `readmeFreshness` is pure. `readmeFreshnessAt` reads the settings file and the
 * catalog at the recorded refresh commit.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import YAML from 'yaml';

const COUNTED = new Set(['feature', 'improvement']);

function counts(entry) {
  return entry.status === 'shipped' && entry.layer === 'product' && COUNTED.has(entry.type);
}

function wholeDays(from, to) {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  // A commit dated in a timezone ahead of this machine's can read as tomorrow.
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * One line saying the README has probably fallen behind, or null when there is nothing
 * to say. Counts shipped entries of layer product and type feature or improvement.
 * @param {object} a
 * @param {string|null} a.level        level from docs/readme/readme.yaml; null when absent
 * @param {string} a.refreshedAt       commit hash, or '' when never refreshed
 * @param {Array<object>} a.catalogNow the current catalog
 * @param {Array<object>|null} a.catalogThen the catalog at refreshedAt; null when it
 *                                     cannot be read (unknown commit, no file there)
 * @param {string|null} a.refreshedOn  YYYY-MM-DD of that commit, or null
 * @param {string} a.today             YYYY-MM-DD
 * @returns {string|null}
 */
export function readmeFreshness(a) {
  if (a.level !== 'writes' && a.level !== 'suggests') return null;

  const shippedNow = a.catalogNow.filter(counts);
  if (a.refreshedAt === '') {
    if (shippedNow.length === 0) return null;
    const noun = shippedNow.length === 1
      ? '1 shipped feature or improvement'
      : `${shippedNow.length} shipped features and improvements`;
    return `README not refreshed yet; ${noun}: ${shippedNow.map((e) => e.id).join(', ')}. Run /refresh-readme.`;
  }

  if (a.catalogThen == null) {
    return `README refresh point ${String(a.refreshedAt).slice(0, 7)} not found. Run /refresh-readme.`;
  }

  const shippedThen = new Set(a.catalogThen.filter((e) => e.status === 'shipped').map((e) => e.id));
  const since = shippedNow.filter((e) => !shippedThen.has(e.id));
  if (since.length === 0) return null;
  const noun = since.length === 1 ? '1 shipped since' : `${since.length} shipped since`;
  const days = wholeDays(a.refreshedOn, a.today);
  return `README last refreshed ${a.refreshedOn} (${days} days ago); ${noun}: ${since.map((e) => e.id).join(', ')}. Run /refresh-readme.`;
}

/**
 * The line for this project: level and refresh point from docs/readme/readme.yaml,
 * and the catalog as it was at that commit. No settings file means the nudge is off.
 * A git command that fails means the refresh point cannot be read.
 * @param {string} root
 * @param {Array<object>} catalogNow
 * @param {string} today YYYY-MM-DD
 * @returns {string|null}
 */
export function readmeFreshnessAt(root, catalogNow, today) {
  const settingsPath = resolve(root, 'docs/readme/readme.yaml');
  let level = null;
  let refreshedAt = '';
  if (existsSync(settingsPath)) {
    let settings;
    try {
      settings = YAML.parse(readFileSync(settingsPath, 'utf8')) ?? {};
    } catch {
      // A hand edit gone wrong must not take /next and the board down with it.
      return 'README settings in docs/readme/readme.yaml cannot be read. Fix the file, or run /refresh-readme <level>.';
    }
    level = settings.level ?? null;
    // An unquoted all-digit hash parses as a number.
    refreshedAt = settings.refreshedAt == null ? '' : String(settings.refreshedAt);
  }

  let catalogThen = [];
  let refreshedOn = null;
  if (refreshedAt !== '') {
    ({ catalogThen, refreshedOn } = catalogAt(root, refreshedAt));
  }

  return readmeFreshness({ level, refreshedAt, catalogNow, catalogThen, refreshedOn, today });
}

/**
 * The catalog and commit date at `ref`, or nulls when either cannot be read. `ref` comes
 * from a file anyone can edit, so it must look like a commit hash before git sees it — a
 * value starting with `-` would otherwise be read as an option — and must name a commit,
 * not a tree or a blob. The catalog path is relative to `root` (`./`), so a project that
 * is not at the top of its repository finds its own catalog.
 */
function catalogAt(root, ref) {
  const none = { catalogThen: null, refreshedOn: null };
  // 40 hex characters for SHA-1 repositories, 64 for SHA-256 ones.
  if (!/^[0-9a-f]{7,64}$/i.test(ref)) return none;
  const commit = spawnSync('git', ['-C', root, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { encoding: 'utf8' });
  if (commit.status !== 0) return none;
  const sha = commit.stdout.trim();
  const show = spawnSync('git', ['-C', root, 'show', `${sha}:./feature-catalog.yaml`], { encoding: 'utf8' });
  const dated = spawnSync('git', ['-C', root, 'log', '-1', '--format=%cs', sha], { encoding: 'utf8' });
  const refreshedOn = dated.status === 0 ? dated.stdout.trim() : '';
  if (show.status !== 0 || refreshedOn === '') return none;
  let parsed;
  try {
    parsed = YAML.parse(show.stdout);
  } catch {
    return none;
  }
  return { catalogThen: Array.isArray(parsed) ? parsed : [], refreshedOn };
}
