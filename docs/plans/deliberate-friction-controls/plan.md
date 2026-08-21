# Plan: Deliberate friction controls

PRD: `docs/PRD.md` §v0.1 scope

Architecture impact: none; extends the existing core → platform → UI flow

Stories covered: US-1, US-2, US-3, US-4, US-5

Status: in progress

Delivery: direct commits to `main`

## Phase 1 — Optional tab-return counting

Status: done · 2026-08-05 · `e7b431b`

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

Status: done · 2026-08-21 · `2672b68`

Checkpoint: no

- Does: migrate away from the once-daily emergency-pass flag, make expired
  overrides repeatable, require a trimmed 50-character intention, and retire
  emergency-pass terminology without persisting the intention.
- Stories: US-3, US-5
- Files: `src/core/types.ts`, `src/core/engine.ts`, `src/platform/storage.ts`,
  `src/shared/messages.ts`, `src/background/service-worker.ts`,
  `src/ui/blocked.ts`, `src/content/guard.ts`, `public/blocked.html`,
  `public/options.html`, `src/platform/maintenance.ts`, `src/ui/popup.ts`,
  `src/core/state.ts`, `src/platform/badge.ts`, `src/platform/blocking.ts`,
  `src/ui/options.ts`, `public/styles.css`, `tests/unit/`,
  `tests/e2e/visit-budget.spec.ts`
- Test: unit coverage for migration, minimum length, expiry, repeat use, and
  permanent-block rejection; E2E assertion that intention text never reaches
  storage
- Commit: `feat: make emergency overrides repeatable`
- Rollback: revert

## Phase 3 — Code-confirmation interface

Status: done · 2026-08-21

Checkpoint: no — moved to Phase 4 so the completed override flow, security audit,
and 1.0 release copy can be reviewed as one honest release candidate

- Does: add fail-closed session challenges with fresh unambiguous codes and the
  accessible second-step confirmation dialog on both blocked-page and preserved
  overlay surfaces.
- Stories: US-3, US-4, US-5
- Files: `src/core/types.ts`, `src/shared/messages.ts`,
  `src/core/engine.ts`, `src/background/service-worker.ts`, `src/ui/blocked.ts`,
  `src/content/guard.ts`, `public/blocked.html`, `public/styles.css`,
  `docs/DESIGN.md`, `tests/unit/engine.test.ts`,
  `tests/e2e/visit-budget.spec.ts`
- Test: unit coverage for expiry/retry; E2E coverage for wrong code,
  cancellation, regenerated code, successful 10-minute access, permanent
  blocks, and missing session challenge state failing closed
- Commit: `feat: require code confirmation for overrides`
- Rollback: revert

## Phase 4 — Contract, privacy, and release hardening

Status: todo

Checkpoint: yes — the unpacked extension and deterministic ZIP are ready for
manual Chrome review

- Does: align the product contract, attractive store copy, and privacy text with
  the implemented behavior; audit permissions, messages, remote-code and data
  paths; remediate dependency findings; set version 1.0.0; run complete
  automated and live verification; rebuild the deterministic package.
- Stories: US-1, US-2, US-3, US-4, US-5
- Files: `README.md`, `CHANGELOG.md`, `docs/chrome-web-store-submission.md`,
  `docs/privacy-policy.md`, `docs/security-review.md`, `docs/PRD.md`,
  `docs/GLOSSARY.md`, `docs/ROADMAP.md`, `docs/deploys.log`,
  `docs/plans/deliberate-friction-controls/plan.md`, `package.json`,
  `package-lock.json`, `public/manifest.json`, `public/options.html`,
  `src/ui/options.ts`, `scripts/`, `artifacts/`
- Test: `npm audit`, `npm run check`, `npm run test:e2e`,
  `npm run package`, release-artifact inspection, plus live Chrome journeys for
  both counting modes and the full override flow
- Commit: `chore: prepare Visit Budget 1.0.0`
- Rollback: revert; generated ZIP can be recreated from the previous commit
