# Prism Agent Workspace

This workspace will follow the same broad packaging pattern as `prism-xavhmw0b/workspace`, but it is scoped to the cohort profiles and points template described in `cohort-agent/docs/`.

Initial scaffold directories already exist for:

- `src/`
- `scripts/`
- `data/`
- `uploads/`
- `portfolio-site/`

This workspace currently includes a minimal `package.json` and placeholder server so the root manifest has a valid target while the real backend is being implemented.

The next concrete step is to replace that placeholder with the actual Express plus SQLite backend described in `cohort-agent/docs/`.

## Process Model

The workspace now includes a PM2 ecosystem at `workspace/ecosystem.config.cjs`.

- `prism-agent-api`: Express plus SQLite API on port `4433`
- `prism-agent-site`: Next.js site on port `3000` with `SITE_BASE_PATH=/site`
- `prism-agent-discord-bot`: optional Discord wrapper, auto-added only if `workspace/services/discord-bot/package.json` exists and `DISCORD_BOT_TOKEN` is set
- `prism-agent-prism-memory`: Prism Memory API on port `8788`, auto-added when the service exists
- `prism-agent-prism-memory-workers`: Prism Memory scheduler loop, auto-added when the service exists unless `PRISM_WORKERS_ENABLED=0`

Recommended commands from `workspace/`:

- `npm run pm2:start` starts the API and site under the PM2 daemon for local use
- `npm run pm2:start:all` starts the API, site, and any optional services or workers that exist
- `npm run pm2:reload` reloads the current ecosystem after rebuilds or env changes
- `npm run pm2:stop` stops the managed processes
- `npm run pm2:logs` tails logs across the ecosystem
- `npm run start:runtime` runs `pm2-runtime` in the foreground for container-style startup

The existing `scripts/start-all.sh` now delegates to `npm run start:runtime`, which is a better fit for the Pinata manifest than the old backgrounded-shell approach.

## Prism Memory Workers

The build path already provisions the Prism Memory Python environment because `scripts/build-all.sh` runs the service-local `build` script, which creates `.venv` and installs `requirements.txt`.

At runtime, PM2 now launches a dedicated Prism worker loop alongside the API when the service is present. Defaults:

- `PRISM_WORKER_INTERVAL_MINUTES=30`
- `PRISM_WORKER_INITIAL_BACKFILL_DAYS=3`
- `PRISM_WORKER_RUN_BACKFILL_ON_START=1`

The initial backfill runs only once per active Prism data root and records a marker under `state/runtime/initial-backfill.done`. After that, the worker triggers the live API ops endpoints on the configured cadence.

For first-run copy and shell branding, prefer the runtime admin surface at `/app/admin/content`, which persists edits to `workspace/data/site-content.json` without rebuilding the Next site.