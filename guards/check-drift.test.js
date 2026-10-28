// Level: unit
/**
 * check-drift.sh tells a project's legitimate changes from drift.
 *
 * A command's block marked project-owned (such as those `release.md` marks) is expected
 * to differ, and so is reworded commentary. A fix applied to shared machinery on one side only is drift. Before the
 * markers, both looked like "the files differ", and the same defect in the rule hook
 * (since removed) was fixed twice, differently, while the copy that seeds new projects
 * carried it through both.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scripts = resolve(here, '../scripts');
const checker = join(scripts, 'check-drift.sh');

/** A project holding unchanged copies of the rule-writing hook and the backlog report. */
function project() {
  const dir = mkdtempSync(join(tmpdir(), 'drift-'));
  mkdirSync(join(dir, '.tropis/hooks'), { recursive: true });
  mkdirSync(join(dir, '.tropis/scripts'));
  copyFileSync(join(scripts, 'capture-at-write.sh'), join(dir, '.tropis/hooks/capture-at-write.sh'));
  copyFileSync(join(scripts, 'next.mjs'), join(dir, '.tropis/scripts/next.mjs'));
  return dir;
}

function edit(dir, rel, from, to) {
  const file = join(dir, rel);
  const text = readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`fixture out of date: ${rel} has no ${from}`);
  writeFileSync(file, text.replace(from, to));
}

function check(dir) {
  return spawnSync('bash', [checker, dir], { encoding: 'utf8' });
}

describe('drift check', () => {
  it('reports unchanged copies as clean', () => {
    const dir = project();
    try {
      expect(check(dir).status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports reworded comments as clean', () => {
    const dir = project();
    try {
      edit(dir, '.tropis/hooks/capture-at-write.sh', '# Fires when a rule', '# Our own wording: fires when a rule');
      const r = check(dir);
      expect(r.stdout).not.toContain('DRIFTED');
      expect(r.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports a file resolved against the working directory as drift', () => {
    // The first 2026-09-09 defect, in the rule hook since removed: a relative rules
    // directory missed from every subdirectory, silently. The same shape here.
    const dir = project();
    try {
      edit(dir, '.tropis/hooks/capture-at-write.sh', 'src="$project_root/.claude/commands/capture-learning.md"', 'src=".claude/commands/capture-learning.md"');
      const r = check(dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('DRIFTED  .tropis/hooks/capture-at-write.sh');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports a payload read from the wrong envelope as drift', () => {
    // The second: reading only the top-level file_path, which Claude Code never sends.
    const dir = project();
    try {
      edit(dir, '.tropis/hooks/capture-at-write.sh', "print(data.get('file_path', '') or (nested.get('file_path', '') if isinstance(nested, dict) else '') or '')", "print(data.get('file_path', ''))");
      const r = check(dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('DRIFTED  .tropis/hooks/capture-at-write.sh');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('says what to do about drift where the report is read', () => {
    const dir = project();
    try {
      edit(dir, '.tropis/scripts/next.mjs', "console.log('Ready to start');", "console.log('Ready');");
      const r = check(dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('DRIFTED  .tropis/scripts/next.mjs');
      expect(r.stdout).toContain('upstream queue');
      expect(r.stdout).toContain('project-owned region');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('finds a declaration of what is shared in every script the blueprint ships', () => {
    const undeclared = readdirSync(scripts)
      .filter((f) => /\.(sh|mjs|js)$/.test(f))
      .filter((f) => !readFileSync(join(scripts, f), 'utf8').includes('Shared machinery'));
    expect(undeclared).toEqual([]);
  });
});
