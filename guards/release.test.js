// Level: unit
/**
 * This repository's own release job: which version comes next, and how the notes'
 * Unreleased section becomes that version's section. Also what the shipped /release
 * command tells an agent drafting notes. Not shipped to projects.
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import YAML from 'yaml';
import { checkReleased, nextVersion, promote } from '../.github/scripts/release.mjs';

describe('nextVersion', () => {
  it('starts at 0.1.0 when nothing has been released, whatever the bump', () => {
    expect(nextVersion('patch', '')).toBe('0.1.0');
    expect(nextVersion('minor', '')).toBe('0.1.0');
    expect(nextVersion('major', '')).toBe('0.1.0');
  });

  it('below 1.0, a breaking release raises the middle number and anything else the last', () => {
    expect(nextVersion('major', 'v0.1.3')).toBe('0.2.0');
    expect(nextVersion('minor', 'v0.1.3')).toBe('0.1.4');
    expect(nextVersion('patch', 'v0.2.0')).toBe('0.2.1');
  });

  it('from 1.0, follows semantic versioning', () => {
    expect(nextVersion('major', 'v1.4.2')).toBe('2.0.0');
    expect(nextVersion('minor', 'v1.4.2')).toBe('1.5.0');
    expect(nextVersion('patch', 'v1.4.2')).toBe('1.4.3');
  });

  it('refuses a bump it does not know and a tag it cannot read', () => {
    expect(() => nextVersion('huge', 'v0.1.0')).toThrow(/bump/);
    expect(() => nextVersion('patch', 'release-3')).toThrow(/tag/);
  });
});

const head = '# Releases\n\nIntro.\n\n---\n\n';
const unreleased =
  '## [Unreleased]\n\n### Setting a project up\n\n- You can do X.\n\n' +
  'Checked on the release candidate: yes\n';

describe('promote', () => {
  it('moves Unreleased under the dated version and leaves an empty Unreleased above it', () => {
    expect(promote(`${head}${unreleased}\n---\n`, '0.1.0', '2026-10-16')).toBe(
      `${head}## [Unreleased]\n\n_Nothing yet._\n\n## [0.1.0] — 2026-10-16\n\n` +
        '### Setting a project up\n\n- You can do X.\n\n' +
        'Checked on the release candidate: yes\n\n---\n'
    );
  });

  it('keeps earlier versions below the new one', () => {
    const earlier = '## [0.1.0] — 2026-10-16\n\n- Old.\n';
    const out = promote(`${head}${unreleased}\n${earlier}`, '0.1.1', '2026-11-01');
    expect(out).toContain('## [0.1.1] — 2026-11-01\n\n### Setting a project up');
    expect(out.indexOf('## [0.1.1]')).toBeLessThan(out.indexOf('## [0.1.0]'));
    expect(out).toContain(earlier);
  });

  it('refuses notes with nothing to release', () => {
    expect(() =>
      promote(`${head}## [Unreleased]\n\n_Nothing yet._\n\n---\n`, '0.1.0', '2026-10-16')
    ).toThrow(/Nothing to release/);
  });

  it('refuses notes whose release-candidate line still reads (ask)', () => {
    const asking = unreleased.replace(': yes', ': (ask)');
    expect(() => promote(`${head}${asking}`, '0.1.0', '2026-10-16')).toThrow(/\(ask\)/);
  });

  it('refuses a version the notes already have', () => {
    const earlier = '## [0.1.0] — 2026-10-16\n\n- Old.\n';
    expect(() => promote(`${head}${unreleased}\n${earlier}`, '0.1.0', '2026-11-01')).toThrow(
      /already/
    );
  });

  it('refuses notes without an Unreleased section', () => {
    expect(() => promote(head, '0.1.0', '2026-10-16')).toThrow(/Unreleased/);
  });
});

describe('checkReleased', () => {
  const promoted = promote(`${head}${unreleased}\n---\n`, '0.2.0', '2026-10-31');

  it('passes on notes promoted to the version it is given', () => {
    expect(() => checkReleased(promoted, '0.2.0')).not.toThrow();
  });

  it('refuses notes whose Unreleased section still holds notes', () => {
    expect(() => checkReleased(`${head}${unreleased}\n## [0.2.0] — 2026-10-31\n\n- Old.\n`, '0.2.0')).toThrow(
      /still holds notes/,
    );
  });

  it('refuses a version the notes do not name as the newest', () => {
    expect(() => checkReleased(promoted, '0.3.0')).toThrow(/newest version in the notes is 0\.2\.0, not 0\.3\.0/);
  });

  it('refuses a version not of the form X.Y.Z', () => {
    expect(() => checkReleased(promoted, 'v0.2.0')).toThrow(/of the form X\.Y\.Z/);
    expect(() => checkReleased(promoted, '0.2')).toThrow(/of the form X\.Y\.Z/);
  });

  it('refuses notes with no version below Unreleased', () => {
    expect(() => checkReleased(`${head}## [Unreleased]\n\n_Nothing yet._\n\n---\n`, '0.2.0')).toThrow(
      /no version section/,
    );
  });
});

// Backs main-is-gated-by-the-host (and supersedes the third criterion of
// release-job-checks-the-commit-it-tags): the job's own steps, read from ci.yml and run in
// a scratch repository whose self-check is a stub and whose origin is a bare repository
// beside it, so nothing real is checked or pushed. The notes reach main already
// promoted; the job checks them and the commit, tags it, and pushes only the tag.
describe('the release job', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const workflow = YAML.parse(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'));
  const job = workflow.jobs.release;
  const after = job.steps.slice(job.steps.findIndex((st) => String(st.uses ?? '').startsWith('actions/setup-node')) + 1);
  const notesStep = after.findIndex((st) => st.id === 'notes');
  const checkStep = after.findIndex((st) => (st.run ?? '').trim() === 'bash scripts/check-blueprint.sh');
  const tagStep = after.findIndex((st) => (st.run ?? '').includes('git tag'));

  it('commits nothing, pushes only the tag, and checks before it tags', () => {
    expect(Object.keys(workflow.jobs)).toEqual(['release']);
    expect(Object.keys(workflow.on.workflow_dispatch.inputs)).toEqual(['version']);
    expect(workflow.on.workflow_dispatch.inputs.version.required).toBe(true);
    const runs = job.steps.map((st) => st.run ?? '').join('\n');
    expect(runs).not.toContain('git commit');
    const pushes = runs.split('\n').map((l) => l.trim()).filter((l) => l.includes('git push'));
    expect(pushes).toEqual(['git push origin "v$VERSION"']);
    expect(notesStep).toBeGreaterThanOrEqual(0);
    expect(checkStep).toBeGreaterThan(notesStep);
    expect(tagStep).toBeGreaterThan(checkStep);
    for (const st of after.slice(notesStep)) {
      expect(st).not.toHaveProperty('if');
      expect(st).not.toHaveProperty('continue-on-error');
    }
    expect(job).not.toHaveProperty('continue-on-error');
  });

  // Runs the job's steps after setup-node in a fresh scratch world whose main already
  // carries notes promoted to 0.2.0; the stub self-check records the commit it saw.
  const release = ({ checkExit = 0, version = '0.2.0', tagFirst = false } = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'release-job-'));
    const origin = join(dir, 'origin.git');
    const work = join(dir, 'work');
    const git = (cwd, ...args) => {
      const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
        cwd,
        encoding: 'utf8',
      });
      if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
      return r.stdout.trim();
    };
    try {
      git(dir, 'init', '-q', '--bare', origin);
      git(dir, 'init', '-q', '-b', 'main', work);
      writeFileSync(join(work, 'RELEASES.md'), promote(`${head}${unreleased}\n---\n`, '0.2.0', '2026-10-31'));
      mkdirSync(join(work, '.github/scripts'), { recursive: true });
      copyFileSync(join(root, '.github/scripts/release.mjs'), join(work, '.github/scripts/release.mjs'));
      mkdirSync(join(work, 'scripts'));
      const stub = join(work, 'scripts/check-blueprint.sh');
      writeFileSync(stub, `#!/usr/bin/env bash\ngit rev-parse HEAD > "${join(dir, 'checked')}"\nexit ${checkExit}\n`);
      chmodSync(stub, 0o755);
      git(work, 'add', '-A');
      git(work, 'commit', '-qm', 'docs(release): draft notes for the next release');
      git(work, 'remote', 'add', 'origin', origin);
      git(work, 'push', '-q', 'origin', 'main');
      if (tagFirst) git(work, 'tag', 'v0.2.0');
      const start = git(origin, 'rev-parse', 'main');

      for (const st of after) expect(Object.keys(st.env ?? {}).filter((k) => k !== 'VERSION')).toEqual([]);
      let stoppedAt = -1;
      for (const [i, st] of after.entries()) {
        if (!st.run) continue;
        const r = spawnSync('bash', ['-e', '-c', st.run], {
          cwd: work,
          encoding: 'utf8',
          env: { ...process.env, VERSION: version },
        });
        if (r.status !== 0) {
          stoppedAt = i;
          break;
        }
      }
      let checked = null;
      try {
        checked = readFileSync(join(dir, 'checked'), 'utf8').trim();
      } catch {}
      return {
        stoppedAt,
        start,
        checked,
        workHead: git(work, 'rev-parse', 'HEAD'),
        originMain: git(origin, 'rev-parse', 'main'),
        originTags: git(origin, 'tag', '--list', 'v*'),
        originTagCommit: spawnSync('git', ['rev-parse', 'v0.2.0^{commit}'], { cwd: origin, encoding: 'utf8' })
          .stdout.trim(),
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it('tags the commit main holds and pushes only the tag', () => {
    const r = release();
    expect(r.stoppedAt).toBe(-1);
    expect(r.originMain).toBe(r.start);
    expect(r.workHead).toBe(r.start);
    expect(r.checked).toBe(r.start);
    expect(r.originTagCommit).toBe(r.start);
  });

  it('pushes nothing when the self-check fails', () => {
    const r = release({ checkExit: 1 });
    expect(checkStep).toBeGreaterThanOrEqual(0);
    expect(r.stoppedAt).toBe(checkStep);
    expect(r.originTags).toBe('');
    expect(r.originMain).toBe(r.start);
  });

  it('refuses a version the notes do not name, before the self-check', () => {
    const r = release({ version: '0.3.0' });
    expect(r.stoppedAt).toBe(notesStep);
    expect(r.checked).toBeNull();
    expect(r.originTags).toBe('');
  });

  it('refuses a version already tagged', () => {
    const r = release({ tagFirst: true });
    expect(r.stoppedAt).toBe(notesStep);
    expect(r.checked).toBeNull();
    expect(r.originTags).toBe('');
  });
});

// Backs release-notes-read-as-the-reader-would: the drafting stage sets the shape a
// reader can act on. Each phrase is one instruction; rewording one means updating it here.
describe('the /release drafting stage', () => {
  // Whitespace is collapsed so re-wrapping the markdown does not fail the check.
  const command = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../commands/release.md'),
    'utf8'
  );
  const stage3 = command.slice(
    command.indexOf('## Stage 3'),
    command.indexOf('## Stage 4')
  ).replace(/\s+/g, ' ');

  it.each([
    ['a summary first', 'A summary of two or three sentences'],
    ['what to do by hand next', 'What they must do by hand comes next'],
    ['the by-hand steps numbered', 'Number the steps'],
    ['optional steps marked inside the bold lead', 'Optional:'],
    ['one section per change, headed by what the reader gets', 'One section per change that matters to them'],
    ['small fixes as bullets', 'Small fixes as one-line bullets'],
    ['internal terms spelled out', 'Spell out every term'],
    ['changes that do nothing for the reader left out', 'Leave out a change that changes nothing for them'],
    ['dropped changes reported', 'say in Stage 4 that you dropped it'],
    ['paths checked where the reader has them', 'against where the reader actually has it'],
    ['accumulated notes rewritten to the shape', 'rewrite the whole section to the shape above'],
  ])('asks for %s', (_, phrase) => {
    expect(stage3).toContain(phrase);
  });
});

// Backs the README step in /release: refresh first, and ask rather than stop or proceed
// silently when the page is still behind.
describe('the /release README stage', () => {
  const command = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../commands/release.md'),
    'utf8'
  );
  const stage = command.slice(
    command.indexOf('## Stage 1b'),
    command.indexOf('## Stage 2')
  ).replace(/\s+/g, ' ');

  it.each([
    ['it runs only after pre-flight', 'Only after pre-flight has passed'],
    ['manual skips the stage', 'At `manual`, skip this stage'],
    ['an unknown level still refreshes', 'or a level that is none of these — run `/refresh-readme`'],
    ['the push carries only the README commit', 'the push carries only that commit'],
    ['a refresh that could not judge is reported', 'stopped before it could judge the page, say why'],
    ['a README still behind asks', 'ask whether to release anyway'],
    ['a no stops the release', 'On no, stop'],
    ['a yes goes on and is remembered', 'On yes, go on, and remember what is behind for Stage 4'],
  ])('says %s', (_, phrase) => {
    expect(stage).toContain(phrase);
  });

  it('sits between pre-flight and scope', () => {
    const at = command.indexOf('## Stage 1b');
    expect(at).toBeGreaterThan(command.indexOf('## Stage 1 —'));
    expect(at).toBeLessThan(command.indexOf('## Stage 2'));
    expect(command).not.toContain('## Stage 0');
  });
});

describe('the pipeline offer', () => {
  const text = (rel) => readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '..', rel),
    'utf8',
  ).replace(/\s+/g, ' ');
  const bootstrap = text('commands/bootstrap.md');
  const update = text('commands/update.md');
  const workflow = text('framework/workflow.md');

  it('tells bootstrap where the caller template and the host commands are', () => {
    expect(bootstrap).toContain('.tropis/templates/pipeline-caller.yml');
    expect(bootstrap).toContain('pipeline.mjs commands');
  });

  it('tells an update how to offer the pipeline and how to adopt it', () => {
    expect(update).toContain('tropis-pipeline.yml');
    expect(update).toContain('project-pipeline.yml');
    for (const step of [
      "Move each check the project's CI runs today into",
      'List the prose in',
      'Push a branch, open a pull request, and read the run summary',
      'Once it is green, delete the old workflows whose work moved',
    ]) {
      expect(update).toContain(step);
    }
  });

  it('asks bootstrap for the gate, and never applies it', () => {
    expect(bootstrap).toContain(
      'gh api repos/<owner>/<name>/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json',
    );
    expect(bootstrap).toContain('Allow auto-merge');
    expect(bootstrap).toContain('"ungated": "<reason>"');
    expect(bootstrap).toContain('never run it yourself');
  });

  it('asks the update for the gate when the release brings the ruleset', () => {
    expect(update).toContain('.tropis/templates/main-branch-ruleset.json');
    expect(update).toContain('Never apply the ruleset yourself');
  });

  it('creates every branch in a worktree of its own, never in the main checkout', () => {
    expect(update).not.toContain('git switch -c');
    expect(update).toContain('-b update/<target> <the starting point>');
    expect(update).toContain('From here on, run every command in that worktree');
    expect(workflow).toContain(
      'A session creates its branch in a worktree of its own, never in the main checkout.',
    );
    expect(workflow).toContain('-b plan/<id>-<slug> origin/main');
  });

  it('release and refresh-board use a pull request on a gated main', () => {
    for (const command of [text('commands/release.md'), text('commands/refresh-board.md')]) {
      expect(
        command.includes('gh pr merge <N> --auto --squash') || command.includes('merges itself'),
      ).toBe(true);
    }
  });

  it('says an auto-merge does not wait where no check is required', () => {
    expect(workflow).toContain(
      'Where the host marks no check as required, its auto-merge merges at once.',
    );
  });
});

describe('the gate in the workflow', () => {
  const workflow = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../framework/workflow.md'),
    'utf8',
  ).replace(/\s+/g, ' ');

  it('says nothing goes directly to main where it is gated', () => {
    expect(workflow).toContain('Where the main branch is gated, nothing goes directly to');
  });

  it('names the pull request that merges itself', () => {
    expect(workflow).toContain('gh pr merge <N> --auto --squash');
  });

  it('has the dispatching session wait for the status change to merge', () => {
    expect(workflow).toContain('waits until it has merged before the executor starts');
  });

  it('sees a pull request set to merge itself through to a green main branch', () => {
    expect(workflow).toContain('then run `node .tropis/scripts/main-status.mjs --pull-request <N>`');
    expect(workflow).toContain('Setting auto-merge does not finish the job');
    const release = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../commands/release.md'),
      'utf8',
    ).replace(/\s+/g, ' ');
    expect(release.split('node .tropis/scripts/main-status.mjs --pull-request <N>').length - 1)
      .toBeGreaterThanOrEqual(2);
  });

  it('keeps the direct-to-main list for a main that is not gated', () => {
    expect(workflow).toContain('Where it is not gated, what may go directly to');
  });

  it('calls a check that passes on a rerun with nothing changed a bug', () => {
    expect(workflow).toContain('A check that passes on a rerun with nothing changed is a bug');
  });

  it('retries no failed check automatically', () => {
    expect(workflow).toContain('Nothing retries a failed check automatically');
  });

  it('leaves the remote branch to the host setting, since auto-merge deletes none', () => {
    expect(workflow).toContain('Automatically delete head branches');
  });
});

describe('the /release candidate', () => {
  const command = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../commands/release.md'),
    'utf8',
  );
  const workflow = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../framework/workflow.md'),
    'utf8',
  ).replace(/\s+/g, ' ');
  const stage = (from, to) => command.slice(
    command.indexOf(from),
    to ? command.indexOf(to) : command.length,
  ).replace(/\s+/g, ' ');

  it('runs candidate slot during pre-flight', () => {
    expect(stage('## Stage 1 —', '## Stage 1b')).toContain(
      'node .tropis/scripts/pipeline.mjs candidate slot',
    );
  });

  it('names both endings of the draft', () => {
    const stage3 = stage('## Stage 3', '## Stage 4');
    expect(stage3).toContain('Checked on the release candidate: no — no candidate was rehearsed');
    expect(stage3).toContain('Checked on the release candidate: (after the candidate)');
  });

  it('splits stage 6, and the filled branch names the manual-check change line', () => {
    const stage6 = stage('## Stage 6', '## Stage 7');
    const empty = stage6.slice(stage6.indexOf('Empty slot'), stage6.indexOf('Filled slot'));
    const filled = stage6.slice(stage6.indexOf('Filled slot'));
    expect(empty).toContain('release trigger');
    expect(filled).toContain('candidate trigger');
    expect(filled).toContain('release candidate at');
    expect(filled).not.toContain('release trigger');
  });

  it('prints the release trigger only after a pass, and stops on pending and fail', () => {
    expect(command.indexOf('## Stage 7')).toBeGreaterThan(command.indexOf('## Stage 6'));
    const stage7 = stage('## Stage 7');
    expect(stage7).toContain('release candidate at');
    const pending = stage7.slice(stage7.indexOf('pending'), stage7.indexOf('fail'));
    const failed = stage7.slice(stage7.indexOf('fail'), stage7.indexOf('`pass`'));
    const passed = stage7.slice(stage7.indexOf('`pass`'));
    expect(pending).not.toContain('release trigger');
    expect(failed).not.toContain('release trigger');
    expect(passed).toContain('release trigger');
    expect(pending.length).toBeGreaterThan(0);
    expect(failed.length).toBeGreaterThan(0);
  });

  it('states the release step in the workflow document', () => {
    expect(workflow).toContain('sets no version and makes no tag');
    expect(workflow).toContain('Nothing merged after the candidate reaches production through it');
    expect(workflow).toContain('changes no other file');
    expect(workflow).toContain('Only a tag of the form `vX.Y.Z` is a release');
  });

  it('the operator guide says how to apply the gate and how to opt out', () => {
    const guide = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../templates/README.md'),
      'utf8',
    ).replace(/\s+/g, ' ');
    expect(guide).toContain(
      'gh api repos/<owner>/<name>/rulesets -X POST --input .tropis/templates/main-branch-ruleset.json',
    );
    expect(guide).toContain('"ungated": "<the reason>"');
  });

  it('says only a vX.Y.Z tag counts as a release in the operator guide', () => {
    const guide = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../templates/README.md'),
      'utf8',
    ).replace(/\s+/g, ' ');
    expect(guide).toContain(
      'Only a tag of the form `vX.Y.Z`, such as `v1.4.0`, counts as a release',
    );
    expect(guide).not.toContain('highest tag matching `v*`');
  });
});

describe('the /release README stage outcomes', () => {
  const command = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../commands/release.md'),
    'utf8',
  );

  it('records every README outcome in the Stage 4 summary', () => {
    const stage4 = command.slice(
      command.indexOf('## Stage 4'),
      command.indexOf('## Stage 5')
    );
    for (const value of ['README: <refreshed', 'up to date', 'behind, released anyway', 'not kept by Tropis']) {
      expect(stage4).toContain(value);
    }
  });
});

describe('the /release last release', () => {
  const command = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../commands/release.md'),
    'utf8',
  );
  const stage2 = command.slice(command.indexOf('## Stage 2'), command.indexOf('## Stage 3'));
  const open = stage2.indexOf('```bash\n');
  const start = open + '```bash\n'.length;
  const body = stage2.slice(start, stage2.indexOf('\n```', start));

  const temps = [];
  afterEach(() => {
    for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function repo() {
    const dir = mkdtempSync(join(tmpdir(), 'tropis-last-release-'));
    temps.push(dir);
    const git = (...args) => {
      const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
        cwd: dir,
        encoding: 'utf8',
      });
      if (result.status !== 0) throw new Error(`${args.join(' ')}\n${result.stderr}`);
    };
    git('init', '-q', '-b', 'main');
    return { dir, git };
  }

  function run(dir) {
    return spawnSync('bash', ['-c', body], { cwd: dir, encoding: 'utf8' });
  }

  it('counts from the last vX.Y.Z tag, past pre-release tags after it', () => {
    const { dir, git } = repo();
    git('commit', '--allow-empty', '-qm', 'a');
    git('tag', 'v1.0.0-rc.1');
    git('commit', '--allow-empty', '-qm', 'b');
    git('tag', 'v1.0.0');
    git('commit', '--allow-empty', '-qm', 'c');
    git('tag', 'v1.1.0-rc.1');
    git('commit', '--allow-empty', '-qm', 'd');
    git('tag', 'v2');
    expect(run(dir).stdout).toBe('v1.0.0\n');
  });

  it('says there is no previous release when only other tags exist', () => {
    const { dir, git } = repo();
    git('commit', '--allow-empty', '-qm', 'only');
    git('tag', 'v1.0.0-rc.1');
    expect(run(dir).stdout).toBe('NO_PREVIOUS_TAG\n');
  });

  it('leaves out a release the commit does not contain', () => {
    const { dir, git } = repo();
    git('commit', '--allow-empty', '-qm', 'a');
    git('tag', 'v1.0.0');
    git('branch', 'other');
    git('checkout', '-q', 'other');
    git('commit', '--allow-empty', '-qm', 'side');
    git('tag', 'v1.1.0');
    git('checkout', '-q', 'main');
    git('commit', '--allow-empty', '-qm', 'later');
    expect(run(dir).stdout).toBe('v1.0.0\n');
  });

  it('says the last release is the highest vX.Y.Z tag this commit contains', () => {
    expect(stage2.replace(/\s+/g, ' ')).toContain(
      'the highest tag of the form `vX.Y.Z` that this commit contains',
    );
  });
});
