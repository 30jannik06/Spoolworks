# SpoolWorks

Web app for 3D-printing hobbyists: filament inventory and print gallery that compute together. A print knows which spools it used and how many grams; the inventory deducts the rest automatically. Built first for one household (Bambu Lab P2S with AMS), but multi-tenant from day one: every account has its own workshop, everything is private by default, sharing is opt-in.

Project hub (status, roadmap, decisions): ClaudeBrain `01_Projekte/Privat/SpoolWorks.md`.

## Monorepo

pnpm workspaces + Turborepo.

| Path | Contents | May import |
| --- | --- | --- |
| `apps/web` | Next.js 16 App Router: pages, server actions, route handlers, UI, German copy | everything |
| `packages/database` | Prisma 7 schema, migrations, generated client, `prisma` singleton | `@prisma/*` only |
| `packages/core` | Pure domain logic (weights, ledger, short codes, zod contracts) + Vitest | `zod` only |

`core` and `database` never import from Next or React: the later Discord/Telegram bots and the price worker (`apps/*`, Docker on a VPS) use them unchanged. Workspace packages export TypeScript source (`"exports": "./src/index.ts"`) and import without `.js` extensions, so Turbopack compiles them directly.

## Commands

```bash
pnpm install          # packages/database postinstall runs `prisma generate` (client is gitignored)
pnpm db:generate      # Prisma 7 does NOT generate on migrate
pnpm db:migrate       # prisma migrate dev (uses DIRECT_URL)
pnpm dev              # turbo: generates the client, then next dev
pnpm typecheck        # web runs `next typegen` first (LayoutProps etc.)
pnpm test
pnpm lint
pnpm build            # needs DATABASE_URL set, but does not connect
```

## Environment

One `.env` at the **repo root** (copy `.env.example`). Prisma 7 does not load env files itself: `packages/database/prisma7.config.ts` and `apps/web/next.config.ts` both load the root file explicitly. On Vercel the platform env is used.

- App → `DATABASE_URL`, Neon **pooled** (`-pooler` host), via `@prisma/adapter-pg`.
- Prisma CLI → `DIRECT_URL`, non-pooled. `migrate` takes a session-level advisory lock that leaks through PgBouncer (P1002).

## Deployment (Vercel + Neon)

Vercel project with Root Directory `apps/web`; `apps/web/vercel.json` pins `fra1` (Neon is eu-central-1) and runs `prisma migrate deploy` before the build. Production uses `prod_spoolworks`, Preview uses `dev_spoolworks`. Set `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET` per environment; `BETTER_AUTH_URL` only for Production (previews infer their origin). Migrations run on every deploy including previews, so schema leads code: never write a migration the deployed code cannot survive.

## Stack notes

- **Prisma 7.10, not 8.** npm `latest` for `prisma` is an 8.0 RC and Better Auth's adapter does not support 8. Always install `@7`. The CLI config file is `prisma7.config.ts` (new name since 7.10).
- **TypeScript 6.0.3, not 7.** typescript-eslint supports `<6.1`.
- **Next.js 16.4 with `cacheComponents`.** Anything that reads the request (session, `searchParams`, uncached DB reads) must render inside `<Suspense>`. Keep session reads out of layout top level.
- **Better Auth 1.7**, email + password. Map `error.code` through `lib/auth-errors.ts`; never render `error.message`.
- **shadcn/ui** (`radix-nova`), utility `cn` from the `cn` package. Add components with `pnpm dlx shadcn@latest add <name>` in `apps/web`, don't hand-edit `components/ui/`.

## Conventions

- **Tenant = `Workshop`**, not `User` and not Better Auth's `Account` (that is a login method). Every owned row hangs off `workshopId`. `requireWorkshop()` in `lib/session.ts` is the entry point for pages and actions; every server action calls it itself, UI gating is cosmetic.
- **Not found and not yours look the same** (404), never 403.
- **Integers only:** weights in whole grams (`…G`), prices in cents (`…Cents`), diameters in micrometres (`…Um`). No floats.
- **Copy:** user-facing text is German and lives in `apps/web/src/messages/de.ts`. Code, comments, identifiers and commits are English.
- **Mobile first:** every page usable on a phone; touch targets at least 44 px (`h-11` / `min-h-11`), inputs `text-base` (no iOS zoom).
- **Branches:** feature branch + PR for every change, never commit to `main`.
- **Secrets:** never in the repo; `.env.example` holds placeholders only.

## Status

Phase 0 (monorepo, Prisma 7, Better Auth, workshop on sign-up) — see the hub for phases 1–5.
