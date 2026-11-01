// Level: integration
/**
 * `scripts/check-conformance.sh` keeps the output of every run that counts against the
 * self-check, and names a failing test from the run that failed, not from a second run.
 * Not installed into projects.
 *
 * The test runner is replaced by a stub, so the outcome of each run is chosen here.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const blueprint = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SLOW = 120000;
const CHILD = SLOW - 20000;

/**
 * With an argument (a guard name), the stub passes on that argument's odd-numbered calls
 * and fails on the even ones: each case runs clean, then planted. Without one it is the
 * clean baseline, which fails only on its first call unless `baselineAlwaysPasses`.
 */
function stubText({ baselineAlwaysPasses }) {
  return `#!/bin/bash
arg="\${1:-baseline}"
echo "$arg" >> "$CALLS"
n=$(grep -cxF -- "$arg" "$CALLS")
if [ "$arg" = baseline ]; then
  if [ "${baselineAlwaysPasses}" = true ] || [ "$n" -gt 1 ]; then exit 0; fi
  echo "  ● stub suite › fails only the first time"
  echo "FIRST-BASELINE-OUTPUT"
  exit 1
fi
if [ $((n % 2)) -eq 1 ]; then exit 0; fi
echo "  ● $arg › planted defect"
exit 1
`;
}

const scratch = [];
afterAll(() => { for (const d of scratch) rmSync(d, { recursive: true, force: true }); });

function conformance({ baselineAlwaysPasses = false, env = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'conformance-output-'));
  scratch.push(dir);
  const stub = join(dir, 'stub.sh');
  writeFileSync(stub, stubText({ baselineAlwaysPasses }));
  chmodSync(stub, 0o755);
  const temp = join(dir, 'tmp');
  mkdirSync(temp);
  const logs = join(dir, 'logs');
  const calls = join(dir, 'calls');
  writeFileSync(calls, '');
  const childEnv = { ...process.env, ...env };
  delete childEnv.FRAMEWORK_ROOT;
  delete childEnv.GITHUB_ACTIONS;
  Object.assign(childEnv, env, {
    FIXTURES: join(blueprint, 'fixtures'),
    SCRIPTS: join(blueprint, 'scripts'),
    INSTRUCTIONS: '',
    TMPDIR: temp,
    LOGS: logs,
    CASES: 'orphan-rule:rule-areas',
    TEST_CMD: `bash ${stub}`,
    CALLS: calls,
  });
  const r = spawnSync('bash', [join(blueprint, 'scripts/check-conformance.sh')], {
    cwd: blueprint, env: childEnv, encoding: 'utf8', timeout: CHILD, killSignal: 'SIGKILL',
  });
  const callLines = readFileSync(calls, 'utf8').split('\n').filter(Boolean);
  return { r, logs, callLines };
}

describe('check-conformance.sh keeps the output of a run that counts against the self-check', () => {
  test('a clean baseline that fails is named from that run, which is not repeated', () => {
    const { r, logs, callLines } = conformance();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('● stub suite › fails only the first time');
    expect(r.stdout).toContain(logs);
    expect(callLines.filter((c) => c === 'baseline')).toHaveLength(1);
    expect(readFileSync(join(logs, 'clean-baseline.log'), 'utf8')).toContain('FIRST-BASELINE-OUTPUT');
  }, SLOW);

  test('on GitHub Actions each kept log is printed in a group', () => {
    const { r } = conformance({ env: { GITHUB_ACTIONS: 'true' } });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('::group::clean-baseline.log');
    expect(r.stdout).toContain('FIRST-BASELINE-OUTPUT');
    expect(r.stdout).toContain('::endgroup::');
  }, SLOW);

  test('a passing run leaves no folder of logs', () => {
    const { r, logs } = conformance({ baselineAlwaysPasses: true });
    expect(r.status).toBe(0);
    expect(existsSync(logs)).toBe(false);
  }, SLOW);
});
