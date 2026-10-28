// Shared machinery: no part of this file is project-owned.
/**
 * Brings a set-up project to the version of this Tropis checkout.
 *
 * Run from a Tropis checkout that sits exactly on a release tag, never from a project:
 * `node scripts/take-version.mjs <project-root> [--from <version>] [--accept-breaking]`.
 * The tag is the target version. This file is not installed into projects.
 *
 * What the project was given (the baseline) is the fingerprints in its
 * `.tropis/installed.json`, or `.framework/installed.json` when an earlier install has
 * not moved yet. A project with no usable record names the version it holds with
 * `--from`, and that version is set up in a scratch folder to take them from. The first
 * run on an earlier install renames `.framework/` to `.tropis/` before anything else
 * is written.
 * A shipped file the project left alone is replaced; one it changed is kept and the new
 * text lands beside it as `<path>.new`. A shipped file the project lacks is listed as
 * removed by the project when a record says it was given it, and written when the
 * baseline came from `--from`. `.claude/settings.json`, the rule areas file and the
 * ignore files are merged, never replaced. Every refusal comes before any write, and
 * git is the backup: a dirty tree is refused.
 *
 * Exit 0 with a report on stdout, or exit 1 with one `take-version:` line on stderr.
 *
 * Library callers use `takeVersion()`, and `appendMissingLines()`, for the ignore files.
 * `takeVersion()` throws `Refusal` and returns the report instead of writing it. The block
 * at the bottom runs only when this file is the program.
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync,
  renameSync, rmSync, statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blocks, carryBlocks, fingerprint, recordOf,
} from './installed-files.js';
import { checkStamp, parseRule } from './rule-areas.js';

const tropis = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export class Refusal extends Error {
  constructor(message, kind) {
    super(message);
    if (kind !== undefined) this.kind = kind;
  }
}
const refuse = (message, kind) => {
  throw new Refusal(`take-version: ${message}`, kind);
};

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options });
}

const git = (cwd, ...args) => run('git', ['-C', cwd, ...args]);
const abs = (root, rel) => join(root, ...rel.split('/'));

/** Where this framework came from: the checkout's origin, or its path when it has none. */
function checkoutSource(root) {
  const remote = git(root, 'remote', 'get-url', 'origin');
  const url = remote.status === 0 ? remote.stdout.trim() : '';
  return url || realpathSync(root);
}

function readText(path) {
  try {
    return statSync(path).isFile() ? readFileSync(path, 'utf8') : null;
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return null;
    throw e;
  }
}

function writeText(path, text, modeFrom) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  if (modeFrom) chmodSync(path, statSync(modeFrom).mode & 0o777);
}

const readJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    if (e instanceof SyntaxError) refuse(`${label} is not valid JSON: ${e.message}`);
    throw e;
  }
};

/**
 * Held versions with a suffix after the numbers (a describe string) sort after their
 * numbers and before the next release: the fourth element is 1 for a suffix.
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

export const breaking = (target, held) => (held[0] === 0
  ? target[0] > 0 || target[1] > held[1]
  : target[0] > held[0]);

function parseArgs(argv) {
  let project = null;
  let from = null;
  let acceptBreaking = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--accept-breaking') acceptBreaking = true;
    else if (arg === '--from') {
      from = argv[i + 1];
      i += 1;
      if (from === undefined) refuse('--from needs a version: --from vX.Y.Z.');
    } else if (arg.startsWith('--')) refuse(`unknown option ${arg}.`);
    else if (project === null) project = arg;
    else refuse(`unexpected argument ${arg}.`);
  }
  if (project === null) {
    refuse('usage: node scripts/take-version.mjs <project-root> [--from <version>] [--accept-breaking]');
  }
  return { project: resolve(project), from, acceptBreaking };
}

/** `git archive <version>` of this checkout, extracted and set up as a project named `name`. */
function buildVersion(version, tmp, label, name) {
  const src = join(tmp, label, 'src');
  mkdirSync(src, { recursive: true });
  // Raw bytes: a tar stream is not text.
  const archive = spawnSync('git', ['-C', tropis, 'archive', '--format=tar', version], { maxBuffer: 1 << 28 });
  if (archive.status !== 0) refuse(`cannot read ${version} from ${tropis}: ${String(archive.stderr).trim()}`);
  const untar = spawnSync('tar', ['-x', '-C', src], { input: archive.stdout });
  if (untar.status !== 0) refuse(`cannot unpack ${version}: ${String(untar.stderr).trim()}`);
  const out = join(tmp, label, 'out', name);
  mkdirSync(out, { recursive: true });
  const init = git(out, 'init', '-q');
  if (init.status !== 0) refuse(`cannot prepare a scratch repository: ${init.stderr.trim()}`);
  const setup = run('bash', [join(src, 'scripts/set-up-project.sh'), out]);
  if (setup.status !== 0) refuse(`setting ${version} up in scratch failed: ${(setup.stderr || setup.stdout).trim()}`);
  return out;
}

