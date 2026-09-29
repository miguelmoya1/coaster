---
trigger: glob
globs: "apps/api/**"
---

# Backend Architecture (NestJS + CQRS)
`apps/api` is being replaced by the Go API in `apps/coaster-api` (see its `CLAUDE.md`) and is only touched to adapt its e2e suite. While it lives, when working within `apps/api` you must follow Clean Architecture principles, domain-driven design concepts, and a strict CQRS pattern.

## Implementation Rules
1. **CQRS Strict Separation:** Every business use case must be explicitly separated into `commands` (mutations/writes) or `queries` (reads). Never mix read and write operations in a single handler.
2. **Thin Controllers:** Controllers (`controllers/`) are strictly the entry point. They must only receive the HTTP request, rely on Pipes/DTOs for validation, and dispatch the Command or Query. They must contain ZERO business logic.
3. **Validation & DTOs:** Rely heavily on `class-validator` and `class-transformer` inside your DTOs (whose shapes must match the web's models). Always validate input payload at the Controller boundary.
4. **Data Access Isolation:** Database interactions (via Prisma) must be completely isolated within the `data-access` (or Repository) layer. Command and Query Handlers must call `data-access` services, never interact with the Prisma client directly.
5. **Side Effects & Events:** Any side effect (e.g., sending an email, updating analytics, triggering a webhook) must be decoupled. Handlers should emit Domain Events to `events/handlers/` or be orchestrated via `sagas/`.
6. **Exception Handling:** Use custom domain exceptions instead of throwing raw HTTP exceptions in the application layer. Let global Exception Filters map domain exceptions to standard HTTP responses.
7. **Types:** Import shared types from `@coaster/common`, which in `apps/api` is a frozen copy in `src/common`. The contract itself lives in the web's models.
8. **Testing:** Create and maintain robust unit tests for Handlers and Services. Use mocks for the `data-access` layer. Avoid testing controllers for business logic; controllers only need minimal integration tests or E2E tests.
