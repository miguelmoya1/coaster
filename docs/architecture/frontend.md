# Frontend architecture (Angular)

Angular 22, standalone components, signals, zoneless change detection, Material and Tailwind.

## Layers

The code in `apps/web/src/app` is split into three layers. Dependencies always point **one way**:

```text
core  <--  domains  <--  presentation
```

### `core/` — base layer

Cross-cutting infrastructure: utilities, mappers, errors, session services (`Auth`, `Realtime`,
`Toast`), generic guards and HTTP interceptors.

It knows no domain and no screen. **It cannot import `@coaster/<domain>` or anything from
`presentation/`.** Lint fails on such an import.

When `core` needs behaviour that lives higher up, the dependency is inverted with an
`InjectionToken`. A real example: `errorInterceptor` opens the plan dialog on a 402, but does not
know `PlanDialogService`; it depends on `PAYWALL_HANDLER`, which `app.config.ts` resolves.

The interceptor chain is `[urlInterceptor, idTokenInterceptor, errorInterceptor,
unauthorizedInterceptor]`, and the order matters. `urlInterceptor` turns relative URLs into absolute
API URLs first; `idTokenInterceptor` then attaches the Firebase token **only** to relative URLs or
URLs under `environment.apiUrl`. That condition is not decorative: image uploads `PUT` straight to
`storage.googleapis.com` through the same `HttpClient`, and without it the user's token was being
sent to a third-party host on every upload.

### Domains — `establishments/`, `establishment-members/`, `establishment-subscription/`, `admin/`, `orders/`, ...

Domains mirror the backend modules (`apps/api/src`), so the front end's `establishment-subscription`
corresponds to the API's. Each domain groups everything of its own: `data-access/` (HTTP
repositories), `store/` (signal state), `services/`, `mappers/` and, where relevant, `guards/`,
`directives/` and `dialogs/`.

Around an establishment the split is:

| Domain                       | Contains                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `establishments`             | creating and listing establishments, current establishment                        |
| `establishment-members`      | members, invitations, my own membership and `permissionGuard`                     |
| `establishment-subscription` | subscription, checkout, customer portal, plan dialog and its directive            |
| `admin`                      | platform backoffice (establishments, users, metrics, audit) and `adminGuard`      |
| `time-tracking`              | clocking: own workday, team register, corrections and export                      |
| `schedule`                   | `ScheduleStateService`: selected date, view mode and the ranges derived from them |

`permissionGuard` lives in `establishment-members` (not `establishments`) because it depends on `MyMemberStore`; in
`establishments` it would form a `establishments -> establishment-members -> establishments` cycle.

A domain may import `@coaster/core` and other domains by alias. **It cannot import from
`presentation/`**: if a domain service opens a dialog, that dialog's component lives in the domain
itself (see `establishment-subscription/dialogs/select-plan-dialog/`).

Each domain declares its public API in its `index.ts` and is consumed by alias (`@coaster/establishments`),
never through relative paths that cross folders.

#### Stores

A store **never injects another store**. Those that depend on an establishment hold the id in their own signal
and expose `setEstablishmentId()`:

```ts
readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);
readonly #resource = httpResource(() => this.#service.execute(this.#currentEstablishmentId()), { parse });
public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();
public setEstablishmentId(establishmentId: EstablishmentId | undefined) { this.#currentEstablishmentId.set(establishmentId); }
```

The presentation layer decides which establishment is active:
`presentation/establishments/workspace/layouts/workspace-layout.ts` has an `effect` that hands the id to every
workspace store and clears it on cleanup. `permissionGuard` does the same for `MyMemberStore` before
the layout exists.

Chaining stores created invisible coupling (a store stopped loading if another had not been
initialised) and cycles between domains.

### `presentation/` — screens

Components, pages, layouts and route files. It may import from everything above. Nothing imports
from it.

## Why the layering matters

When `core` depended on `establishments`, any file in `establishments` that wanted something from `core` had to dodge
the barrel with relative paths (`../../core/...`) to avoid a cycle. The result was that importing one
leaf utility dragged in guards, stores and whole HTTP repositories. Cutting that dependency made the
aliases work everywhere and the graph acyclic.

## How it is enforced

`apps/web/eslint.config.js` includes `no-restricted-imports` rules that fail lint if:

- a file in `core/` imports a domain or `presentation/`;
- a domain file imports `presentation/`;
- a domain file crosses into another folder with a relative path instead of the alias.

## Material directives that fail silently

