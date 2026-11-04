# Does an area rule come back after compaction or a clear — finding, 2026-11-04

## Summary

In Claude Code 2.1.318 an area rule loaded by its `paths:` header comes back after
`/compact`, after automatic compaction and after `/clear`. The first time the agent
touches a file in the area afterwards — the file it had touched before, or one it had
not — Claude Code attaches the rule again, exactly as in a fresh session. Nothing needs
to be built to re-deliver rules in Claude Code, and the entry closes with no work there.

One gap is specific to compaction. Compaction re-attaches the files the agent had read,
so the agent may edit one of them without reading it first, and the rule is attached
after that edit's result: **the first edit in an area after compaction is made before
the rule is back**, carrying only what the summary kept of it. The summary kept a short
rule verbatim and, of a 60-clause rule, only its marker clause. In a fresh session the
same edit would have needed a read first, which brings the rule in before the edit.

Cursor was not measured: this session had no Cursor. That half is its own backlog item,
`cursor-rules-return-after-summarize`.

## How this was measured

| Tool | Version | Platform |
|---|---|---|
| Claude Code | 2.1.318 (`claude --version`), model `claude-opus-5-5` | Ubuntu 24.04.5 LTS, Linux x86_64, a Claude Code cloud session's container |

Every run used the `claude` command signed in through the cloud session, on the
developer's plan; no API key was set. Headless runs were
`claude -p "<prompt>" [--resume <session>] --model claude-opus-5-5 --permission-mode acceptEdits --output-format json`,
with stdin closed, one process per prompt, each later prompt resuming the same session.
`/compact` was sent as a headless prompt. `/clear` cannot be measured headless: sent as
a prompt it starts a new session id, and resuming the old id brings back the conversation
from before the clear. So `/clear`, and a second `/compact`, were run in one interactive
session driven through `tmux`. Automatic compaction was forced by resuming a session with
`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=1`; the transcript records its boundary as
`"trigger":"auto"`.

**Two signals for each run.** The session's transcript, the JSON-lines file Claude Code
writes under its projects directory, records a rule loaded by its header as an
attachment of type `nested_memory` carrying the rule's path and text; that is the
deciding signal. The rule's marker sentence is the second: the alpha rule asks for a
closing line `ALPHA-RULE-PRESENT` while it is in context, and the beta and gamma rules
hold a codeword asked for without tools. Session ids below are replaced by letters.

### The probe

A throwaway git repository in the session's scratchpad, deleted with the container:

```
CLAUDE.md                 "A throwaway project for measuring rule delivery."
.claude/rules/alpha.md    paths: ["areas/alpha/**"]; marker: end every reply with ALPHA-RULE-PRESENT
.claude/rules/beta.md     paths: ["areas/beta/**"];  marker: the beta codeword, given only when asked
.claude/rules/gamma.md    paths: ["areas/gamma/**"]; 60 clauses, 9,589 bytes; clause 37 begins "Marker:" and holds the gamma codeword
areas/alpha/one.js, areas/alpha/two.js, areas/beta/b.js, areas/gamma/g.js   one export each
```

## Results

| Run | Steps | `nested_memory` for the area's rule | Marker |
|---|---|---|---|
| A, headless | asked before any tool | none | "No." |
| | read `alpha/one.js` | after the read | `ALPHA-RULE-PRESENT` |
| | `/compact` (manual, 36,982 tokens before) | — | — |
| | asked before any tool | none | quoted from the summary: "Yes, but only as a quote inside the compaction summary" |
| | read `alpha/one.js` again | **after the read** | `ALPHA-RULE-PRESENT` |
| | read `alpha/two.js` | none: already attached since the compaction | `ALPHA-RULE-PRESENT` |
| B, headless | read `alpha/one.js` | after the read | yes |
| | `/compact` | — | — |
| | read `alpha/two.js`, untouched before | **after the read** | yes |
| D, headless control | read `beta/b.js`; alpha untouched, and no beta rule existed yet | none | no closing line |
| | `/compact` | — | — |
| | read `alpha/one.js` | after the read | yes |
| E, headless | read `alpha/one.js` | after the read | yes |
| | automatic compaction on the next prompt (37,019 → 6,960 tokens) | — | yes, from the summary |
| | read `alpha/two.js` | **after the read** | yes |
| Interactive, `tmux` | read `alpha/one.js` | after the read; the screen shows "Loaded .claude/rules/alpha.md" | yes |
| | `/clear`, asked before any tool | none | "No." |
| | read `alpha/one.js` | **after the read**, "Loaded .claude/rules/alpha.md" | yes |
| | `/clear`, read `alpha/two.js` | **after the read** | yes |
| | `/compact` (manual, 39,998 → 7,083 tokens) | restored at once as a `file` attachment of the rule, beside `alpha/two.js`; the screen shows "Read .claude/rules/alpha.md (7 lines)" | — |
| | read `alpha/one.js` | none: already in context since the compaction | yes |
| F, headless, short rule | read `beta/b.js` | after the read | — |
| | `/compact`; asked for the codeword without tools | none | "HERON-5512": the summary quoted the rule verbatim |
| | edit `beta/b.js` **without reading it**, which the tool allowed | **after the edit's result** | — |
| G, headless, 60-clause rule | read `gamma/g.js` | after the read | — |
| | `/compact`; asked for the codeword without tools | none | "OSPREY-2093": the 2,523-character summary quoted clause 37 and no other clause |
| | edit `gamma/g.js` without reading it | **after the edit's result** | — |

