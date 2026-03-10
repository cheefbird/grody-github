# Privacy Policy

**Grody GitHub** is a browser extension that adds workflow filtering to GitHub Actions pages.

## Data Collection

Grody GitHub does **not** collect, transmit, or share any user data. No analytics, telemetry, or tracking of any kind.

## Data Storage

A GitHub Personal Access Token (PAT) may be stored in your browser's local extension storage (`chrome.storage.local`). This token:

- Never leaves your device except to authenticate with `api.github.com`
- Is never sent to any third-party server
- Is never shared with other extensions or websites
- Can be removed at any time from the extension's options page

Workflow data fetched from GitHub's API is cached locally for performance and automatically expires after 24 hours.

## Permissions

- **Host permissions** (`github.com`): Required to inject the workflow filter UI into GitHub Actions pages and make API requests to GitHub.
- **Storage**: Required to save your token and cache workflow data locally.

## Contact

Questions or concerns? Open an issue at [github.com/cheefbird/grody-github](https://github.com/cheefbird/grody-github/issues).
