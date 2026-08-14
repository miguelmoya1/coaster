# The shared cache

One Redis instance behind three things that used to live in the memory of a single process: the
websocket rooms, the rate-limit counter, and the preamble every authenticated request pays before
its handler starts.

**`REDIS_URL` is the whole switch.** Unset, the application behaves exactly as it did before this
existed: rooms are local, the throttler counts in memory, every guard reads Postgres. That is also
the rollback — unset it and redeploy, no code change.

The product name appears in `apps/api/src/core/cache/cache.connection.ts` and nowhere else. The rest
of the codebase asks a `CacheService` to `remember` and `forget`.

## What it holds

| Key | Read by | Dropped by |
| --- | --- | --- |
| `user:{userId}:role` | `SecurityRepository.getUserRole` | `UserUpdatedEvent` |
| `user:google:{googleId}` | `FirebaseTokenService.resolve` | `UserUpdatedEvent`, and `SyncUserHandler` directly |
| `establishment:{id}:member:{userId}` | `SecurityRepository.getEstablishmentMemberRole` | `MemberInvitedEvent`, `MemberRemovedEvent`, `MemberRoleChangedEvent` |
| `establishment:{id}:modules` | `SecurityRepository.getEnabledModules` | `EstablishmentSettingsUpdatedEvent` |
| `establishment:{id}:subscription` | `SecurityRepository.getSubscriptionState` | `SubscriptionActivated/Renewed/Cancelled/PaymentFailed/Overridden` |
| `throttle:{throttler}:{tracker}` | `ThrottlerCacheStorage` | its own 60-second window |

Orders, the catalogue, shifts and stats are **not** cached. They change constantly, few people read
them at once, and caching them trades latency nobody notices for a stale figure somebody acts on.

The TTL is **8 hours** — roughly a working day, so a missed invalidation cannot outlive the shift
that saw it.

## Three rules it is built on

**A miss is not an error.** Not in the cache means ask Postgres, hand back the answer, store it on
the way out. A cache that is down, slow or refusing connections degrades into yesterday's behaviour,
never into an outage. The cache connection is opened with `enableOfflineQueue: false` precisely so a
command fails fast instead of hanging a request.

That rule is only true because three specific things were closed, and each one is a way the whole
service would otherwise have gone down:

- **A malformed `REDIS_URL` used to kill the boot.** `new Redis('rediss://user:pass@')` throws
  synchronously, which in a Nest provider means the container never starts — a copy-paste typo in one
  environment variable would have been a crash loop. `CacheConnection.open` catches it, logs, and
  hands back no client.
- **The room adapter never caught its own publishes.** `@socket.io/redis-adapter` calls
  `pubClient.publish(...)` on every broadcast without a `.catch()`, and with ioredis that is a
  promise. A cache that answers `OOM`, `NOPERM` or `NOAUTH` — an account over its plan limit, or
  suspended — turns every broadcast into an unhandled rejection, and Node exits on those.
  `SharedIoAdapter` wraps `publish`, `subscribe` and their siblings so a refused command drops the
  event and logs once instead.
- **`evictFromEstablishment` awaited a cross-instance query.** `fetchSockets()` asks the other
  instances over the bus; when the bus refuses, it rejects inside a CQRS event handler. It now falls
  back to evicting the sockets on this instance, which is what it could do before there was a bus.

All three are covered by tests, and the whole set was exercised against a running container with the
cache removed, misconfigured, killed mid-flight, and restricted with `ACL SETUSER default -@all` to
imitate an account that has stopped being allowed to run commands. In every case the API answered,
the sockets on that instance kept receiving, and the process stayed up.

**A change deletes the key, it never rewrites it.** Writing the new value from an event handler lets
two commands arriving out of order leave the older one in the cache, where the TTL would keep it for
hours. Deleting is idempotent and cannot invert.

**Absence is cached too.** `{"v":null}` is a stored answer, distinct from a key that is not there.
Caching "this person is not a member" is what keeps a non-member hammering an endpoint cheap. The
one place where that bites is a googleId that has no user *yet* — a first sign-in would cache the
absence and lock the new account out until the TTL — so `SyncUserHandler` drops that key on the
paths where it links or creates the account. It is the only writer that clears a key directly rather
than through an event, because `auth` cannot import `users` without a require-time cycle.

Dates are revived on read. Without that, `currentPeriodEnd` would come back as a string and
`SubscriptionActiveGuard` would compare a `Date` against text. The guard caches the row, never the
decision: expiry is still evaluated against `new Date()` on every request.

