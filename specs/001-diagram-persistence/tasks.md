# Tasks: Diagram Persistence

**Input**: Design documents from `/specs/001-diagram-persistence/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/rest-api.md ✓, research.md ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story (US1 → US2 → US3) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on sibling tasks)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)

---

## Phase 1: Setup

**Purpose**: Verify both packages compile cleanly before making changes.

- [ ] T001 [P] Verify `mcp-server/` compiles without errors: run `npm run check` from `mcp-server/`
- [ ] T002 [P] Verify `ngdiagram-app/` builds without errors: run `npm run build` from `ngdiagram-app/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New shared Zod schemas/types and the multi-diagram file store module — must be complete before any route or UI work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Add `DiagramRecord`, `DiagramListEntry`, and `SaveDiagramRequest` Zod schemas and TypeScript types to `mcp-server/src/contracts.ts` — append after existing exports; do not modify existing schemas. `DiagramRecord` fields: `id` (UUID string), `name` (string, max 200, trimmed), `payload` (existing `DiagramPayload`), `createdAt` (ISO 8601), `updatedAt` (ISO 8601). `DiagramListEntry`: `id`, `name`, `updatedAt`. `SaveDiagramRequest`: `name` (optional, defaults to "Untitled Diagram"), `payload` (required `DiagramPayload`).
- [ ] T004 Create `mcp-server/src/diagrams-store.ts` implementing file-based multi-diagram CRUD: `ensureDiagramsDir()`, `createDiagram(name, payload)`, `getDiagram(id)`, `listDiagrams()`, `updateDiagram(id, name, payload)`, `deleteDiagram(id)` — uses `node:fs/promises` and `crypto.randomUUID()`; stores one JSON file per diagram under `mcp-server/data/diagrams/<uuid>.json`; `listDiagrams()` scans the directory and returns `DiagramListEntry[]` sorted by `updatedAt` descending (no separate index file per data-model.md decision)

**Checkpoint**: `npm run check` must pass in `mcp-server/` before proceeding.

---

## Phase 3: User Story 1 — Save a Diagram (Priority: P1) 🎯 MVP

**Goal**: A user can save the current active diagram to a named snapshot on the server and receive a success confirmation.

**Independent Test**: `POST /api/diagrams` with a valid payload returns `201 { id, name, updatedAt }` and the file exists on disk under `mcp-server/data/diagrams/`.

### Implementation

- [ ] T005 [US1] Add `POST /api/diagrams` route to `mcp-server/src/server.ts` — parse body with `SaveDiagramRequest` Zod schema, call `createDiagram()`, return `201 { id, name, updatedAt }`; return `400 { error }` on validation failure, `500 { error }` on store failure
- [ ] T006 [P] [US1] Add `DiagramListEntry` and `DiagramRecord` response types to `ngdiagram-app/src/app/graph/services/diagram-api.service.ts` — TypeScript interfaces matching the contract in `contracts/rest-api.md`
- [ ] T007 [US1] Add `saveDiagram(name: string, payload: any): Observable<DiagramListEntry>` method to `DiagramApiService` in `ngdiagram-app/src/app/graph/services/diagram-api.service.ts` — POSTs to `/api/diagrams` with `{ name, payload }`
- [ ] T008 [US1] Add a "Save Diagram" button to `ngdiagram-app/src/app/layout/default-layout/default-layout.component.ts` — opens an inline name input, calls `saveDiagram()` with the current diagram state, shows success/error toast feedback via CoreUI toast or alert

**Checkpoint**: Open app → click Save → enter name → confirm `201` response and file appears in `mcp-server/data/diagrams/`.

---

## Phase 4: User Story 2 — Load a Saved Diagram (Priority: P2)

**Goal**: A user can retrieve and restore a previously saved diagram by its ID.

**Independent Test**: `GET /api/diagrams/:id` returns `200 { id, name, payload, updatedAt }` for a known ID and `404 { error: "Diagram not found" }` for an unknown ID. Loading from the UI replaces the current diagram view.

### Implementation

- [ ] T009 [US2] Add `GET /api/diagrams/:id` route to `mcp-server/src/server.ts` — call `getDiagram(id)`, return `200` with full `DiagramRecord` (id, name, payload, updatedAt); return `404 { error: "Diagram not found" }` if missing, `500 { error }` on store failure
- [ ] T010 [P] [US2] Add `loadDiagram(id: string): Observable<DiagramRecord>` method to `DiagramApiService` in `ngdiagram-app/src/app/graph/services/diagram-api.service.ts` — GETs `/api/diagrams/:id`
- [ ] T011 [US2] Wire the load action in `ngdiagram-app/src/app/layout/default-layout/default-layout.component.ts` — given a selected diagram ID from the list, call `loadDiagram()` and push the returned payload into the active diagram state; show error message if not found

**Checkpoint**: Save a diagram → reload the page → load the saved diagram by ID → all nodes and edges are restored.

