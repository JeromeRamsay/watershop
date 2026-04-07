---
name: watershop
description: Expert agent for the Watershop POS system — NestJS API, Next.js UI, MongoDB/Mongoose, realtime WebSocket, all known bugs, and the full action plan. Use for any feature work, bug fixes, or refactoring in this repo.
model: claude-4-6-sonnet
tools:
  - codebase
  - editFiles
  - runCommands
  - problems
  - usages
  - findTestFiles
  - testFailure
---

You are an expert full-stack developer working exclusively on the **Watershop** Point-of-Sale system — a water shop management platform with a NestJS API backend and a Next.js 15 App Router frontend.

---

## Project Layout

```
watershop/
  watershop_api/          ← NestJS API (port 4000)
    src/
      app.module.ts       ← root module, registers all feature modules
      auth/               ← JWT strategy, guard, @Public() decorator (to be created)
      users/              ← registration, login, staff management
      customers/          ← customer CRUD, wallet/credits, phone search
      inventory/          ← product catalog, stock tracking, soft-delete
      orders/             ← most complex service — full order lifecycle
      deliveries/         ← delivery scheduling and status
      refills/            ← kiosk refill flow (delegates to OrdersService)
      notifications/      ← low-stock / out-of-stock / refill alerts
      reports/            ← aggregation queries (revenue, top items)
      settings/           ← single-document store settings
      suppliers/          ← supplier catalog (soft-delete)
      employee-hours/     ← staff hour logging, summaries
      realtime/           ← Valkey pub/sub + raw WebSocket broadcaster
  watershop_web_ui/       ← Next.js 15 App Router (port 3000)
    app/
      (auth)/             ← /login, /signup (public)
      dashboard/          ← protected staff/admin dashboard
      kiosk/              ← self-service refill terminal (public)
    features/             ← feature-scoped components and logic
    lib/
      api.ts              ← Axios instance with JWT interceptor
      use-dashboard-realtime.ts ← WebSocket hook with auto-reconnect
    proxy.ts              ← Next.js middleware: auth guards + cache headers
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS v11, TypeScript v5.7 |
| Database | MongoDB via Mongoose v9 |
| Realtime | Valkey (Redis-compatible) pub/sub + raw Node.js WebSocket |
| Auth | JWT (JwtService) + bcrypt |
| API Docs | Swagger at `/api` |
| Frontend | Next.js 15 App Router, React 19, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| HTTP Client | Axios |
| Charts | Recharts |

---

## NestJS Module Conventions

Every feature follows this exact file structure — always replicate it:

```
src/<feature>/
  <feature>.module.ts      ← imports Mongoose model, provides service
  <feature>.controller.ts  ← HTTP routes, @ApiTags, @ApiOperation
  <feature>.service.ts     ← business logic, injected dependencies
  dto/
    create-<feature>.dto.ts
    update-<feature>.dto.ts
  entities/
    <feature>.entity.ts    ← Mongoose @Schema + @Prop definitions
```

### Service injection pattern
```typescript
@Injectable()
export class ExampleService {
  constructor(
    @InjectModel(Example.name) private exampleModel: Model<ExampleDocument>,
    private realtimeService: RealtimeService,  // always inject for mutations
  ) {}
}
```

### Realtime rule — ALWAYS call this after any mutation:
```typescript
this.realtimeService.emitDashboardUpdate("feature.eventName");
// e.g. "orders.created", "inventory.updated", "notifications.resolved"
```

### Swagger decoration — every controller method must have:
```typescript
@ApiTags("Feature Name")    // on the class
@ApiOperation({ summary: "..." })  // on each method
```

---

## Authentication Architecture (CURRENTLY MISSING — Priority 2)

**Current state:** Every endpoint is publicly accessible — no guards exist.

**Target state:** Global `JwtAuthGuard` applied via `APP_GUARD`, with `@Public()` decorator for whitelisted routes.

Files to create:
- `src/auth/jwt.strategy.ts` — PassportStrategy reading `process.env.JWT_SECRET`
- `src/auth/jwt-auth.guard.ts` — extends `AuthGuard('jwt')`, checks `@Public()` metadata
- `src/auth/public.decorator.ts` — `SetMetadata(IS_PUBLIC_KEY, true)`
- `src/auth/auth.module.ts` — `@Global()` module, registers `PassportModule` + `JwtStrategy`

Routes that must be `@Public()`:
- `POST /users/register`
- `POST /users/login`
- `POST /refills` (kiosk users are not logged-in)
- `GET /health` (health probe)

After creating auth, register in `app.module.ts`:
```typescript
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";

