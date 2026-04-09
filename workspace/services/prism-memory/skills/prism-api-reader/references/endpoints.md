# Prism Reader Endpoints

Base URL:

```text
https://<service-domain>
```

Auth header:

```text
X-Prism-Api-Key: <read-only-key>
```

Examples:

```bash
curl -H "X-Prism-Api-Key: $PRISM_API_READ_KEY" \
  "$PRISM_API_BASE/memory/latest"
```

```bash
curl -H "X-Prism-Api-Key: $PRISM_API_READ_KEY" \
  "$PRISM_API_BASE/memory/participants?start=2026-03-21T00:00:00Z&end=2026-03-24T00:00:00Z&bucket=guildhq&limit=20"
```

```bash
curl -H "X-Prism-Api-Key: $PRISM_API_READ_KEY" \
  "$PRISM_API_BASE/knowledge/search?q=discord&limit=10"
```

```bash
curl -H "X-Prism-Api-Key: $PRISM_API_READ_KEY" \
  "$PRISM_API_BASE/knowledge/docs/discord-bots"
```
