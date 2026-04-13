# Implementation Plan: Diagram Persistence

**Branch**: `001-diagram-persistence` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-diagram-persistence/spec.md`

## Summary

Add named diagram snapshot persistence to the Node.js/Express server via a new `POST/GET/PUT/DELETE /api/diagrams` (plural) REST API backed by a local JSON file store. The existing singular `/api/diagram` endpoint is untouched. The API contract is designed to remain stable when the storage layer is replaced by a Spring Boot + PostgreSQL back-end in a future phase.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20+
**Primary Dependencies**: Express 4, Zod (already in use), `node:fs/promises` (no new deps required)
**Storage**: JSON files under `mcp-server/data/diagrams/` — one file per saved diagram, named `{id}.json`; index maintained separately in `mcp-server/data/diagrams-index.json`
**Testing**:
- `mcp-server/`: no unit-test framework configured; backend routes are validated via curl scenarios in `quickstart.md` and end-to-end via the Playwright suite below.
- `ngdiagram-app/`: Playwright already wired up (`playwright.config.ts`, `e2e/domain-model.spec.ts`, npm scripts `e2e`, `e2e:headed`, `e2e:ui`). New e2e specs covering the `/api/diagrams` CRUD UI flow live alongside the existing one under `ngdiagram-app/e2e/`. Specs mock `/api/diagrams` via `page.route` so they run without a live backend in CI, and the same flows can be driven interactively via the Playwright MCP server (`@playwright/mcp`) from a Claude Code chat for selective exploration and reporting.
**Target Platform**: Local development server (localhost:3100); consumed by Angular 18 SPA at localhost:4200
**Project Type**: Web service (Node.js REST server) + SPA frontend
**Performance Goals**: Save/load < 2 s; list < 1 s (file I/O on local disk — trivially achievable)
**Constraints**: API contract must be stable across storage replacements (FR-007, FR-008); single-user; no auth; no hard diagram limit in Phase 1
**Scale/Scope**: Small — handful of diagrams per session; single server instance; no concurrency concerns at this scale

## Constitution Check

The project constitution is a template placeholder — no active project-level principles are defined. Standard engineering principles apply:
- Keep new code in existing packages; do not introduce new packages or frameworks.
- The API surface (paths, request/response shapes) must be stable (specced in `contracts/`).
- The frontend must require zero changes when the storage layer is replaced.

**Gate result**: PASS — no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-diagram-persistence/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── diagrams-api.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code

```text
mcp-server/
├── src/
│   ├── contracts.ts            ← extend with SavedDiagram types
│   ├── diagram-store.ts        ← existing (singular, unchanged)
│   ├── diagrams-store.ts       ← NEW: multi-diagram CRUD store
│   └── server.ts               ← add /api/diagrams routes
└── data/
    ├── current-diagram.json    ← existing (unchanged)
    └── diagrams/               ← NEW: named snapshot storage
        ├── diagrams-index.json ← NEW: list index
        └── {id}.json           ← NEW: individual snapshots

ngdiagram-app/
├── src/app/
│   ├── graph/services/
│   │   └── diagram-api.service.ts   ← add save/load/list methods
│   └── layout/default-layout/       ← add save/load UI affordance
└── e2e/
    ├── domain-model.spec.ts         ← existing (unchanged)
    └── diagrams-persistence.spec.ts ← NEW: Playwright e2e for /api/diagrams CRUD UI flow
```

**Structure Decision**: Two-package web application (mcp-server + ngdiagram-app). Backend additions are a new store module + new routes alongside existing code. Frontend additions extend the existing service and add minimal UI to the sidebar/offcanvas.

## Complexity Tracking

No constitution violations to justify.
