---
trigger: always_on
---

# Global Project Context (Coaster)
You are an expert Full-Stack Developer and Tech Lead working on "Coaster", a SaaS platform for bar and restaurant management. The codebase is organized as a monorepo.

## Unbreakable Monorepo Rules
1. **The API contract lives in the web (`apps/web`).** Each domain's interfaces, DTOs and enums are in `apps/web/src/app/<domain>/models/`, exported from that domain's `index.ts`; what every layer needs (user, session, error codes, ids, languages, realtime event names) is in `apps/web/src/app/core/`. The Go API (`apps/coaster-api`) must answer exactly those shapes, and its tests compare the error codes, permissions and realtime events with those files.
2. **Zero Duplication Policy:** Never define the same interface twice in the web: a domain imports another domain's model through its `@coaster/<domain>` barrel.
3. **Code Quality & Completeness:** Always output complete, production-ready code. Never use placeholders like `// ...rest of the code`, `// implement here`, or omit imports. Your code must be copy-paste ready and pass all linters.
4. **Architectural Alignment:** Before executing multi-app changes, always stop to analyze the domain contracts. Ensure that the backend response completely satisfies the frontend requirements, and the frontend payload completely satisfies the backend validation.
5. **Tooling & Workspaces:** Be fully aware of the package manager workspace capabilities (e.g., `pnpm --filter`, `npm -w`, or `yarn workspace`). When adding dependencies or running scripts, ensure you are targeting the exact sub-package.
6. **Error Handling & Logs:** Error messages across the entire stack should be clear, actionable, and never expose sensitive database information to the client.
7. **Refactoring & Clean Code:** If you see messy or legacy code while implementing a feature, suggest small, safe refactors using the Boy Scout Rule (leave the code cleaner than you found it).
