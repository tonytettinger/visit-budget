# Visit Budget

Visit Budget is a personal-first Chrome extension that turns automatic website
checking into a conscious choice. It limits how many times you may re-enter a
site each day and can permanently block sites that you do not want to visit.

It is deliberate friction, not an unbreakable lock. You can still uninstall the
extension, use another browser or profile, or change device-level settings.
Visit Budget is designed to interrupt a habit before it becomes a decision—not
to replace self-control.

## Product contract

### Definitions

- **Rule:** A hostname and optional path scope configured as either a daily
  visit limit or a permanent block.
- **Visit:** An allowed transition from an untracked or differently tracked
  page into a page matched by a rule.
- **Re-entry:** Returning to a matched rule after visiting a page that does not
  match that same effective rule. Even an immediate return counts.
- **Permanent block:** A rule that never allows entry and has no emergency
  pass.
- **Emergency pass:** One site-specific, 10-minute exception per local calendar
  day. It requires a 15-second pause and a non-empty written intention.
- **Daily lock:** An optional commitment that keeps a rule unchanged until the
  next local-day reset. Edits or removal are scheduled for tomorrow.

### Counting behavior

| Action                                            | Consumes a visit? |
| ------------------------------------------------- | ----------------- |
| Enter a limited site from an untracked site       | Yes               |
| Switch away and immediately return                | Yes               |
| Switch between tabs matched by the same rule      | No                |
| Reload or navigate within the same effective rule | No                |
| Move from an excluded path to an included path    | Yes               |
| Return to the same tab after Chrome loses focus   | No                |
| Start Chrome with a limited site active           | Yes               |
| Create a rule while its matching site is active   | Yes               |

The first `N` visits are allowed. Entry `N + 1` is blocked. An allowed visit is
not time-limited; the emergency pass is.

### Matching behavior

- Only HTTP and HTTPS pages are eligible.
- Hostnames are normalized with the platform URL parser.
- Subdomains are included only when enabled (enabled by default).
- Included and excluded paths use normalized prefix matching.
- Query strings and fragments do not affect matching.
- Exclusions override inclusions within a rule.
- Exact hostnames beat wildcard parent-host matches.
- Longer included path prefixes beat shorter prefixes.
- A permanent block wins an otherwise exact tie.
- Indistinguishable duplicate rules are rejected.

### Daily reset and locks

Usage and emergency-pass availability reset at local midnight. Correctness does
not depend on Chrome firing an alarm at exactly midnight: every read and
transition also checks the local date lazily.

When daily lock is enabled, the current rule remains effective through the day.
A replacement or deletion is stored as a pending change and applied after the
next reset. Pending changes may be replaced or cancelled without weakening the
current locked rule.

## Privacy and permissions

Visit Budget has no account, server, telemetry, advertising, or remote code.
Rules and daily usage remain in `chrome.storage.local` on the device.

The extension requests:

- `storage` for rules, usage, pending changes, and active-session state.
- `webNavigation` to distinguish reloads/internal navigation from re-entry,
  including single-page applications.
- `scripting` to guard configured sites and already-open tabs.
- `alarms` for midnight and emergency-pass maintenance.
- `declarativeNetRequestWithHostAccess` to redirect blocked future
  navigations before the destination page is shown.

Host access is optional and requested only when you save a rule for that host.
Before Chrome displays its standard host-access warning, Visit Budget explains
the exact scope, the enforcement features that require it, and the local-only
privacy model. The explanation appears for new websites and whenever an edit
expands access, but not for ordinary edits whose access is already granted.
Removing the final rule that needs a host also releases its access.
The broad `tabs` permission is intentionally not requested. Navigation events
for unconfigured sites are neither retained nor analyzed.

## V1 scope

V1 includes:

- Daily visit limits and permanent blocks.
- Domain, subdomain, included-path, and excluded-path matching.
- Existing-tab protection.
- One emergency pass per limited site per day.
- Optional daily rule locks.
- A toolbar popup, options page, blocked page, page-preserving overlay, and
  durable visit-receipt notification with circular daily progress.
- A toolbar quick-add handoff that opens a prefilled, durable setup page before
  requesting Chrome host access.
- A history-independent “Leave for now” action that opens a fresh tab. Existing
  guarded tabs remain preserved beneath their overlay.
- Local-only persistence and unpacked installation.

V1 intentionally excludes:

- Mobile browsers.
- Cross-device synchronization.
- Accounts, cloud services, analytics, or AI.
- Time-spent limits and historical usage dashboards.
- OS-, router-, or enterprise-level enforcement.
- Chrome Web Store submission.

## Acceptance criteria

- Existing matching tabs cannot bypass a permanent block or exhausted limit.
- New matching navigations are redirected before their destination is exposed.
- Same-rule tabs, refreshes, and internal navigation do not double-count.
- Re-entry from another effective rule counts exactly once.
- Concurrent browser events cannot consume multiple visits for one transition.
- Every consumed visit produces exactly one receipt showing visits used,
  visits remaining, and circular progress; refreshes and internal navigation
  do not.
- Toolbar quick-add survives Chrome closing its action popup for the host
  permission dialog.
- “Leave for now” exits a newly blocked navigation without returning to the
  blocked URL.
- A blocked overlay preserves the underlying page and unsaved form contents.
- Emergency access lasts 10 minutes and is available once per site per day.
- Local-midnight reset and queued locked changes work after browser sleep or
  service-worker restart.
- No user browsing data is transmitted off-device.
- `npm run check` passes and `dist/` loads as an unpacked extension.

## Local development

Requirements: Node.js 22+, npm, and a current Chrome installation.

```bash
npm install
npm run build
```

Load the result:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository's `dist` directory.

Useful commands:

```bash
npm run build       # Build the unpacked extension
npm run check       # Format check, lint, types, unit tests, and build
npm run test        # Unit tests
npm run test:e2e    # Extension tests in Playwright Chromium
npm run package     # Create a deterministic ZIP in artifacts/
```

## Architecture

- `src/core/` contains pure matching and decision logic.
- `src/platform/` contains thin Chrome API boundaries.
- `src/background/` coordinates browser events and state transitions.
- `src/content/` owns the idempotent page guard.
- `src/ui/` contains native popup, options, and blocked-page interfaces.

The codebase uses plain typed records and functions. There is no UI framework,
dependency-injection container, generic repository layer, or runtime
dependency.
