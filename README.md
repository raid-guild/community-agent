# Prism Agent

Prism Agent is a Pinata template for launching a community agent around your Discord server, member directory, points system, and shared memory layer.

It is built for communities that want more than a chatbot. This template gives you a branded site, a structured API, admin tools, member profiles, badges, leaderboards, and Prism memory services so your community can operate like a real product instead of a pile of scripts.

## Why This Template Exists

Most community tooling stops at one narrow use case: a bot, a leaderboard, a landing page, or a notes system. Prism Agent combines those into one deployable community agent that can:

- present a public-facing community site under `/site`
- manage profiles, claims, points, badges, and admin workflows under `/api`
- expose Prism-backed community memory at `/prism-memory`
- optionally bridge Discord intake into your downstream agent runtime

The result is a better starting point for cohorts, guilds, DAO working groups, residency programs, learning communities, and contributor networks.

## What You Get

- a TypeScript Express API for auth, profiles, points, taxonomy, integrations, and admin flows
- a Next.js front end with member directory, profile pages, leaderboard, account area, and admin screens
- runtime-editable site copy in `workspace/data/site-content.json` so you can change branding and navigation without rebuilding the site
- SQLite as the primary app database with the Pinata sqlite sync skill pinned by CID for backup/versioning
- PM2-managed runtime for the web app and supporting services
- an optional Discord wrapper service for mention intake and latest-message collection
- a Prism memory API plus an optional worker loop for shared community memory

## Deploy Shape

Public routes exposed by the template:

- `/api` for the application backend
- `/site` for the community-facing web app
- `/prism-memory` for the Prism memory API

Internal-only runtime pieces stay behind the scenes. The Discord intake service is separate and is not exposed as a public Pinata route by default.

## Required Inputs

For a standard Pinata deploy, the only required secrets are:

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`

Everything else is optional until you explicitly enable it. That keeps the template prompt surface narrow and makes the first deploy simpler.

## What Makes It A Community Agent

This template is opinionated in the right places:

- community identity lives in profiles, handles, badges, and points instead of ephemeral chat history
- shared memory is treated as community memory, not as the app's source of truth
- the public site, admin tooling, and automation surface are part of the same product
- Discord can feed the system, but the community is not trapped inside Discord

If you want to run a community like a product team, this is the starting point.

## Local Build And Start

Build the main app:

```bash
npm --prefix workspace run build
SITE_BASE_PATH=/site npm --prefix workspace/portfolio-site run build
```

Start the manifest-style runtime:

```bash
bash workspace/scripts/start-all.sh
```

That startup path uses PM2 and is the closest match to how the template runs in deployment.

## Runtime Services

Discord wrapper:

- lives under `workspace/services/discord-bot`
- handles mention intake and latest-message collection
- forwards internal chat-response requests into the main app
- is optional and internal-only by default

Prism memory:

- lives under `workspace/services/prism-memory`
- exposes `/prism-memory`
- is part of the default template runtime and public route shape
- can optionally run worker jobs on an interval under PM2
- is meant for community memory and retrieval, not as the primary app database

## First Things To Customize

After deploy, the usual first edits are:

1. Update branding and shell copy in the admin content UI at `/site/app/admin/content`.
2. Adjust seeded profiles, roles, skills, and taxonomy for your community.
3. Decide whether you want Discord mention replies enabled and wire the downstream agent endpoint if you do.
4. Decide whether Prism memory should run with just the API or also run scheduled workers from day one.
