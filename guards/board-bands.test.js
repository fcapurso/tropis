// Level: unit
/**
 * The judgment layer's memory: what a band recorded about its entry when the verdict
 * was written, whether the entry has moved since, and the one action that brings every
 * record up to date. Text-level on purpose — bands.yaml carries comments and
 * hand-wrapped prose that must survive a stamp untouched.
 */
import { movedBands, openBlockers, stampBands, bandLetters, bandScores, bandBundles } from '../scripts/board-bands.js';

const catalog = [
  { id: 'gate', status: 'shipped' },
  { id: 'spike', status: 'shaped' },
  { id: 'rule', status: 'shaped', blockedBy: ['spike', 'gate'] },
  { id: 'panel', status: 'building' },
  { id: 'idea', status: 'idea' },
];

describe('openBlockers', () => {
  it('keeps only blockers that have not shipped, sorted', () => {
    expect(openBlockers(catalog[2], catalog)).toEqual(['spike']);
    expect(openBlockers(catalog[3], catalog)).toEqual([]);
  });
});

describe('movedBands', () => {
  it('nothing is moved when the catalog matches every record', () => {
    const bands = {
      rule: { band: 'B', seen: { status: 'shaped', blockers: ['spike'] } },
      panel: { band: 'A', seen: { status: 'building', blockers: [] } },
    };
    expect(movedBands(catalog, bands)).toEqual([]);
  });

  it('reports a status change', () => {
    const bands = { panel: { band: 'A', seen: { status: 'shaped', blockers: [] } } };
    expect(movedBands(catalog, bands)).toEqual([{ id: 'panel', reason: 'status shaped → building' }]);
  });

  it('reports a blocker that has shipped', () => {
    const bands = { rule: { band: 'B', seen: { status: 'shaped', blockers: ['gate', 'spike'] } } };
    expect(movedBands(catalog, bands)).toEqual([{ id: 'rule', reason: 'blocker gate shipped' }]);
  });

  it('reports a blocker that was not there', () => {
    const bands = { rule: { band: 'B', seen: { status: 'shaped', blockers: [] } } };
    expect(movedBands(catalog, bands)).toEqual([{ id: 'rule', reason: 'blocker spike added' }]);
  });

  it('joins several reasons and reports them in bands order', () => {
    const bands = {
      rule: { band: 'B', seen: { status: 'idea', blockers: ['gate'] } },
      idea: { band: 'E', seen: { status: 'idea', blockers: [] } },
      panel: { band: 'A', seen: { status: 'shaped', blockers: [] } },
    };
    expect(movedBands(catalog, bands)).toEqual([
      { id: 'rule', reason: 'status idea → shaped; blocker gate shipped; blocker spike added' },
      { id: 'panel', reason: 'status shaped → building' },
    ]);
  });

  it('reports a band that was never stamped', () => {
    const bands = { idea: { band: 'E' } };
    expect(movedBands(catalog, bands)).toEqual([{ id: 'idea', reason: 'never stamped' }]);
  });

  it('ignores a band whose entry has shipped or gone — those are reported as stale elsewhere', () => {
    const bands = { gate: { band: 'A' }, vanished: { band: 'C' } };
    expect(movedBands(catalog, bands)).toEqual([]);
  });

  it('ignores a band whose entry is replaced or shelved — the build reports it as stale', () => {
    const closed = [
      { id: 'old', status: 'shaped', supersededBy: ['new'] },
      { id: 'parked', status: 'shaped', shelved: true },
    ];
    const bands = { old: { band: 'B' }, parked: { band: 'B' } };
    expect(movedBands(closed, bands)).toEqual([]);
  });
});

