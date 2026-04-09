---
name: workflow-selector
description: Select the best matching workflow or playbook for an operational request using canonical knowledge retrieved through Prism API Reader. Use when an orchestrator or planning agent needs to find an existing process rather than invent one from scratch.
---

# Workflow Selector

Use this skill on top of `prism-api-reader`.

This skill does not hardcode which workflow to use for each request. It teaches the agent how to find the best matching workflow, compare candidates, and explain the selection.

## When to use

Use this skill when an agent needs to:

- decompose a request into execution steps
- find an existing workflow, playbook, checklist, or runbook
- decide whether a request already maps to a canonical process

## Retrieval strategy

1. Identify the request domain, outcome, and scope.
2. Search the knowledge corpus for workflows, guides, policies, playbooks, runbooks, and checklists.
3. Fetch the top matching docs.
4. Compare candidates before selecting one.
5. If no exact workflow exists, synthesize a provisional workflow from the nearest matching docs and name the gap.

## Selection criteria

Rank candidate workflows by:

- closeness of scope to the request
- whether the doc is canonical and active
- freshness of the doc metadata
- clarity of ownership
- degree of adaptation required

## Output expectations

When responding:

- name the selected workflow doc or docs
- explain why they were chosen
- state any adaptation made for the current request
- cite the exact knowledge artifacts used

## Guardrails

- Prefer canonical workflow docs over memory-derived process guesses.
- Do not assume a workflow exists just because a similar task has happened before.
- If the corpus is thin, say so directly instead of pretending the workflow is authoritative.
