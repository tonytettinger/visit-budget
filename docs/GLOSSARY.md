# Glossary — Visit Budget

<!-- Ubiquitous language: one term per concept, used identically in conversation,
     code, UI, and docs. -->

## Rules and counting

**Rule** — A hostname and optional path scope configured as a daily visit
budget, daily time budget, or permanent block. A rule owns its counting mode
and daily-lock setting. Code: `src/core/types.ts`.

**Visit** — One counted entry into a visit-limit rule. The first `N` visits are
allowed and entry `N + 1` is blocked.

**Re-entry** — Returning to a rule after viewing a page that does not match that
same effective rule. Re-entry counts regardless of the tab-return setting.

**Tab-return counting** — A default-off rule setting that also counts activation
of a matching tab after any different tab was active, including another tab
matched by the same rule. It never makes refresh, same-rule navigation, or
browser-focus return count.

**Permanent block** — A rule that denies every matching entry and never offers
an emergency override.

## Deliberate access

**Emergency override** — A repeatable high-friction path through an exhausted
visit- or time-budget rule. It requires a 15-second pause, a 5–60 minute
duration choice in five-minute steps, and exact entry of a random
five-character code. Use this term in new UI and code; “emergency pass” is the
retired name for the former once-per-day behavior.

**Override duration** — The temporary access length chosen for one emergency
override. It is not a rule setting or saved preference; it becomes the local
expiry of that one override session.

**Active time** — Time counted only while a rule-matching tab is selected in
the focused Chrome window. It is not an estimate of attention, typing, mouse
movement, or reading; it stops when another tab is selected or Chrome loses
focus.

**Time budget** — A per-rule daily allowance of active time, set instead of a
visit budget. A rule has one boundary type: visit budget, time budget, or
permanent block. Switching between visit and time budget takes effect at the
next local midnight so today's allowance cannot be reset by changing mode.

**Override challenge** — The temporary, fail-closed state containing the pause
deadline and expected confirmation code. It may survive service-worker
suspension in session storage, but it is not part of persisted daily history.

**Override session** — The 5–60 minute access window created by a successful
override challenge. While it is active, matching access is allowed without
another challenge.

**Daily lock** — An optional commitment that keeps a rule unchanged until the
next local-day reset. Replacement or deletion is queued for tomorrow rather
than applied immediately.
