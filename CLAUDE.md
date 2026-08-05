# grody-github

WXT browser extension (Svelte + TypeScript) that cleans up GitHub UI annoyances.

## Stack

- WXT 0.21.x, Svelte 5, TypeScript
- pnpm, Node 24
- Biome (linting/formatting), Vitest (testing)

## Commands

- `pnpm dev` — dev server with hot reload (Chrome)
- `pnpm build` — production build
- `pnpm lint` — biome check
- `pnpm lint:fix` / `pnpm format:fix` — biome autofix
- `pnpm test` — vitest run
- `pnpm test:watch` — vitest in watch mode
- `pnpm check` — svelte-check type checking
- `pnpm zip` / `pnpm zip:firefox` / `pnpm zip:edge` — build extension zips

## Git Policy

- Never commit or push — user handles all git ops
- Subagents must be explicitly told not to commit
- Conventional commit style when drafting messages

## CI/CD

- `ci.yml` — biome, tests, type check on push/PR
- `release.yml` — builds zips, creates GitHub Release on v* tags
- `publish.yml` — submits to Chrome/Firefox stores via `npx wxt submit`, gated by GitHub environment approvals
- Pin all actions to full commit SHAs with version comments
- Pass `${{ }}` expressions through `env:` vars in `run:` blocks (injection prevention)

## Architecture

- Features live in `src/entrypoints/grody.content/features/*/index.ts`, auto-discovered via `import.meta.glob`
- Each feature exports a `FeatureDefinition` from `src/lib/feature-types.ts`
- Optional features gate on a storage-backed enabled flag checked in `init()`
- Storage uses WXT's `storage.defineItem()` — auto-imported globally, no explicit import needed
- Storage key convention: `local:[feature]:[setting]` (e.g. `local:github-status:enabled`)
- Popup and options are separate entrypoints under `src/entrypoints/`

## Code Style

- Follow existing patterns — biome handles formatting
- Minimal comments — only where logic isn't self-evident

## Gotchas

- `storage` from WXT is an auto-import global — don't add `import { storage } from "wxt/storage"` in `src/lib/` files
- Generated `.wxt/tsconfig.json` enables `noUncheckedIndexedAccess` — array/record indexing yields `T | undefined`, narrow or use optional chaining
- GitHub's newer pages (e.g. `/deployments`) are React apps — never mutate React-owned DOM. All sidebar filters use the overlay pattern: mount `SidebarFilter` in a sibling container and hide the native list via a CSS rule keyed on the container's `data-filtering` attribute (see `env-filter` and `workflow-filter`)
- React pages use hashed CSS-module classes — match on the stable prefix with `[class*="..."]` selectors, never the full class name