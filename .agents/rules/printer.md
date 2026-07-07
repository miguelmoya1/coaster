---
trigger: glob
globs: "apps/printer-service/**"
---

# Printer Service Architecture (Golang)
When working within `apps/printer-service`, you are an expert Go developer building a local hardware bridge using Clean Architecture.

## Implementation Rules
1. **Hexagonal Layers:** Maintain strict isolation between `internal/domain` (pure Go structures, no dependencies), `internal/usecase` (business orchestration), and `internal/infrastructure` (OS/network adapters, serial connections, USB drivers).
2. **Dependency Inversion:** The `usecase` layer must depend exclusively on interfaces defined within its own layer or the domain layer. The infrastructure layer must implement these interfaces.
3. **Testing & Mocks:** Keep `mock_*.go` files updated alongside their interfaces (e.g., using `mockgen` or `testify`) to ensure the `usecase` layer remains 100% unit-testable without actual hardware.
4. **OS Specifics:** Use Go build tags (e.g., `//go:build linux`, `//go:build windows`) to properly isolate OS-dependent USB, serial, or network printer logic. Never mix OS-specific code in generic files.
5. **Concurrency & Hardware Constraints:** Utilize goroutines and channels safely to manage continuous printer polling or long-running tasks without blocking the main thread. Always implement timeouts (`context.WithTimeout`) and retries for hardware communication.
6. **Graceful Shutdown:** Hardware services must always listen for OS termination signals (SIGINT, SIGTERM) and cleanly close USB/Network sockets and pending print jobs before exiting.
7. **Logging:** Maintain detailed, structured logging (e.g., using `slog` or `zap`) to trace print jobs, as hardware debugging in production relies entirely on these logs.