Angular reports unknown elements and unknown property bindings, but a **plain attribute** that
matches no imported directive is simply inert. Material's prefixes and suffixes are attribute
directives, and `MatFormField` collects them with `contentChildren(MatSuffix)` rather than
`<ng-content>` — so forgetting the import does not misplace the element, it stops it rendering at
all.

That is how a search icon and two time pickers were missing from shipped screens without any error.
The attributes to watch: `matSuffix` / `matIconSuffix` need `MatSuffix`, `matPrefix` /
`matIconPrefix` need `MatPrefix`, and likewise `matInput`, `matTooltip`, `matBadge`, `matRipple`,
`matStartDate` and `matEndDate`.

## Typecheck

`apps/web/tsconfig.json` is a _solution config_: it has `"files": []` and only references. So
`tsc -p tsconfig.json` **checks nothing**. To really validate types:

```bash
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.spec.json
```

In practice `npm test -w @coaster/web` is the better signal, because the Angular compiler catches
template errors that raw `tsc` does not.

## Aliases

The `@coaster/*` aliases are declared **only** in `tsconfig.json`. `vitest.config.ts` reads them from
there at startup, so there are no two lists to maintain: adding a domain means declaring its path and
creating its `index.ts`.

Two absences are deliberate:

- **`presentation` has no alias.** It is the topmost layer: nobody should import from it. Not giving
  it an alias is the simplest way to make that true.
- **`@coaster/env`** points at `src/environments/environment.ts`, not an `index.ts`, because it is
  not a domain but the per-environment configuration the build substitutes.

Lint rules are generated by reading the folders under `src/app`, so a new domain is covered without
touching `eslint.config.js`.

## Environment and builds

`environment.ts` is **generated** by `set-env.ts` from environment variables and is gitignored. An
unset `PRODUCTION` warns and falls back to development, so a fresh checkout and CI both work without
a `.env`; `PRODUCTION=true` together with `USE_EMULATORS=true` is refused outright, because it
produces a bundle that looks fine and talks to the Firebase emulator.

The guarantee that actually matters is checked on the artefact, not on the inputs: CI builds the web
with `PRODUCTION=true` and fails if `__TEST_LOGIN__` appears anywhere in `dist/`. A precondition can
be skipped by whoever forgets to set it; the postcondition cannot.

`environment.production` also gates the test-login backdoor (`window.__TEST_LOGIN__`), which the
Playwright suite relies on and which the production build tree-shakes away entirely.

## Bundle

The `initial` budget is 880 kB warning / 1 MB error, not Angular's default 500 kB. The framework
floor alone is ~600 kB (Angular core and router, CDK and Material, Firebase Auth) and application
code is ~27 kB. The value is set so a real regression trips it, not to silence the warning.

Two things are deliberately lazy:

- `provideNativeDateAdapter()` is declared on the routes that use a datepicker (history and rota),
  not in `app.config.ts`.
- `PAYWALL_HANDLER` resolves `PlanDialogService` through a dynamic `import()`, so the plan dialog and
  `MatDialog` stay out of the initial bundle.

`@coaster/common` ships in both formats (CommonJS for the API, ESM for the bundler) through the
`exports` map in its `package.json`. Emitting only CommonJS makes Angular warn that it cannot
optimise the module.

## Working with the containers

**After touching `packages/common`, rebuild it and restart the API**, because both applications
consume its `dist`, not its source:

```bash
npm run build -w @coaster/common && docker compose restart api
```

Nothing watches that package in development: the API container mounts the repo but runs
`nest start -b swc -w`, which only watches `apps/api/src`. Without rebuilding, the API keeps the old
version in its module cache; without restarting, it does not reload either. The symptom is
misleading: whatever was added to the package arrives as `undefined` and blows up far from the
change.

Two more container traps, both of which look like "my change did not apply":

- **Adding an npm dependency.** `node_modules` are anonymous volumes, so the host install is
  invisible inside the container. Run `docker compose exec api npm install` (or `web`).
- **Adding or removing an export in `@coaster/common`.** Vite pre-bundles dependencies into
  `.angular/cache`, which `compose.yaml` keeps in a **named** volume that survives restarts. The
  browser then reports `does not provide an export named '...'`. Clear it:

  ```bash
  docker compose exec web rm -rf /app/apps/web/.angular/cache && docker compose restart web
  ```

When something in the UI does not react at all, check `docker compose logs web` first. A failed
build leaves the browser running the last good bundle, which looks exactly like a broken feature.
