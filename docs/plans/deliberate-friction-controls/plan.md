# Plan: Deliberate friction controls

PRD: `docs/PRD.md` §v0.1 scope

Architecture impact: none; extends the existing core → platform → UI flow

Stories covered: US-1, US-2, US-3, US-4, US-5

Status: in progress

Delivery: direct commits to `main`

## Phase 1 — Optional tab-return counting

Status: done · 2026-08-05

Checkpoint: yes — a rule can enable strict tab-return counting and Chrome
demonstrates both counting modes

- Does: add the default-off per-rule setting, migrate existing rules safely,
  honor daily locks, and count matching tab activations exactly once when it is
  enabled.
- Stories: US-1, US-2
- Files: `src/core/types.ts`, `src/core/rules.ts`, `src/core/state.ts`,
  `src/platform/storage.ts`, `src/background/service-worker.ts`,
  `src/ui/options.ts`, `public/options.html`, `tests/unit/`,
  `tests/e2e/visit-budget.spec.ts`, `README.md`
- Test: unit coverage for migration and locked changes; E2E coverage for strict
  same-rule tab returns, ordinary mode, refresh, and navigation; browser-focus
  return remains a manual Chrome check because headless Chromium cannot lose OS
  focus
- Commit: `feat: add optional tab-return counting`
- Rollback: revert

## Phase 2 — Repeatable private override baseline

Status: todo

Checkpoint: no

- Does: migrate away from the once-daily emergency-pass flag, make expired
  overrides repeatable, require a trimmed 50-character intention, and retire
  emergency-pass terminology without persisting the intention.
- Stories: US-3, US-5
- Files: `src/core/types.ts`, `src/core/engine.ts`, `src/platform/storage.ts`,
  `src/shared/messages.ts`, `src/background/service-worker.ts`,
  `src/ui/blocked.ts`, `src/content/guard.ts`, `public/blocked.html`,
  `tests/unit/`, `tests/e2e/visit-budget.spec.ts`
- Test: unit coverage for migration, minimum length, expiry, repeat use, and
  permanent-block rejection; E2E assertion that intention text never reaches
  storage
- Commit: `feat: make emergency overrides repeatable`
- Rollback: revert

## Phase 3 — Code-confirmation interface

Status: todo

Checkpoint: yes — exhausted sites require the full pause, intention, modal code,
and confirmation flow before access

- Does: add fail-closed session challenges with fresh unambiguous codes and the
  accessible second-step confirmation dialog on both blocked-page and preserved
  overlay surfaces.
- Stories: US-3, US-4, US-5
- Files: `src/core/types.ts`, `src/shared/messages.ts`,
  `src/background/service-worker.ts`, `src/ui/blocked.ts`,
  `src/content/guard.ts`, `public/blocked.html`, `public/styles.css`,
  `docs/DESIGN.md`, `tests/e2e/visit-budget.spec.ts`
- Test: E2E coverage for wrong code, cancellation, regenerated code, successful
  10-minute access, expiry/retry, permanent blocks, and service-worker restart
- Commit: `feat: require code confirmation for overrides`
- Rollback: revert

## Phase 4 — Contract, privacy, and release hardening

Status: todo

Checkpoint: yes — the unpacked extension and deterministic ZIP are ready for
manual Chrome review

- Does: align the product contract, store copy, and privacy text with the new
  counting and override behavior; run complete automated and live verification;
  rebuild the deterministic package.
- Stories: US-1, US-2, US-3, US-4, US-5
- Files: `README.md`, `docs/chrome-web-store-submission.md`,
  `docs/privacy-policy.md`, `docs/PRD.md`, `docs/GLOSSARY.md`,
  `docs/plans/deliberate-friction-controls/plan.md`, `artifacts/`
- Test: `npm run check`, `npm run test:e2e`, `npm run package`, plus live Chrome
  journeys for both counting modes and the full override flow
- Commit: `docs: finalize deliberate friction controls`
- Rollback: revert; generated ZIP can be recreated from the previous commit
