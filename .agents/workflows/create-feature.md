---
description: Standard workflow to implement a complete full-stack feature across the Coaster monorepo.
---

# Workflow: Create Full-Stack Feature
Execute the following steps sequentially to build a new feature. Do not proceed to the next step until the current one is fully implemented and correct.

## Step 1: Design Phase & Contracts (`packages/common`)
- Understand the user requirements and determine the data flow.
- Identify the data models required for the feature.
- Create or update Interfaces, DTOs, and Enums inside `packages/common/src/`.
- Ensure everything is correctly exported in the corresponding `index.ts`.
- Ask the user to validate the contracts if there are ambiguous business rules.

## Step 2: Implement Backend (`apps/api`)
- If database changes are needed, update the Prisma schema and create the necessary migration.
- Create the specific `Command` or `Query` class and its associated `Handler`.
- Implement the business logic within the Handler, utilizing the `data-access` layer.
- Create or update the `Controller` endpoint to expose the functionality, ensuring strict validation with the shared DTOs.
- Validate that the Handler successfully processes the logic and returns the types defined in Step 1.
- Write unit tests for the Handler to cover both success and failure cases.

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
