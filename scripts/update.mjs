// Shared machinery: no part of this file is project-owned.
/**
 * Fetches a framework release into a temporary clone, and removes one.
 *
 * Installed at `.tropis/scripts/update.mjs`. The project root is two levels up.
 * The slash command does the talking; this prints one JSON object or an
 * `update:` line.
 *
 *   node .tropis/scripts/update.mjs fetch [vX.Y.Z] [--source <git url or path>]
 *   node .tropis/scripts/update.mjs discard <clone>
 *
 * `versionBreaks` is the same rule as `breaking` in `take-version.mjs`. That file
 * is not installed into projects, so the rule is copied here. `guards/update.test.js`
 * asserts the two agree.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdtempSync, readFileSync, realpathSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const NO_SOURCE = 'update: no source recorded. Run again with --source <where Tropis comes from>.\n';

function fail(message, code = 1) {
  process.stderr.write(`update: ${message}\n`);
  process.exit(code);
}

/**
 * Same shape as `parseVersion` in `take-version.mjs`: a suffix sorts after the
 * numbers and before the next release.
 * @returns {number[] | null}
 */
export function parseVersion(version) {
  if (typeof version !== 'string') return null;
  const m = /^v(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), version.length > m[0].length ? 1 : 0];
}

function newer(target, held) {
  for (let i = 0; i < 4; i += 1) {
    if (target[i] !== held[i]) return target[i] > held[i];
  }
  return false;
}

/**
 * Whether `target` is a breaking release for a project holding `held`.
 * Below 1.0 a higher middle number; from 1.0 a higher first number.
 * @param {string} target
 * @param {string} held
 */
export function versionBreaks(target, held) {
  const targetParts = parseVersion(target);
  const heldParts = parseVersion(held);
  if (!targetParts || !heldParts) return false;
  return heldParts[0] === 0
    ? targetParts[0] > 0 || targetParts[1] > heldParts[1]
    : targetParts[0] > heldParts[0];
}

/**
 * Steps from `## [x.y.z] — date` sections with held < x.y.z ≤ target, in version
 * order. A step is a paragraph whose first line starts `**<n>. `; it is optional
 * when that lead starts `**<n>. Optional:`. A version with no `### After updating`
 * subsection contributes none.
 * @param {string} text
 * @param {string} held
 * @param {string} target
 */
export function stepsBetween(text, held, target) {
  const heldParts = parseVersion(held);
  const targetParts = parseVersion(target);
  const sections = [];
  let section = null;
  for (const line of text.split('\n')) {
    const heading = /^## \[(\d+\.\d+\.\d+)\] — /.exec(line);
    if (heading) {
      section = { version: `v${heading[1]}`, lines: [] };
      sections.push(section);
      continue;
    }
    if (section) section.lines.push(line);
  }

  const steps = [];
  for (const item of sections) {
    const parts = parseVersion(item.version);
    if (!parts || !heldParts || !targetParts) continue;
    if (!newer(parts, heldParts) || newer(parts, targetParts)) continue;
    let inAfter = false;
    const after = [];
    for (const line of item.lines) {
      if (line.startsWith('### ') || line.startsWith('## ')) {
        inAfter = line.startsWith('### After updating');
        continue;
      }
      if (inAfter) after.push(line);
    }
    for (const paragraph of after.join('\n').split(/\n\s*\n/)) {
      const textOf = paragraph.trim();
      if (!/^\*\*\d+\. /.test(textOf)) continue;
      steps.push({
        version: item.version,
        optional: /^\*\*\d+\. Optional:/.test(textOf),
        text: textOf,
      });
    }
  }
  steps.sort((a, b) => {
    if (a.version === b.version) return 0;
    return newer(parseVersion(a.version), parseVersion(b.version)) ? 1 : -1;
  });
  return steps;
}

function listTags(source) {
  const listed = spawnSync('git', ['ls-remote', '--tags', '--refs', source], { encoding: 'utf8' });
  if (listed.status !== 0) {
    fail(`could not list tags of ${source}.${listed.stderr ? `\n${listed.stderr.trim()}` : ''}`);
  }
  const tags = [];
  for (const line of listed.stdout.split('\n')) {
    const match = /\trefs\/tags\/(v\d+\.\d+\.\d+)$/.exec(line);
    if (match) tags.push(match[1]);
  }
  return tags;
}

