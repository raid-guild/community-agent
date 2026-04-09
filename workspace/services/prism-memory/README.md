# Prism Memory Starter

This starter is the smallest useful slice of the active `prism-memory` system.
It gives you:

- the Python code for memory collection, digesting, rolling memory, knowledge validation, indexing, and the optional memory API
- the shell scripts that an agent can run for memory and knowledge operations
- starter config/state/inbox/knowledge scaffolding
- role docs and skill files you can load into an OpenClaw-like harness

It intentionally does **not** include live RaidGuild runtime data like raw transcripts, digests, rolling memory snapshots, or committed activity history.

## What Is Included

```text
scripts/                             agent entrypoints
skills/                              role skills + OpenClaw upload assets
docs/assistants/                     role boundaries and heartbeat docs
docs/collectors.md                   custom collector contract
examples/custom_collectors/          example fork-friendly collector scripts
superprism_poc/raidguild/code/       runnable Python packages
superprism_poc/raidguild/config/     starter space config
superprism_poc/raidguild/state/      starter state files
superprism_poc/raidguild/inbox/      shared intake lanes
superprism_poc/raidguild/knowledge/  starter evergreen KB scaffold
```

## Quick Start

1. Copy `.env.example` to `.env` and fill in the collector credentials you actually use.
2. Review `superprism_poc/raidguild/config/space.json` and change bucket mappings, tags, and schedule times for your space.
3. Set `PYTHONPATH=superprism_poc/raidguild/code`.
4. Run the targeted commands from repo root:

```bash
python3 -m community_memory.pipeline collect --base superprism_poc --space raidguild
python3 -m community_memory.pipeline digest --base superprism_poc --space raidguild --date YYYY-MM-DD
python3 -m community_memory.pipeline memory --base superprism_poc --space raidguild --date YYYY-MM-DD
python3 -m community_memory.pipeline seeds --base superprism_poc --space raidguild --date YYYY-MM-DD
python3 -m community_knowledge validate --base superprism_poc --space raidguild
python3 -m community_knowledge index --base superprism_poc --space raidguild
```

Or use the wrappers:

```bash
bash scripts/memory_start.sh
bash scripts/knowledge_start.sh
bash scripts/start-workers.sh
```

In this Prism Agent template, `scripts/start-workers.sh` is the long-running scheduler entrypoint used by PM2. It waits for the local API, optionally runs a one-time initial backfill, and then triggers `/ops/memory/run` and `/ops/knowledge/run` every `PRISM_WORKER_INTERVAL_MINUTES`.

## Collector Model

Collector behavior is configured in `superprism_poc/raidguild/config/space.json`.

Built-in collector implementations shipped in the starter:

- `discord_latest`
- `latest_meetings`
- `inbox_memory`

Additional collector modes now supported:

- `type: "python"` for a collector class in a Python module
- `type: "command"` for a collector script or command declared in config

What a developer can change without code changes:

- enable or disable any built-in collector
- change `window_minutes` and `initial_backfill_hours`
- repoint env-backed endpoints like `DISCORD_LATEST_URL` and `MEETINGS_LATEST_URL`
- change bucket mappings and defaults in `space.json`

What still requires code changes:

- changing the payload contract expected by a built-in collector
- changing downstream digest or memory behavior

If you add an unknown builtin collector key to `config.collectors`, the pipeline skips it with a warning.
If you want fork-specific collectors, use `type: "python"` or `type: "command"`.
See `docs/collectors.md`.

## Required Environment

Collectors (configured in `superprism_poc/raidguild/config/space.json`):

Discord latest messages collector (`discord_latest`):

- `DISCORD_LATEST_URL`
- `DISCORD_LATEST_KEY`
- `SPACE_HEAP_ID`
- `DISCORD_GUILD_ID`

Latest meetings collector (`latest_meetings`, optional):

- `MEETINGS_LATEST_URL` for any HTTP endpoint that returns the payload shape expected by the built-in `latest_meetings` collector
- `SPACE_HEAP_ID`

Other optional environment:

