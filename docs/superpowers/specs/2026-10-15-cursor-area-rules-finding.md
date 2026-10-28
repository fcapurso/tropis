# What makes an area rule reach a Cursor agent — finding, 2026-10-15

## Summary

Cursor 3.24.12 still attaches nothing from the generator's JSON-array glob. On a read it does attach an unquoted glob, a comma-separated glob list, a nested `AGENTS.md`, a nested `CLAUDE.md`, and rulesync's unquoted glob. None of those arrived when the agent appended through the shell or created a file without reading; the hook arrived on read and on create. Claude Code 2.1.300 shares the nested `CLAUDE.md` and the hook, and its own `paths:` header arrived there; the Cursor glob forms did not. Generate the unquoted glob beside the `paths:` header. The hook is not the recommendation: hook-free candidates delivered on read, and a hook would reopen FW-008.

## How this was measured

Measured 2026-10-15 on the developer's MacBook Pro (`dev-laptop.local`, Darwin arm64). `sw_vers` reported macOS 26.2, build 25C56. The Cursor About dialog reported Darwin arm64 25.2.0.

| Tool | Version | Runs |
|---|---|---|
| Cursor application | 3.24.12. Commit `37b865941ccb31e2fc90c685157534efca87f960`, dated 2026-10-09T20:56:41.904Z. Layout: Agent Window. Build type: Stable. Release track: Default. VS Code Extension API 1.128.0. Electron 42.10.0. | Three fresh Agent chats, one per moment, in `../cursor-rule-probe` opened as its own workspace. The developer pasted each prompt. The git reset between chats was not run. The read changed no file, so the edit started from the committed tree and appended `// measured` once. The create chat wrote `new.js` and did not open `sample.js`. Its instructions at the start were the two controls only. |
| Claude Code | 2.1.300 (`claude --version`), `~/.nvm/versions/node/v22.15.0/bin/claude` | `claude -p "$(cat prompt-<moment>.md)" --permission-mode acceptEdits --permission-prompts none`, one process per moment, from the probe root. The edit and create processes also passed `--disallowedTools Bash`, after a first edit process used the shell. |
| `cursor-agent` | 2025.09.18-7ae6800, `~/.local/bin/cursor-agent` | Not run. `cursor-agent status` printed `Not logged in`. |

Rulesync 35.0.0 was installed inside the probe only (`npm install rulesync`) and run once: `npx rulesync generate --targets cursor --features rules`. It wrote `.cursor/rules/c10-sync.mdc` and warned that no root rulesync rule existed.

### Documentation read on 2026-10-15

**Cursor rules**, <https://cursor.com/docs/rules>. Project rules are `.mdc` files in `.cursor/rules`. The page also shows a folder inside that directory (`frontend/components.mdc`). It does not describe a `.cursor/rules` directory inside an area folder. Nested `AGENTS.md` files "are automatically applied when working with files in that directory or its children."

Glob forms the page shows, other than a JSON array (which it does not show):

- An unquoted single glob, in the "Apply to Specific Files" example: `globs: src/components/**/*.tsx` with `alwaysApply: false`.
- A comma-separated list. The prose says "Separate multiple patterns with commas." The table's example is `docs/**/*.md, docs/**/*.mdx`.

**Cursor help**, <https://cursor.com/help/customization/rules>. "Nested subfolders work" under the project's `.cursor/rules`. "Cursor reads `CLAUDE.md` files the same way it reads `AGENTS.md`," and tells the reader to place `CLAUDE.md` at the project root. `.cursorrules` "is legacy and will be deprecated," with migration to an Always Apply rule.

**Claude Code memory**, <https://code.claude.com/docs/en/claude-md>. "`CLAUDE.md` and `CLAUDE.local.md` files in the directory hierarchy above the working directory are loaded in full at launch. Files in subdirectories load on demand when Claude reads files in those directories." Claude Code reads `CLAUDE.md`, not `AGENTS.md`. Path-scoped rules use a `paths` frontmatter field.

## The probe

Throwaway repository `../cursor-rule-probe`, one commit `df11464`, invented areas, nothing kept. `node_modules/` and `package-lock.json` are omitted below. Rulesync's lockfile is the install of 35.0.0; the command above reproduces it.

```
.claude/hooks/c9-area.sh
.claude/hooks/hook-reply.sh
.claude/rules/c8.md
.claude/settings.json
.cursor/rules/c1.mdc
.cursor/rules/c10-sync.mdc
.cursor/rules/c2-comma.mdc
.cursor/rules/c2-unquoted.mdc
.cursor/rules/c3-layout/area.mdc
.cursor/rules/c4.mdc
.cursor/rules/control.mdc
.gitignore
.rulesync/rules/c10-sync.md
CLAUDE.md
areas/c1-generator/sample.js
areas/c10-sync/sample.js
areas/c2-comma/sample.js
areas/c2-unquoted/sample.js
areas/c3-layout/sample.js
areas/c4-described/sample.js
areas/c5-agents/AGENTS.md
areas/c5-agents/sample.js
areas/c6-claude/CLAUDE.md
areas/c6-claude/sample.js
areas/c8-claude-rules/sample.js
areas/c9-hook/sample.js
package.json
prompt-create.md
prompt-edit.md
prompt-read.md
```

