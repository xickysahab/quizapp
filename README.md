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
| `VITE_API_URL` | client | API + Socket.IO base URL |

Do not run `prisma db push --accept-data-loss` in production. Use `npm run db:migrate` after generating migrations.
