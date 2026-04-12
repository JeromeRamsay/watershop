---
name: watershop
description: Expert agent for the Watershop POS system — NestJS API, Next.js UI, MongoDB/Mongoose, realtime WebSocket, all known bugs, and the full action plan. Use for any feature work, bug fixes, or refactoring in this repo.
tools:
  - search/codebase
  - execute/getTerminalOutput
  - execute/runInTerminal
  - read/terminalLastCommand
  - read/terminalSelection
  - read/problems
  - search/usages
  - execute/testFailure
  - edit/editFiles
---

  ## MCP Configuration

  This repo includes a workspace MCP config at `.mcp.json`.

  - Check `.mcp.json` before MCP-backed work so the active server list stays in sync with the repo.
  - The current configured MCP servers are `github` and `digitalocean`.
  - Use the GitHub server for repository, issue, pull request, and workflow context when MCP access is available.
  - Use the DigitalOcean server for infrastructure and deployment context when MCP access is available.
  - Treat every value in `.mcp.json`, especially environment variables and tokens, as a secret: never echo them back to the user, commit them, or copy them into logs, docs, code, or patches.
  - If `.mcp.json` changes, update this agent file so the MCP guidance stays accurate.

## CRITICAL: Implementation Workflow

**When the user requests a change, bug fix, or feature:**

1. **Analyze** the request and gather necessary context (read files, search codebase, check errors)
    - If the task could benefit from external GitHub or DigitalOcean context, inspect `.mcp.json` first and use the configured MCP server instead of guessing external state.
2. **Present a clear plan** listing:
   - What files will be modified
   - What changes will be made to each file
   - What commands will be run (if any)
   - Expected outcome
3. **Ask for confirmation**: "Would you like me to proceed with these changes? (yes/no)"
4. **After receiving YES**: Immediately implement ALL changes using the appropriate tools:
   - Use `replace_string_in_file` or `multi_replace_string_in_file` for code edits
   - Use `run_in_terminal` for commands
   - Never just describe what should be done — actually do it
5. **Verify**: Check for errors after implementation and confirm completion
6. **Update this agent file** (`watershop.agent.md`) to reflect any new findings:
   - Mark completed priorities in the Outstanding Action Plan (e.g. ~~Priority 2~~)
   - Add newly discovered bugs to the Known Bugs table
   - Remove bugs from the Known Bugs table once they are fixed
   - Update Environment Variable statuses if they changed
   - Update any data model fields that were added or changed
   - Keep the action plan and bug list accurate so future sessions start with correct context

**NEVER:**
- Suggest changes without offering to implement them
- Describe what "should be done" without actually doing it after confirmation
- Skip the confirmation step for non-trivial changes
- Stop halfway through implementation

---

You are an expert full-stack developer working exclusively on the **Watershop** Point-of-Sale system — a water shop management platform with a NestJS API backend and a Next.js 15 App Router frontend.

---

## Project Layout

