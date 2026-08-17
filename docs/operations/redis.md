# The shared cache

One Redis instance behind three things that used to live in the memory of a single process: the
realtime bus, the rate-limit counter, and the preamble every authenticated request pays before its
handler starts.

**`REDIS_URL` is the whole switch.** Unset, the application behaves exactly as it did before this
existed: an event reaches only the clients of the instance that raised it, the throttler counts in
memory, every guard reads Postgres. That is also the rollback — unset it and redeploy, no code
change.

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

## The realtime bus

One channel, `coaster:realtime`, carrying two kinds of message: an event for an establishment, and
an order to close the streams of one user in one establishment. `RealtimeService` is the only thing
that publishes, and the twenty-six CQRS handlers in `src/realtime/events` are the only things that
call it.

**Delivery is local first, and the bus is a copy.** `publish` hands the event to the streams open on
this instance and *then* puts it on the channel; every message carries the id of the instance that
sent it, and a subscriber drops what it recognises as its own. The order matters: a cache that is
down costs the venue nothing but the clients on the other instances, because the local delivery
never depended on it.

A stream is one `GET /establishments/:id/events` held open. There is nothing to route: the
establishment is in the URL, `EstablishmentPermissionsGuard` decides who may open it, and
`RealtimeRegistry` is a `Map` from establishment to the streams watching it. Nothing about a client
is stored in Redis, so there is no room state to go stale, no rejoining after a reconnect, and
nothing to ask the other instances for.

### What a reconnect gets back

Every frame carries an `id`, which is the millisecond it was published. The client remembers the
last one it saw and sends it as `Last-Event-ID` when it comes back; the server reads the two-minute
buffer — a sorted set scored by that same millisecond, trimmed and expired on every write — and
writes out everything from that id onward before the stream goes on normally.

**From that id, not after it.** Two events published in the same millisecond share an id, and an
exclusive range would drop the second one. Replaying the client's own last event again is free:
every one of these events ends in a signal being `set` to a value, so seeing one twice changes
nothing, while missing one leaves a till showing an order that is no longer there. When in doubt the
buffer repeats itself.

The stream is registered before the buffer is read, so an event arriving during the catch-up is
delivered rather than lost. It can therefore reach the client ahead of an older replayed frame — a
window of a millisecond or two, which is the price of never dropping one.

Without a cache there is no buffer, `replay` answers with nothing, and a reconnect starts from the
present — which is what every reconnect did before this existed.

## Three rules it is built on

**A miss is not an error.** Not in the cache means ask Postgres, hand back the answer, store it on
the way out. A cache that is down, slow or refusing connections degrades into yesterday's behaviour,
never into an outage. The cache connection is opened with `enableOfflineQueue: false` precisely so a
command fails fast instead of hanging a request.

That rule is only true because two specific things were closed, and each one is a way the whole
service would otherwise have gone down:

- **A malformed `REDIS_URL` used to kill the boot.** `new Redis('rediss://user:pass@')` throws
  synchronously, which in a Nest provider means the container never starts — a copy-paste typo in one
  environment variable would have been a crash loop. `CacheConnection.open` catches it, logs, and
  hands back no client.
- **An unanswered `publish` takes the process with it.** With ioredis a refused command is a rejected
  promise, and Node exits on an unhandled one: a cache answering `OOM`, `NOPERM` or `NOAUTH` — an
  account over its plan limit, or suspended — would turn every event into a crash. `RealtimeBus`
  catches its own `publish` and `subscribe`, drops the message and logs once.

The second used to be worse and is worth remembering, because it is the argument for owning this
code rather than importing it. `@socket.io/redis-adapter` called `publish` without a `.catch()` and
had to be wrapped from outside to survive a cache that said no; and evicting a removed member meant
`fetchSockets()`, a question asked of the other instances that rejected inside a CQRS handler when
the bus refused to carry it. Neither exists now: the publish is ours to catch, and revocation is a
message every instance applies to its own streams.

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
`Events are shared across instances` at boot. Open a stream against each, write through `:3000`, and
the client on `:3001` has to hear it:

```bash
curl -N -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/establishments/$ID/events
```

Stop the cache (`docker compose stop redis`) and the same test must show the event staying local
**while the API keeps answering** — that is the degradation working, and it is what production
looked like before.

The e2e suite forces `REDIS_URL` to empty in `test/setup.e2e.ts`. It gets a database of its own from
testcontainers but would otherwise share whatever cache the developer happens to be running, and
`clearDatabase` cannot reach into it — a role cached by one test then answers for a user the next
test has already deleted, which shows up as unrelated 403s in the admin suite. Empty rather than
deleted, because `ConfigModule` only fills in variables that are absent and would hand the job
straight back to `.env`. `test/realtime` therefore exercises the local half of the bus, which is the
half that has to work without a cache at all.

Watch it work:

```bash
docker compose exec redis redis-cli --scan
```

Four connections is right: two per instance — cache and throttler share one, which also carries the
publishes, plus the subscriber, which has to be a connection of its own because `SUBSCRIBE` takes
one over.

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
- **The free tier caps at 30 connections**, and each instance opens two. Past fifteen instances the
  extra ones keep serving but lose the shared bus, which is this document's whole subject reappearing
  silently under load. Fifteen instances is ~1200 concurrent requests, so it is a ceiling worth
  knowing rather than one worth fearing.

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

- **`--timeout=3600`.** A stream lives inside one HTTP request and dies with the request timeout.
  The server closes a stream itself after 30 minutes so the client comes back with a fresh token, so
  anything above that would do; 3600 is the maximum and leaves the timeout out of the picture.
- **Session affinity is not needed.** A stream is one plain `GET` with no handshake and no state
  behind it, so whichever instance answers is the right one.
- **Concurrency.** Each open stream occupies one of the 80 concurrent slots an instance has. That is
  the number that decides when a second instance appears.
- **`--max-instances` is bounded by the connection budget, not by traffic.** An instance that cannot
  get a connection keeps serving, but it loses the shared bus with it — and an instance whose clients
  are isolated is the exact failure this whole thing exists to prevent. Keep `max-instances × 2`
  comfortably under the plan's connection limit. At 256 connections that is 128 instances, well past
  what Cloud Run will run, so on a paid plan the cache stops being the binding constraint.
- **`--min-instances=1`** is optional and buys away the cold start on the first order of the day.

### Connection budget

Two connections per instance — cache and throttler share one, which also carries the publishes, and
the subscriber needs one of its own. A paid Essentials plan allows 256, so `--max-instances` is
bounded by Cloud Run rather than by the cache. An instance that cannot get a connection degrades to
working without one, so hitting the ceiling costs latency, not availability.

If the venue count ever makes even a TLS-encrypted public endpoint the wrong trade, the move is
Memorystore on a private IP with Direct VPC egress enabled on the Cloud Run service. Nothing in the
code changes; `REDIS_URL` becomes an internal address.
