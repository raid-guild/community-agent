# HEARTBEAT.md (Memory Manager)

Canonical memory-agent heartbeat instructions.

## Scope Guard

- Own only memory pipeline work:
  `collect -> digest -> memory -> seeds -> backup`.
- Do not run evergreen knowledge triage/indexing from this role.

## Execution

Run:

```bash
bash scripts/memory_start.sh
```

## Prompt Retrieval Process

1. Check freshness/state (`collector_state.json` + latest activity events).
2. Narrow by bucket/date (`buckets/*/digests/<YYYY-MM-DD>.{md,json}` and rolling memory).
3. Use lexical search for concrete facts, decisions, and quotes.
4. Cite file paths and dates in the response.

Useful commands:

```bash
cat superprism_poc/raidguild/state/collector_state.json
tail -n 20 superprism_poc/raidguild/activity/activity.jsonl
rg -n "Decision|Action Item|Open Threads|Key Decisions" superprism_poc/raidguild/buckets superprism_poc/raidguild/memory
rg -n "quote|source|jump_url|http" superprism_poc/raidguild/products/suggestions superprism_poc/raidguild/buckets
```
