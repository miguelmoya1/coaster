---
trigger: glob
globs: "apps/web/**"
---

# Frontend Architecture Rules (Coaster UI)
When working within `apps/web`, leverage your expert Angular developer skills, but strictly adhere to this specific architectural folder structure and state management approach.

## Implementation Rules
1. **Modern Reactivity (Signals):** Default to Angular Signals (`signal`, `computed`, `effect`) for all local state management. Use RxJS only when strictly necessary (e.g., Interceptors, Router events, WebSockets, complex async streams) and convert to Signals using `toSignal()` at the component boundaries.
2. **Domain & Feature Separation:** Maintain strict boundaries inside `src/app/`:
   - `data-access/`: HTTP services to consume the backend API. These should be pure and focused only on data fetching.
   - `services/`: Frontend business logic, state orchestrators, and data transformations.
   - `store/`: Global or feature-level application state management (Signal Store).
   - `ui/` or `components/`: Dumb (presentational) components that only receive `@Input()` and emit `@Output()`.
   - `features/`: Smart components (containers) that connect to the store/data-access and coordinate the UI components.
3. **Standalone Components:** Ensure all new components, directives, and pipes are generated as standalone elements (`standalone: true`). Do not use `NgModules` unless integrating with legacy code.
4. **Control Flow:** Prefer the new Angular control flow syntax (`@if`, `@for`, `@switch`) over structural directives (`*ngIf`, `*ngFor`).
5. **Typing:** Never create local models or interfaces for API responses. Always import DTOs and Interfaces from `packages/common`.
6. **Performance & Lazy Loading:** Ensure that routes are lazy-loaded. Use `OnPush` change detection strategy by default for all components to maximize performance with Signals.
