# Privacy Policy

*Last updated: March 11, 2026*

**Grody GitHub** is a browser extension that adds workflow filtering to GitHub Actions pages.

## Data Collection

Grody GitHub does **not** collect, transmit, or share any user data with third parties. No analytics, telemetry, or tracking of any kind.

## Data Storage

A GitHub Personal Access Token (PAT) may be stored in your browser's local extension storage (`chrome.storage.local`). This token:

- Never leaves your device except to authenticate with `api.github.com`
- Is never sent to any third-party server
- Is never shared with other extensions or websites
- Can be removed at any time from the extension's options page

Workflow data fetched from GitHub's API is cached locally for performance and automatically expires after 24 hours.

## Website Content

Grody GitHub reads page elements on GitHub Actions pages to detect the workflow sidebar and inject the filter UI. This content is processed locally and is never collected, stored, or transmitted.

## Permissions

- **Host permissions** (`github.com/*/actions*`): Required to inject the workflow filter UI into GitHub Actions pages and make API requests to `api.github.com`.
- **Storage**: Required to save your token and cache workflow data locally.

## Contact

Questions or concerns? Open an issue at [github.com/cheefbird/grody-github](https://github.com/cheefbird/grody-github/issues).
