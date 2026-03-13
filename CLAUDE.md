# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser extension built with **WXT 0.20** (extension framework) + **Svelte 5** + **TypeScript**, targeting Chrome MV3 with Firefox support.

## Commands

```bash
pnpm dev              # Dev server with hot reload (Chrome)
pnpm dev:firefox      # Dev server (Firefox)
pnpm build            # Production build (Chrome)
pnpm build:firefox    # Production build (Firefox)
pnpm zip              # Create distribution ZIP
pnpm format           # Biome formatter
pnpm lint             # Biome linter
pnpm check            # Svelte type checking (svelte-check)
pnpm test             # Run tests (vitest)
pnpm test:watch       # Run tests in watch mode
```

## Architecture

### Entry Points

WXT auto-discovers entry points from `src/entrypoints/`. Each file/directory becomes part of the extension manifest automatically:

- **`background.ts`** — Service worker. Uses `defineBackground()` wrapper. Handles message passing from content scripts.
- **`github.content/`** — Content script for GitHub pages. Uses `defineContentScript()` with match patterns. Re-runs features on SPA navigation via `wxt:locationchange`.
  - **`features/`** — Each feature exports an `init()` function that checks page context and mounts Svelte components as needed.
- **`popup/`** — Browser action popup UI. `index.html` → `main.ts` → mounts Svelte `App.svelte`.
- **`options/`** — Extension options page. Same pattern as popup.

### Shared Code

- `src/lib/` — Shared utilities (`github-api.ts`, `storage.ts`, `messages.ts`, `types.ts`) and Svelte components

### Global Imports

WXT auto-injects these globally (no import needed):

- `browser` — WebExtensions API
- `storage` — WXT storage utilities
- `defineBackground`, `defineContentScript` — Entry point wrappers
- `createShadowRootUi`, `createIntegratedUi`, `createIframeUi` — UI helpers for content scripts

### Path Aliases

- `@` / `~` → `src/`
- `@@` / `~~` → project root

### Environment Variables

Available via `import.meta.env`:

- `MANIFEST_VERSION` (2 | 3), `BROWSER`, `CHROME`, `FIREFOX`, `SAFARI`, `EDGE`, `OPERA`, `COMMAND` ("build" | "serve"), `ENTRYPOINT`

## Testing

- **Vitest** with `WxtVitest()` plugin for browser API mocking
- Test files co-located with source: `*.test.ts` (not in `__tests__/` directories)
- `fakeBrowser` from `wxt/testing` for storage/runtime mocks — call `fakeBrowser.reset()` in `beforeEach`
- `vi.stubGlobal("fetch", ...)` for API tests
- Svelte components are mocked in unit tests to avoid jsdom dependency

## Code Style

- **Biome** for formatting and linting (not ESLint/Prettier)
- Double quotes, `organizeImports` enabled
- Svelte files have `noUnusedVariables` turned off (Svelte runes trigger false positives)

## Patterns

- **Result types**: Discriminated unions for success/failure (`{ ok: true; data } | { ok: false; reason }`) instead of thrown errors
- **Storage**: `storage.defineItem()` with typed cache keys (`` `local:${string}` ``), 24-hour TTL on cached data
- **Svelte fragments**: `svelte.config.js` sets `compilerOptions.fragments: "tree"` for CSP compliance (avoids innerHTML)

## Key Files

- `wxt.config.ts` — WXT config (srcDir, modules, Firefox manifest overrides)
- `svelte.config.js` — Svelte compiler options (fragments mode)
- `biome.json` — Formatter and linter config
- `.wxt/` — Auto-generated types and config (don't edit)
- `.output/` — Build output (load as unpacked extension for dev)
- `public/` — Static assets copied to build (icons, etc.)

## Conventions

- Package manager: **pnpm**
- Node 22 (pinned in `.nvmrc`)
- ES modules (`"type": "module"`)
- Svelte 5 runes syntax (`$state`, `$derived`, `$effect`, `$props`)
- MV3-first design; Firefox builds use MV2 compatibility layer via WXT
- Markdownlint is active in the IDE — prefer pure markdown over inline HTML where possible
- GitHub repo: `cheefbird/grody-github`
