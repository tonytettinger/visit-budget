# Roadmap — Visit Budget

Last updated: 2026-09-13

## Milestone: Deliberate budgets 1.1

Outcome: Users can choose one understandable daily boundary for a site—visits,
active time, or a permanent block—then take necessary temporary access without
turning the guard into a text-completion exercise.

- Replace the written override gate with a bounded duration picker — retain the
  pause and code confirmation while removing filler text · plan:
  `docs/plans/deliberate-budgets-1-1/plan.md`
- Clarify optional tab-return counting in rule controls — make the stricter
  behaviour an informed per-rule choice, not a surprise · plan:
  `docs/plans/deliberate-budgets-1-1/plan.md`
- Add a per-rule choice between a daily visit budget and daily active-time
  budget — active time counts only in a selected tab in focused Chrome and does
  not become remote productivity surveillance · plan:
  `docs/plans/deliberate-budgets-1-1/plan.md`

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

- Private time awareness — consider an on-device daily/weekly dashboard with
  clear retention and deletion controls only after people find the active-time
  boundary useful · from: user
- Cross-device settings sync — useful only after accounts have a justified
  purpose beyond billing · from: original 1.0 non-goals
- Additional premium friction patterns — evaluate from real user requests, not
  speculative feature bundling · from: user

## Shipped

- Deliberate friction controls — optional per-rule tab-return counting plus
  repeatable, private, code-confirmed emergency overrides · 2026-08-21 ·
  changelog: [feature] Add deliberate friction controls · plan:
  `docs/plans/deliberate-friction-controls/plan.md`
- Release-ready 1.0 foundation — local-only privacy model, security review,
  deterministic production packaging, and Store submission materials ·
  2026-08-21 · changelog: [infra] Harden and package the 1.0.0 release
