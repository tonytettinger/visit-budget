import { parseRuleTarget } from "../core/rules";
import type { RuleStatus } from "../core/types";
import type { CurrentSiteView } from "../shared/messages";
import { errorMessage, requiredElement, sendRequest } from "./client";

const content = requiredElement<HTMLElement>("#popup-content");
const settingsIcon = requiredElement<HTMLButtonElement>("#open-settings-icon");
const requestedTabId = parseRequestedTabId();

settingsIcon.addEventListener("click", openSettings);
void load();

async function load(): Promise<void> {
  try {
    const view = await sendRequest<CurrentSiteView>({
      type: "GET_CURRENT_SITE",
      ...(requestedTabId === undefined ? {} : { tabId: requestedTabId }),
    });
    render(view);
  } catch (error) {
    renderError(errorMessage(error));
  }
}

function render(view: CurrentSiteView): void {
  content.replaceChildren();
  if (!view.url || !view.hostname) {
    const unsupported = create("p", "unsupported");
    unsupported.textContent = "This page cannot have a website rule.";
    content.append(unsupported, actions(undefined));
    return;
  }

  const status = view.status;
  if (status.kind === "untracked") {
    content.append(
      heading(view.hostname),
      summary("No visit rule is set for this website."),
      untrackedActions(view.url, view.tabId),
    );
    return;
  }

  content.append(
    heading(status.rule.hostname),
    statusSummary(status),
    progress(status),
    remaining(status),
    actions(status.rule.id, view.permissionGranted),
  );
}

function heading(hostname: string): HTMLElement {
  const element = create("h1", "site-heading");
  element.textContent = hostname;
  return element;
}

function summary(text: string): HTMLElement {
  const element = create("p", "site-summary");
  element.textContent = text;
  return element;
}

function statusSummary(status: Exclude<RuleStatus, { kind: "untracked" }>) {
  switch (status.kind) {
    case "available": {
      const limit = status.rule.dailyLimit ?? 1;
      return summary(
        `${status.usage.visitsUsed} of ${limit} visits used today`,
      );
    }
    case "emergency-access":
      return summary("Emergency access is active for this site.");
    case "limit-reached":
      return summary("Today's visit budget is used.");
    case "permanently-blocked":
      return summary("This website is permanently blocked.");
  }
}

function progress(
  status: Exclude<RuleStatus, { kind: "untracked" }>,
): HTMLElement {
  const track = create("div", "progress");
  track.setAttribute("role", "progressbar");
  const fill = document.createElement("span");
  let percent = 100;
  if (status.kind === "available") {
    const limit = status.rule.dailyLimit ?? 1;
    percent = Math.min(100, (status.usage.visitsUsed / limit) * 100);
    track.setAttribute("aria-valuenow", String(status.usage.visitsUsed));
    track.setAttribute("aria-valuemax", String(limit));
  }
  fill.style.width = `${percent}%`;
  track.append(fill);
  return track;
}

function remaining(
  status: Exclude<RuleStatus, { kind: "untracked" }>,
): HTMLElement {
  const element = create("p", "remaining");
  switch (status.kind) {
    case "available":
      element.textContent = `${status.remaining} ${
        status.remaining === 1 ? "visit" : "visits"
      } remaining`;
      break;
    case "emergency-access":
      element.textContent = "10-minute emergency session";
      element.classList.add("warning");
      break;
    case "limit-reached":
      element.textContent = status.emergencyPassAvailable
        ? "Emergency pass available"
        : "Blocked until tomorrow";
      element.classList.add("warning");
      break;
    case "permanently-blocked":
      element.textContent = "Blocked";
      element.classList.add("warning");
  }
  return element;
}

function actions(ruleId?: string, permissionGranted = true): HTMLElement {
  const container = create("div", "popup-actions");
  if (ruleId) {
    const manage = button("Manage rule", "primary");
    manage.addEventListener("click", () => openSettings(ruleId));
    container.append(manage);

    if (!permissionGranted) {
      const grant = button("Restore website access…", "secondary");
      grant.addEventListener("click", () => openSettings(ruleId));
      container.append(grant);
    }
  }
  const settings = button("Open settings", "secondary");
  settings.addEventListener("click", () => openSettings());
  container.append(settings);
  return container;
}

function untrackedActions(url: string, tabId?: number): HTMLElement {
  const container = create("div", "popup-actions");
  const add = button("Set visit budget…", "primary");
  add.addEventListener("click", () => openSetup(url, tabId));
  const settings = button("Open settings", "secondary");
  settings.addEventListener("click", () => openSettings());
  container.append(add, settings);
  return container;
}

function openSetup(url: string, tabId?: number): void {
  try {
    const target = parseRuleTarget(url);
    const params = new URLSearchParams({ add: target.hostname });
    if (tabId !== undefined) {
      params.set("sourceTab", String(tabId));
    }
    void chrome.tabs.create({
      url: chrome.runtime.getURL(`options.html?${params.toString()}`),
    });
    window.close();
  } catch (error) {
    renderError(errorMessage(error));
  }
}

function renderError(message: string): void {
  const error = create("p", "popup-error");
  error.textContent = message;
  content.append(error);
}

function openSettings(ruleId?: string | Event): void {
  const id = typeof ruleId === "string" ? ruleId : undefined;
  const url = chrome.runtime.getURL(
    id ? `options.html?rule=${encodeURIComponent(id)}` : "options.html",
  );
  void chrome.tabs.create({ url });
  window.close();
}

function button(text: string, variant: "primary" | "secondary") {
  const element = create("button", `button ${variant}`);
  element.setAttribute("type", "button");
  element.textContent = text;
  return element;
}

function create<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

function parseRequestedTabId(): number | undefined {
  const value = new URLSearchParams(location.search).get("tab");
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