function highest(tags) {
  let best = null;
  let bestParts = null;
  for (const tag of tags) {
    const parts = parseVersion(tag);
    if (!parts) continue;
    if (!bestParts || newer(parts, bestParts)) {
      best = tag;
      bestParts = parts;
    }
  }
  return best;
}

function cloneAt(source, tag) {
  const dir = mkdtempSync(join(tmpdir(), 'tropis-update-'));
  const cloned = spawnSync('git', ['clone', '-q', source, dir], { encoding: 'utf8' });
  if (cloned.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    fail(`could not clone ${source}.${cloned.stderr ? `\n${cloned.stderr.trim()}` : ''}`);
  }
  const checked = spawnSync('git', ['-C', dir, 'checkout', '-q', '--detach', tag], { encoding: 'utf8' });
  if (checked.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    fail(`could not check out ${tag}.${checked.stderr ? `\n${checked.stderr.trim()}` : ''}`);
  }
  return dir;
}

function readRecord() {
  const path = join(root, '.tropis', 'installed.json');
  if (!existsSync(path)) fail('no .tropis/installed.json.');
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    if (e instanceof SyntaxError) fail(`.tropis/installed.json is not valid JSON: ${e.message}`);
    throw e;
  }
}

function parseFetch(argv) {
  let version = null;
  let source = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source') {
      source = argv[i + 1];
      i += 1;
      if (source === undefined) fail('--source needs a git url or path.');
    } else if (arg.startsWith('--')) fail(`unknown option ${arg}.`);
    else if (version === null) version = arg;
    else fail(`unexpected argument ${arg}.`);
  }
  return { version, source };
}

function fetchRelease(argv) {
  const { version, source: sourceFlag } = parseFetch(argv);
  const record = readRecord();
  const source = sourceFlag || (typeof record.source === 'string' ? record.source : '');
  if (!source) {
    process.stderr.write(NO_SOURCE);
    process.exit(2);
  }
  const held = record.version;
  const heldParts = parseVersion(held);
  if (!heldParts) fail(`held version ${JSON.stringify(held)} is not a version like vX.Y.Z.`);

  const tags = listTags(source);
  let target;
  if (version) {
    if (!tags.includes(version)) fail(`${version} is not a release tag of ${source}.`);
    target = version;
  } else {
    target = highest(tags);
    if (!target) fail(`${source} has no release tags.`);
  }
  const targetParts = parseVersion(target);
  if (!targetParts || !newer(targetParts, heldParts)) {
    process.stdout.write(`${JSON.stringify({
      source, clone: null, held, target: null, breaking: false, steps: [],
    })}\n`);
    return;
  }

  const clone = cloneAt(source, target);
  const notesPath = join(clone, 'RELEASES.md');
  const notes = existsSync(notesPath) ? readFileSync(notesPath, 'utf8') : '';
  process.stdout.write(`${JSON.stringify({
    source,
    clone,
    held,
    target,
    breaking: versionBreaks(target, held),
    steps: stepsBetween(notes, held, target),
  })}\n`);
}

/**
 * Removes a clone this script created. Refuses a path whose last component does
 * not start `tropis-update-`, and any path that is not inside the system temp
 * directory — including that directory itself.
 */
function discard(clone) {
  if (typeof clone !== 'string' || clone === '') fail('usage: update.mjs discard <clone>');
  if (!basename(clone).startsWith('tropis-update-')) fail(`refusing to remove ${clone}.`);
  let resolved;
  try {
    resolved = realpathSync(clone);
  } catch {
    fail(`refusing to remove ${clone}.`);
  }
  const temp = realpathSync(tmpdir());
  const inside = resolved.startsWith(temp + sep) || resolved.startsWith(`${temp}/`);
  if (!inside) fail(`refusing to remove ${clone}.`);
  rmSync(resolved, { recursive: true, force: true });
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
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'fetch') fetchRelease(rest);
  else if (command === 'discard') discard(rest[0]);
  else fail('usage: update.mjs fetch [vX.Y.Z] [--source <git url or path>] | update.mjs discard <clone>');
}
