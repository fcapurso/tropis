// Shared machinery: no part of this file is project-owned.
/**
 * Writes a project's generated rule files.
 *
 * Sources: the shipped rule texts in .tropis/rules/, their areas in
 * .claude/rule-areas.json, the project's additions to a shipped rule in
 * .claude/rule-additions/, and the project's own rules in .claude/rules/ (hand-written,
 * with a `paths:` header). Output: .claude/rules/<name>.md for each shipped rule, and
 * .cursor/rules/<name>.mdc for every rule. Each file ends in a hash line, so `--check`
 * can tell a hand edit from a source that moved on. Running twice writes identical bytes.
 *
 * Run: `npm --prefix .tropis run rules` — and `rules -- --check` to only report.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';
import { parseRule, areaProblems, renderClaude, renderCursor, checkStamp, joinAdditions, additionsProblem } from './rule-areas.js';

const here = dirname(fileURLToPath(import.meta.url));
// Installed at .tropis/scripts/, two levels below the project root.
const root = resolve(here, '../..');
const check = process.argv.includes('--check');

const names = (dir, ext) => (existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => basename(f, ext)).sort()
  : []);
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const readIfThere = (p) => (existsSync(resolve(root, p)) ? read(p) : null);

function fail(problems) {
  console.error(`rules: nothing written.\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}

const shipped = names(resolve(root, '.tropis/rules'), '.md');
const problems = [];

let areas = null;
try {
  areas = JSON.parse(read('.claude/rule-areas.json'));
  problems.push(...areaProblems(areas, shipped).map((p) => `.claude/rule-areas.json: ${p}`));
} catch (e) {
  problems.push(`.claude/rule-areas.json: ${e.code === 'ENOENT' ? 'missing' : e.message}`);
}

// What each rule's files should hold: name → { claude (shipped only), cursor }.
const expected = new Map();
const own = [];
const claudeDir = resolve(root, '.claude/rules');
for (const name of names(claudeDir, '.md')) {
  const text = read(`.claude/rules/${name}.md`);
  if (shipped.includes(name)) {
    // The generated file of a shipped rule shares its name; a hand-written one does not
    // carry the hash line, and the generator would overwrite it.
    if (!checkStamp(text).generated) {
      problems.push(`.claude/rules/${name}.md: a project rule with the name of the shipped rule "${name}" — rename it`);
    }
    continue;
  }
  if (checkStamp(text).generated) continue; // left over from a shipped rule that is gone; reported below
  own.push(name);
  const { paths, body } = parseRule(text);
  if (!paths || paths.length === 0) {
    problems.push(`.claude/rules/${name}.md: no paths: header. Add one naming the files the rule governs: paths: ["src/area/**"]`);
  } else if (paths.some((g) => g.includes(','))) {
    problems.push(`.claude/rules/${name}.md: a glob contains a comma, which Cursor's globs line cannot carry`);
  } else {
    expected.set(`.cursor/rules/${name}.mdc`, renderCursor(name, paths, body));
  }
}

const additions = new Map();
for (const name of names(resolve(root, '.claude/rule-additions'), '.md')) {
  const text = read(`.claude/rule-additions/${name}.md`);
  const problem = additionsProblem(name, text, shipped, own);
  if (problem) problems.push(`.claude/rule-additions/${name}.md: ${problem}`);
  else additions.set(name, text);
}

if (problems.length === 0) {
  for (const name of shipped) {
    const text = joinAdditions(read(`.tropis/rules/${name}.md`), additions.get(name) ?? null);
    expected.set(`.claude/rules/${name}.md`, renderClaude(areas[name], text));
    expected.set(`.cursor/rules/${name}.mdc`, renderCursor(name, areas[name], text));
  }
}
if (problems.length > 0) fail(problems);

// Generated files on disk that no source accounts for.
const onDisk = [
  ...names(claudeDir, '.md').map((n) => `.claude/rules/${n}.md`).filter((p) => checkStamp(read(p)).generated),
  ...names(resolve(root, '.cursor/rules'), '.mdc').map((n) => `.cursor/rules/${n}.mdc`),
];
const extra = onDisk.filter((p) => !expected.has(p));

if (check) {
  const report = [];
  for (const [path, want] of expected) {
    const have = readIfThere(path);
    if (have === null) report.push(`${path}: missing`);
    else if (have !== want) {
      report.push(`${path}: ${checkStamp(have).intact ? 'stale — its source has changed' : 'edited by hand'}`);
    }
  }
  for (const path of extra) report.push(`${path}: extra — no source writes it`);
  if (report.length > 0) {
    console.error(`rules out of date — run: npm --prefix .tropis run rules\n${report.map((r) => `  ${r}`).join('\n')}`);
    process.exit(1);
  }
  console.log('rules up to date');
} else {
  for (const [path, text] of expected) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    writeFileSync(resolve(root, path), text, 'utf8');
  }
  // Only files that carry the hash line are removed; a hand-written .mdc is left for --check to name.
  for (const path of extra) if (checkStamp(read(path)).generated) rmSync(resolve(root, path));
  console.log(`Wrote ${expected.size} rule files`);
}
