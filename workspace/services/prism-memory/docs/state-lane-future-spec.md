# Future Spec: State Lane And Aggregate Latest

## Status

Proposed future enhancement. This document is a design target, not an implemented feature.

## Summary

The starter currently has two clear lanes:

- `memory` for observed activity, digests, and rolling snapshots
- `knowledge` for canonical evergreen docs

This spec proposes a third lane:

- `state` for current, lookup-friendly, non-evergreen records

Examples:

- upcoming schedules and events
- current role assignments and capability maps
- active workflow definitions and automation inventories
- other "what is true right now" records that are too dynamic for canonical knowledge docs

This spec also proposes an aggregate top-level `latest` view that summarizes recent changes across `memory`, `knowledge`, and `state` without replacing each lane's own latest pointer.

## Problem

Some useful artifacts do not fit cleanly into the existing two-lane model:

- they are more current-state-oriented than `memory`
- they are more dynamic than evergreen `knowledge`
- they still need file-first storage, retrieval, and auditability

The current `memory/rolling/latest.json` already acts as a partial current-state view for derived items like open threads, action items, and upcoming items. That is useful, but it is not the right home for authoritative records that should be explicitly maintained.

## Goals

- Add a generic third lane for current-state artifacts.
- Keep the current `memory` and `knowledge` authority boundaries intact.
- Reuse existing file-first patterns where they fit: inboxes, validation, activity logs, dated history, latest pointers.
- Support retrieval across all lanes without flattening their meanings into one schema.

## Non-Goals

- Replacing `memory/rolling/latest.json`
- Turning `knowledge` into a mutable current-state store
- Auto-promoting conversational guesses into authoritative state without validation
- Defining every possible state record type up front

## Authority Model

### Memory

- Derived from observed activity
- Useful for "what seems active right now"
- Can decay or go stale automatically

### Knowledge

- Editorially curated and canonical
- Useful for "what is intended, documented, and worth preserving"
- Should not be used as a live current-state register

### State

- Explicitly maintained current records
- Useful for "what is true right now"
- Should carry freshness and ownership metadata
- Should not be silently overwritten by memory inference

## Proposed Repository Shape

```text
superprism_poc/
  raidguild/
    inbox/
      memory/
        incoming/
        processed/
        rejected/
      knowledge/
        incoming/
        processed/
        rejected/
      state/
        incoming/
        processed/
        rejected/
    memory/
      rolling/
        YYYY-MM-DD.json
        latest.json
    knowledge/
      kb/
        docs/
        metadata/
        indexes/
        activity/
        state/
    state/
      current/
        schedules.json
        roles.json
        automations.json
      history/
        YYYY-MM-DD/
      activity/
        state_activity.jsonl
      state/
        state_index_state.json
      latest.json
    overview/
      latest.json
```

Notes:

- `state/current/` holds canonical current records by domain.
- `state/history/` is optional but recommended for auditability and rollback.
- `overview/latest.json` is an aggregate summary across lanes, not the source of truth for any lane.

## Ingestion Pattern

The `state` lane should follow the same broad flow already used elsewhere:

1. intake through an inbox
2. validation and normalization
3. upsert into canonical current records
4. optional history snapshot write
5. activity log write
6. latest/index refresh

Proposed inbox path:

- `superprism_poc/raidguild/inbox/state/incoming/`
- `superprism_poc/raidguild/inbox/state/processed/`
- `superprism_poc/raidguild/inbox/state/rejected/`

Unlike memory intake, state intake should prefer structured payloads such as JSON or markdown with strict frontmatter.

## Relationship Between Memory And State

`memory` and `state` may talk to each other, but they should not share authority.

Recommended rule:

- memory may propose state candidates
- state owns accepted current truth

That means:

- a memory run may detect a likely event, role change, or workflow update
- memory may write a candidate artifact into `inbox/state/incoming/`
- a state validator or curator may accept and normalize it
- canonical state changes only after that acceptance step

This avoids a failure mode where conversational noise mutates current truth.

## Latest Semantics

Each lane should keep its own latest view.

### Lane-local latest

- `memory/rolling/latest.json`
- `knowledge/.../latest.json` or equivalent latest activity/index summary
- `state/latest.json`

Lane-local latest is authoritative for that lane's current summary.

### Aggregate latest

- `overview/latest.json`

Aggregate latest is a dashboard or retrieval entrypoint. It is not a merged canonical database.

It should answer:

- what changed recently
- what is currently important
- where to navigate next

## Proposed `state/latest.json` Shape

Illustrative only:

