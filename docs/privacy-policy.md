# Visit Budget privacy policy

Last updated: 2026-08-21

## Summary

Visit Budget is designed to work privately on your device. It has no account,
backend, analytics, advertising, or telemetry, and it does not sell data.

## Information stored on your device

Visit Budget stores the following information in Chrome storage:

- Rules you create, including hostnames, optional path scopes, visit limits,
  permanent blocks, tab-return preferences, and daily-lock settings.
- Daily usage state, including visits used and the expiry time of an active
  10-minute override session.
- Pending changes to rules protected by a daily lock.
- Short-lived session state used to prevent double-counting, show reminders,
  preserve blocking state, and validate an override confirmation code.

An emergency-override intention is used only in the blocked interface while you
complete the confirmation flow. The intention is never saved to local or
session storage, written to logs, analyzed, or transmitted.

## Information transmitted

Visit Budget does not transmit your rules, visit counts, browsing activity,
page content, settings, intentions, or confirmation codes to the developer or
to any third party. The extension contains no network client or remote code.

## Website access

Visit Budget requests access to a website when you create a rule for that
website. The access is used to:

- Recognize entries into the configured website without counting refreshes or
  ordinary navigation as new visits.
- Show remaining-visit reminders.
- Guard already-open tabs with a page-preserving overlay.
- Redirect blocked future navigations before the destination is shown.

Removing the final rule that needs a website releases the corresponding host
access. Visit Budget does not retain or analyze navigation history for
unconfigured websites.

## Third parties and external links

Visit Budget does not share extension data with third parties. Its options page
links to the developer's website. If you choose to open that external link, the
website has its own privacy practices; Visit Budget does not attach extension
data to the link.

## Data control and deletion

You can remove individual rules and their associated daily state from the Visit
Budget options page. A daily lock may defer a protected rule change until the
next local-day reset, as shown in the interface. Uninstalling the extension
removes its Chrome-managed local and session storage.

## Changes to this policy

If Visit Budget's data practices change, this policy and the Chrome Web Store
privacy disclosures will be updated before the changed version is published.

## Contact

For privacy or support questions, visit [tettinger.dev](https://tettinger.dev/).