## Locally

`compose.yaml` runs it with no volume and no persistence (`--save '' --appendonly no`): everything
inside is either a cache or ephemeral pub/sub, so a restart costs a repopulation and a reconnect.

To reproduce the multi-instance behaviour there is a second API container behind a profile:

```bash
docker compose --profile cluster up
```

That gives `:3000` and `:3001` against the same database and the same cache. Both should log
`Rooms are shared across instances` at boot. Connect a socket client to each, join both to the same
establishment room, write through `:3000` and the client on `:3001` has to hear it. Stop the cache
(`docker compose stop redis`) and the same test must show the event staying local **while the API
keeps answering** — that is the degradation working, and it is what production looked like before.

Watch it work:

```bash
docker compose exec redis redis-cli --scan
```

Six connections is right: three per instance (cache and throttler share one, plus the publisher and
subscriber the room adapter needs).

## In production

Redis Cloud, cloud **GCP**, region **europe-west1** — the same region as the Cloud Run service. This
is not a preference: a database on another continent turns every cached read into a ~100ms round
trip, which is slower than the Postgres query it was meant to replace, and the cache becomes a
pessimisation.

The free 30MB plan is what runs today, deliberately, while there are no real venues on the platform
and therefore no employee or order data worth intercepting. Two things change the day there are, and
both are a plan upgrade rather than a code change:

- **TLS is not offered on the free tier.** Until it is on, the roles, memberships, employee names
  and order payloads cross the public internet in clear, along with the AUTH password on every
  connect, and anyone on the path can inject pub/sub messages — fake events on a venue's screens.
  Onboarding a real venue is the deadline for this, not a busy month.
- **The free tier caps at 30 connections**, and each instance opens three. Past ten instances the
  extra ones keep serving but lose the shared bus, which is this document's whole subject reappearing
  silently under load. Ten instances is ~800 concurrent requests, so it is a ceiling worth knowing
  rather than one worth fearing.

Upgrading is the slider in the database's Configuration tab; TLS then lives under Security → Edit,
with client certificate authentication left off. The URL becomes `rediss://` with two esses, and
setting it is the only step that touches the service.

Then set it on the service once, the same way `STRIPE_SECRET_KEY` and the rest are set:

```bash
gcloud run services update api-new --region europe-west1 \
  --update-env-vars="REDIS_URL=rediss://default:<password>@<host>:<port>"
```

It survives every deploy because the workflow uses `--update-env-vars`, which only touches the
variables it names. `--set-env-vars` would wipe everything else, which is why it is not used.

The `.env` file has nothing to do with production: it is in `.gitignore` and in `.dockerignore`, so
it neither travels in git nor enters the image. In production `ConfigModule` reads only real
environment variables.

### Cloud Run settings this depends on

```bash
gcloud run services describe api-new --region europe-west1
```

- **`--timeout=3600`.** A websocket lives inside one HTTP request and dies with the request timeout.
  The default is 300 seconds, which cuts and reconnects every socket every five minutes. 3600 is the
  maximum.
- **Session affinity is not needed.** The web client forces `transports: ['websocket']`
  (`apps/web/src/app/core/services/socket.ts`), so there is no polling handshake to keep on one
  instance.
- **Concurrency.** Each open socket occupies one of the 80 concurrent slots an instance has. That is
  the number that decides when a second instance appears.
- **`--max-instances` is bounded by the connection budget, not by traffic.** An instance that cannot
  get a connection keeps serving, but it loses the shared room bus with it — and an instance whose
  clients are isolated is the exact failure this whole thing exists to prevent. Keep
  `max-instances × 3` comfortably under the plan's connection limit. At 256 connections, 80 is the
  number, and 80 instances × 80 concurrent requests is far more than the product will ever ask for.
  If it ever does, the fix is a plan with more connections, never fewer instances.
- **`--min-instances=1`** is optional and buys away the cold start on the first order of the day.

### Connection budget

Three connections per instance — cache and throttler share one, and the room adapter needs a
publisher and a subscriber of its own. A paid Essentials plan allows 256, so `--max-instances`
is bounded by Cloud Run rather than by the cache. An instance that cannot get a connection degrades
to working without one, so hitting the ceiling costs latency, not availability.

If the venue count ever makes even a TLS-encrypted public endpoint the wrong trade, the move is
Memorystore on a private IP with Direct VPC egress enabled on the Cloud Run service. Nothing in the
code changes; `REDIS_URL` becomes an internal address.
