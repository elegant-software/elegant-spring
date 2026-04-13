# Research: Diagram Persistence

**Feature**: 001-diagram-persistence | **Date**: 2026-03-27

## Decisions

---

### Decision 1: Phase 1 Storage Mechanism

**Decision**: File-per-diagram JSON files under `mcp-server/data/diagrams/<id>.json`

**Rationale**:
- Consistent with the existing `current-diagram.json` pattern already in `diagram-store.ts`
- Each diagram is independently readable/writable with no risk of corruption to other diagrams
- No additional dependencies required
- Easy to inspect and debug during development
- Trivially replaced: swapping the storage layer only requires changing `multi-diagram-store.ts` without touching routes or front-end

**Alternatives considered**:
- **Single JSON file (array/map of all diagrams)** — Rejected: concurrent write risk; whole file rewritten on each save; harder to scale
- **SQLite (via `better-sqlite3`)** — Rejected: adds a native dependency; overkill for phase 1 given the file store already works and Spring Boot will replace it

---

### Decision 2: Diagram ID Generation

**Decision**: Use `crypto.randomUUID()` (Node.js built-in since v14.17)

**Rationale**:
- No extra dependency
- Globally unique, URL-safe when used as a path segment
- Standard practice for REST resource IDs

**Alternatives considered**:
- **nanoid** — Rejected: adds a dependency for the same outcome
- **timestamp-based IDs** — Rejected: collision risk in rapid succession; not semantically meaningful

---

### Decision 3: Duplicate Name Handling

**Decision**: Allow duplicate names; treat each save as a new record with its own UUID. Names are human labels, not unique keys.

**Rationale**:
- Spec FR-001 says "save the current diagram state" without uniqueness constraint on name
- Overwrite-or-new is a scope clarification that wasn't raised; "new record" is the safer default (no accidental data loss)
- A future "overwrite" or "versioning" feature can be added without breaking the API contract

**Alternatives considered**:
- **Enforce unique names** — Rejected: adds complexity, requires a lookup-by-name index, and may surprise users who want named snapshots

---

### Decision 4: Diagram Naming

**Decision**: Name is an optional field supplied by the client; defaults to `"Untitled Diagram"` if omitted.

**Rationale**:
- Spec requires a human-readable name but doesn't specify how it's provided
- Optional with a sensible default avoids blocking saves when the UI hasn't yet added a name input

---

### Decision 5: API Contract Design (stable across phase 1 → phase 2)

**Decision**: RESTful resource design under `/api/diagrams` following standard CRUD conventions.

```
POST   /api/diagrams          → 201 Created  { id, name, updatedAt }
GET    /api/diagrams          → 200 OK        [ { id, name, updatedAt }, ... ]
GET    /api/diagrams/:id      → 200 OK        { id, name, payload, updatedAt }
PUT    /api/diagrams/:id      → 200 OK        { id, name, updatedAt }
DELETE /api/diagrams/:id      → 204 No Content
```

**Rationale**:
- Standard REST semantics; any HTTP client (Angular, Spring Boot proxy, curl) works without adaptation
- Path and response shapes are technology-agnostic — the Spring Boot layer can implement the same contract without the front-end knowing
- `PUT` for updates keeps `POST` strictly for creation, making idempotency predictable

**Alternatives considered**:
- **Reuse `POST /api/diagram` (singular)** — Rejected: breaks the existing single-diagram endpoint's contract; mixing concerns
- **GraphQL** — Rejected: no GraphQL infrastructure exists in this project; adds significant setup overhead

---

### Decision 6: Relationship to Existing `current-diagram` Store

**Decision**: The existing single-diagram store (`diagram-store.ts`, `GET/POST /api/diagram`, WebSocket) is left completely unchanged. The new multi-diagram store is additive.

**Rationale**:
- Preserves all existing MCP tools and WebSocket real-time functionality
- Zero risk of regression to working features
- The "current diagram" concept (what's being actively viewed/edited) is distinct from "saved diagrams" (persisted named snapshots)

---

### Decision 7: Error Handling

**Decision**: Return standard HTTP error codes with JSON body `{ "error": "<message>" }`.

| Scenario | HTTP Status |
|----------|-------------|
| Diagram not found | 404 |
| Invalid payload (Zod validation fail) | 400 |
| Storage write failure | 500 |
| Missing required field | 400 |

**Rationale**: Consistent with how the existing `/api/diagram` endpoint signals errors; easy for the Angular service to handle uniformly.
