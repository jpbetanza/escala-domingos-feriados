# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

**Escala Loja** is a Next.js 16 App Router app for auto-generating vendor work schedules (Sundays and holidays). All data is scoped per authenticated user in Supabase.

### Data flow

```
Supabase DB ← lib/supabase/db.ts ← lib/store.ts (Zustand) ← React components
```

- `lib/store.ts` — Zustand store (no `persist`). All actions are async and apply **optimistic updates** with rollback on error via `toast.error`. Every action checks `userId` and returns early if null.
- `lib/supabase/db.ts` — All DB read/write functions. The browser client from `lib/supabase/client.ts` is used here (not the server client).
- `components/auth-provider.tsx` — Client component wrapping the entire app. On mount, calls `supabase.auth.getUser()`, populates the store, seeds default vendors for new users, and subscribes to `onAuthStateChange`.
- `proxy.ts` — Route protection (Next.js 16 renames `middleware.ts` → `proxy.ts`; the exported function must be named `proxy`, not `middleware`).

### Scheduling algorithm (`lib/scheduler.ts`)

- Sundays and holidays are assigned **independently** using a greedy round-robin sorted by ascending workload count.
- A holiday that falls on a Sunday is counted only as a `holiday` type (not a sunday).
- Locked entries are excluded from regeneration but their counts seed the greedy algorithm so balance is maintained.
- `computeStats` scores each vendor: sunday = 1 point, holiday = 2 points.

### Supabase tables

Tables are defined in `supabase/migrations/20260227000000_escala_tables.sql`. All tables have RLS enabled; every row is owned by `user_id`. Tables: `escala_vendors`, `escala_holidays`, `escala_schedules`, `escala_entries`.

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

Google OAuth must be enabled in the Supabase Dashboard. The OAuth callback is handled at `app/auth/callback/route.ts`.

### UI stack

- shadcn/ui components with Tailwind CSS v4. Global styles in `app/globals.css` use `@import "shadcn/tailwind.css"`.
- Notifications use **sonner** (shadcn toast is deprecated in this project).
- `AppSidebar` renders a desktop sidebar + a mobile bottom nav bar (main content uses `pb-20 md:pb-0` to clear it).

## Known gotchas

- **date-fns v4**: `isSunday` cannot be passed directly as a `.filter()` callback due to `ContextOptions` type — always wrap: `.filter((d) => isSunday(d))`.
- **Next.js 16 middleware**: The file is `proxy.ts` at the root, exporting an async function named `proxy` (not `middleware`).
- **Zustand v5**: No `persist` middleware — data is always fetched fresh from Supabase on auth.
- **nanoid** generates IDs client-side before DB writes (optimistic pattern).
- `dbSetSchedule` does a full delete-then-reinsert of entries for the year (not incremental).
