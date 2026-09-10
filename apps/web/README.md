# Coaster web

Angular 22 — standalone components, signals, zoneless change detection — with Material and Tailwind
v4.

The architecture is documented once, in
[frontend architecture](../../docs/architecture/frontend.md): the three layers, how they are
enforced by lint, how stores hold the current establishment, and the container traps that look like
broken code. This file is only how to run it.

## The three layers

```text
core  <--  domains  <--  presentation
```

- **`src/app/core/`** — cross-cutting infrastructure with no knowledge of any domain or screen:
  session services, interceptors, generic guards. When it needs something from above, the dependency
  is inverted with an `InjectionToken`.
- **`src/app/<domain>/`** — one folder per backend module (`establishments`, `orders`, `catalogue`,
  `menu`, `time-tracking`, …), each with `data-access/`, `store/`, `services/`, `mappers/` and its
  own `index.ts`. Consumed by alias (`@coaster/orders`), never by relative path.
- **`src/app/presentation/`** — pages, layouts, components and route files. It may import from
  everything above; nothing imports from it, which is why it has no alias.

A store never injects another store, and a domain never imports from `presentation/`. Both rules are
lint errors, and the reasoning for each is in the architecture doc.

## Running it

```bash
docker compose up web
```

`npm run dev` runs it on the host instead. Either way `set-env.ts` runs first and **generates**
`src/environments/environment.ts` from environment variables — the file is gitignored, and an unset
`PRODUCTION` warns and falls back to development so a fresh checkout works with no `.env`.

Without `GOOGLE_CLIENT_ID` the build warns and ships no Google button — the rest of the app works,
and the API answers that route with a `503` rather than pretending. Outside a production build the
page says so where the button would be, so a missing client id reads as a setting nobody filled in
rather than a feature that vanished.

In containers the value comes from the shell or from a `.env` next to `compose.yaml`, which passes
it to both services:

```sh
echo "GOOGLE_CLIENT_ID=<the web client id>" >> .env
docker compose up -d --force-recreate web api
```

## Commands

| Command              | What it does                                                 |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | `ng serve` on `0.0.0.0:4200`                                 |
| `npm run build`      | Builds `@coaster/common` first, then `ng build`              |
| `npm test`           | Unit tests. Better than raw `tsc`: it compiles templates too |
| `npm run test:watch` | The same, watching                                           |
| `npm run e2e`        | Playwright                                                   |
| `npm run e2e:ui`     | Playwright with its UI                                       |
| `npm run lint`       | `ng lint`, including the layering rules                      |

`tsconfig.json` is a solution config with `"files": []`, so `tsc -p tsconfig.json` checks
**nothing**. To type-check directly:

```bash
npx tsc --noEmit -p tsconfig.app.json
```

## After touching `packages/common`

Rebuild it and restart the API — both applications consume its `dist`, not its source, and nothing
watches it in development:

```bash
npm run build -w @coaster/common && docker compose restart api
```

`angular.json` excludes `@coaster/common` from the dev server's `prebundle`, so a changed export is
normally picked up on the spot. If the browser still reports `does not provide an export named
'...'`, it is Vite's pre-bundle cache in the named `web_angular_cache` volume. Clear it **from inside
the container** — deleting it from the host detaches the bind mount:

```bash
docker compose exec web rm -rf /app/apps/web/.angular/cache && docker compose restart web
```

When the UI does not react at all, read `docker compose logs web` before reading your own diff: a
failed build leaves the browser on the last good bundle, which looks exactly like a broken feature.
