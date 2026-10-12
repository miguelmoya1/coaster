# 🍺 Coaster

An operational tool for small hospitality businesses: the floor (tables, orders, payments), the
back office (staff, rota, stock) and the legal working-time register. Sold as a SaaS, currently in
closed beta.

## Running it

```sh
docker compose up
```

Postgres, Redis, the API on `:3000`, the web app on `:4200` and the Stripe CLI forwarding webhooks.
Running on the host, the tests and the container traps are in [development](docs/development.md).

## Documentation

Everything is in [`docs/`](docs/README.md): what the product does, the architecture, how to run and
deploy it, and what is next.
