# Plan: Duration-based emergency overrides

Superseded by `docs/plans/deliberate-budgets-1-1/plan.md` on 2026-09-13. The
override redesign now ships with the agreed time-budget option in one 1.1.0
release.

PRD: `docs/PRD.md` §Current scope  
Architecture impact: none; extends the existing core → platform → UI flow  
Stories covered: US-3, US-4, US-5  
Status: superseded  
Repo: `git@github.com:tonytettinger/visit-budget.git`  
Delivery: direct commits to `main`

## Phase 1 — Make override duration a bounded core value

Status: todo

Checkpoint: no

- Does: replace free-form intention validation with a validated 5–60 minute,
  five-minute-step override duration; preserve permanent-block and exhausted
  budget checks; carry the duration through extension messages and the service
  worker into the stored session expiry.
- Stories: US-3, US-4, US-5
- Files: `src/core/engine.ts`, `src/shared/messages.ts`,
  `src/background/service-worker.ts`, `tests/unit/engine.test.ts`,
  `tests/unit/messages.test.ts`
- Test: four unit cases for valid lower/upper bounds and rejected zero,
  out-of-range, and non-step durations; update message validation coverage.
- Commit: `feat(override): support bounded access durations`
- Rollback: revert

## Phase 2 — Replace the intention gate with a duration picker

Status: todo

Checkpoint: yes — an exhausted limited site presents a prominent warning,
countdown, keyboard-operable two-digit minute picker, and code confirmation on
both the blocked page and the preserved-page overlay.

- Does: remove all free-form intention controls, present the natural-language
  warning above the countdown, add a 5–60 minute two-digit picker, make
  confirmation and success copy state the chosen duration, and clarify the
  optional tab-return-counting setting without changing its behaviour.
- Stories: US-3, US-4, US-5
- Files: `public/blocked.html`, `public/options.html`, `public/styles.css`,
  `src/ui/blocked.ts`, `src/ui/options.ts`, `src/content/guard.ts`,
  `tests/e2e/visit-budget.spec.ts`, `docs/DESIGN.md`
- Test: one E2E journey chooses 25 minutes with keyboard controls, rejects an
  incorrect code, preserves the chosen duration on retry, and grants the
  selected temporary access after exact confirmation.
- Commit: `feat(override): add a keyboard-friendly duration picker`
- Rollback: revert

## Phase 3 — Align product and Store release materials

Status: todo

Checkpoint: yes — version 1.1.0 has an honest local package, user-facing
contract, privacy policy, and reviewer instructions ready to upload.

- Does: remove obsolete intention claims, describe the duration picker and
  retained confirmation friction everywhere users or reviewers see it, update
  version numbers, and create the production ZIP.
- Stories: US-3, US-4, US-5
- Files: `README.md`, `docs/chrome-web-store-submission.md`,
  `docs/privacy-policy.md`, `public/options.html`, `public/manifest.json`,
  `package.json`, `package-lock.json`, `docs/PRD.md`, `docs/GLOSSARY.md`,
  `docs/plans/duration-based-overrides/plan.md`, `artifacts/`
- Test: `npm run check`, `npm run test:e2e`, `npm run package`, and release ZIP
  inspection; manual verification of the blocked-page and existing-tab flows.
- Commit: `chore: prepare Visit Budget 1.1.0`
- Rollback: revert; regenerate the ZIP from the previous commit
