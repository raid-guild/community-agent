---
name: template-selector
description: Select the best matching reusable template for a content or meeting request using canonical knowledge retrieved through Prism API Reader. Use when a content-focused agent should adapt an approved template instead of drafting from scratch.
---

# Template Selector

Use this skill on top of `prism-api-reader`.

This skill does not hardcode template mappings. It teaches the agent how to find the closest reusable template, compare candidates, and adapt the best fit to the current request.

## When to use

Use this skill when an agent needs to:

- draft from an existing newsletter, announcement, or meeting template
- find a reusable structure for a communication artifact
- decide whether a content request has a canonical template already

## Retrieval strategy

1. Identify the artifact type, audience, channel, and tone needed.
2. Search the knowledge corpus for templates and closely related references.
3. Fetch the top matching docs.
4. Compare candidates before selecting one.
5. If no exact template exists, adapt the closest canonical reference and name the adaptation.

## Selection criteria

Rank candidate templates by:

- artifact type match
- audience match
- channel match
- tone and structure match
- freshness and canonical status

## Output expectations

When responding:

- name the selected template doc or docs
- explain why they were chosen
- state any adaptation made for the current request
- cite the exact knowledge artifacts used

## Guardrails

- Prefer canonical templates over examples derived from recent memory.
- Do not treat an ad hoc prior example as a template when a canonical template exists.
- If the corpus is missing a needed template, say so and proceed with the closest fit.
