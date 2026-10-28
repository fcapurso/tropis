// Level: unit
/** What the setup installed is where it put it. Copied to .tropis/guards/ by set-up-project.sh. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// .tropis/guards/, two levels below the project root.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('set-up project layout', () => {
  it('has the framework where the setup put it, and parseable settings', () => {
    const expected = [
      '.claude/framework/workflow.md',
      '.claude/settings.json',
      '.claude/rule-areas.json',
      '.tropis/rules/tests.md',
      'feature-catalog.yaml',
      '.tropis/scripts/next.mjs',
      '.tropis/hooks/hook-reply.sh',
    ];
    expect(expected.filter((p) => !existsSync(resolve(root, p)))).toEqual([]);
    JSON.parse(readFileSync(resolve(root, '.claude/settings.json'), 'utf8'));
  });
});
