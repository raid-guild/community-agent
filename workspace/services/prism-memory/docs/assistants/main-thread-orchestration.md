# Main Thread Orchestration

How the primary agent coordinates Maester Raida + the Archivist when they run as one-off sub-agents.

## Files of record
- `<workspace-root>/HEARTBEAT.md` – heartbeat checklist (run cadence + stagger rules)
- `<workspace-root>/memory/heartbeat-state.json` – timestamps of the most recent runs
- `docs/assistants/one-off-runs.md` – `sessions_spawn` payload templates
- `docs/assistants/orchestrator.md` – higher-level responsibilities and hand-off rules

## Cadence
- **Maester (memory)** every 3 hours
- **Archivist (knowledge)** every 3 hours, but only after Maester has run within the last 90 minutes
- Never launch both in the same heartbeat; if both are overdue, run Maester now and Archivist on the next heartbeat.

## Heartbeat flow
1. Load `memory/heartbeat-state.json`.
2. Decide which agent is due per the cadence above.
3. If none, reply `HEARTBEAT_OK` and stop.
4. If one is due:
   - Spawn the appropriate one-off sub-agent using the template in `docs/assistants/one-off-runs.md`.
   - Wait for the run summary.
   - Update `memory/heartbeat-state.json` with the ISO timestamp for the agent that just ran.
   - Record any notable outputs in `memory/YYYY-MM-DD.md` for historical context.

## Failure handling
- If a run fails, note it in `memory/YYYY-MM-DD.md`, leave the timestamp untouched (so the next heartbeat retries), and escalate in the main chat if human attention is required.
- If git conflicts arise, pause the other lane until the conflict is cleared, then resume the staggered cadence.
