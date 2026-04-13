# Data Model: Diagram Persistence

**Feature**: 001-diagram-persistence | **Date**: 2026-03-27

## Entities

---

### DiagramRecord

The full persisted diagram, stored as `mcp-server/data/diagrams/<id>.json`.

| Field       | Type            | Description                                              | Required |
|-------------|-----------------|----------------------------------------------------------|----------|
| `id`        | UUID string     | Unique identifier generated at creation                  | Yes      |
| `name`      | string          | Human-readable label for the diagram                     | Yes      |
| `payload`   | DiagramPayload  | The full diagram JSON (entities, relationships, metadata)| Yes      |
| `createdAt` | ISO 8601 string | Timestamp when the record was first created              | Yes      |
| `updatedAt` | ISO 8601 string | Timestamp of the last save/update                        | Yes      |

**Validation rules**:
- `id`: non-empty UUID; used as filename and URL path segment
- `name`: non-empty string; max 200 characters; trimmed
- `payload`: must satisfy the existing `DiagramPayload` Zod schema (entities + relationships validation already in `contracts.ts`)
- `createdAt` / `updatedAt`: valid ISO 8601; `updatedAt` ≥ `createdAt`

---

### DiagramListEntry

Lightweight summary returned in list responses. No `payload` field to avoid loading full diagram data unnecessarily.

| Field       | Type            | Description                       |
|-------------|-----------------|-----------------------------------|
| `id`        | UUID string     | Unique identifier                 |
| `name`      | string          | Human-readable label              |
| `updatedAt` | ISO 8601 string | Timestamp of last save            |

---

### SaveDiagramRequest (inbound)

Request body for `POST /api/diagrams` and `PUT /api/diagrams/:id`.

| Field     | Type           | Description                         | Required |
|-----------|----------------|-------------------------------------|----------|
| `name`    | string         | Diagram label (defaults to "Untitled Diagram" if omitted) | No |
| `payload` | DiagramPayload | Full diagram JSON                   | Yes      |

---

## File Layout

```text
mcp-server/
└── data/
    ├── current-diagram.json         # Existing — unchanged
    └── diagrams/                    # New — one file per saved diagram
        ├── <uuid-1>.json            # DiagramRecord JSON
        ├── <uuid-2>.json
        └── ...
```

**Index strategy**: No separate index file. The list operation reads the `diagrams/` directory, parses each file, and returns `DiagramListEntry` projections sorted by `updatedAt` descending. Given typical diagram counts (tens to low hundreds), a directory scan is fast enough for phase 1.

---

## Relationships to Existing Model

```
DiagramRecord.payload  →  DiagramPayload  (existing type, unchanged)
DiagramPayload.entities[]  →  Entity      (existing type, unchanged)
DiagramPayload.relationships[]  →  Relationship  (existing type, unchanged)
```

The new entities are additive — no existing types or files are modified in terms of schema.

---

## State Transitions

```
[not saved]  --POST /api/diagrams-->  [saved: id assigned, createdAt = updatedAt = now]
[saved]      --PUT /api/diagrams/:id--> [saved: updatedAt = now, payload updated]
[saved]      --DELETE /api/diagrams/:id--> [deleted: file removed]
```
