# Prism Agent Implementation Notes

This document preserves the previous implementation-focused README.

# Prism Agent

Implementation workspace for the cohort profiles and points Pinata template.

This folder is the working implementation target for the docs in `cohort-agent/docs/` using `prism-xavhmw0b` as the current template reference.

## Current Status

The template is no longer just scaffolded. The current implementation includes:

- a TypeScript Express API under `workspace/src/`
- a Next.js site under `workspace/portfolio-site/`
- SQLite migrations and idempotent seed/import flow
- opaque DB-backed session auth
- profiles, seeded-profile claiming, public handle pages, member directory, points, badges, leaderboard, and admin change requests
- workspace-backed uploads served from `/api/uploads` and consumed under the `/site` base path
- PM2-managed runtime for the API and site
- optional separate-process services under `workspace/services/` for Discord chat intake and Prism memory

## Runtime Shape

- `/api` -> Express app API
- `/site` -> Next.js site
- `workspace/ecosystem.config.cjs` -> PM2 process map for the current runtime

The current PM2 ecosystem manages:

- `prism-agent-api`
- `prism-agent-site`

Optional service entries:

- `prism-agent-discord-bot`
- `prism-agent-prism-memory`

These services remain separate process and auth boundaries rather than being merged into the main `/api` surface. The Discord wrapper is implemented under `workspace/services/discord-bot`, and the vendored Prism memory service now lives under `workspace/services/prism-memory`.

## Workspace Shape

- `manifest.json` at the root with `agent`, `template`, `secrets`, `skills`, `scripts`, `routes`, and optional `tasks`.
- `workspace/` for the runnable agent workspace.
- Required workspace identity files copied by the template runtime:
  - `BOOTSTRAP.md`
  - `SOUL.md`
  - `AGENTS.md`
  - `IDENTITY.md`
  - `USER.md`
  - `TOOLS.md`
  - `HEARTBEAT.md`
- `workspace/src/` for the Express backend, DB helpers, migrations, and seed scripts.
- `workspace/portfolio-site/` for the Next.js frontend shell.
- `workspace/scripts/` for setup, start, health, and automation scripts.
- `workspace/services/` for optional separately managed runtime services such as the Discord wrapper and Prism memory.
- `skills/` for vendored Prism memory skills if they are copied into the template repo.
- `workspace/data/` for the SQLite database and local runtime data.
- `workspace/uploads/` for uploaded assets if the cohort template needs them.

## Key Decisions

1. Backend is TypeScript.
2. Auth uses opaque, database-backed cookie sessions instead of JWT.
3. API routes are normalized around `/api/auth/*`, `/api/profile/me`, `/api/profiles/:handle`, `/api/points/*`, `/api/taxonomy/*`, `/api/integrations/*`, and `/api/admin/*`.
4. Public routes are `/api` for the backend and `/site` for the frontend.
5. Secrets stay minimal. Pinata's manifest schema supports secret `name`, `description`, and `required`, but not default values, so runtime defaults are handled in code and startup scripts instead of in `manifest.json`.
6. For the current template, the only required deploy-time inputs are `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID`. Prism keys, admin overrides, and downstream agent endpoint settings stay optional until those features are enabled.
7. Pinata deploys should keep internal service-to-service traffic on loopback when the processes are colocated. The manifest now starts the workspace with `PINATA_USE_AGENT_HOST_PLACEHOLDER=1`, and the build/start scripts export `API_BASE_PATH=/api` and `SITE_BASE_PATH=/site` unless they are already set.
8. Prism is treated as community memory, not as the application's primary data store and not necessarily as the agent's only continuity layer.
9. SQLite remains the source of truth for app data, and the sqlite sync skill is pinned in the manifest by CID for backup/versioning alignment with the Pinata agent UI.
10. Prism skills can be pinned in the manifest by CID. Current pinned refs are for Prism API Digest and Prism API Reader; any additional Prism skills still need vendoring or pinned references before they should be added.
11. Forum/topic surfaces remain Phase 3 and out of the first implementation pass.
12. Future Discord bot and Prism memory starter services should remain separate process and route boundaries rather than being merged into the current `/api` surface.
13. True vendored OpenClaw startup is still not present in this repo. The template now supports Pinata-safe host and prefix resolution, but an OpenClaw binary or wrapper service still has to be added before Discord replies can be guaranteed to come from a template-owned OpenClaw runtime.
14. Prism memory now has its own default HTTP root path, `/prism-memory`, so it can be routed cleanly if the service is exposed later. The service still accepts unprefixed local paths for backward compatibility.

