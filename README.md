# Grody GitHub

<p align="center">
  <img src="public/icon/128.png" width="128" height="128" alt="Grody GitHub" />
</p>

A browser extension that makes GitHub a little less painful.

---

## What is this

GitHub's UI is fine. Until it isn't. If you've ever scrolled through a sidebar of 80 workflows trying to find the one you need, you know the feeling.

Grody GitHub is a Chrome extension that bolts small, targeted fixes onto GitHub's interface. One feature at a time. No bloat.

## Features

### Workflow Sidebar Filter

Adds a search box to the Actions sidebar so you can actually find your workflows.

- Real-time search — matches on workflow name and filename
- Caches the workflow list for 24 hours so it's snappy after first load
- Works with dark theme
- Handles repos with hundreds of workflows without breaking a sweat

## Install

Not on the Chrome Web Store yet. For now, sideload it:

```bash
git clone https://github.com/cheefbird/grody-github.git
cd grody-github
pnpm install
pnpm build
```

Then in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3` directory

## Setup

1. Click the Grody GitHub extension icon
2. Hit **Options**
3. Paste a [GitHub Personal Access Token](https://github.com/settings/tokens)
   - `repo` scope if you need private repos
4. Token gets validated on save — the popup turns green when you're connected

## Development

```bash
pnpm dev            # Dev server with hot reload (Chrome)
pnpm dev:firefox    # Dev server (Firefox)
pnpm check          # Svelte type checking
```

Built with [WXT](https://wxt.dev) + [Svelte 5](https://svelte.dev) + TypeScript. Targets Chrome MV3, with Firefox support via WXT's compatibility layer.
