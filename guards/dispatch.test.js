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
// A namespace, so the file still loads while these are not yet exported.
import * as binding from '../scripts/plan-binding.js';
import { todayIn } from '../scripts/today.js';

// A developer's own TROPIS_SUBSCRIPTIONS would answer the cases that expect no record,
// so every run here gets an environment without it.
const CHILD_ENV = { ...process.env };
delete CHILD_ENV.TROPIS_SUBSCRIPTIONS;

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
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', env: CHILD_ENV });
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
      expect(r.stdout).not.toContain('**Use:**');
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
      const today = todayIn();
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
    expect(template).toContain('| Model | Usage per task | Included on | Command-line name |\n|---|---|---|---|\n');
    expect(binding.inclusionTable(template).size).toBe(1);
    for (const tier of ['Large', 'Medium–large', 'Medium', 'Small–medium', 'Small']) {
      expect(picksForTier(template, tier)).not.toBe('');
    }
  });

  it('tells /refresh-model-tiers to admit to Large only models within 1 point of the best pick', () => {
    const command = readFileSync(join(blueprint, 'commands/refresh-model-tiers.md'), 'utf8')
      .replace(/\s+/g, ' ');
    expect(command).toContain('**Large takes only models level with the best selectable pick.**');
    expect(command).toContain('it is within **1 point** of that highest score.');
    expect(command).toContain('**Read each model at the effort it is judged at**');
    expect(command).toContain('that states none orders models and does not decide Large.');
    expect(command).toContain('Large holds each model that has the highest score on at least one board');
    expect(command).toContain('recorded in FW-067');
  });

  it('tells /refresh-model-tiers to judge each pick at the effort a tool starts it at', () => {
    const command = readFileSync(join(blueprint, 'commands/refresh-model-tiers.md'), 'utf8')
      .replace(/\s+/g, ' ');
    expect(command).toContain('**Judge every pick at the effort a supported tool starts it at, never at its best.**');
    expect(command).toContain('**A pick is judged at the lowest of those efforts.**');
    expect(command).toContain('in a table whose header row begins `| Model | Judged at |`');
    expect(command).toContain('marked `Cursor states no default`');
    expect(command).toContain('**A figure that may overstate never lifts a model into a higher tier and never sets the highest score Large is measured against; a figure that may understate never keeps a model out of one.**');
    expect(command).toContain('marked `Large unconfirmed`');
    expect(command).toContain('in FW-069');
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

describe('dispatch names the pick to use', () => {
  const today = () => todayIn();
  const picksText = () => `**Last verified: ${today()}.**

| Tier | Models |
|---|---|
| **Large** | Birch 2 *(all)*; Alder 3 *(all)* |
| **Medium–large** | Any pick from a higher tier |
| **Medium** | Cedar 1 *(Cursor)*; or any pick from a higher tier |
| **Small–medium** | Any pick from a higher tier |
| **Small** | Elm 0 *(Cursor)*; Dogwood 1 *(Cursor)*; or any pick from a higher tier |

| Model | Usage per task | Included on |
|---|---|---|
| Alder 3 | $9 per task (Example Index v1, high) | Claude Code: Max (to half the weekly limit), Ultra; Cursor: none |
| Birch 2 | $4 per task (Example Index v1, high) | Claude Code: none; Cursor: Premium |
| Cedar 1 | $1 per task (Example Index v1, high) | Cursor: Plus, Premium |
| Dogwood 1 | unmeasured | Cursor: Premium |
`;
  const PICKS = picksText();

  /** A project with a picks file and, optionally, a subscriptions record. */
  function withPicks(picks, record) {
    const p = project(plan(PROJECT_ONLY));
    writeFileSync(join(p.root, 'docs/model-picks.md'), picks);
    if (record !== undefined) {
      mkdirSync(join(p.root, '.git/tropis'), { recursive: true });
      writeFileSync(join(p.root, '.git/tropis/subscriptions.txt'), record);
    }
    return p;
  }
  const dispatch = (p) => run(p.root, 'node', ['.tropis/scripts/dispatch.mjs', PLAN]);

  it('names the included pick that costs least per task from the tier and above, ranking an unmeasured pick after a measured one', () => {
    const p = withPicks(PICKS, 'Cursor: Premium\n');
    try {
      expect(dispatch(p).stdout).toContain('**Use:** Cedar 1, in Cursor — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Medium tier.');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it("goes up a tier when none of this tier's picks is included", () => {
    const p = withPicks(PICKS, 'Cursor: Plus\n');
    try {
      expect(dispatch(p).stdout).toContain('**Use:** Cedar 1, in Cursor — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Medium tier.');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('matches a subscription that carries a note', () => {
    const p = withPicks(PICKS, '# mine\nclaude code: max\nCursor: none\n');
    try {
      const out = dispatch(p).stdout;
      expect(out).toContain('**Use:** Alder 3, in Claude Code — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Large tier.');
      expect(out).not.toContain('**Use:** Birch 2');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('names no pick when none is included', () => {
    const p = withPicks(PICKS, 'Claude Code: Pro\nCursor: none\n');
    try {
      expect(dispatch(p).stdout).toContain('**Use:** none — no pick for this tier or above is included in your subscriptions, and a model that costs extra is not used (FW-053).');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('says so when no subscriptions are recorded', () => {
    const p = withPicks(PICKS);
    try {
      expect(dispatch(p).stdout).toContain('**Use:** not chosen — which subscriptions you have is not recorded on this machine. Run /refresh-model-tiers, or set TROPIS_SUBSCRIPTIONS.');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  const tierRun = (p, ...args) => run(p.root, 'node', ['.tropis/scripts/dispatch.mjs', '--tier', ...args]);

  it('f: --tier names the pick /dispatch names for a plan of that tier', () => {
    const p = withPicks(PICKS, 'claude code: max\n');
    try {
      const r = tierRun(p, 'Large');
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('**Use:** Alder 3, in Claude Code — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Large tier.\n');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
    const q = withPicks(PICKS, 'Cursor: Premium\n');
    try {
      const useLine = dispatch(q).stdout.split('\n').find((l) => l.startsWith('**Use:**'));
      expect(tierRun(q, 'small').stdout).toBe(`${useLine}\n`);
    } finally { rmSync(q.parent, { recursive: true, force: true }); }
  });

  it('g: --tier says so when the project has no picks file', () => {
    const p = project(plan(PROJECT_ONLY));
    try {
      const r = tierRun(p, 'Large');
      expect(r.status).toBe(0);
      expect(r.stdout).toBe('**Use:** not chosen — this project has no model picks. Run /refresh-model-tiers.\n');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('h: --tier refuses a name that is not a tier, and a missing one', () => {
    const p = withPicks(PICKS, 'claude code: max\n');
    try {
      for (const args of [['Huge'], []]) {
        const r = tierRun(p, ...args);
        expect(r.status).toBe(1);
        expect(r.stdout).toBe('');
        expect(r.stderr).toContain('Small, Small–medium, Medium, Medium–large, Large');
      }
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('keeps an earlier picks file working', () => {
    const p = withPicks(`**Last verified: ${today()}.**\n\n| Tier | Models |\n|---|---|\n| **Small** | Old Model |\n`, 'Cursor: Premium\n');
    try {
      const out = dispatch(p).stdout;
      expect(out).toContain('**Picks today:** Old Model');
      expect(out).toContain('**Use:** not chosen — the picks do not say which subscriptions include each model. Run /refresh-model-tiers.');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('puts the Use line under the picks, and prints the same from .tropis/', () => {
    const p = withPicks(PICKS, 'Cursor: Premium\n');
    try {
      const out = dispatch(p).stdout;
      const all = out.split('\n');
      const i = all.findIndex((l) => l.startsWith('**Picks today:**'));
      expect(i).toBeGreaterThan(-1);
      expect(all[i + 1].startsWith('**Use:**')).toBe(true);
      const fromFw = run(p.fw, 'node', ['scripts/dispatch.mjs', PLAN]);
      expect(fromFw.stdout).toBe(out);
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('records the subscriptions it is given, and dispatch then uses them', () => {
    const p = withPicks(PICKS);
    try {
      const w = run(p.root, 'node', ['.tropis/scripts/dispatch.mjs', '--subscriptions', 'Cursor: Premium', 'Claude Code: none']);
      expect(w.status).toBe(0);
      expect(w.stdout).toBe('Subscriptions recorded for 2 tools, on this machine only.\n');
      const file = readFileSync(join(p.root, '.git/tropis/subscriptions.txt'), 'utf8');
      expect(file.startsWith('# Written by /refresh-model-tiers. Never committed.\n')).toBe(true);
      expect(dispatch(p).stdout).toContain('**Use:** Cedar 1, in Cursor — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Medium tier.');
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('refuses a malformed subscription and writes nothing', () => {
    const p = withPicks(PICKS);
    try {
      const w = run(p.root, 'node', ['.tropis/scripts/dispatch.mjs', '--subscriptions', 'Cursor']);
      expect(w.status).toBe(1);
      expect(w.stderr).toContain('usage: node .tropis/scripts/dispatch.mjs --subscriptions');
      expect(existsSync(join(p.root, '.git/tropis/subscriptions.txt'))).toBe(false);
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('parses the record, the inclusion table and the choice', () => {
    const parsed = binding.parseSubscriptions('# x\n\nClaude Code: Max\ncursor: none\nnot a line\n');
    expect([...parsed.keys()].sort()).toEqual(['claude code', 'cursor']);
    expect([...parsed.get('claude code')]).toEqual(['max']);
    expect(parsed.get('cursor').size).toBe(0);
    expect(binding.inclusionTable('| Tier | Models |\n|---|---|\n')).toBeNull();
    const alder = binding.inclusionTable(PICKS).get('Alder 3').get('claude code');
    expect(alder.name).toBe('Claude Code');
    expect([...alder.subscriptions].sort()).toEqual(['max', 'ultra']);
    expect(binding.pickToUse(PICKS, 'Huge', 'Cursor: Premium')).toBeNull();
    // The tier's own order, not the inclusion table's.
    expect(binding.pickToUse(PICKS, 'Large', 'Claude Code: Max\nCursor: Premium'))
      .toBe('**Use:** Birch 2, in Cursor — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Large tier.');
    const usage = binding.usagePerTask(PICKS);
    expect(usage.get('Alder 3')).toBe(9);
    expect(usage.get('Cedar 1')).toBe(1);
    expect(usage.get('Dogwood 1')).toBeNull();
    expect(binding.usagePerTask('| Tier | Models |\n|---|---|\n').size).toBe(0);
    expect(binding.usagePerTask('| Model | Usage per task | Included on |\n|---|---|---|\n| X | $1,234.50 per task | Cursor: Pro |\n').get('X')).toBe(1234.5);
  });

  // A dearer pick in the plan's own tier and a cheaper one above it, both included.
  const dearerBelow = (fig) => `**Last verified: ${today()}.**

| Tier | Models |
|---|---|
| **Large** | Alder 3 *(all)* |
| **Medium–large** | Fig 5 *(all)*; or any pick from a higher tier |
| **Medium** | Any pick from a higher tier |
| **Small–medium** | Any pick from a higher tier |
| **Small** | Any pick from a higher tier |

| Model | Usage per task | Included on | Command-line name |
|---|---|---|---|
| Alder 3 | $3.97 per task (Example Index v1, high) | Claude Code: Max | Claude Code: alder-3 |
| Fig 5 | ${fig} per task (Example Index v1, high) | Claude Code: Max | Claude Code: fig-5 |
`;

  it('† takes a cheaper included pick from a tier above over a dearer one in its own tier', () => {
    const p = withPicks(dearerBelow('$9.08'), 'Claude Code: Max\n');
    try {
      const line = '**Use:** Alder 3, in Claude Code — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Large tier.\n';
      expect(tierRun(p, 'Medium–large').stdout).toBe(line);
      expect(tierRun(p, 'Medium').stdout).toBe(line);
      expect(tierRun(p, 'Small').stdout).toBe(line);
    } finally { rmSync(p.parent, { recursive: true, force: true }); }
  });

  it('† keeps the pick in its own tier when it costs less, or the same', () => {
    for (const fig of ['$2.50', '$3.97']) {
      expect(binding.pickToUse(dearerBelow(fig), 'Medium–large', 'Claude Code: Max'))
        .toBe('**Use:** Fig 5, in Claude Code — of the picks for this tier and above that your subscriptions include, the one that costs least per task, from the Medium–large tier.');
    }
  });

  it('† names the first included pick going up when no included pick has a usage figure', () => {
    const unmeasured = PICKS.replace('$1 per task', 'unmeasured').replace('$4 per task', 'unmeasured');
    expect(binding.pickToUse(unmeasured, 'Small', 'Cursor: Premium'))
      .toBe('**Use:** Dogwood 1, in Cursor — no included pick for this tier or above has a usage figure, so this is the first one, from the Small tier.');
  });
});
