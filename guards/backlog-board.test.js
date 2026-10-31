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
import { bandLetters, bandScores, movedBands } from '../scripts/board-bands.js';
import { arcs, bandOf, nextStep } from '../scripts/next-work.js';

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

  it('embeds data the page can parse, covering every entry and flagging the closed ones', () => {
    const html = page(dir);
    const entries = grab(html, 'ENTRIES');
    const arcs = grab(html, 'ARCS');
    const all = YAML.parse(CATALOG);
    expect(entries.map((e) => e.id).sort()).toEqual(all.map((e) => e.id).sort());
    expect(entries.find((e) => e.id === 'done').cl).toEqual({ k: 'shipped' });
    expect(entries.find((e) => e.id === 'open-a').cl).toBeNull();
    expect(arcs.length).toBeGreaterThan(0);
    for (const a of arcs) {
      expect(a.order.length).toBe(a.total);
      expect(['under way', 'not started', 'parked', 'done']).toContain(a.state);
      expect(typeof a.counted).toBe('number');
    }
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
    const step = nextStep(catalog, letters, bandScores(YAML.parse(BANDS)));
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
      expect(nextStep(YAML.parse(readFileSync(join(noneDir, 'feature-catalog.yaml'), 'utf8')), { decide: 'C' })).toBeNull();
      expect(grab(page(noneDir), 'NEXT')).toBeNull();
    } finally {
      rmSync(noneDir, { recursive: true, force: true });
    }
  });
});

const CLOSED_CATALOG = `${CATALOG}- id: replaced
  title: Replaced
  status: shaped
  type: feature
  layer: product
  value: Moved.
  acceptanceCriteria:
    - Moved.
  modules: []
  supersededBy:
    - open-a
  refs: []
- id: parked
  title: Parked
  status: shaped
  type: feature
  layer: product
  value: On purpose.
  acceptanceCriteria:
    - On purpose.
  modules: []
  shelved: true
  refs: []
- id: dropped-one
  title: Dropped one
  status: dropped
  type: feature
  layer: product
  value: Dropped 2026-10-31 - not needed.
  acceptanceCriteria:
    - Not needed.
  modules: []
  refs: []
- id: waiting
  title: Waiting
  status: shaped
  type: feature
  layer: product
  value: Waits.
  acceptanceCriteria:
    - Waits.
  modules: []
  blockedBy:
    - done
    - open-b
  after:
    - open-a
    - done
  refs: []
`;

describe('backlog board with closed entries and scores', () => {
  const bands = `open-a:
  band: A
  value: 4
  valueWhy: "Blocks work."
  effort: 2
  effortWhy: "One file."
  verdict: Do it.
open-b:
  band: E
  verdict: Old letter.
waiting:
  band: B
  value: 9
  effort: 1
  verdict: Waits.
replaced:
  band: B
  verdict: Replaced.
parked:
  band: C
  verdict: Parked.
dropped-one:
  band: B
  verdict: Dropped.
`;
  let dir;
  let run;
  beforeAll(() => {
    dir = stage(CLOSED_CATALOG, bands);
    run = build(dir);
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reports a band on a replaced, dropped or shelved entry as stale, and not as moved', () => {
    expect(run.status).toBe(0);
    const stale = run.stdout.slice(run.stdout.indexOf('been shelved or gone'));
    expect(run.stdout).toContain('3 bands in bands.yaml for entries that have shipped, been dropped, been replaced, been shelved or gone — delete them:');
    expect(stale).toContain('- replaced');
    expect(stale).toContain('- parked');
    expect(stale).toContain('- dropped-one');
    expect(run.stdout).not.toContain('- replaced —');
    expect(run.stdout).not.toContain('- parked —');
    expect(run.stdout).not.toContain('- dropped-one —');
  });

  it('reports a band outside A to D, and a band with no valid scores', () => {
    expect(run.stdout).toContain('1 band not A to D — re-band them:\n  - open-b — E\n');
    expect(run.stdout).toContain(
      '2 bands with no value or effort score (1 to 5) — score them:\n  - open-b\n  - waiting\n',
    );
    expect(run.stdout.indexOf('not A to D')).toBeLessThan(run.stdout.indexOf('no value or effort score'));
  });

  it('flags closed entries for the page and lists only unshipped waits', () => {
    const entries = grab(page(dir), 'ENTRIES');
    const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
    expect(byId.done.cl).toEqual({ k: 'shipped' });
    expect(byId.replaced.cl).toEqual({ k: 'replaced', by: ['open-a'] });
    expect(byId['dropped-one'].cl).toEqual({ k: 'dropped' });
    expect(byId.parked.cl).toBeNull();
    expect(byId.parked.sh).toBe(true);
    expect(byId.waiting.cl).toBeNull();
    expect(byId.waiting.bb).toEqual(['open-b']);
    expect(byId.waiting.af).toEqual(['open-a']);
  });

  it('gives the page scores only where both are integers from 1 to 5', () => {
    const anno = grab(page(dir), 'ANNO');
    expect(anno['open-a'].sc).toEqual({ value: 4, effort: 2 });
    expect(anno['open-a'].vw).toBe('Blocks work.');
    expect(anno.waiting.sc).toBeNull();
    expect(anno['open-b'].sc).toBeNull();
  });

  it('does not ask for a band on a shelved entry', () => {
    const own = stage(CLOSED_CATALOG, 'open-a:\n  band: A\n');
    try {
      const out = build(own);
      expect(out.status).toBe(0);
      expect(out.stdout).toContain('2 active entries have no band');
      expect(out.stdout).toContain('  - open-b\n  - waiting\n');
      expect(out.stdout).not.toContain('  - parked');
    } finally {
      rmSync(own, { recursive: true, force: true });
    }
  });
});

