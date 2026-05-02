# Global Sail Logistics — Operations Dashboard

## Overview

pnpm workspace monorepo. React + Vite frontend with a PostgreSQL-backed Express 5 API.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Auth**: express-session + bcrypt (server-side sessions, cookie `sid`)
- **Build**: esbuild (API server ESM bundle)
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild composite lib declarations (run after schema changes)
- `pnpm --filter @workspace/db run push` — push DB schema changes to PostgreSQL (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### `api-server` — Express 5 REST API (`/api`)
- Port resolved from `PORT` env var (default 8080)
- Session auth via `express-session` (secret: `SESSION_SECRET` env var, cookie name `sid`)
- Default admin seeded on startup: `admin@globalsail.com` / `admin123`
- Routes mounted under `/api`:
  - `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
  - `GET /clients`, `POST /clients`, `DELETE /clients/:id`
  - `GET /drivers`, `POST /drivers`
  - `GET /trucks`, `POST /trucks`
  - `GET /shipments`, `POST /shipments`
  - `GET /dispatches`, `POST /dispatches`, `PATCH /dispatches/:id/return`
  - `GET /users`, `POST /users` (admin-only)
- `requireAuth` middleware guards all data routes

### `shipment-dashboard` — React + Vite frontend (`/`)
- Pages: `/` login, `/dashboard` (Shipments), `/dispatch` (Drivers + Dispatch records), `/users` (admin only)
- Auth: `AuthProvider` context (`src/hooks/use-auth.ts`) calls `/api/auth/*`; uses `createElement` to avoid JSX in `.ts` file
- All data hooks (`use-shipments`, `use-clients`, `use-drivers`, `use-trucks`, `use-dispatches`) call the API via `apiFetch` helper (`src/hooks/use-api.ts`) with `credentials: "include"`
- Shipments: one DB record per container number — form accepts multiple inputs and POSTs N times
- Dispatches: embedded `driver` and `truck` objects returned by `GET /dispatches` (joined on server)
- Uses `xlsx` (SheetJS) for Excel export on both Shipments and Dispatch tables
- Hijri date picker via `react-multi-date-picker` with `react-date-object` Arabic calendar

## Database Schema (`lib/db/src/schema/`)

- `users` — id, email (unique), passwordHash, role (`admin`|`operator`), createdAt
- `clients` — id, name, createdAt
- `drivers` — id, name, phone, createdAt
- `trucks` — id, model, plateNumber, createdAt
- `shipments` — id, bayanNo, clientName, shipmentType, containersCount, containerNumber, terminal, lastPulloutDateHijri, createdAt
- `dispatches` — id, containerNumber, driverId (FK), truckId (FK), entryTime, cargoDeliveryDate, emptyReturnDate, returnedAt, createdAt

## Notes

- After editing `lib/db` schema, run `pnpm run typecheck:libs` to rebuild declarations before typechecking the api-server
- `bcrypt` is listed in `onlyBuiltDependencies` in `pnpm-workspace.yaml`
