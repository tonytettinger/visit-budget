# Changelog

## Unreleased

## v1.0.0 — 2026-08-21

### [feature] Add deliberate friction controls — 2026-08-21

- What: rules can optionally count returns from other tabs, and exhausted visit
  budgets now offer repeatable 10-minute emergency overrides.
- Why: different habits need different counting strictness, while genuinely
  necessary access should remain possible without becoming effortless.
- How: every override requires a 15-second pause, a private intention of at
  least 50 characters, and exact entry of a fresh five-character code in a
  separate dialog. Permanent blocks remain non-overridable.
- UX: refreshes and navigation within the same rule still do not count; the
  stricter tab-return option is off by default and explained per rule.
- Practices:
  - Pure state transitions and versioned migrations keep existing rules safe.
  - Unit and extension E2E coverage exercises both counting modes, override
    failure states, expiry, service-worker restart, and intention privacy.

### [feature] Set the Visit Budget brand identity — 2026-08-21

- What: replace the original lettermark with a pause-and-progress icon whose
  lower green segment adds a small, friendly shirt-like silhouette.
- Why: the product needed a memorable mark that communicates deliberate pauses
  and remaining visits without becoming a generic lock or a noisy mascot.
- How: `docs/design/visit-budget-icon.svg` is the editable source; the icon
  generator produces the 16, 32, 48, and 128-pixel Chrome PNGs plus a design
  master. No extension behavior changed.
- UX: the ring, pause bars, and restrained lower accent remain recognizable at
  toolbar size while giving the brand a little personality.
- Practices:
  - One SVG source and `scripts/generate-icons.mjs` keep every icon size in
    sync.
  - Exact RGBA dimensions and visual inspection of the built assets catch
    small-size regressions before Store upload.

### [infra] Harden and package the 1.0.0 release — 2026-08-21

- What: align product, privacy, support, and store copy; validate runtime
  messages and blocked-page targets; add continuous integration and a production
  release validator.
- Why: the first public release needs accurate promises, minimal permissions,
  reproducible artifacts, and explicit checks against common extension risks.
- How: update development dependencies, omit source maps from production ZIPs,
  scan built code for network and dynamic-code primitives, inspect archive
  paths, and emit a SHA-256 checksum.
- Effect: maintainers have one documented release gate and users receive a
  package that contains only the extension's intended runtime assets.
- Practices:
  - `scripts/validate-release.mjs` checks manifest invariants, executable
    bundle contents, archive paths, and the checksum.
  - `docs/security-review.md` records permissions, data flows, residual risks,
    and the zero-finding dependency audit.

### [fix] Ignore vanished Chrome tabs — 2026-08-05

- What: the service worker no longer reports an extension error when Chrome says
  a tab id no longer exists.
- Why: tab activation and navigation events can arrive after a tab was closed or
  replaced, and logging that normal race showed Chrome's error badge.
- How: `src/background/service-worker.ts` treats only the exact
  `No tab with id` error from `chrome.tabs.get` as a harmless missing-tab case;
  other Chrome API failures still surface normally.
- UX: the Extensions page stays clean during ordinary tab churn.
- Practices:
  - The narrow Chrome API boundary keeps the expected race local without
    swallowing unrelated service-worker failures.
  - E2E coverage verifies the service worker remains free of runtime errors for
    vanished tabs and rapid tab activity.
