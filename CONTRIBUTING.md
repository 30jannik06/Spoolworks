# Contributing to SpoolWorks

Thanks for helping. Bug reports, ideas and pull requests are all welcome.

## Before you start

- **Bugs and ideas:** open an issue. For anything bigger than a small fix, please open an issue first so we can agree on the approach before you spend time on it.
- **Missing or wrong filament data** (products, colours, barcodes, spool weights) usually belongs upstream in the [Open Filament Database](https://github.com/OpenFilamentCollective/open-filament-database) or [SpoolmanDB](https://github.com/Donkie/SpoolmanDB). SpoolWorks picks changes up with the nightly sync.
- **Security issues:** never in a public issue, see [SECURITY.md](SECURITY.md).

## Pull requests

1. Fork, then branch from `main` (`feat/…`, `fix/…`, `chore/…`).
2. Set up the project as described in the [README](README.md).
3. Keep the PR focused on one change. Run `pnpm typecheck`, `pnpm lint` and `pnpm test` before pushing.
4. Describe what changed and why; screenshots help for UI changes (phone width too).

## Conventions

The full list is in [`CLAUDE.md`](CLAUDE.md). The ones that matter most:

- **Copy is German** and lives in `apps/web/src/messages/de.ts`. Code, comments, identifiers and commit messages are English.
- **Mobile first:** every page works on a phone, touch targets at least 44 px.
- **Tenancy:** everything a user owns hangs off a `Workshop`. Every server action checks it with `requireWorkshop()`; "not found" and "not yours" both answer 404.
- **Integers only:** grams, cents, micrometres.
- `packages/core` and `packages/database` never import from Next or React.
- **No secrets** in the repo; `.env.example` holds placeholders only.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(web): …`, `fix(core): …`).

## License of contributions

SpoolWorks is licensed under the [AGPL-3.0](LICENSE). By opening a pull request you agree that your contribution is published under the same license.