const sameJson = (a, b) => {
  const canon = (v) => {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
    }
    return v;
  };
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
};

/** File names of hooks the baseline or the new version shipped, from either folder. */
function shippedHookNames(paths) {
  const names = new Set();
  for (const rel of paths) {
    const match = /^\.(?:tropis|framework)\/hooks\/([^/]+)$/.exec(rel);
    if (match) names.add(match[1]);
  }
  return names;
}

/**
 * A hook is shipped when its command names a hook file the baseline or the new version
 * shipped, in either folder. A script the framework never shipped is the project's own.
 */
function isShippedHook(hook, names) {
  if (typeof hook?.command !== 'string') return false;
  for (const name of names) {
    if (hook.command.includes(`.tropis/hooks/${name}`) || hook.command.includes(`.framework/hooks/${name}`)) {
      return true;
    }
  }
  return false;
}

/** The project's settings with its shipped hooks replaced by the new version's. */
function mergeSettings(projectSettings, nextSettings, names) {
  const result = { ...projectSettings };
  const hooks = {};
  for (const [event, groups] of Object.entries(projectSettings.hooks ?? {})) {
    const kept = [];
    for (const group of groups) {
      const own = (group.hooks ?? []).filter((h) => !isShippedHook(h, names));
      const removed = (group.hooks ?? []).length - own.length;
      if (removed > 0 && own.length === 0) continue;
      kept.push(removed > 0 ? { ...group, hooks: own } : group);
    }
    if (kept.length > 0 || groups.length === 0) hooks[event] = kept;
  }
  for (const [event, groups] of Object.entries(nextSettings.hooks ?? {})) {
    hooks[event] ??= [];
    for (const group of groups) {
      const { hooks: shipped, ...rest } = group;
      const match = hooks[event].find((g) => {
        const { hooks: _own, ...other } = g;
        return sameJson(other, rest);
      });
      if (match) match.hooks = [...(match.hooks ?? []), ...shipped];
      else hooks[event].push(group);
    }
  }
  if (Object.keys(hooks).length > 0 || 'hooks' in projectSettings) result.hooks = hooks;
  return result;
}

/** One key per line with string arrays inline: the layout the template has. */
function areasText(areas) {
  const lines = Object.entries(areas).map(([key, value]) => {
    const text = Array.isArray(value) && value.every((v) => typeof v === 'string')
      ? `[${value.map((v) => JSON.stringify(v)).join(', ')}]`
      : JSON.stringify(value, null, 2).replace(/\n/g, '\n  ');
    return `  ${JSON.stringify(key)}: ${text}`;
  });
  return `{\n${lines.join(',\n')}\n}\n`;
}

