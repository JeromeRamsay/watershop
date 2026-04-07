# Watershop — Frontend

Next.js 15 App Router dashboard and kiosk UI for the Watershop POS system.

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript + React 19 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix UI primitives) |
| HTTP Client | Axios (`lib/api.ts`) with JWT interceptor |
| Data Fetching | TanStack Query v5 (`lib/queries.ts`) |
| Charts | Recharts |

## Getting Started

```bash
cd frontend
cp .env.example .env.local      # fill in NEXT_PUBLIC_API_URL
npm install
npm run dev                      # http://localhost:3000
```

### Required environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Full URL of the API, e.g. `http://localhost:4000` |

## Key conventions

### Data fetching — TanStack Query
All data fetching goes through hooks in `lib/queries.ts`. **Never** call `api.get()` inside a `useEffect` directly.

```ts
// ✅ Correct — instant cached data on revisit
import { useOrders, queryKeys } from "@/lib/queries";
const { data, isLoading } = useOrders();

// After a mutation — invalidate the relevant cache key:
const qc = useQueryClient();
void qc.invalidateQueries({ queryKey: queryKeys.orders() });

// ❌ Wrong — refetches on every navigation, no caching
useEffect(() => { api.get("/orders").then(...) }, []);
```

Cache behaviour: `staleTime: 30s` (instant on revisit), `gcTime: 5min` (stays in memory).
WebSocket realtime events call `qc.invalidateQueries()` for background refresh.

### Realtime
`lib/use-dashboard-realtime.ts` connects to `ws://<API>/ws/dashboard`.
All pages pass an `invalidate` callback to this hook:
```ts
useDashboardRealtime(useCallback(() => {
  void qc.invalidateQueries({ queryKey: queryKeys.orders() });
}, [qc]));
```

## Project structure

```
frontend/
├── app/
│   ├── (auth)/login|signup   # Public pages
│   ├── dashboard/            # Protected dashboard (admin + staff)
│   │   ├── page.tsx          # Main dashboard — KPI cards, inventory, realtime
│   │   ├── customers/        # Customer management (server-side pagination)
│   │   ├── orders/           # Order list + new order form
│   │   ├── deliveries/       # Delivery schedule (list + calendar)
│   │   ├── inventory/        # Inventory management
│   │   ├── reports/          # Sales reports
│   │   ├── settings/         # Store settings
│   │   ├── suppliers/        # Supplier management
│   │   └── hours/            # Employee hour logging
│   └── kiosk/refill/         # Self-service kiosk for bottle credit redemption
├── features/                 # Feature-scoped components, types, and forms
├── components/               # Shared shadcn/ui components
├── lib/
│   ├── api.ts                # Axios instance with JWT interceptor → baseURL from NEXT_PUBLIC_API_URL
│   ├── queries.ts            # All TanStack Query hooks (useOrders, useCustomers, useInventory, …)
│   ├── react-query-provider.tsx  # QueryClientProvider wrapper (staleTime 30s, gcTime 5min)
│   └── use-dashboard-realtime.ts # WebSocket hook — auto-reconnect with exponential backoff
└── proxy.ts                  # Next.js middleware — auth guard + Cache-Control: no-store
```

## Build

```bash
npm run build   # TypeScript check + ESLint + Next.js production build
npm start       # Start production server
```

Deployed on **DigitalOcean App Platform** — pushes to `main` trigger automatic redeployment.
