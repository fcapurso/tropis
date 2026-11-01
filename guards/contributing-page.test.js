// Level: unit
/**
 * Locks CONTRIBUTING.md to the repository: every path and command the page names exists,
 * and its sentence about pull requests from forks matches whether pipeline.yml runs on
 * pull_request.
 *
 * Skips when the tree under test is not the framework repository (adopting projects and
 * conformance fixtures have no such page).
 */
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '..');

function isBlueprintTree(dir) {
  return (
    existsSync(join(dir, 'bootstrap.md')) &&
    existsSync(join(dir, 'PORTABILITY-NOTES.md')) &&
    existsSync(join(dir, 'commands')) &&
    existsSync(join(dir, 'README.md'))
  );
}

// Paths a project has and this repository does not.
const PROJECT_ONLY = ['docs/BLUEPRINT-UPSTREAM.md'];
// Commands that exist only in this repository's installed .claude/, with the file that stands in for them.
const REPOSITORY_ONLY_COMMANDS = { 'absorb-flush': '.github/scripts/absorb-flush.mjs' };

const WITH_TRIGGER = 'A pull request from a fork runs the pipeline once the maintainer approves the run.';
const WITHOUT_TRIGGER = 'A pull request from a fork gets no CI run yet.';

/** The source path behind a path as the installed release names it. */
function resolveInstalled(path) {
  const map = [
    ['.claude/rules/', 'rules/'],
    ['.claude/framework/', 'framework/'],
    ['.claude/commands/', 'commands/'],
    ['.tropis/scripts/', 'scripts/'],
    ['.tropis/hooks/', 'scripts/'],
  ];
  if (path === '.tropis/README.md') return 'templates/README.md';
  for (const [from, to] of map) if (path.startsWith(from)) return to + path.slice(from.length);
  return path;
}

function problems(dir) {
  const pagePath = join(dir, 'CONTRIBUTING.md');
  if (!existsSync(pagePath)) return ['CONTRIBUTING.md is missing'];
  const page = readFileSync(pagePath, 'utf8');
  const found = [];
  const spans = [...page.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
  for (const span of spans) {
    const cmd = /^\/[a-z][a-z-]*$/.exec(span.split(/\s+/)[0]);
    if (cmd) {
      const name = cmd[0].slice(1);
      const stand = REPOSITORY_ONLY_COMMANDS[name];
      const ok = existsSync(join(dir, 'commands', `${name}.md`)) || (stand && existsSync(join(dir, stand)));
      if (!ok) found.push(`names /${name}, which is not a command`);
    }
    for (const word of span.split(/\s+/)) {
      if (/[*<>{}]/.test(word) || word.startsWith('/') || word.startsWith('-')) continue;
      if (!(word.includes('/') || /\.(md|js|mjs|sh|yml|yaml|json)$/.test(word))) continue;
      const path = word.replace(/\/$/, '');
      if (PROJECT_ONLY.includes(path)) continue;
      if (!existsSync(join(dir, resolveInstalled(path)))) found.push(`names ${path}, which does not exist`);
    }
  }
  const workflow = join(dir, '.github/workflows/pipeline.yml');
  const trigger = existsSync(workflow) && /^\s+pull_request:/m.test(readFileSync(workflow, 'utf8'));
  const [expected, other] = trigger ? [WITH_TRIGGER, WITHOUT_TRIGGER] : [WITHOUT_TRIGGER, WITH_TRIGGER];
  if (!page.includes(expected) || page.includes(other)) {
    found.push(`fork CI: pipeline.yml ${trigger ? 'has' : 'lacks'} a pull_request trigger, so the page must carry "${expected}" and not "${other}"`);
  }
  return found;
}

describe('CONTRIBUTING.md', () => {
  if (!isBlueprintTree(root)) {
    it('skips outside the framework repository', () => {
      // The self-check sets this where it runs the guard on the framework repository.
      expect(process.env.TROPIS_EXPECT_FRAMEWORK ?? '').toBe('');
    });
    return;
  }

  it('names only what exists and states fork CI as pipeline.yml has it', () => {
    expect(problems(root)).toEqual([]);
  });

  describe('on a small tree', () => {
    let dir;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'contributing-'));
      for (const f of ['bootstrap.md', 'PORTABILITY-NOTES.md', 'README.md']) writeFileSync(join(dir, f), '');
      mkdirSync(join(dir, 'commands'));
      writeFileSync(join(dir, 'commands/real.md'), '');
      mkdirSync(join(dir, '.github/workflows'), { recursive: true });
      writeFileSync(join(dir, '.github/workflows/pipeline.yml'), 'on:\n  push:\n');
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('reports a missing path, a missing command and the wrong fork sentence', () => {
      writeFileSync(
        join(dir, 'CONTRIBUTING.md'),
        `Run \`scripts/missing.sh\` or \`/nonesuch\` or \`/real\`.\n\n${WITH_TRIGGER}\n`,
      );
      const found = problems(dir);
      expect(found).toHaveLength(3);
      expect(found.some((p) => p.includes('scripts/missing.sh'))).toBe(true);
      expect(found.some((p) => p.includes('/nonesuch'))).toBe(true);
      expect(found.some((p) => p.includes(WITHOUT_TRIGGER))).toBe(true);
    });

    it('reports a missing page', () => {
      expect(problems(dir)).toEqual(['CONTRIBUTING.md is missing']);
    });
  });
});
