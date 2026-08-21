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
      await chrome.action.setBadgeBackgroundColor({ color: ACCENT });
      await chrome.action.setBadgeText({ text: String(status.remaining) });
      await chrome.action.setTitle({
        title: `${status.rule.hostname}: ${status.remaining} visits remaining`,
      });
      return;
    case "override-session":
      await chrome.action.setBadgeBackgroundColor({ color: WARNING });
      await chrome.action.setBadgeText({ text: "10m" });
      await chrome.action.setTitle({
        title: `${status.rule.hostname}: override session active`,
      });
      return;
    case "limit-reached":
    case "permanently-blocked":
      await chrome.action.setBadgeBackgroundColor({ color: WARNING });
      await chrome.action.setBadgeText({ text: "×" });
      await chrome.action.setTitle({
        title: `${status.rule.hostname}: blocked`,
      });
  }
}
