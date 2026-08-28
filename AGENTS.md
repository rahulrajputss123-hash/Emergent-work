# CoinQuest / CashGPT — Base44 Dev Environment

## Stack
- **TanStack Start** (Vite + SSR via nitro) + React 19, Tailwind v4, TanStack Router/Query.
- Package manager: **bun** (`bun.lock`, `bunfig.toml`). Dev command: `bun run dev` → `vite dev`.
- Backend: **hosted Supabase** (auth + Postgres). No local DB — the app talks to the remote project.
- The Lovable vite config (`@lovable.dev/vite-tanstack-config`) bundles the TanStack/vite plugins, SSR env injection, `@` path alias, and **sandbox detection** that forces the dev server to **port 8080** (not the Vite default 3000). The compose maps host `3000 → container 8080`.

## Running here
- `docker compose -f docker-compose.base44.yml up -d` (image `oven/bun:1.2`, source bind-mounted at `/app`, `node_modules` is an anonymous volume).
- Health: `curl -sf http://localhost:3000/` (SSR HTML, HTTP 200).
- Vite live-reloads on edit; no rebuild needed. Config/compose/env changes auto-restart Vite.

## External-host fix (required for the preview)
- `vite.config.ts` sets `vite.server.allowedHosts: true` so the Base44 preview's dynamic external hostname is accepted. Without it Vite returns 403 "Blocked request" for non-localhost hosts.

## Environment / secrets
- `.env` (committed, NOT a secret) holds the public Supabase URL + **publishable** (anon) key, both with and without the `VITE_` prefix. This is enough to boot and render the UI / browse offers & tasks.
- `SUPABASE_SERVICE_ROLE_KEY` — **secret**, NOT in the repo. Needed only by server-side admin functions (`src/integrations/supabase/client.server.ts`, lazily proxied): account deletion, offer sync, automation/cron, task engine. The app boots fine without it; those functions throw only when invoked. Provided via the platform secrets store (`/run/base44/app.env`).
- `ADBLUEMEDIA_API_KEY` — optional secret for the AdBluemedia offer-wall adapter; app runs without it.

## Migrations
- `supabase/migrations/*.sql` are applied on the **remote** Supabase project (managed in Supabase dashboard / Lovable), not run locally. No local migration step is needed to boot.

## Notes
- SSR deprecation warnings (`createServerFn().inputValidator()` → `.validator()`) are expected and harmless.
