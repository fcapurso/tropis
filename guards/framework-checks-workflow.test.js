// Level: unit
/**
 * The framework checks job a project gets can read origin/main.
 *
 * review-record and catalog-drift ask origin/main whether a plan's handover was already
 * merged, and fail closed when they cannot read it. A shallow checkout cannot, so every
 * executing branch would be red from its handover until its review record. Full history
 * is what lets their exemption for the executing branch apply on a pull request.
 *
 * Also: every job in the three shipped workflows that sets up Node and installs, or runs
 * the project's commands, turns the npm cache on keyed on its lock files, only when one
 * exists; plan, host and gate leave it off.
 *
 * Checks the template in this repository, not a project: it is not installed.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const template = resolve(here, '../templates/github/tropis-framework-checks.yml');

describe('the framework checks workflow', () => {
  it('checks out full history at the requested ref', () => {
    const workflow = YAML.parse(readFileSync(template, 'utf8'));
    const checkout = workflow.jobs.checks.steps.find((s) => /^actions\/checkout@/.test(s.uses ?? ''));
    expect(checkout).toBeDefined();
    expect(checkout.with['fetch-depth']).toBe(0);
    expect(checkout.with.ref).toBe('${{ inputs.ref }}');
  });
});

const workflows = ['tropis-pipeline.yml', 'tropis-staging.yml', 'tropis-framework-checks.yml'];
const parse = (name) => YAML.parse(readFileSync(resolve(here, '../templates/github', name), 'utf8'));
const NO_INSTALL = ['plan', 'host', 'gate'];
const PROJECT_LOCKS = ['**/package-lock.json', '**/npm-shrinkwrap.json', '!.tropis/**', '!**/node_modules/**'];
const FRAMEWORK_LOCKS = ['.tropis/package-lock.json'];
const cacheOf = (patterns) =>
  `\${{ hashFiles(${patterns.map((p) => `'${p}'`).join(', ')}) != '' && 'npm' || '' }}`;
const setupNodeSteps = () =>
  workflows.flatMap((name) =>
    Object.entries(parse(name).jobs).flatMap(([job, body]) =>
      (body.steps ?? [])
        .filter((s) => /^actions\/setup-node@/.test(s.uses ?? ''))
        .map((step) => ({ name, job, step })),
    ),
  );

describe('the npm cache in the shipped workflows', () => {
  it('finds a setup-node step in every workflow', () => {
    const seen = new Set(setupNodeSteps().map((s) => s.name));
    expect([...seen].sort()).toEqual([...workflows].sort());
  });

  it('is on in every job that installs or runs the project, keyed on its lock files', () => {
    for (const { name, job, step } of setupNodeSteps()) {
      if (NO_INSTALL.includes(job) && name === 'tropis-pipeline.yml') continue;
      const locks = name === 'tropis-framework-checks.yml' ? FRAMEWORK_LOCKS : PROJECT_LOCKS;
      const where = `${name} ${job}`;
      expect({ where, cache: step.with?.cache }).toEqual({ where, cache: cacheOf(locks) });
      const paths = String(step.with?.['cache-dependency-path'] ?? '').split('\n').filter(Boolean);
      expect({ where, paths }).toEqual({ where, paths: locks });
    }
  });

  it('is off in plan, host and gate, which install nothing', () => {
    const jobs = parse('tropis-pipeline.yml').jobs;
    for (const job of NO_INSTALL) {
      const step = jobs[job].steps.find((s) => /^actions\/setup-node@/.test(s.uses ?? ''));
      expect({ job, cache: step.with.cache }).toEqual({ job, cache: undefined });
      expect({ job, path: step.with['cache-dependency-path'] }).toEqual({ job, path: undefined });
    }
  });
});
