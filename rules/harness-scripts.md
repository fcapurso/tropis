# Framework script rules (.tropis/)
<!-- layer: framework -->

The hooks and the small programs behind the commands. They are executed by every later
session and almost never read, so a defect here is silent by construction.

- **A hook that emits nothing looks exactly like a hook with nothing to say.** Every
  failure mode in this directory has this shape, so the test for a hook is never "does
  it produce the right output for a good input" — it is "does it fail when the
  mechanism breaks". Assert against a payload the tool actually sends, and check the
  test goes red with the fix reverted. In the project this came from, two total, silent
  failures shipped in one script while the guard written to prove it worked passed
  against both.
- **Read the target path from both envelope shapes.** Claude Code puts it at
  `tool_input.file_path` — its hook-input schema has no top-level `file_path` at all —
  while tests and other callers often pass one at the top level. Read
  `data.get('file_path') or data.get('tool_input', {}).get('file_path')`. Reading only
  the top level makes every live invocation resolve an empty path and exit 0 having
  done nothing.
- **Resolve paths against the repository root, never the working directory** —
  `git rev-parse --show-toplevel`, falling back to the script's own location (two levels
  above `.tropis/hooks/` or `.tropis/scripts/`), never `pwd`, because a relative
  lookup misses from every subdirectory and misses silently. A target file outside the
  repository stays an absolute path and matches nothing, which is right: another
  repository's files are not this project's to advise on.
- **Exit 0 and stay quiet when a hook does not apply to the payload that fired it.** A
  hook wired on several matchers sees payloads it has no business with, and Cursor
  ignores `settings.json`'s `if`, so it runs every Bash hook on every shell command. Every
  hook checks the command or path itself, before anything slow, and says nothing
  otherwise.
- **A hook speaks through `hook-reply.sh`, and only through it.** Source it and call
  `reply_on_exit`; then print as usual. Plain stdout reaches no agent: Claude Code drops
  it and Cursor refuses the call. **Never gate a hook by which tool runs it, and never
  reply with a permission key** — Cursor reads `"allow"` as the hook approving the call.
  Measured on 2026-10-09 in the project this framework came from, with
  `.tropis/scripts/probe-hook-channels.sh`; re-run it when either tool changes
  version, and update this table:

  | Reply | Claude Code 2.1.260, 2.1.289, 2.1.295 | Cursor 3.23.12 (real folders) |
  |---|---|---|
  | plain stdout, exit 0 | not heard | **call refused** ("returned invalid JSON") |
  | `hookSpecificOutput.additionalContext` (what `hook-reply.sh` sends) | heard, Read and Bash | heard, Read and Shell |
  | `agent_message`, `permission` keys | ignored | ignored |
  | stderr, exit 2 | call refused, stderr shown to agent | call refused, message shown to agent |
  | `if` on a Bash hook | honoured | **ignored** — every Bash hook runs on every shell command |

  **Rules are not a hook's to deliver.** Claude Code loads each rule by its `paths:`
  header by itself (FW-009); a hook printing rules would deliver them twice (FW-008).
- **A hook that must stop a call exits 2, with its message on stderr.** It is the one
  reply measured to stop the call and reach the agent in both tools (the table above). A
  permission key does not refuse the call in either tool (the table above), and an
  author reaching for a refusal tries one first.
- **A hook change reaches only sessions started after it, and a subagent counts as
  one**, because it loads its own start (measured 2026-10-09 in Claude Code, in the
  project this came from). So check a hook in a fresh session — for Claude Code, `claude
  -p` — with its version recorded, never in the session that edited it.
- **Wire a hook once, and let the script do the filtering — at command position.**
  Cursor ignores a hook's `if` entirely, and Claude Code runs every if-gated Bash hook
  on some commands it cannot parse: a heredoc followed by another command ran a script
  wired four times under four `if`s four times (desktop Claude Code 2.1.293, the
  developer's Mac, 2026-10-10). So wire once. With no `if` the script sees every Bash
  command, and a substring match then fires on any command that merely mentions its
  subject — a search, a commit message. Match where a command begins, never inside
  quoted text. The framework ships the matcher: pipe the command to python3
  .tropis/hooks/command-at-position.py with the command's words, as in 'git commit',
  and it exits 0 when one is at command position. Which other command shapes that
  tool cannot parse is not settled: a loop ran the hook once on the same version.
- **Namespace anything written under `TMPDIR` with a per-installation prefix.** Two
  frameworks on one machine otherwise share marker directories and silently deduplicate
  each other's output. A name `mktemp` makes unique needs no prefix.
- **Change a shared script only inside its project-owned regions.** Each script says on
  its second line which parts a project owns — like the blocks commands such as
  `release.md` mark; framework-commit-check.sh has one, for the paths that may go
  straight to main — and marks them `project-owned: begin` / `project-owned: end`.
  Anything else is shared machinery: a fix there is a fix every project needs, and
  `check-drift.sh`, run from the blueprint against the project, reports it as drift
  until it reaches the blueprint.

  Put each marker on one line, a comment that closes on that line. A begin marker that
  opens a comment spanning several lines leaves a dangling comment opener once the block
  is filled, because the fingerprint keeps the marker lines and the fill must start
  inside the comment.
- **`git status --porcelain` needs `-uall`** where a hook inspects what a commit will
  carry. Without it git collapses a wholly-untracked directory to its top level, so a
  new file in a fresh tree reports as its parent directory and matches no pattern.
- **A script that runs git uses the git config in force; its tests isolate it, never
  the script itself.** Setting `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_NOSYSTEM` or `HOME` on a
  script's own git calls, to make its tests repeatable, also switches off the credential
  helper that fetches from a private remote and the identity a commit needs, so the
  script passes its tests and fails on its first real run. Set them in the environment
  the test spawns the script with, give each temporary repository its own identity, and
  add a test that a config the script did not set takes effect, such as a global
  committer identity. One framework script set both variables on every git call; its
  tests passed only because each temporary repository set its own identity, and review
  caught it before merge.
- **The shell's own quiet failures count too**, and they produce the same silence as
  everything above: `wc -l` pads its output on BSD so a numeric test errors to a stderr
  nobody reads, a file with no trailing newline undercounts by one, `set -e` with a
  trailing `[ … ] && …` exits non-zero on a false test, and an interpreter missing from
  the hook's PATH collapses into an empty variable if the call is wrapped in
  `2>/dev/null || echo ""`. Robustness and silence are often the same line; write the
  test that distinguishes them.
