# Chrome Web Store submission guide

This is the release checklist and copy deck for Visit Budget 1.1.0. Copy the
relevant fields into the Chrome Web Store Developer Dashboard and keep every
answer consistent with the uploaded build.

Official references:

- [Create a strong store listing](https://developer.chrome.com/docs/webstore/best-listing)
- [Listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [User data policy](https://developer.chrome.com/docs/webstore/user_data)

## Release artifact

Run:

```bash
npm ci
npm run check
npm run test:e2e
npm run package
```

Upload:

```text
artifacts/visit-budget-v1.1.0.zip
```

The packaging command builds without source maps, validates the manifest and
bundle, rejects remote-code and network primitives, and writes a SHA-256 file
beside the ZIP.

## Store listing copy

### Name

```text
Visit Budget
```

### Summary

```text
Make website checking a deliberate choice with visit budgets, active-time limits, and permanent blocks.
```

### Detailed description

```text
Visit Budget turns automatic website checking into a deliberate choice.

Give a site one of three boundaries:
- Visit budget — allow a chosen number of daily re-entries.
- Active-time budget — allow 15 minutes to four hours, counting only while its tab is selected in focused Chrome.
- Permanent block — keep the site unavailable.

Like Odysseus tying himself to the mast, you set the guardrail before the urge arrives. Refreshing a page and ordinary navigation within the same configured site do not use another visit. You can also choose whether returning to a site from another tab counts as a re-entry.

When a budget runs out and access is genuinely necessary, an override remains available — but it is not effortless. Wait 15 seconds, choose a 5–60 minute access window, then enter a fresh confirmation code. Permanent blocks have no override.

Private by design: no account, analytics, ads, telemetry, or browsing data leaving your device. Website access is requested only when you create a rule for that website.

Visit Budget provides deliberate friction, not an unbreakable lock. You can still remove the extension or use another browser or profile. Its purpose is to create a small pause, long enough to decide what you want to do next.

If it helps, an honest review or feedback on what would make it better is always welcome.
```

### Category and language

```text
Workflow & Planning
English
```

### Homepage and support

```text
Homepage: https://tettinger.dev/
Support: https://tettinger.dev/
```

A dedicated Visit Budget support or privacy page can replace the general
support URL later. Do not add a placeholder URL to the public listing.

## Privacy practices copy

### Single purpose

```text
Visit Budget applies a daily visit budget, daily active-time budget, or permanent block to user-selected websites, using rules and usage state stored only on the user's device.
```

### Data use declaration

```text
Visit Budget does not collect, sell, or transmit user data to the developer or any third party. It observes navigation only as needed to enforce rules the user created. Rules, local daily usage, and short-lived override challenge state remain in Chrome storage on the device. The extension does not ask for or store a written override reason.
```

Answer **No** to remote code. The package contains all executable code, uses a
self-only content security policy, and does not download or evaluate code.

The current Store privacy-policy URL is the public source page:
`https://github.com/tonytettinger/visit-budget/blob/main/docs/privacy-policy.md`.
It must remain publicly reachable and reflect the declarations above. A
dedicated `tettinger.dev` policy page can replace it once it is live.

## Permission justifications

### `activeTab`

```text
Reads the current tab only when the user opens Visit Budget or starts quick-add, so the popup can show that site's status and prefill a rule. It does not provide continuous browsing access.
```

### `storage`

```text
Stores website rules, local visit counts or active-time usage, pending daily-lock changes, and short-lived override confirmation state on the user's device.
```

### `webNavigation`

```text
Distinguishes entering a configured website from refreshing it or navigating within it, so Visit Budget counts re-entries accurately.
```

### `scripting`

```text
Installs the guard on configured websites so already-open tabs can show visit reminders or a page-preserving blocking overlay.
```

### `alarms`

```text
Schedules local maintenance for midnight resets, active-time limits, and expired temporary sessions.
```

### `declarativeNetRequestWithHostAccess`

```text
Redirects blocked future navigations for configured websites before the destination page is shown.
```

### Optional host permissions

```text
Requested only after the user creates a rule for a specific website. Host access is required to count visits, show reminders, guard already-open tabs, and redirect blocked navigations for that website. Access is released when the final rule requiring that host is removed.
```

## Review instructions

```text
Visit Budget has no account or backend.

To test a visit limit:
1. Open the options page and add a rule for a test website with a daily limit of 1.
2. Allow Chrome's site-access request.
3. Visit the website once, navigate to a different website, and return.
4. Confirm the blocked page appears.
5. To test an override, wait 15 seconds, choose a 5–60-minute temporary-access duration, continue, and type the displayed five-character code exactly.

To test a permanent block, create a permanent-block rule and visit its website. No override controls should appear.

To test active time, choose “Daily active time” and a 15-minute limit. Time counts only while the matching tab is selected in focused Chrome.

All rules and usage counts are stored locally in chrome.storage. The extension does not collect a written override reason.
```

## Listing assets

Prepare clean, current screenshots that show:

- Settings showing the three boundary types and an active-time budget.
- The exhausted-budget page with the 15-second countdown and temporary-access stepper.
- The separate code-confirmation dialog.
- A remaining-visit reminder, if it can be captured without unrelated page content.

Use fictional or local test sites. Do not expose personal email, private tabs,
real browsing history, or third-party account content. Use the generated
128-pixel product icon from `public/icons/icon-128.png`; create any promotional
images at the exact sizes requested by the current dashboard.

## Support and monetization

Keep support optional and away from blocking moments. The extension links
quietly to Antal “Tony” Tettinger's homepage. A Buy Me a Coffee or similar link
can live there without adding pressure, affiliate redirects, or unrelated data
collection inside the extension.

## Final pre-submit checklist

- The ZIP and `.sha256` file were produced by `npm run package`.
- `npm audit`, `npm run check`, and `npm run test:e2e` pass.
- The hosted privacy-policy URL opens publicly without a login.
- Store privacy answers match the declarations above.
- Screenshots match version 1.1.0 and contain no personal information.
- The publisher trader/non-trader declaration is accurate for the publisher's
  real circumstances.
- The listing does not claim that the extension is impossible to bypass.
- No placeholder URL or unpublished privacy URL remains.
