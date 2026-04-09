# Proposal: Project Identity And Activity In The State Lane

## Status

Proposed design addition that builds on [docs/state-lane-future-spec.md](./state-lane-future-spec.md).

## Summary

This proposal defines a practical first model for handling projects across the Prism lanes:

- `state` owns the canonical current project registry
- `memory` surfaces recent project signals when they are situationally important
- `knowledge` stores durable project-specific docs

The key design choice is:

- project identity should come primarily from explicit community-defined rules
- project status can be inferred from recent activity signals

This avoids trying to discover projects purely from chat content while still allowing the system to keep project freshness up to date.

## Problem

The current Discord ingestion model is bucket-oriented, but "project" is not the same thing as "bucket".

Examples:

- the `RAIDS` category is strongly project-oriented
- channels under `RAIDS` already use a `raid-*` prefix
- project-relevant discussion may still happen in `agency`, `cohort`, meetings, or inbox submissions

That means:

- category membership alone is not enough
- free-form message inference alone is too fragile
- rolling memory should not be the canonical project list

We need a project model that supports both:

1. a high-level view of current projects worth knowing about
2. targeted retrieval of project-linked memory and knowledge

## Goals

- Define a minimal, configurable way for communities to identify projects.
- Keep project identity stable across `state`, `memory`, and `knowledge`.
- Infer freshness and activity status from observed signals.
- Prevent rolling memory from becoming a full project registry.
- Support gradual rollout with human curation first, then tighter automation if justified.

## Non-Goals

- Perfectly inferring every project from conversation text
- Making collectors the canonical authority for project truth
- Requiring every Discord category to follow one naming convention
- Forcing all active projects into `memory/rolling/latest.json`

## Core Model

### 1. Project Identity

A project should have a stable `project_key`.

Preferred source of truth:

- community-defined category and channel naming rules

Fallback source:

- curated aliases and manually promoted candidates

Example:

- channel `raid-yieldnest` -> `project_key = "yieldnest"`

### 2. Project Status

Project status is not the same as project identity.

Identity answers:

- what project is this?

Status answers:

- is it active right now?
- is it only lightly active?
- is it dormant?
- has it been explicitly archived?

### 3. Lane Ownership

- `state/projects` answers: what projects currently exist and what status are they in?
- `memory/latest` answers: which projects matter right now and why?
- `knowledge` answers: what durable project docs exist?

## Proposed Detection Strategy

### Explicit Rules First

Communities should be able to define project identity rules in config.

Illustrative config shape:

```json
{
  "state": {
    "projects": {
      "detection": {
        "category_rules": [
          {
            "bucket": "raids",
            "channel_name_prefixes": ["raid-"],
            "mode": "canonical_project_channel"
          }
        ],
        "fallback_channel_name_prefixes": ["raid-"]
      }
    }
  }
}
```

Interpretation:

- if a channel belongs to bucket `raids`
- and its name starts with `raid-`
- the stripped suffix becomes the candidate `project_key`

This is intentionally simple. It captures the structure already visible in the community instead of inventing a new ontology.

### Heuristics As Secondary Signals

After identity is established, activity from other places may reinforce the same project:

- mentions of the project name in other Discord buckets
- mentions in meetings digests
- action items tied to the project
- links to project-specific docs, repos, or deliverables

These signals should strengthen confidence and freshness, but should not create canonical projects without either:

- a matching explicit rule
- or a human promotion step

## Proposed `state/current/projects.json` Shape

Illustrative only:

```json
{
  "generated_at": "2026-04-02T18:00:00Z",
  "projects": [
    {
      "project_key": "yieldnest",
      "display_name": "Yieldnest",
      "status": "active",
      "archived": false,
      "source_channels": [
        {
          "bucket": "raids",
          "channel_name": "raid-yieldnest"
        }
      ],
      "aliases": ["yield nest"],
      "owners": [],
      "last_direct_activity_at": "2026-04-01T18:20:00Z",
      "last_indirect_activity_at": "2026-04-02T16:00:00Z",
      "derived_from": [
        "channel_prefix",
        "cross_channel_mentions",
        "meeting_mentions"
      ],
      "activity_score": 0.84,
      "review_by": "2026-04-16T00:00:00Z",
      "source": {
        "mode": "rule_plus_inference",
        "rule_id": "raids-prefix"
      }
    }
  ]
}
```

## Status Model

Recommended initial statuses:

- `active`
- `watching`
- `inactive`
- `archived`

Suggested meaning:

- `active`: direct project-channel activity within the recent window, or strong recent cross-channel evidence
- `watching`: little or no direct activity, but still recent indirect evidence
- `inactive`: no meaningful activity in the longer window
- `archived`: explicit human-curated lifecycle change, not automatic decay

Recommended principle:

- infer freshness automatically
- curate lifecycle explicitly

