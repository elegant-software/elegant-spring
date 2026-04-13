# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A JPA domain model diagram viewer. A Node.js/TypeScript backend serves diagram data over REST and WebSocket; an Angular 18 frontend renders it using the `ng-diagram` library inside a CoreUI admin shell. The backend also doubles as an MCP server (stdio transport) so AI assistants can read and write diagrams directly.

## Two independent packages

```
mcp-server/       Node.js + TypeScript — Express REST + WebSocket + MCP stdio server
ngdiagram-app/    Angular 18 — SPA frontend
```

Each has its own `package.json`. Commands below must be run from within their respective directories.

## Commands

### mcp-server

```bash
npm run dev          # Start Express server in watch mode (port 3100)
npm run dev:mcp      # Start MCP stdio server (for testing MCP tools directly)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled dist/server.js
npm run start:mcp    # Run compiled dist/stdio.js (MCP stdio entrypoint)
npm run check        # Type-check without emitting
```

### ngdiagram-app

```bash
npm start            # ng serve with proxy → localhost:4200
npm run build        # Production build → dist/ngdiagram-app/
npm test             # Karma + Jasmine unit tests
```

## Architecture

### Data flow

```
Angular (4200) ──HTTP proxy──▶ Express (3100) ──read/write──▶ mcp-server/data/current-diagram.json
              ──WebSocket──▶  WS /ws/diagram
```

- Angular's dev server proxies `/api/*` and `/ws/*` to `localhost:3100` via `ngdiagram-app/proxy.conf.json`
- On startup the frontend fetches `GET /api/diagram` for the initial state, then opens a WebSocket
- The server watches `current-diagram.json` with a 500 ms poll; on change it broadcasts `diagram.updated` to all WebSocket clients

### mcp-server internals

| File | Role |
|------|------|
| `src/server.ts` | Express + WebSocket server entry point |
| `src/stdio.ts` | MCP stdio server entry point |
| `src/mcp-server.ts` | MCP tool/resource/prompt definitions |
| `src/diagram-store.ts` | File-based persistence for the single active diagram |
| `src/contracts.ts` | Zod schemas + TypeScript types for `DiagramPayload`, entities, relationships |

The HTTP server and MCP stdio server share the same file store, so MCP tool writes are visible to the dashboard in real time.

### Angular internals

- `graph/graph.component.ts` — main diagram view; uses `ng-diagram` for rendering, handles fit-to-screen and node selection
- `graph/services/diagram-api.service.ts` — HTTP + WebSocket client
- `layout/default-layout/` — CoreUI shell (sidebar, topbar, offcanvas AI chat)
- `app.routes.ts` — routes: `#/dashboard`, `#/domain-model`, `#/users`, `#/settings`

## Payload contract

Validation is enforced by Zod in `contracts.ts`. Key rules:
- `entities` must be non-empty and all IDs unique
- relationship `source` / `target` must reference existing entity IDs
- `metadata.kind` must be `"jpa-entity"`
- `relationType` must be one of `OneToOne | OneToMany | ManyToOne | ManyToMany`

The sample domain (Employee / Department / Salary) lives both as a constant in `diagram-store.ts` and as `mcp-server/data/current-diagram.json`.

## MCP tools exposed

- `get_current_diagram` — full payload
- `get_entity_details` — single entity + its relationships
- `set_current_diagram` — replace entire diagram (accepts payload as JSON string)
- `reset_sample_diagram` — restore Employee/Department/Salary sample

## Known constraints

- No test files exist in `mcp-server/` — the test framework is not configured there
- The Angular build emits a non-blocking style budget warning for `graph.component`
- `set_current_diagram` takes the payload as a serialised JSON string (not an object) for broad MCP client compatibility
- Streamable HTTP MCP transport is not implemented; only stdio is supported

## Spec workflow (SpecKit)

Feature specs live in `specs/<feature-branch>/`. Use speckit slash commands:
- `/speckit.specify <description>` — create spec + branch
- `/speckit.plan` — generate research, data model, contracts, quickstart
- `/speckit.tasks` — generate task list

Active feature: `001-diagram-persistence` — adds `POST/GET/PUT/DELETE /api/diagrams` (plural) for saving named diagram snapshots. The existing singular `/api/diagram` endpoint is unchanged.

## Active Technologies
- TypeScript 5 / Node.js 20+ + Express 4, Zod (already in use), `node:fs/promises` (no new deps required) (001-diagram-persistence)
- JSON files under `mcp-server/data/diagrams/` — one file per saved diagram, named `{id}.json`; index maintained separately in `mcp-server/data/diagrams-index.json` (001-diagram-persistence)

## Recent Changes
- 001-diagram-persistence: Added TypeScript 5 / Node.js 20+ + Express 4, Zod (already in use), `node:fs/promises` (no new deps required)
