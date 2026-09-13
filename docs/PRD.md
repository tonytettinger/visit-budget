# Visit Budget — PRD

Status: active
Last updated: 2026-09-13

## Launch announcement

Visit Budget adds deliberate friction before automatic website checking and
extended scrolling. People can choose one per-site daily boundary: a visit
budget, an active-time budget, or a permanent block. When a limited site's
budget is exhausted, access remains possible through a repeatable but
intentionally demanding emergency override with a temporary, user-chosen
duration. All rules and usage stay on the device.

## FAQ

### What counts as a visit?

An entry from an untracked or differently tracked site counts. A rule may also
enable tab-return counting, where activating its site after viewing any other
tab counts. Refreshes, navigation within the same effective rule, and returning
after Chrome loses focus do not count.

### What counts as active time?

Active time accumulates only while a matching tab is selected in the focused
Chrome window. It stops immediately when a different tab is selected, Chrome
loses focus, the tab leaves the rule, or the rule is blocked. It does not try to
infer whether someone is typing, reading, or away from their desk.

### How much active time can a rule allow?

A time budget is 15 minutes to four hours per day in 15-minute steps, with 30
minutes as the initial value for a new time-budget rule.

### Can a rule combine a visit budget and a time budget?

No. A rule is exactly one of visit budget, time budget, or permanent block. The
choice keeps the boundary understandable rather than asking users to interpret
two competing limits.

### Can changing budget type reset today's allowance?

No. Moving between visit and time budgets is scheduled for the next local
midnight and the pending change is shown in settings. This prevents mode
switching from becoming a quiet way to bypass a budget that has already ended.

### Can a user always override an exhausted budget?

Yes, for visit- and time-budget rules. Every override requires a 15-second pause, a
choice of 5–60 minutes in five-minute steps, and a separate confirmation
interface with an exact five-character code. After expiry, the entire flow may
be repeated.

### Can permanent blocks be overridden?

No. Permanent blocks remain absolute within the extension.

### Is the chosen override duration saved as a preference?

No. It applies only to the current override session. The resulting expiry is
stored locally so the extension can end the session reliably.

### Is this an unbreakable lock?

No. A person can uninstall the extension, change browsers or profiles, or
otherwise bypass Chrome-level enforcement. The product interrupts habits; it
does not claim to replace self-control.

## Problem

Website limits often fail in two opposite ways: they are easy to bypass during
automatic checking, or so rigid that people disable them when access is
legitimately necessary. Visit Budget needs configurable counting and an escape
hatch that remains available without becoming effortless.

## Target user & core job

The target user notices themselves reopening distracting or compulsively
checked sites during ordinary desktop browsing. Their core job is to turn an
automatic re-entry into a conscious decision while retaining access when it is
genuinely needed.

## Current scope

- Per-site visit-budget, time-budget, and permanent-block rules with existing
  host/path matching, local-day reset, and optional daily locking.
- One explicit boundary per rule: visit budget, active-time budget, or
  permanent block.
- A per-rule, default-off option to count returning from any other tab as a new
  visit, including returns between tabs matched by the same rule. It is not
  shown for time-budget rules.
- Active-time measurement that counts only a matching active tab in a focused
  Chrome window and enforces a 15-minute to four-hour daily budget without
  replacing the current page.
- Repeatable emergency overrides for exhausted visit- and time-budget rules,
  each lasting
  5–60 minutes in five-minute steps.
- A two-step override interface: 15-second pause plus an accessible two-digit
  duration picker, followed by a separate confirmation dialog containing a
  random code.
- Local-only rules, usage, challenge state, and enforcement.

## User stories

US-1: As a user, I can enable tab-return counting for one rule so that revisiting
that site through tab switching consumes my limited attention budget.

AC: Given the option is enabled, when I activate a matching tab after any other
tab, exactly one visit is consumed; the option defaults off and locked edits are
queued until tomorrow.

US-2: As a user, ordinary page activity does not accidentally consume visits.

AC: Given either counting mode, when I refresh, navigate within the same
effective rule, or refocus Chrome, no visit is consumed.

US-3: As a user, I can choose an active-time budget for a site so that its
daily allowance is spent only while I am actually viewing that site.

AC: Given a time-budget rule, when its matching tab is active in focused
Chrome, its remaining time decreases; when another tab is selected or Chrome
loses focus, it does not.

US-4: As a user with an exhausted visit or time budget, I can deliberately request a
bounded period of temporary access.

AC: Given an exhausted visit- or time-budget rule, when 15 seconds have elapsed, I can
choose 5–60 minutes in five-minute steps with keyboard-operable digit
selectors; a separate confirmation interface displays a random five-character
code.

