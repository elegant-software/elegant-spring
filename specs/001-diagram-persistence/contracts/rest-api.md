# REST API Contract: Diagram Persistence

**Feature**: 001-diagram-persistence | **Date**: 2026-03-27
**Base URL**: `http://localhost:3100` (development) | `http://<host>:3100` (production)
**Content-Type**: `application/json` for all requests and responses

> **Stability guarantee**: This contract is the interface the Angular front-end depends on.
> The underlying implementation (node file store → Spring Boot + PostgreSQL) MUST NOT require
> any changes to these endpoint paths, methods, or response shapes.

---

## Endpoints

---

### Create Diagram

```
POST /api/diagrams
```

**Request body**:
```json
{
  "name": "My Spring Diagram",        // optional, defaults to "Untitled Diagram"
  "payload": { ...DiagramPayload... } // required
}
```

**Success response** — `201 Created`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Spring Diagram",
  "updatedAt": "2026-03-27T10:00:00.000Z"
}
```

**Error responses**:
- `400 Bad Request` — payload missing or fails validation
  ```json
  { "error": "Invalid diagram payload: <details>" }
  ```
- `500 Internal Server Error` — storage write failure
  ```json
  { "error": "Failed to save diagram" }
  ```

---

### List Diagrams

```
GET /api/diagrams
```

**Request body**: none

**Success response** — `200 OK`:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Spring Diagram",
    "updatedAt": "2026-03-27T10:00:00.000Z"
  },
  {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "name": "Employee Domain",
    "updatedAt": "2026-03-26T09:00:00.000Z"
  }
]
```

Ordered by `updatedAt` descending (most recently saved first).
Returns an empty array `[]` when no diagrams are saved.

**Error responses**:
- `500 Internal Server Error` — storage read failure
  ```json
  { "error": "Failed to list diagrams" }
  ```

---

### Get Diagram

```
GET /api/diagrams/:id
```

**Path parameter**: `id` — UUID of the saved diagram

**Success response** — `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Spring Diagram",
  "payload": { ...DiagramPayload... },
  "updatedAt": "2026-03-27T10:00:00.000Z"
}
```

**Error responses**:
- `404 Not Found`
  ```json
  { "error": "Diagram not found" }
  ```
- `500 Internal Server Error`
  ```json
  { "error": "Failed to load diagram" }
  ```

---

### Update Diagram

```
PUT /api/diagrams/:id
```

**Path parameter**: `id` — UUID of the saved diagram

**Request body**:
```json
{
  "name": "Updated Name",             // optional
  "payload": { ...DiagramPayload... } // required
}
```

**Success response** — `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Name",
  "updatedAt": "2026-03-27T11:00:00.000Z"
}
```

**Error responses**:
- `404 Not Found` — diagram with given ID does not exist
- `400 Bad Request` — payload invalid
- `500 Internal Server Error`

---

### Delete Diagram

```
DELETE /api/diagrams/:id
```

**Path parameter**: `id` — UUID of the saved diagram

**Success response** — `204 No Content` (empty body)

**Error responses**:
- `404 Not Found`
  ```json
  { "error": "Diagram not found" }
  ```
- `500 Internal Server Error`
  ```json
  { "error": "Failed to delete diagram" }
  ```

---

## DiagramPayload Shape

The `payload` field in requests and responses follows the existing type defined in `mcp-server/src/contracts.ts`. Key structure:

```json
{
  "projectName": "string",
  "entities": [
    {
      "id": "string",
      "label": "string",
      "status": "active | deprecated | new",
      "layoutHint": { "x": 0, "y": 0 },
      "metadata": { ...JPA metadata... }
    }
  ],
  "relationships": [
    {
      "id": "string",
      "source": "entity-id",
      "target": "entity-id",
      "label": "string",
      "channel": "string",
      "metadata": { ...relationship metadata... }
    }
  ]
}
```

The full schema is enforced server-side via Zod. The front-end should not duplicate this validation.

---

## Existing Endpoints (unchanged)

The following endpoints from the current implementation are NOT modified by this feature:

| Method | Path           | Description                          |
|--------|----------------|--------------------------------------|
| GET    | /api/diagram   | Get current (active) diagram         |
| POST   | /api/diagram   | Replace current (active) diagram     |
| GET    | /health        | Health check                         |
| WS     | /ws/diagram    | Real-time diagram updates            |

Note the singular `/api/diagram` vs. the new plural `/api/diagrams` — these are intentionally distinct resources.
