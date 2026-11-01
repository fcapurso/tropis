// Level: unit
/**
 * The prerequisite check refuses a Node the guards cannot run on.
 *
 * Jest, which runs the guards, accepts Node 18 only from 18.14, so the check must too:
 * otherwise a machine on 18.0 to 18.13 passes setup and fails at the first guard. This
 * runs the shipped script from a scratch .tropis/scripts/, with stubs for node, git and
 * python3 first on PATH, so the version under test is the one the stub reports.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '../scripts/check-prerequisites.sh');

const STUBS = {
  node: 'echo "v$STUB_NODE_VERSION"',
  git: 'echo "git version 2.49.0"',
  python3: 'echo "Python 3.12.0"',
};

describe('the prerequisite check and the Node version', () => {
  let dir;
  let bin;
  let installed;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'check-prerequisites-'));
    bin = join(dir, 'bin');
    mkdirSync(bin);
    for (const [name, body] of Object.entries(STUBS)) {
      writeFileSync(join(bin, name), `#!/usr/bin/env bash\n${body}\n`);
      chmodSync(join(bin, name), 0o755);
    }
    // Installed at .tropis/scripts/ in a project with no feature-catalog.yaml, so the
    // check never asks the stub node to resolve the yaml package.
    mkdirSync(join(dir, 'project/.tropis/scripts'), { recursive: true });
    installed = join(dir, 'project/.tropis/scripts/check-prerequisites.sh');
    copyFileSync(script, installed);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (version) =>
    spawnSync('/bin/bash', [installed], {
      env: { PATH: `${bin}:${process.env.PATH}`, STUB_NODE_VERSION: version },
      encoding: 'utf8',
    });

  it.each(['18.14.0', '18.20.4', '20.0.0', '22.15.0'])('accepts node %s', (version) => {
    const r = run(version);
    expect({ status: r.status, out: r.stdout }).toEqual({
      status: 0,
      out: expect.stringMatching(new RegExp(`ok +node +${version.replace(/\./g, '\\.')} `)),
    });
  });

  it.each(['18.0.0', '18.13.0', '16.20.2'])('refuses node %s and says 18.14 is needed', (version) => {
    const r = run(version);
    expect({ status: r.status, out: r.stdout }).toEqual({
      status: 1,
      out: expect.stringContaining(`MISSING  node       found ${version}, need 18.14 or newer`),
    });
  });
});
