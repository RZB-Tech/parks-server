# Attraction operator round events

```http
GET /api/v1/attractions/:attractionID/rounds/events
Authorization: Bearer <employee access token>
Accept: text/event-stream
```

The stream belongs to the authenticated employee and selected attraction. It
requires a permitted round-reading role and either an active attraction assignment
or an owned X-report. X-report owners do not need an assignment row. Historical
X-report ownership permits receiving changes to their closed/refunded rounds.
Subscribers receive only their own operator's events, including when an administrator
refunds that operator's round. No card information, balances or payment details are
sent in notifications.

## Frontend integration

Use a fetch-based SSE reader that can send the existing Authorization header.
Native `EventSource` does not support a custom Authorization header. A reusable
browser client is included in [examples/attraction-round-events.mjs](examples/attraction-round-events.mjs).

```js
import { watchAttractionRounds } from "./attraction-round-events.mjs";

const stop = watchAttractionRounds({
  // Absolute API URL or same-origin prefix; omit a trailing slash.
  apiBase: "/api/v1",
  attractionID: 7,
  getAccessToken: () => auth.getValidAccessToken(),
  // Pass the signal through to these GET requests. Refresh functions should
  // apply the returned DTO to UI state and reject when the request fails.
  refresh: (signal) => Promise.all([
    reloadCurrentRound({ signal }), // GET /attractions/7/rounds/current
    reloadTodayRounds({ signal }),  // GET /attractions/7/rounds/today
  ]),
  onError: (error) => console.error(error),
});

// Call on component unmount, logout, operator change or attraction change.
stop();
```

Subscribe before the initial refresh. On **every** `ready` event, fetch both GET
endpoints; then refresh them on `round.changed`. The bundled reader performs this
automatically, serializes refreshes and coalesces bursts. For a query-cache UI,
the `refresh` callback can invalidate/refetch the corresponding query keys.

```text
retry: 3000

event: ready
data: {"attraction_id":7,"operator_id":9,"resync":true}

event: round.changed
data: {"attraction_id":7,"operator_id":9,"round_id":70,"reason":"payment.client"}

```

Reasons are `round.opened`, `payment.client`, `payment.operator`, `round.closed`,
`round.cancelled`, `round.refunded`, `round.updated`, and `report.changed`.
`report.changed` has `round_id: null` and covers X-report open/stop/resume/close.
Reasons describe changes to committed round counters/status; treat all of them
as a signal to reload authoritative state rather than incrementing local counters.
Multiple notifications from a single transaction can refer to the same round.

The server sends a heartbeat comment every 15 seconds. It closes the stream on
token expiration (or after one hour), with `auth.expired` when possible. Employee,
role and attraction access are rechecked every 60 seconds; failure sends
`access.revoked` and closes the stream. The client reacquires a valid token before
reconnecting and stops on HTTP 400/403/404; on HTTP 401 it retries after asking its
token provider for a token. The token provider should perform normal token refresh
and return no token on logout. Never put the access token in the URL.

Notifications are transient and have no replay cursor. A PostgreSQL listener outage
closes existing SSE streams; while disconnected, new subscriptions return HTTP 503
with `Retry-After: 3`. The listener reconnects automatically. After reconnecting,
`ready` causes a full refresh, including payments/refunds made during the outage.
The bundled reader retries network/503 failures with backoff. Its `onError` callback
can update a connection indicator, and its `refresh` callback must handle applying
the fresh state to the frontend.

## Server and proxy

Schema bootstrap installs idempotent PostgreSQL triggers on `attraction_rounds`
and `attraction_reports`. They cover client/operator payments, refunds, GO and
bulk/Temporal recovery without changing the payment services. `pg_notify` runs in
the writing transaction, so rollback emits nothing and delivery follows commit.
Every backend process uses one dedicated `pg.Client` session for `LISTEN`; browser
subscriptions do not hold database connections. Existing PostgreSQL credentials
are reused. No new environment variables or dependencies are needed for runtime.

Headers include `text/event-stream`, `Cache-Control: no-cache, no-store,
no-transform`, and `X-Accel-Buffering: no`; existing CORS headers are preserved.
Configure any reverse proxy to allow long responses and disable buffering. For
example, merge the following into your existing nginx server configuration,
using your actual backend port and normal forwarded headers:

```nginx
location ~ ^/api/v1/attractions/[0-9]+/rounds/events$ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    gzip off;
    proxy_read_timeout 75s;
}
```

Slow consumers are disconnected when the socket buffer fills and must reconnect
and refresh. During application shutdown, `preClose` closes SSE and the listener
before Fastify waits for outstanding responses.

## Verification

```sh
npm run build
npm test
```

The optional real PostgreSQL/HTTP integration test uses an isolated schema in an
explicitly supplied test database, drops it afterward, and skips without this
variable. Use a disposable database:

```sh
ROUND_EVENTS_TEST_DATABASE_URL=postgres://user:password@127.0.0.1:5432/test_db \
  node --test -r ts-node/register/transpile-only \
  tests/attraction-round-events.integration.test.ts
```

It verifies idempotent trigger installation, no delivery before commit, no events
after rollback, online/operator payments, GO, refunds, report closure, filtering,
delivery to two backend listeners, a live HTTP SSE stream and clean shutdown.
