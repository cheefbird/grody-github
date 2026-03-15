# Privacy Policy

*Last updated: March 14, 2026*

**Grody GitHub** is a browser extension that enhances GitHub pages with workflow filtering and a GitHub status indicator.

## Data Collection

Grody GitHub does **not** collect, transmit, or share any user data with third parties. No analytics, telemetry, or tracking of any kind.

## Data Storage

All data is stored in your browser's local extension storage (`chrome.storage.local`) and never leaves your device except as described below.

**GitHub Personal Access Token (PAT):**

- May be optionally configured for private repo access
- Never leaves your device except to authenticate with `api.github.com`
- Is never sent to any third-party server or shared with other extensions
- Can be removed at any time from the extension's options page
- Used solely to list repository workflows via the GitHub Actions API
- Minimum required permission: Actions (read) for fine-grained tokens, or `repo` scope for classic tokens. No token is needed for public repos.

**Cached data:**

- Workflow data fetched from GitHub's API is cached locally and automatically expires after 24 hours.
- GitHub status data (incident info from `githubstatus.com`) is cached locally and refreshed on a configurable polling interval (default: 15 minutes).
- User preferences (status indicator enabled/disabled, banner collapsed state, poll interval) are stored locally.

## Network Requests

Grody GitHub connects to two external hosts:

- **`api.github.com`** — fetches repository workflow listings (with optional PAT authentication)
- **`www.githubstatus.com`** — fetches GitHub's public platform status (no authentication required)

No other network requests are made.

## Website Content

Grody GitHub runs as a content script on GitHub pages (`github.com/*`). It reads page elements to:

- Detect the workflow sidebar on Actions pages and inject the filter UI
- Detect the page header on any GitHub page and inject the status indicator banner (when enabled)

This content is processed locally and is never collected, stored, or transmitted.

## Permissions

- **Host permissions** (`github.com/*`): Required to run content scripts on GitHub pages for both the workflow filter and status indicator features.
- **Alarms**: Required to periodically poll GitHub's status API in the background.
- **Storage**: Required to save your token, cache data, and store preferences locally.

## Contact

Questions or concerns? Start a discussion over at [github.com/cheefbird/grody-github](https://github.com/cheefbird/grody-github/issues).