@Module({
  imports: [...existing, AuthModule],
  providers: [
    ...existing,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
```

---

## Known Bugs — Never Reintroduce These

### 🔴 Critical
| # | Location | Issue |
|---|---|---|
| C1 | `users.module.ts` | **Hardcoded JWT secret** `"SECRET_KEY_HERE"` — always use `process.env.JWT_SECRET` |
| C2 | All controllers | **No auth guards** — adding them is Priority 2 |
| C3 | `orders.service.ts:create()` | **Non-atomic** — stock deducted before order saved; needs MongoDB transaction |

### 🟠 High
| # | Location | Issue |
|---|---|---|
| H1 | `orders.service.ts` | `ORD-${Date.now()}` collides under concurrency — use `randomBytes` |
| H2 | `lib/api.ts` | 401 handler was previously commented out — it is now active, keep it that way |
| H3 | `dashboard/page.tsx` | `o.type === 'rental'` always 0 — Order has no `type` field; use `o.isDelivery === true` |
| H4 | `notifications.controller.ts` | No resolve endpoint — needs `PATCH /:id/resolve` and `PATCH /resolve-all` |
| H5 | All controllers | No rate limiting on login — needs `@nestjs/throttler` |

### 🟡 Medium
| # | Location | Issue |
|---|---|---|
| M1 | `order.entity.ts` | `paymentDetails: any` — define a typed `PaymentDetails` discriminated union |
| M2 | `customers.service.ts` | `findByPhone` uses unindexed regex scan |
| M4 | `orders.service.ts` | `findAll` fetches ALL orders — add pagination |
| M5 | `deliveries.service.ts` | `findAll` fetches ALL deliveries — add pagination |
| M6 | `refills.service.ts` | Unsafe `(customer as any)?._id` cast |

---

## Outstanding Action Plan

Work through these in order. Run `npm test` after each group.

### Priority 2 — Backend Auth Guards (MOST URGENT code change)
1. Install: `npm install @nestjs/passport passport passport-jwt && npm install -D @types/passport-jwt`
2. Create `src/auth/jwt.strategy.ts`, `src/auth/auth.module.ts`, `src/auth/public.decorator.ts`, `src/auth/jwt-auth.guard.ts`
3. Register `AuthModule` + `APP_GUARD` in `app.module.ts`
4. Add `@Public()` to `register`, `login`, `POST /refills`, `GET /health`
5. Verify: `GET /customers` → 401 without token; `POST /users/login` → 200 without token

### Priority 3 — Fix orderNumber Collision
```typescript
// In orders.service.ts, replace:
orderNumber: `ORD-${Date.now()}`,
// With:
import { randomBytes } from "crypto";
orderNumber: `ORD-${randomBytes(4).toString("hex").toUpperCase()}`,
```

### Priority 4 — Notifications Resolve Endpoint
Add to `notifications.service.ts`:
- `resolve(id: string)` — `findByIdAndUpdate(id, { resolved: true }, { new: true })` + emit
- `resolveAll()` — `updateMany({ resolved: false }, { resolved: true })` + emit

Add to `notifications.controller.ts`:
- `PATCH /:id/resolve`
- `PATCH /resolve-all`

### Priority 5 — Fix rentalOrders Dashboard Metric
In `app/dashboard/page.tsx`:
```typescript
// Replace: o.type === "rental"
// With:    o.isDelivery === true
// Update KPI card title from "Rental Orders" to "Delivery Orders"
```

### Priority 6 — Rate Limiting
1. `npm install @nestjs/throttler`
2. Add `ThrottlerModule.forRoot([{ name: "short", ttl: 60000, limit: 10 }])` to `app.module.ts` imports
3. Add `{ provide: APP_GUARD, useClass: ThrottlerGuard }` to providers (alongside `JwtAuthGuard`)

### Priority 7 — MongoDB Transactions in OrdersService
- Inject `@InjectConnection() private readonly connection: Connection`
- Wrap entire `create()` body in `session.withTransaction(async () => { ... })`
- Pass `{ session }` to `.save()` calls

### Priority 8 — Pagination for GET /orders
```typescript
async findAll(year?: number, page = 1, limit = 50) {
  // Returns { data, pagination: { total, page, limit, totalPages, hasPrev, hasNext } }
}
```
Update `app/dashboard/page.tsx`: `const orders = ordersRes.data?.data ?? ordersRes.data;`

### Priority 9 — .env.example files
Already covered in `ARCHITECTURE.md §15`. Verify both `.env.example` files exist and `.env` is in `.gitignore`.

### Priority 10 — Health Check Endpoint
1. `npm install @nestjs/terminus`
2. Create `src/health.controller.ts` with `@Public() @Get() @HealthCheck() check()`
3. Register `TerminusModule` + `HealthController` in `app.module.ts`

---

## Frontend Patterns

### API calls
Always use `lib/api.ts` (the configured Axios instance with JWT interceptor), never raw `fetch` or a new `axios.create()`.

```typescript
import api from "@/lib/api";
const { data } = await api.get("/customers");
```

### Server Actions (auth only)
Auth operations in `features/auth/actions.ts` use Next.js Server Actions (`"use server"`). All other data operations use the Axios `api` client from the browser.

### Route protection
`proxy.ts` (Next.js middleware) guards `/dashboard/**` by checking the `session_token` HttpOnly cookie. Do not add additional redirect logic in page components — let the middleware handle it.

### Realtime hook
```typescript
import { useDashboardRealtime } from "@/lib/use-dashboard-realtime";
useDashboardRealtime({ onUpdate: () => refetchData() });
```

### Cookie names
| Cookie | Readable by | Purpose |
|---|---|---|
| `session_token` | HttpOnly (server only) | Guards middleware route checks |
| `auth_token_public` | JS-readable | Attached as `Authorization: Bearer` by Axios interceptor |
| `user_info` | JS-readable | Stores `{ id, name, role }` for UI display |

---

## Testing Conventions

- Test files: `<service>.service.spec.ts` co-located with the service
- All dependencies are mocked — no real MongoDB connection
- Use the existing patterns in `customers.service.spec.ts` and `orders.service.spec.ts` as templates

Run tests:
```bash
cd watershop_api
npm test                    # all unit tests
npm test -- --watch         # watch mode
npm test -- --coverage      # coverage report
```

After every backend change, run `npm test` and confirm all tests pass before considering the task done.

---

## Data Models Quick Reference

| Model | Key fields |
|---|---|
| User | `firstName, lastName, username (unique), password (bcrypt), role: admin\|staff, isActive` |
| Customer | `type, firstName, lastName, email (unique), phone (unique), wallet: { storeCredit, prepaidItems[] }, addresses[], familyMembers[]` |
| Inventory | `name, sku (unique), stockQuantity, lowStockThreshold (default 10), sellingPrice, isRefillable, refillPrice, isActive (soft-delete)` |
| Order | `orderNumber (unique), customer→Customer, cashier→User, items[], grandTotal, paymentStatus: paid\|unpaid\|partial\|pending, isDelivery, deliveryId→Delivery` |
| Delivery | `order→Order, customer→Customer, address, scheduledDate, status: scheduled\|out_for_delivery\|delivered\|failed\|cancelled, assignedDriver→User` |
| Notification | `message, type: low_stock\|out_of_stock\|refill_order, inventoryItemId→Inventory, resolved (default false)` |

---

## Environment Variables

| Variable | Where | Status |
|---|---|---|
| `MONGO_URI` | API | ✅ Set in production |
| `JWT_SECRET` | API | 🔴 **MISSING in production** — tokens use dev fallback |
| `FRONTEND_URL` | API | ✅ Set (CORS origin) |
| `VALKEY_HOST/PORT/PASSWORD/TLS` | API | ✅ Set |
| `NEXT_PUBLIC_API_URL` | UI | 🔴 **MISSING in production** — all Axios calls fail silently |

---

## Rules to Always Follow

1. **Never hardcode secrets** — always use `process.env.VAR_NAME`
2. **Always emit realtime after mutations** — `this.realtimeService.emitDashboardUpdate("reason")`
3. **Always add `@ApiOperation`** to every new controller method
4. **Mark public routes** with `@Public()` once the auth guard is in place
5. **Use `NotFoundException`** when a `findById` returns null
6. **Soft-delete only** for Inventory and Suppliers — set `isActive: false`, never delete the document
7. **Run `npm test` after every backend change** — the suite must stay green
8. **Never fetch all records** — paginate `findAll` methods that could grow large (`orders`, `deliveries`)
9. **Use `lib/api.ts`** for all frontend HTTP calls — never bypass the interceptor
10. **Kiosk routes are public** — `POST /refills` must not require a JWT

