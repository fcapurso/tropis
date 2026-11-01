// Level: unit
/**
 * Word counting, growth ranking, the rule-trials record format and the two
 * subcommands of the rule-trial script. The script is this repository's own and
 * is not shipped.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  wordCount, rankGrowth, parseRecord, recordProblems, triedFrom,
} from '../.github/scripts/rule-trial.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, '../.github/scripts/rule-trial.mjs');
const RECORD = join(HERE, '../docs/rule-trials.md');

const full = (heading, over = {}) => {
  const fields = {
    'Rule file': '`rules/planning.md`',
    Clause: '"A plan names the checkouts"',
    Task: 'Add a script.',
    'What the agent did': 'Read the file.',
    Outcome: 'kept',
    'Ran on': 'a tool 1.0, macOS arm64',
    ...over,
  };
  const lines = [`## ${heading}`, ''];
  for (const [k, v] of Object.entries(fields)) if (v !== null) lines.push(`- ${k}: ${v}`);
  return lines.join('\n');
};
const problems = (...entries) => recordProblems(parseRecord(entries.join('\n\n')));

describe('wordCount', () => {
  test('counts whitespace-separated tokens', () => {
    expect(wordCount('one  two\nthree\t four ')).toBe(4);
  });
  test('is zero for empty text', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('  \n ')).toBe(0);
  });
});

describe('rankGrowth', () => {
  test('orders by growth, then by file name, and counts an absent file from zero', () => {
    const ranked = rankGrowth([
      { file: 'rules/b.md', before: 2, after: 6 },
      { file: 'rules/a.md', before: 3, after: 3 },
      { file: 'rules/c.md', before: 0, after: 1 },
      { file: 'rules/d.md', before: 5, after: 9 },
    ]);
    expect(ranked.map((r) => [r.file, r.delta])).toEqual([
      ['rules/b.md', 4], ['rules/d.md', 4], ['rules/c.md', 1], ['rules/a.md', 0],
    ]);
  });
});

describe('the record', () => {
  test('a sound record has no problems', () => {
    const skipped = ['## Since v0.8.0', '', '- Outcome: skipped', '- Why: nothing grew'].join('\n');
    expect(problems(full('Since v0.9.0'), skipped)).toEqual([]);
  });

  test('a field continues on indented lines, and one clause line is counted', () => {
    const [entry] = parseRecord(full('Since v0.9.0', { Task: 'First half\n  second half' }));
    expect(entry.fields.Task).toBe('First half second half');
    expect(entry.clauses).toBe(1);
  });

  test('a fenced example is not an entry', () => {
    const text = ['# Rule trials', '', '```', full('Since v0.1.0'), '```', '', full('Since v0.2.0')].join('\n');
    expect(parseRecord(text).map((e) => e.heading)).toEqual(['Since v0.2.0']);
  });

  test('a heading names a release', () => {
    expect(problems(full('Later'))).toEqual([
      '"Later": a heading names the release the trial ran after, as "Since vX.Y.Z"',
    ]);
  });

  test('a heading may not appear twice', () => {
    expect(problems(full('Since v0.9.0'), full('Since v0.9.0', { Outcome: 'removed' })))
      .toContain('"Since v0.9.0" appears twice: one trial per release');
  });

  test('one clause per entry', () => {
    const two = `${full('Since v0.9.0')}\n- Clause: "another"`;
    expect(problems(two)).toEqual(['"Since v0.9.0" tries more than one clause: one per release']);
  });

  test('the outcome is one of four', () => {
    const msg = '"Since v0.9.0": Outcome must be kept, removed, inconclusive or skipped';
    expect(problems(full('Since v0.9.0', { Outcome: 'maybe' }))).toEqual([msg]);
    expect(problems(full('Since v0.9.0', { Outcome: null }))).toEqual([msg]);
  });

  test('a skipped trial needs its reason', () => {
    const entry = ['## Since v0.9.0', '', '- Outcome: skipped'].join('\n');
    expect(problems(entry)).toEqual(['"Since v0.9.0": missing Why']);
  });

  test('a tried entry needs every field', () => {
    expect(problems(full('Since v0.9.0', { Task: null }))).toEqual(['"Since v0.9.0": missing Task']);
    expect(problems(full('Since v0.9.0', { 'Ran on': '' }))).toEqual(['"Since v0.9.0": missing Ran on']);
  });

  test('a clause kept once is not tried again', () => {
    expect(problems(full('Since v0.8.0'), full('Since v0.9.0'))).toEqual([
      '"Since v0.9.0" tries again a clause kept at "Since v0.8.0"',
    ]);
    expect(problems(full('Since v0.8.0', { Outcome: 'inconclusive' }), full('Since v0.9.0'))).toEqual([]);
  });

  test('triedFrom strips backticks and leaves skipped entries out', () => {
    const entries = parseRecord([
      full('Since v0.8.0'),
      ['## Since v0.9.0', '', '- Outcome: skipped', '- Why: none grew'].join('\n'),
    ].join('\n\n'));
    expect(triedFrom(entries, 'rules/planning.md')).toEqual([
      { heading: 'Since v0.8.0', outcome: 'kept', clause: '"A plan names the checkouts"' },
    ]);
    expect(triedFrom(entries, 'rules/tests.md')).toEqual([]);
  });

  test('the committed record is sound', () => {
    expect(recordProblems(parseRecord(readFileSync(RECORD, 'utf8')))).toEqual([]);
  });
});

describe('the command line', () => {
  let dir;
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  };
  const run = (...args) => spawnSync('node', [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
  const commit = (msg) => { git('add', '-A'); git('commit', '-q', '-m', msg); };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'rule-trial-'));
    git('init', '-q');
    git('config', 'user.email', 't@example.test');
    git('config', 'user.name', 'T');
    git('config', 'commit.gpgsign', 'false');
    mkdirSync(join(dir, 'rules'));
    mkdirSync(join(dir, 'docs'));
    writeFileSync(join(dir, 'rules/a.md'), 'one two three\n');
    writeFileSync(join(dir, 'rules/b.md'), 'one two\n');
    writeFileSync(join(dir, 'docs/rule-trials.md'), '# Rule trials\n');
    commit('first');
    git('tag', 'v0.1.0');
    writeFileSync(join(dir, 'rules/b.md'), 'one two three four five six\n');
    writeFileSync(join(dir, 'rules/c.md'), 'one\n');
    commit('second');
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('growth lists files by growth and names what was tried before', () => {
    const r = run('growth', 'v0.1.0');
    expect(r.status).toBe(0);
    const out = r.stdout;
    expect(out.indexOf('rules/b.md')).toBeLessThan(out.indexOf('rules/c.md'));
    expect(out.indexOf('rules/c.md')).toBeLessThan(out.indexOf('rules/a.md'));
    expect(out).toMatch(/rules\/b\.md.*\+4/);
    expect(out).toMatch(/rules\/c\.md.*\+1/);
    expect(out).toMatch(/rules\/a\.md.*\+0/);
    expect(out).toContain('Nothing tried before from rules/b.md.');
  });

  test('growth refuses a tag that is not a commit', () => {
    const r = run('growth', 'v9.9.9');
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('v9.9.9 is not a commit here');
  });

  test('growth says to record a skipped trial when nothing grew', () => {
    git('tag', 'v0.2.0');
    const r = run('growth', 'v0.2.0');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('No rule file grew since v0.2.0: record a skipped trial.');
  });

  test('growth stops on a record with problems', () => {
    writeFileSync(join(dir, 'docs/rule-trials.md'), '## Later\n\n- Outcome: maybe\n');
    const r = run('growth', 'v0.1.0');
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('a heading names the release');
  });

  test('check reports a problem and exits 1', () => {
    const r = run('check');
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('"Later"');
  });

  test('check passes a sound record', () => {
    writeFileSync(join(dir, 'docs/rule-trials.md'), '# Rule trials\n');
    const r = run('check');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('rule-trials: 0 trials, no problems');
  });
});
