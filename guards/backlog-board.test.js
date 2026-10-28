// Level: seam
/**
 * The backlog board is a build product: catalog facts and hand-written bands spliced
 * into a page template. These check the splice — a placeholder left in the output, or
 * data the page cannot parse, would ship a visibly broken board, and the script's own
 * exit code says nothing about either.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, symlinkSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { bandLetters, movedBands } from '../scripts/board-bands.js';
import { bandOf, nextStep } from '../scripts/next-work.js';

const here = dirname(fileURLToPath(import.meta.url));
const shipped = resolve(here, '../scripts');

const CATALOG = `- id: done
  title: Done
  status: shipped
  type: feature
  layer: product
  value: Finished.
  acceptanceCriteria:
    - Done.
  modules: []
  refs:
    - docs/specs/arc-design.md
- id: open-a
  title: Open A
  status: shaped
  type: feature
  layer: product
  value: Do this.
  acceptanceCriteria:
    - It can be done.
  modules: []
  refs:
    - docs/specs/arc-design.md
- id: open-b
  title: Open B
  status: idea
  type: feature
  layer: framework
  value: Not banded.
  acceptanceCriteria: []
  modules: []
  refs: []
`;

const BANDS = `open-a:
  band: A
  verdict: Do it.
  seen:
    status: idea
    blockers: []
gone:
  band: C
  verdict: Its entry is gone.
done:
  band: B
  verdict: It shipped.
`;

function stage(catalog, bands) {
  const dir = mkdtempSync(join(tmpdir(), 'backlog-board-'));
  const fw = join(dir, '.tropis');
  mkdirSync(join(fw, 'scripts'), { recursive: true });
  mkdirSync(join(fw, 'templates'), { recursive: true });
  for (const file of ['build-backlog-board.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js']) {
    copyFileSync(join(shipped, file), join(fw, 'scripts', file));
  }
  copyFileSync(join(shipped, '../templates/backlog-board.html'), join(fw, 'templates', 'backlog-board.html'));
  writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
  writeFileSync(join(dir, 'feature-catalog.yaml'), catalog);
  if (bands !== undefined) {
    mkdirSync(join(dir, 'docs/backlog-board'), { recursive: true });
    writeFileSync(join(dir, 'docs/backlog-board/bands.yaml'), bands);
  }
  symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));
  return dir;
}

function build(dir, args = []) {
  return spawnSync('node', [join(dir, '.tropis/scripts/build-backlog-board.mjs'), ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
}

function page(dir) {
  return readFileSync(join(dir, 'docs/backlog-board/index.html'), 'utf8');
}

function grab(html, name) {
  return JSON.parse(html.match(new RegExp(`const ${name} = (.*?);\\n`, 's'))[1]);
}

describe('backlog board build', () => {
  let dir;
  let run;

  beforeAll(() => {
    dir = stage(CATALOG, BANDS);
    run = build(dir);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('runs and writes the page', () => {
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(existsSync(join(dir, 'docs/backlog-board/index.html'))).toBe(true);
  });

  it('leaves no placeholder in the output', () => {
    expect(page(dir).match(/__[A-Z]+__/g)).toBeNull();
  });

  // Opened from disk, a page that does not declare its encoding is read in the browser's
  // default one, and every dash and middle dot on it comes out garbled.
  it('declares itself an HTML page in UTF-8', () => {
    expect(page(dir).startsWith('<!doctype html>\n<meta charset="utf-8">')).toBe(true);
  });

  it('embeds data the page can parse, covering every open entry', () => {
    const html = page(dir);
    const entries = grab(html, 'ENTRIES');
    const arcs = grab(html, 'ARCS');
    const open = YAML.parse(CATALOG).filter((e) => e.status !== 'shipped');
    expect(entries.map((e) => e.id).sort()).toEqual(open.map((e) => e.id).sort());
    expect(arcs.length).toBeGreaterThan(0);
    for (const a of arcs) expect(a.order.length).toBe(a.total);
  });

  it('names unbanded entries and bands whose entry is gone', () => {
    expect(run.stdout).toContain('- open-b');
    expect(run.stdout).toContain('- gone');
    expect(run.stdout).toContain('- done');
  });

  it('names moved bands', () => {
    const catalog = YAML.parse(CATALOG);
    const bands = YAML.parse(BANDS);
    for (const m of movedBands(catalog, bands)) {
      expect(run.stdout).toContain(`- ${m.id} — ${m.reason}`);
    }
    expect(movedBands(catalog, bands).length).toBeGreaterThan(0);
  });

  it('--reevaluate lists every open band', () => {
    const again = build(dir, ['--reevaluate']);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('- open-a — band A, shaped');
    expect(again.stdout).toContain('--stamp');
    expect(again.stdout).not.toContain('- gone —');
    expect(again.stdout).not.toContain('- done —');
  });

  it('shows at the top the entry nextStep returns, and is empty when that is null', () => {
    const catalog = YAML.parse(CATALOG);
    const letters = bandLetters(YAML.parse(BANDS));
    const step = nextStep(catalog, letters);
    const shown = grab(page(dir), 'NEXT');
    expect(step).not.toBeNull();
    expect(shown).toEqual({ id: step.id, t: step.title, b: bandOf(step.id, letters) });

    const noneDir = stage(`- id: decide
  title: Decide
  status: shaped
  type: feature
  layer: product
  value: A ruling.
  acceptanceCriteria:
    - Someone decides.
  modules: []
  refs: []
`, 'decide:\n  band: D\n');
    try {
      const none = build(noneDir);
      expect(none.status).toBe(0);
      expect(nextStep(YAML.parse(readFileSync(join(noneDir, 'feature-catalog.yaml'), 'utf8')), { decide: 'D' })).toBeNull();
      expect(grab(page(noneDir), 'NEXT')).toBeNull();
    } finally {
      rmSync(noneDir, { recursive: true, force: true });
    }
  });
});

describe('backlog board without a bands file', () => {
  it('lists every open entry as unbanded and writes the page', () => {
    const dir = stage(CATALOG);
    try {
      const run = build(dir);
      expect(run.status).toBe(0);
      expect(run.stderr).toBe('');
      expect(existsSync(join(dir, 'docs/backlog-board/index.html'))).toBe(true);
      for (const entry of YAML.parse(CATALOG).filter((e) => e.status !== 'shipped')) {
        expect(run.stdout).toContain(`- ${entry.id}`);
      }
      expect(run.stdout).toContain('no band');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('--stamp with no bands file explains and writes nothing', () => {
    const dir = stage(CATALOG);
    try {
      const run = build(dir, ['--stamp']);
      expect(run.status).toBe(0);
      expect(run.stderr).toBe('');
      expect(run.stdout).toBe(
        'No bands file yet: copy .tropis/templates/backlog-bands.yaml to docs/backlog-board/bands.yaml first.\n',
      );
      expect(existsSync(join(dir, 'docs/backlog-board/bands.yaml'))).toBe(false);
      expect(existsSync(join(dir, 'docs/backlog-board/index.html'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is local only', () => {
    const dir = stage(CATALOG, BANDS);
    try {
      const run = build(dir);
      expect(run.status).toBe(0);
      expect(run.stdout).toContain('Open it in a browser.');
      expect(run.stdout).not.toMatch(/http/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('puts the README line in #readme when one is due, and leaves #readme empty when not', () => {
    const quiet = stage(CATALOG, BANDS);
    try {
      const quietRun = build(quiet);
      expect(quietRun.status).toBe(0);
      expect(page(quiet)).toContain('<div id="readme"></div>');
      expect(page(quiet)).toContain('#readme:empty{display:none}');
      expect(quietRun.stdout).not.toContain('Run /refresh-readme.');
    } finally {
      rmSync(quiet, { recursive: true, force: true });
    }

    const catalog = `- id: kept&page
  title: Kept page
  status: shaped
  type: feature
  layer: product
  value: A page.
  acceptanceCriteria:
    - It is there.
  modules: []
  refs: []
`;
    const due = stage(catalog);
    try {
      mkdirSync(join(due, 'docs/readme'), { recursive: true });
      writeFileSync(join(due, 'docs/readme/readme.yaml'), 'level: writes\nrefreshedAt: ""\n');
      const git = (args) => {
        const result = spawnSync('git', args, { cwd: due, encoding: 'utf8' });
        if (result.status !== 0) throw new Error(result.stderr || result.stdout);
        return result.stdout.trim();
      };
      git(['init', '-q']);
      git(['add', '.']);
      git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'refresh point']);
      const hash = git(['rev-parse', 'HEAD']);
      writeFileSync(join(due, 'docs/readme/readme.yaml'), `level: writes\nrefreshedAt: "${hash}"\n`);
      git(['add', 'docs/readme/readme.yaml']);
      git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'record the refresh point']);
      writeFileSync(join(due, 'feature-catalog.yaml'), catalog.replace('status: shaped', 'status: shipped'));
      git(['add', 'feature-catalog.yaml']);
      git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'ship']);
      const built = build(due);
      expect(built.status).toBe(0);
      expect(built.stderr).toBe('');
      const html = page(due);
      expect(html).toContain('<div id="readme">');
      expect(html).toContain('1 shipped since: kept&amp;page');
      expect(html).not.toContain('kept&page');
      const [pathLine, line] = built.stdout.split('\n');
      expect(pathLine).toContain('index.html');
      expect(line).toContain('1 shipped since: kept&page');
      expect(line).toContain('Run /refresh-readme.');
    } finally {
      rmSync(due, { recursive: true, force: true });
    }
  });
});

describe('/refresh-board', () => {
  it('asks, when banding, whether finishing an arc under way raises the band', () => {
    const cmd = readFileSync(resolve(here, '../commands/refresh-board.md'), 'utf8');
    expect(cmd).toMatch(/arc already under way/);
    expect(cmd).toMatch(/finishing (that|the) arc/i);
  });
});
