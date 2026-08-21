# Plan: Store brand icon

PRD: `docs/PRD.md` (product purpose and tone)

Architecture impact: none

Stories covered: none — deliberate store-readiness one-off outside the current
roadmap milestone

Status: in progress

Delivery: direct commits to `main`

## Phase 1 — Quiet budget-ring mark

Status: done · 2026-08-21

Checkpoint: yes — Chrome and the Web Store assets use a crisp, letter-free
Visit Budget mark at every required icon size

- Does: replace the generic “VB” artwork with a flat cobalt budget-ring mark,
  keep an editable vector source, generate the required PNG sizes, use the same
  mark across extension surfaces, and rebuild the unpacked extension.
- Stories: none
- Files: `docs/design/visit-budget-icon.svg`,
  `docs/design/visit-budget-icon-master.png`, `docs/DESIGN.md`,
  `scripts/generate-icons.mjs`, `package.json`, `public/icons/`,
  `public/options.html`, `public/popup.html`, `public/blocked.html`,
  `public/styles.css`, `src/content/guard.ts`,
  `src/ui/permission-consent.ts`,
  `docs/plans/store-brand-icon/plan.md`
- Test: no automated UI test — appearance is not behavioral; validate exact PNG
  dimensions and alpha, run the project checks, then visually inspect 128px and
  16px renderings from the built extension.
- Commit: `feat: refresh Visit Budget brand icon`
- Rollback: revert; the previous generated artwork remains available in Git

## Phase 2 — Pause-progress mark

Status: done · 2026-08-21

Checkpoint: yes — the chosen pause-and-progress direction is visible in Chrome
and remains recognizable in the 16px toolbar asset

- Does: replace the first ring-and-arrow exploration with the selected
  pause-progress direction, simplify the browser cue, regenerate all Chrome
  icon sizes, and keep the mark letter-free and transparent.
- Stories: none
- Files: `docs/design/visit-budget-icon.svg`,
  `docs/design/visit-budget-icon-master.png`, `docs/DESIGN.md`,
  `public/icons/`, `docs/plans/store-brand-icon/plan.md`
- Test: no automated UI test — validate exact PNG dimensions and alpha, run
  project checks, and visually inspect the 128px and 16px renderings from the
  built extension.
- Commit: `feat: refine Visit Budget icon`
- Rollback: revert; Phase 1's mark is retained in Git

## Phase 3 — Bottom accent refinement

Status: done · 2026-08-21

Checkpoint: yes — the lower accent adds personality without reducing the
pause-and-progress reading at toolbar size

- Does: move the green progress segment to the bottom center so the compact
  mark has a subtle shirt-like silhouette while remaining a professional,
  letter-free icon.
- Stories: none
- Files: `docs/design/visit-budget-icon.svg`,
  `docs/design/visit-budget-icon-master.png`, `docs/DESIGN.md`,
  `public/icons/`, `docs/plans/store-brand-icon/plan.md`
- Test: no automated UI test — validate exact PNG dimensions and alpha, run
  project checks, and visually inspect the 128px and 16px renderings from the
  built extension.
- Commit: `feat: add bottom accent to Visit Budget icon`
- Rollback: revert; Phase 2's mark remains available in Git
