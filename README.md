# Sahajometer

Real-time quiz platform (host dashboard + participant join) built with Express, Prisma/PostgreSQL, React, and Socket.IO.

## Setup

### Server

```bash
cd server
cp .env.example .env
# Fill DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, FRONTEND_URL
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Server defaults to `http://localhost:5000`.

On first boot, if `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set and that user does not exist, an ADMIN account is created. If the database has no users at all, the first successful login also becomes ADMIN.

### Client

```bash
cd client
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

Client defaults to Vite `http://localhost:5173` and talks to `http://localhost:5000`.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server | PostgreSQL connection string |
| `JWT_SECRET` | server | Required in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | server | Bootstrap the first admin |
| `FRONTEND_URL` | server | CORS origin (default `http://localhost:5173`) |
| `PORT` | server | API port (default `5000`) |
| `NODE_ENV` | server | Set to `production` on a deployed server |
| `TRUST_PROXY` | server | Proxy hops to trust; only set when behind a reverse proxy |
| `JOIN_RATE_LIMIT_PER_MINUTE` | server | Per-IP cap on joins (default 600) |
| `DB_POOL_MAX` | server | Postgres pool size (default 20) |
| `REDIS_URL` | server | Required to run more than one instance |
| `VITE_API_URL` | client | API + Socket.IO base URL |

Do not run `prisma db push --accept-data-loss` in production. Use `npm run db:migrate` after generating migrations.

## Operational notes

### Redis and running more than one instance

`REDIS_URL` decides how many instances you can run:

- **Set** — Socket.IO uses the Redis adapter, so a broadcast from one instance
  reaches participants connected to another. Live question state, responder
  counts, connected-participant counts (`src/utils/liveState.ts`) and the rate
  limiter are all shared. Multiple instances are safe.
- **Unset** — everything falls back to process memory and the server logs a
  warning on boot. It works, but you must run **exactly one instance** and must
  not deploy while an event is live, because a rolling deploy briefly runs two.

The response batch queue stays per-instance either way; that is fine, since
responses are upserted on `(questionId, participantId)`.

Stale connection counts are the one thing Redis does not self-heal: if an
instance is killed outright its sockets never fire `disconnect`, so the
connected-participant count can read high until the keys expire (24h) or the
event is cleared.

### Shutdown

Responses are buffered in memory and written every two seconds. The server drains
that buffer on `SIGTERM`/`SIGINT`, so give it a few seconds to exit on deploy
rather than killing it outright, or the last couple of seconds of answers are lost.

### Participant names

A name is unique per event and is bound to a `joinToken` held in the participant's
browser. Rejoining from the same browser restores the same identity; someone
entering a name already taken in that room is asked to choose another. Clearing
browser storage means rejoining under a different name.
