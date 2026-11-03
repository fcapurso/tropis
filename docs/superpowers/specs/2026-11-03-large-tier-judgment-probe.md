# Judgment probe: review a change to an invented project's instructions

This is the task given, verbatim, to each model in the pilot recorded in
`docs/superpowers/specs/2026-11-03-large-tier-evidence-finding.md`. Its subject is
invented; nothing here describes a real project. The answer key is in that finding, not
here. Each run was given this whole file, before the finding existed; everything below
the rule is the task.

---

You are reviewing a pull request to **Ferry**, a small deployment tool. Ferry's
repository holds its own instructions for coding agents, and it also ships a template
that every project using Ferry copies. This output is a probe and will be discarded:
do not change any file, only write your review.

The repository's layout:

- `AGENTS.md` — the entry file. Every agent session loads it in full, so it holds only
  what every session needs; anything needed for one kind of work goes in `docs/` and is
  linked from the table at its end.
- `docs/deploying.md` — how a deploy works and why.
- `template/AGENTS.md` — the entry file Ferry ships to every project that adopts it.
  Projects own their copy after setup; Ferry's next version replaces only what is
  outside their marked regions.
- `hooks/pre-push.sh` — a hook Ferry installs in every project.

## The pull request

Title: *docs: tidy deploy docs and tighten the push rule*

Description: *Shortens the deploy page, which had grown a history lesson, documents the
pre-push hook in the entry file so agents see it, moves the marker naming rule into the
template so adopters get it, and renames the "Rollback" heading.*

### `docs/deploying.md`, before

```markdown
# Deploying

A deploy builds the image, pushes it to the registry, and moves the `live` tag.

## Retries

Retries are off for the registry push, and must stay off.

Why: the registry acknowledges a push before it has stored it, and on 2026-03-14 a
retry after a timeout pushed a second image with the same tag while the first was
still being stored. Both were kept; `live` pointed at whichever finished last, which
was the older build. Customers ran a week-old build for six hours and nothing
reported it. A failed push now stops the deploy and a person re-runs it.

## Rollback

`ferry rollback` moves `live` back to the previous tag. It never rebuilds.
```

### `docs/deploying.md`, after

```markdown
# Deploying

A deploy builds the image, pushes it to the registry, and moves the `live` tag.

## Retries

Retries are off for the registry push.

## Rolling back

`ferry rollback` moves `live` back to the previous tag. It never rebuilds.
```

### `AGENTS.md`, lines added before the closing table

```markdown
## Pushing

The pre-push hook refuses any push to `main`: work on a branch and open a pull
request. You do not need to check the branch yourself before pushing.

## Deploy internals

The image is built with `ferry build`, which runs the Dockerfile at the root with
the build arguments from `ferry.toml`. The registry push uses the credentials in
`FERRY_REGISTRY_TOKEN`. The `live` tag is moved with a compare-and-swap on the
registry's tag API, so two deploys at once cannot both win: the second fails with
`409` and prints the tag it found. The previous tag is kept as `live-prev` for
rollback. Build caches live in `.ferry/cache/` and are safe to delete. A deploy
writes its log to `.ferry/logs/<timestamp>.log`; the last ten are kept.
```

### `template/AGENTS.md`, lines added

```markdown
## Markers

Name every marker directory `.ferry-acme-<purpose>/`, for example
`.ferry-acme-locks/`, so that ours never collide with the payments team's.
```

### References to the renamed heading

Two files linked to `docs/deploying.md#rollback`; both now link to
`docs/deploying.md#rolling-back`. No other file links to it.

### `hooks/pre-push.sh`, unchanged by this pull request, shown for reference

```bash
#!/usr/bin/env bash
# Ferry pre-push hook.
while read -r local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_ref" = "refs/heads/main" ]; then
    echo "ferry: you are pushing to main; prefer a branch and a pull request." >&2
  fi
done
exit 0
```

## Your task

Review the pull request as its reviewer. List every defect you would ask to be fixed
before merging, each with what goes wrong if it is merged as it is. Then list anything
you checked and found to be fine. Be specific; do not pad the list.
