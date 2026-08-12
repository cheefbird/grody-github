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
- `release.yml` — semantic-release, run manually via workflow dispatch: bumps the
  version, builds zips, tags, and creates a GitHub Release. Batches every
  releasable commit since the last tag into one version
- `release-preview.yml` — on PRs, comments the version and notes that would be cut.
  Non-blocking and informational; it never publishes anything
- `publish.yml` — submits to Chrome/Firefox stores via `npx wxt submit`, gated by
  GitHub environment approvals
- Releases are driven by commit type. Because merges are squashed, the **PR title**
  is the commit semantic-release analyzes: `feat` → minor, `fix`/`perf`/`refactor`
  → patch, `chore(deps)` → patch, everything else → no release
- `chore(deps)` is the one rule where the **scope is load-bearing**. Renovate emits
  that scope by default, so its PRs cut patches and land in a "Dependencies" section.
  Bare `chore:` and any other scope (`chore(renovate):`, and semantic-release's own
  `chore(release):` commit) release nothing and stay out of the notes. Keep the scope
  if you want a dep bump to ship
- `renovate.json` pins `:semanticCommitTypeAll(chore)` **last** in `extends` (later
  presets win) so every bot PR stays in that one lane. Without it, `config:recommended`
  switches to `fix(deps)` for production deps — which would still cut a patch, but would
  render under "Bug Fixes" instead of "Dependencies". Only bites once `dependencies` in
  `package.json` is non-empty; it is empty today
- Use `ci:` for CI-only changes, **not** `fix(ci):`. Every rule except `chore(deps)`
  matches on type alone, so `fix(ci):` cuts a patch release and lands in user-facing
  release notes for a change no user can observe
- A `!` or `BREAKING CHANGE:` footer jumps straight to `1.0.0` from `0.x` — and
  store versions can never go back down, so that is a one-way door. Use it
  deliberately. Note the squash body is built from the branch's commit messages, so
  a `BREAKING CHANGE:` footer on **any** commit in the PR triggers it, even when the
  PR title looks harmless
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