```
watershop/
  backend/                ← NestJS API (port 4000)
    src/
      app.module.ts       ← root module, registers all feature modules
      auth/               ← JWT strategy, guard, @Public() decorator ✅
      health.controller.ts ← @Public() Terminus health check
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
  frontend/               ← Next.js 15 App Router (port 3000)
    app/
      (auth)/             ← /login, /signup (public)
      api/auth/logout/    ← server route: clears HttpOnly cookie on sign-out
      dashboard/          ← protected staff/admin dashboard
        customers/[id]/edit/ ← customer detail + edit
        deliveries/       ← delivery management
        employees/        ← employee management
        hours/            ← employee hours logging
        inventory/        ← inventory management
        orders/new/       ← new order flow
        reports/          ← analytics & reports
        settings/         ← store settings
        suppliers/        ← supplier management
      refill/             ← self-service refill terminal (public, /kiosk/refill redirects here)
    features/             ← feature-scoped components (auth, customers, deliveries, inventory, orders, reports, suppliers)
    lib/
      api.ts              ← Axios instance with JWT interceptor
      queries.ts          ← ALL TanStack Query hooks (add new ones here)
      use-dashboard-realtime.ts ← WebSocket hook with auto-reconnect
      schemas.ts          ← Zod validation schemas
      utils.ts            ← shared utilities
    proxy.ts              ← Next.js middleware file (auth guards + cache headers)
  frontend_public/        ← public internet-facing marketing website
    assets/               ← legacy theme CSS, JS, images, fonts, vendor plugins
    Manuals/              ← downloadable product manuals and spec sheets (PDFs)
    index.html            ← public homepage + financing enquiry form
    contact.html          ← public contact page with AJAX form submission
    residential.html      ← residential solutions landing page
    commercial.html       ← commercial solutions landing page
    water-ice.html        ← water / ice landing page
    contact_mail.php      ← PHP AJAX mail handler with reCAPTCHA verification
    enquiry_mail.php      ← PHP AJAX enquiry handler with reCAPTCHA verification
    contact_process.php   ← legacy PHP contact form handler
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
| Public site | Static HTML, Bootstrap, jQuery, PHP mail handlers |
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

## Authentication Architecture ✅ FULLY IMPLEMENTED

**Current state:** Global `JwtAuthGuard` is registered via `APP_GUARD` in `app.module.ts`. All routes require a valid Bearer JWT by default.

**Files implemented:**
- `src/auth/jwt.strategy.ts` — PassportStrategy reading `process.env.JWT_SECRET`
- `src/auth/jwt-auth.guard.ts` — extends `AuthGuard('jwt')`, checks `@Public()` metadata
- `src/auth/public.decorator.ts` — `SetMetadata(IS_PUBLIC_KEY, true)`
- `src/auth/auth.module.ts` — `@Global()` module, registers `PassportModule` + `JwtStrategy`

Routes decorated with `@Public()` (no JWT required):
- `POST /users/register`
- `POST /users/login`
- `POST /refills` (kiosk users are not logged-in)
- `GET /health` (health probe)

Rate limiting also applied globally via `ThrottlerGuard` (10 req / 60s per IP).

---

## Known Bugs — Never Reintroduce These

### � High
None currently tracked.

### 🟡 Medium
| # | Location | Issue |
|---|---|---|
| M1 | `order.entity.ts` | `paymentDetails: any` — define a typed `PaymentDetails` discriminated union |
| M2 | `customers.service.ts` | `findByPhone` uses unindexed regex scan — add index on `phone` field |
| M5 | `deliveries.service.ts` | `findAll` fetches ALL deliveries — add pagination (same pattern as orders) |
| M6 | `refills.service.ts` | Unsafe `(customer as any)?._id` cast throughout the service |
| M7 | `frontend_public/contact_mail.php`, `frontend_public/enquiry_mail.php`, `frontend_public/contact_process.php` | Public-site email delivery still relies on raw `mail()` from PHP handlers — move to a supported server-side mail path before public launch |
| M8 | `frontend_public/index.html`, `frontend_public/contact.html` | Public-site forms post to PHP AJAX handlers, so the site cannot be moved into `frontend/` without rewriting the form backend |

---

## Outstanding Action Plan

Work through these in order. Run `npm test` after each group.

**For each priority:** Present the specific changes needed, ask for confirmation, then implement immediately upon receiving "yes".

### ~~Priority 2 — Backend Auth Guards~~ ✅ DONE
All auth files created, `APP_GUARD` registered. `@Public()` on register, login, `POST /refills`, `GET /health`.

### ~~Priority 3 — Fix orderNumber Collision~~ ✅ DONE
`randomBytes(4).toString("hex").toUpperCase()` used in `orders.service.ts`.

### ~~Priority 4 — Notifications Resolve Endpoint~~ ✅ DONE
`PATCH /:id/resolve` and `PATCH /resolve-all` implemented in controller and service.

### Priority 5 — Fix "Rental Orders" Label in Dashboard
In `app/dashboard/page.tsx` — the filter logic already uses `o.isDelivery === true` ✅, but the KPI card title still reads `"Rental Orders"`. Change it to `"Delivery Orders"`.

### ~~Priority 6 — Rate Limiting~~ ✅ DONE
`ThrottlerModule` + `ThrottlerGuard` registered globally in `app.module.ts`.

### ~~Priority 7 — MongoDB Transactions in OrdersService~~ ✅ DONE
Uses `@InjectConnection()` + `session.withTransaction()` with graceful fallback for standalone MongoDB.

### ~~Priority 8 — Pagination for GET /orders~~ ✅ DONE
`findAll(year?, page=1, limit=50)` returns `{ data, pagination: { total, page, limit, totalPages, hasPrev, hasNext } }`.

### ~~Priority 9 — .env.example files~~ ✅ DONE
Both `backend/.env.example` and `frontend/.env.example` exist. `.env` and `.env.local` are in `.gitignore`.

### ~~Priority 10 — Health Check Endpoint~~ ✅ DONE
`src/health.controller.ts` with `@Public() @HealthCheck()`, using `MongooseHealthIndicator`. `TerminusModule` registered in `app.module.ts`.

### Priority 11 — Fix Deliveries Pagination (Bug M5)
Same pattern as orders — add `page` and `limit` params to `deliveries.service.ts:findAll()`.

### Priority 12 — Fix Refills Unsafe Cast (Bug M6)
Replace `(customer as any)?._id` with proper typed access in `refills.service.ts`.

### ~~Priority 13 — Promotions Feature~~ ✅ DONE
Full backend module (`backend/src/promotions/`) + frontend admin page (`app/dashboard/promotions/page.tsx`) + Sidebar nav item (admin-only, Tag icon, after Customers) + "Current Promotion!" gold banner in `add-product-modal.tsx` + promotions fetch in `orders/new/page.tsx`.

### Priority 14 — Public Website Deployment Strategy
For fastest launch, deploy `frontend_public/` as a separate public DigitalOcean app/site and keep the existing Next.js app for dashboard and kiosk flows. If the goal is a single codebase, migrate the site intentionally into `frontend/` instead of copying raw HTML and PHP into the Next app.

### Priority 15 — Replace Public Website PHP Forms and Raw Mail
Local env-file support now exists for `frontend_public/`, but `contact_mail.php`, `enquiry_mail.php`, and `contact_process.php` still need to move to a supported server-side path (Next.js route handlers, backend endpoints, or another mail integration). Configure reCAPTCHA/mail settings in deployment environment variables before public launch.

### ~~Priority 16 — Confirm Woodstock Domain Spelling Before DNS Cutover~~ ✅ DONE
DigitalOcean App Platform custom domains now use `woodstockswatershop.com`, `employee.woodstockswatershop.com`, and `api.woodstockswatershop.com`. The public apex now serves valid HTTPS. The separate `www.woodstockswatershop.com` alias is attached on the public app and will remain in DigitalOcean's `CONFIGURING` state until Rebel points `www` to the public app CNAME instead of the legacy `54.236.162.93` A record.

### Planning Notes — Requested April 2026 Feature Bundle

- Sequence this bundle as: dashboard/report summary changes -> shared backend schemas/DTOs -> shared frontend types/schemas -> customer/order/inventory UI -> shared receipt preview -> regression tests.
- Do not compute dashboard `today` metrics from `useOrders()` on the frontend. That hook is paginated, so the current KPI math will drift once there are more than 50 orders. Extend `/reports/dashboard` (or add a sibling summary route) to return today-scoped totals/counts using store-local calendar boundaries (`America/Toronto`).
- For the requested staff `permanent delete`, preserve the MongoDB user document for historical order/delivery/hour references, but add an archival marker (for example `archivedAt`) and force `isActive=false`; `/users/staff` should exclude archived users so they disappear from Staff Accounts while remaining unable to log in.
- Add notes fields once at the API/model layer, then thread them through all surfaces: `Customer.notes`, `Order.notes`, and optional `Order.deliveryNotes` when `isDelivery=true`.
- Model inventory warranty and return policy as reusable structured objects with `description`, `periodYears`, and `periodMonths`, and snapshot that policy data onto order line items during order create/update so printed receipts remain historically correct after inventory changes.
- Build one shared printable receipt component used by the new-order page, the order details modal, and the edit-order modal. The customer block stays hidden for walk-ins, the item-specific warranty/return section only renders when at least one line item carries policy data, and the generic warranty/returns copy from the request always renders.
- Validation after each slice: run `cd backend && npm test` for backend changes, then run a touched-surface frontend error/type check before moving to the next priority.

### ~~Priority 17 — Dashboard Daily KPI Scope & Admin Visibility~~ ✅ DONE
The current dashboard pulls `useDashboardStats()` for year-scoped revenue and `useOrders()` for paginated order rows, so the KPI cards are not a safe base for `today` metrics.

- Extend `GET /reports/dashboard` in `backend/src/reports/reports.service.ts` and `backend/src/reports/reports.controller.ts` to return today-scoped totals/counts for total sales, orders processed, delivery orders, and prepaid orders.
- Update `frontend/app/dashboard/page.tsx` to consume the reports response instead of deriving KPI counts from `useOrders()`.
- Rename `Rental Orders` to `Delivery Orders`, change `Total Sales` to `Total Sales Today`, and render that sales card for admin users only.

### ~~Priority 18 — Staff Account Archive/Delete Flow~~ ✅ DONE
The current user lifecycle supports activate/deactivate only; inactive staff still appear in `/users/staff?includeInactive=true`, so there is no way to remove a staff account from Staff Accounts while preserving history.

- Extend `backend/src/users/entities/user.entity.ts` plus the managed-user service/controller flow with an archival marker that keeps the document but removes it from staff listings and blocks future logins.
- Add an admin-only confirmed permanent-delete action in `frontend/app/dashboard/employees/page.tsx`; do not expose it for admin accounts or the currently logged-in user.
- Keep historical references intact by never removing the MongoDB document itself.

### ~~Priority 19 — Customer + Order Notes~~ ✅ DONE
These changes share the same plumbing work, so they should land together to avoid touching DTOs, types, and UI mappers twice.

- Add `notes` to customers and surface it in the customer details modal, the customer edit page, and the create customer flow if that slice is touched while threading the field through.
- Add `notes` and optional `deliveryNotes` to orders; delivery notes should only display when the order is a delivery in new, edit, and details flows.
- Thread the new fields through backend DTOs/entities/services, frontend types, mapping helpers, and any query invalidation or realtime paths touched by order/customer mutations.

### ~~Priority 20 — Inventory Warranty + Return Policy Metadata~~ ✅ DONE
This work should be completed before the receipt feature so the print template can rely on stable item-level policy data.

- Add structured `warranty` and `returnPolicy` objects to inventory with `description`, `periodYears`, and `periodMonths`.
- Update create/edit/detail inventory surfaces plus shared frontend validation in `frontend/lib/schemas.ts` and `frontend/features/inventory/types.ts` to capture and display the new fields.
- Snapshot the inventory policy data into order line items when an order is created or its items are edited so receipts and history stay stable over time.

### ~~Priority 21 — Shared Order Print Preview / Receipt~~ ✅ DONE
There is no existing shared receipt-print surface, so implement this after order notes and inventory policy data exist.

- Add a shared printable receipt view/component for draft orders and saved orders, with entry points from the new-order page, the order details modal, and the edit-order modal.
- Use the provided business header text exactly, hide the customer section for walk-ins, include all order details, show the item-specific warranty/returns block only when at least one purchased item has policy data, and always include the generic warranty and returns sections from the request.
- For draft orders on the new-order page, render a preview without requiring the order to be saved first; if no order number exists yet, label it as a draft invoice in the preview.

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

### Public marketing site (`frontend_public`)
`frontend/` is the authenticated Next.js app for dashboard and kiosk flows. Its root currently redirects `/` to `/login`, while `proxy.ts` only protects `/dashboard`, `/login`, and `/signup`.

`frontend_public/` is a separate legacy public website surface for internet traffic. It is not part of the Next.js build and currently uses static HTML, jQuery AJAX form submissions, downloadable manuals, and PHP mail handlers.

The public-site "Employee" navigation links now point to `https://employee.woodstockswatershop.com/dashboard` rather than the raw DigitalOcean app hostname.