- `PRISM_API_KEY` for the API
- `PRISM_API_ROOT_PATH` for the HTTP route prefix. Default: `/prism-memory`
- `PRISM_WORKERS_ENABLED` to disable the PM2-managed worker loop when set to `0`
- `PRISM_WORKER_INTERVAL_MINUTES` to change the default 30-minute cadence
- `PRISM_WORKER_INITIAL_BACKFILL_DAYS` to change the one-time startup backfill window. Default: `3`
- `PRISM_WORKER_RUN_BACKFILL_ON_START=0` to skip the automatic initial backfill
- `MEMORY_API_URL` if you use `scripts/memory_api_watchdog.sh`

The API server already supports both `root_path` and strip-prefix handling. With the default config in this template, the intended routed path is `/prism-memory/*`, while direct local calls without the prefix remain accepted for backward compatibility.

GitHub backup/push:

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_TOKEN`

### Rolling Memory Tuning

Rolling memory carries highlights and action items forward across days using configurable limits and staleness windows (implemented in `superprism_poc/raidguild/code/community_memory/memory.py`).

Defaults (when no env vars are set):

- max items per section:
	- `open_threads`: 10
	- `key_decisions`: 10
	- `action_items`: 10
	- `facts`: 10
	- `upcoming`: 5
- staleness windows:
	- `PRISM_MEMORY_STALE_MARK_DAYS` default: 2 (items older than 2 days are marked stale)
	- `PRISM_MEMORY_STALE_DROP_DAYS` default: 4 (items older than 4 days are dropped)

You can override these with environment variables:

- `PRISM_MEMORY_MAX_OPEN_THREADS`
- `PRISM_MEMORY_MAX_KEY_DECISIONS`
- `PRISM_MEMORY_MAX_ACTION_ITEMS`
- `PRISM_MEMORY_MAX_FACTS`
- `PRISM_MEMORY_MAX_UPCOMING`
- `PRISM_MEMORY_STALE_MARK_DAYS`
- `PRISM_MEMORY_STALE_DROP_DAYS`

All values are integers; invalid or missing values fall back to the defaults above. Changes take effect on the next API / pipeline process restart.

Note:

- the local `scripts/memory_start.sh` path can run `backup` and then `git push`
- the current Railway API trigger path uses `/ops/memory/run`, which runs `collect -> digest -> memory -> seeds` and does not perform GitHub backup

## OpenClaw-Style Harness

There are two workable patterns.

### 1. Single automation agent

Use `skills/openclaw/prism-memory-ops/` as the uploaded skill.

Recommended runtime assumptions:

- working directory: this repo root
- environment: values from `.env`
- command prefix: `PYTHONPATH=superprism_poc/raidguild/code`

Good first prompts:

- `Run a memory pipeline health check, report collector state, and tell me what is missing before a full run.`
- `Validate the knowledge index state and rebuild indexes if needed.`

### 2. Split specialist agents

For a harness that supports multiple agents or long-lived roles:

- memory role prompt source: `docs/assistants/memory-manager/{IDENTITY,HEARTBEAT}.md`
- knowledge role prompt source: `docs/assistants/knowledge-manager/{IDENTITY,HEARTBEAT}.md`
- memory role skill: `skills/memory-manager-subagent/`
- knowledge role skill: `skills/knowledge-manager-subagent/`

Suggested commands:

- memory role: `bash scripts/memory_start.sh`
- knowledge role: `bash scripts/knowledge_start.sh`
- pause a lane: `bash scripts/agent_pause.sh memory|knowledge|all`
- resume and sync a lane: `bash scripts/agent_unpause_sync.sh memory|knowledge`

## Notes

- The starter keeps the existing `raidguild` path and `--space raidguild` defaults so the code works immediately. If you want a different space slug, update config, commands, and any harness prompts together.
- `scripts/agent_unpause_sync.sh`, `scripts/memory_start.sh`, and `scripts/knowledge_start.sh` assume the repo has a Git remote and can `pull`/`push`. Remove or edit those steps if your harness runs against a local-only checkout.
- The API docs are in `docs/README.md`.
- Collector docs live in `superprism_poc/raidguild/code/community_memory/pipeline.py`, `superprism_poc/raidguild/code/community_memory/collector.py`, and `superprism_poc/raidguild/config/space.json`. There is not a separate plugin-authoring guide yet.
- Custom collector authoring is documented in `docs/collectors.md`.
