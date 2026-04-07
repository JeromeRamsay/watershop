# Watershop — GitHub Copilot Instructions

This is the **Watershop POS system** — a water shop point-of-sale and management platform.

- **Backend:** NestJS v11 + TypeScript + MongoDB/Mongoose (`watershop_api/`)
- **Frontend:** Next.js 15 App Router + React 19 + Tailwind CSS v4 + shadcn/ui (`watershop_web_ui/`)
- **Realtime:** Valkey (Redis) pub/sub + raw Node.js WebSocket

## Key conventions

- All NestJS feature modules live in `watershop_api/src/<feature>/` with `module / controller / service / dto / entities` files
- Every service method that mutates data **must** call `this.realtimeService.emitDashboardUpdate("<reason>")` after saving
- All frontend HTTP calls go through `watershop_web_ui/lib/api.ts` (Axios instance with JWT interceptor) — never use raw fetch or a new axios instance
- Use `@Public()` decorator (from `src/auth/public.decorator.ts`) to whitelist routes that don't require authentication
- Soft-delete pattern: set `isActive: false` — never hard-delete Inventory or Supplier documents
- Always add `@ApiOperation({ summary: "..." })` to every new controller method

## Auth state

JWT authentication guards are **not yet implemented** — adding them is the top code priority. See `ARCHITECTURE.md §19 Priority 2` for the step-by-step plan.

## Detailed reference

See `ARCHITECTURE.md` for the full module map, data models, data flow diagrams, known bugs list, and the complete action plan. Use the **Watershop Dev** agent (`@watershop`) for feature work.

