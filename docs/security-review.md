# Security and privacy review — Visit Budget 1.1.0

Reviewed: 2026-09-14

## Result

No release-blocking security issue is known after source review, dependency
audit, automated tests, and production-package inspection. This is not a claim
that any software can be proven vulnerability-free; it records the checks and
remaining limitations for this release.

## Scope and threat model

The review covers the Manifest V3 permissions, extension-to-extension-context
messages, local and session storage, blocked-page navigation, injected page
guard, bundled executable code, development dependencies, and release ZIP.

The relevant risks are unnecessary browsing access, unintended data transfer,
remote-code execution, forged or malformed extension messages, unsafe redirects,
accidental persistence of browsing data or override state, and packaging development
artifacts. Visit Budget is not intended to withstand uninstalling the extension,
using another browser or profile, or a user deliberately disabling Chrome-level
controls.

## Controls verified

- Manifest V3 with a self-only extension-page content security policy.
- No runtime dependencies, backend, analytics, advertising, telemetry, network
  client, remote script, dynamic code evaluation, or remotely hosted code.
- Website access remains optional and is requested when a user creates a rule;
  there is no required all-sites host permission or broad `tabs` permission.
- Runtime messages use a closed discriminated union and reject unknown or
  malformed payloads before dispatch.
- Blocked-page return targets must be HTTP or HTTPS and must match the active
  rule; edited, cross-site, or script-scheme targets fall back safely.
- Override confirmation challenges are short-lived and kept in session storage.
  The extension does not request a written override reason; only the selected
  duration and resulting local expiry are used to grant temporary access.
- Permanent blocks reject override requests at the core decision boundary even
  if a request is forged.
- Production builds omit source maps. The release validator checks manifest
  invariants, scans executable files for network and dynamic-code primitives,
  inspects ZIP paths, and produces a SHA-256 checksum.
- `npm audit` reports zero known vulnerabilities after updating affected
  development-only transitive packages.

## Permission review

| Permission                            | Reason and scope                                                           |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `activeTab`                           | Current-site status and quick-add after an explicit toolbar interaction.   |
| `storage`                             | Local rules, usage, pending locked changes, and short-lived session state. |
| `webNavigation`                       | Accurate re-entry detection without counting reloads or internal browsing. |
| `scripting`                           | Reminders and page-preserving guards on sites the user configured.         |
| `alarms`                              | Local reset and expired-session maintenance.                               |
| `declarativeNetRequestWithHostAccess` | Pre-navigation blocking for configured hosts.                              |
| Optional HTTP/HTTPS host access       | Granted per configured host and released after its final rule is removed.  |

The optional host declaration uses wildcard HTTP and HTTPS patterns because the
extension cannot know in advance which site a user will configure. Chrome shows
the requested host in its own approval dialog; Visit Budget first explains why
that access is needed and that processing remains local.

## Automated release evidence

The release gate is:

```bash
npm audit
npm run check
npm run test:e2e
npm run package
```

`npm run package` creates `artifacts/visit-budget-v1.1.0.zip` and its checksum.
Continuous integration repeats the checks with Node.js 22 and Playwright
Chromium.

## Residual limitations

- Any Chrome extension can be disabled or uninstalled, and Chrome-level rules
  do not cover other browsers or profiles.
- A sufficiently determined user or page can interfere with a DOM overlay;
  future navigations are separately protected by declarative rules.
- Chrome's permission wording is intentionally broad because scripting access
  can read or change a configured page. The extension's implementation uses
  that access only for the stated counting, reminder, and blocking purpose.
- Privacy-first operation means there is no remote error reporting. User reports
  and reproducible local diagnostics remain important after publication.
- Store publication still requires a public privacy-policy URL, accurate
  dashboard declarations, current screenshots, and Google's independent review.

## Primary policy references

- [Chrome permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Protecting user privacy](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy)
- [Chrome Web Store privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome Web Store user data policy](https://developer.chrome.com/docs/webstore/user_data)
