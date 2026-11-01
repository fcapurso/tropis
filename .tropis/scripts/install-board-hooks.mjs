// Shared machinery: no part of this file is project-owned.
/**
 * Install the git hooks that keep the backlog board's page current. Runs as the
 * framework package's `prepare` script, so every `npm --prefix .tropis install` and
 * `ci` calls it, with `.tropis/` as the working directory.
 *
 * Writes post-commit, post-merge, post-checkout and post-rewrite into the repository's
 * hooks folder, each a one-line rebuild of the page. A hook file that does not carry
 * the marker is the project's and is left alone; so is everything when core.hooksPath
 * is set. In both cases the line to add by hand is printed. Writes nothing unless the
 * project's folder is the top of its own git repository, so an install inside a
 * repository the project merely sits in cannot touch that repository's hooks.
 *
 * Always exits 0: a failed board must never fail an install of the framework package.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const MARKER = 'tropis-backlog-board';
const HOOKS = ['post-commit', 'post-merge', 'post-checkout', 'post-rewrite'];

const HOOK = `#!/bin/sh
# ${MARKER}: written by .tropis/scripts/install-board-hooks.mjs at each npm --prefix .tropis install.
# Rebuilds the backlog board, docs/backlog-board/index.html, from the backlog as checked out. Never fails or prints.
[ -d .tropis/node_modules ] || exit 0
node .tropis/scripts/build-backlog-board.mjs >/dev/null 2>&1
exit 0
`;

const PROJECT_LINE =
  '  [ -d .tropis/node_modules ] && node .tropis/scripts/build-backlog-board.mjs >/dev/null 2>&1 || true';

function git(...args) {
  const run = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return run.status === 0 ? run.stdout.trim() : null;
}

function buildOnce() {
  spawnSync('node', [resolve(here, 'build-backlog-board.mjs')], { cwd: root, stdio: 'ignore' });
}

function install() {
  const top = git('rev-parse', '--show-toplevel');
  if (top === null || realpathSync(top) !== realpathSync(root)) {
    console.log(
      "Backlog board: no git hooks written, because this project's folder is not the top of a git repository. npm --prefix .tropis run board rebuilds the page.",
    );
    return;
  }

  const hooksPath = git('config', '--get', 'core.hooksPath');
  if (hooksPath) {
    console.log(
      'Backlog board: core.hooksPath is set, so no git hook was written. To rebuild the board at each commit, merge, checkout and rebase, add this line to the post-commit, post-merge, post-checkout and post-rewrite hooks there:',
    );
    console.log(PROJECT_LINE);
    return;
  }

  const folder = resolve(root, git('rev-parse', '--git-path', 'hooks'));
  mkdirSync(folder, { recursive: true });
  let ours = 0;
  for (const name of HOOKS) {
    const file = resolve(folder, name);
    const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (current === null || current.includes(MARKER)) {
      if (current !== HOOK) writeFileSync(file, HOOK);
      chmodSync(file, 0o755);
      ours += 1;
    } else {
      console.log(`Backlog board: left your ${name} hook as it is. To rebuild the board from it, add:`);
      console.log(PROJECT_LINE);
    }
  }
  if (ours > 0) console.log('Backlog board: rebuilds itself at each commit, merge, checkout and rebase.');
}

try {
  install();
} catch (error) {
  console.error(`Backlog board: ${error.message}`);
}
try {
  buildOnce();
} catch {
  // The page is a convenience; the install goes on without it.
}
process.exit(0);
