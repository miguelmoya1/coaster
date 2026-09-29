# Coaster docs

Start with [the product](product.md) for what Coaster does, [development](development.md) to run it,
and the [access model](architecture/permissions.md) for who is allowed to do what — that one carries
the most rules per line and is the easiest to get wrong.

## Product

- [The product](product.md) — what it does, the three modules and the access model in short
- [Roadmap](roadmap.md) — what is built, and why it counts as done
- [Pending](todo.md) — what is next, parked or owed
- [Veri*factu](plans/verifactu.md) — the plan for invoicing with the AEAT

## Development

- [Development](development.md) — running it, the container traps, the commands
- [Configuration](operations/configuration.md) — every environment variable, and the ones easy to get
  wrong

## Applications

- [API](apps/api.md) — NestJS, in production today
- [Web](apps/web.md) — Angular
- [Printer bridge](apps/printer-service.md) — the Go service on the venue's computer
- [Database](apps/database.md) — the schema: goose migrations, `schema.sql` and the job that applies
  them
- [coaster-api](apps/coaster-api/README.md) — the Go rewrite of the API: its
  [structure](apps/coaster-api/estructura.md), [conventions](apps/coaster-api/convenciones.md),
  [migration](apps/coaster-api/migracion.md) and [libraries](apps/coaster-api/librerias.md)

## Architecture

- [Stack](architecture/stack.md) — what everything is built with
- [Backend architecture](architecture/backend.md) — NestJS modules, aliases, layering, runtime
- [Frontend architecture](architecture/frontend.md) — Angular layers, stores, bundle
- [Access model](architecture/permissions.md) — roles, guards, enabled modules, plan grants
- [Domain models](architecture/domain-models.md) — what each context owns
- [Printing bridge](architecture/printing-bridge.md) — how the bridge fits the platform
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
