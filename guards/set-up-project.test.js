// Level: unit
/**
 * The setup sets a project up inside its own repository.
 *
 * Runs scripts/set-up-project.sh, found from this file's own location, on throwaway
 * repositories: what it installs and where, that every `.tropis/` path the installed
 * documents name exists, that an exported copy carries none of it, and that it refuses —
 * changing nothing — a folder it cannot set up. Nothing sibling is created: the project
 * is the only folder the setup touches.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync,
  statSync, realpathSync, symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import YAML from 'yaml';
import { fingerprint, shippedFiles, blocks } from '../scripts/installed-files.js';

const blueprint = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const setup = join(blueprint, 'scripts/set-up-project.sh');
const list = (file) => readFileSync(join(blueprint, 'scripts', file), 'utf8').split('\n').filter(Boolean);
const mdIn = (dir) => readdirSync(join(blueprint, dir)).filter((f) => f.endsWith('.md'));

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || args.join(' '));
  return r.stdout;
}

/** A repository with src/app.js committed, alone in a fresh temporary folder. */
function repository(files = {}) {
  const parent = mkdtempSync(join(tmpdir(), 'set-up-'));
  const dir = join(parent, 'example-project');
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'src/app.js'), 'console.log(1);\n');
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'init');
  return { parent, dir };
}

const runSetup = (dir, ...rest) => spawnSync('bash', [setup, dir, ...rest], { encoding: 'utf8' });

/** The paths of the setup's export-ignore loop, read from the script. */
const exportIgnoredPaths = readFileSync(setup, 'utf8')
  .match(/^for p in ([^;]*); do$/m)[1].replace(/\\\n/g, ' ').split(/\s+/).filter(Boolean);

const BLOCK_BEGIN = /project-owned: begin/;
const BLOCK_END = /project-owned: end/;

/**
 * Lines outside project-owned blocks, as [line number, text]. Marker lines stay,
 * matching the fingerprint scan: only the inner lines are project-owned.
 */
function linesOutsideBlocks(text) {
  const lines = text.split('\n');
  const kept = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (BLOCK_BEGIN.test(line)) {
      let end = i + 1;
      while (end < lines.length && !BLOCK_END.test(lines[end])) end += 1;
      if (end < lines.length) {
        kept.push([i + 1, line]);
        kept.push([end + 1, lines[end]]);
        i = end + 1;
        continue;
      }
    }
    kept.push([i + 1, line]);
    i += 1;
  }
  return kept;
}

/** Every .md file under a folder, recursively. */
function markdownUnder(dir) {
  return readdirSync(dir, { recursive: true })
    .map((f) => join(dir, f))
    .filter((f) => f.endsWith('.md') && statSync(f).isFile());
}

