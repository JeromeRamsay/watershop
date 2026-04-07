# Watershop — Backend API

NestJS v11 REST API for the Watershop POS system. Handles all business logic, MongoDB persistence, JWT auth, and realtime WebSocket broadcasting via Valkey pub/sub.

## Stack

| | |
|---|---|
| Framework | NestJS v11 |
| Language | TypeScript v5.7 |
| Database | MongoDB via Mongoose v9 |
| Auth | JWT (`@nestjs/passport` + `passport-jwt`) + bcrypt |
| Realtime | Valkey (Redis-compatible) pub/sub + raw Node.js WebSocket |
| API Docs | Swagger at `/api` |
| Rate limiting | `@nestjs/throttler` (10 req / 60s per IP) |
| Build | SWC (fast Rust transpiler — replaces `tsc`) |

## Getting Started

```bash
cd backend
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET, FRONTEND_URL
npm install
npm run start:dev          # hot reload on port 4000
```

Swagger UI: [http://localhost:4000/api](http://localhost:4000/api)

### Required environment variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `FRONTEND_URL` | Allowed CORS origin(s) — comma-separated for multiple, e.g. `https://app.example.com,http://localhost:3000` |
| `PORT` | Optional, defaults to `4000` |
| `VALKEY_HOST` | Optional — Valkey/Redis host for cross-instance realtime pub/sub |
| `VALKEY_PORT` | Optional — default `25061` |
| `VALKEY_USERNAME` | Optional — default `default` |
| `VALKEY_PASSWORD` | Optional |
| `VALKEY_TLS` | Optional — `true` for TLS (required on DigitalOcean Managed Valkey) |

## Key conventions

- **Auth**: All routes require a valid Bearer JWT by default (global `JwtAuthGuard`). Use `@Public()` decorator to opt a route out.
- **Public routes**: `POST /users/login`, `POST /users/register`, `POST /refills` (kiosk).
- **Realtime**: Every service method that mutates data must call `this.realtimeService.emitDashboardUpdate("reason")`.
- **Soft delete**: Set `isActive: false` — never hard-delete Inventory or Supplier documents.
- **Swagger**: Add `@ApiOperation({ summary: "..." })` to every controller method.

## Module map

| Module | Prefix | Responsibility |
|---|---|---|
| `UsersModule` | `/users` | Register, login, manage staff, login activity |
| `CustomersModule` | `/customers` | CRUD, wallet, phone search, pagination |
| `InventoryModule` | `/inventory` | Product catalog, stock tracking, soft-delete |
| `OrdersModule` | `/orders` | Order creation, stock deduction, wallet credits, delivery auto-create |
| `DeliveriesModule` | `/deliveries` | Delivery scheduling and status tracking |
| `RefillsModule` | `/refills` | Kiosk refill credit redemption |
| `NotificationsModule` | `/notifications` | Low-stock / out-of-stock / refill alerts, resolve |
| `ReportsModule` | `/reports` | Dashboard stats, top items, top customers, walk-in stats |
| `SettingsModule` | `/settings` | Single-document store settings |
| `SuppliersModule` | `/suppliers` | Supplier catalog (soft-delete) |
| `EmployeeHoursModule` | `/employee-hours` | Staff hour logging, weekly/monthly summaries |
| `RealtimeModule` | _(no HTTP)_ | Global Valkey pub/sub + WebSocket broadcaster |
| `AuthModule` | _(global)_ | `JwtStrategy`, `JwtAuthGuard`, `@Public()` decorator |

## Running tests

```bash
npm test                  # all unit tests
npm test -- --coverage    # with coverage report
npm test -- --watch       # watch mode
npm run test:e2e          # end-to-end tests
```

## Build & Deploy

```bash
npm run build             # SWC transpile → dist/
node dist/main            # start production server
```

Deployed on **DigitalOcean App Platform** — pushes to `main` trigger automatic redeployment.
