# Watershop — GitHub Copilot Instructions

This is the **Watershop POS system** — a water shop point-of-sale and management platform.

- **Backend:** NestJS v11 + TypeScript + MongoDB/Mongoose (`backend/`)
- **Frontend:** Next.js 15 App Router + React 19 + Tailwind CSS v4 + shadcn/ui (`frontend/`)
- **Realtime:** Valkey (Redis) pub/sub + raw Node.js WebSocket

## Key conventions

- All NestJS feature modules live in `backend/src/<feature>/` with `module / controller / service / dto / entities` files
- Every service method that mutates data **must** call `this.realtimeService.emitDashboardUpdate("<reason>")` after saving
- All frontend HTTP calls go through `frontend/lib/api.ts` (Axios instance with JWT interceptor) — never use raw fetch or a new axios instance
- All frontend **data fetching** uses TanStack Query hooks from `frontend/lib/queries.ts` — never use `useEffect + api.get()` directly in a component; add a new hook to `queries.ts` instead
- Use `@Public()` decorator (from `src/auth/public.decorator.ts`) to whitelist routes that don't require authentication
- Soft-delete pattern: set `isActive: false` — never hard-delete Inventory or Supplier documents
- Always add `@ApiOperation({ summary: "..." })` to every new controller method
- Cache invalidation after mutations: call `qc.invalidateQueries({ queryKey: queryKeys.<resource>() })` using `useQueryClient()` from `@tanstack/react-query`

## Auth state

JWT authentication guards are **fully implemented** via a global `JwtAuthGuard` registered in `app.module.ts`.
- All routes require a valid Bearer JWT by default
- Use `@Public()` to opt individual routes out (login, register, kiosk refill are already marked)
- Rate limiting (`@nestjs/throttler`, 10 req/60s) is also applied globally

## Detailed reference

See `ARCHITECTURE.md` for the full module map, data models, data flow diagrams, known bugs list, and the complete action plan. Use the **Watershop Dev** agent (`@watershop`) for feature work.
