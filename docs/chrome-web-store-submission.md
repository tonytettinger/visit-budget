# Chrome Web Store submission guide

This is the release checklist and copy deck for Visit Budget 1.0.0. Copy the
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
artifacts/visit-budget-v1.0.0.zip
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
Pause automatic re-checking with daily website visit budgets, clear reminders, and private on-device blocking.
```

### Detailed description

```text
Visit Budget helps you notice the moment a quick website check turns automatic.

Choose the websites that deserve more intention. Give a site a daily visit budget, block it completely, or enable stricter tab-return counting when switching away and back is part of the habit. Each counted entry shows a quiet reminder with the number of visits remaining.

Refreshes and navigation within the same configured site do not consume another visit. Once a budget is exhausted, Visit Budget pauses the next entry. If access is genuinely necessary, an emergency override remains available—but every attempt requires a 15-second wait, a private written intention of at least 50 characters, and exact entry of a fresh five-character code. A successful override lasts 10 minutes.

Features:
- Daily visit budgets for selected websites
- Permanent blocks with no override
- Optional counting when you return from another tab
- Clear remaining-visit reminders
- Subdomain, included-path, and excluded-path controls
- Optional daily locks that defer rule changes until tomorrow
- Protection for new navigations and already-open tabs

Private by design:
- No account or backend
- No analytics, ads, or telemetry
- No remote code
- No browsing data leaves your device
- Written override intentions are never saved or transmitted
- Website access is requested only when you create a rule for that website

Visit Budget provides deliberate friction, not an unbreakable lock. You can still uninstall it, use another browser or profile, or bypass Chrome-level enforcement. Its purpose is to interrupt an automatic habit long enough for you to make a conscious choice.
```

### Category and language

```text
Productivity
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
Visit Budget limits re-entry to user-selected websites with daily visit budgets or permanent blocks, using rules and daily usage state stored only on the user's device.
```

### Data use declaration

```text
Visit Budget does not collect, sell, or transmit user data to the developer or any third party. It observes navigation only as needed to enforce rules the user created. Rules and daily usage remain in Chrome storage on the device. Written override intentions are processed temporarily in the blocked interface and are never stored, logged, or transmitted.
```

Answer **No** to remote code. The package contains all executable code, uses a
self-only content security policy, and does not download or evaluate code.

Host `docs/privacy-policy.md` as a stable public webpage before submission. A
clear path such as `https://tettinger.dev/visit-budget/privacy/` would work once
it actually exists; do not enter that URL until it is live.

## Permission justifications

### `activeTab`

```text
Reads the current tab only when the user opens Visit Budget or starts quick-add, so the popup can show that site's status and prefill a rule. It does not provide continuous browsing access.
```

### `storage`

```text
Stores website rules, local daily visit counts, pending daily-lock changes, and short-lived override confirmation state on the user's device.
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
Schedules local maintenance for midnight resets and expired temporary sessions.
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
5. To test an override, wait 15 seconds, enter at least 50 characters, continue, and type the displayed five-character code exactly.

To test a permanent block, create a permanent-block rule and visit its website. No override controls should appear.

All rules and usage counts are stored locally in chrome.storage. The written override intention is never stored or transmitted.
```

## Listing assets

Prepare clean, current screenshots that show:

- Settings with one example daily budget.
- The in-product explanation shown before Chrome requests website access.
- A remaining-visit reminder.
- The exhausted-budget page and intention step.
- The separate code-confirmation dialog.

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
- Screenshots match version 1.0.0 and contain no personal information.
- The publisher trader/non-trader declaration is accurate for the publisher's
  real circumstances.
- The listing does not claim that the extension is impossible to bypass.
- No placeholder URL or unpublished privacy URL remains.
