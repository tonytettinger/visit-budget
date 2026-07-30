# Chrome Web Store submission guide

This document prepares Visit Budget for a free Chrome Web Store listing. It is
written to be copied into the Chrome Web Store Developer Dashboard, then updated
with your real support/contact links before submission.

Official references:

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Register your developer account](https://developer.chrome.com/docs/webstore/register/)
- [Publish in the Chrome Web Store](https://developer.chrome.google.cn/docs/webstore/publish?hl=en)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies?hl=en)

## Before upload

Run:

```bash
npm run check
npm run package
```

Upload:

```text
artifacts/visit-budget-v0.1.0.zip
```

Use an account email you will actually check. Google uses it for review,
policy, and support notices.

## Recommended release path

1. Submit as **Private** or **Unlisted** for a small beta.
2. Test the reviewed store build on your own Chrome profile.
3. Switch to **Public** once the listing, screenshots, and onboarding feel
   polished.

All visibility options go through review.

## Store listing draft

### Name

```text
Visit Budget
```

### Short description

```text
Limit daily website re-entries and block distracting sites with local-first deliberate friction.
```

### Detailed description

```text
Visit Budget helps turn automatic website re-checking into a conscious choice.

Set a daily visit budget for sites you tend to reopen on autopilot, or block selected sites completely. When a visit is used, Visit Budget shows a small reminder with the remaining count. Once a daily budget is exhausted, the next re-entry is blocked unless you use the site’s one daily emergency pass.

What it does:
- Limit daily re-entries for chosen websites
- Block selected websites completely
- Show remaining visits after each counted entry
- Preserve already-open pages beneath a blocking overlay
- Offer one site-specific emergency pass per day for limited sites
- Support subdomains, included paths, excluded paths, and optional daily locks

What it does not claim:
- It is deliberate friction, not an unbreakable lock
- You can still uninstall the extension, use another browser, or use another Chrome profile
- It does not replace self-control or device-level parental-control software

Privacy:
- No account
- No backend
- No analytics
- No ads
- No browsing data leaves your device
- Rules and visit counts are stored locally in Chrome

Visit Budget asks for website access only when you create a rule for that website. That access is used to count visits, show reminders, preserve already-open tabs, and redirect blocked navigations before the destination page appears.
```

### Category

```text
Productivity
```

### Language

```text
English
```

### Support URL

Use one of:

```text
https://github.com/YOUR_USERNAME/visit-budget/issues
```

or:

```text
https://YOUR_DOMAIN.example/support
```

### Homepage URL

Use a simple public project page if you have one:

```text
https://YOUR_DOMAIN.example/visit-budget
```

or a GitHub repository:

```text
https://github.com/YOUR_USERNAME/visit-budget
```

## Privacy tab draft

### Single purpose

```text
Visit Budget limits how many times a user can re-enter selected websites each day and can block selected websites, using only local rules and local daily usage state.
```

### Data collection

Recommended answer:

```text
Visit Budget does not collect or transmit user data to the developer or any third party.
```

The extension stores user-created rules and daily usage counts locally in
Chrome storage on the user’s device. If the dashboard asks whether the extension
handles website content or browsing activity, be precise: it observes
navigations for configured sites so it can enforce rules, but it does not send
that information anywhere.

### Privacy policy URL

Host `docs/privacy-policy.md` as a public webpage before submitting. Good
low-friction options:

- GitHub Pages
- A simple page on your personal website
- A public repository page if it renders clearly and stays available

## Permission justifications

Use concise, direct explanations.

### `storage`

```text
Stores website rules, local daily visit counts, emergency-pass state, and pending locked changes on the user’s device.
```

### `webNavigation`

```text
Detects when the user enters, refreshes, or navigates within configured websites so Visit Budget can count re-entries accurately without counting refreshes as new visits.
```

### `scripting`

```text
Injects the page guard into configured websites so already-open tabs can show remaining-visit reminders or a blocking overlay without destroying page contents.
```

### `alarms`

```text
Schedules local maintenance for daily resets and emergency-pass expiration.
```

### `declarativeNetRequestWithHostAccess`

```text
Redirects blocked future navigations for configured websites before the destination page is shown.
```

### Optional host permissions

```text
Requested only when the user creates a rule for a specific website. Host access is required to count visits, show reminders, guard already-open tabs, and redirect blocked navigations for that website.
```

## Support / donation link

Recommended approach: keep the extension free and include one quiet optional
support link.

Good copy:

```text
Visit Budget is free. If it helps you, you can optionally support development.
```

Use:

- Buy Me a Coffee
- Ko-fi
- GitHub Sponsors
- A personal website support page

Avoid:

- Ads inside blocked pages or reminders
- Affiliate redirects
- Injecting affiliate codes
- Any support message that appears while a user is blocked or frustrated

Before publishing, replace the placeholder in:

```text
public/options.html
```

Current placeholder text:

```text
Support link coming soon
```

Suggested replacement:

```html
<a
  class="text-button"
  href="https://buymeacoffee.com/YOUR_USERNAME"
  target="_blank"
  rel="noreferrer"
  >Support development</a
>
```

If you add `target="_blank"` in extension HTML, test it manually from the
options page before submission.

## Screenshot checklist

Prepare screenshots that show function, not hype:

- Settings page with one limited site
- Permission context dialog explaining website access
- Top-right “Visit 1 of 3” reminder
- Blocked page after a budget is used
- Emergency-pass pause and intention field

Avoid screenshots containing personal email, private tabs, real browsing
history, or copyrighted third-party page content.

## Review notes for Google

Paste this into the test instructions if the dashboard offers a field:

```text
Visit Budget has no account or backend. To test:
1. Install the extension.
2. Open the options page.
3. Add a rule for a test website with a daily limit of 1.
4. Visit that website once.
5. Navigate to another website.
6. Return to the limited website and verify that the blocked page appears.

Host permission is requested only when a rule is created for a website. All rules and daily usage counts are stored locally in chrome.storage.
```

## Final pre-submit checklist

- `npm run check` passes.
- `npm run test:e2e` passes.
- `npm run package` creates the ZIP.
- Manifest version is bumped if this is an update.
- Privacy policy is hosted at a stable public URL.
- Store listing does not overclaim enforcement.
- Screenshots are clean and current.
- Donation/support link is optional, non-intrusive, and not shown as required.
- No placeholder URLs remain in public listing metadata.
