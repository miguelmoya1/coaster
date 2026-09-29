# The shared cache

One Redis instance behind three things that used to live in the memory of a single process: the
realtime bus, the rate-limit and sign-in failure counters, and the preamble every authenticated
request pays before its handler starts.

**`REDIS_URL` is the whole switch.** Unset, the application behaves exactly as it did before this
existed: an event reaches only the clients of the instance that raised it, the counters live in
memory, every step of the guard reads Postgres. That is also the rollback — unset it and redeploy, no code
change.

The client library is imported in `apps/api/internal/adapter/cache` and nowhere else;
`cmd/api/main.go` only hands it `REDIS_URL`. The rest of the codebase sees `ports.Cache` (`Get`,
`Set`, `Forget`), mostly through `remember` in `service/cache.go`.

## What it holds

| Key                                  | Read by                                                         | Dropped by                                                                                             |
| ------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `user:{userId}:role`                 | `SecurityService.UserRole`                                      | `UserUpdatedEvent`                                                                                     |
| `user:{userId}`                      | `AccessTokenService.Resolve`                                    | `UserUpdatedEvent`, and `AuthService` or `AccountService` right after they change the user             |
| `establishment:{id}:member:{userId}` | `SecurityService.Membership`                                    | `MemberInvitedEvent`, `MemberRemovedEvent`, `MemberRoleChangedEvent`                                   |
| `establishment:{id}:modules`         | `SecurityService.EnabledModules`                                | `EstablishmentSettingsUpdatedEvent`, and `AdminEstablishmentService` when an admin changes the modules |
| `establishment:{id}:subscription`    | `SecurityService.SubscriptionState`                             | `SubscriptionActivated/Renewed/Cancelled/PaymentFailed/Overridden`, and `SubscriptionService.Refresh`  |
| `throttle:default:{hash}`            | `RateLimiter.Hit`, with the hash of the route and the client IP | its own window, 60 seconds unless the route sets `middleware.Throttle`                                 |
| `auth:login-failures:{hash}`         | `LoginAttempts.LockedFor`, with the hash of the email           | a successful sign-in, or its own 15-minute window                                                      |

Orders, the catalogue, shifts and stats are **not** cached. They change constantly, few people read
them at once, and caching them trades latency nobody notices for a stale figure somebody acts on.

The TTL of a cached value (`cache.TTL`) is **8 hours** — roughly a working day, so a missed invalidation cannot outlive the shift
that saw it.

## The realtime bus

One channel, `coaster:realtime`, carrying two kinds of message: an event for an establishment, and
an order to close the streams of one user in one establishment. `RealtimeService` is the only thing
that publishes, and the event subscribers in the services (`order_realtime.go`,
`catalog_realtime.go`, and the `EventHandlers` of the member, shift and subscription services) are
the only things that call it. The Redis side is `RealtimeBus`, in `adapter/cache/realtime_bus.go`.

**Delivery is local first, and the bus is a copy.** `Publish` hands the frame to the streams open on
this instance (`Deliver`) and _then_ puts it on the channel and in the replay buffer; every message
carries the id of the instance that sent it (`origin`), and a subscriber drops what it recognises as
its own. The order matters: a cache that is
down costs the venue nothing but the clients on the other instances, because the local delivery
never depended on it.

A stream is one `GET /establishments/{establishmentId}/events` held open. There is nothing to route:
the establishment is in the URL, `middleware.Permissions()` on the route decides who may open it, and
`RealtimeService.Watch` adds the stream to a map from establishment to the streams watching it. Nothing about a client
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

Without a cache there is no buffer, `Replay` answers with nothing, and a reconnect starts from the
present — which is what every reconnect did before this existed.

## Three rules it is built on

**A miss is not an error.** Not in the cache means ask Postgres, hand back the answer, store it on
the way out. A cache that is down, slow or refusing connections degrades into yesterday's behaviour,
never into an outage. go-redis has no offline queue, so a command against a cache that is down fails
instead of waiting for it to come back; both clients retry a failed command once (`MaxRetries = 1`),
and after a run of failed dials the pool answers with the last error until a background dial gets
through, so a request is not held up dialling again and again.

That rule is only true because two specific failures are handled, and each one is a way the whole
service would otherwise go down:

- **A malformed `REDIS_URL` does not stop the boot.** A copy-paste typo in one environment variable
  must not become a crash loop. `cache.NewClient` (`adapter/cache/client.go`) logs the parse error and
  hands back no client, and `NewRealtimeBus` does the same for the bus, so the instance starts and
  carries on as if the variable were unset.
- **A refused command is an error value, not a crash.** A cache answering `OOM`, `NOPERM` or `NOAUTH`
  — an account over its plan limit, or suspended — fails every command. Each caller in
  `adapter/cache` checks the error and falls back: the cache reads Postgres, the counters count in
  memory, and `RealtimeBus` drops the message and logs once.

That is also the argument for owning this code rather than importing it. An earlier bus built on a
socket.io adapter published without handling the error and had to be wrapped from outside to survive
a cache that said no; and evicting a removed member meant asking the other instances for their
sockets, a question that failed whenever the bus refused to carry it. Neither exists now: every
publish goes through `RealtimeBus.send`, which handles its own error, and revocation is a `revoke`
message every instance applies to its own streams (`RealtimeService.CloseStreams`).

**A change deletes the key, it never rewrites it.** Writing the new value from an event subscriber
lets two changes arriving out of order leave the older one in the cache, where the TTL would keep it for
hours. Deleting is idempotent and cannot invert.

