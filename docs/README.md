# Coaster docs

Technical documentation index.

Start with [backend](architecture/backend.md) and [frontend](architecture/frontend.md) for how the
code is laid out, and [access model](architecture/permissions.md) for who is allowed to do what —
that one carries the most rules per line and is the easiest to get wrong.

The product roadmap lives in [`TODO.md`](../TODO.md) at the root: what is next, what is parked and
what is known to be owed.

## Architecture

- [Backend architecture](architecture/backend.md) — NestJS modules, aliases, layering, runtime
- [Frontend architecture](architecture/frontend.md) — Angular layers, stores, bundle
- [Access model](architecture/permissions.md) — roles, guards, enabled modules, plan grants
- [Domain models](architecture/domain-models.md) — what each context owns
- [Printing bridge](architecture/printing-bridge.md) — the Go service on the venue's network
- [Catalogue and menu](architecture/catalogue-and-menu.md) — the starter catalogue, the public menu
  and the languages between them
- [The assistant](architecture/assistant.md) — why it can never do more than the caller can

## Platform

- [Admin backoffice](admin/backoffice.md)
- [Production and beta](operations/environments.md) — the two environments, what they share and what
  they must not
- [Secrets](operations/secrets.md) — the eight credentials in Secret Manager, and why the rest are
  plain environment variables
- [The shared cache](operations/redis.md) — the realtime bus, rate limit and the guards' preamble
- [Time tracking](operations/time-tracking.md) — the legal working-time register
- [Stripe integration](saas/stripe-integration.md)
- [Stripe locally](saas/stripe-local-setup.md)
- [Closed beta](saas/closed-beta.md)

## Product

- [Roadmap](roadmap.md) — what is built, and what is next
