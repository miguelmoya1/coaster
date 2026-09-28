/**
 * `E2E_TARGET=go` runs the suite against the Go rewrite in `apps/coaster-api` instead of Nest. The global
 * setup builds the binary once; every file then starts its own Go server, just as it would start its
 * own Nest app, so in-memory state such as the rate limiter never leaks from one file into the next.
 */
export const isGoTarget = process.env.E2E_TARGET === 'go';

/** Where `setup.e2e.ts` leaves the Go binary it built. */
export const GO_BINARY_ENV = 'E2E_GO_BINARY';
