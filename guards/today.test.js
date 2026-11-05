// Level: unit
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { plansDatedAfter, projectTimeZone, projectToday, todayIn } from '../scripts/today.js';

const here = dirname(fileURLToPath(import.meta.url));
const script = pathToFileURL(resolve(here, '../scripts/today.js')).href;

// 2026-11-05 at 23:30 UTC: already the 6th in Rome, still the 5th in UTC.
const LATE = new Date('2026-11-05T23:30:00Z');

/** A project root whose .tropis/project.json holds `text`, or none when undefined. */
function project(text) {
  const root = mkdtempSync(join(tmpdir(), 'today-'));
  mkdirSync(join(root, '.tropis'));
  if (text !== undefined) writeFileSync(join(root, '.tropis', 'project.json'), text);
  return root;
}

describe('todayIn', () => {
  it('is the UTC date when no zone is named', () => {
    expect(todayIn(undefined, LATE)).toBe('2026-11-05');
  });

  it('is the date in the named zone', () => {
    expect(todayIn('Europe/Rome', LATE)).toBe('2026-11-06');
    expect(todayIn('America/Los_Angeles', LATE)).toBe('2026-11-05');
    expect(todayIn('America/Los_Angeles', new Date('2026-11-05T03:00:00Z'))).toBe('2026-11-04');
  });

  it('gives the same answer whatever the machine clock zone and locale', () => {
    const code = `import { todayIn } from ${JSON.stringify(script)};
const at = new Date('2026-11-05T23:30:00Z');
process.stdout.write(todayIn('Europe/Rome', at) + ' ' + todayIn(undefined, at));`;
    for (const [TZ, LANG] of [
      ['Pacific/Kiritimati', 'ar_EG.UTF-8'],
      ['America/Adak', 'th_TH.UTF-8'],
      ['UTC', 'C'],
    ]) {
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        env: { ...process.env, TZ, LANG, LC_ALL: LANG },
        encoding: 'utf8',
      });
      expect(r.stderr).toBe('');
      expect(`${TZ} ${r.stdout}`).toBe(`${TZ} 2026-11-06 2026-11-05`);
    }
  });
});

describe('projectTimeZone', () => {
  const roots = [];
  const at = (text) => {
    const root = project(text);
    roots.push(root);
    return root;
  };
  afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

  it('is UTC with no settings file, no key, or a file that is not JSON', () => {
    expect(projectTimeZone(at(undefined))).toBe('UTC');
    expect(projectTimeZone(at('{ "name": "Example" }'))).toBe('UTC');
    expect(projectTimeZone(at('not json'))).toBe('UTC');
  });

  it('is the zone the settings file names', () => {
    expect(projectTimeZone(at('{ "timeZone": "Asia/Tokyo" }'))).toBe('Asia/Tokyo');
  });

  it('refuses a name that is not a time zone, naming the file and the key', () => {
    for (const bad of ['"Mars/Olympus_Mons"', '""', '5']) {
      expect(() => projectTimeZone(at(`{ "timeZone": ${bad} }`))).toThrow(
        /\.tropis\/project\.json: "timeZone" must be an IANA time zone/,
      );
    }
  });

  it('dates a plan written just after midnight in the zone ahead of UTC, and refuses one a day later', () => {
    // 11:00 UTC on the 5th is already the 6th in Kiritimati (UTC+14).
    const now = new Date('2026-11-05T11:00:00Z');
    const names = ['2026-11-05-a.md', '2026-11-06-b.md', '2026-11-07-c.md', 'notes.md'];
    const ahead = projectToday(at('{ "timeZone": "Pacific/Kiritimati" }'), now);
    expect(ahead).toBe('2026-11-06');
    expect(plansDatedAfter(names, ahead)).toEqual(['2026-11-07-c.md']);
    const utc = projectToday(at(undefined), now);
    expect(utc).toBe('2026-11-05');
    expect(plansDatedAfter(names, utc)).toEqual(['2026-11-06-b.md', '2026-11-07-c.md']);
  });
});
