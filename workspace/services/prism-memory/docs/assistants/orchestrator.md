# Orchestrator Role

The primary agent coordinates the two specialist sub-agents defined in this directory.

## Responsibilities
1. **Launch & lifecycle**
   - Spawn Maester Raida using the `memory-manager-subagent` skill.
   - Spawn the Archivist of the Keep using the `knowledge-manager-subagent` skill.
   - Pause/unpause each lane via their respective scripts when needed.
2. **Work routing**
   - Send collection/digest/backups to Maester only.
   - Forward knowledge inbox triage/indexing to the Archivist only.
3. **Hand-off enforcement**
   - Maester writes hand-off artifacts to `superprism_poc/raidguild/knowledge/kb/triage/inbox/`.
   - The orchestrator alerts the Archivist when new material arrives; Archivist acknowledges once processed.
4. **Health monitoring**
   - Track the latest run report from each agent (commit SHA, stages, blockers).
   - `curl -sf http://127.0.0.1:8788/health`; if it fails, restart the API server.
   - Escalate to humans when both agents identify cross-lane issues (e.g., schema drift, missing env vars).
5. **Audit logging**
   - Maintain a short log in `community_memory/` or `memory/YYYY-MM-DD.md` summarizing notable pipeline events, so future sessions know the state.

## Spawn template
When creating a new sub-agent session, include:
- Skill reference (`skills/<role>-subagent/`)
- Repo path (this repository root)
- Environment expectations (required secrets, env vars)
- Reporting target (send summaries back to the orchestrator session)
