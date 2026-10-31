<!-- This repository's own README skeleton; /refresh-readme uses it instead of the
     default. The first section is the opening paragraph under the title; the rest
     are ## sections. This repository's README is also checked by
     guards/readme-usable.test.js, for its title, the fixed text below, and the
     commands it names. -->

## What it is
- **Job:** one paragraph a newcomer can read in ten seconds: what this is and what problem it solves.
- **Facts from:** the opening paragraph of README.md, the framework documents, RELEASES.md
- **Length:** one paragraph.

## What is Tropis?
Fixed text:
Tropis is the word for the ship's keel, in Ancient Greek (τρόπις). A shipwright lays it
first, before a single plank, and everything else is built along it. Once the ship is
afloat you never see it again, but it is what keeps the hull true, and what holds the
boat on its course when the wind pushes it sideways.

Tropis does that job in a project where agents write most of the code. You set it up
first, and from then on every change follows the same line. An idea becomes a backlog
entry. One session writes the plan and another carries it out. A reviewer checks the
result before it merges, and what the change taught is written where the next agent will
meet it. The agents change from one session to the next, and so do the tools they run
in; the keel stays. What you keep is a project that holds its shape: rules in front of
the agent when they apply, documents that cannot quietly go stale, and a record of why
things are the way they are.

## What it does for you
- **Job:** the outcomes someone gets, as outcomes, not a list of files.
- **Facts from:** the shipped catalog entries of layer product, type feature or improvement.
- **Length:** a short list.

## Who it is for
- **Job:** who it fits and who it does not, so a reader can rule themselves in or out. What it needs to work goes under What it needs, not here.
- **Facts from:** the project brief, the decision record.
- **Length:** two short paragraphs.

## What it needs
- **Job:** what a project must have for Tropis to work, at a high level: the tools on the developer's machine, a supported agent tool, and the code host. Each is marked required or optional, with what is lost without an optional one. This is the only section that lists them; Getting started shows how to set them up.
- **Facts from:** scripts/check-prerequisites.sh, for what is required and what is optional; the Node versions the installed Jest accepts (the engines field in .tropis/node_modules/jest/package.json), which are stricter than that script; framework/DECISIONS.md, FW-005; the agent tools rule delivery supports, as How it works describes; commands/bootstrap.md and commands/update.md, for what GitHub adds and what happens on another host; commands/next.md and scripts/submit-upstream.sh, for where the gh command is used.
- **Length:** a short list.

## Getting started
- **Job:** the shortest path to a first success, as numbered steps that work as written.
- **Facts from:** the setup scripts and commands, the operator guide.
- **Length:** as few steps as it takes.

## How it works
- **Job:** an overview of how the parts fit, linking to the deeper documents instead of copying them.
- **Facts from:** the architecture document, the decision record, the framework documents.
- **Length:** a few paragraphs.

## Using it day to day
- **Job:** what someone does once it is set up: the commands they type and when.
- **Facts from:** the installed commands and scripts.
- **Length:** a short section.

## Where it stands
- **Job:** what works today and the known limits, honestly. A requirement goes under What it needs; a limit here is something not supported yet.
- **Facts from:** the catalog (shipped, building, shelved), the release notes.
- **Length:** a short list.

## Where to go next
- **Job:** links to the deeper documents, how to contribute, the licence.
- **Facts from:** the repository's own documents.
- **Length:** a short list.