describe('stampBands', () => {
  const text = `# header comment
# second line

idea:
  band: E
  verdict: Leave it.
panel:
  band: A
  value: 5
  valueWhy: "Blocks the release."
  effort: 2
  effortWhy: "One screen."
  verdict: Do it now, because the last release
    shipped without it.
  evidence: "Checked 2026-09-01 — the panel is not wired."
rule:
  band: B
  verdict: Waits on the spike.
  seen:
    status: idea
    blockers: []
vanished:
  band: C
  verdict: Its entry is gone; the build says delete this row.
`;

  it('stampBands writes seen on every row and leaves everything else byte for byte', () => {
    const out = stampBands(text, catalog);
    expect(out).toBe(`# header comment
# second line

idea:
  band: E
  verdict: Leave it.
  seen:
    status: idea
    blockers: []
panel:
  band: A
  value: 5
  valueWhy: "Blocks the release."
  effort: 2
  effortWhy: "One screen."
  verdict: Do it now, because the last release
    shipped without it.
  evidence: "Checked 2026-09-01 — the panel is not wired."
  seen:
    status: building
    blockers: []
rule:
  band: B
  verdict: Waits on the spike.
  seen:
    status: shaped
    blockers: [spike]
vanished:
  band: C
  verdict: Its entry is gone; the build says delete this row.
`);
  });

  it('stampBands replaces an existing seen block', () => {
    const out = stampBands(text, catalog);
    expect(out.match(/^  seen:$/gm)).toHaveLength(3);
    expect(out).not.toContain('status: idea\n    blockers: []\nvanished');
  });

  it('is idempotent', () => {
    const once = stampBands(text, catalog);
    expect(stampBands(once, catalog)).toBe(once);
  });

  it('a stamped band is not moved', () => {
    // The two halves agree on the shape: what stamp writes is what moved reads.
    const stamped = stampBands(text, catalog);
    const bands = {};
    for (const m of stamped.matchAll(/^([a-z-]+):\n(?:  .*\n)*?  seen:\n    status: (\S+)\n    blockers: \[([^\]]*)\]\n/gm)) {
      bands[m[1]] = { band: 'X', seen: { status: m[2], blockers: m[3] ? m[3].split(', ') : [] } };
    }
    expect(Object.keys(bands).sort()).toEqual(['idea', 'panel', 'rule']);
    expect(movedBands(catalog, bands)).toEqual([]);
  });

  it('leaves a row whose entry is gone untouched, even its stale seen', () => {
    const withSeen = text.replace(
      'verdict: Its entry is gone; the build says delete this row.\n',
      'verdict: Its entry is gone; the build says delete this row.\n  seen:\n    status: shaped\n    blockers: []\n',
    );
    const out = stampBands(withSeen, catalog);
    expect(out.endsWith('vanished:\n  band: C\n  verdict: Its entry is gone; the build says delete this row.\n  seen:\n    status: shaped\n    blockers: []\n')).toBe(true);
  });
});

describe('bandLetters', () => {
  it('keeps only the letter from each bands.yaml row', () => {
    const rows = {
      a: { band: 'A', verdict: 'Do it.', seen: { status: 'shaped', blockers: [] } },
      b: { band: 'D', verdict: 'Decide.' },
    };
    expect(bandLetters(rows)).toEqual({ a: 'A', b: 'D' });
  });

  it('returns an empty map for an empty or missing file', () => {
    expect(bandLetters(null)).toEqual({});
    expect(bandLetters({})).toEqual({});
  });
});

describe('bandScores', () => {
  it('keeps rows with both scores as integers from 1 to 5', () => {
    const rows = {
      ok: { band: 'A', value: 4, effort: 2 },
      low: { band: 'A', value: 1, effort: 5 },
      noEffort: { band: 'A', value: 4 },
      zero: { band: 'A', value: 0, effort: 2 },
      big: { band: 'A', value: 3, effort: 6 },
      half: { band: 'A', value: 2.5, effort: 2 },
      text: { band: 'A', value: '4', effort: 2 },
    };
    expect(bandScores(rows)).toEqual({ ok: { value: 4, effort: 2 }, low: { value: 1, effort: 5 } });
  });

  it('is empty for no rows', () => {
    expect(bandScores(null)).toEqual({});
    expect(bandScores({})).toEqual({});
  });
});

describe('bandBundles', () => {
  it('maps ids to bundle names, only for rows that carry one', () => {
    const rows = {
      a: { band: 'A', bundle: 'release-gate' },
      b: { band: 'B', bundle: 'release-gate' },
      c: { band: 'B' },
      d: { band: 'B', bundle: '' },
      e: { band: 'B', bundle: 7 },
    };
    expect(bandBundles(rows)).toEqual({ a: 'release-gate', b: 'release-gate' });
  });

  it('is empty for no rows', () => {
    expect(bandBundles(null)).toEqual({});
    expect(bandBundles({})).toEqual({});
  });

  it('survives a stamp, byte for byte', () => {
    const text = 'panel:\n  band: A\n  effortWhy: "One screen."\n  bundle: release-gate\n  verdict: Do it.\n';
    const out = stampBands(text, [{ id: 'panel', status: 'building' }]);
    expect(out).toBe(`${text.trimEnd()}\n  seen:\n    status: building\n    blockers: []\n`);
  });
});