## Common Commands

- Build backend: `npm --prefix workspace run build`
- Build site: `SITE_BASE_PATH=/site npm --prefix workspace/portfolio-site run build`
- Build Discord wrapper: `npm --prefix workspace/services/discord-bot run build`
- Build Prism memory service: `npm --prefix workspace/services/prism-memory run build`
- Run manifest-style startup: `bash workspace/scripts/start-all.sh runtime`
- Run local backend hot reload: `npm --prefix workspace run dev`
- Run local site hot reload: `npm --prefix workspace/portfolio-site run dev:site`
- Run Discord wrapper directly: `DISCORD_BOT_TOKEN=... INTERNAL_SERVICE_TOKEN=... npm --prefix workspace/services/discord-bot run dev`
- Run Prism memory API directly: `PRISM_API_KEY=replace-me npm --prefix workspace/services/prism-memory run start`
- Run local PM2 daemon mode: `npm --prefix workspace run pm2:start`
- Stop PM2-managed services: `npm --prefix workspace run pm2:stop`

## Local Discord Test

For a real Discord bot-token test, keep the local setup explicit:

1. Create `workspace/.env.local` from `workspace/.env.example`.
2. Set `DISCORD_BOT_TOKEN` to the real bot token.
3. Set `DISCORD_GUILD_ID` to the test server id so `/discord/latest-messages` has a default guild.
4. Set `INTERNAL_SERVICE_TOKEN` to a random shared secret. This is the simplest way to keep the Express app, Discord wrapper, and Prism memory service on the same internal auth token.
5. Set `DISCORD_LATEST_KEY=$INTERNAL_SERVICE_TOKEN` so manual `latest-messages` checks and Prism collection use the same key.
6. Set `PRISM_API_KEY=$INTERNAL_SERVICE_TOKEN` if you want Prism memory running in the same local stack.
7. Leave `DISCORD_AGENT_ENDPOINT` pointed at `http://127.0.0.1:4433/api/internal/agents/discord/openclaw` and set `DISCORD_AGENT_AUTH_TOKEN=$INTERNAL_SERVICE_TOKEN` to keep the Discord handoff boundary inside the local API.
8. Set `OPENCLAW_AGENT_ENDPOINT` and `OPENCLAW_AGENT_AUTH_TOKEN` so that local adapter can forward into an actual OpenClaw or agent runtime.

`workspace/scripts/start-all.sh` now loads `workspace/.env` and `workspace/.env.local` before starting PM2, so the local manifest-style startup path can pick up those values without exporting them manually. Use `runtime` for container-style foreground execution and `npm --prefix workspace run pm2:start` when you want PM2 daemon persistence in a local shell.

Minimum Discord app setup in the Discord developer portal:

- Enable the Message Content intent.
- Enable the Server Members intent.
- Invite the bot to the test guild with permission to view channels, read message history, and send messages.
- If you want mention replies to create threads when possible, also allow public thread creation. Without that permission, the wrapper falls back to replying in the current channel.

Recommended local verification flow:

1. Build the services:
   `npm --prefix workspace run build && SITE_BASE_PATH=/site npm --prefix workspace/portfolio-site run build && npm --prefix workspace/services/discord-bot run build && npm --prefix workspace/services/prism-memory run build`
2. Start the stack:
   `bash workspace/scripts/start-all.sh runtime`
