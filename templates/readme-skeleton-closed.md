<!-- The README's sections for a closed-source product, in order. The reader it assumes:
     someone who builds, runs, releases or assesses the product and can open its
     repository — a new member of the team, an operator, someone doing due diligence.
     It is not written for a prospective adopter: where the page is for people deciding
     whether to use the product, readme-skeleton.md fits instead. The first section is
     written as the page's opening paragraph under its title, with no heading of its own;
     the rest are ## sections. A project may copy this file to docs/readme/skeleton.md and
     change it; /refresh-readme then uses that copy. Never put a secret, a key or a
     password on the page: say where credentials live and who holds them, not what they
     are. -->

**Page length:** at most 1,500 words, counted as `wc -w` counts them, title and fixed text included.

## What it is
- **Job:** one paragraph: what the product is, who it serves, and its business status — in development or live, for which customers or markets, and who owns it.
- **Facts from:** the project brief, the shipped backlog items, the release notes.
- **Length:** one paragraph.

## Getting a working copy
- **Job:** the shortest path from a fresh clone to a running copy with its checks passing, as numbered steps that work as written. Each access someone needs before they can follow the steps is named first, with who grants it.
- **Facts from:** the setup scripts and package files, the operator guide, the project's own AGENTS.md.
- **Length:** as few steps as it takes.

## Environments and accounts
- **Job:** which environments exist, such as development, staging and production, and what each is for; which accounts and outside services the product depends on; and who holds each. Where credentials live, never what they are.
- **Facts from:** the CI configuration and the pipeline, the deploy scripts, the architecture document, the project brief, the project's own AGENTS.md.
- **Length:** a short table or list.

## How it works
- **Job:** an overview of how the parts fit, linking to the deeper documents instead of copying them, then the mistakes that cost the most here, each with what goes wrong and what to do instead.
- **Facts from:** the architecture document, the decision record, the gotchas in the project's own AGENTS.md, the project's rules.
- **Length:** a few paragraphs and a short list.

## Changing and releasing it
- **Job:** what this project adds to Tropis's workflow — its deploy steps, the checks only a person can do, who approves a release — pointing to the workflow for the rest instead of restating it.
- **Facts from:** the project's own AGENTS.md, the pipeline, the release notes, the installed workflow document.
- **Length:** a short section.

## Limits and risks
- **Job:** what is not supported yet and the known defects, then the legal and licence exposure someone assessing the product looks for: the product's own licence or terms, the licences of its dependencies, the data it holds and where, and the third parties it relies on.
- **Facts from:** the backlog (building, shelved, open bugs), the release notes, the dependency licences and any notices file, the decision record, the project brief.
- **Length:** a short list.

## Where to go next
- **Job:** links to the deeper documents, who to ask about what, and where the product's licence or terms are.
- **Facts from:** the repository's own documents.
- **Length:** a short list.
