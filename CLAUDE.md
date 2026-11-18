# SpoolWorks

Web app for 3D-printing hobbyists: filament inventory and print gallery that compute together. A print knows which spools it used and how many grams; the inventory deducts the rest automatically. Built first for one household (Bambu Lab P2S with AMS), but multi-tenant from day one: every account has its own workshop, everything is private by default, sharing is opt-in.

Project hub (status, roadmap, decisions): ClaudeBrain `01_Projekte/Privat/SpoolWorks.md`.

## Monorepo

pnpm workspaces + Turborepo.

| Path | Contents | May import |
| --- | --- | --- |
| `apps/web` | Next.js 16 App Router: pages, server actions, route handlers, UI, German copy | everything |
| `apps/catalog-sync` | CLI that imports the Open Filament Database into the product catalog | `core`, `database` |
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
pnpm --filter @spoolworks/catalog-sync sync [--dry-run] [--file all.json.gz]   # import OFD catalog
```

## Product catalog

`FilamentProduct` is global (no personal data) and mostly comes from the [Open Filament Database](https://github.com/OpenFilamentCollective/open-filament-database) (MIT): `apps/catalog-sync` downloads the daily `all.json.gz` and syncs it. Mapping and sync planning are pure functions in `packages/core/src/ofd.ts`.

- One product per OFD size (colour × net weight × diameter). Refill and spooled versions are merged: the empty-spool weight is recorded per owned spool.
- `ofdUuid` is OFD's stable size UUID; renames are followed through `moved_from`.
- Only rows with `ofdManaged = true` (created by the import) follow upstream changes. A product a user typed in that matches an OFD product only gets its `ofdUuid` attached and is never overwritten.
- Materials: OFD's ~40 are grouped into our enum (nylons → `PA`, long tail → `OTHER`).
- The CLI refuses non-local databases without `--allow-remote`. Importing into production is a deliberate manual step, not part of the build.

## Environment

One `.env` at the **repo root** (copy `.env.example`). Prisma 7 does not load env files itself: `packages/database/prisma7.config.ts` and `apps/web/next.config.ts` both load the root file explicitly. On Vercel the platform env is used.

**Local database without Docker or Neon:** `pnpm --filter @spoolworks/database exec prisma dev start spoolworks` (first time: `prisma dev --name spoolworks`). `prisma dev ls` shows the direct TCP URL (`postgres://postgres:postgres@localhost:<port>/template1?sslmode=disable`); use it for both `DATABASE_URL` and `DIRECT_URL`, and set `DATABASE_POOL_MAX=1` (it handles one connection at a time; concurrent queries otherwise fail with `08P01`). Stop with `prisma dev stop spoolworks`. `.claude/launch.json` starts the web dev server for the browser preview.

- App → `DATABASE_URL`, Neon **pooled** (`-pooler` host), via `@prisma/adapter-pg`.
- Prisma CLI → `DIRECT_URL`, non-pooled. `migrate` takes a session-level advisory lock that leaks through PgBouncer (P1002).

## Deployment (Vercel + Neon)

Vercel project with Root Directory `apps/web`; `apps/web/vercel.json` pins `fra1` (Neon is eu-central-1) and runs `prisma migrate deploy` before the build. Production uses `prod_spoolworks`, Preview uses `dev_spoolworks`. Set `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET` per environment, `IMPRINT_NAME` and `IMPRINT_ADDRESS` for both; `BETTER_AUTH_URL` only for Production (previews infer their origin). `SMTP_USER`, `SMTP_PASSWORD`, `ADMIN_EMAILS` and `SUPPORT_EMAIL` for the account flow (see Conventions); all optional. Migrations run on every deploy including previews, so schema leads code: never write a migration the deployed code cannot survive.

## Stack notes

- **Prisma 7.10, not 8.** npm `latest` for `prisma` is an 8.0 RC and Better Auth's adapter does not support 8. Always install `@7`. The CLI config file is `prisma7.config.ts` (new name since 7.10).
- **TypeScript 6.0.3, not 7.** typescript-eslint supports `<6.1`.
- **Next.js 16.4 with `cacheComponents`.** Anything that reads the request (session, `searchParams`, uncached DB reads) must render inside `<Suspense>`. Keep session reads out of layout top level.
- **Better Auth 1.7**, email + password. Map `error.code` through `lib/auth-errors.ts`; never render `error.message`.
- **Print CSS:** keep `@page` inside `@media print` in `globals.css`. A top-level `@page` makes the Tailwind/Turbopack build silently drop the rules after it. App chrome uses `print:hidden`.
- **shadcn/ui** (`radix-nova`), utility `cn` from the `cn` package. Add components with `pnpm dlx shadcn@latest add <name>` in `apps/web`, don't hand-edit `components/ui/`.

