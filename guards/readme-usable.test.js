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

  it('both README outlines list requirements once, under What it needs', () => {
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
});
