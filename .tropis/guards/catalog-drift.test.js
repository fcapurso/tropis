// Level: unit
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
// Installed at .tropis/guards/, two levels below the project root. Pointed at fixtures/
// by scripts/check-conformance.sh, so this guard can be seen to fail.
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');
const plansDir = resolve(root, 'docs/superpowers/plans');
const catalogPath = resolve(root, 'feature-catalog.yaml');

/** Blank out fenced code blocks, preserving line count. */
function stripFences(text) {
  let inFence = false;
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return '';
      }
      return inFence ? '' : line;
    })
    .join('\n');
}

function extractSection(markdown, heading) {
  const re = new RegExp(`^## ${heading}\\s*$`, 'm');
  const m = re.exec(markdown);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = markdown.slice(start);
  const next = /^## /m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function deliveredIds(markdown) {
  const section = extractSection(markdown, 'Delivers');
  if (section == null) return null;
  const body = section.replace(/<!--[\s\S]*?-->/g, '').trim();
  if (body === 'None.') return [];
  const ids = [];
  for (const line of body.split('\n')) {
    for (const part of line.split(',')) {
      const tok = part.trim().replace(/^[-*]\s*/, '');
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tok)) ids.push(tok);
    }
  }
  return ids;
}

function executedOnMain(name) {
  const result = spawnSync(
    'git',
    ['show', `origin/main:docs/superpowers/plans/${name}`],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.status !== 0) return true;
  return /^## Handover report/m.test(stripFences(result.stdout));
}

function livePlanFiles() {
  if (!existsSync(plansDir)) return [];
  return readdirSync(plansDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(plansDir, f));
}

describe('catalog drift', () => {
  it('every Delivers id on an executed live plan is shipped', () => {
    if (!existsSync(catalogPath)) return;
    const featureCatalog = YAML.parse(readFileSync(catalogPath, 'utf8'));
    const byId = new Map(featureCatalog.map((e) => [e.id, e]));
    const bad = [];
    for (const file of livePlanFiles()) {
      const name = basename(file);
      const raw = readFileSync(file, 'utf8');
      const body = stripFences(raw);
      if (!/^## Handover report/m.test(body)) continue;
      if (!executedOnMain(name)) continue;
      const ids = deliveredIds(raw);
      if (ids == null) {
        bad.push(`${name}: missing ## Delivers`);
        continue;
      }
      for (const id of ids) {
        const e = byId.get(id);
        if (!e || e.status !== 'shipped') {
          bad.push(`${name}: ${id} is ${e ? e.status : 'missing'}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('no live plan filename is dated after today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const future = livePlanFiles()
      .map((f) => basename(f))
      .filter((n) => {
        const m = /^(\d{4}-\d{2}-\d{2})-/.exec(n);
        return m && m[1] > today;
      });
    expect(future).toEqual([]);
  });

  it('every shelved entry states a shelf reason in its value', () => {
    if (!existsSync(catalogPath)) return;
    const featureCatalog = YAML.parse(readFileSync(catalogPath, 'utf8'));
    const silent = featureCatalog
      .filter((e) => e.shelved)
      .filter((e) => !/shelved|shelf|parked/i.test(e.value ?? ''))
      .map((e) => e.id);
    expect(silent).toEqual([]);
  });

  it('every dropped entry says it was dropped, and why, in its value', () => {
    if (!existsSync(catalogPath)) return;
    const featureCatalog = YAML.parse(readFileSync(catalogPath, 'utf8'));
    const silent = featureCatalog
      .filter((e) => e.status === 'dropped')
      .filter((e) => !/dropped/i.test(e.value ?? ''))
      .map((e) => e.id);
    expect(silent).toEqual([]);
  });
});