/** A pattern line's path without its leading slash, and its attributes. */
function patternOf(line) {
  const [pattern = '', ...attributes] = line.trim().split(/\s+/);
  return { path: pattern.replace(/^\//, ''), attributes };
}

/**
 * The project's text with the lines of `nextText` it lacks appended. A line with a leading
 * slash and the same line without one count as the same line. With `attributes`, an
 * export-ignore line is also skipped when the project has any line for that path that
 * sets, unsets (-export-ignore) or unspecifies (!export-ignore) the attribute: a later
 * line wins, so appending would undo a path the project keeps in its exports.
 */
export function appendMissingLines(projectText, nextText, { attributes = false } = {}) {
  const lines = (projectText ?? '').split('\n');
  const unanchored = (line) => line.replace(/^\//, '');
  const have = new Set(lines.map(unanchored));
  const decided = new Set(attributes
    ? lines.map(patternOf)
      .filter(({ attributes: a }) => a.some((attr) => /^[-!]?export-ignore$/.test(attr)))
      .map(({ path }) => path)
    : []);
  const missing = [];
  for (const line of nextText.split('\n')) {
    if (line === '' || have.has(unanchored(line)) || missing.includes(line)) continue;
    if (attributes) {
      const { path, attributes: a } = patternOf(line);
      if (a.includes('export-ignore') && decided.has(path)) continue;
    }
    missing.push(line);
  }
  if (missing.length === 0) return projectText;
  const base = projectText ?? '';
  const lead = base !== '' && !base.endsWith('\n') ? '\n' : '';
  return `${base}${lead}${missing.join('\n')}\n`;
}

const mapFrameworkPrefix = (rel) => (
  rel.startsWith('.framework/') ? `.tropis/${rel.slice('.framework/'.length)}` : rel
);

/** `.framework/` globs become `.tropis/`; other globs stay. */
function rewriteGlobs(paths) {
  if (!Array.isArray(paths)) return { paths, changed: false };
  let changed = false;
  const next = paths.map((glob) => {
    if (typeof glob === 'string' && glob.startsWith('.framework/')) {
      changed = true;
      return mapFrameworkPrefix(glob);
    }
    return glob;
  });
  return { paths: next, changed };
}

/** Every string value, at any depth. Keys are left as they are. */
function rewriteStringValues(value) {
  if (typeof value === 'string') return value.replaceAll('.framework/', '.tropis/');
  if (Array.isArray(value)) return value.map(rewriteStringValues);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteStringValues(item)]));
  }
  return value;
}

/**
 * Fingerprints of an old-folder scratch. The same exclusions as the current layout,
 * under `.framework/`, because that is where the held version's setup wrote them.
 */
function legacyFiles(root) {
  const excluded = [
    '.framework/node_modules',
    '.framework/package-lock.json',
    '.framework/installed.json',
    '.framework/README.md',
  ];
  const skip = (rel) => excluded.some((item) => rel === item || rel.startsWith(`${item}/`));
  const out = [];
  const walk = (absDir, relDir) => {
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch (e) {
      if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return;
      throw e;
    }
    for (const entry of entries) {
      const rel = `${relDir}/${entry.name}`;
      if (skip(rel)) continue;
      if (entry.isDirectory()) walk(join(absDir, entry.name), rel);
      else if (entry.isFile()) out.push(rel);
    }
  };
  for (const relRoot of ['.framework', '.claude/framework', '.claude/commands']) {
    walk(join(root, ...relRoot.split('/')), relRoot);
  }
  const files = {};
  for (const rel of out.sort()) {
    files[rel] = fingerprint(readFileSync(join(root, ...rel.split('/')), 'utf8'));
  }
  return files;
}

/** The scratch's shipped paths: `.tropis/` for a current setup, `.framework/` for an earlier one. */
function scratchFiles(root) {
  if (existsSync(join(root, '.framework')) && !existsSync(join(root, '.tropis'))) return legacyFiles(root);
  return recordOf(root, 'scratch').files;
}

function mdNames(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.md')).map((name) => name.slice(0, -3)).sort();
}

/**
 * A v0.1.0 install keeps its areas, read from the rules' headers, and its edited rule
 * text. Shipped rule files are removed so the generator can write the new layout.
 * @returns {{ areas: object, fromHeaders: string[], editedRules: string[], rewroteAreas: boolean }}
 */
