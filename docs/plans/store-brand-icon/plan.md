# Plan: Store brand icon

PRD: `docs/PRD.md` (product purpose and tone)

Architecture impact: none

Stories covered: none — deliberate store-readiness one-off outside the current
roadmap milestone

Status: done

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