describe('the display name', () => {
  const NAME = 'Acme Portal & Co. <β> $1';
  const firstLine = (dir) => readFileSync(join(dir, '.tropis/README.md'), 'utf8').split('\n')[0];
  const packageName = (dir) => JSON.parse(readFileSync(join(dir, '.tropis/package.json'), 'utf8')).name;

  it('writes the name it is given to .tropis/project.json, exactly', () => {
    const { parent, dir } = repository();
    try {
      const r = runSetup(dir, NAME);
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
      expect(readFileSync(join(dir, '.tropis/project.json'), 'utf8')).toBe(`${JSON.stringify({ name: NAME }, null, 2)}\n`);
      expect(packageName(dir)).toBe('acme-portal-co-1-framework');
      expect(firstLine(dir)).toBe(`# ${NAME} — working with the framework`);
      expect(readFileSync(join(dir, '.tropis/README.md'), 'utf8')).not.toContain('{{PROJECT_NAME}}');
      const record = JSON.parse(readFileSync(join(dir, '.tropis/installed.json'), 'utf8'));
      expect(Object.keys(record.files)).not.toContain('.tropis/project.json');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("writes no settings file without a name, and uses the folder's name", () => {
    for (const rest of [[], ['']]) {
      const { parent, dir } = repository();
      try {
        expect(runSetup(dir, ...rest).status).toBe(0);
        expect(existsSync(join(dir, '.tropis/project.json'))).toBe(false);
        expect(packageName(dir)).toBe('example-project-framework');
        expect(firstLine(dir)).toBe('# example-project — working with the framework');
      } finally {
        rmSync(parent, { recursive: true, force: true });
      }
    }
  });

  it('names the package after the folder when the name has nothing a package name can use', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir, '東京').status).toBe(0);
      expect(readFileSync(join(dir, '.tropis/project.json'), 'utf8')).toContain('東京');
      expect(packageName(dir)).toBe('example-project-framework');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('set-up-project.sh', () => {
  it('sets a project up in its own repository', () => {
    const { parent, dir } = repository();
    try {
      const r = runSetup(dir);
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
      const expected = [
        ...mdIn('rules').map((f) => `.tropis/rules/${f}`),
        ...mdIn('rules').map((f) => `.claude/rules/${f}`),
        ...mdIn('rules').map((f) => `.cursor/rules/${f.replace(/\.md$/, '.mdc')}`),
        '.claude/rule-areas.json',
        ...mdIn('framework').map((f) => `.claude/framework/${f}`),
        ...mdIn('commands').map((f) => `.claude/commands/${f}`),
        '.claude/settings.json',
        ...list('installed-hooks.txt').map((f) => `.tropis/hooks/${f}`),
        ...list('installed-scripts.txt').map((f) => `.tropis/scripts/${f}`),
        '.tropis/guards/catalog-entries.test.js',
        '.tropis/guards/rule-areas.test.js',
        '.tropis/guards/rules-generated.test.js',
        '.tropis/guards/installed-files.test.js',
        '.tropis/guards/entry-file.test.js',
        '.tropis/guards/framework-integrity.test.js',
        '.tropis/guards/doc-currency.test.js',
        '.tropis/guards/review-record.test.js',
        '.tropis/guards/plan-dispatchable.test.js',
        '.tropis/guards/catalog-drift.test.js',
        '.tropis/guards/rule-claims.test.js',
        '.tropis/guards/flush-drained.test.js',
        '.tropis/guards/project-layout.test.js',
        '.tropis/installed.json',
        '.tropis/package.json',
        '.tropis/jest.config.js',
        '.tropis/README.md',
        '.tropis/templates/project-brief.md',
        '.tropis/templates/readme-skeleton.md',
        '.tropis/templates/backlog-board.html',
        '.tropis/templates/backlog-bands.yaml',
        '.tropis/templates/pipeline-caller.yml',
        '.tropis/templates/candidate-caller.yml',
        '.tropis/templates/main-branch-ruleset.json',
        '.github/workflows/tropis-candidate.yml',
        '.github/workflows/tropis-framework-checks.yml',
        '.github/workflows/tropis-pipeline.yml',
        'docs/backlog-board/bands.yaml',
        'CLAUDE.md',
        'AGENTS.md',
        'feature-catalog.yaml',
        'docs/verification-log.md',
        '.gitignore',
        '.gitattributes',
      ];
      // Setup writes no README level. /bootstrap asks, and the project owns docs/readme/.
      expect(expected.filter((p) => p.startsWith('docs/readme/'))).toEqual([]);
      expect(expected.filter((p) => !existsSync(join(dir, p)))).toEqual([]);
      expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n');
      expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toBe(
        readFileSync(join(blueprint, 'templates/AGENTS.md'), 'utf8'),
      );
      expect(existsSync(join(dir, 'pipeline'))).toBe(false);
      expect(existsSync(join(dir, '.github/workflows/pipeline.yml'))).toBe(false);
      expect(existsSync(join(dir, '.github/workflows/candidate.yml'))).toBe(false);

      const settings = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
      const commands = settings.hooks.PreToolUse.flatMap((m) => m.hooks.map((h) => h.command));
      expect(commands.length).toBeGreaterThan(0);
      for (const c of commands) {
        const m = /^bash \.tropis\/hooks\/([\w.-]+)$/.exec(c);
        expect(m).not.toBeNull();
        expect(existsSync(join(dir, '.tropis/hooks', m[1]))).toBe(true);
      }

      const pkgText = readFileSync(join(dir, '.tropis/package.json'), 'utf8');
      expect(JSON.parse(pkgText).name).toBe('example-project-framework');
      expect(pkgText).not.toContain('PROJECT_SLUG');

      // Shipped areas are the project's data; each shipped rule is generated in both formats.
      const shipped = mdIn('rules').map((f) => basename(f, '.md')).sort();
      const areas = JSON.parse(readFileSync(join(dir, '.claude/rule-areas.json'), 'utf8'));
      expect(Object.keys(areas).sort()).toEqual(shipped);
      const rules = readdirSync(join(dir, '.claude/rules')).map((f) => basename(f, '.md')).sort();
      const projections = readdirSync(join(dir, '.cursor/rules')).map((f) => basename(f, '.mdc')).sort();
      expect(rules).toEqual(shipped);
      expect(projections).toEqual(shipped);
      // No shipped file carries the project's paths; the shipped text has no header.
      for (const f of mdIn('rules')) {
        expect(readFileSync(join(dir, '.tropis/rules', f), 'utf8').startsWith('---')).toBe(false);
      }

      // Nothing beside the project.
      expect(readdirSync(parent)).toEqual(['example-project']);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('records every shipped file at version unknown', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const record = JSON.parse(readFileSync(join(dir, '.tropis/installed.json'), 'utf8'));
      expect(record.version).toBe('unknown');
      expect(Object.keys(record)).toEqual(['version', 'source', 'files']);
      expect(Object.keys(record.files).sort()).toEqual(shippedFiles(dir));
      for (const rel of Object.keys(record.files)) {
        expect(record.files[rel]).toBe(fingerprint(readFileSync(join(dir, rel), 'utf8')));
      }
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  /** A copy of this blueprint, committed, so the test controls whether it has an origin. */
  function blueprintCopy() {
    const parent = mkdtempSync(join(tmpdir(), 'set-up-source-'));
    const copy = join(parent, 'blueprint');
    mkdirSync(copy);
    for (const folder of ['rules', 'framework', 'commands', 'scripts', 'guards', 'templates']) {
      cpSync(join(blueprint, folder), join(copy, folder), { recursive: true });
    }
    git(copy, 'init', '-q', '-b', 'main');
    git(copy, 'add', '-A');
    git(copy, 'commit', '-qm', 'blueprint copy');
    return { parent, copy };
  }

  it('records the checkout origin as the source', () => {
    const { parent, copy } = blueprintCopy();
    const url = 'https://example.test/tropis.git';
    git(copy, 'remote', 'add', 'origin', url);
    const project = repository();
    try {
      const r = spawnSync('bash', [join(copy, 'scripts/set-up-project.sh'), project.dir], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      const record = JSON.parse(readFileSync(join(project.dir, '.tropis/installed.json'), 'utf8'));
      expect(Object.keys(record)).toEqual(['version', 'source', 'files']);
      expect(record.source).toBe(url);
    } finally {
      rmSync(parent, { recursive: true, force: true });
      rmSync(project.parent, { recursive: true, force: true });
    }
  });

  it('records the checkout path when the checkout has no origin', () => {
    const { parent, copy } = blueprintCopy();
    const project = repository();
    try {
      const r = spawnSync('bash', [join(copy, 'scripts/set-up-project.sh'), project.dir], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      const record = JSON.parse(readFileSync(join(project.dir, '.tropis/installed.json'), 'utf8'));
      expect(record.source).toBe(realpathSync(copy));
    } finally {
      rmSync(parent, { recursive: true, force: true });
      rmSync(project.parent, { recursive: true, force: true });
    }
  });

  it('ships project-owned blocks only where a project fills something in', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const withBlocks = shippedFiles(dir).filter(
        (rel) => blocks(readFileSync(join(dir, rel), 'utf8')).length > 0,
      );
      expect(withBlocks).toEqual([
        '.claude/commands/feature.md',
        '.claude/commands/idea.md',
        '.claude/commands/manual-check.md',
        '.claude/commands/next.md',
        '.claude/commands/refresh-board.md',
        '.claude/commands/release.md',
        '.tropis/guards/rule-claims.test.js',
        '.tropis/hooks/framework-commit-check.sh',
      ]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('asks for no edit on adoption outside a block', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const forbidden = [/on adoption/i, /<backlog command>/, /<docs command>/, /written down here/i, /here, with the date/i, /delete the rest/i];
      const hits = [];
      for (const rel of shippedFiles(dir)) {
        for (const [n, line] of linesOutsideBlocks(readFileSync(join(dir, rel), 'utf8'))) {
          if (forbidden.some((re) => re.test(line))) hits.push(`${rel}:${n}: ${line}`);
        }
      }
      expect(hits).toEqual([]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('names only .tropis/ paths it installed', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const files = [
        join(dir, 'CLAUDE.md'),
        join(dir, 'AGENTS.md'),
        join(dir, '.claude/settings.json'),
        ...markdownUnder(join(dir, '.claude')),
      ];
      const missing = [];
      for (const file of files) {
        const text = readFileSync(file, 'utf8');
        for (const m of text.matchAll(/\.tropis\/[A-Za-z0-9_./-]*[A-Za-z0-9_-]/g)) {
          const ref = m[0];
          // Created by the first install, not by the setup.
          if (/^\.tropis\/(node_modules|package-lock\.json)/.test(ref)) continue;
          // Written only when setup is given a display name; this run gives none.
          if (ref === '.tropis/project.json') continue;
          // A pattern or a placeholder, not a path.
          const next = text[m.index + ref.length] ?? '';
          if (/[*<]/.test(ref) || /[*<]/.test(next)) continue;
          if (!existsSync(join(dir, ref))) missing.push(`${file.slice(dir.length + 1)} → ${ref}`);
        }
      }
      expect(missing).toEqual([]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('leaves the tooling out of an exported copy', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      git(dir, 'add', '-A');
      git(dir, 'commit', '-qm', 'set up');
      const archive = spawnSync('sh', ['-c', 'git archive HEAD | tar -t'], { cwd: dir, encoding: 'utf8' });
      const entries = archive.stdout.split('\n').filter(Boolean);
      const leaked = entries.filter((e) => /^(\.claude|\.cursor|\.tropis|docs\/superpowers|docs\/backlog-board)\//.test(e)
        || ['CLAUDE.md', 'AGENTS.md', 'feature-catalog.yaml', 'docs/verification-log.md'].includes(e));
      expect(leaked).toEqual([]);
      // An empty archive would pass the check above.
      expect(entries).toContain('src/app.js');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses an existing CLAUDE.md, changing nothing', () => {
    const { parent, dir } = repository({ 'CLAUDE.md': '# Ours\n' });
    try {
      const before = git(dir, 'status', '--porcelain');
      const r = runSetup(dir);
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('CLAUDE.md');
      expect(existsSync(join(dir, '.tropis'))).toBe(false);
      expect(existsSync(join(dir, '.claude'))).toBe(false);
      expect(git(dir, 'status', '--porcelain')).toBe(before);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses an existing .claude/rule-areas.json, changing nothing', () => {
    const { parent, dir } = repository();
    try {
      mkdirSync(join(dir, '.claude'));
      writeFileSync(join(dir, '.claude/rule-areas.json'), '{}\n');
      const r = runSetup(dir);
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('.claude/rule-areas.json');
      expect(existsSync(join(dir, '.tropis'))).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses a project that already holds the framework in .framework/', () => {
    const { parent, dir } = repository();
    try {
      mkdirSync(join(dir, '.framework'));
      writeFileSync(join(dir, '.framework/installed.json'), '{}\n');
      git(dir, 'add', '-A');
      git(dir, 'commit', '-qm', 'old layout');
      const before = git(dir, 'status', '--porcelain');
      const r = runSetup(dir);
      const project = realpathSync(dir);
      expect(r.status).toBe(1);
      expect(r.stderr).toBe(
        `set-up-project: ${project} holds the framework in .framework/, a layout this release no longer takes. `
        + `Remove .framework/, commit, and run this again.\n`,
      );
      expect(existsSync(join(dir, '.tropis'))).toBe(false);
      expect(existsSync(join(dir, '.claude'))).toBe(false);
      expect(git(dir, 'status', '--porcelain')).toBe(before);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses a folder that is not a git repository', () => {
    const parent = mkdtempSync(join(tmpdir(), 'set-up-'));
    const dir = join(parent, 'not-a-repo');
    mkdirSync(dir);
    try {
      const r = runSetup(dir);
      expect(r.status).toBe(1);
      expect(readdirSync(dir)).toEqual([]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("keeps the project's own ignore and attribute lines", () => {
    const { parent, dir } = repository({ '.gitignore': 'node_modules', '.gitattributes': '*.png binary\n' });
    try {
      expect(runSetup(dir).status).toBe(0);
      const ignore = readFileSync(join(dir, '.gitignore'), 'utf8').split('\n');
      const attrs = readFileSync(join(dir, '.gitattributes'), 'utf8').split('\n');
      expect(ignore).toContain('node_modules');
      expect(attrs).toContain('*.png binary');
      expect(ignore.filter((l) => l === '.tropis/node_modules/')).toHaveLength(1);
      expect(attrs.filter((l) => l === '/.claude/ export-ignore')).toHaveLength(1);
      expect(attrs.filter((l) => l === '/docs/readme/ export-ignore')).toHaveLength(1);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('writes each export-ignore line anchored, so a file of the same name deeper in the project is exported', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const attrs = readFileSync(join(dir, '.gitattributes'), 'utf8').split('\n');
      expect(exportIgnoredPaths).toEqual(expect.arrayContaining(['.claude/', 'CLAUDE.md', 'docs/BLUEPRINT-UPSTREAM.md']));
      for (const p of exportIgnoredPaths) {
        expect(attrs.filter((l) => l === `/${p} export-ignore`)).toHaveLength(1);
      }
      expect(attrs.filter((l) => /^[^/#].* export-ignore$/.test(l))).toEqual([]);
      mkdirSync(join(dir, 'sub/.claude'), { recursive: true });
      writeFileSync(join(dir, 'sub/CLAUDE.md'), 'deeper\n');
      writeFileSync(join(dir, 'sub/.claude/x'), 'deeper\n');
      git(dir, 'add', '-A');
      git(dir, 'commit', '-qm', 'set up');
      const listed = spawnSync('sh', ['-c', 'git archive HEAD | tar -t'], { cwd: dir, encoding: 'utf8' })
        .stdout.split('\n');
      expect(listed).toEqual(expect.arrayContaining(['sub/CLAUDE.md', 'sub/.claude/x']));
      expect(listed).not.toContain('CLAUDE.md');
      expect(listed.filter((f) => f.startsWith('.claude/'))).toEqual([]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('does not add a line the project has in the other form', () => {
    const { parent, dir } = repository({
      '.gitattributes': 'CLAUDE.md export-ignore\n/.cursor/ export-ignore\n',
      '.gitignore': '/.tropis/node_modules/\n',
    });
    try {
      expect(runSetup(dir).status).toBe(0);
      const ignore = readFileSync(join(dir, '.gitignore'), 'utf8').split('\n');
      const attrs = readFileSync(join(dir, '.gitattributes'), 'utf8').split('\n');
      const unanchored = (l) => l.replace(/^\//, '');
      expect(attrs.slice(0, 2)).toEqual(['CLAUDE.md export-ignore', '/.cursor/ export-ignore']);
      expect(ignore[0]).toBe('/.tropis/node_modules/');
      expect(attrs.filter((l) => unanchored(l) === 'CLAUDE.md export-ignore')).toHaveLength(1);
      expect(attrs.filter((l) => unanchored(l) === '.cursor/ export-ignore')).toHaveLength(1);
      expect(ignore.filter((l) => unanchored(l) === '.tropis/node_modules/')).toHaveLength(1);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('adds no export-ignore line for a path the project keeps', () => {
    const { parent, dir } = repository({
      '.gitattributes': 'docs/readme/ -export-ignore\n/AGENTS.md !export-ignore\n',
    });
    try {
      expect(runSetup(dir).status).toBe(0);
      const attrs = readFileSync(join(dir, '.gitattributes'), 'utf8').split('\n');
      const pathOf = (l) => l.split(/\s+/)[0].replace(/^\//, '');
      expect(attrs.filter((l) => ['docs/readme/', 'AGENTS.md'].includes(pathOf(l))))
        .toEqual(['docs/readme/ -export-ignore', '/AGENTS.md !export-ignore']);
      for (const p of exportIgnoredPaths.filter((x) => !['docs/readme/', 'AGENTS.md'].includes(x))) {
        expect(attrs).toContain(`/${p} export-ignore`);
      }
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('adds nothing to the ignore files when run again on its own lines', () => {
    const first = repository();
    try {
      expect(runSetup(first.dir).status).toBe(0);
      const files = {
        '.gitignore': readFileSync(join(first.dir, '.gitignore'), 'utf8'),
        '.gitattributes': readFileSync(join(first.dir, '.gitattributes'), 'utf8'),
      };
      // The setup refuses a folder already set up, so the second run gets the first one's
      // ignore files in a fresh repository.
      const second = repository(files);
      try {
        expect(runSetup(second.dir).status).toBe(0);
        for (const [name, text] of Object.entries(files)) {
          expect(readFileSync(join(second.dir, name), 'utf8')).toBe(text);
        }
      } finally {
        rmSync(second.parent, { recursive: true, force: true });
      }
    } finally {
      rmSync(first.parent, { recursive: true, force: true });
    }
  });

  // The checks a project gets must pass on the day it gets them; a change that would leave
  // a new project red fails here instead of in the project. The project's suite runs with
  // the test tools this test runs with, from .tropis/ as `npm --prefix .tropis test` runs
  // it, and with FRAMEWORK_ROOT unset, as it is there.
  it('a freshly set-up project passes its own checks', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      let modules = dirname(createRequire(import.meta.url).resolve('jest'));
      while (basename(modules) !== 'node_modules') modules = dirname(modules);
      symlinkSync(modules, join(dir, '.tropis/node_modules'));
      const env = { ...process.env };
      delete env.FRAMEWORK_ROOT;
      delete env.TROPIS_EXPECT_FRAMEWORK;
      const r = spawnSync(
        process.execPath,
        // In band: the self-check already runs every worker, and a second pool beside it
        // slows the timing-sensitive tests of other files past their limits.
        ['--experimental-vm-modules', join(modules, '.bin/jest'), '--no-coverage', '--runInBand'],
        { cwd: join(dir, '.tropis'), env, encoding: 'utf8' },
      );
      if (r.status !== 0) console.log(`${r.stdout}\n${r.stderr}`);
      expect(r.status).toBe(0);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  }, 180_000);

  it('writes a header-only bands file the project owns', () => {
    const { parent, dir } = repository();
    try {
      expect(runSetup(dir).status).toBe(0);
      const bands = YAML.parse(readFileSync(join(dir, 'docs/backlog-board/bands.yaml'), 'utf8'));
      expect(bands ?? {}).toEqual({});
      expect(shippedFiles(dir)).not.toContain('docs/backlog-board/bands.yaml');
      expect(JSON.parse(readFileSync(join(dir, '.tropis/package.json'), 'utf8')).scripts.board)
        .toBe('node ./scripts/build-backlog-board.mjs');
      const ignore = readFileSync(join(dir, '.gitignore'), 'utf8').split('\n');
      expect(ignore.filter((line) => line === 'docs/backlog-board/index.html')).toEqual([
        'docs/backlog-board/index.html',
      ]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
