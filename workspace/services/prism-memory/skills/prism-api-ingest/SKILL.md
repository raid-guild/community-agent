---
name: prism-api-ingest
description: Write to the Prism Memory API using an ingestion-capable API key. Use when an agent is allowed to submit memory inbox items or knowledge inbox documents with metadata, and optionally trigger the knowledge promote/validate/index flow.
---

# Prism API Ingest

Use this skill only with a privileged Prism API key.

## Required auth

Send:

```text
X-Prism-Api-Key: <ingest-capable-key>
```

Do not assume the key can run ops endpoints unless explicitly allowed.

## Write endpoints

- Memory inbox:
  `POST /memory/inbox`
- Knowledge inbox:
  `POST /knowledge/inbox`

Optional privileged ops:

- `POST /ops/knowledge/promote`
- `POST /ops/knowledge/run`
- `POST /ops/memory/run`

## Memory inbox contract

Required:

- `source`
- `ts`
- `type`
- `content`

Optional:

- `bucket`
- `bucket_hint`
- `author`
- `url`
- `participants`
- `participant_count`

Use memory inbox for:

- conversation summaries
- notable decisions or action items extracted by an agent
- meeting summaries when they are still memory artifacts, not canonical docs

## Knowledge inbox contract

Send:

- `filename`
- `content`
- `metadata`

Metadata must satisfy deploy-time constraints. The safe minimum fields are:

- `title`
- `slug`
- `kind`
- `summary`
- `tags`
- `owners`
- `status`
- `audience`
- `stability`
- `updated`
- `entities`
- `related_docs`
- `triaged_at`

## Knowledge ingestion workflow

1. Prepare a markdown body.
2. Prepare metadata that matches current allowed kinds/tags/status/audience/stability.
3. `POST /knowledge/inbox`
4. If authorized to trigger processing, call `POST /ops/knowledge/run`

`/ops/knowledge/run` now performs:

1. promote inboxed docs into canonical `kb/docs` and `kb/metadata`
2. validate canonical metadata
3. rebuild indexes

## Common artifact mappings

Use these defaults unless the deployed corpus has a stronger convention:

- reusable workflow or playbook: `kind: "guide"`
- mandatory or governance workflow: `kind: "policy"`
- reusable template: `kind: "reference"`

Use tags to make future retrieval easier when the deployed config allows them.

Preferred tags:

- `workflow`
- `template`
- `newsletter`
- `announcement`
- `meeting`

Do not invent unsupported tags. The deployed config remains the authority.

## Metadata rules

- `slug` should be stable and filesystem-safe
- `kind` should match the document type, not the source channel
- reusable workflows should usually be `guide`; normative workflow rules may be `policy`
- reusable templates should usually be `reference`
- `summary` should be concise and factual
- `tags` should come from the deployed config, not ad hoc guesses
- when the deploy supports them, prefer explicit tags such as `workflow`, `template`, `newsletter`, `announcement`, and `meeting`
- `triaged_at` should be ISO-8601 UTC
- keep `related_docs` empty rather than inventing weak links
- avoid ingesting reusable workflows or templates as `note`

## Safety

- Do not trigger `/ops/*` unless the agent is explicitly authorized.
- Do not overwrite canonical docs directly; use `/knowledge/inbox`.
- If `/knowledge/inbox` rejects metadata, fix the metadata rather than weakening validation.

## References

- Load [references/contracts.md](references/contracts.md) for payload examples.
- Load [references/metadata.md](references/metadata.md) for metadata shaping rules.
