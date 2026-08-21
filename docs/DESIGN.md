# Design — Visit Budget

## Principles

- **Calm over punitive:** friction should slow an automatic action without using
  shame, alarmist color, or motivational slogans.
- **One decision per surface:** the blocked view explains the state, the
  intention step captures purpose, and the confirmation dialog asks for the
  final commitment.
- **Predictable over clever:** labels describe exactly what counts, controls use
  familiar browser form patterns, and motion never carries essential meaning.
- **Trust is visible:** local-only behavior and ephemeral intention text are
  stated where they affect a decision, without oversized privacy theatre.

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
  reason, exit action, override explanation, then deliberate input.
- The override confirmation is a custom modal dialog inside the current blocked
  surface, not a new browser window. This preserves context, avoids popup
  blockers and new permissions, and still creates a clearly separate second
  interface.

## Components

**Brand mark** — A transparent pause-and-progress mark pairs a bold pause
symbol with an incomplete visit ring and a subtle browser-window contour. It
expresses deliberate interruption and remaining budget without relying on
initials, a generic lock, gradients, or punitive stop symbols. The editable
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

**Rule option** — Checkbox with a direct title and one sentence describing
counting behavior. Advanced options remain visually subordinate to hostname,
mode, and daily limit.

**Intention field** — Multiline text input with a live `current / 50` counter.
The continue action remains disabled until the pause has ended and the trimmed
minimum is met.

**Confirmation dialog** — Modal with the heading “Are you sure?”, concise
consequence text, a visually readable five-character code, one exact-entry
field, Cancel, and Confirm override. Wrong-code errors stay inside the dialog;
cancelling returns to the intention step without granting access.

## Interaction

- The 15-second timer begins when the blocked context is first presented.
- Opening the confirmation dialog generates a fresh unambiguous,
  case-sensitive five-character code.
- An incorrect code preserves the intention and lets the user retry the current
  code. Closing and reopening the dialog generates a new code.
- Successful confirmation immediately discards the intention and opens the
  10-minute override session.
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
