// Level: unit
/**
 * Backs the level criteria of product-readme-is-kept-current that live in command
 * and release text. Whitespace is collapsed so re-wrapping the markdown does not
 * fail the check.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(here, rel), 'utf8');
const flat = (text) => text.replace(/\s+/g, ' ');

describe('how a project chooses the README level', () => {
  const bootstrap = read('../commands/bootstrap.md');
  const stageAt = bootstrap.indexOf('## Stage 3a — Choose how Tropis keeps the README');
  const stage = flat(bootstrap.slice(stageAt, bootstrap.indexOf('## Stage 4', stageAt)));

  it('asks in Stage 3a', () => {
    expect(stageAt).toBeGreaterThanOrEqual(0);
  });

  it.each([
    ['Then run `/refresh-readme <level>`'],
    ['Recommend `writes` when the project had no `README.md`'],
    ['`suggests` when it had one'],
  ])('that stage contains %s', (phrase) => {
    expect(stage).toContain(phrase);
  });

  const refresh = read('../commands/refresh-readme.md');
  const levelAt = refresh.indexOf('**`/refresh-readme writes`');
  const level = flat(refresh.slice(levelAt, refresh.indexOf('**`/refresh-readme skeleton`', levelAt)));

  it.each([
    ['Commit that one file only'],
    ['Do not refresh'],
  ])('the level option contains %s', (phrase) => {
    expect(levelAt).toBeGreaterThanOrEqual(0);
    expect(level).toContain(phrase);
  });

  const notes = read('../RELEASES.md');
  // /release rewrites these notes and the release job moves them from [Unreleased] under a
  // version, so the test pins the behaviour, not the wording or the section: in the newest
  // section that carries it, a numbered by-hand step asks for a README level with
  // /refresh-readme, and /update performs it because its bold lead is not marked Optional
  // (FW-023).
  const handSteps = (section) => {
    const handAt = section.indexOf('### After updating: what to do by hand');
    if (handAt < 0) return [];
    const hand = flat(section.slice(handAt, section.indexOf('\n### ', handAt + 1)));
    return hand.split(/(?=\*\*\d+\. )/).filter((s) => /^\*\*\d+\. /.test(s));
  };
  const readmeStep = notes
    .split(/^(?=## \[)/m)
    .flatMap(handSteps)
    .find((s) => s.includes('/refresh-readme writes'));

  it('the first update asks once, in a step /update performs', () => {
    expect(readmeStep).toBeDefined();
    expect(readmeStep).toMatch(/\/refresh-readme suggests/);
    expect(readmeStep).toMatch(/\/refresh-readme manual/);
    expect(readmeStep).not.toMatch(/^\*\*\d+\. Optional:/);
  });
});
