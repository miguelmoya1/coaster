---
trigger: glob
globs: "apps/coaster-api/**"
---

# Backend Architecture (Go, hexagonal)
When working within `apps/coaster-api`, follow its `CLAUDE.md` and the documentation it points to in `docs/apps/coaster-api/`.

## Implementation Rules
1. **Layers:** `core/domain` (types and rules), `core/ports` (interfaces), `service` (one service per entity, one method per use case) and `adapter` (HTTP handlers, repositories, external services). No CQRS.
2. **Thin Handlers:** Handlers decode and validate the request, call a service through its `ports` interface and write the response. They contain no business logic.
3. **SQL by hand:** one `.sql` file per query under `internal/adapter/repository/queries/<entity>/`, embedded with `//go:embed`. Transactions start and end inside a repository method.
4. **Side Effects & Events:** realtime, audit and cache invalidation go through the `EventPublisher`, published only after the write is stored.
5. **Errors:** services return `domain.Error` values with an error code from `apps/web/src/app/core/errors/error.types.ts`; the handler layer maps them to the HTTP response.
6. **Contract:** the shapes, error codes, permissions and realtime events are the web's; change both sides together.
7. **Testing:** table tests with `testing`, fakes of the `ports` interfaces, repositories against Postgres with testcontainers and e2e in `e2e/`. `gofmt -l .`, `go vet ./...` and `go test ./...` must pass.
