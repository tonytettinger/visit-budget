# Glossary — Visit Budget

<!-- Ubiquitous language: one term per concept, used identically in conversation,
     code, UI, and docs. -->

## Rules and counting

**Rule** — A hostname and optional path scope configured as either a daily visit
limit or a permanent block. A rule owns its counting mode and daily-lock
setting. Code: `src/core/types.ts`.

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
visit-limit rule. It requires a 15-second pause, a trimmed intention of at least
50 characters, and exact entry of a random five-character code before granting
one 10-minute override session. Use this term in new UI and code; “emergency
pass” is the retired name for the former once-per-day behavior.

**Override challenge** — The temporary, fail-closed state containing the pause
deadline and expected confirmation code. It may survive service-worker
suspension in session storage, but it is not part of persisted daily history.

**Override session** — The 10-minute access window created by a successful
override challenge. While it is active, matching access is allowed without
another challenge.

**Daily lock** — An optional commitment that keeps a rule unchanged until the
next local-day reset. Replacement or deletion is queued for tomorrow rather
than applied immediately.
