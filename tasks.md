# Tasks: Large Diagram Fit And Readability

Generated from the current Angular diagram implementation and the requested improvement for large MCP-loaded diagrams. This repository does not contain `.specify` planning assets, so the tasks below are synthesized directly from the live code in `ngdiagram-app`.

## Phase 1: Setup

Goal: establish the implementation surface for viewport fitting and dense-node readability.

- [X] T001 Review the current viewport restore and `zoomToFit` call sites in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`
- [X] T002 Review current node width, text overflow, and port density constraints in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/nodes/entity-node.component.scss` and `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/nodes/entity-node.component.html`

## Phase 2: Foundational

Goal: add the shared sizing and viewport rules required by all user stories.

- [X] T003 Define shared fit-to-view padding, zoom clamp, and large-graph threshold constants in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`
- [X] T004 [P] Add reusable graph-density and viewport decision helpers for fresh loads vs restored layouts in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`

## Phase 3: User Story 1 - Fit Large Diagrams On Load (P1)

Story goal: as a user opening a large imported diagram, I can see the full graph in the canvas without manual panning or unusable zoom.

Independent test criteria: load a large MCP-backed diagram and confirm the initial viewport frames the whole graph with usable zoom and visible minimap coverage.

- [X] T005 [US1] Refactor initial graph rebuild flow to apply adaptive fit-to-view after node and edge updates in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`
- [X] T006 [US1] Update browser-file load and server restore flows to re-fit large diagrams instead of preserving stale off-screen viewport state in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`
- [X] T007 [P] [US1] Add an explicit toolbar action to reset and fit the canvas for the current diagram in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`

## Phase 4: User Story 2 - Keep Dense Nodes Readable (P2)

Story goal: as a user inspecting dense diagrams, I can read entity names and metadata without broken wrapping, clipped labels, or oversized nodes dominating the canvas.

Independent test criteria: load a dense diagram with long entity and table names and confirm node cards stay compact, labels remain legible, and text overflow is handled predictably.

- [X] T008 [US2] Redesign node width, min-height, header spacing, and overflow rules for dense diagrams in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/nodes/entity-node.component.scss`
- [X] T009 [US2] Update the node template to support readable truncation and accessible full-label hover text in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/nodes/entity-node.component.html`
- [X] T010 [US2] Add computed display helpers for compact labels and tooltip text in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/nodes/entity-node.component.ts`
- [X] T011 [P] [US2] Tune relationship port sizing and spacing so crowded nodes do not expand excessively in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/nodes/entity-node.component.scss` and `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/nodes/entity-node.component.ts`

## Phase 5: User Story 3 - Preserve Usable Viewport Restore Behavior (P3)

Story goal: as a returning user, I can restore saved layouts without getting dropped into an unreadable zoom level when the graph shape or size changes.

Independent test criteria: save a viewport on a small graph, switch to a much larger graph, then restore state and confirm the app falls back to a readable fit when the saved viewport is no longer appropriate.

- [X] T012 [US3] Compare saved viewport metadata against current graph density before restoring in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`
- [X] T013 [P] [US3] Update saved-state creation to persist enough viewport metadata for restore decisions in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`

## Final Phase: Polish & Cross-Cutting Concerns

Goal: finish the feature with consistent behavior and clear operator guidance.

- [X] T014 [P] Add concise user-facing copy for fit/reset behavior in the toolbar and empty-state messaging in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`
- [X] T015 [P] Document manual verification steps for large-diagram fit and dense-node readability in `/Users/mehdi/MyProject/elegent-spring-diagram/README.md`

## Dependencies

- Setup (Phase 1) must complete before Foundational (Phase 2).
- Foundational (Phase 2) must complete before User Story 1, User Story 2, and User Story 3.
- User Story 1 is the MVP and should land first.
- User Story 2 depends on the shared density rules from Phase 2 but is otherwise independent from User Story 3.
- User Story 3 depends on the viewport decision helpers from Phase 2 and should follow User Story 1.
- Polish tasks should run after the target user stories are complete.

## Dependency Graph

- Phase 1 -> Phase 2 -> US1
- Phase 2 -> US2
- Phase 2 -> US3
- US1 -> Polish
- US2 -> Polish
- US3 -> Polish

## Parallel Execution Examples

- US1: T006 and T007 can run in parallel after T005 establishes the shared fit behavior in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`
- US2: T009 and T011 can run in parallel after T008 defines the compact node layout contract
- US3: T012 and T013 can run in parallel once the restore heuristic shape is agreed in `/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts`

## Implementation Strategy

- Deliver MVP first by completing Phase 1, Phase 2, and User Story 1 to fix the worst usability problem: large diagrams not fitting in view.
- Add User Story 2 next to make dense diagrams readable without bloated nodes or broken wrapping.
- Finish with User Story 3 so persisted browser state does not reintroduce bad viewport behavior on larger graphs.
- Close with the polish phase to align UI copy and verification guidance.
