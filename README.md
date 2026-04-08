# Grody GitHub

<p align="center">
  <img src="public/icon/128.png" width="128" height="128" alt="Grody GitHub" />
</p>

Filter your long list of workflows in Github! See your Org's deployments grouped by environment name, across repos! And more to come.

<p align="center">
  <a href="https://chromewebstore.google.com/detail/pbghkjaknoiilominkjgmfjeoobkhfkn"><img src="https://badgen.net/chrome-web-store/v/pbghkjaknoiilominkjgmfjeoobkhfkn?icon=chrome&color=blue" alt="Chrome Web Store" /></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/grody-github/"><img src="https://badgen.net/amo/v/grody-github?icon=firefox" alt="Firefox Addon Marketplace" /></a>
</p>

---

## What is this

GitHub's UI is fine. Until it isn't. If you've ever scrolled through a sidebar of 80 workflows trying to find the one you need, you know the feeling.

Grody GitHub is a Chrome extension that bolts small, targeted fixes onto GitHub's interface. One feature at a time. No bloat.

## Core Features

Core features are enabled by default and may/may not have an option to disable. Requests to change this are always welcome, just create a discussion first.

### Workflow Sidebar Filter

Adds a search box to the Actions sidebar so you can actually find your workflows.

- Real-time search — matches on workflow name and filename
- Caches the workflow list for 24 hours so it's snappy after first load
- Works with dark theme
- Handles repos with hundreds of workflows without breaking a sweat

### Org Deployments Dashboard

See deployment status across every repo in an org, all in one place. Lives on the org insights page as a new sidebar tab.

- Groups deployments by environment with color-coded status
- Pin your most-used environments to the top
- Search and manual refresh with cache-first loading
- Requires a token with Deployments (read) and Metadata (read) permissions

## Optional Features

Optional features are opt-in only. You've gotta go to the options to turn it on.

### GitHub Incident Status

GitHub is basically always having an incident these days. This puts a banner below the header so you know before you start blaming your code.

- Opt-in by enabling from the options screen
- Polls GitHub's status API in the background — defaults to 15 min, but you can change it in options
- Color-coded severity with a details popover showing per-component breakdown
- Dismissible, remembers your preference, auto-clears on resolve

## Install Locally

If you want to contribute, or just build the extension from source for whatever reason, here you go:

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
4. Select the `~/path/to/grody-github/.output/chrome-mv3` directory from the repo root on your machine

## Setup

1. Click the Grody GitHub extension icon
2. Hit **Options**
3. Paste a [GitHub Personal Access Token](https://github.com/settings/tokens) (optional — only needed for rate limits or private repos)
   - **Fine-grained token**: Actions (read) on the repos you need. Org Deployments also needs Deployments (read) and Metadata (read).
   - **Classic token**: `repo` scope
   - No token or scopes needed for public repos only
4. Token gets validated on save — the popup turns green when you're connected

## Development

```bash
pnpm dev            # Dev server with hot reload (Chrome)
pnpm dev:firefox    # Dev server (Firefox)
pnpm format         # Biome formatter
pnpm lint           # Biome check (format + lint)
pnpm test           # Run tests
pnpm check          # Svelte type checking
```

Built with [WXT](https://wxt.dev) + [Svelte 5](https://svelte.dev) + TypeScript. Targets Chrome MV3, with Firefox support via WXT's compatibility layer.
