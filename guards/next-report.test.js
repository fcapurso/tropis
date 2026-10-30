// Level: unit
/**
 * The backlog report shows the work before any summary of it.
 *
 * Arc progress spans the whole backlog. Printed above the ready list, it pushed the work
 * an agent is asking about further down the screen. This runs the shipped
 * next.mjs, installed at .tropis/scripts/, against a two-entry catalog and checks the
 * order of its sections.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, symlinkSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shipped = resolve(here, '../scripts');

const HEADER_ONLY_BANDS = `# Bands and verdicts, with no rows yet.
# A header-only file is not a set of bands.
`;

const UNCHANGED_CATALOG = `- id: shipped-step
  title: Shipped step
  status: shipped
  type: feature
  layer: product
  value: Done.
  acceptanceCriteria:
    - Done.
  modules: []
  refs:
    - docs/specs/arc-design.md
- id: ready-step
  title: Ready step
  status: shaped
  type: feature
  layer: product
  value: Next.
  acceptanceCriteria:
    - Next.
  modules: []
  refs:
    - docs/specs/arc-design.md
- id: blocked-step
  title: Blocked step
  status: shaped
  type: feature
  layer: product
  value: Waiting.
  acceptanceCriteria:
    - Waiting.
  modules: []
  blockedBy:
    - not-shipped
  refs: []
- id: not-shipped
  title: Not shipped
  status: idea
  type: feature
  layer: product
  value: Later.
  acceptanceCriteria: []
  modules: []
  refs: []
`;

function stageReport(catalog, bands, queue) {
  const dir = mkdtempSync(join(tmpdir(), 'next-report-'));
  const fw = join(dir, '.tropis');
  mkdirSync(join(fw, 'scripts'), { recursive: true });
  for (const file of ['next.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js']) {
    copyFileSync(join(shipped, file), join(fw, 'scripts', file));
  }
  writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
  writeFileSync(join(dir, 'feature-catalog.yaml'), catalog);
  if (bands !== undefined) {
    mkdirSync(join(dir, 'docs/backlog-board'), { recursive: true });
    writeFileSync(join(dir, 'docs/backlog-board/bands.yaml'), bands);
  }
  if (queue !== undefined) {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(join(dir, 'docs/BLUEPRINT-UPSTREAM.md'), queue);
  }
  symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));
  const run = spawnSync('node', [join(fw, 'scripts/next.mjs')], { cwd: dir, encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return run;
}

// One arc, half done: the shipped entry and the shaped one share a spec.
const CATALOG = `- id: first-step
  title: First step
  status: shipped
  type: feature
  layer: product
  value: Something a person can now do.
  acceptanceCriteria:
    - It can be done.
  modules:
    - CLAUDE.md
  refs:
    - docs/specs/example-design.md
- id: second-step
  title: Second step
  status: shaped
  type: feature
  layer: product
  value: Something a person will be able to do.
  acceptanceCriteria:
    - It can be done.
  modules: []
  refs:
    - docs/specs/example-design.md
`;

const RETIRED_LAYER_CATALOG = `- id: retired-step
  title: Retired step
  status: shaped
  type: feature
  layer: blueprint
  value: Work recorded on the retired layer.
  acceptanceCriteria:
    - It remains counted but is not offered.
  modules: []
  refs: []
- id: product-step
  title: Product step
  status: shaped
  type: feature
  layer: product
  value: Work that can be started.
  acceptanceCriteria:
    - It appears as ready.
  modules: []
  refs: []
`;

describe('backlog report', () => {
  it('prints arc progress after the work, not before it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'next-report-'));
    try {
      const fw = join(dir, '.tropis');
      mkdirSync(join(fw, 'scripts'), { recursive: true });
      for (const file of ['next.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js']) {
        copyFileSync(join(shipped, file), join(fw, 'scripts', file));
      }
      writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
      writeFileSync(join(dir, 'feature-catalog.yaml'), CATALOG);
      symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));

      const run = (cwd) => spawnSync('node', [join(fw, 'scripts/next.mjs')], { cwd, encoding: 'utf8' });
      const { stdout, stderr } = run(dir);
      // `npm --prefix .tropis run next` runs it with .tropis/ as the working
      // directory; the report must not depend on where it was started.
      expect(run(fw).stdout).toBe(stdout);
      expect(stderr).toBe('');
      const arc = stdout.indexOf('Arcs under way');
      expect(arc).toBeGreaterThan(-1);
      expect(arc).toBeGreaterThan(stdout.indexOf('Ready to start'));
      expect(arc).toBeGreaterThan(stdout.indexOf('Blocked'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts retired blueprint entries without offering them as work', () => {
    const dir = mkdtempSync(join(tmpdir(), 'next-report-'));
    try {
      const fw = join(dir, '.tropis');
      mkdirSync(join(fw, 'scripts'), { recursive: true });
      for (const file of ['next.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js']) {
        copyFileSync(join(shipped, file), join(fw, 'scripts', file));
      }
      writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
      writeFileSync(join(dir, 'feature-catalog.yaml'), RETIRED_LAYER_CATALOG);
      symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));

      const { stdout, stderr } = spawnSync('node', [join(fw, 'scripts/next.mjs')], {
        cwd: dir,
        encoding: 'utf8',
      });

      expect(stderr).toBe('');
      expect(stdout).toContain(
        '1 entry uses the retired layer "blueprint" — the catalog rule (Layers) says what to do with them.',
      );
      expect(stdout).toContain('  - [feature] product-step: Product step');
      expect(stdout).not.toContain('retired-step');
      expect(stdout).not.toContain('Retired step');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('prints no retired-layer notice when the catalog has no blueprint entries', () => {
    const dir = mkdtempSync(join(tmpdir(), 'next-report-'));
    try {
      const fw = join(dir, '.tropis');
      mkdirSync(join(fw, 'scripts'), { recursive: true });
      for (const file of ['next.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js']) {
        copyFileSync(join(shipped, file), join(fw, 'scripts', file));
      }
      writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
      writeFileSync(join(dir, 'feature-catalog.yaml'), CATALOG);
      symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));

      const { stdout, stderr } = spawnSync('node', [join(fw, 'scripts/next.mjs')], {
        cwd: dir,
        encoding: 'utf8',
      });

      expect(stderr).toBe('');
      expect(stdout).not.toContain('retired layer "blueprint"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts upstream queue entries, not their parts, and calls them entries', () => {
    const queue = `# Upstream queue

Last flushed: 2026-10-01

- 2026-10-02 — First purpose.
  - 2026-10-02 — A part of the first.
  - 2026-10-02 — Another part of the first.
- 2026-10-03 — Second purpose.
- 2026-10-04 — Third purpose.
`;
    const many = stageReport(CATALOG, undefined, queue);
    expect(many.stderr).toBe('');
    expect(many.stdout).toContain('Waiting in the upstream queue\n  3 entries; last flushed 2026-10-01\n');

    const one = stageReport(CATALOG, undefined, '- 2026-10-02 — Only purpose.\n  - 2026-10-02 — Its part.\n');
    expect(one.stderr).toBe('');
    expect(one.stdout).toContain('Waiting in the upstream queue\n  1 entry; no "Last flushed" date found\n');
  });

  // Captured from origin/main's next.mjs and next-work.js against UNCHANGED_CATALOG.
  // A project with no bands file, and one whose bands file is only a header, must
  // keep printing this byte for byte.
  const UNCHANGED_WITHOUT_BANDS = `Next step: ready-step (docs/specs/arc-design.md)

Building (catalog status)
  (none)

Ready to start
  - [feature] ready-step: Ready step — docs/specs/arc-design.md

Blocked
  - [feature] blocked-step: Blocked step
      waiting on: not-shipped

Arcs under way
  docs/specs/arc-design.md — 1 of 2 shipped
    ✓ shipped-step
      ready-step

1 idea(s) not yet shaped.
`;

  it('is unchanged without bands', () => {
    const none = stageReport(UNCHANGED_CATALOG);
    const header = stageReport(UNCHANGED_CATALOG, HEADER_ONLY_BANDS);
    expect(none.stderr).toBe('');
    expect(header.stderr).toBe('');
    expect(none.stdout).toBe(UNCHANGED_WITHOUT_BANDS);
    expect(header.stdout).toBe(UNCHANGED_WITHOUT_BANDS);
    expect(none.stdout).toBe(header.stdout);
  });

  it('suggests by band', () => {
    const catalog = `- id: earlier
  title: Earlier
  status: shaped
  type: feature
  layer: product
  value: First in the catalog.
  acceptanceCriteria:
    - It can start.
  modules: []
  refs: []
- id: later
  title: Later
  status: shaped
  type: feature
  layer: product
  value: Second in the catalog.
  acceptanceCriteria:
    - It can start.
  modules: []
  refs: []
`;
    const bands = `earlier:
  band: B
later:
  band: A
`;
    const { stdout, stderr } = stageReport(catalog, bands);
    expect(stderr).toBe('');
    expect(stdout).toContain('Next step: later — band A');
    const ready = stdout.slice(stdout.indexOf('Ready to start'), stdout.indexOf('Blocked'));
    expect(ready.indexOf('  - [A] [feature] later: Later')).toBeGreaterThan(-1);
    expect(ready.indexOf('  - [A] [feature] later: Later')).toBeLessThan(
      ready.indexOf('  - [B] [feature] earlier: Earlier'),
    );
  });

  it('suggests an entry in an arc under way first within a band', () => {
    const catalog = `- id: shipped-arc
  title: Shipped arc step
  status: shipped
  type: feature
  layer: product
  value: Done.
  acceptanceCriteria:
    - Done.
  modules: []
  refs:
    - docs/specs/arc-design.md
- id: plain
  title: Plain
  status: shaped
  type: feature
  layer: product
  value: Not in the arc.
  acceptanceCriteria:
    - It can start.
  modules: []
  refs: []
- id: in-arc
  title: In arc
  status: shaped
  type: feature
  layer: product
  value: The rest of the arc.
  acceptanceCriteria:
    - It can start.
  modules: []
  refs:
    - docs/specs/arc-design.md
`;
    const bands = `plain:
  band: B
in-arc:
  band: B
`;
    const { stdout, stderr } = stageReport(catalog, bands);
    expect(stderr).toBe('');
    expect(stdout).toContain('Next step: in-arc — band B');
    const ready = stdout.slice(stdout.indexOf('Ready to start'), stdout.indexOf('Blocked'));
    expect(ready.indexOf('  - [B] [feature] in-arc: In arc')).toBeGreaterThan(-1);
    expect(ready.indexOf('  - [B] [feature] in-arc: In arc')).toBeLessThan(
      ready.indexOf('  - [B] [feature] plain: Plain'),
    );
  });

  const shapedEntry = (id, title, extra = '') => `- id: ${id}
  title: ${title}
  status: shaped
  type: feature
  layer: product
  value: ${title}.
  acceptanceCriteria:
    - It can start.
  modules: []
  refs: []
${extra}`;
  const readySection = (stdout) => stdout.slice(stdout.indexOf('Ready to start'), stdout.indexOf('Blocked'));

  it('never suggests C or D', () => {
    const both = stageReport(
      shapedEntry('decide', 'Decide') + shapedEntry('leave', 'Leave'),
      'decide:\n  band: C\nleave:\n  band: D\n',
    );
    expect(both.stderr).toBe('');
    expect(both.stdout).toContain(
      'Next step: none — nothing ready is banded A or B; decide need a decision, not a plan.',
    );
    expect(both.stdout).toContain('  - [C] [feature] decide: Decide (needs a decision)');
    expect(both.stdout).toContain('  - [D] [feature] leave: Leave');
    expect(both.stdout).not.toContain('leave: Leave (needs a decision)');

    const onlyD = stageReport(shapedEntry('leave', 'Leave'), 'leave:\n  band: D\n');
    expect(onlyD.stderr).toBe('');
    expect(onlyD.stdout).toContain(
      'Next step: none — nothing ready is banded A or B; the rest is banded to leave for now.',
    );
  });

  it('counts an unbanded entry, and a letter outside A to D, as D', () => {
    const catalog = shapedEntry('unbanded', 'Unbanded')
      + shapedEntry('old', 'Old letter')
      + shapedEntry('next', 'Next');
    const { stdout, stderr } = stageReport(catalog, 'next:\n  band: B\nold:\n  band: E\n');
    expect(stderr).toBe('');
    expect(stdout).toContain('Next step: next — band B');
    const ready = readySection(stdout);
    expect(ready).toContain('  - [D] [feature] unbanded: Unbanded');
    expect(ready).toContain('  - [D] [feature] old: Old letter');
    expect(ready.indexOf('  - [B] [feature] next: Next')).toBeLessThan(
      ready.indexOf('  - [D] [feature] unbanded: Unbanded'),
    );
  });

  const scored = (band, value, effort) => `  band: ${band}\n  value: ${value}\n  effort: ${effort}\n`;

  it('ranks inside a band by value over effort, unscored last', () => {
    const catalog = shapedEntry('unscored', 'Unscored')
      + shapedEntry('big', 'Big')
      + shapedEntry('cheap', 'Cheap')
      + shapedEntry('bad-score', 'Bad score');
    const bands = `unscored:\n  band: B\n`
      + `big:\n${scored('B', 5, 5)}`
      + `cheap:\n${scored('B', 3, 1)}`
      + `bad-score:\n${scored('B', 9, 1)}`;
    const { stdout, stderr } = stageReport(catalog, bands);
    expect(stderr).toBe('');
    expect(stdout).toContain('Next step: cheap — band B');
    const ready = readySection(stdout);
    const at = (id) => ready.indexOf(`] ${id}:`);
    expect(at('cheap')).toBeLessThan(at('big'));
    expect(at('big')).toBeLessThan(at('unscored'));
    expect(at('big')).toBeLessThan(at('bad-score'));
    // Unranked entries keep the order ready() gave.
    expect(at('unscored')).toBeLessThan(at('bad-score'));
  });

  it('puts an arc under way ahead of an equal rank, and rank ahead of the arc', () => {
    const arc = `- id: shipped-arc
  title: Shipped arc step
  status: shipped
  type: feature
  layer: product
  value: Done.
  acceptanceCriteria:
    - Done.
  modules: []
  refs:
    - docs/specs/arc-design.md
`;
    const inArc = `- id: in-arc
  title: In arc
  status: shaped
  type: feature
  layer: product
  value: The rest.
  acceptanceCriteria:
    - It can start.
  modules: []
  refs:
    - docs/specs/arc-design.md
`;
    const catalog = arc + shapedEntry('plain', 'Plain') + inArc;
    const equal = stageReport(catalog, `plain:\n${scored('B', 3, 3)}in-arc:\n${scored('B', 2, 2)}`);
    expect(equal.stdout).toContain('Next step: in-arc — band B');
    const higher = stageReport(catalog, `plain:\n${scored('B', 4, 2)}in-arc:\n${scored('B', 2, 2)}`);
    expect(higher.stdout).toContain('Next step: plain — band B');
  });

  const WAITING = `  blockedBy:
    - gate
`;
  const gate = `- id: gate
  title: Gate
  status: idea
  type: feature
  layer: product
  value: The thing waited on.
  acceptanceCriteria: []
  modules: []
  refs: []
`;
  const waitingEntry = (id) => shapedEntry(id, id, '').replace('  refs: []\n', `  refs: []\n${WAITING}`);

  it('names the blocked entry that would sort ahead of the suggestion, and only that', () => {
    const catalog = gate + shapedEntry('now', 'Now') + waitingEntry('held') + waitingEntry('held-less');
    const ahead = stageReport(
      catalog,
      `now:\n${scored('B', 3, 3)}held:\n${scored('A', 5, 1)}held-less:\n${scored('B', 5, 1)}gate:\n  band: B\n`,
    );
    expect(ahead.stderr).toBe('');
    expect(ahead.stdout).toContain(
      'Next step: now — band B\n  Ahead of it, blocked: held — band A, waiting on gate\n',
    );

    const behind = stageReport(
      catalog,
      `now:\n${scored('A', 3, 3)}held:\n${scored('B', 5, 1)}gate:\n  band: B\n`,
    );
    expect(behind.stdout).not.toContain('blocked: held');
    expect(behind.stdout).not.toContain('Ahead of it');
  });

  it('names the rest of the suggestion\'s bundle, in band and rank order, right after Next step', () => {
    const catalog = gate + shapedEntry('now', 'Now') + shapedEntry('mate-b', 'Mate B')
      + shapedEntry('mate-a', 'Mate A') + shapedEntry('loner', 'Loner') + waitingEntry('held');
    const bundled = (band, v, e) => `${scored(band, v, e)}  bundle: pair\n`;
    const bands = `now:\n${bundled('A', 5, 1)}mate-b:\n${bundled('B', 3, 1)}mate-a:\n${bundled('B', 4, 1)}`
      + `held:\n${bundled('B', 1, 5)}loner:\n${scored('B', 5, 1)}gate:\n  band: B\n`;
    const { stdout, stderr } = stageReport(catalog, bands);
    expect(stderr).toBe('');
    expect(stdout).toContain('Next step: now — band A\n  With it, bundle pair: mate-a, mate-b, held\n');
  });

  it('prints no With it line when the suggestion has no bundle', () => {
    const catalog = shapedEntry('now', 'Now') + shapedEntry('other', 'Other');
    const bands = `now:\n${scored('A', 5, 1)}other:\n${scored('B', 3, 1)}  bundle: solo\n`;
    const { stdout } = stageReport(catalog, bands);
    expect(stdout).toContain('Next step: now — band A');
    expect(stdout).not.toContain('With it');
  });

  it('names the highest blocked A or B entry when nothing is suggested', () => {
    const catalog = gate + shapedEntry('left', 'Left') + waitingEntry('held') + waitingEntry('decide');
    const named = stageReport(
      catalog,
      `left:\n  band: D\nheld:\n${scored('B', 4, 2)}decide:\n  band: C\n`,
    );
    expect(named.stdout).toContain(
      'Next step: none — nothing ready is banded A or B; the rest is banded to leave for now.\n  Highest blocked: held — band B, waiting on gate\n',
    );
    const none = stageReport(catalog, `left:\n  band: D\ndecide:\n  band: C\nheld:\n  band: C\n`);
    expect(none.stdout).not.toContain('Highest blocked');
  });

  // The refresh point has to be an ancestor: a commit cannot contain its own hash.
  // The first commit holds the shaped catalog; the next records that hash; the last ships.
  // `settings`, when given, rewrites docs/readme/readme.yaml after the last commit, to
  // stage a refresh point or a file the reader must survive.
  function stageShippedSince(level, settings) {
    const dir = mkdtempSync(join(tmpdir(), 'next-readme-'));
    try {
    const fw = join(dir, '.tropis');
    mkdirSync(join(fw, 'scripts'), { recursive: true });
    for (const file of ['next.mjs', 'next-work.js', 'board-bands.js', 'readme-freshness.js']) {
      copyFileSync(join(shipped, file), join(fw, 'scripts', file));
    }
    writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
    symlinkSync(resolve(here, '../node_modules'), join(fw, 'node_modules'));
    const catalog = `- id: kept-page
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
    mkdirSync(join(dir, 'docs/readme'), { recursive: true });
    writeFileSync(join(dir, 'feature-catalog.yaml'), catalog);
    writeFileSync(join(dir, 'docs/readme/readme.yaml'), `level: ${level}\nrefreshedAt: ""\n`);
    const git = (args) => {
      const run = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
      if (run.status !== 0) throw new Error(run.stderr || run.stdout);
      return run.stdout.trim();
    };
    git(['init', '-q']);
    git(['add', '.']);
    git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'refresh point']);
    const hash = git(['rev-parse', 'HEAD']);
    writeFileSync(join(dir, 'docs/readme/readme.yaml'), `level: ${level}\nrefreshedAt: "${hash}"\n`);
    git(['add', 'docs/readme/readme.yaml']);
    git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'record the refresh point']);
    writeFileSync(join(dir, 'feature-catalog.yaml'), catalog.replace('status: shaped', 'status: shipped'));
    git(['add', 'feature-catalog.yaml']);
    git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'ship kept-page']);
    if (settings) writeFileSync(join(dir, 'docs/readme/readme.yaml'), settings({ dir, git, hash }));
    const run = spawnSync('node', [join(fw, 'scripts/next.mjs')], { cwd: dir, encoding: 'utf8' });
    // Checked before the folder is removed: git's --output writes relative to the project.
    return { ...run, pwned: existsSync(join(dir, 'pwned')) || existsSync(join(dir, 'pwned:feature-catalog.yaml')) };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it('names the product feature shipped since the README was refreshed', () => {
    const { stdout, stderr } = stageShippedSince('writes');
    expect(stderr).toBe('');
    expect(stdout).toContain('README');
    expect(stdout).toContain('1 shipped since: kept-page');
    expect(stdout.indexOf('\nREADME\n')).toBeGreaterThan(stdout.indexOf('Blocked'));
  });

  it('prints no README section when the level is manual', () => {
    const { stdout, stderr } = stageShippedSince('manual');
    expect(stderr).toBe('');
    expect(stdout).not.toMatch(/^README$/m);
    expect(stdout).not.toContain('shipped since');
  });

  // The settings file and the refresh point are data anyone can edit. None of these may
  // stop the report, and none may reach git as anything but a commit.
  it('reports a settings file it cannot parse instead of failing', () => {
    const { stdout, stderr, status } = stageShippedSince('writes', () => 'level: writes\nrefreshedAt: [\n');
    expect(status).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('docs/readme/readme.yaml cannot be read');
  });

  it.each([
    ['an option-shaped value, which git must never see', () => 'level: writes\nrefreshedAt: "--output=pwned"\n'],
    ['an unknown commit', () => 'level: writes\nrefreshedAt: "0123456789abcdef0123456789abcdef01234567"\n'],
    ['an unquoted number', () => 'level: writes\nrefreshedAt: 1234567\n'],
    ['a tree, not a commit', ({ git }) => `level: writes\nrefreshedAt: "${git(['rev-parse', 'HEAD^{tree}'])}"\n`],
  ])('says the refresh point was not found for %s', (_, settings) => {
    const { stdout, stderr, status } = stageShippedSince('writes', settings);
    expect(status).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toMatch(/README refresh point \S+ not found\. Run \/refresh-readme\./);
    expect(stdout).not.toContain('NaN');
  });

  it('never lets the refresh point write a file', () => {
    const { pwned } = stageShippedSince('writes', () => 'level: writes\nrefreshedAt: "--output=pwned"\n');
    expect(pwned).toBe(false);
  });

  it('says the refresh point was not found when the catalog there does not parse', () => {
    const { stdout, stderr, status } = stageShippedSince('writes', ({ dir, git }) => {
      writeFileSync(join(dir, 'feature-catalog.yaml'), '- id: [\n');
      git(['add', 'feature-catalog.yaml']);
      git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'broken catalog']);
      const broken = git(['rev-parse', 'HEAD']);
      git(['checkout', '-q', 'HEAD~1', '--', 'feature-catalog.yaml']);
      return `level: writes\nrefreshedAt: "${broken}"\n`;
    });
    expect(status).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('not found. Run /refresh-readme.');
  });
});