This avoids silently losing important but temporarily quiet projects.

## Activity Signals

Signals that can feed project freshness:

- messages in canonical project channels within `X` days
- project mentions in other channels within `Y` days
- project mentions in meetings digests within `Y` days
- project-linked action items
- project-linked decisions
- project-linked knowledge doc updates

Suggested starting thresholds:

- `active` if direct project-channel activity exists within 7 days
- `watching` if no direct activity, but indirect mentions exist within 14 to 30 days
- `inactive` if neither direct nor indirect signals appear within 30 days
- `archived` only by explicit promotion/update

These numbers should be community-configurable.

## Relationship To Collectors

Collectors should not decide canonical project truth.

Collectors should do the minimum reliable work:

- preserve bucket, category, channel, and thread metadata
- derive `project_candidate_key` when an explicit naming rule matches
- keep the raw evidence available for downstream digest and state steps

Recommended split:

- collector: attach project candidate metadata
- digest/memory: aggregate project-linked signals
- state: accept or update canonical project records

This keeps collectors deterministic and auditable.

## Relationship To Memory

`memory/rolling/latest.json` should not become the full project registry.

Instead:

- `state/projects` is the canonical list of current projects
- `memory/latest` surfaces only salient project signals

Projects should appear in rolling memory when they are recently important, for example:

- newly active
- newly quiet after a long active stretch
- cross-bucket discussion appears
- blockers, decisions, deadlines, or action items exist

Projects should not appear in rolling memory just because they are active in a steady-state, low-salience way.

Practical rule:

- `state/projects`: what projects do we currently have?
- `memory/latest`: what project activity should I care about now?

## Relationship To Knowledge

Knowledge should store project-linked durable material such as:

- specs
- proposals
- architecture notes
- client context
- process docs
- retros

Where possible, knowledge metadata should carry the same `project_key` used by state and memory.

That enables:

- project-scoped doc lookup
- project-scoped memory retrieval
- project-scoped current-state queries

## Curation Model

This proposal assumes a hybrid curation model.

There is currently no dedicated human curation interface in the Prism starter.

That means curation should be understood as a file-first operational path:

- direct edits to canonical state files
- candidate files written into a state inbox
- validator or promote commands and ops routes
- git diffs and PR review

Human curation should therefore be available as a correction path, not required as an approval gate for every normal project update.

### Deterministic

- naming-rule-based project identity
- activity window calculations
- freshness scoring
- linking memory items to known `project_key` values
- auto-promotion for strong non-conflicting matches

### Human-curated

- promoting a candidate into canonical `state/projects`
- merging duplicate project identities
- adding aliases
- explicitly archiving a project
- correcting false positives from inference

This follows the same broad principle already used elsewhere in the repo:

- deterministic ingestion where possible
- explicit promotion for canonical truth

Operationally, that should be interpreted as:

- obvious cases may be promoted automatically
- ambiguous or risky cases should remain correctable through explicit file-based curation

## Proposed State Inbox Flow

For projects, the proposed state inbox flow is:

1. collector or memory step writes project candidate artifacts to `inbox/state/incoming/`
2. validator normalizes candidate fields
3. strong non-conflicting candidates may be auto-promoted into `state/current/projects.json`
4. candidates that fail auto-promotion rules remain available for manual correction or explicit promotion
5. optional snapshot is written to `state/history/YYYY-MM-DD/`
6. state activity log is updated
7. `state/latest.json` refreshes

Candidate artifacts should be structured JSON, not free-form markdown transcripts.

## Minimal First Rollout

Phase 1 should stay intentionally narrow.

- Add config support for project detection rules.
- Support one canonical rule for RaidGuild:
  - bucket `raids`
  - channel prefix `raid-`
- Derive `project_key` from matching channel names.
- Add `state/current/projects.json`.
- Compute simple activity-derived statuses.
- Keep `archived` as an explicit manual field.
- Add optional project references into memory outputs.

This would already cover the two main needs:

1. current projects worth knowing about at a high level
2. targeted project-linked search and retrieval

## Open Questions

- Should project aliases be fully curated, or partially inferred from recurring message variants?
- Should a project be allowed to have multiple canonical source channels?
- Should project mentions in knowledge docs affect freshness, or only memory/state views?
- Should the first implementation write project candidates during collect, digest, or memory?
- Should project-linked `latest` summaries live in existing memory sections or in a separate capped project-signal section?

## Decision Summary

Preferred direction:

- treat projects as a first-class `state` domain
- derive project identity primarily from explicit community-defined rules
- infer project freshness/status from activity
- allow strong non-conflicting cases to auto-promote without requiring human review
- keep explicit archival and identity correction as human-curated actions
- use `memory/latest` for salient project signals, not the full project registry
- use shared `project_key` values to connect `state`, `memory`, and `knowledge`
