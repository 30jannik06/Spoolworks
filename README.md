# SpoolWorks

Filament inventory and print gallery for 3D printing, in one app: a print knows which spools it used and how many grams, and the inventory deducts them automatically. Live at **[spoolworks.de](https://spoolworks.de)** (German UI, free, private by default).

- **Spools:** remaining weight from a ledger of weighings and prints, low-stock warnings, QR/NFC labels, barcode scan to pick the product.
- **Catalog:** filament products from the [Open Filament Database](https://github.com/OpenFilamentCollective/open-filament-database), empty-spool weights from [SpoolmanDB](https://github.com/Donkie/SpoolmanDB), synced nightly.
- **Printers and AMS:** which spool sits in which slot.
- **Prints:** gallery with photos, grams booked per spool, statistics and costs.
- **Sharing:** single prints by link, or a public gallery per workshop.

## Stack

pnpm + Turborepo monorepo: Next.js 16 (App Router), Prisma 7 on PostgreSQL (Neon), Better Auth, Tailwind + shadcn/ui, Vitest. Hosted on Vercel.

| Path | Contents |
| --- | --- |
| `apps/web` | the web app |
| `apps/catalog-sync` | CLI that imports the Open Filament Database |
| `packages/catalog` | catalog download and sync |
| `packages/database` | Prisma schema, migrations, client |
| `packages/core` | pure domain logic and tests |

[`CLAUDE.md`](CLAUDE.md) documents architecture, conventions and decisions in detail.

## Running it locally

Needs Node 22+ and pnpm.

```bash
pnpm install
cp .env.example .env
# local Postgres without Docker:
pnpm --filter @spoolworks/database exec prisma dev --name spoolworks
# put the URL from `prisma dev ls` into DATABASE_URL and DIRECT_URL, set DATABASE_POOL_MAX=1
pnpm db:migrate
pnpm --filter @spoolworks/catalog-sync sync   # optional: import the product catalog
pnpm dev
```

`pnpm test`, `pnpm typecheck` and `pnpm lint` run the checks.

## Contributing

Contributions are welcome, see [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md).

## License

Copyright (C) 2026 30jannik06

[GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only). You may use, change and self-host SpoolWorks; if you offer a modified version to others over a network, you must publish its source under the same license.

Catalog data: Open Filament Database and SpoolmanDB (both MIT). Geist fonts in `apps/web/assets/fonts`: SIL Open Font License.
