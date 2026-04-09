# Assistants Directory

Canonical role identities live here:

- `memory-manager/` for Maester Raida
- `knowledge-manager/` for Archivist of the Keep

Each role folder should contain:
- `IDENTITY.md`
- `HEARTBEAT.md`

Control-plane agent configs should reference these files as source of truth.

See `orchestrator.md` for how the primary agent coordinates the specialists.

## Sub-agent mapping
- **Maester Raida** → `skills/memory-manager-subagent/`
- **Archivist of the Keep** → `skills/knowledge-manager-subagent/`

The primary orchestrator agent should:
1. Load the appropriate skill before spawning each role.
2. Enforce lane boundaries (memory vs. knowledge).
3. Relay hand-offs: Maester drops candidates into `superprism_poc/raidguild/knowledge/kb/triage/inbox/`, then pings the Archivist.
4. Collect run reports (commit SHA, stages touched, blockers) from each sub-agent.
