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

Redis Cloud, **Essentials** plan, cloud **GCP**, region **europe-west1** — the same region as the
Cloud Run service, so the round trip is about a millisecond rather than a hop between continents.
Create the database with TLS on and build the URL as `rediss://default:<password>@<host>:<port>`
(two esses).

```bash
gcloud secrets create REDIS_URL --replication-policy=automatic
printf 'rediss://default:<password>@<host>:<port>' | gcloud secrets versions add REDIS_URL --data-file=-
gcloud secrets add-iam-policy-binding REDIS_URL \
  --member=serviceAccount:<cloud-run-service-account> --role=roles/secretmanager.secretAccessor
```

The deploy step in `.github/workflows/ci.yml` passes it with
`--update-secrets="REDIS_URL=REDIS_URL:latest"`.

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
- **`--min-instances=1`** is optional and buys away the cold start on the first order of the day.

### Connection budget

Three connections per instance. The free 30MB tier caps at 30, which is ten instances and not one
more; the paid tier gives 256. Set `--max-instances` against whichever applies.

If the venue count ever makes the public endpoint the wrong trade — the traffic carries roles,
memberships and order payloads, encrypted but leaving Google's network — the move is Memorystore on
a private IP with Direct VPC egress enabled on the Cloud Run service. Nothing in the code changes;
`REDIS_URL` becomes an internal address.
