# Feature Specification: Diagram Persistence

**Feature Branch**: `001-diagram-persistence`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "I want to be able to save diagram json in the server, for now we will have this feature in node-server not sure were we can store and retrieve but later on I want to have API in Spring boot and postgress, API node will act like front-end for back-end as of now so when we have back-end api will backend for front-end will talk to our spring back-end"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save a Diagram (Priority: P1)

A user has created or modified a spring diagram and wants to save it so it persists across sessions. They trigger a save action and the diagram state is stored on the server. A success confirmation is shown.

**Why this priority**: This is the core capability — without save, no other persistence functionality is possible.

**Independent Test**: Can be fully tested by creating a diagram, saving it, reloading the page, and confirming the diagram can be retrieved from the server.

**Acceptance Scenarios**:

1. **Given** a user has an active diagram open, **When** they trigger the save action, **Then** the diagram data is stored on the server and a success confirmation is shown.
2. **Given** a save is initiated, **When** the server is unavailable, **Then** an informative error message is displayed and no data is silently lost.
3. **Given** a diagram has been saved previously, **When** the user saves again after making changes, **Then** the stored diagram reflects the latest state.

---

### User Story 2 - Load a Saved Diagram (Priority: P2)

A user opens the application and wants to continue working on a previously saved diagram. They select a saved diagram by its identifier and the full diagram state is restored in the editor.

**Why this priority**: Saving without retrieval delivers no value — load is the direct complement to save.

**Independent Test**: Can be fully tested by loading a previously saved diagram by identifier and confirming all nodes, edges, and layout are restored correctly.

**Acceptance Scenarios**:

1. **Given** at least one saved diagram exists, **When** the user requests to load it by identifier, **Then** the full diagram state is restored in the application.
2. **Given** a diagram identifier that does not exist, **When** the user attempts to load it, **Then** a clear "not found" message is displayed.

---

### User Story 3 - List Saved Diagrams (Priority: P3)

A user wants to see all previously saved diagrams so they can choose which one to open or manage.

**Why this priority**: Discoverability of saved diagrams is important for usability but secondary to the core save/load flow.

**Independent Test**: Can be fully tested by saving multiple diagrams and confirming all appear in the list with names and last-saved timestamps.

**Acceptance Scenarios**:

1. **Given** multiple diagrams have been saved, **When** the user views the diagram list, **Then** all saved diagrams are shown with their names and last-saved dates, ordered by most recently saved.
2. **Given** no diagrams have been saved, **When** the user views the diagram list, **Then** an empty-state message is displayed.

---

### Edge Cases

- What happens when a save is interrupted mid-operation (e.g., network drop)?
- How does the system handle saving a diagram with the same name as an existing one — overwrite or create a new version?
- What is the maximum size of a diagram that can be saved?
- What happens if the storage layer is full or unavailable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to save the current diagram state to the server at any point while working.
- **FR-002**: Users MUST be able to retrieve a previously saved diagram by its unique identifier.
- **FR-003**: Users MUST be able to list all their saved diagrams.
- **FR-004**: The system MUST store the complete diagram data, including all nodes, edges, and layout metadata.
- **FR-005**: The system MUST confirm successful save operations to the user with visible feedback.
- **FR-006**: The system MUST provide meaningful error messages when save or load operations fail.
- **FR-007**: The server layer MUST expose save, load, and list endpoints that the front-end communicates with; the contract of these endpoints MUST remain stable when the underlying storage is replaced in a future phase.
- **FR-008**: The storage mechanism MUST be replaceable without requiring any changes to the front-end.

### Key Entities

- **Diagram**: The saved artefact — contains a unique identifier, a human-readable name, the full JSON payload representing the diagram, and a last-saved timestamp.
- **Diagram List Entry**: A lightweight summary of a diagram (identifier, name, last-saved date) used when listing without loading the full payload.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save a diagram and receive confirmation within 2 seconds under normal conditions.
- **SC-002**: Users can reload a previously saved diagram and have it fully restored within 3 seconds.
- **SC-003**: 100% of saved diagram data is retrievable without corruption or data loss.
- **SC-004**: When the node server storage is replaced by the Spring Boot back-end in a future phase, the front-end requires zero changes to its save/load behavior.
- **SC-005**: Every save or load attempt results in either a success confirmation or an actionable error message — users are never left without feedback.

## Assumptions

- The node server acts as the persistence layer for phase 1; the Spring Boot + database back-end is a planned future replacement and is out of scope for this feature.
- The front-end will interact with a stable API contract on the node server that will remain unchanged when the back-end is introduced later.
- The specific storage mechanism used by the node server in phase 1 (e.g., local file system, in-memory store) is an implementation detail left to the developer, provided the interface contract is met.
- Diagrams are scoped to a single user or session; multi-user collaboration on shared diagrams is out of scope.
- Authentication and authorization are handled by existing application infrastructure and are out of scope for this feature.
- There is no hard limit on the number of diagrams a user can save in phase 1.
