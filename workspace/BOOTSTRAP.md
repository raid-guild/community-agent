# Prism Agent Bootstrap

This workspace is the deployable runtime for the Prism Agent production template.

On the first deploy and test pass, confirm:

1. The template branding defaults are acceptable for a fresh community install.
2. The full required runtime secrets are present and the template boots the entire stack without service-level toggles.
3. The manifest build path succeeds end to end, including build, migrate, and seed.
4. The PM2 runtime starts the expected services together: API, site, Discord wrapper, Prism Memory API, and Prism Memory workers.
5. The public routes behave correctly under Pinata routing: `/api`, `/site`, and `/prism-memory`.
6. The seeded admin flow, content editor, points, and leaderboard all work as a real post-deploy smoke test, and any optional private profile import succeeds only when explicitly requested.
7. Prism Memory writes a live `config/space.json` under the active data root on first startup, and if Discord credentials are present it auto-discovers the guild categories instead of staying on the inert starter collector mapping.

Useful runtime surfaces for that validation:

- Prism worker defaults live in `workspace/.env` and `workspace/.env.local` via `PRISM_WORKER_*` settings.
- Prism Memory live config is stored at `services/prism-memory/.../config/space.json` for the starter repo and at `PRISM_API_DATA_ROOT/config/space.json` in deployed environments; startup now syncs the live file automatically, and `PRISM_SPACE_CONFIG_REFRESH=1` forces a rebuild from the current Discord guild shape.
- Runtime shell wording lives in `data/site-content.json` and is editable from the admin UI at `/site/app/admin/content`.
- PM2 service composition lives in `ecosystem.config.cjs`.
- The local operator flow is `npm install`, `npm run bootstrap`, then `npm run pm2:start`; the manifest-style entrypoints remain `scripts/build-all.sh` and `scripts/start-all.sh runtime`, and direct PM2 operator access should go through `scripts/pm2w.sh` or the `npm run pm2:*` scripts so a global PM2 install is never required. Local daemon starts go through `scripts/pm2-ensure.sh`, which resurrects a saved PM2 process list when present and otherwise boots from `ecosystem.config.cjs`, then saves the resulting process list for the next restart.
- Private member exports should stay out of git. If you need to fold them into production once, keep the JSON in a private location and run `npm run seed:profiles -- /path/to/profiles.json` after bootstrap.

After the first successful production-template test, update the identity files with the intended template defaults, tighten any remaining onboarding copy, and replace this bootstrap with community-specific guidance only if the template is being forked for a single deployment.