// Level: unit
/**
 * The project's entry instructions live in AGENTS.md, and CLAUDE.md is the single
 * line that points at it.
 *
 * The root is the project under test: FRAMEWORK_ROOT when the self-check points it at
 * a composed fixture, otherwise two levels above this file, which is where it sits
 * once installed at `.tropis/guards/`.
 *
 * AGENTS.md must be a regular file holding the instructions, not a link and not an import
 * line, because an update once emptied a project that had either.
 */
import { lstatSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.FRAMEWORK_ROOT ?? resolve(here, '../..');

const AGENTS_MISSING =
  'AGENTS.md is missing. It holds this project\'s entry instructions; CLAUDE.md points at it.';

const AGENTS_SYMLINK =
  'AGENTS.md is a symlink. It must be a regular file holding this project\'s entry instructions, with CLAUDE.md the single line @AGENTS.md. Replace the link with the text it points at. If an update has already left both files as @AGENTS.md, restore the instructions from the last commit before that update (git log -p -- AGENTS.md CLAUDE.md shows it), then commit.';

const AGENTS_IMPORT =
  'AGENTS.md is a single import line, so it holds none of this project\'s entry instructions. It must be a regular file holding them, with CLAUDE.md the single line @AGENTS.md. Put the instructions back in AGENTS.md; if an update emptied it, restore them from the last commit before that update (git log -p -- AGENTS.md CLAUDE.md shows it), then commit.';

const CLAUDE_WRONG =
  'CLAUDE.md must be the single line @AGENTS.md. The entry instructions live in AGENTS.md: move anything else in CLAUDE.md there, then make CLAUDE.md that one line.';

function agentsProblem() {
  const path = join(root, 'AGENTS.md');
  let link;
  try {
    link = lstatSync(path);
  } catch (e) {
    if (e.code === 'ENOENT') return AGENTS_MISSING;
    throw e;
  }
  if (link.isSymbolicLink()) return AGENTS_SYMLINK;
  let text = readFileSync(path, 'utf8');
  if (text.endsWith('\n')) text = text.slice(0, -1);
  if (/^@\S+$/.test(text)) return AGENTS_IMPORT;
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
