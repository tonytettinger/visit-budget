import type { RuleStatus } from "../core/types";

const ACCENT = "#155de0";
const WARNING = "#9a5a00";

export async function updateBadge(status: RuleStatus): Promise<void> {
  switch (status.kind) {
    case "untracked":
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setTitle({ title: "Visit Budget" });
      return;
    case "available":
      if (status.rule.mode === "time-limit") {
        const minutes = Math.max(1, Math.ceil(status.remaining / 60_000));
        await chrome.action.setBadgeBackgroundColor({ color: ACCENT });
        await chrome.action.setBadgeText({ text: `${minutes}m` });
        await chrome.action.setTitle({
          title: `${status.rule.hostname}: ${minutes} minutes remaining`,
        });
        return;
      }
      await chrome.action.setBadgeBackgroundColor({ color: ACCENT });
      await chrome.action.setBadgeText({ text: String(status.remaining) });
      await chrome.action.setTitle({
        title: `${status.rule.hostname}: ${status.remaining} visits remaining`,
      });
      return;
    case "override-session": {
      const minutes = Math.max(
        1,
        Math.ceil((status.expiresAt - Date.now()) / 60_000),
      );
      await chrome.action.setBadgeBackgroundColor({ color: WARNING });
      await chrome.action.setBadgeText({ text: `${minutes}m` });
      await chrome.action.setTitle({
        title: `${status.rule.hostname}: temporary access active`,
      });
      return;
    }
    case "limit-reached":
    case "permanently-blocked":
      await chrome.action.setBadgeBackgroundColor({ color: WARNING });
      await chrome.action.setBadgeText({ text: "×" });
      await chrome.action.setTitle({
        title: `${status.rule.hostname}: blocked`,
      });
  }
}
