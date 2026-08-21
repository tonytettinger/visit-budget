import { getRuleStatus } from "../core/engine";
import type { PersistedState, SessionState, SiteRule } from "../core/types";
import { hasRulePermission } from "./permissions";

export async function reconcileBlockingRules(
  state: PersistedState,
  session: SessionState,
  now = new Date(),
): Promise<void> {
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = current.map((rule) => rule.id);
  const addRules: chrome.declarativeNetRequest.Rule[] = [];
  let id = 1;

  for (const rule of state.rules) {
    if (
      !(await hasRulePermission(rule)) ||
      !shouldBlock(rule, state, session, now)
    ) {
      continue;
    }

    for (const prefix of rule.includePathPrefixes) {
      addRules.push(createRedirectRule(id, rule, prefix));
      id += 1;
    }
    for (const prefix of rule.excludePathPrefixes) {
      addRules.push(createAllowRule(id, rule, prefix));
      id += 1;
    }
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules,
    removeRuleIds,
  });
}

function shouldBlock(
  rule: SiteRule,
  state: PersistedState,
  session: SessionState,
  now: Date,
): boolean {
  if (
    session.activeRuleId === rule.id &&
    (session.activeAccess === "allowed" ||
      session.activeAccess === "override-session")
  ) {
    return false;
  }
  const status = getRuleStatus(rule, state.usageByRule[rule.id], now);
  return (
    status.kind === "permanently-blocked" || status.kind === "limit-reached"
  );
}

function createRedirectRule(
  id: number,
  rule: SiteRule,
  pathPrefix: string,
): chrome.declarativeNetRequest.Rule {
  const regexFilter = buildUrlRegex(rule, pathPrefix);
  const destination = `${chrome.runtime.getURL(
    `blocked.html?rule=${encodeURIComponent(rule.id)}`,
  )}#\\1`;
  return {
    id,
    priority: priorityFor(rule, pathPrefix, false),
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { regexSubstitution: destination },
    },
    condition: {
      regexFilter,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
  };
}

function createAllowRule(
  id: number,
  rule: SiteRule,
  pathPrefix: string,
): chrome.declarativeNetRequest.Rule {
  return {
    id,
    priority: priorityFor(rule, pathPrefix, true),
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.ALLOW,
    },
    condition: {
      regexFilter: buildUrlRegex(rule, pathPrefix),
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
  };
}

function buildUrlRegex(rule: SiteRule, pathPrefix: string): string {
  const escapedHost = escapeRegex(rule.hostname);
  const host = rule.includeSubdomains
    ? `(?:[^./]+\\.)*${escapedHost}`
    : escapedHost;
  const escapedPath = escapeRegex(pathPrefix);
  const path = pathPrefix === "/" ? "/.*" : `${escapedPath}(?:/.*|[?#].*|$)`;
  return `^(https?://${host}(?::\\d+)?${path})$`;
}

function priorityFor(
  rule: SiteRule,
  pathPrefix: string,
  exclusion: boolean,
): number {
  const exactHost = rule.includeSubdomains ? 0 : 1_000_000;
  const hostDepth = rule.hostname.split(".").length * 10_000;
  const pathSpecificity = Math.min(pathPrefix.length, 900) * 10;
  const permanent = rule.mode === "permanent-block" ? 2 : 1;
  const exclusionPriority = exclusion ? 5 : 0;
  return (
    1_000 +
    exactHost +
    hostDepth +
    pathSpecificity +
    permanent +
    exclusionPriority
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