## Design

Agreed direction (2026-11-17): near-black (`#0e0e0d`) / warm paper (`#f4f3ef`) backgrounds, hairline-bordered tiles, **tight corners** (`--radius` 6px; tiles `rounded-xl` ≈ 8px; the user explicitly does not want an over-rounded "standard AI" look), one warm accent (amber, `bg-primary`), orange `warning` only for low stock. Filament colours are the only other colour on screen (rings, dots).

- Light and dark via `next-themes` (`class` on `<html>`, default `system`). Use tokens (`bg-card`, `text-muted-foreground`, `bg-primary`), never raw colours.
- Building blocks in `components/tile.tsx`: `Tile` (surface), `Eyebrow` (small spaced uppercase label), `Figure` (big mono number + unit). Utilities `.eyebrow`, `.figure`, `.pb-tabbar` in `globals.css`.
- Signed-in pages sit above a fixed bottom tab bar with a centre "+" (quick actions). Content must keep `pb-tabbar` room.
- **Icons and errors:** favicon, `icon.png`, `apple-icon.png` (in `app/`) and the manifest icons (`public/icons`, plus a maskable one with safe-zone padding) are rendered from the SpoolMark glyph on the dark background by `apps/web/scripts/make_icons.py`; rerun it if the glyph changes. `not-found.tsx`, `error.tsx` (uses `retry()`) and `global-error.tsx` share `components/errors/error-screen.tsx`; the 404 copy never says whether a thing exists.
- Planned components for later phases: segmented pill control, spool ring, numeric keypad for weighing.
- No decorative fake data: empty states say what's missing.

## Conventions

