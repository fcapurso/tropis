// Level: unit
/**
 * Locks what this repository's README is guaranteed to keep when refreshed from docs/readme/skeleton.md.
 * It also checks that both README outlines, the default one and this repository's, list requirements once, under What it needs.
 *
 * Skips when the tree under test is not the blueprint (adopting projects and
 * conformance fixtures). Those trees either have a different README or none.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// Top-level guards/ in the blueprint repo (same as catalog-drift.test.js).
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '..');

function isBlueprintTree(dir) {
  return (
    existsSync(join(dir, 'bootstrap.md')) &&
    existsSync(join(dir, 'framework/workflow.md')) &&
    existsSync(join(dir, 'commands')) &&
    existsSync(join(dir, 'README.md'))
  );
}

const blueprint = isBlueprintTree(root);
const readme = blueprint ? readFileSync(join(root, 'README.md'), 'utf8') : '';

/** The skeleton's fixed passage: after `Fixed text:`, up to the next heading. */
function fixedText(skeleton) {
  const marker = 'Fixed text:\n';
  const at = skeleton.indexOf(marker);
  if (at < 0) throw new Error('docs/readme/skeleton.md has no Fixed text:');
  const rest = skeleton.slice(at + marker.length);
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).replace(/\s+$/, '');
}

describe('blueprint README usable', () => {
  if (!blueprint) {
    it('skips outside the blueprint tree', () => {
      // The self-check sets this where it runs this guard on the framework repository, so a
      // layout change that stops the tree being recognised fails instead of passing silently.
      expect(process.env.TROPIS_EXPECT_FRAMEWORK ?? '').toBe('');
      expect(blueprint).toBe(false);
    });
    return;
  }

  it('keeps the title and the fixed text under What is Tropis', () => {
    expect(readme.split('\n')[0]).toBe('# Tropis');
    const skeleton = readFileSync(join(root, 'docs/readme/skeleton.md'), 'utf8');
    const fixed = fixedText(skeleton);
    const headingAt = readme.indexOf('## What is Tropis?');
    expect(headingAt).toBeGreaterThanOrEqual(0);
    expect(readme.indexOf(fixed, headingAt)).toBeGreaterThan(headingAt);
    // The fixed text is the story of the name, approved word for word on 2026-10-15.
    expect(fixed.startsWith("Tropis is the word for the ship's keel")).toBe(true);
  });

  it('is kept at the writes level', () => {
    const settings = readFileSync(join(root, 'docs/readme/readme.yaml'), 'utf8');
    expect(settings).toMatch(/^level: writes\b/m);
  });

  it('every slash command named on the page exists under commands/', () => {
    const named = new Set();
    const re = /(?:^|[\s(`])\/([a-z][a-z0-9-]*)/gm;
    let m;
    while ((m = re.exec(readme)) !== null) named.add(m[1]);
    const missing = [...named].filter(
      (id) => !existsSync(join(root, 'commands', `${id}.md`)),
    );
    expect(missing).toEqual([]);
  });

  // The checks below that read What it needs, the aspects and Using it day to day hold
  // for the two open-source outlines: the default and this repository's. The closed-source
  // outline has none of those sections, and its own case follows them.
  it('both open-source README outlines list requirements once, under What it needs', () => {
    for (const path of ['templates/readme-skeleton.md', 'docs/readme/skeleton.md']) {
      const text = readFileSync(join(root, path), 'utf8');
      const sections = text.split(/^## /m).slice(1);
      const headings = sections.map((s) => s.split('\n')[0].trim());
      const body = (heading) => sections[headings.indexOf(heading)] ?? '';
      const at = headings.indexOf('What it needs');
      expect({ path, at: at > 0 }).toEqual({ path, at: true });
      expect({ path, before: headings[at - 1] }).toEqual({ path, before: 'Who it is for' });
      expect({ path, after: headings[at + 1] }).toEqual({ path, after: 'Getting started' });
      for (const line of ['- **Job:**', '- **Facts from:**', '- **Length:**']) {
        expect({ path, line, found: body('What it needs').includes(line) })
          .toEqual({ path, line, found: true });
      }
      for (const heading of ['Who it is for', 'Where it stands']) {
        const job = body(heading).split('\n').find((l) => l.startsWith('- **Job:**')) ?? '';
        expect({ path, heading, sends: job.includes('What it needs') })
          .toEqual({ path, heading, sends: true });
      }
    }
  });

  // Backs readme-gives-an-overview-not-a-feature-list: an overview in five to seven
  // aspects, and a page kept under the limit its skeleton sets.
  it('both open-source README outlines set a page length and five to seven aspects', () => {
    for (const path of ['templates/readme-skeleton.md', 'docs/readme/skeleton.md']) {
      const text = readFileSync(join(root, path), 'utf8');
      expect({ path, limit: /^\*\*Page length:\*\* at most [0-9,]+ words/m.test(text) })
        .toEqual({ path, limit: true });
      const section = text.split(/^## /m).find((s) => s.startsWith('What it does for you')) ?? '';
      expect({ path, length: section.includes('- **Length:** five to seven bullets.') })
        .toEqual({ path, length: true });
      expect({ path, single: section.includes('No bullet describes a single feature') })
        .toEqual({ path, single: true });
    }
  });

  // Backs readme-follows-the-developers-role: the outlines give Using it day to day the
  // reader's part, and this repository's page shows the sprint first and the developer's
  // steps only.
  const job = (text, heading) => {
    const section = text.split(/^## /m).find((s) => s.startsWith(`${heading}\n`)) ?? '';
    return (section.split('\n').find((l) => l.startsWith('- **Job:**')) ?? '').replace(/\s+/g, ' ');
  };

  it('the default outline gives Using it day to day the reader\'s part, not the commands they type', () => {
    const text = readFileSync(join(root, 'templates/readme-skeleton.md'), 'utf8');
    const line = job(text, 'Using it day to day');
    expect({ line, part: line.includes('the part they play') }).toEqual({ line, part: true });
    expect({ line, typed: line.includes('the commands they type') }).toEqual({ line, typed: false });
  });

  it('this repository\'s outline gives Using it day to day the developer\'s part, sprint first', () => {
    const text = readFileSync(join(root, 'docs/readme/skeleton.md'), 'utf8');
    const line = job(text, 'Using it day to day');
    for (const phrase of [
      'captures ideas',
      'agrees a sprint',
      'asks for a decision',
      'checks by hand',
      'releases',
      'from shaping to merged on their own',
      'A sprint is the main way to work',
      'the same path taken one at a time',
    ]) {
      expect({ phrase, found: line.includes(phrase) }).toEqual({ phrase, found: true });
    }
  });

  it('Using it day to day shows /sprint first and not /dispatch or /feature', () => {
    const at = readme.indexOf('## Using it day to day');
    expect(at).toBeGreaterThanOrEqual(0);
    const end = readme.indexOf('\n## ', at + 3);
    const section = readme.slice(at, end === -1 ? undefined : end);
    const commands = [...section.matchAll(/(?:^|[\s(`])\/([a-z][a-z0-9-]*)/gm)].map((m) => m[1]);
    expect({ first: commands[0] }).toEqual({ first: 'sprint' });
    expect({ dispatch: commands.includes('dispatch'), feature: commands.includes('feature') })
      .toEqual({ dispatch: false, feature: false });
  });

  // Backs readme-skeleton-for-closed-products.
  it('the closed-source outline has its sections in order, a page length, and no adopter sections', () => {
    const text = readFileSync(join(root, 'templates/readme-skeleton-closed.md'), 'utf8');
    const headings = text.split(/^## /m).slice(1).map((s) => s.split('\n')[0].trim());
    expect(headings).toEqual([
      'What it is',
      'Getting a working copy',
      'Environments and accounts',
      'How it works',
      'Changing and releasing it',
      'Limits and risks',
      'Where to go next',
    ]);
    expect(/^\*\*Page length:\*\* at most [0-9,]+ words/m.test(text)).toBe(true);
    for (const section of text.split(/^## /m).slice(1)) {
      for (const line of ['- **Job:**', '- **Facts from:**', '- **Length:**']) {
        expect({ section: section.split('\n')[0], line, found: section.includes(line) })
          .toEqual({ section: section.split('\n')[0], line, found: true });
      }
    }
  });

  it('each shipped skeleton names the reader it assumes and the other skeleton', () => {
    for (const [path, other] of [
      ['templates/readme-skeleton.md', 'readme-skeleton-closed.md'],
      ['templates/readme-skeleton-closed.md', 'readme-skeleton.md'],
    ]) {
      const header = readFileSync(join(root, path), 'utf8').split('-->')[0].replace(/\s+/g, ' ');
      expect({ path, reader: header.includes('The reader it assumes:') }).toEqual({ path, reader: true });
      expect({ path, other: header.includes(other) }).toEqual({ path, other: true });
    }
  });

  it('setup installs both skeletons', () => {
    const script = readFileSync(join(root, 'scripts/set-up-project.sh'), 'utf8');
    for (const t of ['templates/readme-skeleton.md', 'templates/readme-skeleton-closed.md']) {
      expect({ t, copied: script.includes(`"$BP"/${t}`) }).toEqual({ t, copied: true });
    }
  });

  it('What it does for you has five to seven bullets', () => {
    const at = readme.indexOf('## What it does for you');
    expect(at).toBeGreaterThanOrEqual(0);
    const section = readme.slice(at, readme.indexOf('\n## ', at + 3));
    const bullets = section.split('\n').filter((l) => l.startsWith('- ')).length;
    expect(bullets).toBeGreaterThanOrEqual(5);
    expect(bullets).toBeLessThanOrEqual(7);
  });

  it('the page is within the length its skeleton sets', () => {
    const skeleton = readFileSync(join(root, 'docs/readme/skeleton.md'), 'utf8');
    const limit = Number(skeleton.match(/^\*\*Page length:\*\* at most ([0-9,]+) words/m)[1].replace(/,/g, ''));
    const words = readme.split(/\s+/).filter(Boolean).length;
    expect({ words, within: words <= limit }).toEqual({ words, within: true });
  });

  it('/refresh-readme folds rather than adds, keeps the page under its limit, and says what it cut', () => {
    const command = readFileSync(join(root, 'commands/refresh-readme.md'), 'utf8').replace(/\s+/g, ' ');
    for (const phrase of [
      'Replace and fold; do not only add.',
      'keeps that many',
      'Then keep the page under its limit.',
      'cut until it is under',
      'Never cut `Fixed text:`',
      'what you cut to stay under it',
      'limits the page to 1,200 words',
      'and the page\'s word count against its limit',
    ]) {
      expect({ phrase, found: command.includes(phrase) }).toEqual({ phrase, found: true });
    }
  });
});
