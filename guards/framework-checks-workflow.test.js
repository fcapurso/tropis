// Level: unit
/**
 * The framework checks job a project gets can read origin/main.
 *
 * review-record and catalog-drift ask origin/main whether a plan's handover was already
 * merged, and fail closed when they cannot read it. A shallow checkout cannot, so every
 * executing branch would be red from its handover until its review record. Full history
 * is what lets their exemption for the executing branch apply on a pull request.
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
