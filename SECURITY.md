# Security Policy

## Reporting a Vulnerability

If you find a security issue in grody-github, please report it through [GitHub's private vulnerability reporting](https://github.com/cheefbird/grody-github/security/advisories/new). 

Please include:

- Description of the vulnerability
- Steps to reproduce
- Extension version number e.g. `0.4.2`
- Browser name and version number
- Potential impact

## Scope

The following are in scope:

- XSS or script injection via content scripts
- Permission escalation beyond declared extension permissions
- Data exfiltration from browser local storage
- Compromised or malicious dependencies

The following are out of scope:

- Bugs in GitHub's own UI
- Issues requiring physical access to the device
- Social engineering attacks
- Browser vulnerabilities unrelated to this extension

## Response

This is a solo open-source project. I'll do my best to acknowledge reports promptly and address confirmed vulnerabilities as quickly as I can, but there are no guaranteed SLAs.

Reporters will be credited in the fix unless they prefer to remain anonymous.

## Disclosure

Coordinated disclosure is preferred. Please allow a reasonable amount of time to address the issue before disclosing publicly.
