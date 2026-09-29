---
description: Workflow for debugging and fixing a bug that spans across the frontend and backend in the Coaster monorepo.
---

# Workflow: Fix Full-Stack Bug
Execute these steps to systematically track down and fix a bug that involves both the frontend and backend. 

## Step 1: Reproduce and Analyze
- Ask the user for the exact steps to reproduce the bug, or the specific error messages they are seeing.
- Check the frontend network requests (payload and response). Identify if the issue is originating from an incorrect UI state, an invalid payload being sent, or a malformed backend response.
- Analyze the relevant backend logs, database state, and SQL queries.

## Step 2: Contract Verification (the web's `models/`)
- Verify that the types, DTOs, and interfaces in the web's `models/` folders perfectly match what the API answers and what the frontend consumes.
- Check if any enum values or required/optional fields have been modified recently causing a mismatch.
- Fix any discrepancies in the shared contracts FIRST before touching the app logic.

## Step 3: Backend Fix (`apps/coaster-api`, Go)
- If the bug resides in the API layer, write a failing test in the relevant service or handler that reproduces the issue perfectly.
- Fix the business logic in the service or the query in `repository/queries/`.
- Ensure the test now passes and the handler returns the fixed shape.

## Step 4: Frontend Fix (`apps/web`)
- If the bug affects the UI layer, verify the Angular Signals state in the `store/` or `services/` using console logs or the Angular DevTools approach.
- Ensure the HTTP data-access services correctly map the new/fixed backend response without losing data.
- Fix the UI components to handle the new state gracefully, including error states and loading spinners if the bug involved race conditions.

## Step 5: Final Validation & Regression
- Run the full stack locally (or ask the user to do so) and verify the bug is fully resolved.
- Ask the user if they want to add a regression test (E2E in Playwright or integration test in the backend) to prevent this specific bug from happening again.
