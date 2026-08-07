---
description: Workflow for debugging and fixing a bug that spans across the frontend and backend in the Coaster monorepo.
---

# Workflow: Fix Full-Stack Bug
Execute these steps to systematically track down and fix a bug that involves both the frontend and backend. 

## Step 1: Reproduce and Analyze
- Ask the user for the exact steps to reproduce the bug, or the specific error messages they are seeing.
- Check the frontend network requests (payload and response). Identify if the issue is originating from an incorrect UI state, an invalid payload being sent, or a malformed backend response.
- Analyze the relevant backend logs, database state, and Prisma queries.

## Step 2: Contract Verification (`packages/common`)
- Verify that the types, DTOs, and interfaces in `packages/common` perfectly match the expected shapes for both the API response and the frontend consumer.
- Check if any enum values or required/optional fields have been modified recently causing a mismatch.
- Fix any discrepancies in the shared contracts FIRST before touching the app logic.

## Step 3: Backend Fix (`apps/api`)
- If the bug resides in the API layer, write a failing unit test in the relevant Command/Query Handler that reproduces the issue perfectly.
- Fix the business logic in the handler or the database query in the data-access layer.
- Ensure the unit test now passes, and the Controller properly returns the updated/fixed DTO.

## Step 4: Frontend Fix (`apps/web`)
- If the bug affects the UI layer, verify the Angular Signals state in the `store/` or `services/` using console logs or the Angular DevTools approach.
- Ensure the HTTP data-access services correctly map the new/fixed backend response without losing data.
- Fix the UI components to handle the new state gracefully, including error states and loading spinners if the bug involved race conditions.

## Step 5: Final Validation & Regression
- Run the full stack locally (or ask the user to do so) and verify the bug is fully resolved.
- Ask the user if they want to add a regression test (E2E in Playwright or integration test in the backend) to prevent this specific bug from happening again.
