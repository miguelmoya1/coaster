# Coaster docs

Technical documentation index.

Start with [backend](architecture/backend.md) and [frontend](architecture/frontend.md) for how the
code is laid out, and [access model](architecture/permissions.md) for who is allowed to do what —
that one carries the most rules per line and is the easiest to get wrong.

## Architecture

- [Backend architecture](architecture/backend.md) — NestJS modules, aliases, layering, runtime
- [Frontend architecture](architecture/frontend.md) — Angular layers, stores, bundle
- [Access model](architecture/permissions.md) — roles, guards, plan grants
- [Domain models](architecture/domain-models.md) — what each context owns
- [Printing bridge](architecture/printing-bridge.md) — the Go service on the venue's network
- [Catalogue and menu](architecture/catalogue-and-menu.md) — a design, not yet built: the starter
  catalogue, the public menu and the languages between them

## Platform

- [Admin backoffice](admin/backoffice.md)
- [The shared cache](operations/redis.md) — the realtime bus, rate limit and the guards' preamble
- [Time tracking](operations/time-tracking.md) — the legal working-time register
- [Renaming `Bar` to `Establishment`](operations/establishment-rename.md) — runbook for a migration
  in progress, to be deleted once it has shipped
- [Stripe integration](saas/stripe-integration.md)
- [Stripe locally](saas/stripe-local-setup.md)

## Product

- [Roadmap](roadmap.md)