---

## Phase 5: User Story 3 — List and Delete Saved Diagrams (Priority: P3)

**Goal**: A user can browse all saved diagrams (name + last-saved date), pick one to load, or delete one.

**Independent Test**: `GET /api/diagrams` returns an array of `{ id, name, updatedAt }` sorted by `updatedAt` descending; returns `[]` when no diagrams exist. `DELETE /api/diagrams/:id` returns `204` for existing, `404` for missing.

### Implementation

- [ ] T012 [P] [US3] Add `GET /api/diagrams` route to `mcp-server/src/server.ts` — call `listDiagrams()`, return `200` with `DiagramListEntry[]` sorted newest-first; return `500 { error }` on store failure
- [ ] T013 [P] [US3] Add `DELETE /api/diagrams/:id` route to `mcp-server/src/server.ts` — call `deleteDiagram(id)`, return `204`; return `404 { error: "Diagram not found" }` if not found, `500 { error }` on failure
- [ ] T014 [US3] Add `listDiagrams(): Observable<DiagramListEntry[]>` and `deleteDiagram(id: string): Observable<void>` methods to `DiagramApiService` in `ngdiagram-app/src/app/graph/services/diagram-api.service.ts`
- [ ] T015 [US3] Add a saved-diagrams panel/list to `ngdiagram-app/src/app/layout/default-layout/default-layout.component.ts` — fetches diagram list on open, displays name + date for each entry, "Load" button triggers T011 load flow, "Delete" button calls `deleteDiagram()` and refreshes the list; shows empty-state message when no diagrams exist

**Checkpoint**: Save 2 diagrams → open the list → both appear with names and dates → load one → active diagram updates → delete one → list refreshes with only the remaining entry.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete the CRUD surface with update support and verify the full contract.

