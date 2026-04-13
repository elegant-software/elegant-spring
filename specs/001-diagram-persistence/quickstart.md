# Quickstart: Diagram Persistence

**Feature**: 001-diagram-persistence | **Date**: 2026-03-27

## Prerequisites

- Node.js ≥ 18 (for `crypto.randomUUID()` built-in)
- The `mcp-server` dependencies already installed (`npm install` in `mcp-server/`)

## Running the Server

```bash
cd mcp-server
npm run dev          # starts Express on http://localhost:3100
```

The `mcp-server/data/diagrams/` directory is created automatically on first save.

## Testing the API (curl)

### Save a diagram

```bash
curl -s -X POST http://localhost:3100/api/diagrams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Diagram",
    "payload": {
      "projectName": "demo",
      "entities": [],
      "relationships": []
    }
  }' | jq .
```

Expected: `201 Created` with `{ id, name, updatedAt }`.

### List saved diagrams

```bash
curl -s http://localhost:3100/api/diagrams | jq .
```

Expected: array of `{ id, name, updatedAt }` sorted newest-first.

### Load a diagram

```bash
curl -s http://localhost:3100/api/diagrams/<id> | jq .
```

Expected: full `{ id, name, payload, updatedAt }`.

### Update a diagram

```bash
curl -s -X PUT http://localhost:3100/api/diagrams/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Renamed Diagram",
    "payload": { "projectName": "demo-v2", "entities": [], "relationships": [] }
  }' | jq .
```

Expected: `200 OK` with updated `{ id, name, updatedAt }`.

### Delete a diagram

```bash
curl -s -X DELETE http://localhost:3100/api/diagrams/<id> -o /dev/null -w "%{http_code}"
```

Expected: `204`.

## Files Created / Modified

| Path | Change |
|------|--------|
| `mcp-server/src/multi-diagram-store.ts` | New — multi-diagram file-based persistence |
| `mcp-server/src/server.ts` | Modified — adds `/api/diagrams` routes |
| `mcp-server/src/contracts.ts` | Modified — adds `DiagramRecord`, `DiagramListEntry` types |
| `mcp-server/data/diagrams/` | New directory — created at runtime |
| `ngdiagram-app/src/app/services/diagram-api.service.ts` | Modified — adds save/load/list methods |

## End-to-End Tests (Playwright)

The frontend ships with Playwright e2e specs under `ngdiagram-app/e2e/`. The `diagrams-persistence.spec.ts` file mocks `/api/diagrams**` via `page.route`, so it runs without a live `mcp-server`.

```bash
cd ngdiagram-app
npx playwright install chromium   # one-off; downloads the browser
npm run e2e                       # headless run, HTML report under playwright-report/
npm run e2e:headed                # watch the browser
npm run e2e:ui                    # interactive UI mode
```

The Playwright config auto-spawns `ng serve` on `http://127.0.0.1:4200` via its `webServer` block — no manual frontend boot needed.

## Interactive Exploration with Playwright MCP

For ad-hoc walkthroughs from a Claude Code chat (e.g. "save a diagram, list it, load it, report what you see"), register Microsoft's Playwright MCP server once:

```bash
claude mcp add playwright -- npx -y @playwright/mcp@latest
```

Restart Claude Code so the new `mcp__playwright__*` tools become available, then:

1. In one terminal, start the backend: `cd mcp-server && npm run dev`
2. In another, start the frontend: `cd ngdiagram-app && npm start`
3. In the chat, ask the assistant to drive `http://localhost:4200/#/domain-model` through the save/list/load/delete flow.

Unlike the headless e2e suite, the MCP-driven session hits the **real** `/api/diagrams` endpoints, so it exercises the file store under `mcp-server/data/diagrams/` end-to-end. Use it for selective exploration and reporting; use `npm run e2e` for regression gating.

## Verifying the Stable Contract

To verify the contract stability guarantee, run the following against both the node server (phase 1) and a future Spring Boot server (phase 2) — the responses must be identical:

```bash
# Save
POST /api/diagrams  →  201 { id, name, updatedAt }
# List
GET  /api/diagrams  →  200 [{ id, name, updatedAt }]
# Load
GET  /api/diagrams/:id  →  200 { id, name, payload, updatedAt }
```

If the Spring Boot implementation returns these same shapes, no front-end changes are needed.