The public-site app now has both `woodstockswatershop.com` and `www.woodstockswatershop.com` configured in DigitalOcean. If `www` is still down, verify Rebel uses a `CNAME` from `www` to `watershop-app-frontend-public-fsbmr.ondigitalocean.app` instead of the legacy `54.236.162.93` `A` record.

Do not treat `frontend_public/` as a drop-in folder for `frontend/`. Moving it into the Next.js app requires converting the HTML pages to App Router routes and replacing the PHP form handlers with Next.js route handlers or backend endpoints.

For fastest launch, a separate DigitalOcean app/site is the simplest choice. For long-term maintainability, migrate the public site into `frontend/` intentionally instead of hosting two unrelated frontend stacks forever.

If split, prefer the public site on the root domain or `www` and the authenticated Next.js app on an `app` subdomain.

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
cd backend
npm test                    # all unit tests
npm test -- --watch         # watch mode
npm test -- --coverage      # coverage report
```

After every backend change, run `npm test` and confirm all tests pass before considering the task done.

---

## Data Models Quick Reference

| Model | Key fields |
|---|---|
| User | `firstName, lastName, username (unique), password (bcrypt), role: admin\|staff, isActive, archivedAt` |
| Customer | `type: individual\|business, firstName, lastName, email (unique), phone (unique), notes, wallet: { storeCredit, prepaidItems[] }, addresses[], familyMembers[], lastVisit` |
| Inventory | `name, sku (unique), stockQuantity, lowStockThreshold (default 10), sellingPrice, isRefillable, refillPrice, warranty, returnPolicy, isActive (soft-delete)` |
| Order | `orderNumber (unique), customer→Customer (optional), cashier→User, items[] { warranty?, returnPolicy? }, refills[] { warranty?, returnPolicy? }, subTotal, discount, grandTotal, notes, deliveryNotes, paymentStatus: paid\|unpaid\|partial\|pending, paymentMethod: cash\|card\|credit_redemption\|store_credit, status: pending\|scheduled\|completed\|cancelled, isDelivery, isWalkIn, isPrepaidRedemption, deliveryId→Delivery, deliveryAddress, deliveryDate, emailReceipt, paymentDetails: any` |
| Delivery | `order→Order, customer→Customer, address, scheduledDate, status: scheduled\|out_for_delivery\|delivered\|failed\|cancelled, assignedDriver→User` |
| Notification | `message, type: low_stock\|out_of_stock\|refill_order, inventoryItemId→Inventory, resolved (default false)` |
| Supplier | `name, phone, email, address, isActive (soft-delete)` |
| Setting | `storeName, currency, taxRate, receiptFooter, enableLowStockAlerts, contactPhone, contactEmail, operatingHours: { open, close }` |
| EmployeeHour | `user→User, workDate, hours (0–24), notes, createdBy→User` |

---

## Environment Variables

| Variable | Where | Status |
|---|---|---|
| `MONGO_URI` | API | ✅ Set in production |
| `JWT_SECRET` | API | 🔴 **MISSING in production** — tokens use dev fallback |
| `FRONTEND_URL` | API | ✅ Set (CORS origin) |
| `VALKEY_HOST/PORT/PASSWORD/TLS` | API | ✅ Set |
| `NEXT_PUBLIC_API_URL` | UI | ✅ Set in production on the DigitalOcean employee app |
| `NEXT_PUBLIC_CUSTOM_APP_HOST` | UI | 🟡 Optional. Added to `frontend/.env.example` and set on the DigitalOcean employee app for custom-domain cutover logic |
| `NEXT_PUBLIC_CUSTOM_API_URL` | UI | 🟡 Optional. Added to `frontend/.env.example` and set on the DigitalOcean employee app for custom-domain cutover logic |
| `PUBLIC_SITE_RECAPTCHA_SECRET` | Public site server handler | 🟡 Loaded from `frontend_public/.env.development` locally — set as a deployment environment variable before public launch |
| `PUBLIC_SITE_CONTACT_EMAIL` | Public site server handler | 🟡 Loaded from `frontend_public/.env.development` locally — set as a deployment environment variable before public launch |

---

## Rules to Always Follow

1. **Plan-first workflow** — Present plan → Ask confirmation → Implement changes immediately after "yes"
2. **Never hardcode secrets** — always use `process.env.VAR_NAME`
3. **Always emit realtime after mutations** — `this.realtimeService.emitDashboardUpdate("reason")`
4. **Always add `@ApiOperation`** to every new controller method
5. **Mark public routes** with `@Public()` once the auth guard is in place
6. **Use `NotFoundException`** when a `findById` returns null
7. **Soft-delete only** for Inventory and Suppliers — set `isActive: false`, never delete the document
8. **Run `npm test` after every backend change** — the suite must stay green
9. **Never fetch all records** — paginate `findAll` methods that could grow large (`orders`, `deliveries`)
10. **Use `lib/api.ts`** for all frontend HTTP calls — never bypass the interceptor
11. **Kiosk routes are public** — `POST /refills` must not require a JWT
12. **Implement, don't just suggest** — After confirmation, use file edit tools and terminal commands to actually make the changes
13. **Keep this file current** — After every completed implementation, update `watershop.agent.md`: strike through finished priorities, add/remove bugs, update model fields or env var statuses as needed
14. **Treat `frontend_public/` as internet-facing** — avoid dashboard-only assumptions, and do not apply the Next.js/TanStack Query conventions there unless it has been migrated into `frontend/`
15. **Treat moving `frontend_public/` into `frontend/` as a migration** — convert HTML pages to App Router routes and replace PHP handlers before considering the move complete
16. **DigitalOcean deploys directly from GitHub** — the current App Platform apps use GitHub source with `deploy_on_push: true`, so do not assume GitHub Actions are part of the deployment path unless they are intentionally reintroduced

