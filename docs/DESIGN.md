# Design — Visit Budget

## Principles

- **Calm over punitive:** friction should slow an automatic action without using
  shame, alarmist color, or motivational slogans.
- **One decision per surface:** the rule editor asks for one boundary type; the
  blocked view explains the state and lets a person choose only the access time
  they need; the confirmation dialog asks for the final commitment.
- **Predictable over clever:** labels describe exactly what counts, controls use
  familiar browser form patterns, and motion never carries essential meaning.
- **Trust is visible:** local-only behavior and the absence of saved override
  reasoning are stated where they affect a decision, without oversized privacy
  theatre.

## Tokens

The current implementation source is `public/styles.css`. This reconstructed
block documents the existing light-first system; it is not yet mechanically
generated from this file. Before changing global token values, add a small sync
script and drift check rather than maintaining two editable copies.

```css
:root {
  --accent: #155de0;
  --accent-hover: #0f4fc4;
  --accent-soft: #eaf1ff;
  --background: #ffffff;
  --border: #d8dce5;
  --border-strong: #c5cad5;
  --danger: #a0392c;
  --muted: #5f6673;
  --muted-soft: #f6f7f9;
  --text: #17191f;
  --warning: #9a5a00;
  --radius: 10px;
  --shadow: 0 14px 40px rgb(22 28 45 / 10%);
}
```

Typography uses the system sans-serif stack already declared in
`public/styles.css`. Spacing follows the existing roughly 4/8px rhythm. The
product remains light-first in 1.0; dark mode is not part of this feature.

## Layout

- The popup is a compact single-column status surface.
- Options use a rule list and editor split on wide screens, collapsing to one
  column at narrow widths.
- Blocked navigation and preserved-page overlays share the same hierarchy:
  reason, exit action, override explanation, then a deliberate duration choice.
- The override confirmation is a custom modal dialog inside the current blocked
  surface, not a new browser window. This preserves context, avoids popup
  blockers and new permissions, and still creates a clearly separate second
  interface.

## Components

**Brand mark** — A transparent pause-and-progress mark pairs a bold pause
symbol with an incomplete visit ring and a subtle browser-window contour. The
small green lower segment adds a little personality at toolbar size while the
mark still expresses deliberate interruption and remaining budget without
relying on initials, a generic lock, gradients, or punitive stop symbols. The editable
source is `docs/design/visit-budget-icon.svg`; run `npm run icons` to generate
the 16, 32, 48, and 128px Chrome PNGs plus the design master. Preserve the
eight-pixel transparent safe area so the mark stays clear in both the toolbar
and Chrome Web Store.

**Buttons** — Primary actions use the accent fill; secondary actions use an
accent outline; destructive text actions use the danger token. Disabled state
must remain visibly distinct and expose native disabled semantics.

**Fields** — Labels stay above controls, supporting text explains constraints,
errors appear next to the affected action, and focus uses the existing visible
accent ring.

**Budget type** — One select offers “Daily visit budget”, “Daily time budget”,
and “Block completely”. The matching limit field changes its label and unit;
the visit-only tab-return checkbox is hidden for time budgets. A change between
the two budget types states that it applies tomorrow before the user saves.

**Rule option** — Checkbox with a direct title and one sentence describing
counting behavior. Advanced options remain visually subordinate to hostname,
budget type, and daily limit.

**Override duration picker** — Two side-by-side digit selectors choose a
5–60-minute duration in five-minute steps. Each selector is a native select,
so arrow keys work without exposing a free-form text field. Together, the
digits sit inside one compact time case with a shared outline and central
divider, rather than two unrelated fields. The unit label remains outside the
case so “05 minutes” reads as one duration. Invalid visual combinations are
normalised immediately; the continue action remains disabled until the
15-second pause has ended.

**Time-budget help** — The focused-tab explanation is a full-width helper line
below the mode-and-limit row. It never changes the height or vertical alignment
of the limit selector beside the mode picker.

**Confirmation dialog** — Modal with the heading “Are you sure?”, concise
consequence text, a visually readable five-character code, one exact-entry
field, Cancel, and Confirm override. Wrong-code errors stay inside the dialog;
cancelling returns to the duration picker without granting access.

## Interaction

- The 15-second timer begins when the blocked context is first presented.
- A time-budget status says “active time” and shows time remaining, never an
  attention or productivity score.
- Reaching a time budget keeps the underlying page in place beneath the same
  overlay used for an exhausted visit budget.
- Opening the confirmation dialog generates a fresh unambiguous,
  case-sensitive five-character code.
- An incorrect code preserves the selected duration and lets the user retry the
  current code. Closing and reopening the dialog generates a new code.
- Successful confirmation opens the selected override session.
- Escape and Cancel close the dialog and never grant access.
- Motion is limited to short color/visibility transitions and respects reduced
  motion; no countdown animation is required.

## Accessibility

- WCAG AA contrast is the floor for text, controls, and focus indicators.
- Interactive targets remain at least 40px high where space permits.
- The confirmation uses native dialog semantics or an equivalent labelled,
  focus-trapped implementation with focus returned to its trigger on close.
- Status and validation changes use appropriate live regions without announcing
  every countdown tick.
- All actions are keyboard reachable and do not depend on color alone.
