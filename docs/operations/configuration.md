# Configuration

Every environment variable the applications read, and why the ones that are easy to get wrong
matter. Where each one is set per environment is in [production and beta](environments.md); the
eight that are credentials live in Secret Manager — see [secrets](secrets.md).

Locally, `.env` files are for development only: they are in `.gitignore` and `.dockerignore`, so
they neither travel in git nor enter an image. `apps/coaster-api/.env_example`,
`apps/coaster-api/.env_example` and `apps/web/.env_example` list what each application reads.

## Web (read at build time)

`set-env.ts` bakes these into the bundle. It reads `apps/web/.env` first and then the `.env` at the
repository root, which is also the one `docker compose` reads — see [web](../apps/web.md).

| Variable           | What it does                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `PRODUCTION`       | `true` for a release bundle. Unset, the build warns and produces a development bundle pointing at `localhost`            |
| `API_URL`          | The API the bundle calls. Defaults to `https://api.coaster.business` in production and `http://localhost:3000` otherwise |
| `GOOGLE_CLIENT_ID` | The Google sign-in button. Unset, the build warns and ships without it                                                   |
| `ALLOW_INDEXING`   | `false` writes a `robots.txt` that disallows everything. Beta sets it; production must not                               |
| `DEFAULT_LANGUAGE` | The language before the user picks one; `en` by default                                                                  |

## API (read at runtime)

| Variable                                     | What it does                                                                                                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                               | Everything                                                                                                                                                                                           |
| `AUTH_JWT_SECRET`                            | Signs access tokens; the API refuses to start without it                                                                                                                                             |
| `PRINTER_JWT_SECRET`                         | Signs the LAN printing token. Shared between environments, a beta pairing prints on a real venue's printer                                                                                           |
| `GOOGLE_CLIENT_ID`                           | Signing in with Google; unset, that route answers `503` and the button is hidden                                                                                                                     |
| `FRONTEND_URL`                               | Stripe returns here after checkout, and the emails link here — wrong, and beta invites people into production                                                                                        |
| `PUBLIC_URL`                                 | Where printer bridges download updates from; `localhost` reaches no venue                                                                                                                            |
| `CORS_ORIGINS`                               | Comma-separated allowlist of browser origins. **Fails closed in production**: unset means every cross-origin request is refused                                                                      |
| `TRUST_PROXY_HOPS`                           | Defaults to `1`, correct for Cloud Run; `compose.yaml` sets `0`. Too high and the rate limit counts a header the caller controls — see [backend](../architecture/backend.md)                         |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing. Without the webhook secret every webhook is rejected and subscriptions never activate                                                                                                       |
| `STRIPE_PRICE_PRO`                           | What new checkouts are sold at. Raising it means a **new** price and the old one moved to `STRIPE_PRICE_PRO_LEGACY`, or subscribers silently drop to FREE                                            |
| `RESEND_API_KEY`                             | Invitations, confirmations and password resets. Unset, the emails are written to the log. Beta needs its own key, or its invites spend production's quota                                            |
| `EMAIL_FROM`                                 | The sender; defaults to `Coaster <hello@coaster.business>`                                                                                                                                           |
| `MEDIA_BUCKET`                               | Signed upload URLs for product images                                                                                                                                                                |
| `AI_GATEWAY_API_KEY`                         | The assistant. Read by the AI SDK, not by our code, so a missing key only shows up as a failed answer                                                                                                |
| `REDIS_URL`                                  | Optional, and **never shared between environments** — keys carry no environment. Unset, rooms and the rate limit stay per-instance and every guard reads Postgres — see [the shared cache](redis.md) |
| `BETA_ALLOWLIST_ENABLED`                     | Closes sign-up to the `BetaTester` table. Default off; on with an empty list locks everybody out — see [closed beta](../saas/closed-beta.md)                                                         |
| `PWNED_PASSWORDS_ENABLED`                    | Only `false` turns the Have I Been Pwned check off; unset leaves it on, and a service that will not answer lets the password through                                                                 |

Migrations are **not** run by the API when it starts. The CI deploy applies them in a Cloud Run job
before the new revision, with the image of `apps/database` (goose); locally the `migrate` service of
`compose.yaml` runs the same program before either API starts, so a local database is never a step
behind the checkout. How to write one is in [database](../apps/database.md).
