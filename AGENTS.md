# AGENTS.md

## Repository purpose

This repository is the single source of truth for the 五行城市 project.

## Required start-of-task reads

Before changing files, read in this order:

1. `PROJECT_STATUS.md`
2. `TASKS.md`
3. `WORKFLOW.md`
4. the relevant domain files
5. `DECISIONS.md` when the task touches an existing decision

Move the task to `In Progress` before substantive work.

## Required end-of-task updates

Before reporting completion, update in the same change:

- the relevant domain or research file;
- `PROJECT_STATUS.md`;
- `TASKS.md`;
- `DECISIONS.md` only when Chat has explicitly confirmed a new decision;
- `README.md` when navigation or operating instructions change.

## Algorithm review gate

- `knowledge/bazi_rules_v1.md` contains only Chat-approved formal rules.
- External repositories, books, experiments and Work findings are candidates until approved.
- Put candidate evidence in `knowledge/github_bazi_audit.md` or another clearly labelled research file.
- Never silently convert a candidate into a formal rule.
- Never invent pillars, useful-god outcomes, city scores, citations, test goldens or confidence values.

## Change discipline

- Separate facts, interpretations, hypotheses and decisions.
- Preserve source, version, date, method, limitations and counterexamples where relevant.
- Keep changes scoped to the task; do not overwrite unrelated work.
- A task is not done until results and status are committed to GitHub.

