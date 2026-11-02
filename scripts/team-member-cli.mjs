#!/usr/bin/env node
// Shared machinery: no part of this file is project-owned.
/**
 * What a sprint needs to start a team member in Claude Code's or Cursor's command line,
 * and to judge how the run ended (decisions FW-050, FW-053 and the one that follows
 * FW-055). `sprint.mjs` is the only importer; this file imports nothing from it. Plain
 * functions and constants, so a third tool is a third key in TOOLS.
 *
 * The exact command lines, the grants and the environment are the contract with the two
 * tools: a command line run cannot ask anyone, so it runs on listed commands only, never
 * a shell, and with every API key removed, so it bills the developer's plan and nothing
 * else.
 */

export const TOOLS = {
  claude: { command: 'claude', name: 'Claude Code' },
  cursor: { command: 'cursor-agent', name: 'Cursor' },
};

/** Commands the workflow runs and read-only helpers. Never a shell, rm or curl. */
export const GRANTED_COMMANDS = [
  'git', 'gh', 'node', 'npm', 'npx',
  'ls', 'cat', 'head', 'tail', 'grep', 'wc', 'diff', 'mkdir', 'date', 'uname',
];

/** Claude Code's rules: each command bare and with arguments, and the project's scripts. */
export function claudeRules() {
  return [
    ...GRANTED_COMMANDS.flatMap((c) => [`Bash(${c})`, `Bash(${c} *)`]),
    'Bash(bash scripts/*)',
    'Bash(bash .tropis/*)',
  ];
}

/** The content of `.cursor/cli.json` for a run started by the sprint. */
export function cursorGrants() {
  return { permissions: { allow: GRANTED_COMMANDS.map((c) => `Shell(${c})`), deny: [] } };
}

/**
 * The command and arguments for one print-mode run. `--allowedTools` takes a variadic
 * list, so the rules go as one comma-joined argument and a later flag ends it.
 * Never `--bare`, `--dangerously-skip-permissions`, `--force` or `--yolo`.
 */
export function commandLine(tool, { prompt, model } = {}) {
  const { command } = TOOLS[tool];
  const args = tool === 'claude'
    ? ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
      '--setting-sources', 'project', '--allowedTools', claudeRules().join(',')]
    : ['-p', prompt, '--output-format', 'stream-json', '--trust'];
  if (model) args.push('--model', model);
  return { command, args };
}

const KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CURSOR_API_KEY'];

/** A copy of `env` without the keys that would bill per use instead of the plan. */
export function agentEnv(env) {
  const copy = { ...env };
  for (const key of KEYS) delete copy[key];
  return copy;
}

/**
 * Reads a run's log, which also holds the launcher's own lines: lines that are not JSON
 * are skipped. `sessionId` is the first one any event carries, `result` the last event
 * of type `result`.
 */
export function readRun(logText) {
  let sessionId = null;
  let result = null;
  for (const line of String(logText).split('\n')) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (!event || typeof event !== 'object') continue;
    if (sessionId === null && event.session_id) sessionId = event.session_id;
    if (event.type === 'result') result = event;
  }
  return { sessionId, result };
}

/** The agent's last line when it is SHIPPED, PARKED: <why> or STOPPED: <why>; else null. */
export function finalLine(text) {
  const last = String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).pop();
  if (!last) return null;
  const line = last.replace(/^[*`]+|[*`]+$/g, '').trim();
  if (line === 'SHIPPED') return line;
  return /^(PARKED|STOPPED): \S/.test(line) ? line : null;
}

const firstLine = (text) => String(text ?? '').split('\n').map((l) => l.trim()).find(Boolean);

const describeDenial = (d) => (d.tool_input?.command ? `${d.tool_name}(${d.tool_input.command})` : d.tool_name);

/**
 * How the run ended, from what it reported and what origin/main shows: the first rule
 * that applies. `denied` lists the permission denials Claude Code reports, and is added
 * to any line that is not SHIPPED.
 * @returns {{ line: string, denied: string[] }}
 */
export function judge({ tool, id, exit, run, entryStatus }) {
  const name = TOOLS[tool].name;
  const result = run.result;
  const denied = [...new Set((result?.permission_denials ?? []).map(describeDenial))];
  let line;
  if (!result) {
    line = `STOPPED: ${name} ended without a result (exit ${exit})`;
  } else if (result.is_error) {
    line = `STOPPED: ${name} reported an error — ${firstLine(result.result) ?? result.subtype}`;
  } else {
    const final = finalLine(result.result);
    if (final === null) line = `STOPPED: ${name} ended without SHIPPED, PARKED or STOPPED as its last line`;
    else if (final === 'SHIPPED' && entryStatus !== 'shipped') {
      line = `STOPPED: it said SHIPPED, but origin/main shows ${id} as ${entryStatus ?? 'missing'}`;
    } else line = final;
  }
  if (line !== 'SHIPPED' && denied.length) line += ` — denied: ${denied.join('; ')}`;
  return { line, denied };
}

/** The command that opens a finished run's session in the tool. */
export function openCommand(tool, worktree, sessionId) {
  return `cd ${worktree} && ${TOOLS[tool].command} --resume ${sessionId}`;
}
