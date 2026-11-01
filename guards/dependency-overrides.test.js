// Level: unit
/**
 * Every `overrides` entry in templates/package.json is a workaround with a reason and a
 * way to tell when it is no longer needed. This guard holds both, and fails on the day
 * the workaround can go: the package that pulled in the old version now asks for the
 * overridden one itself, or no longer depends on it at all. It also fails on an override
 * listed here but absent from the template, and on one in the template with no entry here.
 *
 * Reads the template from FRAMEWORK_ROOT, and the dependent's own package.json from the
 * node_modules beside this file: the self-check's test tools, installed from that
 * template. Those tools come from templates/package-lock.json, so the guard fails on the
 * first regeneration of that lockfile after the dependent catches up.
 * Skips outside the blueprint tree.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '..');

function isBlueprintTree(dir) {
  return (
    existsSync(join(dir, 'bootstrap.md')) &&
    existsSync(join(dir, 'framework/workflow.md')) &&
    existsSync(join(dir, 'commands')) &&
    existsSync(join(dir, 'README.md'))
  );
}

/**
 * One entry per override in templates/package.json: `via` is the package whose own
 * dependency on the overridden one is too old. Remove the override and its entry together.
 */
export const OVERRIDES = {
  'test-exclude': {
    via: 'babel-plugin-istanbul',
    why:
      'Jest 30 reaches test-exclude 7 through babel-plugin-istanbul, and test-exclude 7 ' +
      'pulls in a glob release npm marks deprecated, whose notice carries its author\'s ' +
      'email address into every project\'s .tropis/package-lock.json. test-exclude 8 uses a ' +
      'current glob.',
  },
};

const major = (range) => {
  const m = String(range).match(/\d+/);
  return m ? Number(m[0]) : null;
};

/**
 * Why an override can be removed, or null while it is still needed. `wanted` is the
 * override's range; `declared` is the range the dependent asks for, undefined when the
 * dependent no longer depends on the package.
 */
export function staleReason(name, { via }, wanted, declared) {
  if (declared === undefined) {
    return `${via} no longer depends on ${name}: remove the "${name}" override from ` +
      'templates/package.json and its entry in guards/dependency-overrides.test.js.';
  }
  if (major(declared) !== null && major(declared) >= major(wanted)) {
    return `${via} now asks for ${name} ${declared} itself, which the override ${wanted} ` +
      `was there to force: remove the "${name}" override from templates/package.json and ` +
      'its entry in guards/dependency-overrides.test.js.';
  }
  return null;
}

/** The ranges `via` declares, from the installed copy; null when it is not installed. */
function declaredDependencies(via) {
  try {
    const require = createRequire(join(here, 'package.json'));
    const pkg = JSON.parse(readFileSync(require.resolve(`${via}/package.json`), 'utf8'));
    return pkg.dependencies ?? {};
  } catch {
    return null;
  }
}

describe('staleReason', () => {
  const entry = { via: 'parent' };
  it('is null while the dependent asks for an older major', () => {
    expect(staleReason('child', entry, '^8.0.0', '^7.0.1')).toBeNull();
  });
  it('names the removal once the dependent asks for the overridden major', () => {
    expect(staleReason('child', entry, '^8.0.0', '^8.1.0')).toMatch(/now asks for child \^8\.1\.0/);
  });
  it('names the removal once the dependent drops the package', () => {
    expect(staleReason('child', entry, '^8.0.0', undefined)).toMatch(/no longer depends on child/);
  });
});

const blueprint = isBlueprintTree(root);

describe('dependency overrides in templates/package.json', () => {
  if (!blueprint) {
    it('skips outside the blueprint tree', () => {
      if (process.env.TROPIS_EXPECT_FRAMEWORK) {
        throw new Error(`Expected the framework repository at ${root}`);
      }
      expect(blueprint).toBe(false);
    });
    return;
  }
  const template = JSON.parse(readFileSync(join(root, 'templates', 'package.json'), 'utf8'));
  const overrides = template.overrides ?? {};

  it('lists every override here, and only those', () => {
    expect(Object.keys(overrides).sort()).toEqual(Object.keys(OVERRIDES).sort());
  });

  it.each(Object.entries(OVERRIDES))('%s is still needed', (name, entry) => {
    const deps = declaredDependencies(entry.via);
    if (deps === null) {
      throw new Error(
        `${entry.via} is not installed beside this guard, so nothing reaches ${name} ` +
          `through it: remove the "${name}" override from templates/package.json and its entry here.`,
      );
    }
    expect(staleReason(name, entry, overrides[name], deps[name])).toBeNull();
  });
});
