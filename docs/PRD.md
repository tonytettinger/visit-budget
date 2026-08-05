# Visit Budget — PRD

Status: active
Last updated: 2026-08-05

## Launch announcement

Visit Budget adds deliberate friction before automatic website checking. People
can set per-site visit budgets, optionally count returns from other tabs, and
permanently block selected sites. When a limited site's budget is exhausted,
access remains possible through a repeatable but intentionally demanding
emergency override. All rules and usage stay on the device.

## FAQ

### What counts as a visit?

An entry from an untracked or differently tracked site counts. A rule may also
enable tab-return counting, where activating its site after viewing any other
tab counts. Refreshes, navigation within the same effective rule, and returning
after Chrome loses focus do not count.

### Can a user always override an exhausted budget?

Yes, for visit-limit rules. Every override requires a 15-second pause, a
trimmed intention of at least 50 characters, and a separate confirmation
interface with an exact five-character code. Successful confirmation grants
10 minutes of access. After expiry, the entire flow may be repeated.

### Can permanent blocks be overridden?

No. Permanent blocks remain absolute within the extension.

### Is the written intention saved?

No. It is validated only while confirming an override and is never stored,
logged, or transmitted.

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

## v0.1 scope (smallest shippable)

- Per-site visit-limit and permanent-block rules with existing host/path
  matching, local-day reset, and optional daily locking.
- A per-rule, default-off option to count returning from any other tab as a new
  visit, including returns between tabs matched by the same rule.
- Repeatable 10-minute emergency overrides for exhausted visit-limit rules.
- A two-step override interface: 15-second pause plus 50-character intention,
  followed by a separate confirmation dialog containing a random code.
- Local-only rules, usage, challenge state, and enforcement; intention text is
  ephemeral.

## User stories (v0.1)

US-1: As a user, I can enable tab-return counting for one rule so that revisiting
that site through tab switching consumes my limited attention budget.

AC: Given the option is enabled, when I activate a matching tab after any other
tab, exactly one visit is consumed; the option defaults off and locked edits are
queued until tomorrow.

US-2: As a user, ordinary page activity does not accidentally consume visits.

AC: Given either counting mode, when I refresh, navigate within the same
effective rule, or refocus Chrome, no visit is consumed.

US-3: As a user with an exhausted visit budget, I can deliberately request
temporary access.

AC: Given an exhausted visit-limit rule, when 15 seconds have elapsed and I enter
at least 50 trimmed characters, a separate confirmation interface displays a
random five-character code.

US-4: As a user, I must prove deliberate intent before access is restored.

AC: Given the confirmation interface, when I enter the exact case-sensitive code
and confirm, I receive 10 minutes of access; an incorrect code or cancellation
grants nothing.

US-5: As a privacy-conscious user, my written intention remains private and
temporary.

AC: Given any successful, failed, cancelled, or abandoned override attempt, the
intention is absent from local storage, session storage, logs, and network
requests.

## Out of scope (v0.1)

- Overrides for permanent-block rules.
- Saving, displaying, syncing, or analyzing written intentions.
- AI or heuristic evaluation of intention quality.
- Configurable pause duration, intention length, confirmation-code length, or
  override-session duration.
- Escalating friction based on how many overrides were used.
- Time-spent measurement, historical dashboards, or productivity scoring.
- Paid plans, payments, accounts, licences, and entitlement restoration.
- Cross-device synchronization or cloud backup.
- Product analytics, advertising, affiliate injection, or monetizing browsing
  activity.
- Mobile, OS-level, router-level, or enterprise enforcement.
- Preventing uninstall, alternate-browser, or alternate-profile bypasses.

Time measurement and a paid upgrade are deferred internal roadmap ideas, not
part of the public v0.1 promise.

## Edge cases & states

- With tab-return counting off, switching between tabs matched by the same rule
  does not count; leaving the rule and returning does.
- With tab-return counting on, activating a matching tab after any different tab
  counts, even when the other tab matches the same rule.
- Repeated activation events for one transition consume at most one visit.
- Enabling the option while its site is active does not retroactively consume a
  visit; the next eligible return does.
- While an override session is active, no new challenge is offered.
- After an override expires, the next attempt starts again with the full pause,
  intention, and code flow.
- The code uses unambiguous letters and digits, is case-sensitive, and is
  regenerated when the confirmation interface is reopened.
- An incorrect code preserves the intention; cancelling or closing the page
  discards it and grants no access.
- Challenge expiry and service-worker restart fail closed: an invalid or missing
  challenge requires starting again.

## Data & storage

The persisted rule schema stores whether tab-return counting is enabled. Daily
usage stores visit counts and any active override expiry, but no daily override
cap. Temporary challenge issue time and expected code may use
`chrome.storage.session` so service-worker suspension does not grant access or
silently bypass a challenge. Intention text stays only in the blocked interface
until submitted for validation and is immediately discarded.

No browsing data, intentions, or challenge values leave the device.

## Success criteria / definition of done

- Existing rules migrate with tab-return counting disabled.
- Both counting modes match their acceptance criteria across multiple tabs and
  windows without double-counting.
- The first blocked override and every later override require the full friction
  flow and grant exactly 10 minutes.
- Permanent blocks never expose the override flow.
- The confirmation interface is keyboard accessible, clearly separate from the
  intention step, and uses neutral language.
- Unit tests, extension E2E tests, type-checking, linting, formatting, build, and
  deterministic packaging pass.
- Inspection confirms no intention is persisted or transmitted.

## Riskiest assumptions

- Repeated overrides remain inconvenient enough that users do not routinely
  treat the challenge as a normal navigation step.
- Users understand the difference between ordinary re-entry counting and
  stricter tab-return counting from one short setting description.

## Kill criteria

Park or remove tab-return counting if users cannot predict when it consumes a
visit after one explanation. Reconsider unlimited overrides if normal usage
shows that people repeatedly complete the flow without changing their browsing
decision, or if the challenge causes users to disable the extension more often
than it helps them regain intentional control.

## Open questions

None for this implementation slice.
