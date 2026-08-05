# Changelog

## Unreleased

### [fix] Ignore vanished Chrome tabs — 2026-08-05

- What: the service worker no longer reports an extension error when Chrome says
  a tab id no longer exists.
- Why: tab activation and navigation events can arrive after a tab was closed or
  replaced, and logging that normal race showed Chrome's error badge.
- How: `src/background/service-worker.ts` treats only the exact
  `No tab with id` error from `chrome.tabs.get` as a harmless missing-tab case;
  other Chrome API failures still surface normally. `tests/e2e/visit-budget.spec.ts`
  covers stale tab lookups and rapid open/close tab activity.
- UX: the Extensions page should stay clean during ordinary tab churn.
- Practices:
  - Narrow Chrome API boundary in `src/background/service-worker.ts` keeps the
    expected race local without swallowing unrelated service-worker failures.
  - Regression coverage in `tests/e2e/visit-budget.spec.ts` verifies the
    service worker remains free of runtime errors for vanished tabs.
