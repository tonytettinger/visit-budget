# Plan: Deliberate budgets 1.1

PRD: `docs/PRD.md` §Current scope  
Architecture: `ARCHITECTURE.md`; ADR 001  
Stories covered: US-1 through US-6  
Status: approved  
Repo: `git@github.com:tonytettinger/visit-budget.git`  
Delivery: direct commits to `main`

## Phase 1 — Add explicit budget types and migratable core state

Status: done

Checkpoint: no

- Does: replace the ambiguous limited-rule shape with explicit visit and time
  budget types; migrate existing rules and usage safely; queue a visit/time
  mode change for the next local midnight.
- Stories: US-1, US-3
- Files: `src/core/types.ts`, `src/core/rules.ts`, `src/core/state.ts`,
  `src/ui/options.ts`, `tests/unit/rules.test.ts`, `tests/unit/state.test.ts`,
  `docs/GLOSSARY.md`
- Test: migration of existing visit rules, valid 15-minute to four-hour time
  budgets, and next-day mode scheduling.
- Commit: `feat(budgets): add local time-budget state`
- Rollback: revert

## Phase 2 — Track active time and enforce it locally

Status: todo

Checkpoint: no

- Does: add pure time-budget status transitions, then settle time only for a
  matching selected tab in focused Chrome; stop
  it on tab, window, navigation, startup, and permission transitions; schedule
  the next active-time or override expiry; retain page DOM beneath a time-limit
  overlay and reconcile future navigation.
- Stories: US-2, US-3, US-4
- Files: `src/background/service-worker.ts`, `src/platform/maintenance.ts`,
  `src/core/types.ts`, `src/core/engine.ts`, `src/content/guard.ts`,
  `tests/unit/engine.test.ts`, `tests/e2e/visit-budget.spec.ts`,
  `ARCHITECTURE.md`
- Test: focused-tab accumulation, no background/window-blur accumulation,
  service-worker session recovery, expiry enforcement, and no double-counting
  from concurrent tab events.
- Commit: `feat(time): enforce focused-tab daily time budgets`
- Rollback: revert

## Phase 3 — Make the boundary and override flow understandable

Status: todo

Checkpoint: yes — settings clearly choose visit budget, time budget, or block;
an exhausted rule presents the prominent pause countdown, keyboard-operable
duration picker, and code confirmation on both blocked surfaces.

- Does: replace free-form override intention with the 5–60 minute two-digit
  native picker; make warning, confirmation, and success copy state the chosen
  duration; update the shared override messages and worker at the same time;
  add clear time-budget controls and remaining-time status; clarify the
  optional visit-only tab-return switch without changing its behaviour.
- Stories: US-1, US-3, US-4, US-5, US-6
- Files: `public/blocked.html`, `public/options.html`, `public/popup.html`,
  `public/styles.css`, `src/ui/blocked.ts`, `src/ui/options.ts`,
  `src/ui/popup.ts`, `src/content/guard.ts`, `src/core/engine.ts`,
  `src/shared/messages.ts`, `src/background/service-worker.ts`,
  `tests/unit/engine.test.ts`, `tests/unit/messages.test.ts`,
  `tests/e2e/visit-budget.spec.ts`, `docs/DESIGN.md`
- Test: an E2E journey selects a 25-minute override using the keyboard,
  rejects an incorrect code, preserves the selected duration on retry, grants
  only the selected duration after confirmation, and displays a time rule's
  remaining allowance.
- Commit: `feat(ui): add time budgets and duration overrides`
- Rollback: revert

## Phase 4 — Release one coherent 1.1.0 package

Status: todo

Checkpoint: yes — the version 1.1.0 ZIP, local product contract, privacy
policy, Store listing copy, and reviewer instructions describe one truthful
combined update.

- Does: update product and Store materials, retire all written-intention and
  fixed-ten-minute claims, document local active-time semantics and the
  next-day mode switch, bump versions, and create the production ZIP.
- Stories: US-1 through US-6
- Files: `README.md`, `docs/chrome-web-store-submission.md`,
  `docs/privacy-policy.md`, `public/manifest.json`, `package.json`,
  `package-lock.json`, `docs/PRD.md`, `docs/GLOSSARY.md`, `ARCHITECTURE.md`,
  `docs/plans/deliberate-budgets-1-1/plan.md`, `artifacts/`
- Test: `npm run check`, `npm run test:e2e`, `npm run package`, ZIP inspection,
  and manual verification of visit, time, override, and permanent-block
  journeys.
- Commit: `chore: prepare Visit Budget 1.1.0`
- Rollback: revert; regenerate the ZIP from the previous commit
