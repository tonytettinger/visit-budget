# Roadmap — Visit Budget

Last updated: 2026-08-05

## Milestone: Deliberate friction controls

Outcome: Users can choose stricter tab-return counting and still regain urgent
access only through a repeatable, high-friction confirmation flow.

- Optional tab-return counting — make attention-return semantics configurable
  per rule without changing refresh or navigation behavior · plan:
  `docs/plans/deliberate-friction-controls/plan.md`
- Repeatable emergency overrides — replace the once-daily pass with a private
  15-second, 50-character, code-confirmed flow · plan:
  `docs/plans/deliberate-friction-controls/plan.md`

## Milestone: Private time awareness

Outcome: Users can understand active time spent on selected sites without
turning their browsing history into a remote analytics product.

- Define active-time semantics — distinguish visible, focused use from an idle
  or background tab before collecting new data.
- Build an on-device time dashboard — show useful daily and weekly patterns with
  explicit retention and deletion controls.
- Validate demand — confirm that time awareness changes behavior before adding
  billing or account infrastructure.

## Milestone: Optional premium upgrade

Outcome: Users can pay for additional focus tools while the useful free visit
budget and permanent blocking remain intact.

- Choose premium features from demonstrated demand — do not paywall existing
  core enforcement or manufacture friction to force conversion.
- Add external billing and entitlement restoration — Chrome Web Store payments
  are not the implementation path; clearly identify the seller and disclose
  in-app purchases when this functionality exists.
- Add the minimum account backend needed for purchases — keep browsing activity
  and written intentions out of billing and identity systems.
- Re-audit EEA trader status, terms, refunds, privacy disclosures, and Chrome Web
  Store policy before launch.

## Later

- Cross-device settings sync — useful only after accounts have a justified
  purpose beyond billing · from: original V1 non-goals
- Additional premium friction patterns — evaluate from real user requests, not
  speculative feature bundling · from: user

## Shipped

- Personal-first visit budgets, permanent blocks, daily locks, local-only state,
  page-preserving guards, and one daily emergency pass — 2026-07-31