function migrateV010Rules(project, baselineRoot, nextAreas) {
  const shipped = new Set(mdNames(join(baselineRoot, '.claude/rules')));
  const rulesDir = join(project, '.claude/rules');
  const presentBefore = new Set(mdNames(rulesDir));
  const areas = {};
  const fromHeaders = [];
  let rewroteAreas = false;
  for (const [key, value] of Object.entries(nextAreas)) {
    const rulePath = join(rulesDir, `${key}.md`);
    if (shipped.has(key) && existsSync(rulePath)) {
      const { paths, changed } = rewriteGlobs(parseRule(readFileSync(rulePath, 'utf8')).paths);
      if (changed) rewroteAreas = true;
      areas[key] = Array.isArray(paths) ? paths : value;
      if (Array.isArray(paths)) fromHeaders.push(key);
    } else {
      areas[key] = value;
    }
  }

  const editedRules = [];
  const additions = join(project, '.claude/rule-additions');
  for (const name of shipped) {
    const rulePath = join(rulesDir, `${name}.md`);
    if (!existsSync(rulePath)) continue;
    const projectRule = parseRule(readFileSync(rulePath, 'utf8'));
    const baselinePath = join(baselineRoot, '.claude/rules', `${name}.md`);
    const baselineRule = existsSync(baselinePath) ? parseRule(readFileSync(baselinePath, 'utf8')) : null;
    if (baselineRule && projectRule.body !== baselineRule.body) {
      mkdirSync(additions, { recursive: true });
      writeFileSync(join(additions, `${name}.md.old`), readFileSync(rulePath, 'utf8'));
      editedRules.push(name);
    }
    unlinkSync(rulePath);
  }

  const cursorDir = join(project, '.cursor/rules');
  if (existsSync(cursorDir)) {
    for (const file of readdirSync(cursorDir)) {
      if (!file.endsWith('.mdc')) continue;
      const name = file.slice(0, -4);
      if (!presentBefore.has(name)) continue;
      const text = readFileSync(join(cursorDir, file), 'utf8');
      if (!checkStamp(text).generated) unlinkSync(join(cursorDir, file));
    }
  }

  writeFileSync(join(project, '.claude/rule-areas.json'), areasText(areas));
  return { areas, fromHeaders, editedRules, rewroteAreas };
}

/** In-place `.framework/` → `.tropis/` on lines that name the old folder. */
function rewriteLines(path) {
  const text = readText(path);
  if (text === null || !text.includes('.framework/')) return false;
  const next = text.split('\n').map((line) => (
    line.includes('.framework/') ? line.replaceAll('.framework/', '.tropis/') : line
  )).join('\n');
  if (next === text) return false;
  writeFileSync(path, next);
  return true;
}

/**
 * Rename `.framework/` to `.tropis/` and rewrite the strings that name it.
 * The per-path pass has not written anything yet.
 */
function relocate(input) {
  const report = { moved: false, rewrote: [], fromHeaders: [], editedRules: [] };
  if (input.layout === 'current') {
    return { ...input, projectAreas: input.projectAreas ?? {}, report };
  }

  renameSync(join(input.project, '.framework'), join(input.project, '.tropis'));
  const baseline = {};
  for (const [rel, hash] of Object.entries(input.baseline)) baseline[mapFrameworkPrefix(rel)] = hash;
  report.moved = true;

  const projectSettings = rewriteStringValues(input.projectSettings);
  if (JSON.stringify(projectSettings) !== JSON.stringify(input.projectSettings)) {
    report.rewrote.push('.claude/settings.json');
  }
  for (const file of ['.gitignore', '.gitattributes']) {
    if (rewriteLines(join(input.project, file))) report.rewrote.push(file);
  }

  let projectAreas = input.projectAreas;
  if (input.layout === 'v010') {
    const nextAreas = JSON.parse(readFileSync(join(input.next, '.claude/rule-areas.json'), 'utf8'));
    const migrated = migrateV010Rules(input.project, input.baselineRoot, nextAreas);
    projectAreas = migrated.areas;
    report.fromHeaders = migrated.fromHeaders;
    report.editedRules = migrated.editedRules;
    if (migrated.rewroteAreas) report.rewrote.push('.claude/rule-areas.json');
  } else if (projectAreas) {
    const areas = {};
    let changed = false;
    for (const [key, value] of Object.entries(projectAreas)) {
      const rewritten = rewriteGlobs(value);
      areas[key] = rewritten.paths;
      if (rewritten.changed) changed = true;
    }
    projectAreas = areas;
    if (changed) {
      writeFileSync(join(input.project, '.claude/rule-areas.json'), areasText(areas));
      report.rewrote.push('.claude/rule-areas.json');
    }
  }

  return { ...input, baseline, projectSettings, projectAreas: projectAreas ?? {}, report };
}

