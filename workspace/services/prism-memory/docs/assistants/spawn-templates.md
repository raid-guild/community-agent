# Sub-agent Spawn Templates

Use these as references when launching the specialist agents via `sessions_spawn`.

## Maester Raida (Memory Manager)
```
sessions_spawn({
  "task": "Operate Maester Raida: run memory pipeline per skill instructions.",
  "label": "maester-raida",
  "runtime": "subagent",
  "cwd": "<workspace-root>",
  "attachments": [
    {"name": "skills/memory-manager-subagent", "content": "<SKILL PACKAGE>"}
  ],
  "mode": "session",
  "thread": true
})
```
- Load `skills/memory-manager-subagent/` before issuing commands.
- Set working dir to this repo root after spawn.

## Archivist of the Keep (Knowledge Manager)
```
sessions_spawn({
  "task": "Operate the Archivist: triage and index knowledge capsules.",
  "label": "archivist-knowledge",
  "runtime": "subagent",
  "cwd": "<workspace-root>",
  "attachments": [
    {"name": "skills/knowledge-manager-subagent", "content": "<SKILL PACKAGE>"}
  ],
  "mode": "session",
  "thread": true
})
```
- Load `skills/knowledge-manager-subagent/` immediately.
- Switch to this repo root once running.

Replace `<SKILL PACKAGE>` with the packaged `.skill` payload or mount the skill directory directly when spawning from this workspace.
