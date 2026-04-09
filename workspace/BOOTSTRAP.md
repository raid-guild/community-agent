# Prism Agent Bootstrap

This workspace is the deployable runtime for the Prism Agent production template.

On the first deploy and test pass, confirm:

1. The template branding defaults are acceptable for a fresh community install.
2. The minimal required secrets are present and the template still boots with everything else optional.
3. The manifest build path succeeds end to end, including build, migrate, and seed.
4. The PM2 runtime starts the expected services: API, site, and Prism Memory API by default, with workers only when enabled.
5. The public routes behave correctly under Pinata routing: `/api`, `/site`, and `/prism-memory`.
6. The seeded admin flow, content editor, profiles, points, and leaderboard all work as a real post-deploy smoke test.

Useful runtime surfaces for that validation:

- Prism worker defaults live in `.env` and `services/prism-memory/.env` via `PRISM_WORKER_*` settings.
- Runtime shell wording lives in `data/site-content.json` and is editable from the admin UI at `/site/app/admin/content`.
- PM2 service composition lives in `ecosystem.config.cjs`.
- The manifest-style build and start entrypoints are `scripts/build-all.sh` and `scripts/start-all.sh`.

After the first successful production-template test, update the identity files with the intended template defaults, tighten any remaining onboarding copy, and replace this bootstrap with community-specific guidance only if the template is being forked for a single deployment.