# Prism Memory API

A lightweight FastAPI service exposes memory and knowledge artifacts from `superprism_poc/raidguild/`.

## Paths & auth

All protected endpoints require an API key header:

```
X-Prism-Api-Key: <your-key>
```

Scoped keys:

- `PRISM_API_READ_KEY`
  - authorizes read endpoints
- `PRISM_API_WRITE_KEY`
  - authorizes read endpoints plus `/memory/inbox` and `/knowledge/inbox`
- `PRISM_API_OPS_KEY`
  - authorizes read endpoints, write endpoints, and `/ops/*`
- `PRISM_API_KEY`
  - backward-compatible shared key that authorizes all scopes

| Endpoint | Auth | Description |
| --- | --- | --- |
| `GET /health` | none | Service heartbeat |
| `GET /memory/latest` | required | Latest rolling memory JSON |
| `GET /memory/date/{yyyy-mm-dd}` | required | Rolling memory snapshot for a date |
| `GET /state/latest` | required | Latest state summary JSON |
| `GET /state/projects` | required | Current canonical project registry JSON |
| `PUT /state/projects/{project_key}` | required (`ops`) | Upsert canonical project metadata such as description, tags, aliases, owners, or archived flag |
| `GET /memory/participants?start=...&end=...` | required | Aggregate active participants across raw bucket windows, optionally filtered by bucket |
| `GET /digests/date/{yyyy-mm-dd}` | required | Aggregated digests across buckets |
| `GET /digests/bucket/{bucket}/date/{yyyy-mm-dd}` | required | Single bucket digest |
| `GET /activity/recent?limit=100&type=...` | required | Activity log tail with optional filters |
| `GET /config/space` | required | Return the active mounted `space.json` |
| `PUT /config/space` | required (`ops`) | Replace the active mounted `space.json` after validation |
| `GET /skills` | required | List bundled agent skills available for download |
| `GET /skills/{skill}/download` | required | Download a bundled skill directory as `.tar.gz` |
| `GET /products/suggestions/latest` | required | Latest daily product suggestion JSON |
| `GET /products/suggestions/date/{yyyy-mm-dd}` | required | Daily product suggestion JSON for a date |
| `GET /products/suggestions/weekly/{yyyy-WW}` | required | Weekly product suggestion JSON |
| `GET /knowledge/docs/{slug}` | required | Fetch a knowledge doc (markdown + metadata) by slug or path |
| `GET /knowledge/search?q=...&kind=...` | required | Simple manifest search with optional filters (kind, tag, entity, limit) |
| `GET /knowledge/indexes/manifest` | required | Raw manifest index JSON |
| `GET /knowledge/indexes/tags` | required | Tag → docs lookup table |
| `GET /knowledge/indexes/entities` | required | Entity → docs lookup table |
| `POST /knowledge/inbox` | required | Drop a markdown + metadata pair into `knowledge/kb/triage/inbox/` |
| `POST /memory/inbox` | required | Drop a JSON payload into `inbox/memory/incoming/` for the inbox collector |
| `POST /ops/memory/run` | required | Run `collect -> digest -> memory -> state(projects) -> seeds` against the active Prism data root |
| `POST /ops/memory/backfill` | required | Run a full multi-day `collect -> digest -> memory -> state(projects) -> seeds` recompute across a lookback window |
| `POST /ops/knowledge/promote` | required | Promote staged knowledge inbox docs into canonical KB paths |
| `POST /ops/knowledge/run` | required | Run `promote -> validate -> index` against the active Prism data root |

## Running locally

```bash
export PRISM_API_READ_KEY="replace-me-read"
export PRISM_API_WRITE_KEY="replace-me-write"
export PRISM_API_OPS_KEY="replace-me-ops"
export PRISM_API_STORAGE_BACKEND="filesystem"
export PRISM_API_DATA_ROOT="/data/prism/superprism_poc/raidguild"
export PYTHONPATH=superprism_poc/raidguild/code
python3 -m superprism_poc.raidguild.code.community_memory_api.server \
  --host 127.0.0.1 --port 8788 --base superprism_poc --space raidguild
```