describe('arc state', () => {
  const entry = (id, spec, status, flags = {}) => ({ id, status, refs: [`docs/specs/${spec}.md`], ...flags });
  const catalog = [
    entry('a1', 'a', 'shipped'),
    entry('a2', 'a', 'dropped'),
    entry('b1', 'b', 'shipped'),
    entry('b2', 'b', 'shaped', { supersededBy: ['z'] }),
    entry('c1', 'c', 'dropped'),
    entry('c2', 'c', 'shaped', { shelved: true }),
    entry('d1', 'd', 'shipped'),
    entry('d2', 'd', 'shaped'),
    entry('e1', 'e', 'shaped'),
    entry('e2', 'e', 'dropped'),
  ];
  const of = (spec) => arcs(catalog).find((a) => a.ref === `docs/specs/${spec}.md`);

  it('is done when only dropped steps are left', () => {
    expect(of('a')).toMatchObject({ state: 'done', shipped: 1, counted: 1, total: 2 });
  });

  it('is done when only replaced steps are left', () => {
    expect(of('b')).toMatchObject({ state: 'done', counted: 1 });
  });

  it('is parked when nothing is open but a shelved step', () => {
    expect(of('c')).toMatchObject({ state: 'parked', shipped: 0, counted: 1 });
  });

  it('is under way when something shipped and something is open', () => {
    expect(of('d')).toMatchObject({ state: 'under way', counted: 2 });
  });

  it('is not started when something is open and nothing shipped', () => {
    expect(of('e')).toMatchObject({ state: 'not started', counted: 1 });
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
      // The id is also in the page data, now that closed entries are listed; the line is not.
      expect(html.match(/<div id="readme">(.*?)<\/div>/s)[1]).not.toContain('kept&page');
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

  it('grooms: names groom, the four findings, and that nothing is applied without a yes', () => {
    const cmd = readFileSync(resolve(here, '../commands/refresh-board.md'), 'utf8');
    expect(cmd).toMatch(/\/refresh-board groom/);
    for (const finding of ['merge:', 'conflict:', 'bundle <name>:', 'close:']) expect(cmd).toContain(finding);
    expect(cmd).toMatch(/applies none without/);
    expect(cmd).toContain('Grooming: nothing to propose.');
  });
});

describe('backlog board bundles', () => {
  const bands = `open-a:
  band: A
  value: 4
  effort: 2
  bundle: pair
open-b:
  band: B
  value: 3
  effort: 3
  bundle: pair
waiting:
  band: B
  value: 2
  effort: 2
  bundle: alone
`;
  let dir;
  let run;
  beforeAll(() => {
    dir = stage(CLOSED_CATALOG, bands);
    run = build(dir);
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('gives the page each row\'s bundle name, and the template draws it as a tag', () => {
    const html = page(dir);
    const anno = grab(html, 'ANNO');
    expect(anno['open-a'].bn).toBe('pair');
    expect(anno['open-b'].bn).toBe('pair');
    expect(html).toContain("'<span class=\"tag tag-bundle\">bundle '+esc(e.bn)");
  });

  it('reports a bundle with one row left', () => {
    expect(run.stdout).toContain('bundle alone has one entry — remove the field:\n  - waiting\n');
    expect(run.stdout).not.toContain('bundle pair has one entry');
  });
});
