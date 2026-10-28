// Level: unit
/**
 * The project's entry instructions live in AGENTS.md, and CLAUDE.md is the single
 * line that points at it.
 *
 * The root is the project under test: FRAMEWORK_ROOT when the self-check points it at
 * a composed fixture, otherwise two levels above this file, which is where it sits
 * once installed at `.tropis/guards/`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');

const AGENTS_MISSING =
  'AGENTS.md is missing. It holds this project\'s entry instructions; CLAUDE.md points at it.';

const CLAUDE_WRONG =
  'CLAUDE.md must be the single line @AGENTS.md. The entry instructions live in AGENTS.md: move anything else in CLAUDE.md there, then make CLAUDE.md that one line.';

function agentsProblem() {
  if (!existsSync(join(root, 'AGENTS.md'))) return AGENTS_MISSING;
  return null;
}

/** Missing counts as wrong. One trailing newline is optional; anything else is not. */
function claudeProblem() {
  let text;
  try {
    text = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
  } catch {
    text = null;
  }
  if (typeof text === 'string' && text.endsWith('\n')) text = text.slice(0, -1);
  if (text !== '@AGENTS.md') return CLAUDE_WRONG;
  return null;
}

describe('entry file', () => {
  it('keeps the entry instructions in AGENTS.md', () => {
    expect(agentsProblem()).toBeNull();
  });

  it('points CLAUDE.md at AGENTS.md with a single line', () => {
    expect(claudeProblem()).toBeNull();
  });
});
