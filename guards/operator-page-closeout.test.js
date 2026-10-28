// Level: unit
/**
 * Locks the two narrow README closeout rows.
 *
 * Skips when the tree under test is not the blueprint (adopting projects and
 * conformance fixtures). Those trees have workflow.md under .claude/framework/
 * or none.
 */
import { readFileSync, existsSync } from 'node:fs';
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

const blueprint = isBlueprintTree(root);
const workflow = blueprint
  ? readFileSync(join(root, 'framework/workflow.md'), 'utf8')
  : '';
const planning = blueprint
  ? readFileSync(join(root, 'rules/planning.md'), 'utf8')
  : '';

describe('operator-page closeout', () => {
  if (!blueprint) {
    it('skips outside the blueprint tree', () => {
      // The self-check sets this where it runs this guard on the framework repository, so a
      // layout change that stops the tree being recognised fails instead of passing silently.
      expect(process.env.TROPIS_EXPECT_FRAMEWORK ?? '').toBe('');
      expect(blueprint).toBe(false);
    });
    return;
  }

  it("names the project's operator guide for what a developer of the project is told", () => {
    expect(workflow).toMatch(
      /alters what someone developing the project is told about working with the framework[^\n]*\| the project's operator guide/,
    );
  });

  it("sends the product's README to /refresh-readme, not to each plan", () => {
    expect(workflow).toMatch(
      /alters what the product's users are told to do or how they start \| nothing in the plan[^\n]*`\/refresh-readme`[^\n]*A plan does not patch it/,
    );
    expect(workflow).not.toMatch(/adopter is told/);
  });

  it('does not impose a blanket project-or-blueprint → README obligation', () => {
    expect(workflow).not.toMatch(
      /any (project|framework|blueprint) change.*README/i,
    );
  });

  it('lets a plan correct a README reference to what it removed or renamed, and nothing more', () => {
    expect(workflow).toMatch(/A plan does not patch it, except to correct a command, file or link the README names that the plan removed or renamed — correcting the reference and adding nothing \|/);
    expect(planning).toMatch(/corrects that\s+reference in `README\.md`, and adds nothing else/);
  });

  it('tells plan authors that a plan does not patch the README', () => {
    expect(planning).toMatch(/5\. If the plan changes what someone developing the project is told[\s\S]*?A plan does not\s+patch the product's README/);
  });
});