/**
 * Files the command does not own that still name the old folder. Shipped files are left
 * out: the command just wrote them, and a shipped decision record names the old folder
 * as history.
 */
function stillNamesFramework(project, shipped) {
  const listed = git(project, 'ls-files', '-co', '--exclude-standard').stdout.split('\n').filter(Boolean);
  const hits = [];
  for (const rel of listed) {
    if (rel.endsWith('.new') || rel.endsWith('.old') || rel in shipped) continue;
    const inScope = rel.startsWith('.claude/') || rel.startsWith('.cursor/')
      || rel.startsWith('.tropis/') || !rel.includes('/');
    if (!inScope) continue;
    const text = readText(abs(project, rel));
    if (text !== null && text.includes('.framework/')) hits.push(rel);
  }
  return hits.sort();
}

/**
 * The name the project was set up under. Setup names the framework package
 * `<slug>-framework` after the folder it ran in, so the slug is read back from that
 * package, and an update run in a worktree or a renamed folder builds its scratch copies
 * under the same name. The folder's name when the package is missing or names nothing.
 */
function setupName(project, folder) {
  let name = '';
  try {
    name = String(JSON.parse(readFileSync(join(project, folder, 'package.json'), 'utf8')).name ?? '');
  } catch {
    name = '';
  }
  const slug = name.replace(/-framework$/, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || basename(project);
}

export function takeVersion({ project, from = null, acceptBreaking = false }) {
  project = resolve(project);

  const exact = git(tropis, 'describe', '--tags', '--exact-match', 'HEAD');
  if (exact.status !== 0) {
    const where = git(tropis, 'describe', '--tags', '--always');
    const label = where.status === 0 ? where.stdout.trim() : 'not a git checkout';
    refuse(`check out a release tag first (git checkout vX.Y.Z); this checkout is ${label}.`);
  }
  const target = exact.stdout.trim();

  const top = git(project, 'rev-parse', '--show-toplevel');
  let isRoot = false;
  if (top.status === 0) {
    try {
      isRoot = realpathSync(top.stdout.trim()) === realpathSync(project);
    } catch {
      isRoot = false;
    }
  }
  if (!isRoot) refuse(`${project} is not the root of a git repository.`);

  if (git(project, 'status', '--porcelain').stdout.trim() !== '') {
    refuse(`${project} has uncommitted changes. Commit or stash them first; git is this command's backup.`);
  }

  const hasTropis = existsSync(join(project, '.tropis'));
  const hasFramework = existsSync(join(project, '.framework'));
  if (hasTropis && hasFramework) {
    refuse(`${project} has both .framework/ and .tropis/. Remove the one that is not in use, commit, and run again.`);
  }
  if (!hasTropis && !hasFramework) {
    refuse(`${project} has no .tropis/ or .framework/. Set it up with scripts/set-up-project.sh first.`);
  }
  const layout = hasTropis ? 'current' : (existsSync(join(project, '.claude/rule-areas.json')) ? 'areas-old' : 'v010');
  const folder = layout === 'current' ? '.tropis' : '.framework';

  const recordPath = join(project, folder, 'installed.json');
  const record = existsSync(recordPath) ? readJson(recordPath, `${project}/${folder}/installed.json`) : null;
  let held;
  let heldParts = parseVersion(record?.version);
  const fromRecord = heldParts !== null;
  if (fromRecord) {
    held = record.version;
  } else {
    if (from === null) {
      refuse(record === null
        ? `${project} has no ${folder}/installed.json. Say which version it holds: --from vX.Y.Z.`
        : `${project}'s ${folder}/installed.json holds no usable version (${JSON.stringify(record.version)}). Say which version it holds: --from vX.Y.Z.`);
    }
    heldParts = parseVersion(from);
    if (!heldParts) refuse(`--from ${from} is not a version like vX.Y.Z.`);
    held = from;
  }
  const targetParts = parseVersion(target);
  if (!targetParts) refuse(`${target} is not a version like vX.Y.Z.`);
  const targetBreaks = breaking(targetParts, heldParts);
  if (!newer(targetParts, heldParts)) {
    refuse(`${project} already holds ${held}; ${target} is not newer.`, 'not-newer');
  }
  if (targetBreaks && !acceptBreaking) {
    refuse(`${target} is a breaking release for a project on ${held}. Read its section in RELEASES.md, then run again with --accept-breaking.`);
  }

  const projectSettingsPath = join(project, '.claude/settings.json');
  const projectSettings = existsSync(projectSettingsPath)
    ? readJson(projectSettingsPath, `${project}/.claude/settings.json`)
    : {};
  const areasPath = join(project, '.claude/rule-areas.json');
  const projectAreas = existsSync(areasPath) ? readJson(areasPath, `${project}/.claude/rule-areas.json`) : null;

  const tmp = mkdtempSync(join(tmpdir(), 'take-version-'));
  try {
    const name = setupName(project, folder);
    let baselineRoot = null;
    const baseline = fromRecord
      ? record.files
      : scratchFiles(baselineRoot = buildVersion(from, tmp, 'from', name));
    const next = buildVersion(target, tmp, 'to', name);
    const nextFiles = recordOf(next, target).files;
    const applied = apply({
      project, target, held, fromRecord, baseline, baselineRoot, layout, next, nextFiles, projectSettings,
      projectAreas,
    });
    return {
      status: applied.status,
      text: applied.text,
      held,
      target,
      breaking: targetBreaks,
      result: applied.result,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** True when CLAUDE.md is the single line `@AGENTS.md`, with or without one trailing newline. */
function isEntryPointer(text) {
  if (text === null) return false;
  const stripped = text.endsWith('\n') ? text.slice(0, -1) : text;
  return stripped === '@AGENTS.md';
}

/**
 * The entry pair is the project's own text, not a shipped file. An update points
 * CLAUDE.md at AGENTS.md when the two are identical or one is missing, and changes
 * neither when they differ — which lines win is the developer's call.
 * @param {string} project
 */
function entryFiles(project) {
  const claudePath = join(project, 'CLAUDE.md');
  const agentsPath = join(project, 'AGENTS.md');
  const claude = readText(claudePath);
  const agents = readText(agentsPath);
  const pointer = '@AGENTS.md\n';

  if (isEntryPointer(claude)) return {};
  if (claude !== null && agents !== null && claude === agents) {
    writeText(claudePath, pointer);
    return { report: 'Pointed CLAUDE.md at AGENTS.md, which keeps the entry instructions.' };
  }
  if (claude !== null && agents === null) {
    writeText(agentsPath, claude);
    writeText(claudePath, pointer);
    return { report: 'Moved the entry instructions from CLAUDE.md to AGENTS.md, and pointed CLAUDE.md at it.' };
  }
  if (claude === null && agents !== null) {
    writeText(claudePath, pointer);
    return { report: 'Wrote CLAUDE.md as the single line @AGENTS.md.' };
  }
  if (claude === null) return {};

  const diff = run(
    'git',
    ['diff', '--no-index', '--no-color', '-U0', '--', 'AGENTS.md', 'CLAUDE.md'],
    { cwd: project },
  );
  // Shipped files are already written by now, so a failed diff is reported, not refused.
  const lines = diff.status === 1
    ? diff.stdout.split('\n').filter(
      (line) => line !== '' && !line.startsWith('diff --git ') && !line.startsWith('index '),
    )
    : [`(could not list them: ${(diff.stderr || '').trim() || diff.error?.message || `git diff exited ${diff.status}`})`];
  const decision = [
    "CLAUDE.md and AGENTS.md differ, so neither was changed. Merge CLAUDE.md's lines",
    '  into AGENTS.md, then make CLAUDE.md the single line @AGENTS.md. The lines that differ:',
    ...lines.map((line) => `    ${line}`),
  ].join('\n');
  return { decision };
}

function apply(input) {
  const {
    project, target, held, fromRecord, baseline, next, nextFiles, projectSettings, projectAreas, report,
  } = relocate(input);
  const replaced = [];
  const added = [];
  const deleted = [];
  const newFiles = [];
  const blockMismatch = [];
  const removedByProject = [];
  const keptButGone = [];
  let packageChanged = false;

  const paths = [...new Set([...Object.keys(baseline), ...Object.keys(nextFiles)])].sort();
  for (const rel of paths) {
    const inB = rel in baseline;
    const inN = rel in nextFiles;
    const dest = abs(project, rel);
    const source = abs(next, rel);
    const projectText = readText(dest);
    const nextText = inN ? readFileSync(source, 'utf8') : null;

    const writeNew = (text) => {
      writeText(`${dest}.new`, text, source);
      newFiles.push(rel);
      if (rel === '.tropis/package.json') packageChanged = true;
    };

    if (inB && inN) {
      if (projectText === null) {
        // A record lists what the project was given, so a missing file was removed by it.
        // A --from baseline lists only what that version ships: the project may never
        // have had the file, so it is written rather than left out.
        if (fromRecord) {
          removedByProject.push(rel);
        } else {
          writeText(dest, nextText, source);
          added.push(rel);
          if (rel === '.tropis/package.json') packageChanged = true;
        }
      } else if (fingerprint(projectText) === baseline[rel]) {
        const carried = carryBlocks(projectText, nextText);
        // No blocks means the fingerprint is the whole file, so a count change is the
        // new version adding its first block and there is nothing of the project's to
        // carry. A file that already has blocks may hold a fill-in the fingerprint
        // cannot see, and a count change is written beside it.
        if (carried.mismatch && blocks(projectText).length > 0) {
          writeNew(nextText);
          blockMismatch.push(rel);
        } else {
          const text = carried.mismatch ? nextText : carried.text;
          writeText(dest, text, source);
          if (text !== projectText) {
            replaced.push(rel);
            if (rel === '.tropis/package.json') packageChanged = true;
          }
        }
      } else if (nextFiles[rel] !== baseline[rel]) {
        const carried = carryBlocks(projectText, nextText);
        writeNew(carried.text);
        if (carried.mismatch) blockMismatch.push(rel);
      }
    } else if (inN) {
      if (projectText === null) {
        writeText(dest, nextText, source);
        added.push(rel);
        if (rel === '.tropis/package.json') packageChanged = true;
      } else {
        writeNew(nextText);
      }
    } else if (projectText !== null) {
      if (fingerprint(projectText) === baseline[rel]) {
        unlinkSync(dest);
        deleted.push(rel);
      } else {
        keptButGone.push(rel);
      }
    }
  }

  const hookNames = shippedHookNames([...Object.keys(baseline), ...Object.keys(nextFiles)]);
  const nextSettings = JSON.parse(readFileSync(join(next, '.claude/settings.json'), 'utf8'));
  writeFileSync(
    join(project, '.claude/settings.json'),
    `${JSON.stringify(mergeSettings(projectSettings, nextSettings, hookNames), null, 2)}\n`,
  );

  const nextAreas = JSON.parse(readFileSync(join(next, '.claude/rule-areas.json'), 'utf8'));
  const areas = {};
  const areasAdded = [];
  const areasRemoved = Object.keys(projectAreas).filter((k) => !(k in nextAreas));
  for (const [key, value] of Object.entries(projectAreas)) if (key in nextAreas) areas[key] = value;
  for (const [key, value] of Object.entries(nextAreas)) {
    if (!(key in projectAreas)) {
      areas[key] = value;
      areasAdded.push(key);
    }
  }
  if (areasAdded.length > 0 || areasRemoved.length > 0) {
    writeFileSync(join(project, '.claude/rule-areas.json'), areasText(areas));
  }

  for (const file of ['.gitignore', '.gitattributes']) {
    const nextText = readText(join(next, file));
    if (nextText === null) continue;
    const before = readText(join(project, file));
    const after = appendMissingLines(before, nextText, { attributes: file === '.gitattributes' });
    if (after !== before) writeFileSync(join(project, file), after);
  }

  const entry = entryFiles(project);

  const result = {
    replaced,
    added,
    deleted,
    newFiles,
    blockMismatch,
    removedByProject,
    keptButGone,
    areasAdded,
    areasRemoved,
    packageChanged,
    entry,
    report,
  };

  const generated = run('node', ['.tropis/scripts/generate-rules.mjs'], { cwd: project });
  if (generated.status !== 0) {
    return {
      status: 1,
      text: `${generated.stdout}${generated.stderr}take-version: generating the rules failed. The tree can be restored with: git restore . && git clean -fd\n`,
      result,
    };
  }

  writeFileSync(
    join(project, '.tropis/installed.json'),
    `${JSON.stringify(recordOf(next, target, checkoutSource(tropis)), null, 2)}\n`,
  );

  const lines = [`take-version: ${project} now holds ${target} (was ${held}).`, ''];
  const list = (title, items) => {
    if (items.length === 0) return;
    lines.push(`${title}:`, ...items.map((i) => `  ${i}`), '');
  };
  list('Replaced', replaced);
  list('Added', added);
  list('Deleted, no longer shipped', deleted);
  list('Rule areas added', areasAdded);
  list('Rule areas removed', areasRemoved);
  list('Needs a decision', [
    ...removedByProject.map((p) => `${p} — removed by the project, not restored`),
    ...newFiles.map((p) => `${p}.new — ${blockMismatch.includes(p)
      ? 'project-owned blocks differ in number'
      : `the new version's text; merge it into ${p}`}`),
    ...keptButGone.map((p) => `${p} — no longer shipped, kept because you changed it`),
    ...(entry.decision ? [entry.decision] : []),
  ]);
  if (report.moved) lines.push('Moved .framework/ to .tropis/', '');
  if (report.rewrote.length > 0) {
    lines.push(`Rewrote .framework/ to .tropis/ in: ${report.rewrote.join(', ')}`, '');
  }
  if (report.fromHeaders.length > 0) {
    lines.push(`Rule areas taken from your rules' headers: ${report.fromHeaders.join(', ')}`, '');
  }
  if (report.editedRules.length > 0) {
    lines.push(
      `You had edited these shipped rules; your text is in .claude/rule-additions/<n>.md.old: ${report.editedRules.join(', ')}`,
      'Move the lines you added into .claude/rule-additions/<n>.md, then delete the .old file.',
      '',
    );
  }
  if (report.moved) {
    const stale = stillNamesFramework(project, nextFiles);
    if (stale.length > 0) lines.push('Still names .framework/:', ...stale.map((rel) => `  ${rel}`), '');
  }
  if (entry.report) lines.push(entry.report, '');
  lines.push('Next:');
  if (report.moved || packageChanged) lines.push('  npm --prefix .tropis install');
  lines.push('  npm --prefix .tropis test');
  if (newFiles.length > 0) {
    lines.push(
      '  Resolve each .new file: merge it into the file beside it and delete it. Until then the',
      '  installed-files check fails for that file.',
    );
  }
  if (entry.decision) {
    lines.push('  Merge CLAUDE.md into AGENTS.md as above. Until then the entry-file check fails.');
  }
  lines.push('  Commit.');
  return { status: 0, text: `${lines.join('\n')}\n`, result };
}

// A symlink or a relative path still counts as this file. A missing argv[1]
// (the module was imported) does not.
const ranDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (ranDirectly) {
  try {
    const { project, from, acceptBreaking } = parseArgs(process.argv.slice(2));
    const outcome = takeVersion({ project, from, acceptBreaking });
    const stream = outcome.status === 0 ? process.stdout : process.stderr;
    stream.write(outcome.text);
    process.exitCode = outcome.status;
  } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    process.stderr.write(`${e.message}\n`);
    process.exitCode = 1;
  }
}
