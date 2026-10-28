---
description: Bring the README up to date as a whole page, at the level the project chose
---

You are running `/refresh-readme`. It brings `README.md` up to date as a whole page,
section by section, from a skeleton. Work from the repository root. Do the stage that
matches how you were invoked, then the later stages in order. Do not push. Do not
create a branch. A refreshed README is committed on the current branch, which may be main:
the workflow lets the README go there directly.

## Options

**`/refresh-readme writes`, `/refresh-readme suggests`, or `/refresh-readme manual`.**
Write that level into `docs/readme/readme.yaml` and do nothing else.

If the file is absent, create `docs/readme/` if needed and write it in this shape,
with the chosen level:

```yaml
# How Tropis keeps this project's README. Change it with /refresh-readme <level>.
level: writes          # writes · suggests · manual
refreshedAt: ""        # the commit the README was last refreshed at; empty until then
```

If the file is already there, change `level` and leave `refreshedAt` as it is. Keep
the comments.

Commit that one file only: `git add docs/readme/readme.yaml` then
`git commit -m "…" -- docs/readme/readme.yaml`. The message names the level and why it
matters: `writes` means a later refresh rewrites out-of-date sections and commits only
when the developer says yes; `suggests` means a refresh only reports; `manual` means
Tropis stays out of the README. If the file already has that level, say so:
there is nothing to commit. Then stop. Do not refresh.

**`/refresh-readme skeleton`.** If `docs/readme/skeleton.md` is absent, copy
`.tropis/templates/readme-skeleton.md` to it (create `docs/readme/` if needed). If the
copy is already there, leave it: do not overwrite a skeleton the project owns. Then
offer to rework it with the developer in conversation, and make the changes they ask
for in that file. If the file is the same as what is committed — no fresh copy and no
changes — say so and stop. Otherwise, a fresh copy included, ask whether to commit
it. On yes, commit that file only:
`git add docs/readme/skeleton.md` then `git commit -m "…" -- docs/readme/skeleton.md`,
and stop. On no, stop without committing. Do not refresh either way.

**`/refresh-readme` with no option** is a refresh. Continue below.

## Pre-flight

```bash
git status --porcelain
```

If that prints anything, stop. Say that a refresh starts from a clean tree so a no
can put the README back exactly. Do not stash and do not commit their work for them.

Read `docs/readme/readme.yaml`. The level is its `level` field. **No file means the
level is unchosen, and a refresh then behaves as at `suggests`.** A level that is not
writes, suggests or manual is treated as unchosen; say so. Also record whether
`README.md` exists now. Remember `refreshedAt`. An empty value, or no file, means there
is no refresh point yet.

## Read

Read the skeleton: `docs/readme/skeleton.md` when that file exists, otherwise
`.tropis/templates/readme-skeleton.md`. Do not edit the skeleton during a refresh.

A skeleton is a header comment, then one `## <Heading>` per section, in order. Under
a heading, either three lines — **Job**, **Facts from**, **Length** — or a line
`Fixed text:` followed by the text to copy word for word, up to the next `## `.

Read `README.md` (a missing page is a page with no sections). Read the facts each
section names: the project brief, the catalog, the decision record, the operator
guide, the commands and scripts, the release notes, and whatever else that line
points at. Where a named source does not exist, say so when you judge that section,
and do not invent the facts.

The shipped entries since the refresh point are the difference between
`git show <refreshedAt>:feature-catalog.yaml` and the current `feature-catalog.yaml`:
entries that are `status: shipped` now and were not shipped at that commit. With
`refreshedAt` empty, skip that comparison. If `<refreshedAt>` is not a commit this
repository has, or feature-catalog.yaml cannot be read at it or now, there is no refresh
point: say so, and treat every section as a candidate.

## Judge

The page starts with its # title line. Keep it as it is; if there is none, write one from
the project's name. The first skeleton section is the page's opening: it is written under
the title as plain paragraphs, with no ## heading of its own. Every later skeleton section
is a ## section, headed as in the skeleton.

For each skeleton section, decide whether the README's matching section is out of
date, missing, or fine. Judge by reading the section against its job and its facts,
not by matching words. Pay most attention to what has shipped since the refresh
point. With no refresh point, every section is a candidate.

A `Fixed text:` section is out of date when the README's text differs from that text
in any way. Fine means it matches exactly.

When the README's `##` headings are not the skeleton's headings in the skeleton's order —
leaving out the page's `#` title and the first skeleton section, which has no heading on
the page —
the page is restructured to the skeleton: those become its sections, in that order,
and what the old page said is rewritten into the section whose job it serves.

## At `suggests`, or `manual`, or an unchosen level

Report, per section, what is missing or out of date and why. Change nothing: do not
edit `README.md`, the settings file, or the skeleton. Stop.

## At `writes`

Rewrite each out-of-date or missing section in `README.md`, whole, in the order the
skeleton gives. Leave a section you judged fine as it is, unless the page is being
restructured, in which case every section is written into the skeleton's order. Copy
`Fixed text:` exactly — the words that follow that line, not the line itself and not
the job bullets. The page stays prose: no skeleton markup.

Run the project's checks (`npm --prefix .tropis test`). If any fails because of the page,
fix the page and run them again; if one still fails, say which and why when you ask.

Then list each changed section with one line on why. Ask the developer to read the
page and edit it if they like, and to say yes to keep it or no to put it back. Wait.
Do not commit and do not restore until they answer.

**On yes:** if the developer edited the page, run the checks again. If one fails, say
which and why, and ask again whether to keep the page. On a no now, do what **On no**
says. Only on the last yes, set `refreshedAt` in `docs/readme/readme.yaml` to the current
`HEAD` — `git rev-parse HEAD`, written in double quotes so YAML reads it as text: the
commit the page was refreshed against, not a new one.
Commit those two files only, once:
`git add README.md docs/readme/readme.yaml` then
`git commit -m "…" -- README.md docs/readme/readme.yaml`. The message names what was
brought up to date. Do not push.

**On no:** if README.md existed before the refresh, run `git restore README.md`; if it did
not, delete it. Then stop. Leave the settings file unchanged.

Never edit the skeleton during a refresh, and never push.
