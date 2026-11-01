// Level: unit
/**
 * The dispatch command and the isolation helper, run as a set-up project runs them.
 *
 * Each case builds a throwaway repository laid out as set-up-project.sh lays one out —
 * the shipped scripts in .tropis/scripts/, the hook wiring in .claude/, all committed —
 * so nothing here touches a real repository.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync,
  realpathSync, chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLastVerified, picksForTier } from '../scripts/plan-binding.js';

const here = dirname(fileURLToPath(import.meta.url));
const blueprint = resolve(here, '..');
const PLAN = 'docs/superpowers/plans/2026-01-01-example.md';

const plan = (rows, header = '') => `# Example plan

**Model tier: small.** Everything is specified.

**Merge authority: parent review.** Somebody else merges.
${header ? `\n${header}\n` : ''}
## Delivers

None.

## Repositories

| Checkout | Role | Isolation |
|---|---|---|
${rows.join('\n')}

## Global Constraints

None.

## Traps

None.
`;

// Built from parts, so the literal command appears nowhere outside a plan's Repositories
// table.
const W = 'worktree';
const isolation = (dir) => `\`git ${W} add ../${dir} -b plan/example\``;

const PROJECT_ONLY = [
  `| project (\`example-project\`) | execute here | ${isolation('example-project-wt')} |`,
];

const BOTH = [
  PROJECT_ONLY[0],
  `| other (\`example-other\`) | execute here too | ${isolation('example-other-wt')} |`,
];

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || args.join(' '));
}

function repo(dir) {
  mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  writeFileSync(join(dir, 'README.md'), 'x\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', 'seed');
}

const lines = (file) => readFileSync(join(blueprint, 'scripts', file), 'utf8').split('\n').filter(Boolean);

/** One repository laid out as the setup lays it out, all committed. */
function project(planText) {
  const parent = mkdtempSync(join(tmpdir(), 'dispatch-'));
  const root = join(parent, 'example-project');
  const fw = join(root, '.tropis');
  mkdirSync(join(fw, 'scripts'), { recursive: true });
  mkdirSync(join(fw, 'hooks'), { recursive: true });
  mkdirSync(join(root, '.claude/framework'), { recursive: true });
  mkdirSync(join(root, 'docs/superpowers/plans'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  for (const f of lines('installed-scripts.txt')) {
    copyFileSync(join(blueprint, 'scripts', f), join(fw, 'scripts', f));
  }
  copyFileSync(join(blueprint, 'scripts/hook-reply.sh'), join(fw, 'hooks/hook-reply.sh'));
  writeFileSync(join(fw, 'package.json'), '{"type":"module"}\n');
  copyFileSync(join(blueprint, 'framework/model-tiers.md'), join(root, '.claude/framework/model-tiers.md'));
  copyFileSync(join(blueprint, 'templates/settings.json'), join(root, '.claude/settings.json'));
  writeFileSync(join(root, 'src/app.js'), 'console.log(1);\n');
  writeFileSync(join(root, PLAN), planText);
  repo(root);
  return { parent, root, fw };
}

function run(cwd, cmd, args) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8' });
}

/** The repository a worktree belongs to, physically resolved. */
function owner(worktree) {
  const common = run(worktree, 'git', ['rev-parse', '--git-common-dir']).stdout.trim();
  return realpathSync(resolve(worktree, common));
}

describe('dispatch command', () => {
  it('prints a thin prompt that points at the plan, from the root and from .tropis/', () => {
    const { parent, root, fw } = project(plan(PROJECT_ONLY));
    try {
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('**Tier:** small');
      expect(r.stdout).toContain('**Merge:** parent review');
      // The project has no picks file, and the framework ships no picks.
      expect(r.stdout).toContain('**Picks today:** none — this project has no `docs/model-picks.md`. Run /refresh-model-tiers to write it.');
      expect(r.stdout).not.toContain('Last verified');
      expect(r.stdout).toContain(`bash .tropis/scripts/isolate-for-plan.sh ${PLAN}`);
      // No worktree setup file: the framework's install alone, as before.
      expect(r.stdout).toContain('In each worktree it creates that has a .tropis/ folder, before running anything else:\n  npm --prefix .tropis ci\n');
      expect(r.stdout).toContain('Do not run them yourself');
      expect(r.stdout).toContain('Read the whole plan before starting');
      // Points at the plan; does not restate it.
      expect(r.stdout).not.toContain('## Traps');
      // `npm --prefix .tropis run dispatch` runs it with .tropis/ as the working
      // directory.
      const fromFw = run(fw, 'node', ['scripts/dispatch.mjs', PLAN]);
      expect(fromFw.status).toBe(0);
      expect(fromFw.stdout).toBe(r.stdout);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("prints the picks and their date from the project's own picks file", () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      const today = new Date().toISOString().slice(0, 10);
      writeFileSync(join(root, 'docs/model-picks.md'), `# Model picks\n\n**Last verified: ${today}.**\n\n| Tier | Models | Indicative price (in/out per Mtok) |\n|---|---|---|\n| **Small** | Example Model (all) | $1/$2 |\n`);
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('**Picks today:** Example Model (all)');
      expect(r.stdout).toContain(`**Last verified: ${today}** (\`docs/model-picks.md\`)`);
      expect(r.stdout).not.toContain('older than ~45 days');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('warns when the picks file is older than ~45 days', () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      writeFileSync(join(root, 'docs/model-picks.md'), '**Last verified: 2020-01-01.**\n\n| Tier | Models |\n|---|---|\n| **Small** | Old Model |\n');
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.stdout).toContain('**Picks today:** Old Model');
      expect(r.stdout).toContain('Picks are older than ~45 days — run /refresh-model-tiers before trusting them.');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('reads the picks table /refresh-model-tiers tells a project to start from', () => {
    const command = readFileSync(join(blueprint, 'commands/refresh-model-tiers.md'), 'utf8');
    const template = command.split('Start a new file like this')[1].split('```')[1];
    expect(template).toContain('| Tier | Models |\n|---|---|\n');
    for (const tier of ['Large', 'Medium–large', 'Medium', 'Small–medium', 'Small']) {
      expect(picksForTier(template, tier)).not.toBe('');
    }
  });

  it('ships no picks: the framework tier file has no pick table and no date', () => {
    const shipped = readFileSync(join(blueprint, 'framework/model-tiers.md'), 'utf8');
    for (const tier of ['Small', 'Small–medium', 'Medium', 'Medium–large', 'Large']) {
      expect(picksForTier(shipped, tier)).toBe('');
    }
    expect(parseLastVerified(shipped)).toBeNull();
  });

  it('prints nothing to paste and names each problem when the plan is not dispatchable', () => {
    const broken = plan(PROJECT_ONLY).replace('## Traps\n\nNone.\n', '');
    const { parent, root } = project(broken);
    try {
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr).toContain('Missing heading: Traps');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses a plan that lists a rule file without its projection, where rules are projected', () => {
    const unpaired = `${plan(PROJECT_ONLY)}\n## File Structure\n\n| File | Change |\n|---|---|\n| \`.claude/rules/tests.md\` | One bullet |\n`;
    const { parent, root } = project(unpaired);
    try {
      mkdirSync(join(root, '.cursor/rules'), { recursive: true });
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr).toContain('.claude/rules/tests.md');
      expect(r.stderr).toContain('.cursor/rules/tests.mdc');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('does not hold a project that does not project its rules to it', () => {
    const unpaired = `${plan(PROJECT_ONLY)}\n## File Structure\n\n| File | Change |\n|---|---|\n| \`.claude/rules/tests.md\` | One bullet |\n`;
    const { parent, root } = project(unpaired);
    try {
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('accepts a plan that lists a file under a top-level rules/ folder alone, where rules are projected', () => {
    const listed = `${plan(PROJECT_ONLY)}\n## File Structure\n\n| File | Change |\n|---|---|\n| \`rules/tests.md\` | One bullet |\n`;
    const { parent, root } = project(listed);
    try {
      mkdirSync(join(root, '.cursor/rules'), { recursive: true });
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses a plan that lists a shipped text without both files written from it', () => {
    const unpaired = `${plan(PROJECT_ONLY)}\n## File Structure\n\n| File | Change |\n|---|---|\n| \`.tropis/rules/tests.md\` | One bullet |\n`;
    const { parent, root } = project(unpaired);
    try {
      mkdirSync(join(root, '.cursor/rules'), { recursive: true });
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr).toContain('.claude/rules/tests.md');
      expect(r.stderr).toContain('.cursor/rules/tests.mdc');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('reads a wrapped Requires field whole', () => {
    const { parent, root } = project(plan(PROJECT_ONLY, '**Requires:** the developer at the\napplication for Task 4.'));
    try {
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('**Requires:** the developer at the application for Task 4.');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('reads a Requires field whose bold spans the colon', () => {
    const { parent, root } = project(plan(PROJECT_ONLY, '**Requires: the developer for Task 4.**'));
    try {
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('**Requires:** the developer for Task 4.');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses a header field that reads empty, naming its line', () => {
    const text = plan(PROJECT_ONLY, '**Requires:**');
    const line = text.split('\n').findIndex((l) => l === '**Requires:**') + 1;
    const { parent, root } = project(text);
    try {
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr).toContain(`Header field "Requires" on line ${line} reads empty`);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('tells the executor to attach every other checkout it isolates in', () => {
    const { parent, root } = project(plan(BOTH));
    try {
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
      const at = r.stdout.indexOf('Before isolating: ');
      expect(at).toBeGreaterThan(-1);
      expect(at).toBeLessThan(r.stdout.indexOf('Isolate (from'));
      const paragraph = r.stdout.slice(at, r.stdout.indexOf('Isolate (from'));
      expect(paragraph).toContain('clone it beside this one under exactly this directory name:\n  - example-other\n');
      expect(paragraph).not.toContain('example-project');
      // The prompt states a capability, never a vendor.
      expect(paragraph).not.toMatch(/claude|cursor|codex|copilot|github|anthropic|openai/i);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('prints no attach step for one checkout', () => {
    const doNotEdit = '| other (`example-other`) | do not edit | |';
    for (const rows of [PROJECT_ONLY, [...PROJECT_ONLY, doNotEdit]]) {
      const { parent, root } = project(plan(rows));
      try {
        const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
        expect(r.status).toBe(0);
        expect(r.stdout).not.toContain('Before isolating');
      } finally {
        rmSync(parent, { recursive: true, force: true });
      }
    }
  });

  it('reminds the executor to verify every checkout it edits', () => {
    const { parent, root } = project(plan(BOTH));
    try {
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.stdout).toContain('Verify in EACH execute-here checkout');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("prints the project's own worktree setup, in order, in place of the framework install", () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      mkdirSync(join(root, '.tropis'), { recursive: true });
      writeFileSync(
        join(root, '.tropis/worktree-setup.txt'),
        '# Before the suite can run\ngit submodule update --init --recursive\n\nnpm ci\nnpm --prefix .tropis ci\n',
      );
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain(
        'Before running anything else, set up each worktree it creates:\n'
        + '  In project (`example-project`):\n'
        + '    git submodule update --init --recursive\n'
        + '    npm ci\n'
        + '    npm --prefix .tropis ci\n',
      );
      expect(r.stdout).not.toContain('In each worktree it creates that has a .tropis/ folder');
      expect(r.stdout).not.toContain('Before the suite can run');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('reads each checkout its own setup, the old .claude/ place for a sibling on an older release, and gives one without a file the framework install', () => {
    const { parent, root } = project(plan(BOTH));
    const other = join(parent, 'example-other');
    repo(other);
    try {
      mkdirSync(join(other, '.claude'), { recursive: true });
      writeFileSync(join(other, '.claude/worktree-setup.txt'), 'npm ci\n');
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain(
        '  In project (`example-project`), if it has a .tropis/ folder:\n'
        + '    npm --prefix .tropis ci\n'
        + '  In other (`example-other`):\n'
        + '    npm ci\n',
      );
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('worktree setup in both places', () => {
  it('prints the .tropis/ setup when a checkout holds both', () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      mkdirSync(join(root, '.tropis'), { recursive: true });
      mkdirSync(join(root, '.claude'), { recursive: true });
      writeFileSync(join(root, '.tropis/worktree-setup.txt'), 'npm run new-setup\n');
      writeFileSync(join(root, '.claude/worktree-setup.txt'), 'npm run old-setup\n');
      const r = run(root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('    npm run new-setup\n');
      expect(r.stdout).not.toContain('old-setup');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

describe('isolation helper', () => {
  it('isolates from a subdirectory, and the worktree carries the framework', () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      const r = run(join(root, 'src'), 'bash', ['../.tropis/scripts/isolate-for-plan.sh', PLAN]);
      expect(r.status).toBe(0);
      const wt = join(parent, 'example-project-wt');
      expect(owner(wt)).toBe(realpathSync(join(root, '.git')));
      // Committed, so it arrives with the worktree — no overlay to set up.
      expect(existsSync(join(wt, '.claude/settings.json'))).toBe(true);
      expect(existsSync(join(wt, '.tropis/hooks/hook-reply.sh'))).toBe(true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('puts each worktree in the repository its row names', () => {
    const { parent, root } = project(plan(BOTH));
    const other = join(parent, 'example-other');
    repo(other);
    try {
      const r = run(root, 'bash', ['.tropis/scripts/isolate-for-plan.sh', PLAN]);
      expect(r.status).toBe(0);
      expect(owner(join(parent, 'example-project-wt'))).toBe(realpathSync(join(root, '.git')));
      expect(owner(join(parent, 'example-other-wt'))).toBe(realpathSync(join(other, '.git')));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('names a checkout it cannot find, and creates nothing', () => {
    const rows = [
      PROJECT_ONLY[0],
      `| other (\`missing-checkout\`) | execute here too | ${isolation('missing-wt')} |`,
    ];
    const { parent, root } = project(plan(rows));
    try {
      const r = run(root, 'bash', ['.tropis/scripts/isolate-for-plan.sh', PLAN]);
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('missing-checkout');
      // Not even the row it could have satisfied: a plan that cannot be isolated
      // correctly must not be half-isolated.
      expect(existsSync(join(parent, 'example-project-wt'))).toBe(false);
      expect(existsSync(join(parent, 'missing-wt'))).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('says the main branch is red before it creates the worktree, and still creates it', () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      git(root, 'remote', 'add', 'origin', 'https://github.com/acme/example.git');
      // A stub gh first on PATH: nothing here reaches GitHub.
      const bin = join(parent, 'bin');
      mkdirSync(bin);
      writeFileSync(join(bin, 'gh'), `#!/usr/bin/env bash
case "$1 $2" in
  "api repos/{owner}/{repo}") echo '{"default_branch":"main"}' ;;
  "run list") echo '[{"status":"completed","conclusion":"failure","headSha":"bad0000aaaa","url":"https://github.com/acme/example/actions/runs/1","createdAt":"2026-10-31T11:00:00Z","displayTitle":"break it"}]' ;;
  *) echo "stub gh: unexpected call: $*" >&2; exit 99 ;;
esac
`);
      chmodSync(join(bin, 'gh'), 0o755);
      const r = spawnSync('bash', ['.tropis/scripts/isolate-for-plan.sh', PLAN], {
        cwd: root,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(r.status).toBe(0);
      const out = r.stdout.split('\n');
      expect(out[0]).toBe(
        'Main branch: red — the pipeline failed on bad0000 (break it). Run: https://github.com/acme/example/actions/runs/1',
      );
      expect(out[1]).toMatch(/^isolated in /);
      expect(owner(join(parent, 'example-project-wt'))).toBe(realpathSync(join(root, '.git')));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('says it could not tell where there is no origin, and still creates the worktree', () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      const r = run(root, 'bash', ['.tropis/scripts/isolate-for-plan.sh', PLAN]);
      expect(r.status).toBe(0);
      const out = r.stdout.split('\n');
      expect(out[0]).toBe('Main branch: could not tell — no remote named origin.');
      expect(out[1]).toMatch(/^isolated in /);
      expect(owner(join(parent, 'example-project-wt'))).toBe(realpathSync(join(root, '.git')));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses a base that does not hold the plan, and creates nothing', () => {
    const { parent, root } = project(plan(PROJECT_ONLY));
    try {
      const uncommitted = 'docs/superpowers/plans/2026-01-02-uncommitted.md';
      writeFileSync(join(root, uncommitted), plan(PROJECT_ONLY));
      const short = run(root, 'git', ['rev-parse', 'HEAD']).stdout.trim().slice(0, 7);
      const r = run(root, 'bash', ['.tropis/scripts/isolate-for-plan.sh', uncommitted]);
      expect(r.status).toBe(1);
      expect(r.stderr).toContain(uncommitted);
      expect(r.stderr).toContain('example-project');
      expect(r.stderr).toContain(short);
      expect(existsSync(join(parent, 'example-project-wt'))).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  /** A project whose origin is a bare clone of it, fetched. */
  function withOrigin() {
    const made = project(plan(PROJECT_ONLY));
    const remote = join(made.parent, 'remote.git');
    git(made.parent, 'clone', '-q', '--bare', made.root, remote);
    git(made.root, 'remote', 'add', 'origin', remote);
    git(made.root, 'fetch', '-q', 'origin');
    return made;
  }

  it("notes a base that is not on the remote's main branch, and still isolates", () => {
    const { parent, root } = withOrigin();
    try {
      writeFileSync(join(root, 'src/app.js'), 'console.log(2);\n');
      git(root, 'commit', '-qam', 'ahead of origin');
      const r = run(root, 'bash', ['.tropis/scripts/isolate-for-plan.sh', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("is not on origin/main, where the plan's review record is read from");
      expect(existsSync(join(parent, 'example-project-wt'))).toBe(true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("isolates a base that holds the plan and is on the remote's main branch, with no note", () => {
    const { parent, root } = withOrigin();
    try {
      const r = run(root, 'bash', ['.tropis/scripts/isolate-for-plan.sh', PLAN]);
      expect(r.status).toBe(0);
      expect(r.stdout).not.toContain('Note:');
      expect(existsSync(join(parent, 'example-project-wt'))).toBe(true);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