The API now resolves storage through a backend factory. `filesystem` is the default and matches the current repo layout; future backends can implement the same API contract without changing route handlers.
When `PRISM_API_DATA_ROOT` is set, the API reads and writes Prism data from that path instead of the bundled repo data. This is the preferred setup for Railway volumes.
The `/ops/*` endpoints are intended for cron/scheduler triggers so one volume-owning API service can run the pipeline safely.
In this Prism Agent template, the default scheduler is a PM2-managed local worker loop (`scripts/start-workers.sh`) that calls those ops routes every 30 minutes and performs an initial 3-day backfill once per data root.

## Railway service modes

`railway.toml` now uses a shared entrypoint script:

- `PRISM_SERVICE_MODE=api`
  - runs the FastAPI service
- `PRISM_SERVICE_MODE=trigger`
  - performs a single authenticated `POST` to `PRISM_API_BASE + PRISM_TRIGGER_PATH` and exits

Recommended Railway layout:

- `prism-api`
  - `PRISM_SERVICE_MODE=api`
  - owns the mounted volume
- `memory-cron`
  - `PRISM_SERVICE_MODE=trigger`
  - `PRISM_API_BASE=https://prism-api-production-409d.up.railway.app`
  - `PRISM_TRIGGER_PATH=/ops/memory/run`
- `knowledge-cron`
  - `PRISM_SERVICE_MODE=trigger`
  - `PRISM_API_BASE=https://prism-api-production-409d.up.railway.app`
  - `PRISM_TRIGGER_PATH=/ops/knowledge/run`

Both cron services also require:

- `PRISM_API_OPS_KEY`

Important:

- `POST /ops/memory/run` performs `collect -> digest -> memory -> state(projects) -> seeds`
- it does not run GitHub backup
- if you still want the older GitHub mirror behavior, trigger `community_memory.pipeline backup` separately or add a dedicated backup ops route

## Deploy config

The checked-in [`superprism_poc/raidguild/config/space.json`](../superprism_poc/raidguild/config/space.json) is a generic starter config for local bootstrapping.
For deployed environments, treat `PRISM_API_DATA_ROOT/config/space.json` as the authoritative config:

- the API now loads boot-time config and validation rules from the active data root
- `/config/space` returns the mounted live config
- Railway volume-backed deploys should update the mounted `space.json`, not the starter file in the image

This keeps the repo portable while allowing each deploy to carry its own Discord category mappings, collector toggles, and knowledge constraints.

In this Prism Agent workspace, the service inherits the workspace env and syncs the live config on startup. The current system only uses the Discord collector plus inbox ingestion; the older meetings collector is not part of the active runtime path.

If important Discord threads are being missed by high-signal digesting, add them to `discord.thread_promotion.thread_ids` in the active `space.json`. The digest will also auto-promote thread activity when it crosses the configured `min_messages` and `min_participants` thresholds.

Example request:

```bash
curl -H "X-Prism-Api-Key: replace-me" http://127.0.0.1:8788/memory/latest
```

Active config example:

```bash
curl -H "X-Prism-Api-Key: replace-me" \
  http://127.0.0.1:8788/config/space
```

Config update example:

```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "X-Prism-Api-Key: replace-me-ops" \
  http://127.0.0.1:8788/config/space \
  -d '{
    "config": {
      "space_slug": "raidguild",
      "timezone": "America/Denver",
      "collectors": [],
      "discord": {
        "category_to_bucket": {},
        "bucket_defaults": {"mode": "high_signal"},
        "bucket_overrides": {},
        "thread_promotion": {
          "enabled": true,
          "thread_ids": [],
          "min_messages": 6,
          "min_participants": 2
        }
      },
      "knowledge": {
        "enabled": true,
        "docs_root": "superprism_poc/raidguild/knowledge/kb/docs",
        "metadata_root": "superprism_poc/raidguild/knowledge/kb/metadata",
        "index_root": "superprism_poc/raidguild/knowledge/kb/indexes",
        "triage_root": "superprism_poc/raidguild/knowledge/kb/triage",
        "activity_path": "superprism_poc/raidguild/knowledge/kb/activity/kb_activity.jsonl",
        "state_path": "superprism_poc/raidguild/knowledge/kb/state/kb_index_state.json",
        "triage_run_time_local": "18:15",
        "index_run_time_local": "18:25",
        "max_docs_per_triage_run": 20,
        "kinds": ["architecture", "guide", "policy", "proposal", "reference", "note"],
        "constraints": {
          "allowed_kinds": ["architecture", "guide", "policy", "proposal", "reference", "note"],
          "allowed_tags": ["knowledge", "workflow", "template", "newsletter", "announcement", "meeting"],
          "allowed_status": ["draft", "active", "archived", "deprecated"],
          "allowed_audiences": ["internal", "public"],
          "allowed_stability": ["evergreen", "evolving"],
          "max_tags_per_doc": 12,
          "max_entities_per_doc": 20,
          "max_related_docs_per_doc": 20,
          "require_owner": true,
          "strict_tag_enforcement": true
        }
      },
      "inbox": {
        "memory": {
          "default_bucket": "knowledge",
          "channel_name": "memory-inbox",
          "max_files_per_run": 100,
          "allowed_extensions": [".md", ".json"]
        }
      },
      "state": {
        "projects": {
          "enabled": true,
          "activity_windows": {
            "active_days": 7,
            "watching_days": 30
          },
          "detection": {
            "category_rules": [
              {
                "rule_id": "raids-prefix",
                "bucket": "raids",
                "channel_name_prefixes": ["raid-"],
                "mode": "canonical_project_channel"
              }
            ],
            "fallback_channel_name_prefixes": []
          }
        }
      },
      "run": {
        "digest_run_time_local": "17:30",
        "memory_run_time_local": "17:45",
        "github_backup_run_time_local": "18:05"
      }
    }
  }'
```

Participant activity example:

```bash
curl -H "X-Prism-Api-Key: replace-me" \
  "http://127.0.0.1:8788/memory/participants?start=2026-03-08T00:00:00Z&end=2026-03-09T00:00:00Z&bucket=knowledge&limit=20"
```

Memory ops example:

```bash
curl -X POST \
  -H "X-Prism-Api-Key: replace-me" \
  "http://127.0.0.1:8788/ops/memory/run?backfill_hours=24"
```

This route runs `collect -> digest -> memory -> state(projects) -> seeds` only.

Memory backfill example:

```bash
curl -X POST \
  -H "X-Prism-Api-Key: replace-me" \
  "http://127.0.0.1:8788/ops/memory/backfill?days=30"
```

This route runs a full multi-day `collect -> digest -> memory -> state(projects) -> seeds` recompute. It also does not run GitHub backup.

Knowledge ops example:

```bash
curl -X POST \
  -H "X-Prism-Api-Key: replace-me" \
  "http://127.0.0.1:8788/ops/knowledge/run"
```

Skill listing example:

```bash
curl -H "X-Prism-Api-Key: replace-me" \
  http://127.0.0.1:8788/skills
```

Skill download example:

```bash
curl -H "X-Prism-Api-Key: replace-me" \
  -o prism-api-reader.tar.gz \
  http://127.0.0.1:8788/skills/prism-api-reader/download
```

Product suggestion example:

```bash
curl -H "X-Prism-Api-Key: replace-me" \
  http://127.0.0.1:8788/products/suggestions/latest
```

Weekly product suggestion example:

```bash
curl -H "X-Prism-Api-Key: replace-me" \
  http://127.0.0.1:8788/products/suggestions/weekly/2026-W10
```

### POST /knowledge/inbox

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Prism-Api-Key: replace-me" \
  http://127.0.0.1:8788/knowledge/inbox \
  -d '{
    "filename": "playbook.md",
    "content": "# Title\nBody...",
    "metadata": {
      "title": "Ops Playbook",
      "slug": "ops-playbook",
      "kind": "guide",
      "summary": "How to run ops",
      "tags": ["operations"],
      "owners": ["ops-team"],
      "status": "draft",
      "audience": "internal",
      "stability": "evolving",
      "updated": "2026-03-01",
      "entities": [],
      "related_docs": [],
      "triaged_at": "2026-03-08T19:25:00Z"
    }
  }'
```

### POST /memory/inbox

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Prism-Api-Key: replace-me" \
  http://127.0.0.1:8788/memory/inbox \
  -d '{
    "source": "ops-digest",
    "ts": "2026-03-08T19:30:00Z",
    "type": "summary",
    "content": "Key decisions from the ops huddle...",
    "bucket": "knowledge",
    "author": "ops-lead",
    "url": "https://example.com/ops-notes",
    "participants": ["ops-lead", "alice", "bob"],
    "participant_count": 3
  }'
```