```json
{
  "generated_at": "2026-03-27T18:25:00Z",
  "domains": {
    "schedules": {
      "source_path": "state/current/schedules.json",
      "updated_at": "2026-03-27T17:40:00Z",
      "summary": "2 upcoming events in the next 7 days."
    },
    "roles": {
      "source_path": "state/current/roles.json",
      "updated_at": "2026-03-27T16:10:00Z",
      "summary": "3 active role assignments updated."
    },
    "automations": {
      "source_path": "state/current/automations.json",
      "updated_at": "2026-03-27T16:45:00Z",
      "summary": "1 workflow enabled, 1 paused."
    }
  },
  "recent_changes": [
    {
      "domain": "schedules",
      "change_type": "updated",
      "summary": "Community call added for 2026-03-30.",
      "updated_at": "2026-03-27T17:40:00Z",
      "source_path": "state/current/schedules.json"
    }
  ]
}
```

## Proposed `overview/latest.json` Shape

Illustrative only:

```json
{
  "generated_at": "2026-03-27T18:30:00Z",
  "pointers": {
    "memory": "memory/rolling/latest.json",
    "knowledge": "knowledge/kb/indexes/latest.json",
    "state": "state/latest.json"
  },
  "memory_summary": {
    "summary": "4 open threads and 6 tracked action items.",
    "source_path": "memory/rolling/latest.json",
    "updated_at": "2026-03-27T17:45:00Z"
  },
  "knowledge_summary": {
    "summary": "2 docs promoted and indexed today.",
    "source_path": "knowledge/kb/indexes/latest.json",
    "updated_at": "2026-03-27T18:25:00Z"
  },
  "state_summary": {
    "summary": "Schedules and role assignments updated today.",
    "source_path": "state/latest.json",
    "updated_at": "2026-03-27T18:20:00Z"
  },
  "recent_changes": [
    {
      "source_lane": "memory",
      "summary": "Open thread on newsletter ownership remains active.",
      "updated_at": "2026-03-27T17:45:00Z",
      "source_path": "memory/rolling/latest.json"
    },
    {
      "source_lane": "knowledge",
      "summary": "Announcement template promoted to canonical reference.",
      "updated_at": "2026-03-27T18:25:00Z",
      "source_path": "knowledge/kb/docs/reference/announcement-template.md"
    },
    {
      "source_lane": "state",
      "summary": "Next community call added to schedule.",
      "updated_at": "2026-03-27T18:20:00Z",
      "source_path": "state/current/schedules.json"
    }
  ]
}
```

## Metadata Expectations For State Records

Each state domain should define stricter required fields than knowledge docs or memory highlights.

Expected common metadata:

- `updated_at`
- `effective_at`
- `owner`
- `source`
- optional `expires_at`
- optional `review_by`

Important distinction:

- `memory` uses decay and stale/drop rules
- `state` uses explicit freshness and validity windows

If a state record is no longer valid, it should normally be marked expired or replaced explicitly rather than fading out through memory-like decay.

## Retrieval Guidance

Cross-lane retrieval should preserve lane identity.

Recommended behavior:

- use `memory` for situational context
- use `knowledge` for canonical docs and policy
- use `state` for current declared facts
- use `overview/latest.json` for a fast cross-lane summary

Do not flatten all lane outputs into one generic blob without source metadata.

Minimum useful reference fields in aggregate views:

- `source_lane`
- `source_path`
- `updated_at`
- `summary`

## API Implications

This spec deliberately avoids using the term `ops` for the third lane, because the API already uses `/ops/*` for privileged operational actions.

Future API additions may include:

- `GET /state/latest`
- `GET /state/{domain}`
- `POST /state/inbox`

If implemented, `/ops/*` should remain the route family for privileged actions that operate on lanes, while `/state/*` should expose the state lane's data and ingestion endpoints.

## Suggested Rollout

### Phase 1

- Document the lane and its authority model.
- Keep current behavior unchanged.
- Treat `memory/rolling/latest.json` as the existing derived latest layer.

### Phase 2

- Add `inbox/state/` paths.
- Define one or two initial state domains such as `schedules` and `roles`.
- Add validation and canonical current record writing.

### Phase 3

- Add `state/latest.json`.
- Add optional `overview/latest.json`.
- Add retrieval/API support.

### Phase 4

- Allow memory-driven candidate promotion into state inbox.
- Add indexing and richer cross-lane retrieval if justified by usage.

## Open Questions

- Should `state` records live primarily as JSON, markdown with frontmatter, or a mixed model by domain?
- Which domains should be first-class at launch: `schedules`, `roles`, `automations`, or something else?
- Should `knowledge` expose a dedicated `latest` artifact, or should its activity/index summaries fill that role?
- When should a state record be mirrored into knowledge as a durable reference or policy?

## Decision Summary

If this enhancement is pursued, the preferred direction is:

- keep `memory`, `knowledge`, and `state` as separate lanes
- keep per-lane `latest` views
- add a top-level aggregate `overview/latest.json` as a summary layer only
- allow memory to propose state changes through inbox ingestion, but not directly author state truth