**Absence is cached too.** `{"v":null}` is a stored answer, distinct from a key that is not there.
Caching "this person is not a member" is what keeps a non-member hammering an endpoint cheap. It
used to bite on `user:` — a sign-in could cache the absence of an account that was being created in
the same breath, and lock it out until the TTL. It cannot any more: the key is now our own user id,
read from a token we only sign for a row that already exists.

A cached value is decoded into the same Go type it was stored from, so `currentPeriodEnd` comes back
as a date inside `domain.SubscriptionState`, never as text. `SecurityService` caches the row, never
the decision: `domain.SubscriptionGrantsAccess` still evaluates expiry against the clock on every
request.

## Locally

`compose.yaml` runs it with no volume and no persistence (`--save '' --appendonly no`): everything
inside is either a cache or ephemeral pub/sub, so a restart costs a repopulation and a reconnect.

To reproduce the multi-instance behaviour, start a second Go API next to the one `docker compose up`
runs:

```bash
docker compose run --rm --publish 3002:8080 api
```

That gives `:3000` and `:3002` against the same database and the same cache. Both should log
`Events are shared across instances` at boot. Open a stream against each, write through `:3000`, and
the client on `:3002` has to hear it:

```bash
curl -N -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/v1/establishments/$ID/events
```

Stop the cache (`docker compose stop redis`) and the same test must show the event staying local
**while the API keeps answering** — that is the degradation working, and it is what production
looked like before.

The e2e suite starts the API with `REDIS_URL` empty (`e2e/app_test.go`). It gets a database of its
own from testcontainers but would otherwise share whatever cache the developer happens to be running,
and `testdb.Reset` cannot reach into it — a role cached by one test then answers for a user the next
test has already deleted, which shows up as unrelated 403s in the admin suite. The binary gets only
the environment the test lists, so neither the developer's shell nor `.env` can hand it a cache back.
`e2e/realtime_test.go` therefore exercises the local half of the bus, which is the half that has to
work without a cache at all.

Watch it work:

```bash
docker compose exec redis redis-cli --scan
```

`redis-cli CLIENT LIST` shows the connections by name. An instance that has cached a value and published an
event holds three: `coaster-cache` (cache and counters), `coaster-realtime` (publishes and the replay
buffer), and the subscriber, which has to be a connection of its own because `SUBSCRIBE` takes one
over. Both clients are go-redis pools, so a busy instance opens more — see
[Connection budget](#connection-budget).

## In production

Redis Cloud, cloud **GCP**, region **europe-west1** — the same region as the Cloud Run service. This
is not a preference: a database on another continent turns every cached read into a ~100ms round
trip, which is slower than the Postgres query it was meant to replace, and the cache becomes a
pessimisation.

The free 30MB plan is what runs today — deliberately, and with the exposure described in the decision below. Two things change the day there are, and
both are a plan upgrade rather than a code change:

- **TLS is not offered on the free tier.** Until it is on, the roles, memberships, employee names
  and order payloads cross the public internet in clear, along with the AUTH password on every
  connect, and anyone on the path can inject pub/sub messages — fake events on a venue's screens.
  Onboarding a real venue is the deadline for this, not a busy month.
- **The free tier caps at 30 connections**, and an instance holds up to three at rest and up to
  twenty-one in a burst (see [Connection budget](#connection-budget)). Ten quiet instances, or two
  busy ones, can reach the cap. Past it, commands that need a new connection fail and fall back, and an instance
  that cannot open its subscriber at boot keeps serving without the shared bus — this document's
  whole subject reappearing silently under load.

Upgrading is the slider in the database's Configuration tab; TLS then lives under Security → Edit,
with client certificate authentication left off. The URL becomes `rediss://` with two esses, and
setting it is the only step that touches the service.

### The decision taken, 2026-08-25: stay on the free tier

The upgrade is a cost and the platform has no revenue yet, so **the free tier stays and TLS stays
off** until there is some. That is a deliberate, informed trade, not an oversight, and it is written
here so nobody has to rediscover it.

What it means in the meantime: roles, memberships, employee names and order payloads cross the
public internet in clear, the AUTH password goes with every connect, and anyone on the path can
inject pub/sub messages. Today that is beta testers' data, which is why the trade is acceptable.

**The gate is unchanged: upgrade before a real venue is onboarded.** Order: upgrade the plan, enable
TLS, then set `REDIS_URL` to the `rediss://` URL.

If revenue arrives later than the first venue, the free fallback is to unset `REDIS_URL` entirely —
the application degrades to reading Postgres, which is what it did until recently. It costs the
two-minute replay buffer and nothing else while Cloud Run runs one instance.

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
  are isolated is the exact failure this whole thing exists to prevent. Keep `max-instances` times
  the most one instance can hold comfortably under the plan's connection limit (see
  [Connection budget](#connection-budget)).
- **`--min-instances=1`** is optional and buys away the cold start on the first order of the day.

### Connection budget

Each instance opens two go-redis clients against `REDIS_URL` — `coaster-cache` for the cache and
the counters, `coaster-realtime` for publishes and the replay buffer — plus the subscriber, which
needs a connection of its own. Each client is a pool that opens connections as concurrent commands
need them, up to ten per CPU the process sees (`10 × GOMAXPROCS`), and closes those idle for 30
minutes. On one vCPU that is up to three connections at rest and twenty-one at the most.

A paid Essentials plan allows 256, which is twelve instances at their worst. If that ever binds,
go-redis reads `pool_size` from the URL (`…?pool_size=2`), which caps both pools with no code change.
An instance that cannot get a connection degrades to working without one, so hitting the ceiling
costs latency, not availability.

If the venue count ever makes even a TLS-encrypted public endpoint the wrong trade, the move is
Memorystore on a private IP with Direct VPC egress enabled on the Cloud Run service. Nothing in the
code changes; `REDIS_URL` becomes an internal address.