3. Check the wrapper health endpoint:
   `curl http://127.0.0.1:8790/health`
4. Probe latest messages directly:
   `curl -H "x-api-key: replace-with-your-shared-token" "http://127.0.0.1:8790/discord/latest-messages?guild_id=YOUR_GUILD_ID&since=$(date -u -d '2 hours ago' +%FT%TZ)&filters.ignore_bot_messages=true&max_messages_per_channel=25"`
5. If you are testing agent handoff, the local adapter is now the default internal path. Set `OPENCLAW_AGENT_ENDPOINT` to a reachable downstream agent runtime.
6. Mention the bot in a Discord channel and confirm it responds in the created thread or fallback channel. If `OPENCLAW_AGENT_ENDPOINT` is not configured, mention replies will fail with `OPENCLAW_AGENT_ENDPOINT_MISSING` even though `latest-messages` still works.
7. If Prism memory is enabled, verify it separately with `curl http://127.0.0.1:8788/health` and then run the collector job.

For Pinata template deploys, `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` are the only required manifest secrets. Everything else in the Discord handoff path is optional because the local wrapper URL, internal adapter URL, and shared internal service token all have runtime defaults now.

For Pinata-hosted deploys, the site can keep using `http://127.0.0.1:4433` for server-to-server traffic because the API and site are running on the same machine. The manifest lifecycle scripts now opt into a deploy mode that exports the route prefixes (`API_BASE_PATH=/api`, `SITE_BASE_PATH=/site`) so browser-facing paths stay correct, while internal fetches and rewrites can remain on loopback unless a public absolute URL is explicitly needed.

Use `__AGENT_HOST__` only for cases that truly need a public absolute URL, such as callback configuration, HMR/WebSocket host settings, or links rendered into external systems. It is not required for the API and site to talk to each other inside the same Pinata agent runtime.

Prism memory follows the same pattern now. Internal callers can keep using loopback, and the default local base URL is `http://127.0.0.1:8788/prism-memory`. If the service is exposed through a future public route, keep the same `/prism-memory` prefix and only switch the origin, not the internal service topology.

The Discord wrapper stays as a separate intake service. It creates or reuses a Discord reply thread, passes `guildId`, `channelId`, `threadId`, `authorName`, prompt text, and recent history to `/api/internal/discord/chat-response`, and that endpoint can now hand off to a downstream agent endpoint while preserving the Discord thread id as the session key.

The default local handoff now uses `/api/internal/agents/discord/openclaw` as an adapter boundary. That route stays behind the internal service token, normalizes the Discord session payload into a downstream agent request, and requires `OPENCLAW_AGENT_ENDPOINT` for the actual downstream runtime hop.

For the cleanest local test, use one explicit shared token rather than relying on the derived fallback from `ADMIN_PASSWORD`. That removes guesswork when calling `latest-messages` manually.

## Editable Site Copy

Top-level shell copy now lives in `workspace/data/site-content.json` and is loaded at runtime through `/api/site-content`.

This is the intended lightweight content layer for:

- the optional brand logo via `shell.logoUrl` and `shell.logoAlt`
- the sidebar brand/title/description
- primary navigation labels
- workspace page titles and intro copy

Changing `workspace/data/site-content.json` does not require a site rebuild. Refreshing the page is enough as long as the API and site are already running.

There is also an admin-protected write endpoint at `/api/admin/site-content` for future request automation or a small editor UI.

The first editor UI now lives at `/site/app/admin/content` and provides a validated JSON form for this runtime content file.

## Doc Map

- `cohort-agent/docs/developer-spec.md` - main application and data model spec
- `cohort-agent/docs/IMPLEMENTATION_PLAN.md` - phased implementation plan and current snapshot
- `cohort-agent/docs/CHECKLISTS.md` - implementation and deploy checklist state
- `cohort-agent/docs/memory-integration.md` - Prism integration boundary for the current app
- `cohort-agent/docs/service-topology-spec.md` - deferred multi-service plan for PM2, Discord bot, and Prism memory starter