- [ ] T016 [P] Add `PUT /api/diagrams/:id` route to `mcp-server/src/server.ts` — parse body with `SaveDiagramRequest`, call `updateDiagram(id, name, payload)`, return `200 { id, name, updatedAt }`; return `404` if not found, `400` on validation failure, `500` on store failure
- [ ] T017 [P] Add `updateDiagram(id: string, name: string, payload: any): Observable<DiagramListEntry>` method to `DiagramApiService` in `ngdiagram-app/src/app/graph/services/diagram-api.service.ts`
- [ ] T018 Verify all five routes (`POST`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`) match the contract in `specs/001-diagram-persistence/contracts/rest-api.md` — paths, HTTP methods, status codes, and response shapes
- [ ] T019 Run quickstart.md curl scenarios from `specs/001-diagram-persistence/quickstart.md` against the running server and confirm all expected status codes and response shapes

---

## Phase 7: Playwright E2E Coverage

**Purpose**: Add headless e2e regression coverage for the `/api/diagrams` CRUD UI flow, plus enable interactive Playwright MCP exploration from a Claude Code chat. Specs mock the new endpoints via `page.route` so they run without a live backend (matching the pattern in the existing `e2e/domain-model.spec.ts`).

**Prerequisites**: Phases 3–5 (US1/US2/US3 UI affordances) must be merged so the buttons and panel exist to drive.

- [ ] T020 Ensure Playwright Chromium is installed locally: run `npx playwright install chromium` from `ngdiagram-app/` (one-off; CI-equivalent of the existing `e2e` script). Document the command in `quickstart.md`.
- [ ] T021 [P] Create `ngdiagram-app/e2e/diagrams-persistence.spec.ts` with a `test.describe('Diagrams persistence')` block. In `beforeEach`, install a `page.route('**/api/diagrams**', …)` handler that maintains an in-memory `Map<id, DiagramRecord>` and answers:
  - `POST /api/diagrams` → `201 { id: <uuid>, name, updatedAt }` (store the record)
  - `GET /api/diagrams` → `200 [{ id, name, updatedAt }]` sorted newest-first
  - `GET /api/diagrams/:id` → `200 { id, name, payload, updatedAt }` or `404`
  - `PUT /api/diagrams/:id` → `200 { id, name, updatedAt }` or `404`
  - `DELETE /api/diagrams/:id` → `204` or `404`
  Also mock the existing `GET /api/diagram` (singular) so the page bootstraps without a live backend.
- [ ] T022 [P] [US1] Add e2e test *"saves the active diagram via the new Save Diagram button"* to `diagrams-persistence.spec.ts` — drives the T008 UI: open the save affordance, type a name, click Save, assert the mocked POST captured the payload + name, assert success toast/feedback is visible.
- [ ] T023 [P] [US3] Add e2e test *"lists saved diagrams in the diagram picker panel"* — pre-seed the in-memory store with two records via two POST calls (or by direct map seeding), open the list panel, assert both names + relative dates render, sorted newest-first.
- [ ] T024 [P] [US2] Add e2e test *"loads a saved diagram and replaces the active view"* — seed one record whose payload contains a uniquely-named entity (e.g. "RestoredEntity"), click Load on that row, assert the entity heading appears in the diagram view (mirrors the assertion style used in `domain-model.spec.ts`).
- [ ] T025 [P] [US3] Add e2e test *"deletes a saved diagram and refreshes the list"* — seed two records, click Delete on one, confirm any in-app prompt, assert the row disappears and only the remaining entry is rendered.
- [ ] T026 [US1+US2] Add e2e test *"renames a saved diagram via PUT and reflects the new name in the list"* — covers the T016/T017 update path: load a saved diagram, change the name, save, assert the mocked PUT was called with the new name and the list refreshes with the new label.
- [ ] T027 Run `npm run e2e` from `ngdiagram-app/` and confirm all specs in `e2e/` pass (existing `domain-model.spec.ts` must still pass — Phase 7 must not regress it).
- [ ] T028 [P] Document the Playwright MCP option in `quickstart.md`: how to register the MCP server (`claude mcp add playwright -- npx -y @playwright/mcp@latest`), restart Claude Code, and prompt the assistant to drive the save/list/load/delete flow against `npm run dev` + `npm start` for ad-hoc exploration. Note that MCP-driven runs use the **real** backend (not the `page.route` mocks) so they exercise the file store end-to-end.

**Checkpoint**: `npm run e2e` is green; `e2e/diagrams-persistence.spec.ts` covers all five CRUD flows; quickstart documents both the headless and MCP-interactive paths.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3 (US1 Save)**: Depends on Phase 2 completion
- **Phase 4 (US2 Load)**: Depends on Phase 2 completion; can run in parallel with Phase 3 (different routes)
- **Phase 5 (US3 List/Delete)**: Depends on Phase 2 completion; can run in parallel with Phases 3 & 4
- **Phase 6 (Polish)**: Depends on Phases 3, 4, and 5 completion
- **Phase 7 (Playwright E2E)**: Depends on Phases 3, 4, 5 (UI affordances must exist) and Phase 6 (PUT route for rename test T026)

### User Story Dependencies

- **US1 (P1 Save)**: No dependency on US2 or US3
- **US2 (P2 Load)**: No dependency on US1 or US3 (can test with a manually created file)
- **US3 (P3 List/Delete)**: No dependency on US1 or US2 (can test with manually created files)

### Parallel Opportunities

- T001 and T002 (setup verification) can run in parallel
- T003 then T004 must run sequentially — T004 imports types from T003
- T005 and T006 (US1 backend route + Angular types) can run in parallel
- T009 and T010 (US2 backend route + Angular method) can run in parallel
- T012 and T013 (US3 list + delete routes) can run in parallel
- T016 and T017 (PUT route + Angular method) can run in parallel
- T021–T026 (e2e specs) can be authored in parallel after T020 — they live in one file but cover independent `test(...)` blocks; T028 (quickstart docs) is independent of the spec files

---

## Parallel Example: Phase 3 (US1)

```bash
# These can run in parallel (different files, no dependency):
Task T005: Add POST /api/diagrams route to mcp-server/src/server.ts
Task T006: Add Angular types to ngdiagram-app/src/app/graph/services/diagram-api.service.ts

# T007 depends on T006; T008 depends on T007:
Task T007: Add saveDiagram() to DiagramApiService
Task T008: Add Save button to default-layout.component.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: Foundational types + store module
3. Complete Phase 3: US1 Save (T005–T008)
4. **STOP and VALIDATE**: `POST /api/diagrams` returns `201`; file exists on disk; UI save button works
5. Demo / checkpoint

### Incremental Delivery

1. Setup + Foundational → store module ready
2. US1 Save → `POST /api/diagrams` + UI save action (MVP)
3. US2 Load → `GET /api/diagrams/:id` + UI load action
4. US3 List/Delete → `GET /api/diagrams` + diagram picker panel + `DELETE`
5. Polish → PUT update + contract verification + quickstart validation

---

## Notes

- [P] tasks = different files, no inter-task dependency
- No test framework is configured in `mcp-server/` — acceptance testing is manual (curl / browser)
- The existing `/api/diagram` (singular) routes and WebSocket are **not touched** in any task
- No separate index file — `listDiagrams()` scans the `diagrams/` directory (per data-model.md decision)
- Duplicate diagram names are allowed (per research.md Decision 3)
- Commit after each phase checkpoint; each phase produces a working, independently-testable increment
- Total tasks: **28** across 3 user stories + setup/foundational/polish/e2e
- Phase 7 e2e specs follow the existing `domain-model.spec.ts` mocking pattern (`page.route` over `/api/diagrams**`); they do **not** require a running `mcp-server` instance
- Playwright MCP (`@playwright/mcp`) is an interactive supplement to — not a replacement for — the headless `npm run e2e` regression suite
