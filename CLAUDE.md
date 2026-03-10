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
pnpm check            # Svelte type checking (svelte-check)
```

No test framework is configured yet. Markdownlint is active in the IDE.

## Architecture

### Entry Point Discovery

WXT auto-discovers entry points from `src/entrypoints/`. Each file/directory becomes part of the extension manifest automatically:

- **`background.ts`** — Service worker. Uses `defineBackground()` wrapper.
- **`content.ts`** — Content script injected into pages. Uses `defineContentScript()` with match patterns.
- **`popup/`** — Browser action popup UI. `index.html` → `main.ts` → mounts Svelte `App.svelte`.

New entry points (options page, sidepanel, devtools, etc.) are added by creating files in `src/entrypoints/` following WXT naming conventions.

### Shared Code

- `src/lib/` — Reusable Svelte components and utilities

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

## Key Files

- `wxt.config.ts` — WXT config (srcDir, modules)
- `.wxt/` — Auto-generated types and config (don't edit)
- `.output/` — Build output (load as unpacked extension for dev)
- `public/` — Static assets copied to build (icons, etc.)

## Conventions

- Package manager: **pnpm**
- Svelte 5 runes syntax (`$state`, `$derived`, `$effect`)
- MV3-first design; Firefox builds use MV2 compatibility layer via WXT
- Markdownlint is active in the IDE — prefer pure markdown over inline HTML where possible
- GitHub repo: `cheefbird/grody-github`