US-5: As a user, I must prove deliberate intent before access is restored.

AC: Given the confirmation interface, when I enter the exact case-sensitive
code and confirm, I receive the duration I chose; an incorrect code or
cancellation grants nothing.

US-6: As a privacy-conscious user, I can use the override without supplying
free-form personal text.

AC: Given any successful, failed, cancelled, or abandoned override attempt,
the extension stores only its local expiry and never collects, sends, or
analyses page content or free-form user text.

## Out of scope

- Overrides for permanent-block rules.
- Saving, displaying, syncing, or analysing free-form override reasons.
- AI or heuristic evaluation of override reasons.
- Configurable pause duration, confirmation-code length, or a saved default
  override duration.
- Override durations below five minutes, above 60 minutes, or outside
  five-minute increments.
- Escalating friction based on how many overrides were used.
- Historical time reports, time-spent dashboards, productivity scoring, or
  idle/keyboard/mouse monitoring.
- Paid plans, payments, accounts, licences, and entitlement restoration.
- Cross-device synchronization or cloud backup.
- Product analytics, advertising, affiliate injection, or monetizing browsing
  activity.
- Mobile, OS-level, router-level, or enterprise enforcement.
- Preventing uninstall, alternate-browser, or alternate-profile bypasses.

Historical time awareness and a paid upgrade are deferred internal roadmap
ideas, not part of the public 1.1 promise.

## Edge cases & states

- A change between visit and time budget is scheduled for the next local
  midnight even when daily locking is off; permanent-block changes follow the
  existing editing rules.
- With tab-return counting off, switching between tabs matched by the same rule
  does not count; leaving the rule and returning does.
- With tab-return counting on, activating a matching tab after any different tab
  counts, even when the other tab matches the same rule.
- Repeated activation events for one transition consume at most one visit.
- Enabling the option while its site is active does not retroactively consume a
  visit; the next eligible return does.
- While an override session is active, no new challenge is offered.
- When a time budget reaches zero while its page is visible, the existing page
  remains beneath the blocking overlay; a future navigation is also blocked.
- After an override expires, the next attempt starts again with the full pause,
  duration choice, and code flow.
- The duration picker never presents an invalid value: 00 minutes becomes five
  minutes and 65 minutes becomes 60 minutes before confirmation is available.
- The code uses unambiguous letters and digits, is case-sensitive, and is
  regenerated when the confirmation interface is reopened.
- An incorrect code preserves the selected duration; cancelling or closing the
  page grants no access.
- Challenge expiry and service-worker restart fail closed: an invalid or missing
  challenge requires starting again.

## Data & storage

The persisted rule schema stores the selected budget type, its limit, and
whether tab-return counting is enabled for visit budgets. Daily usage stores
visit counts or active milliseconds, an optional running active-time segment,
and any active override expiry, but no daily override cap. Temporary challenge
issue time and expected code may use
`chrome.storage.session` so service-worker suspension does not grant access or
silently bypass a challenge. The chosen duration is passed only through the
local extension message flow and becomes an expiry timestamp.

No browsing data, page content, or challenge values leave the device.

## Success criteria / definition of done

- Existing rules migrate with tab-return counting disabled.
- Both visit-counting modes match their acceptance criteria across multiple tabs
  and windows without double-counting.
- Active time stops in every non-active state and resumes accurately after a
  service-worker restart, browser focus change, local-day reset, or scheduled
  mode change.
- The first blocked override and every later override for either budget type
  require the full friction
  flow and grant the selected valid duration.
- Permanent blocks never expose the override flow.
- The confirmation interface is keyboard accessible, clearly separate from the
  duration picker, and uses neutral language.
- Unit tests, extension E2E tests, type-checking, linting, formatting, build, and
  deterministic packaging pass.
- Inspection confirms no free-form user text is collected or transmitted.

## Riskiest assumptions

- A bounded duration picker plus the code confirmation remain inconvenient
  enough that users do not routinely treat the challenge as a normal navigation
  step.
- Users understand the difference between ordinary re-entry counting and
  stricter tab-return counting from one short setting description.
- Users understand that active time means a visible, focused tab rather than
  keyboard or mouse activity.

## Kill criteria

Park or remove tab-return counting if users cannot predict when it consumes a
visit after one explanation. Reconsider unlimited overrides if normal usage
shows that people repeatedly complete the flow without changing their browsing
decision, or if the challenge causes users to disable the extension more often
than it helps them regain intentional control. Park time budgets if people find
the active-time boundary confusing or it causes the extension to feel like a
surveillance tool rather than a personal guardrail.

## Open questions

None for this implementation slice.