### Transcript excerpts

Run B after its compaction, abridged; the probe's path is replaced by `<probe>`:

```
{"type":"system","subtype":"compact_boundary","compactMetadata":{"trigger":"manual","preTokens":36982,...}}
{"type":"user","isCompactSummary":true,...}
{"type":"attachment","attachment":{"type":"file","filename":"<probe>/areas/alpha/one.js",...}}
{"type":"assistant",...,"content":[{"type":"tool_use","name":"Read","input":{"file_path":"<probe>/areas/alpha/two.js"}}]}
{"type":"user",...,"content":[{"type":"tool_result","content":"1\texport const two = 2;\n2\t"}]}
{"type":"attachment","attachment":{"type":"nested_memory","path":"<probe>/.claude/rules/alpha.md","content":{"type":"Project","content":"# Alpha area rule\n\nMarker: the alpha rule is in your context. ...","globs":["areas/alpha"],...}}}
```

Run F, the edit without a read after compaction:

```
{"type":"attachment","attachment":{"type":"file","filename":"<probe>/areas/beta/b.js",...}}
{"type":"assistant",...,"content":[{"type":"tool_use","name":"Edit","input":{"file_path":"<probe>/areas/beta/b.js",...}}]}
{"type":"user",...,"content":[{"type":"tool_result","content":"The file <probe>/areas/beta/b.js has been updated successfully."}]}
{"type":"attachment","attachment":{"type":"nested_memory","path":"<probe>/.claude/rules/beta.md",...}}
```

## What the runs show

1. **The record that a rule was loaded does not survive compaction or a clear.** After
   each, the first touch of the area attaches the rule again, whether the file was
   touched before or not, and whether compaction was manual or automatic. The control
   shows the same attachment for an area never touched before compaction, so a rule that
   came back is told apart from one that only now arrived for the first time.
2. **Within one context the rule is attached once.** After it came back, touching a
   second file in the area attached nothing more (run A). That is the behaviour of a
   fresh session too.
3. **Compaction may bring the rule back by itself.** The interactive `/compact`
   restored the rule file at once as a recently read file; the headless ones restored
   only the data files. Either way the rule was in context before the agent's next
   action in the area that had a result, so the difference changes nothing here. Why the
   two differed was not established.
4. **Until the next touch, the rule is what the summary kept.** A short rule and a
   clause marked "Marker" were quoted; 59 of the long rule's 60 clauses were not.
5. **The first edit after compaction can precede the rule.** Compaction restores the
   files the agent had read, and the Edit tool then accepts an edit without a fresh read.
   The rule is attached after that edit's result. In a fresh session or after `/clear`
   the agent must read before it edits, so the rule is in context before the first edit.

## Recommendation, put to the developer

**Close the Claude Code half with no work.** Claude Code re-delivers an area rule after
compaction and after a clear, by itself; the hook-based re-delivery the spec borrowed
from Trellis is not needed in Claude Code, and would give the rule twice.

**Do not build anything for the first edit after compaction.** The exposure is one edit
per area per compaction, made with what the summary kept, and the rule arrives with that
edit's result, so the agent sees it before its next step and can correct that edit.
Closing it would need a hook on Edit that replies with the rule, which FW-008 rejected
for every edit to serve this one; or a rule clause asking the agent to read before its
first edit after compaction, which no tool would deliver at that moment. Recorded in
`framework/rule-delivery.md` so a later reader can reopen it with evidence if an edit
made in that gap is ever found doing harm.

**Measure Cursor in its own backlog item** (`cursor-rules-return-after-summarize`),
with the developer at Cursor: whether a chat's summarization, or a new chat, attaches a
generated `.mdc` rule again on the next read in its area.
