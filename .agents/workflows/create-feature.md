---
description: Standard workflow to implement a complete full-stack feature across the Coaster monorepo.
---

# Workflow: Create Full-Stack Feature
Execute the following steps sequentially to build a new feature. Do not proceed to the next step until the current one is fully implemented and correct.

## Step 1: Design Phase & Contracts (`apps/web/src/app/<domain>/models`)
- Understand the user requirements and determine the data flow.
- Identify the data models required for the feature.
- Create or update Interfaces, DTOs, and Enums in the domain's `models/` folder of the web (or `core/models/` if every layer needs them).
- Ensure everything is correctly exported in the domain's `index.ts`.
- Ask the user to validate the contracts if there are ambiguous business rules.

## Step 2: Implement Backend (`apps/coaster-api`, Go)
- Follow `apps/coaster-api/CLAUDE.md` and `docs/apps/coaster-api/convenciones.md`.
- If database changes are needed, add a goose migration in `apps/database/migrations/` and regenerate `schema.sql` (see `docs/apps/database.md`).
- Add the use case as a method of the entity's service, its SQL in `repository/queries/`, and the route in its handler, answering the shapes defined in Step 1.
- Write unit tests for the service and the handler, covering both success and failure cases.

## Step 3: Implement Frontend (`apps/web`)
- Create or update the HTTP call inside the appropriate `data-access/` service using Angular's `HttpClient`.
- If the data needs to be available globally or across multiple components, update the `store/` (Signal Store).
- Build or update the Smart/Container components (`features/`) to dispatch actions or read from the store/service.
- Build the presentational UI components (`components/`) using Angular Signals (`@Input` / `@Output`) and the new control flow syntax (`@if`, `@for`).
- Apply the appropriate styling matching the project's design system.

## Step 4: Quality Assurance & Final Verification
- Run the backend and frontend locally to verify the full E2E flow.
- Verify that there are no console errors, and the network payloads match the DTOs perfectly.
- Ask the user if they want to generate E2E Playwright tests or component tests for the frontend implementation.
