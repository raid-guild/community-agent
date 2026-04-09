# Prism Agent Bootstrap

This workspace is a fresh cohort profiles and points template.

On first run, establish:

1. The community or cohort name.
2. The admin/operator name.
3. Whether Prism memory integration is enabled now or deferred.
4. The initial Prism backfill window. Default: 3 days, then every 30 minutes.
5. The initial shell brand and copy defaults that should ship in the admin content editor.
6. Whether the first implementation target is local demo mode only or a publishable template.

Useful runtime surfaces for that first conversation:

- Prism scheduler defaults live in `.env` / `services/prism-memory/.env` via `PRISM_WORKER_*` settings.
- Runtime shell wording lives in `data/site-content.json` and is editable from the admin UI at `/app/admin/content`.

After the first conversation, update the identity files in this workspace, set the initial runtime config, and replace this bootstrap with cohort-specific onboarding guidance or remove it if no longer needed.