- **Tenant = `Workshop`**, not `User` and not Better Auth's `Account` (that is a login method). Every owned row hangs off `workshopId`. `requireWorkshop()` in `lib/session.ts` is the entry point for pages and actions; every server action calls it itself, UI gating is cosmetic.
- **Not found and not yours look the same** (404), never 403.
- **Printers and AMS:** `Printer` → `AmsUnit` (`slotCount` 4 or 1, hardware-neutral) → `AmsSlot`. `AmsSlot.spoolId` is unique: a spool sits in at most one slot, none means "on the shelf". Assigning moves a spool out of its old slot in the same transaction; archiving a spool unloads it. `Spool.location` is the user's own text and is never overwritten by slot data.
- **Prints and the ledger:** a `PrintUsage` owns at most one PRINT ledger entry, and only while the print is PRINTED or FAILED (failed prints deduct). Edits update that entry in place so its `seq` stays put: booking order decides whether a later weighing wins, not the print date. Every change locks the affected spools in sorted id order and recomputes `remainingG`. A spool with usages cannot be deleted (archive it instead).
- **Labels:** printed labels and NFC tags point to `/s/<shortCode>`, which opens the spool of the signed-in workshop (archived ones too); invalid, unknown and foreign codes are all 404. The origin comes from `lib/label-origin.ts` (`VERCEL_PROJECT_PRODUCTION_URL`, so labels printed from a preview still point at production). Sheet layouts are pure functions in `packages/core/src/label.ts`, lengths in micrometres. Label paper is hard-coded black on white, the one place raw colours are allowed.
- **Accounts and mail:** password reset mail goes through one Gmail account (`lib/mail.ts`, nodemailer, `SMTP_USER` + app password `SMTP_PASSWORD`); Better Auth's `sendResetPassword` is wired only when both are set, and `/auth/forgot` then shows the email form (same answer for unknown addresses). Without SMTP the public reset request is off and `/auth/forgot` shows `SUPPORT_EMAIL`. Either way an admin (address in `ADMIN_EMAILS`, checked by `requireAdmin()` in `lib/admin.ts`, everyone else gets 404) can make a one-time link on `/admin` (`createResetLink`, stored like Better Auth's own reset token, 1 h, older links die) and send it by hand. `/auth/reset` redeems both kinds and ends all sessions. Settings has change password (signs out other devices) and delete account (password + tick; the DB cascades from `User` through `Workshop`). Forms that carry a password use `method="post"`, so a submit before hydration never puts it in the URL. Mail HTML inlines the accent colour (clients ignore CSS variables).
- **Sharing:** a print is shared when `Print.shareToken` is set (128-bit, `/p/<token>`); stopping clears it, sharing again mints a new one. The public gallery `/u/<handle>` (`Workshop.galleryPublic` + lower-case `publicHandle`) shows exactly the shared prints. Pages without a session read only through `lib/queries/public.ts`, which selects the published fields explicitly (no ids, short codes or remaining weights); never pass private views to them. Public reads are uncached so revoking works on the next request. Share links use the current origin, not the label origin, because each environment has its own database.
- **Legal pages:** `/impressum` and `/datenschutz` are public. Provider name and address come only from `IMPRINT_NAME` / `IMPRINT_ADDRESS` (lines split at commas, `lib/legal.ts`), contact is `SUPPORT_EMAIL`; never put them in the repo. They are read at build time, so a change needs a redeploy. The privacy text in `de.ts` describes what the app really does (Vercel, Neon, Gmail, session cookie with IP and user agent, no tracking): update it whenever a new processor, cookie or public field is added (photos in 3b!). `LegalLinks` sits in the landing and public-page footers, under login/register and at the end of settings.
- **Statistics:** `computeStats` in `packages/core/src/stats.ts` is pure; `lib/queries/stats.ts` only loads rows. Only PRINTED and FAILED prints count, dated `printedOn ?? createdAt`, months in UTC. Cost = grams × spool price ÷ net weight; grams from unpriced spools are reported separately, never guessed. Charts (`components/stats/`) are plain HTML server components (no chart library): accent `bg-primary` for the point, `bg-chart-5` for context, every chart has a tooltip and an "Als Tabelle" view. `/stats` is in the sidebar only; on phones the dashboard tile links there.
- **Photos:** up to `PRINT_PHOTO_LIMIT` (3) per print in `PrintPhoto`, position 0 is the cover. The browser shrinks and re-encodes every photo to JPEG (`lib/photo-resize.ts`, which also drops EXIF/GPS; no fallback to the original file); the server action checks magic bytes and size again (`sniffPhotoType` in core). Blobs live in one **private** Vercel Blob store shared by production, previews and local dev: pathnames are random, prefixed with `VERCEL_ENV` (or `local`), stored in the row and deleted only by those exact pathnames, before the rows (photo, print, and account via `deleteUser.beforeDelete`). Never `list()` and delete by prefix. Owners read `/photos/<id>` (session check), visitors `/p/<token>/photos/<n>` (no ids, `no-store`, so revoking works on the next request). Plain `<img>`, never `next/image` (its cache would sit in front of the check). Auth is OIDC on Vercel (`BLOB_STORE_ID`, no token in the env) or a read-write token; without either the photo UI is off (`photosEnabled()`). Integration tests alias `@vercel/blob` to an in-memory stub (`tests/stubs/vercel-blob.ts`): the real token is in the root `.env`.
- **Integers only:** weights in whole grams (`…G`), prices in cents (`…Cents`), diameters in micrometres (`…Um`). No floats.
- **Forms:** use `useFormAction` (`lib/use-form-action.ts`) with `onSubmit` instead of `<form action={…}>`. React 19 resets a form after every action, which wipes input after a failed validation.
- **Copy:** user-facing text is German and lives in `apps/web/src/messages/de.ts`. Code, comments, identifiers and commits are English.
- **Mobile first:** every page usable on a phone; touch targets at least 44 px (`h-11` / `min-h-11`), inputs `text-base` (no iOS zoom).
- **Branches:** feature branch + PR for every change, never commit to `main`.
- **Secrets:** never in the repo; `.env.example` holds placeholders only.

## Status

Phases 0–5 done (monorepo and auth, filament library with ledger, OFD catalog import, printers with AMS slots, print gallery with spool deduction, QR/NFC spool labels, sharing) plus statistics. Release package R1–R3 and photos for prints (3b) done; see the hub for what comes after version 1.
