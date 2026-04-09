---
name: prism-api-reader
description: Read from the Prism Memory API using a read-scoped API key. Use when an agent needs rolling memory, digests, participant activity, knowledge search, knowledge docs, or product suggestion outputs without writing to inboxes or triggering ops endpoints.
---

# Prism API Reader

Use this skill for read-scoped retrieval against a deployed Prism API.

This skill is the shared retrieval substrate for higher-level role skills. Keep it focused on how to find, compare, and cite artifacts through the API. Do not turn it into a static routing table for specific workflows or templates.

## Required auth

Send:

```text
X-Prism-Api-Key: <read-key>
```

Use a read-scoped key only. Do not use write or ops endpoints with it.

## Base workflow

1. Start from the narrowest endpoint that can answer the question.
2. For knowledge questions, query indexes/search first, then fetch specific docs.
3. For recent community activity, prefer digests and participant queries over scanning raw memory.
4. Cite specific docs, dates, buckets, and endpoints used.

## Workflow And Template Retrieval

Use this skill to retrieve workflows and templates as knowledge artifacts.

- Treat reusable workflows as knowledge documents first, not as instructions embedded in agent prompts.
- Treat reusable templates as canonical references first, not as examples copied from memory unless no better source exists.
- Prefer search and comparison over hardcoded "if request X, use artifact Y" mappings.
- If multiple candidates match, choose the closest fit and explain the selection criteria used.

## Endpoint selection

- Latest memory snapshot:
  `GET /memory/latest`
- Memory for a day:
  `GET /memory/date/{yyyy-mm-dd}`
- Digest for a day:
  `GET /digests/date/{yyyy-mm-dd}`
- Digest for one bucket/day:
  `GET /digests/bucket/{bucket}/date/{yyyy-mm-dd}`
- Active participants in a time window:
  `GET /memory/participants?start=...&end=...&bucket=...`
- Knowledge manifest:
  `GET /knowledge/indexes/manifest`
- Knowledge search:
  `GET /knowledge/search?q=...&kind=...&tag=...&entity=...&limit=...`
- Knowledge doc:
  `GET /knowledge/docs/{slug}`
- Product suggestions:
  `GET /products/suggestions/latest`
  `GET /products/suggestions/date/{yyyy-mm-dd}`
  `GET /products/suggestions/weekly/{yyyy-WW}`

## Retrieval rules

- For knowledge:
  - use `/knowledge/search` first
  - then fetch the top matching docs with `/knowledge/docs/{slug}`
  - cite the returned `path`, `meta_path`, `title`, `kind`, and `updated` fields when relevant
  - for workflows, prefer `guide` and `policy` results unless the corpus uses a different convention
  - for templates, prefer `reference` results unless the corpus uses a different convention
  - narrow by tags such as `workflow`, `template`, `newsletter`, `announcement`, `meeting`, `operations`, `onboarding` when available
- For participation questions:
  - use `/memory/participants`
  - report the exact `start` and `end` used
  - mention optional `bucket` scope explicitly
- For trend or summary questions:
  - compare multiple dates with `/digests/date/...` or `/memory/date/...`
  - do not infer cross-day changes from a single snapshot

## Selection rules

- For workflow selection:
  - rank by scope match, freshness, ownership clarity, and canonical status
  - prefer a workflow doc over chat-derived memory when both exist
  - if no exact match exists, synthesize a provisional workflow from the closest artifacts and name the gap
- For template selection:
  - rank by artifact type, audience, channel, tone, and recency
  - prefer canonical templates over examples pulled from recent memory
  - if no exact match exists, adapt the closest template and state the adaptation

## Safety

- Treat the API as the source of truth for current deployed state.
- If a route returns empty results, say so directly instead of inventing context.
- Do not call:
  - `/memory/inbox`
  - `/knowledge/inbox`
  - `/ops/*`

## References

- Load [references/endpoints.md](references/endpoints.md) for request patterns.
- Load [references/retrieval.md](references/retrieval.md) for answer construction rules.
