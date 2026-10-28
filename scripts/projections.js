// Shared machinery: no part of this file is project-owned.
/**
 * The files the rule generator writes from a source file; empty when the path is not one.
 *
 * One answer, read by two things: the plan checks that refuse a plan listing a source
 * without what is written from it, and the guard that compares the two. A plan whose file
 * list names the rule but not what the generator writes forbids the regeneration the
 * generation guard then demands — a list written from memory got that pairing wrong in
 * two of three consecutive plans, despite a rule stating it. Kept here, not restated in
 * the checks, so the checks cannot drift from what the generator actually writes.
 *
 * - `.claude/rules/<n>.md` (a project's own rule, or a generated shipped one) → its Cursor file;
 * - `.claude/rule-additions/<n>.md` → the shipped rule's Claude Code file and its Cursor file;
 * - `.tropis/rules/<n>.md` (a shipped text) → its Claude Code file and its Cursor file.
 *   A top-level `rules/` folder is not one: nothing generates from it, and in the
 *   framework's own repository it is the next release's source;
 * - `.claude/rule-areas.json` writes nothing by name: it changes every shipped rule's two
 *   files, which the plan check asks for from the list of shipped rules (see plan-binding.js).
 *
 * Pure — a repository-relative path in, paths out.
 *
 * @param {string} path
 * @returns {string[]}
 */
export function projectionOf(path) {
  if (path.includes('*')) return [];
  const own = /^\.claude\/rules\/([^/]+)\.md$/.exec(path);
  if (own) return [`.cursor/rules/${own[1]}.mdc`];
  const added = /^\.claude\/rule-additions\/([^/]+)\.md$/.exec(path);
  if (added) return [`.claude/rules/${added[1]}.md`, `.cursor/rules/${added[1]}.mdc`];
  const shipped = /^\.tropis\/rules\/([^/]+)\.md$/.exec(path);
  return shipped ? [`.claude/rules/${shipped[1]}.md`, `.cursor/rules/${shipped[1]}.mdc`] : [];
}

/** The path of the file that holds every shipped rule's area. */
export const AREAS_FILE = '.claude/rule-areas.json';
