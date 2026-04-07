# Watershop — Architecture & Project Reference

> **Target audience:** developers, AI agents, DevOps, and maintainers.
> Last reviewed: April 2026 — updated to reflect auth guards, TanStack Query migration, Valkey keepalive fix, notifications resolve, CORS multi-origin, SWC build

---

## Table of Contents

1. [Project Purpose](#1-project-purpose)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Backend — Module Reference](#4-backend--module-reference)
5. [Frontend — Structure Reference](#5-frontend--structure-reference)
6. [Data Models](#6-data-models)
7. [Data Flow — Key Scenarios](#7-data-flow--key-scenarios)
8. [Realtime System](#8-realtime-system)
9. [Database Review — MongoDB vs Valkey](#9-database-review--mongodb-vs-valkey)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Known Bugs & Security Issues](#11-known-bugs--security-issues)
12. [Testing Strategy](#12-testing-strategy)
13. [Logging & Observability](#13-logging--observability)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [Deployment Notes](#15-deployment-notes)
16. [Developer Workflow](#16-developer-workflow)
17. [Onboarding Checklist](#17-onboarding-checklist)
18. [Future Improvements](#18-future-improvements)

---

## 1. Project Purpose

**Watershop** (also referred to as *Woodstock POS*) is a **Point-of-Sale and management system for a water shop business**. It supports:

- Selling water products (bottles, refills, cases) at a physical counter and via delivery
- A customer wallet/credit system (prepaid bottle credits + store credit)
- Inventory management with low-stock notifications
- Delivery scheduling and tracking
- Refill kiosk (self-service terminal for customers to redeem bottle credits by phone)
- Employee hours tracking
- Sales reports and dashboard analytics
- Real-time dashboard updates across browser sessions via WebSocket + Valkey pub/sub

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **API Backend** | NestJS (Node.js) | v11 |
| **API Language** | TypeScript | v5.7 |
| **Database** | MongoDB via Mongoose | Mongoose v9 |
| **Realtime Transport** | Valkey (Redis-compatible) pub/sub | Via `redis` npm package |
| **WebSocket** | Raw Node.js HTTP upgrade (no Socket.IO) | Built-in |
| **Auth** | JWT via `@nestjs/passport` + `passport-jwt` + bcrypt | Global `JwtAuthGuard` |
| **Rate limiting** | `@nestjs/throttler` | 10 req / 60s per IP |
| **Build** | SWC (Rust transpiler) | Via `nest-cli.json` `"builder": "swc"` |
| **API Docs** | Swagger (`@nestjs/swagger`) at `/api` | — |
| **Frontend** | Next.js (App Router) | v15 |
| **UI Language** | TypeScript + React 19 | — |
| **UI Styling** | Tailwind CSS v4 | — |
| **UI Components** | Radix UI + shadcn/ui | — |
| **Data Fetching** | TanStack Query v5 | `staleTime: 30s`, `gcTime: 5min` |
| **HTTP Client** | Axios | Single instance with JWT interceptor |
| **Charts** | Recharts | — |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Browser / Kiosk                            │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │          Next.js Frontend (watershop_web_ui)                 │   │
│   │                                                              │   │
│   │   /dashboard  /kiosk  /(auth)/login  /(auth)/signup         │   │
│   │                                                              │   │
│   │   axios → NEXT_PUBLIC_API_URL            WebSocket          │   │
│   └─────────────────────────────┬────────────────┬─────────────┘   │
└─────────────────────────────────│────────────────│──────────────────┘
                                  │ HTTP/REST       │ WS /ws/dashboard
                                  ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NestJS API (watershop_api)                        │
│                         Port 4000                                    │
│                                                                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│   │ Users/   │ │ Orders   │ │Inventory │ │Customers │   ...        │
│   │ Auth     │ │ Service  │ │ Service  │ │ Service  │             │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │          RealtimeService (Global @Injectable)               │   │
│   │          Pub/Sub bridge via Valkey (optional)               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Swagger UI: /api                                                   │
└───────────┬────────────────────────────────────────────┬────────────┘
            │ Mongoose                                    │ redis pub/sub
            ▼                                            ▼
    ┌───────────────┐                           ┌────────────────┐
    │   MongoDB     │                           │     Valkey     │
    │  (main DB)    │                           │ (realtime only)│
    └───────────────┘                           └────────────────┘
```

### Network topology on DigitalOcean App Platform
- **API component**: NestJS process, listens on `PORT` (default 4000)
- **Web component**: Next.js process
- **MongoDB**: Managed MongoDB (or external Atlas)
- **Valkey**: DigitalOcean Managed Valkey database (optional — falls back gracefully)
- **Nginx / App Platform load balancer**: sits in front of both

---

## 4. Backend — Module Reference

The NestJS app is structured as feature modules. All modules are registered in `app.module.ts`.

### 4.1 Module Map

| Module | Controller prefix | Key responsibilities |
|---|---|---|
| `UsersModule` | `/users` | Register, login, manage staff accounts, login activity |
| `CustomersModule` | `/customers` | Customer CRUD, wallet management, phone search, pagination |
| `InventoryModule` | `/inventory` | Product catalog, stock tracking, soft-delete |
| `OrdersModule` | `/orders` | Order creation (complex), status updates, stock deduction, wallet credit deduction |
| `DeliveriesModule` | `/deliveries` | Delivery scheduling, status tracking |
| `RefillsModule` | `/refills` | Kiosk-oriented refill flow (delegates to OrdersService) |
| `NotificationsModule` | `/notifications` | Low-stock / out-of-stock / refill alerts |
| `ReportsModule` | `/reports` | Aggregation queries (revenue, top items, top customers) |
| `SettingsModule` | `/settings` | Single-document store settings (name, currency, tax rate, hours) |
| `SuppliersModule` | `/suppliers` | Supplier catalog (soft-delete) |
| `EmployeeHoursModule` | `/employee-hours` | Staff hour logging, weekly/monthly summaries |
| `RealtimeModule` | _(no HTTP)_ | Global service; Valkey pub/sub + WebSocket broadcaster |

### 4.2 Module Dependency Graph

```
OrdersModule
  ├── InventoryModule (stock deduction)
  ├── CustomersModule (wallet updates)
  ├── DeliveriesModule (auto-create delivery)
  ├── NotificationsModule (low/out-of-stock alerts)
  └── RealtimeModule (global)

RefillsModule
  ├── CustomersModule (phone lookup)
  ├── OrdersModule (creates order)
  └── NotificationsModule

All feature modules → RealtimeModule (via global injection)
```

### 4.3 Service Descriptions

#### `UsersService`
- Handles registration with bcrypt password hashing (10 salt rounds)
- Login: validates credentials, updates `lastLoginAt` and `loginCount`, returns JWT
- `findStaff`: queries by `role: /^staff$/i` (case-insensitive regex)
- `getLoginActivity`: sorted by `lastLoginAt` desc, limit clamped to 1–200

#### `OrdersService` (most complex)
Order creation flow:
1. Fetch customer from DB
2. For each item: fetch inventory, check stock, determine price (regular / refill price / 0 for credit redemption)
3. Deduct physical stock via `InventoryService.update()`
4. Fire low/out-of-stock notifications if needed
5. Update customer wallet if credits used or refills added
6. Calculate `grandTotal = subTotal - discount`
7. Determine payment status from `amountPaid` vs `grandTotal`
8. Save order document
9. If `isDelivery`: auto-create a `Delivery` record and link it back to the order
10. Emit `orders.created` realtime event

#### `CustomersService`
- `findAllPaginated`: uses `$facet` aggregation to join order stats per customer in a single pass
- `findByPhone`: digit-normalised regex match (strips non-digits, allows any separator)

#### `RealtimeService`
- On module init: connects two Redis clients (publisher + subscriber) to Valkey
- If Valkey credentials are absent: logs a warning and continues (single-instance mode, WS still works locally)
- `emitDashboardUpdate(reason)`: broadcasts locally and publishes to Valkey channel for cross-instance fanout
- Uses `instanceId` to prevent echoing own events back

---

## 5. Frontend — Structure Reference

```
frontend/
├── app/
│   ├── (auth)/login          # Public login page
│   ├── (auth)/signup         # Public signup page
│   ├── dashboard/            # Protected admin/staff dashboard
│   │   ├── page.tsx          # Main dashboard with metrics, inventory, deliveries
│   │   ├── customers/        # Customer management (server-side pagination)
│   │   ├── orders/           # Order list + new order form
│   │   ├── deliveries/       # Delivery schedule (list + calendar view)
│   │   ├── inventory/        # Inventory management
│   │   ├── reports/          # Sales reports
│   │   ├── settings/         # Store settings
│   │   ├── suppliers/        # Supplier management
│   │   ├── employees/        # Employee list / management
│   │   └── hours/            # Employee hour logging
│   └── kiosk/
│       └── refill/           # Kiosk home — enter phone number
│           ├── name/         # Confirm/select account holder
│           └── select/       # Select refill items & confirm
├── features/                 # Feature-specific components + logic
│   ├── auth/                 # Login/register forms, server actions
│   ├── customers/            # Customer list, add/edit forms
│   ├── dashboard/            # KPI cards, welcome section, etc.
│   ├── deliveries/           # Delivery list
│   ├── inventory/            # Inventory table
│   ├── orders/               # Order list, new order form
│   ├── reports/              # Chart components
│   └── suppliers/            # Supplier list, add/edit forms
├── components/               # Shared UI (Button, Card, Dialog, etc.)
├── lib/
│   ├── api.ts                # Axios instance with JWT interceptor
│   ├── queries.ts            # ALL TanStack Query hooks (useOrders, useCustomers, useInventory, …)
│   ├── react-query-provider.tsx  # QueryClientProvider (staleTime 30s, gcTime 5min)
│   └── use-dashboard-realtime.ts  # WebSocket hook with auto-reconnect + exponential backoff
└── proxy.ts                  # Next.js middleware for auth redirects + cache headers
```

### Authentication flow (frontend)
1. `features/auth/actions.ts` — Server action that calls `POST /users/login`
2. On success: sets `session_token` (HttpOnly cookie) and `auth_token_public` (JS-readable cookie) + `user_info` cookie
3. `proxy.ts` (Next.js middleware): guards `/dashboard` by checking `session_token` cookie
4. `lib/api.ts`: reads `auth_token_public` cookie and adds `Authorization: Bearer <token>` header to all API calls

### Data fetching — TanStack Query
All data fetching in dashboard pages uses hooks from `lib/queries.ts` (never raw `useEffect + api.get()`):
- `staleTime: 30s` — revisiting a page shows cached data **instantly** with a background refresh
- `gcTime: 5min` — data stays in memory between navigations
- After any mutation: `qc.invalidateQueries({ queryKey: queryKeys.<resource>() })` triggers a silent background refresh

Available hooks: `useDashboardStats`, `useOrders`, `useCustomers`, `useInventory`, `useDeliveries`, `useSuppliers`, `useNotifications`, `useSettings`, `useUsers`, `useStaff`, `useEmployeeHours`, `useHoursSummary`, `useMonthlyHours`

### Realtime flow (frontend)
`use-dashboard-realtime.ts` hook:
- Derives WebSocket URL from `NEXT_PUBLIC_API_URL` (`http→ws`, `https→wss`)
- Connects to `/ws/dashboard` on the API server
- On `dashboard:update` message: debounces 250ms then calls `onUpdate()` callback
- Implements exponential backoff reconnect (up to 10s)
- All pages pass `() => qc.invalidateQueries(...)` as the `onUpdate` callback — no manual re-fetch needed

---

## 6. Data Models

### User
```
{ firstName, lastName, username (unique), password (bcrypt), role: admin|staff,
  isActive, loginCount, lastLoginAt, timestamps }
```

### Customer
```
{ type: individual|business, firstName, lastName, email (unique), phone (unique),
  addresses: [{ label, street, city, state, zipCode, country, isDefault }],
  familyMembers: [{ name, relationship, phone, email, allowCreditUse }],
  wallet: {
    storeCredit: number,
    prepaidItems: [{ itemId→Inventory, itemName, quantityRemaining, expiryDate }]
  },
  lastVisit, timestamps }
  Indexes: { createdAt: -1 }, { firstName: 1, lastName: 1 }
```

### Inventory
```
{ name, sku (unique), category, description, stockQuantity, unitType,
  lowStockThreshold (default 10), purchasePrice, sellingPrice,
  isRefillable, refillPrice, rentalPrice, isTaxable, isActive (soft-delete),
  timestamps }
```

### Order
```
{ orderNumber (unique, ORD-<timestamp>), customer→Customer, cashier→User,
  items: [{ item→Inventory, name, sku, quantity, unitPrice, totalPrice,
            isPrepaidRedemption, isRefill }],
  refills: [same structure],
  refillCount, subTotal, discount, grandTotal,
  status: pending|scheduled|completed|cancelled,
  paymentStatus: paid|unpaid|partial|pending,
  amountPaid, paymentMethod: cash|card|credit_redemption|store_credit,
  isPrepaidRedemption, isDelivery, deliveryId→Delivery, deliveryAddress,
  deliveryDate, emailReceipt, paymentDetails (any), timestamps }
```

### Delivery
```
{ order→Order, customer→Customer, address: { street, city, state, zipCode, country },
  scheduledDate, timeSlot, status: scheduled|out_for_delivery|delivered|failed|cancelled,
  deliveryNotes, assignedDriver→User, timestamps }
```

### Notification
```
{ message, type: low_stock|out_of_stock|refill_order,
  inventoryItemId→Inventory, resolved (default false), timestamps }
```

### EmployeeHour
```
{ user→User, workDate, hours (0–24), notes, createdBy→User, timestamps }
```

### Setting
```
{ storeName, currency, taxRate, receiptFooter, enableLowStockAlerts,
  contactPhone, contactEmail, operatingHours: { open, close } }
  (single-document collection — upserted on every update)
```

### Supplier
```
{ name, contactName, phone, email, address, isActive (soft-delete), timestamps }
```

---

## 7. Data Flow — Key Scenarios

### 7.1 New Sale (POS Order)

```
Frontend (New Order Form)
  POST /orders { customerId, items[], paymentMethod, ... }
  │
  ▼ OrdersService.create()
  ├─ CustomersService.findOne(customerId)         → customer doc
  ├─ For each item:
  │   ├─ InventoryService.findOne(itemId)          → inventory doc
  │   ├─ Check stock                               → 400 if insufficient
  │   ├─ If credit redemption: check wallet        → 400 if insufficient
  │   ├─ InventoryService.update(id, {stockQty})   → deduct stock
  │   └─ NotificationsService.createIfNotExists()  → low/out-of-stock alerts
  ├─ CustomersService.update(id, {wallet})         → deduct/top-up credits
  ├─ Order.save()                                  → persist order
  ├─ If isDelivery: DeliveriesService.create()     → persist delivery, link to order
  └─ RealtimeService.emitDashboardUpdate()         → WS broadcast
```

### 7.2 Kiosk Refill

```
Frontend (Kiosk) POST /refills { phone, items[], memberName? }
  │
  ▼ RefillsService.create()
  ├─ CustomersService.findByPhone(phone)           → fuzzy digit match
  ├─ Try: OrdersService.create({ refillRedemption: true })
  │   └─ Uses prepaid credits in wallet
  ├─ If insufficient credits: OrdersService.create({ unpaid, cash, no credit topup })
  └─ NotificationsService.create(refill_order)
```

### 7.3 Dashboard Real-Time Update

```
Any mutation (order, delivery, inventory, etc.)
  └─ service.emitDashboardUpdate("orders.created")
       ├─ Local broadcast: ws.broadcast(event)      → all WS clients this instance
       └─ If Valkey enabled: publisher.publish(channel, JSON.stringify(event))
                                                    ↓
                                              Valkey channel
                                                    ↓
                                subscriber.subscribe → broadcaster() → ws.broadcast
                                (on all other API instances)
                                
Frontend: useDashboardRealtime hook
  └─ Receives dashboard:update → debounce 250ms → onUpdate() callback
       └─ qc.invalidateQueries(queryKey)   → TanStack Query background re-fetch
            └─ Components re-render with fresh cached data (no loading flicker)
```

---

## 8. Realtime System

The realtime system is intentionally **framework-agnostic** (no Socket.IO, no `@nestjs/websockets`):

- `dashboard-ws.server.ts`: raw Node.js HTTP upgrade handler, implements WebSocket framing manually
- Path: `ws://<api>/ws/dashboard`
- Only sends server → client push (no client → server commands needed)
- Supports text frames, close frames, and ping→pong
- `RealtimeService`: acts as the bridge between business events and the WS broadcaster

**Why this works without Socket.IO:**
The dashboard only needs one-way push ("something changed, please re-fetch"). No rooms, no subscriptions, no bidirectional commands needed.

**Valkey's role:**
When multiple API instances are running (horizontal scale), a mutation on instance A would only push to WS clients connected to instance A. Valkey pub/sub makes instance B's broadcaster also fire, ensuring all connected dashboards update.

**Valkey connection resilience:**
DigitalOcean managed networking drops idle TCP connections at exactly 300s. The `RealtimeService` is configured with:
- `socket.keepAlive: 15_000` — sends TCP keepalive probes every 15s to prevent idle timeout
- `pingInterval: 60_000` — Redis-level pings every 60s for application-layer heartbeat
- `reconnectStrategy` — exponential backoff (500ms → 10s) on disconnect
- `ready` event listener — re-enables `redisEnabled` flag after successful reconnect

---

## 9. Database Review — MongoDB vs Valkey

### 9.1 What is actually being used

| System | Role |
|---|---|
| **MongoDB** | **Primary database** — all business data (customers, orders, inventory, etc.) |
| **Valkey** | **Message broker only** — pub/sub channel for cross-instance realtime events |

> ⚠️ **Important clarification:** Valkey is NOT being used as a database. It is used exclusively as a pub/sub message bus for the realtime WebSocket system. MongoDB is the sole database.

### 9.2 Is MongoDB the right choice?

**Yes, MongoDB is appropriate for this application.** Reasons:

| Factor | Analysis |
|---|---|
| **Schema flexibility** | Customer wallet `prepaidItems` array, nested `addresses`, `familyMembers` — these deeply-nested structures are natural in MongoDB documents but painful in SQL |
| **Aggregation needs** | Reports use MongoDB aggregation pipeline (`$group`, `$lookup`, `$unwind`, `$facet`) which is well-suited and performant |
| **Reference joins** | Orders reference Customers, Inventory, Deliveries via `ObjectId`. Mongoose `populate()` handles this cleanly |
| **Soft deletes** | `isActive` flag pattern is idiomatic in MongoDB |
| **Time-series queries** | Year-based order filtering with date ranges is efficient with indexes |
| **Scale** | For a water shop POS, document counts will remain manageable |

### 9.3 Is Valkey the right choice for the realtime layer?

**Yes, Valkey is appropriate.** It is Redis-compatible, making the existing `redis` npm package work without changes. For pub/sub-only usage (no data storage), Valkey is lightweight and cost-effective on DigitalOcean's managed offering.

If Valkey credentials are not configured, the system gracefully falls back to single-instance WebSocket broadcasts, which is fine for most deployments.

### 9.4 Recommendation

- Keep MongoDB as the primary database
- Keep Valkey for pub/sub realtime
- Consider MongoDB Atlas or DigitalOcean Managed MongoDB for production
- Add MongoDB indexes for frequently queried fields (see bugs section)

---

## 10. Authentication & Authorization

### How it works
1. `POST /users/login` → returns `{ access_token: string, user: { id, name, role } }`
2. Token is a JWT signed with `process.env.JWT_SECRET`, 1-day expiry
3. Frontend stores token in `auth_token_public` cookie
4. All subsequent API calls send `Authorization: Bearer <token>` header

### Auth Guards — ✅ Implemented

A global `JwtAuthGuard` is registered via `APP_GUARD` in `app.module.ts`. This means:
- **Every route is protected by default** — no JWT = 401 Unauthorized
- `@Public()` decorator opts individual routes out (login, register, kiosk refill)
- Rate limiting (`ThrottlerGuard`, 10 req/60s) is also applied globally

**Files:**
- `src/auth/jwt.strategy.ts` — validates JWT and extracts `{ userId, username, role }` into `req.user`
- `src/auth/jwt-auth.guard.ts` — extends `AuthGuard('jwt')`, checks `@Public()` metadata
- `src/auth/auth.module.ts` — `@Global()` module that registers `JwtStrategy` + `PassportModule`
- `src/auth/public.decorator.ts` — `@Public()` sets `isPublic: true` metadata

**Currently public routes:**
- `POST /users/login`
- `POST /users/register`
- `POST /refills` (kiosk — unauthenticated users)

### Remaining Security Gaps
- `JWT_SECRET` must be set in production env (see §15) — the fallback string is a known value
- No MongoDB transactions on order creation (stock can be lost on save failure)

---

## 11. Known Bugs & Security Issues

### 🔴 Critical

| # | Location | Issue | Fix |
|---|---|---|---|
| C1 | `users.module.ts:14` | **Hardcoded JWT secret** `"SECRET_KEY_HERE"` → fallback `"dev-fallback-secret-change-before-deploy"` | Use `process.env.JWT_SECRET` — **must be set in production env** |
| ~~C2~~ | ~~All controllers~~ | ~~**No authentication guards**~~ | ✅ **FIXED** — `JwtAuthGuard` registered globally via `APP_GUARD` in `app.module.ts`; `@Public()` applied to login/register/refills |
| C3 | `orders.service.ts:create()` | **Non-atomic order creation** — stock deducted before order is saved; if the save fails, stock is permanently lost with no rollback | Use MongoDB transactions (`session.withTransaction`) for the full create flow |

### 🟠 High

| # | Location | Issue | Fix |
|---|---|---|---|
| ~~H1~~ | ~~`orders.service.ts:257`~~ | ~~**`orderNumber` collision**~~ | ✅ **FIXED** — now uses `ORD-${randomBytes(4).toString("hex").toUpperCase()}` |
| H2 | `lib/api.ts:36–38` | **401 redirect is commented out** — users stay on dashboard with expired sessions | Uncomment redirect to `/login` on 401 |
| ~~H3~~ | ~~`dashboard/page.tsx`~~ | ~~**`rentalOrders` always 0**~~ | ✅ **FIXED** — now filters `o.isDelivery === true`, metric labelled "Delivery Orders" |
| ~~H4~~ | ~~`notifications.controller.ts`~~ | ~~**No `resolve` endpoint**~~ | ✅ **FIXED** — `PATCH /notifications/:id/resolve` and `PATCH /notifications/resolve-all` implemented |
| ~~H5~~ | ~~All controllers~~ | ~~**No rate limiting**~~ | ✅ **FIXED** — `ThrottlerModule` registered globally (10 req/60s per IP) |

### 🟡 Medium

| # | Location | Issue | Fix |
|---|---|---|---|
| M1 | `orders/entities/order.entity.ts:102` | **`paymentDetails` typed as `any`** — bypasses all type safety | Define a `PaymentDetails` discriminated union type and use it in schema and DTO |
| M2 | `customers.service.ts:160` | **`findByPhone` unindexed regex** — regex scan on full collection; slow at scale | Add a sparse normalized `phoneDigits` field with index, or use text index |
| M3 | `dashboard/page.tsx:111` | **Debug `console.log` in production** | Remove or replace with proper logging |
| M4 | `orders.service.ts:325–339` | **`findAll` fetches ALL orders** — no pagination; will degrade as data grows | Add pagination like `findAllPaginated` in CustomersService |
| M5 | `deliveries.service.ts:47–55` | **`findAll` fetches ALL deliveries** — no pagination | Add date-range filters and pagination |
| M6 | `refills.service.ts:28` | **`customerId` extraction uses unsafe `any` cast** — `(customer as any)?._id?.toString?.()` | Use typed `CustomerDocument` return type from `findByPhone` |

### 🔵 Low / Code Quality

| # | Location | Issue |
|---|---|---|
| L1 | `orders.service.ts:283` | Variable shadowing — `deliveryAddress` is destructured from DTO at top, then re-declared with `const` inside `if (isDelivery)` block |
| L2 | `settings/entities/setting.entity.ts` | `@Schema()` missing `timestamps: true` — no `createdAt`/`updatedAt` on settings |
| L3 | `suppliers.service.ts:44` | Soft-delete only — no way to query or reactivate inactive suppliers |
| L4 | `reports/reports.service.spec.ts` | Existing test spec is a shell with no real assertions and will fail to compile (no model provided) |
| L5 | `users.module.ts:15` | Comment says "In production, use process.env.JWT_SECRET" — this comment has been there since initial dev |

### ⚠️ Additional risks (from PROJECT_HANDOFF.md)

| # | Area | Risk | Notes |
|---|---|---|---|
| R1 | **Kiosk** | **Kiosk UI depends on `localStorage`** for intermediate state between refill steps | Can fail in Safari private mode; state lost on navigation; not SSR-safe |
| R2 | **Reports** | **No caching on report queries** — aggregation pipelines run on every page load | Will become expensive as order volume grows |
| R3 | **API contracts** | **Loose frontend-to-backend data contracts** — no shared type package or OpenAPI client generation | Frontend and backend can silently diverge |
| R4 | **Auth** | **`NEXT_PUBLIC_API_URL` is NOT configured in the current deployment env** — frontend env is listed as "N/A" in handoff | All Axios calls would use `undefined` as the base URL, causing silent failures in production |
| R5 | **Auth** | **`JWT_SECRET` is NOT present in the confirmed production env** — the fallback `"dev-fallback-secret-change-before-deploy"` is therefore active in production | JWT tokens are signed with a known string |
| R6 | **Settings** | **Single-document settings model** (`findOne({})` + upsert) — fails silently if multiple documents exist | Should enforce single-doc constraint at schema level |

---

## 12. Testing Strategy

### Philosophy
Tests are organised per-service (unit tests). Each service is tested in isolation with all dependencies mocked. No real MongoDB connection is required.

### Files added
```
watershop_api/src/
  users/users.service.spec.ts           ← auth and user management logic
  orders/orders.service.spec.ts         ← order lifecycle and payment logic
  customers/customers.service.spec.ts   ← customer CRUD and wallet logic
  inventory/inventory.service.spec.ts   ← stock management and soft-delete
```

### Running tests
```bash
cd backend
npm test                    # all unit tests
npm test -- --coverage      # with coverage report
npm test -- --watch         # watch mode
npm run test:e2e            # end-to-end tests
```

### What is tested

| Service | Tests cover |
|---|---|
| `UsersService` | register (happy + duplicate), login (happy + wrong creds + deactivated), findStaff, createManagedUser, updateManagedUser (with password rehash), setActiveStatus, getLoginActivity limit clamping |
| `OrdersService` | findAll (with/without year), findOne (found/not found), updateStatus, update, remove |
| `CustomersService` | create (happy + duplicate email/phone), findAll, findOne, search, findByPhone, update, remove |
| `InventoryService` | create (happy + duplicate SKU), findAll, findOne (active/inactive), update, remove (soft-delete) |

---

## 13. Logging & Observability

### Backend structured logging
NestJS has a built-in `Logger` class used in `RealtimeService`. It logs:
- Valkey connection success/failure
- Realtime event parse errors
- Valkey publisher/subscriber errors

All output goes to **stdout/stderr** which DigitalOcean App Platform captures automatically.

### Accessing logs on DigitalOcean App Platform

#### Via the dashboard
1. Log into DigitalOcean
2. Click **Apps** → select your app
3. Click the component (API or UI)
4. Open **Runtime Logs** tab

#### Via `doctl` CLI (recommended for tailing)

```bash
# Install doctl (Windows)
winget install DigitalOcean.doctl

# Authenticate
doctl auth init

# List your apps
doctl apps list

# Get runtime logs for your API component
doctl apps logs <APP_ID> --component <API_COMPONENT_NAME> --type=run --follow

# Get deploy logs
doctl apps logs <APP_ID> --component <API_COMPONENT_NAME> --type=deploy

# Get build logs
doctl apps logs <APP_ID> --component <API_COMPONENT_NAME> --type=build
```

Replace `<APP_ID>` with the ID from `doctl apps list` and `<API_COMPONENT_NAME>` with the component name in your app spec (usually `api` or `watershop-api`).

#### PowerShell helper script
A `scripts/logs.ps1` script is included in this repo to simplify log access.

### Improving logging
For better observability, consider:
1. Adding `@nestjs/terminus` for a health-check endpoint at `/health`
2. Forwarding logs to Better Stack, Logtail, or Datadog via a log drain on App Platform
3. Adding request-level logging with `@nestjs/morgan` or a custom interceptor

---

## 14. CI/CD Pipeline

GitHub Actions workflows are configured in `.github/workflows/`:

| File | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push / PR to `main` | Lint + unit tests for both API and UI |
| `deploy.yml` | Push to `main` (after CI passes) | Deploy to DigitalOcean App Platform |

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `DIGITALOCEAN_ACCESS_TOKEN` | DO personal access token with App Platform write access |
| `DO_API_APP_ID` | DigitalOcean App ID for the API component |
| `DO_UI_APP_ID` | DigitalOcean App ID for the UI component (if separate) |

---

## 15. Deployment Notes

### Environment Variables — confirmed production state

The table below reflects variables as documented in `PROJECT_HANDOFF.md`. ⚠️ columns flag confirmed gaps.

#### API (`watershop_api`)

| Variable | Status | Notes |
|---|---|---|
| `MONGO_URI` | ✅ Set | MongoDB Atlas cluster (see handoff for connection details — do NOT commit to repo) |
| `FRONTEND_URL` | ✅ Set | CORS allowed origin(s). Supports **comma-separated** list for multiple origins, e.g. `https://app.example.com,https://staging.example.com`. `localhost:3000` and `localhost:3001` are always allowed. |
| `VALKEY_HOST` | ✅ Set | DigitalOcean Managed Valkey (`*.k.db.ondigitalocean.com`) |
| `VALKEY_PORT` | ✅ Set | `25061` |
| `VALKEY_USERNAME` | ✅ Set | `default` |
| `VALKEY_PASSWORD` | ✅ Set | See handoff — do NOT commit to repo |
| `VALKEY_TLS` | ✅ Set | `true` |
| `PORT` | ⬜ Default | Defaults to `4000` if not set |
| `JWT_SECRET` | 🔴 **MISSING** | **Not in production env.** The code falls back to `"dev-fallback-secret-change-before-deploy"` which is a known string — tokens are not secure. Must be added immediately. |

#### UI (`watershop_web_ui`)

| Variable | Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | 🔴 **MISSING** | Listed as "N/A" in handoff. Without this, all Axios calls use `undefined` as base URL and will silently fail in production. Must be set to the deployed API URL. |

### Immediate env actions required

```bash
# These MUST be set before next deployment

# API — add to DigitalOcean App Platform env vars:
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

# UI — add to DigitalOcean App Platform env vars:
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### `.env.example` files

Add these to each project root so developers know what variables are required:

**`watershop_api/.env.example`**
```env
MONGO_URI=mongodb://localhost:27017/woodstock-pos
FRONTEND_URL=http://localhost:3000
PORT=4000
JWT_SECRET=your-strong-random-secret-here

# Optional — Valkey pub/sub for multi-instance realtime
VALKEY_HOST=
VALKEY_PORT=
VALKEY_USERNAME=default
VALKEY_PASSWORD=
VALKEY_TLS=true
```

**`watershop_web_ui/.env.example`**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Build commands
```bash
# API
cd backend && npm ci && npm run build

# UI
cd frontend && npm ci && npm run build
```

### Start commands
```bash
# API
node dist/main

# UI
npm start
```

### Seed script
```bash
# Seed customer data from Customers.xls (run from backend/)
npm run seed:customers
```

### Middleware note
`proxy.ts` in the UI root is the **Next.js middleware** file (not a standalone proxy server). The exported `config.matcher` tells Next.js which routes to intercept. This also sets `Cache-Control: no-store` headers to prevent DigitalOcean App Platform CDN from caching Next.js RSC flight payloads.

---

## 16. Developer Workflow

Follow this sequence when picking up any task in this codebase:

1. **Identify scope** — determine whether the change is frontend-only, backend-only, or both
2. **Find the module** — locate the relevant `src/<module>/` directory in the API and/or `features/<module>/` in the UI
3. **Check the entity** — review `entities/` for the MongoDB schema to understand the data shape
4. **Check the DTO** — review `dto/` for validation rules before writing any service logic
5. **Validate the API route** — open Swagger at `http://localhost:4000/api` to verify request/response shape
6. **Check realtime** — if the change mutates data, confirm the relevant service calls `realtimeService.emitDashboardUpdate(reason)`
7. **Test both roles** — log in as `admin` and as `staff` to verify role-appropriate UI/access behaviour
8. **If orders are affected**, test all of these paths:
   - Stock deduction
   - Payment calculation (single/split)
   - Wallet/credit adjustment
   - Delivery creation (if `isDelivery=true`)
   - Low/out-of-stock notifications

### Running locally

```bash
# Terminal 1 — API
cd backend
npm install
npm run start:dev          # Runs with hot reload on port 4000
# Swagger UI: http://localhost:4000/api

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev                # Runs with hot reload on port 3000
```

### Useful test commands

```bash
cd backend
npm test                   # All unit tests (90 tests, ~2.5s)
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage report
npm run test:e2e           # End-to-end tests
npm run seed:customers     # Seed customer data from Customers.xls
```

---

## 17. Onboarding Checklist

New developers should complete these steps in order:

- [ ] Clone the repo and copy `.env.example` → `.env` in both projects
- [ ] Set `JWT_SECRET` and `NEXT_PUBLIC_API_URL` in your local `.env`
- [ ] Start the backend and verify Swagger loads at `http://localhost:4000/api`
- [ ] Start the frontend and verify login works at `http://localhost:3000/login`
- [ ] Log in as `admin` — review the main dashboard (metrics, inventory status, notifications)
- [ ] Log in as `staff` — confirm limited view (no revenue, no settings, hours widget visible)
- [ ] Review `orders.service.ts` — the most complex service; understand the order creation flow
- [ ] Review `customers.service.ts` — understand the wallet/credit system
- [ ] Review `inventory.service.ts` — understand stock tracking and soft-delete
- [ ] Review `refills.service.ts` — understand the kiosk credit-first → unpaid fallback flow
- [ ] Review `employee-hours.service.ts` — understand weekly/monthly summary aggregations
- [ ] Open `ARCHITECTURE.md §11` and read the Known Bugs list before making any changes
- [ ] Run all unit tests: `npm test` — confirm 90/90 pass

---

## 18. Future Improvements

These items are outstanding from the handoff and architectural review:

### 🔴 Must-do before scaling

| # | Item | Why |
|---|---|---|
| ~~F1~~ | ~~**Add backend auth guards**~~ | ✅ **DONE** — `JwtAuthGuard` + `ThrottlerGuard` registered globally |
| F2 | **Set `JWT_SECRET` in production env** | Tokens are signed with a dev fallback string |
| F3 | **Set `NEXT_PUBLIC_API_URL` in production UI env** | All API calls silently fail without this |
| F4 | **Add `.env.example`** to both projects | Prevents onboarding friction and accidental missing vars |

### 🟠 High value

| # | Item | Notes |
|---|---|---|
| F5 | **Shared API types package** | Prevents frontend-backend contract drift; could use `zod` schemas or OpenAPI client generation |
| F6 | **Replace kiosk `localStorage` with URL state or session** | localStorage is unreliable in private/Safari and breaks SSR |
| F7 | **Add pagination to `GET /orders` and `GET /deliveries`** | Currently fetches all records; will degrade with volume |
| F8 | **Add MongoDB transactions to `OrdersService.create()`** | Stock is deducted before order saves; failure loses stock permanently |
| ~~F9~~ | ~~**Add `PATCH /notifications/:id/resolve` endpoint**~~ | ✅ **DONE** — `PATCH /notifications/:id/resolve` + `PATCH /notifications/resolve-all` implemented |
| ~~F10~~ | ~~**Replace `ORD-${Date.now()}` order numbers**~~ | ✅ **DONE** — now uses `randomBytes(4).toString("hex").toUpperCase()` |

### 🟡 Nice to have

| # | Item | Notes |
|---|---|---|
| F11 | Cache report aggregations | Use short TTL in-memory cache or Redis cache; reports hit the DB on every page load |
| F12 | Add `@nestjs/throttler` rate limiting | Login endpoint is brute-force vulnerable |
| F13 | Add health-check endpoint (`/health`) | Required for load balancer health probes and proper deploy verification |
| F14 | Add request logging interceptor | Log method, path, status, and duration for every request |
| F15 | Frontend error toasts and improved UX | Currently many failures are silent or show raw errors |
| F16 | Add `timestamps: true` to `SettingSchema` | Settings doc has no audit trail |
| F17 | Add supplier reactivation endpoint | Currently soft-deleted suppliers cannot be reactivated |
| F18 | Improve `findByPhone` performance | Current regex scan is unindexed; add normalised `phoneDigits` field with index |

---

## 19. Action Plan — Step-by-Step Outstanding Work

Each task below is self-contained and ordered by urgency. Follow the steps exactly. Run the test suite (`npm test`) after each group of changes to confirm nothing is broken.

---

### 🔴 PRIORITY 1 — Production Environment (Do This Today)

No code changes needed. These are DigitalOcean dashboard clicks only.

---

#### Step 1.1 — Set `JWT_SECRET` in the API deployment

1. Open [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Select your **API app** (or the component named `api` / `watershop-api`)
3. Click **Settings** → **App-Level Environment Variables** (or the component's env section)
4. Click **Edit**
5. Add a new variable:
   - **Key:** `JWT_SECRET`
   - **Value:** generate a secure value by running this locally:
     ```bash
     node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
     ```
   - Paste the output as the value. Keep it secret — never commit it to git.
6. Click **Save** then **Deploy** (or trigger a new deployment)
7. **Verify:** after deploy, check the runtime logs — if you see `Valkey pub/sub realtime bridge is connected` and no `JWT` errors, it worked

---

#### Step 1.2 — Set `NEXT_PUBLIC_API_URL` in the UI deployment

1. Open [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Select your **UI app** (or the component named `web` / `watershop-web`)
3. Click **Settings** → **App-Level Environment Variables**
4. Click **Edit**
5. Add a new variable:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** the full HTTPS URL of your deployed API, e.g. `https://api.your-domain.com`
   - ⚠️ No trailing slash
6. Click **Save** then **Deploy**
7. **Verify:** log in to the deployed UI — if the dashboard loads real data, it is working

---

### 🔴 PRIORITY 2 — Backend Authentication Guards ✅ COMPLETED

All steps below have been implemented. The global `JwtAuthGuard` is active in production.

**What was done:**
- Created `src/auth/jwt.strategy.ts`, `src/auth/jwt-auth.guard.ts`, `src/auth/auth.module.ts`, `src/auth/public.decorator.ts`
- Registered `JwtAuthGuard` and `ThrottlerGuard` as global `APP_GUARD` providers in `app.module.ts`
- Added `@Public()` to `POST /users/login`, `POST /users/register`, `POST /refills`
- Rate limiting: `ThrottlerModule.forRoot([{ name: "short", ttl: 60000, limit: 10 }])`

**Verification:**
- `GET /customers` without a token → 401 Unauthorized ✓
- `POST /users/login` without a token → 200 (public route) ✓
- `POST /refills` without a token → 200 (kiosk public route) ✓

---

#### Step 2.1 — Install `@nestjs/passport` and `passport-jwt`

```bash
cd backend
npm install @nestjs/passport passport passport-jwt
npm install --save-dev @types/passport-jwt
```

---

#### Step 2.2 — Create the JWT Strategy

Create file: **`watershop_api/src/auth/jwt.strategy.ts`**

```typescript
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || "dev-fallback-secret-change-before-deploy",
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) throw new UnauthorizedException();
    return { userId: payload.sub, username: payload.username, role: payload.role };
  }
}
```

---

#### Step 2.3 — Create the Auth Module

Create file: **`watershop_api/src/auth/auth.module.ts`**

```typescript
import { Global, Module } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";
import { PassportModule } from "@nestjs/passport";

@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
```

---

#### Step 2.4 — Create a `@Public()` decorator (for login/register routes)

Create file: **`watershop_api/src/auth/public.decorator.ts`**

```typescript
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

---

#### Step 2.5 — Create the Global JWT Auth Guard

Create file: **`watershop_api/src/auth/jwt-auth.guard.ts`**

```typescript
import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

---

#### Step 2.6 — Register guard globally in `app.module.ts`

Edit **`watershop_api/src/app.module.ts`** — add `AuthModule` to imports and register `JwtAuthGuard` as a global guard:

```typescript
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
// ...existing imports...

@Module({
  imports: [
    // ...existing imports...
    AuthModule,
  ],
  providers: [
    // This makes JwtAuthGuard apply to EVERY route automatically
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  // ...existing code...
})
export class AppModule {}
```

---

#### Step 2.7 — Mark public endpoints with `@Public()`

Edit **`watershop_api/src/users/users.controller.ts`** — mark login and register as public:

```typescript
import { Public } from "../auth/public.decorator";

// Add @Public() to these two methods only:

@Public()
@Post("register")
register(@Body() registerDto: RegisterDto) { ... }

@Public()
@Post("login")
login(@Body() loginDto: LoginDto) { ... }
```

> All other endpoints on all other controllers are now automatically protected.  
> The kiosk refill endpoint (`POST /refills`) should also be marked `@Public()` since kiosk users are not logged in.

Edit **`watershop_api/src/refills/refills.controller.ts`**:

```typescript
import { Public } from "../auth/public.decorator";

@Public()
@Post()
create(@Body() createRefillDto: CreateRefillDto) { ... }
```

---

#### Step 2.8 — Run the tests

```bash
cd backend
npm test
```

All 90 existing tests should still pass. Then manually verify using Swagger (`http://localhost:4000/api`):
- `POST /users/login` with valid credentials → should return 200
- `GET /customers` without a token → should return 401
- `GET /customers` with `Authorization: Bearer <token>` → should return 200

---

### 🟠 PRIORITY 3 — Fix `orderNumber` Collision ✅ COMPLETED

`orders.service.ts` now uses:
```typescript
import { randomBytes } from "crypto";
// ...
orderNumber: `ORD-${randomBytes(4).toString("hex").toUpperCase()}`,
```

**Step 3.1** — Replace with `crypto.randomUUID()` (built into Node.js 14.17+, no install needed):

Find this line (~line 257):
```typescript
orderNumber: `ORD-${Date.now()}`,
```

Replace with:
```typescript
orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
```

Or for a cleaner UUID-based approach, add this import at the top of `orders.service.ts`:
```typescript
import { randomBytes } from "crypto";
```

And replace the orderNumber line with:
```typescript
orderNumber: `ORD-${randomBytes(4).toString("hex").toUpperCase()}`,
```

**Step 3.2** — Run tests to confirm nothing broke:
```bash
npm test
```

---

### 🟠 PRIORITY 4 — Add Notifications Resolve Endpoint ✅ COMPLETED

Both the service methods and controller routes are implemented:
- `PATCH /notifications/:id/resolve` — marks one notification as resolved, emits `notifications.resolved`
- `PATCH /notifications/resolve-all` — marks all unresolved as resolved, emits `notifications.resolved_all`

**Step 4.1** — Add `resolve` method to `notifications.service.ts`:

Edit **`watershop_api/src/notifications/notifications.service.ts`** — add this method:

```typescript
async resolve(id: string) {
  const updated = await this.notificationModel
    .findByIdAndUpdate(id, { resolved: true }, { new: true })
    .exec();
  if (!updated) {
    throw new NotFoundException(`Notification #${id} not found`);
  }
  this.realtimeService.emitDashboardUpdate("notifications.resolved");
  return updated;
}

async resolveAll() {
  await this.notificationModel.updateMany({ resolved: false }, { resolved: true });
  this.realtimeService.emitDashboardUpdate("notifications.resolved_all");
  return { message: "All notifications resolved" };
}
```

Also add `NotFoundException` to the imports at the top:
```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
```

**Step 4.2** — Add routes to `notifications.controller.ts`:

```typescript
import { Controller, Get, Patch, Param } from "@nestjs/common";

// Add these two new routes:

@Patch(":id/resolve")
@ApiOperation({ summary: "Mark a notification as resolved" })
resolve(@Param("id") id: string) {
  return this.notificationsService.resolve(id);
}

@Patch("resolve-all")
@ApiOperation({ summary: "Mark all notifications as resolved" })
resolveAll() {
  return this.notificationsService.resolveAll();
}
```

**Step 4.3** — Run tests:
```bash
npm test
```

---

### 🟠 PRIORITY 5 — Fix the `rentalOrders` Dashboard Metric ✅ COMPLETED

`dashboard/page.tsx` now correctly filters by `o.isDelivery === true` and the KPI card is labelled **"Delivery Orders"**.

**Step 5.1** — Open `app/dashboard/page.tsx` and find:
```typescript
const rentalOrdersCount = orders.filter(
  (o: any) => o.type === "rental",
).length;
```

**Step 5.2** — Replace with a real metric. The most useful replacement is counting delivery orders:
```typescript
const rentalOrdersCount = orders.filter(
  (o: any) => o.isDelivery === true,
).length;
```

**Step 5.3** — Update the KPI card label from "Rental Orders" to "Delivery Orders" in the same file (~line 320):
```tsx
<MetricCard
  title="Delivery Orders"   // ← was "Rental Orders"
  value={metrics.rentalOrders.toString()}
  ...
/>
```

---

### 🟠 PRIORITY 6 — Add Rate Limiting on Login ✅ COMPLETED

`ThrottlerModule` is registered globally in `app.module.ts` (10 req/60s per IP). `ThrottlerGuard` is also registered as a global `APP_GUARD`. The `@nestjs/throttler` package is installed and active — every endpoint is rate-limited at 10 req/60s per IP by default.

---

### 🟡 PRIORITY 7 — Add MongoDB Transactions to Order Creation

This prevents stock loss if the order save fails after stock has already been deducted.

**Step 7.1** — Inject `Connection` into `OrdersService`:

Edit **`watershop_api/src/orders/orders.service.ts`**:

```typescript
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectConnection() private readonly connection: Connection,  // ← add this
    // ...existing services...
  ) {}
```

**Step 7.2** — Wrap the `create()` method body in a session transaction:

At the top of the `create()` method, before any logic:
```typescript
async create(createOrderDto: CreateOrderDto): Promise<Order> {
  const session = await this.connection.startSession();
  let savedOrder: Order;

  try {
    await session.withTransaction(async () => {
      // ← move ALL existing create() logic inside here
      // Pass `{ session }` as the last argument to any .save() calls:
      //   await newOrder.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return savedOrder!;
}
```

> ⚠️ MongoDB transactions require a replica set. If running locally with a standalone MongoDB instance, start it as a replica set or use MongoDB Atlas (which already uses replica sets).

**Step 7.3** — Run tests:
```bash
npm test
```

---

### 🟡 PRIORITY 8 — Add Pagination to `GET /orders`

**Step 8.1** — Update `orders.service.ts` `findAll()`:

```typescript
async findAll(year?: number, page = 1, limit = 50) {
  const safeLimit = Math.min(200, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;

  const filter = year
    ? {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      }
    : {};

  const [total, data] = await Promise.all([
    this.orderModel.countDocuments(filter),
    this.orderModel
      .find(filter)
      .populate("customer", "firstName lastName wallet")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .exec(),
  ]);

  return {
    data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasPrev: safePage > 1,
      hasNext: safePage < Math.ceil(total / safeLimit),
    },
  };
}
```

**Step 8.2** — Update `orders.controller.ts` `findAll()`:

```typescript
@Get()
findAll(
  @Query("year") year?: string,
  @Query("page") page?: string,
  @Query("limit") limit?: string,
) {
  return this.ordersService.findAll(
    year ? parseInt(year) : undefined,
    page ? parseInt(page) : 1,
    limit ? parseInt(limit) : 50,
  );
}
```

**Step 8.3** — Run tests and update the frontend dashboard to handle the new `{ data, pagination }` response shape in `app/dashboard/page.tsx`:

Find:
```typescript
const orders = ordersRes.data;
```

Replace with:
```typescript
const orders = ordersRes.data?.data ?? ordersRes.data;
```

This makes it backwards-compatible if pagination is not yet applied everywhere.

---

### 🟡 PRIORITY 9 — Add `.env.example` to Git

The `.env.example` files have been created at:
- `watershop_api/.env.example`
- `watershop_web_ui/.env.example`

**Step 9.1** — Verify `.env` (with real values) is in `.gitignore` for both projects:

```bash
# Check API
grep -n ".env" backend/.gitignore

# Check UI
grep -n ".env" frontend/.gitignore
```

If `.env` is not listed, add it:
```bash
echo ".env" >> backend/.gitignore
echo ".env" >> frontend/.gitignore
```

**Step 9.2** — Commit the `.env.example` files:
```bash
git add backend/.env.example frontend/.env.example
git commit -m "chore: add .env.example files for both projects"
```

---

### 🟡 PRIORITY 10 — Add Health-Check Endpoint

Needed for DigitalOcean App Platform health probes and proper deploy verification in CI/CD.

**Step 10.1** — Install terminus:
```bash
cd backend
npm install @nestjs/terminus
```

**Step 10.2** — Add to `app.module.ts`:

```typescript
import { TerminusModule } from "@nestjs/terminus";
import { MongooseHealthIndicator } from "@nestjs/terminus";
import { HealthController } from "./health.controller";

// In imports:
TerminusModule,

// In controllers:
HealthController,
```

**Step 10.3** — Create **`watershop_api/src/health.controller.ts`**:

```typescript
import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from "@nestjs/terminus";
import { Public } from "./auth/public.decorator";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck("mongodb"),
    ]);
  }
}
```

**Step 10.4** — Update `.github/workflows/deploy.yml` to use the real health check:

Find the commented-out curl line and replace it:
```yaml
- name: Verify API health
  run: |
    echo "Waiting for API to come online..."
    sleep 30
    curl --fail https://YOUR_API_DOMAIN/health || exit 1
```

**Step 10.5** — Run tests:
```bash
npm test
```

---

### Completion Checklist

Once all priorities are done, verify this end-to-end:

- [x] `GET /customers` without a token returns `401 Unauthorized` ✅ (JwtAuthGuard global)
- [x] `POST /users/login` without a token returns `200` (public route works) ✅ (`@Public()`)
- [x] `POST /refills` without a token returns `200` (kiosk public route works) ✅ (`@Public()`)
- [x] `orderNumber` collisions eliminated ✅ (`randomBytes(4).toString("hex")`)
- [x] Notifications can be resolved via `PATCH /notifications/:id/resolve` ✅
- [x] `rentalOrders` metric replaced with `deliveryOrders` ✅
- [x] Rate limiting active globally (10 req/60s per IP) ✅ (`ThrottlerModule`)
- [ ] Dashboard loads data correctly in production (env vars confirmed set)
- [ ] Login page redirects to dashboard on valid credentials
- [ ] Expired token cookie causes automatic redirect to `/login` (not a white screen)
- [ ] `GET /health` returns `{ status: "ok" }` in production
- [ ] MongoDB transactions wrap order creation + stock deduction
- [ ] Orders list supports server-side pagination
- [ ] `.env.example` files committed for both `backend/` and `frontend/`

