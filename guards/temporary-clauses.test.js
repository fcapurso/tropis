// Level: unit
/**
 * scripts/rule-claims.js: finding temporary clauses, reading assertion names, and the
 * message temporary() gives once the defect it waits on is fixed.
 *
 * Builds throwaway trees; not installed. Its name keeps clear of the conformance table's
 * `rule-claims` fragment, which would otherwise run it for that guard's cases.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { temporaryClauses, assertionNames, temporary } from '../scripts/rule-claims.js';

function tree(files) {
  const dir = mkdtempSync(join(tmpdir(), 'rule-claims-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

const CLAUSE = 'Every call sets a timeout. The client does not yet.\n'
  + 'Temporary — until api-sets-timeouts. Asserted by rule-claims › api calls lack a\n'
  + 'timeout.\n';

describe('temporaryClauses', () => {
  it('finds a marker wrapped across lines, and names the rule file', () => {
    const dir = tree({ '.claude/rules/api.md': `# API\n\n${CLAUSE}` });
    try {
      expect(temporaryClauses(dir)).toEqual([
        { file: '.claude/rules/api.md', id: 'api-sets-timeouts', name: 'api calls lack a timeout' },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('names the additions file when the clause is written there', () => {
    const dir = tree({
      '.claude/rules/tests.md': `# Tests\n\nShipped text.\n\n${CLAUSE}`,
      '.claude/rule-additions/tests.md': CLAUSE,
    });
    try {
      expect(temporaryClauses(dir).map((c) => c.file)).toEqual(['.claude/rule-additions/tests.md']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ignores the marker written with placeholders, as the learnings rule shows it', () => {
    const dir = tree({
      '.claude/rules/learnings.md': '`Temporary — until <id>. Asserted by rule-claims › <name>.`\n',
    });
    try {
      expect(temporaryClauses(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('finds nothing in a project with no rules folder', () => {
    const dir = tree({});
    try {
      expect(temporaryClauses(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('assertionNames', () => {
  it('reads each quoted name, and not a placeholder', () => {
    const text = "temporary('one', () => {});\ntemporary(\n  \"two\", () => {});\n// temporary(<name>, …)\n";
    expect(assertionNames(text)).toEqual(['one', 'two']);
  });
});

describe('temporary', () => {
  /** Registers through a stand-in and returns the check it was given. */
  const captured = (name, fn, root) => {
    let check;
    temporary(name, fn, { register: (_, f) => { check = f; }, root });
    return check;
  };

  it('passes while the defect is still there', async () => {
    await expect(captured('api calls lack a timeout', () => {}, tmpdir())()).resolves.toBeUndefined();
  });

  it('says which paragraph to delete once the defect is fixed', async () => {
    const dir = tree({ '.claude/rules/api.md': CLAUSE });
    try {
      const check = captured('api calls lack a timeout', () => { throw new Error('fixed'); }, dir);
      await expect(check()).rejects.toThrow(
        'The defect "api calls lack a timeout" waits on is fixed. Delete the paragraph marked '
        + '"Temporary — until api-sets-timeouts" in .claude/rules/api.md, then delete this assertion.',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('says so when no rule carries the clause', async () => {
    const dir = tree({});
    try {
      const check = captured('gone', () => { throw new Error('fixed'); }, dir);
      await expect(check()).rejects.toThrow('no rule in .claude/rules/ carries "Asserted by rule-claims › gone."');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