C7 was not built. The docs do not say a `.cursor/rules` folder inside an area is read. The folder layout they do describe, a subfolder of the project's `.cursor/rules`, is C3.

C2 is two candidates because the docs show two glob forms. `C2U` is the unquoted single glob. `C2C` is the comma-separated list.

C3 uses the generator's JSON-array frontmatter inside `.cursor/rules/c3-layout/`, so the new variable is the folder. It is the same glob form as C1, and a miss does not by itself show that subfolders are ignored.

Each `sample.js` is the same four lines with a different function name (`c1Shift`, `c2uShift`, `c2cShift`, `c3Shift`, `c4Shift`, `c5Shift`, `c6Shift`, `c8Shift`, `c9Shift`, `c10Shift`):

```javascript
function c1Shift(days) {
  return days * 2;
}

module.exports = { c1Shift };
```

`package.json` is the default `npm install rulesync` manifest, dependency `rulesync` with no version pin. The installed version was 35.0.0.

### Rule and instruction files

#### `.cursor/rules/control.mdc`

~~~~
---
alwaysApply: true
---

# Always applied control

Probe marker K1: cedar window.
~~~~

#### `CLAUDE.md`

~~~~
# Root session notes

Probe marker K2: river pebble.
~~~~

#### `.cursor/rules/c1.mdc`

~~~~
---
description: c1 rules (generated from .claude/rules/c1.md — do not edit)
globs: ["areas/c1-generator/**"]
alwaysApply: false
---

# C1 area rule

Probe marker C1: amber lantern.
~~~~

#### `.cursor/rules/c2-unquoted.mdc`

~~~~
---
description: c2-unquoted rules (generated from .claude/rules/c2-unquoted.md — do not edit)
globs: areas/c2-unquoted/**
alwaysApply: false
---

# C2U area rule

Probe marker C2U: violet compass.
~~~~

#### `.cursor/rules/c2-comma.mdc`

~~~~
---
description: c2-comma rules (generated from .claude/rules/c2-comma.md — do not edit)
globs: areas/c2-comma/**, areas/c2-comma/**/*.js
alwaysApply: false
---

# C2C area rule

Probe marker C2C: copper spindle.
~~~~

#### `.cursor/rules/c3-layout/area.mdc`

~~~~
---
description: c3-layout rules (generated from .claude/rules/c3-layout.md — do not edit)
globs: ["areas/c3-layout/**"]
alwaysApply: false
---

# C3 area rule

Probe marker C3: marble kettle.
~~~~

#### `.cursor/rules/c4.mdc`

~~~~
---
description: Conventions for the invented folder areas/c4-described, a small shift counter
alwaysApply: false
---

# C4 area rule

Probe marker C4: silent orchard.
~~~~

#### `areas/c5-agents/AGENTS.md`

~~~~
# C5 area instructions

Probe marker C5: paper harbor.
~~~~

#### `areas/c6-claude/CLAUDE.md`

~~~~
# C6 area instructions

Probe marker C6: linen wharf.
~~~~

#### `.claude/rules/c8.md`

~~~~
---
paths: ["areas/c8-claude-rules/**"]
---

# C8 area rule

Probe marker C8: quartz meadow.
~~~~

#### `.claude/settings.json`

~~~~
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/c9-area.sh"
          }
        ]
      },
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/c9-area.sh"
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/c9-area.sh"
          }
        ]
      }
    ]
  }
}
~~~~

#### `.claude/hooks/c9-area.sh`

~~~~
#!/usr/bin/env bash
# Speaks only when the tool path is under areas/c9-hook/. Otherwise prints nothing.
set -u
payload=$(cat)
. "$(dirname "${BASH_SOURCE[0]}")/hook-reply.sh"
reply_on_exit

