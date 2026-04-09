# HEARTBEAT.md (Knowledge Manager)

Canonical knowledge-agent heartbeat instructions.

## Scope Guard

- Own only evergreen knowledge work:
  `triage -> metadata -> validate -> index`.
- Do not run memory collector/digest/memory/seeds/backup from this role.

## Execution

Run:

```bash
bash scripts/knowledge_start.sh
```

## Prompt Retrieval Process

1. Narrow by metadata indexes (`manifest/tags/entities`).
2. Run lexical search over canonical docs for exact language.
3. Open top docs and extract short supporting quotes.
4. Respond with citations to file paths.

Useful commands:

```bash
jq '.[] | {path,title,kind,tags,status,entities}' superprism_poc/raidguild/knowledge/kb/indexes/manifest.json | head -n 40
jq '.memory // []' superprism_poc/raidguild/knowledge/kb/indexes/tags.json
rg -n "rolling memory|digest|collector state|raid" superprism_poc/raidguild/knowledge/kb/docs
```
