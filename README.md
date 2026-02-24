# Agent Workflow – Communication Graphs

Initial architecture and API spec for visualizing AI agent or Spring Modulith module communication flows with **ngdiagram**. The goal is to provide a simple, mock-data backed graph API that the UI can render as nodes (agents/modules) and links (messages/relations).

## Architecture (high level)
- **Spring Modulith backend**  
  - `GraphController` exposes read-only REST endpoints (`/api/graph`) that return graph JSON.  
  - `GraphService` aggregates mock data now; later it can read Modulith structural metadata (applications/modules), observability traces, or event log streams.
- **Graph domain model**  
  - `Node` (id, name, type=`agent|module|broker`, status, metadata).  
  - `Link` (id, source, target, label, channel, latencyMs, meta).  
  - `LayoutHint` (optional x/y for deterministic layouts when desired).
- **ngdiagram front-end**  
  - Consumes `/api/graph` payload, mapping `Node` to diagram shapes and `Link` to connectors.  
  - Uses `type` to style shapes (e.g., agents = rounded rectangles, modules = hexagons, brokers = circles).  
  - Uses `status` to set color (healthy/warn/offline).

## API Spec (mocked)
Base URL: `/api/graph`

### GET `/api/graph`
Returns the current communication graph (agents + modules). Suitable for ngdiagram consumption.

Query params (optional):
- `view` – `agents` | `modules` | `all` (default `all`)
- `includeLayout` – `true|false` (default `false`)

Response: `200 OK`
```json
{
  "nodes": [
    {"id": "orchestrator", "name": "Orchestrator", "type": "agent", "status": "healthy"},
    {"id": "planner", "name": "Planner", "type": "agent", "status": "healthy"},
    {"id": "executor", "name": "Executor", "type": "agent", "status": "warn"},
    {"id": "knowledge-base", "name": "Knowledge Base", "type": "module", "status": "healthy"},
    {"id": "event-bus", "name": "Event Bus", "type": "broker", "status": "healthy"}
  ],
  "links": [
    {"id": "l1", "source": "orchestrator", "target": "planner", "label": "delegates", "channel": "HTTP"},
    {"id": "l2", "source": "planner", "target": "executor", "label": "tasks", "channel": "events"},
    {"id": "l3", "source": "executor", "target": "knowledge-base", "label": "queries", "channel": "gRPC"},
    {"id": "l4", "source": "planner", "target": "knowledge-base", "label": "context", "channel": "JDBC"},
    {"id": "l5", "source": "orchestrator", "target": "event-bus", "label": "publish", "channel": "Kafka"},
    {"id": "l6", "source": "event-bus", "target": "executor", "label": "consume", "channel": "Kafka"}
  ],
  "layoutHints": [
    {"id": "orchestrator", "x": 100, "y": 80},
    {"id": "planner", "x": 320, "y": 80},
    {"id": "executor", "x": 540, "y": 80},
    {"id": "knowledge-base", "x": 540, "y": 240},
    {"id": "event-bus", "x": 320, "y": 240}
  ]
}
```

Error responses:
- `400` – unsupported `view`
- `500` – server errors

### Future endpoints (optional)
- `GET /api/graph/modules/{moduleId}` – drill-down on a single Modulith module’s intra-module interactions.
- `GET /api/graph/events?fromTs=&toTs=` – time-windowed communication slices for playback in ngdiagram.

## ngdiagram rendering notes
- Use `nodes` as diagram shapes; map `type` to shape/icon and `status` to color.  
- Use `links` as connectors; map `channel` to line style (solid HTTP, dashed async, dotted broker).  
- If `layoutHints` is present and `includeLayout=true`, seed diagram coordinates for reproducible layouts; otherwise allow ngdiagram’s auto layout.

## Reference implementation (ng-diagram v1.0.0, Angular 18+)
Use **ng-diagram v1.0.0** with Angular standalone components and the library’s `initializeModel` helper. The full runnable component lives in [`graph.component.ts`](./graph.component.ts). A mock API server (Node.js built-ins only, no external npm deps) is provided in [`mock-server.js`](./mock-server.js).

```bash
npm install ng-diagram@latest @angular/core@18 @angular/common@18 @angular/platform-browser@18 rxjs zone.js
```

```typescript
// See full component in graph.component.ts
```

Style import (required):

```scss
/* src/styles.scss */
@import 'ng-diagram/styles.css';
```

Mock API response for local dev lives in [`graph-mock.json`](./graph-mock.json); serve it via `json-server`, a simple Express stub, or Angular’s `http-server` to test the diagram quickly.

### Run locally (mock)
```bash
# 1) Start mock API
node mock-server.js

# 2) Serve Angular app (example)
# - scaffold with Angular CLI or reuse your existing app
# - import GraphComponent (graph.component.ts) in main.ts
# - ensure styles import in src/styles.scss: @import 'ng-diagram/styles.css';
```

## Next steps
- Replace mock data with Modulith metadata (Spring Modulith `ApplicationModules`) and tracing data.  
- Add WebSocket/SSE push from the backend to stream updates to ngdiagram for near-real-time graphs.
