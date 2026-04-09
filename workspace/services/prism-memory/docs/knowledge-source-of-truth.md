# Knowledge Source-of-Truth Policy

## Goal

Define a non-circular authority model between:
- `RG-handbook-nextra` (docs site repo)
- `superprism_poc/raidguild/knowledge/kb/` (knowledge system in this repo)

## Authority Model

1. Bootstrap phase (initial import):
- Source of truth: `RG-handbook-nextra` markdown.
- Flow: handbook markdown -> `knowledge/kb/triage/inbox` -> triage -> `knowledge/kb/docs`.

2. Steady-state phase (after bootstrap):
- Source of truth: `knowledge/kb/docs` in this repo.
- Handbook becomes a published projection and should be updated from knowledge outputs.

This prevents circular drift.

## Import Rules

- Import markdown source files only (not rendered HTML/site output).
- Preserve provenance in metadata:
  - `source_repo`
  - `source_path`
  - `source_commit`
- Imported docs must pass knowledge constraints (`allowed_kinds`, `allowed_tags`, etc.).

## Edit Rules

- Do not directly edit canonical content in handbook once steady-state begins.
- Content changes start in knowledge docs, then sync outward to handbook via automation/PR.
- Memory agent may only submit candidates to `knowledge/kb/triage/inbox`; it does not classify or canonize docs.

## Operational Flow

1. Sync external handbook repo at a pinned commit.
2. Copy selected markdown files into `knowledge/kb/triage/inbox`.
3. Run triage agent to classify and place docs in `knowledge/kb/docs/<kind>/`.
4. Generate metadata sidecars under `knowledge/kb/metadata/<kind>/`.
5. Run `python3 -m community_knowledge index --base superprism_poc --space raidguild`.
6. Publish handbook updates from canonical knowledge docs.

## Coordination Rules

- Before any write run, acquire shared repo lock:
  - `python3 -m tools.agent_coord acquire --resource repo_write --holder knowledge-agent --ttl-minutes 120`
- After run (success or failure), release lock:
  - `python3 -m tools.agent_coord release --resource repo_write --holder knowledge-agent`
- Before commit/push, validate changed paths are in knowledge ownership:
  - `python3 -m tools.agent_coord check-paths --agent knowledge --files <changed files...>`
