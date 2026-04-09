# One-off Sub-agent Runs

Until a channel plugin with `subagent_spawning` hooks is available, run the Memory + Knowledge specialists as **one-shot sub-agents** from the main session.

## Workflow
1. Ensure the gateway is paired (no `pairing required` errors).
2. Use `sessions_spawn` with `runtime: "subagent"` and `mode: "run"` (no `thread`).
3. In the task payload, tell the sub-agent which skill to load and what checklist to follow.
4. Wait for the auto-announced summary, then log any hand-offs in `memory/YYYY-MM-DD.md`.

## Templates

### Maester Raida (memory lane)
```jsonc
sessions_spawn({
  "task": "Load skills/memory-manager-subagent/SKILL.md from this repo, then run the requested pipeline steps.",
  "label": "maester-<slug>",
  "runtime": "subagent",
  "mode": "run",
  "cwd": "<workspace-root>"
})
```
- Specify the exact stages in `task` (collect/digest/seeds/etc.).
- Mention any env overrides (e.g., MEETINGS_LATEST_URL) up front.

### Archivist of the Keep (knowledge lane)
```jsonc
sessions_spawn({
  "task": "Load skills/knowledge-manager-subagent/SKILL.md from this repo, follow the triage checklist, and report back.",
  "label": "archivist-<slug>",
  "runtime": "subagent",
  "mode": "run",
  "cwd": "<workspace-root>"
})
```
- Include the target inbox slice or index job in the `task` block.

## Reporting checklist
- commit SHA + branch
- stages/actions executed
- artifacts created or inbox paths touched
- blockers or missing inputs

Record notable runs in `memory/YYYY-MM-DD.md` so the orchestrator has history between sessions.