path=$(printf '%s' "$payload" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    nested = data.get('tool_input') or {}
    if not isinstance(nested, dict):
        nested = {}
    print(data.get('file_path', '') or nested.get('file_path', '') or '')
except Exception:
    print('')
")
[ -z "$path" ] && exit 0

case "$path" in
  */areas/c9-hook/*|areas/c9-hook/*) ;;
  *) exit 0 ;;
esac

printf '%s\n' '# C9 area rule' '' 'Probe marker C9: ember folio.'
exit 0
~~~~

#### `.claude/hooks/hook-reply.sh`

~~~~
#!/usr/bin/env bash
# Shared machinery: no part of this file is project-owned.
# hook-reply.sh — sourced by every PreToolUse hook that speaks to the agent.
#
# A hook's plain stdout reaches no agent: Claude Code drops it, and Cursor refuses the
# call ("returned invalid JSON"). What reaches the agent in both is one JSON object,
# hookSpecificOutput.additionalContext — measured on 2026-10-09 in the project this
# framework came from, in Claude Code 2.1.260, 2.1.289 and 2.1.295 and Cursor 3.23.12;
# the table is in .claude/rules/harness-scripts.md. This file is the only place that
# shape is written.
#
#   . "$(dirname "${BASH_SOURCE[0]}")/hook-reply.sh"
#   reply_on_exit
#
# After reply_on_exit, the hook prints as it always did; everything it printed is sent as
# one reply when it exits, and nothing at all is sent when it printed nothing. Its exit
# status is untouched.
#
# The reply never carries a permission key. Cursor reads "permission" as the hook's
# verdict on the call, and a hook that answers "allow" has approved whatever it saw.
# Neither tool hears "agent_message", so it is not sent either.
#
# The reply is the same whichever tool runs the hook. Do not choose a shape by detecting
# the tool: one shape is heard by both.

# reply_context <text> — print <text> as a reply the agent receives.
reply_context() {
  printf '%s' "$1" | python3 -c '
import json, sys
text = sys.stdin.read()
print(json.dumps({
    "hookSpecificOutput": {"hookEventName": sys.argv[1], "additionalContext": text},
}))' "${_hook_reply_event:-PreToolUse}"
}

# reply_on_exit [event] — capture everything printed from here on, and send it as one
# reply. The event defaults to PreToolUse. The buffer's name needs no per-installation
# prefix: mktemp makes it unique.
reply_on_exit() {
  _hook_reply_event="${1:-PreToolUse}"
  _hook_reply_buf=$(mktemp "${TMPDIR:-/tmp}/hook-reply.XXXXXX")
  exec 3>&1 >"$_hook_reply_buf"
  trap '_hook_reply_flush' EXIT
}

_hook_reply_flush() {
  exec 1>&3 3>&-
  if [ -s "$_hook_reply_buf" ]; then
    reply_context "$(cat "$_hook_reply_buf")"
  fi
  rm -f "$_hook_reply_buf"
}
~~~~

#### `.rulesync/rules/c10-sync.md`

~~~~
---
root: false
targets: ["cursor"]
description: "Conventions for the invented folder areas/c10-sync, a small shift counter"
globs: ["areas/c10-sync/**"]
cursor:
  alwaysApply: false
  description: "Conventions for the invented folder areas/c10-sync, a small shift counter"
---

# C10 area rule

Probe marker C10: birch signal.
~~~~

#### `.cursor/rules/c10-sync.mdc`

~~~~
---
alwaysApply: false
description: Conventions for the invented folder areas/c10-sync, a small shift counter
globs: areas/c10-sync/**
---

# C10 area rule

Probe marker C10: birch signal.
~~~~

#### `prompt-read.md`

~~~~
This is a measurement. The project is a throwaway. Nothing it writes is kept.

Before using any tool: quote every sentence beginning `Probe marker` that is in your instructions, and name the first heading of every rule or instruction file you were given. If there are none, say so.

Do not open, list or search `.cursor/`, `.claude/`, any `AGENTS.md` or `CLAUDE.md`, and do not search for the word "marker".

Then, for each area folder in turn, in this order:

1. areas/c1-generator
2. areas/c2-unquoted
3. areas/c2-comma
4. areas/c3-layout
5. areas/c4-described
6. areas/c5-agents
7. areas/c6-claude
8. areas/c8-claude-rules
9. areas/c9-hook
10. areas/c10-sync

Read `sample.js` in that folder. After each, quote every `Probe marker` sentence you have received since the previous step — in your instructions, a tool result or a system message — and say where it arrived and which files you opened. If none arrived, say so.

Write your report to `answer-read.md` at the project root, step by step. Include the before-any-tool section first.
~~~~

#### `prompt-edit.md`

~~~~
This is a measurement. The project is a throwaway. Nothing it writes is kept.

Before using any tool: quote every sentence beginning `Probe marker` that is in your instructions, and name the first heading of every rule or instruction file you were given. If there are none, say so.

Do not open, list or search `.cursor/`, `.claude/`, any `AGENTS.md` or `CLAUDE.md`, and do not search for the word "marker".

Then, for each area folder in turn, in this order:

1. areas/c1-generator
2. areas/c2-unquoted
3. areas/c2-comma
4. areas/c3-layout
5. areas/c4-described
6. areas/c5-agents
7. areas/c6-claude
8. areas/c8-claude-rules
9. areas/c9-hook
10. areas/c10-sync

Edit `sample.js` in that folder by appending one comment line, `// measured`, without reading the file first if your tool allows. If the tool refuses an edit of a file you have not read, say so, then read it, and attribute anything new to that read. After each, quote every `Probe marker` sentence you have received since the previous step — in your instructions, a tool result or a system message — and say where it arrived and which files you opened. If none arrived, say so.

Write your report to `answer-edit.md` at the project root, step by step. Include the before-any-tool section first.
~~~~

#### `prompt-create.md`

~~~~
This is a measurement. The project is a throwaway. Nothing it writes is kept.

Before using any tool: quote every sentence beginning `Probe marker` that is in your instructions, and name the first heading of every rule or instruction file you were given. If there are none, say so.

Do not open, list or search `.cursor/`, `.claude/`, any `AGENTS.md` or `CLAUDE.md`, and do not search for the word "marker".

Then, for each area folder in turn, in this order:

1. areas/c1-generator
2. areas/c2-unquoted
3. areas/c2-comma
4. areas/c3-layout
5. areas/c4-described
6. areas/c5-agents
7. areas/c6-claude
8. areas/c8-claude-rules
9. areas/c9-hook
10. areas/c10-sync

Create `new.js` in that folder with one comment line, `// measured`, without reading anything in the folder. After each, quote every `Probe marker` sentence you have received since the previous step — in your instructions, a tool result or a system message — and say where it arrived and which files you opened. If none arrived, say so.

Write your report to `answer-create.md` at the project root, step by step. Include the before-any-tool section first.
~~~~

### The prompts

The three prompts are among the files above (`prompt-read.md`, `prompt-edit.md`, `prompt-create.md`).

## Results

A cell is **arrived** only when the agent quoted that candidate's marker sentence and said it had not opened the rule file. **Not arrived** means the marker was not quoted at that step. Controls K1 and K2 arrived before any tool in every Cursor chat, and K2 arrived before any tool in every Claude Code session, so none of these runs is void. K1 is a Cursor always-applied rule; Claude Code did not receive it.

The Cursor edit chat appended `// measured` with a shell redirect and opened no file. That is the edit moment as run. It is not a measurement of Cursor's Edit tool.

The recorded Claude Code edit session is the second one. The Edit tool would not append until it was given a unique string already in the file, so the agent read each `sample.js` and then edited it. Markers on that run are attributed to the read, except C9, which the agent reported again on the Edit hook. A first Claude Code edit session used the shell, delivered no marker, and is not this column. Its answer is in the appendix.

### Cursor application 3.24.12

| Candidate | Read | Edit (shell append, no file opened) | Create (`new.js` written, no file opened) |
|---|---|---|---|
| C1 JSON-array glob | not arrived | not arrived | not arrived |
| C2U unquoted glob | arrived, at this step, tool-result attachment of `.cursor/rules/c2-unquoted.mdc` | not arrived | not arrived |
| C2C comma-separated globs | arrived, at this step, tool-result attachment of `.cursor/rules/c2-comma.mdc` | not arrived | not arrived |
| C3 subfolder, JSON-array glob | not arrived | not arrived | not arrived |
| C4 description only | not arrived. The description was named before any tool; the marker was not quoted | not arrived. Description named before any tool; marker not quoted | not arrived. Description named before any tool; marker not quoted |
| C5 nested `AGENTS.md` | arrived, at this step, tool-result attachment of `areas/c5-agents/AGENTS.md` | not arrived | not arrived |
| C6 nested `CLAUDE.md` | arrived, at this step, tool-result attachment of `areas/c6-claude/CLAUDE.md` | not arrived | not arrived |
| C7 area-local `.cursor/rules` | not applicable | not applicable | not applicable |
| C8 `paths:` header | not arrived | not arrived | not arrived |
| C9 hook | arrived, at this step, system reminder after the read | not arrived | arrived, at this step, system reminder after the write |
| C10 rulesync unquoted glob | arrived, at this step, tool-result attachment of `.cursor/rules/c10-sync.mdc` | not arrived | not arrived |

### Claude Code 2.1.300

| Candidate | Read | Edit (read, then Edit; moment not separated) | Create (Write, no file opened) |
|---|---|---|---|
| C1 | not arrived | not arrived | not arrived |
| C2U | not arrived | not arrived | not arrived |
| C2C | not arrived | not arrived | not arrived |
| C3 | not arrived | not arrived | not arrived |
| C4 | not arrived | not arrived | not arrived |
| C5 | not arrived | not arrived | not arrived |
| C6 nested `CLAUDE.md` | arrived after the read, system message carrying the file | arrived on that read | arrived after the write, system message carrying the file |
| C7 | not applicable | not applicable | not applicable |
| C8 `paths:` header | arrived after the read, system message carrying the file | arrived on that read | arrived after the write, system message carrying the file |
| C9 hook | arrived, PreToolUse on Read | arrived on Read and again on Edit | arrived, PreToolUse on Write |
| C10 | not arrived | not arrived | not arrived |

### `cursor-agent`

Not run. The binary is installed and `cursor-agent status` printed `Not logged in`.

### Answers from the tables

**C1 still delivered nothing**, on every moment, in Cursor 3.24.12 as in 3.23.12. Cursor did attach other glob forms on a read, so what is unchanged is the JSON-array form the generator writes, not glob rules as a class.

**Hook-free candidates that delivered in Cursor:** C2U, C2C, C5, C6 and C10, each on the read only. C4's description was listed from the start of every Cursor chat and its marker never arrived. C1, C3 and C8 never arrived.

**Shared with Claude Code:** C6, the nested `CLAUDE.md`. It arrived in Claude Code on the read, on the write, and on the read the Edit tool required. C2U, C2C, C5 and C10 did not arrive in Claude Code. C8, Claude Code's `paths:` header, arrived there on those same moments and did not arrive in Cursor. C9, the hook, arrived in both.

**C9 delivered.** In Cursor, on the read and on the create. In Claude Code, on the read, on the edit, and on the create. The Cursor shell append did not run the hook, because the hook is matched to Read, Edit and Write.

**What a working candidate costs.** C2U, C2C and C10 are one file in `.cursor/rules/`, not in the project's source folders. A glob can name one file; this probe measured directory globs (`areas/<candidate>/**`). The docs' examples include patterns that match a single name (`*.ts`, `tailwind.config.*`). `feature-catalog.yaml` is expressible as a glob without a file beside it, and that exact pattern was not run. C5 and C6 put `AGENTS.md` or `CLAUDE.md` inside the area folder. An area that is one file at the repository root cannot use them without that file becoming the root instruction file, which is loaded for the whole session. C9 matches whatever path the hook is given, including one file, and puts nothing in the source tree. It is a hook.

C10's generated file is the unquoted-glob form, the same form as C2U, with the fields ordered `alwaysApply`, `description`, `globs`. It is not byte-identical to C2U. It delivered on the same moment C2U did.

## Recommendation for `rule-areas-are-project-data`

No hook-free mechanism delivered at every moment in both tools. C6 delivered in both, and in Cursor only on a read. The order of preference therefore leaves the shared-at-every-moment option and takes Cursor's own native mechanism beside Claude Code's `paths:` header.

That mechanism is the unquoted glob the Cursor docs show: a `.cursor/rules/<name>.mdc` with `alwaysApply: false`, a description, and `globs:` written as `areas/billing/**` or, for several patterns, the comma-separated form. The areas file would generate that file from the same area list that becomes the `paths:` header. It would stop generating `globs: ["areas/billing/**"]`. Rulesync 35.0.0 already emits the unquoted form, and that output delivered; the framework can emit it itself and does not need the tool for this.

Do not generate a nested `AGENTS.md` or `CLAUDE.md` as the Cursor mechanism. They delivered on a read only, and they cannot name one file at the repository root without becoming the always-loaded root file.

Do not adopt the hook. Hook-free candidates delivered, so the preference never reaches it. Adopting it would reopen FW-008, which removed the framework's rule hook.

Until the generator changes, the projection this framework writes still does not reach a Cursor agent. That is what to tell a Cursor user today.

A glob that names a single file was not measured. A subfolder of `.cursor/rules` was measured only with the JSON-array form, which already fails in the flat layout, so this run does not say whether that subfolder layout works.

## What was not measured

- The `cursor-agent` command-line build `2025.09.18-7ae6800`. It is installed and not logged in.
- Cursor's Edit tool. The edit chat wrote with the shell.
- A matching file left open in a tab. The 2026-10-09 audit left that case open for a checkout with real folders.
- `.cursorrules`. The help page read on 2026-10-15 calls it legacy and says to migrate it to an Always Apply rule. It has no area scope.
- Team rules and user rules. They are not files in the project.
- A glob whose pattern is one file.
- C3 apart from the JSON-array glob form.
- C7. The docs do not say an area-local `.cursor/rules` is read.
- Whether a delivered rule is still there after compaction. That is `rules-return-after-compaction`, and this plan does not extend to it.
- The first Claude Code edit session, which used the shell and delivered no marker. The edit column is the later session.

## Appendix

Every answer file, verbatim.
### `answer-cursor-read.md`

~~~~markdown
Cursor version: 3.24.12

# Probe read measurement

## Before any tool

### Probe marker sentences in instructions
- Probe marker K1: cedar window.
- Probe marker K2: river pebble.

### First heading of every rule or instruction file given
- Always applied control
- Root session notes
- (agent-requestable path `.cursor/rules/c4.mdc` was named with a description only; no file body/heading was injected)

---

## 1. areas/c1-generator

Opened: `areas/c1-generator/sample.js`

Probe markers received since previous step: none.

---

## 2. areas/c2-unquoted

Opened: `areas/c2-unquoted/sample.js`

Probe markers received since previous step:
- Probe marker C2U: violet compass.
  - Where: tool result attachment (“cursor rule files are relevant”) for `.cursor/rules/c2-unquoted.mdc`
  - Files opened by me: `areas/c2-unquoted/sample.js` only (rule body injected in the tool result; I did not open the rule file)

---

## 3. areas/c2-comma

Opened: `areas/c2-comma/sample.js`

Probe markers received since previous step:
- Probe marker C2C: copper spindle.
  - Where: tool result attachment (“cursor rule files are relevant”) for `.cursor/rules/c2-comma.mdc`
  - Files opened by me: `areas/c2-comma/sample.js` only (rule body injected in the tool result; I did not open the rule file)

---

## 4. areas/c3-layout

Opened: `areas/c3-layout/sample.js`

Probe markers received since previous step: none.

---

## 5. areas/c4-described

Opened: `areas/c4-described/sample.js`

Probe markers received since previous step: none.
(Note: an agent-requestable rule for this area was named in initial instructions, but its body was not injected on this read, and `.cursor/` was not opened per measurement constraints.)

---

## 6. areas/c5-agents

Opened: `areas/c5-agents/sample.js`

Probe markers received since previous step:
- Probe marker C5: paper harbor.
  - Where: tool result attachment (“cursor rule files are relevant”) for `areas/c5-agents/AGENTS.md`
  - Files opened by me: `areas/c5-agents/sample.js` only (AGENTS.md body injected in the tool result; I did not open AGENTS.md)

---

## 7. areas/c6-claude

Opened: `areas/c6-claude/sample.js`

Probe markers received since previous step:
- Probe marker C6: linen wharf.
  - Where: tool result attachment (“cursor rule files are relevant”) for `areas/c6-claude/CLAUDE.md`
  - Files opened by me: `areas/c6-claude/sample.js` only (CLAUDE.md body injected in the tool result; I did not open CLAUDE.md)

---

## 8. areas/c8-claude-rules

Opened: `areas/c8-claude-rules/sample.js`

Probe markers received since previous step: none.

---

## 9. areas/c9-hook

Opened: `areas/c9-hook/sample.js`

Probe markers received since previous step:
- Probe marker C9: ember folio.
  - Where: `<system_reminder>` appended to the tool result after reading `sample.js`
  - Files opened by me: `areas/c9-hook/sample.js` only

---

## 10. areas/c10-sync

Opened: `areas/c10-sync/sample.js`

Probe markers received since previous step:
- Probe marker C10: birch signal.
  - Where: tool result attachment (“cursor rule files are relevant”) for `.cursor/rules/c10-sync.mdc`
  - Files opened by me: `areas/c10-sync/sample.js` only (rule body injected in the tool result; I did not open the rule file)

---
~~~~

### `answer-cursor-edit.md`

~~~~markdown
Cursor version: 3.24.12

# Edit measurement report

## Before any tool

### Probe marker sentences in instructions

- Probe marker K1: cedar window.
- Probe marker K2: river pebble.

### First headings of rule or instruction files given

- Always applied control
- Root session notes

(Also present as requestable description only, not as loaded file content: “Conventions for the invented folder areas/c4-described, a small shift counter” — no heading from that file was provided.)

---

## areas/c1-generator

- Action: appended `// measured` to `areas/c1-generator/sample.js` via shell `printf` redirect (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c2-unquoted

- Action: appended `// measured` to `areas/c2-unquoted/sample.js` via shell (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c2-comma

- Action: appended `// measured` to `areas/c2-comma/sample.js` via shell (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c3-layout

- Action: appended `// measured` to `areas/c3-layout/sample.js` via shell (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c4-described

- Action: appended `// measured` to `areas/c4-described/sample.js` via shell (no prior read; tool did not refuse). Did not open the requestable c4 rule (path under `.cursor/` forbidden by protocol).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c5-agents

- Action: appended `// measured` to `areas/c5-agents/sample.js` via shell (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c6-claude

- Action: appended `// measured` to `areas/c6-claude/sample.js` via shell (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c8-claude-rules

- Action: appended `// measured` to `areas/c8-claude-rules/sample.js` via shell (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c9-hook

- Action: appended `// measured` to `areas/c9-hook/sample.js` via shell (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.

## areas/c10-sync

- Action: appended `// measured` to `areas/c10-sync/sample.js` via shell (no prior read; tool did not refuse).
- Files opened: none.
- Probe markers since previous step: none arrived.
~~~~

### `answer-cursor-create.md`

~~~~markdown
Cursor version: 3.24.12

# Measurement report: create new.js

## Before any tool

### Probe marker sentences in instructions

- Probe marker K1: cedar window.
- Probe marker K2: river pebble.

### First heading of every rule or instruction file given

- Always applied control
- Root session notes

(Agent-requestable rule described for `areas/c4-described` / c4.mdc was named in the catalog but its file body was not inlined, so no heading from that file was available without opening it. Per instructions, `.cursor/` was not opened.)

---

## Per-area steps

### areas/c1-generator

Created `areas/c1-generator/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only).

### areas/c2-unquoted

Created `areas/c2-unquoted/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only).

### areas/c2-comma

Created `areas/c2-comma/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only).

### areas/c3-layout

Created `areas/c3-layout/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only).

### areas/c4-described

Created `areas/c4-described/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only). Did not open the agent-requestable c4 rule (would require `.cursor/`).

### areas/c5-agents

Created `areas/c5-agents/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only).

### areas/c6-claude

Created `areas/c6-claude/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only).

### areas/c8-claude-rules

Created `areas/c8-claude-rules/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only).

### areas/c9-hook

Created `areas/c9-hook/new.js` with `// measured`.

Probe markers since previous step:

- Probe marker C9: ember folio.

Where it arrived: system reminder / system message after the Write tool result for `areas/c9-hook/new.js` (heading shown: `# C9 area rule`). Appeared more than once in the same turn’s system reminders.

Files opened: none (wrote new.js only).

### areas/c10-sync

Created `areas/c10-sync/new.js` with `// measured`.

Probe markers since previous step: none arrived.

Files opened: none (wrote new.js only).
~~~~

### `answer-claude-read.md`

~~~~markdown
# Read probe report

## Before any tool use

Probe marker sentences in my instructions:
- "Probe marker K2: river pebble." — from the project `CLAUDE.md` (`~/src/cursor-rule-probe/CLAUDE.md`).

First heading of each rule or instruction file I was given:
- `~/.claude/CLAUDE.md`: "# Global Claude Code instructions — (the developer's name)"
- `~/src/cursor-rule-probe/CLAUDE.md`: "# Root session notes"
- A SessionStart hook also added the `superpowers:using-superpowers` skill text. It is not a rule file; its first heading is "## The Rule". It has no Probe marker sentences.

## Steps

1. **areas/c1-generator** — Opened `areas/c1-generator/sample.js`. No Probe marker sentences arrived. Only the tool list and MCP server instructions changed.
2. **areas/c2-unquoted** — Opened `areas/c2-unquoted/sample.js`. None.
3. **areas/c2-comma** — Opened `areas/c2-comma/sample.js`. None.
4. **areas/c3-layout** — Opened `areas/c3-layout/sample.js`. None.
5. **areas/c4-described** — Opened `areas/c4-described/sample.js`. None.
6. **areas/c5-agents** — Opened `areas/c5-agents/sample.js`. None.
7. **areas/c6-claude** — Opened `areas/c6-claude/sample.js` (read twice by mistake, in two parallel calls). "Probe marker C6: linen wharf." arrived in a system message after the read. That message contained `areas/c6-claude/CLAUDE.md`, heading "# C6 area instructions".
8. **areas/c8-claude-rules** — Opened `areas/c8-claude-rules/sample.js`. "Probe marker C8: quartz meadow." arrived in a system message after the read. That message contained `.claude/rules/c8.md`, heading "# C8 area rule".
9. **areas/c9-hook** — Opened `areas/c9-hook/sample.js`. "Probe marker C9: ember folio." arrived as extra context from a PreToolUse hook on Read, heading "# C9 area rule".
10. **areas/c10-sync** — Opened `areas/c10-sync/sample.js`. None.
~~~~

### `answer-claude-edit.md`

~~~~markdown
# Rule-delivery probe — edit run

## Before any tool use

`Probe marker` sentences in my instructions:

- "Probe marker K2: river pebble." — from the project `CLAUDE.md` at the repo root.

First heading of each rule or instruction file I was given:

- `~/.claude/CLAUDE.md` — "# Global Claude Code instructions — (the developer's name)" (no marker)
- `~/src/cursor-rule-probe/CLAUDE.md` — "# Root session notes"
- A session-start hook also injected the `superpowers:using-superpowers` skill. It has no top-level heading; its first heading is "## The Rule". No marker.

## How the edits were done

The Edit tool has no append mode; it needs a unique existing string to replace. In step 1 I tried editing without reading, using a bare newline as the anchor. The tool did **not** refuse because the file was unread. It refused because the newline matched 5 places. I then read the file and anchored on its last line. For steps 2–10 I read each `sample.js` first, then appended `// measured`. So every step involved one read of `sample.js`, and anything new in a step arrived alongside that read or the edit that followed it.

## Steps

1. **areas/c1-generator** — Opened: `areas/c1-generator/sample.js` (after the failed unread edit). Markers: none. A system message listing newly available MCP tools arrived after the failed edit; it held no marker.
2. **areas/c2-unquoted** — Opened: `areas/c2-unquoted/sample.js`. Markers: none.
3. **areas/c2-comma** — Opened: `areas/c2-comma/sample.js`. Markers: none.
4. **areas/c3-layout** — Opened: `areas/c3-layout/sample.js`. Markers: none.
5. **areas/c4-described** — Opened: `areas/c4-described/sample.js`. Markers: none.
6. **areas/c5-agents** — Opened: `areas/c5-agents/sample.js`. Markers: none.
7. **areas/c6-claude** — Opened: `areas/c6-claude/sample.js`. Marker: "Probe marker C6: linen wharf." It arrived in a system message right after the read, which delivered the contents of `areas/c6-claude/CLAUDE.md` (heading "# C6 area instructions"). I did not open that file myself.
8. **areas/c8-claude-rules** — Opened: `areas/c8-claude-rules/sample.js`. Marker: "Probe marker C8: quartz meadow." It arrived in a system message right after the read, which delivered the contents of `.claude/rules/c8.md` (heading "# C8 area rule"). I did not open that file myself.
9. **areas/c9-hook** — Opened: `areas/c9-hook/sample.js`. Marker: "Probe marker C9: ember folio." It arrived as `PreToolUse:Read` hook additional context (heading "# C9 area rule") on the read of this file. It arrived again as `PreToolUse:Edit` hook additional context on the edit of this file.
10. **areas/c10-sync** — Opened: `areas/c10-sync/sample.js`. Markers: none new. The only text in that window was the C9 hook repeat from step 9's edit. Its timing is described under step 9 because the C9 edit and the C10 read ran in the same batch.

## Summary

| Area | Marker | Delivered by |
|---|---|---|
| root | K2: river pebble | Project `CLAUDE.md`, at session start |
| c1, c2-unquoted, c2-comma, c3, c4, c5 | — | nothing arrived |
| c6-claude | C6: linen wharf | Nested `areas/c6-claude/CLAUDE.md`, loaded on read |
| c8-claude-rules | C8: quartz meadow | `.claude/rules/c8.md`, loaded on read |
| c9-hook | C9: ember folio | PreToolUse hook, on both Read and Edit |
| c10-sync | — | nothing arrived |
~~~~

### `answer-claude-edit-shell.md`

~~~~markdown
# Edit probe report

## Before any tool

`Probe marker` sentences in my instructions:
- "Probe marker K2: river pebble." This is from the project `CLAUDE.md` at the project root.

First heading of each rule or instruction file I was given:
- Global `~/.claude/CLAUDE.md`: "Global Claude Code instructions — (the developer's name)"
- Project `CLAUDE.md`: "Root session notes"
- The session-start hook also injected the "using-superpowers" skill text. It is a skill, not a rule file. Its first heading is "The Rule".

## How the edits were made

The Edit tool did **not** refuse to edit a file I had not read.

- **First c1 attempt:** I passed identical old and new text (`x` → `x`). The tool rejected it with "No changes to make", which is unrelated to reading.
- **Second c1 attempt:** `x` → `y` succeeded on the unread file. It changed `module.exports` to `module.eyports`, which was my mistake.
- **Revealed by `git diff`:** to undo it, I ran `git diff` on the file. The diff showed lines 2–5 of c1's `sample.js`, which is a partial view of its contents.
- **Revert:** `git checkout` was blocked because it needs approval. I used Edit to restore `module.exports` and append `// measured` in the same edit. `git diff` confirms the only net change is the added line.

For steps 2–10, I appended with a shell `printf '// measured\n' >> sample.js`, which doesn't read the file. A final `git diff --stat` shows exactly one inserted line in each of the 10 files.

## Steps

| # | Folder | Method | Files opened | `Probe marker` sentences received since previous step |
|---|--------|--------|--------------|-------------------------------------------------------|
| 1 | areas/c1-generator | Edit tool (unread), revert via Edit | none read; part of `sample.js` shown by `git diff` | None. The only system message was a tool-availability notice (Claude Docs / Google Drive MCP tools) with no marker. |
| 2 | areas/c2-unquoted | shell append | none | None |
| 3 | areas/c2-comma | shell append | none | None |
| 4 | areas/c3-layout | shell append | none | None |
| 5 | areas/c4-described | shell append | none | None |
| 6 | areas/c5-agents | shell append | none | None |
| 7 | areas/c6-claude | shell append | none | None |
| 8 | areas/c8-claude-rules | shell append | none | None |
| 9 | areas/c9-hook | shell append | none | None |
| 10 | areas/c10-sync | shell append | none | None |

No `Probe marker` sentence arrived during any step, whether in a tool result or a system message. The only marker received in this session is K2, from the project-root `CLAUDE.md`, which was present before any tool ran.

Caveat: steps 2–10 used the shell rather than the Edit tool. So they show whether rules arrive when a shell command writes a file. They don't show what happens when Claude Code's own Edit tool touches a file.
~~~~

### `answer-claude-create.md`

~~~~markdown
# Answer: create

## Before any tool use

Probe marker sentences in my instructions:
- "Probe marker K2: river pebble." — from `~/src/cursor-rule-probe/CLAUDE.md`

First headings of the rule or instruction files I was given:
- `~/.claude/CLAUDE.md`: "# Global Claude Code instructions — (the developer's name)"
- `~/src/cursor-rule-probe/CLAUDE.md`: "# Root session notes"
- A session-start hook injected the `superpowers:using-superpowers` skill. It has no `#` heading; its first heading is "## The Rule".

## Steps

Each step wrote `new.js` containing `// measured` with the Write tool. I did not read, list or search anything, and I opened no files at any step.

1. **areas/c1-generator**: none arrived.
2. **areas/c2-unquoted**: none arrived.
3. **areas/c2-comma**: none arrived.
4. **areas/c3-layout**: none arrived.
5. **areas/c4-described**: none arrived.
6. **areas/c5-agents**: none arrived.
7. **areas/c6-claude**: "Probe marker C6: linen wharf." arrived in a system message after the write, carrying the contents of `areas/c6-claude/CLAUDE.md` (first heading "# C6 area instructions").
8. **areas/c8-claude-rules**: "Probe marker C8: quartz meadow." arrived in a system message after the write, carrying the contents of `.claude/rules/c8.md` (first heading "# C8 area rule").
9. **areas/c9-hook**: "Probe marker C9: ember folio." arrived as context from a pre-write hook (PreToolUse:Write), with the heading "# C9 area rule".
10. **areas/c10-sync**: none arrived.
~~~~

