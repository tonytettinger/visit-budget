import type {
  EntryReceipt,
  EntryDecision,
  PendingRuleChange,
  PersistedState,
  RuleStatus,
  SiteRule,
} from "../core/types";

export type ClientRequest =
  | { type: "GET_STATE" }
  | { type: "GET_CURRENT_SITE"; tabId?: number }
  | { type: "GET_PAGE_CONTEXT"; url: string }
  | { type: "GET_BLOCKED_CONTEXT"; ruleId: string }
  | { type: "SAVE_RULE"; rule: SiteRule }
  | { type: "DELETE_RULE"; ruleId: string }
  | { type: "CANCEL_PENDING_CHANGE"; ruleId: string }
  | { type: "OPEN_FRESH_TAB" }
  | {
      type: "START_OVERRIDE_CONFIRMATION";
      ruleId: string;
      durationMinutes: number;
    }
  | { type: "CANCEL_OVERRIDE_CONFIRMATION"; ruleId: string }
  | {
      type: "CONFIRM_OVERRIDE";
      ruleId: string;
      durationMinutes: number;
      code: string;
    };

export interface CurrentSiteView {
  tabId?: number;
  url?: string;
  hostname?: string;
  status: RuleStatus;
  permissionGranted: boolean;
}

export interface PageContext {
  status: RuleStatus;
  entryReceipt?: EntryReceipt;
}

export type BlockedContext =
  | {
      kind: "active-block";
      rule: SiteRule;
      status: Exclude<RuleStatus, { kind: "untracked" }>;
      challengeReadyAt: number;
      resetLabel: string;
    }
  | {
      kind: "stale-rule";
    };

export interface StateView {
  state: PersistedState;
  permissionByRule: Record<string, boolean>;
}

export interface SaveRuleResult {
  scheduled: boolean;
  state: PersistedState;
}

export interface DeleteRuleResult {
  scheduled: boolean;
  state: PersistedState;
}

export interface OverrideSessionResult {
  expiresAt: number;
}

export interface OverrideConfirmationResult {
  code: string;
}

export type ClientPayload =
  | BlockedContext
  | CurrentSiteView
  | DeleteRuleResult
  | OverrideConfirmationResult
  | OverrideSessionResult
  | EntryDecision
  | SaveRuleResult
  | StateView
  | PendingRuleChange
  | PageContext
  | RuleStatus
  | PersistedState
  | { cancelled: true }
  | { opened: true };

export type ClientResponse =
  { ok: true; payload: ClientPayload } | { ok: false; error: string };

export function parseClientResponse(value: unknown): ClientResponse {
  if (!isRecord(value)) {
    throw new Error(
      "Visit Budget could not complete that action. Reload the extension and try again.",
    );
  }

  if (value.ok === false && typeof value.error === "string") {
    return value as ClientResponse;
  }

  if (value.ok === true && "payload" in value && value.payload !== undefined) {
    return value as ClientResponse;
  }

  if (value.ok === true) {
    throw new Error(
      "Visit Budget did not return a confirmation. Reload the extension and try again.",
    );
  }

  throw new Error(
    "Visit Budget could not complete that action. Reload the extension and try again.",
  );
}

export interface GuardUpdate {
  type: "GUARD_UPDATE";
  status: RuleStatus;
  entryReceipt?: EntryReceipt;
  challengeReadyAt?: number;
}

export function isClientRequest(value: unknown): value is ClientRequest {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }
  switch (value.type) {
    case "GET_STATE":
    case "OPEN_FRESH_TAB":
      return true;
    case "GET_CURRENT_SITE":
      return (
        value.tabId === undefined ||
        (typeof value.tabId === "number" && Number.isInteger(value.tabId))
      );
    case "GET_PAGE_CONTEXT":
      return typeof value.url === "string";
    case "GET_BLOCKED_CONTEXT":
    case "DELETE_RULE":
    case "CANCEL_PENDING_CHANGE":
    case "CANCEL_OVERRIDE_CONFIRMATION":
      return typeof value.ruleId === "string";
    case "SAVE_RULE":
      return isSiteRule(value.rule);
    case "START_OVERRIDE_CONFIRMATION":
      return isOverrideRequest(value);
    case "CONFIRM_OVERRIDE":
      return (
        isOverrideRequest(value) &&
        typeof value.code === "string" &&
        value.code.length === 5
      );
    default:
      return false;
  }
}

function isOverrideRequest(value: Record<string, unknown>): boolean {
  return (
    typeof value.ruleId === "string" &&
    typeof value.durationMinutes === "number" &&
    Number.isInteger(value.durationMinutes)
  );
}

function isSiteRule(value: unknown): value is SiteRule {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.hostname === "string" &&
    typeof value.includeSubdomains === "boolean" &&
    isStringArray(value.includePathPrefixes) &&
    isStringArray(value.excludePathPrefixes) &&
    (value.mode === "visit-limit" ||
      value.mode === "time-limit" ||
      value.mode === "permanent-block") &&
    (value.dailyLimit === undefined ||
      (typeof value.dailyLimit === "number" &&
        Number.isInteger(value.dailyLimit))) &&
    (value.dailyTimeLimitMinutes === undefined ||
      (typeof value.dailyTimeLimitMinutes === "number" &&
        Number.isInteger(value.dailyTimeLimitMinutes))) &&
    typeof value.countTabReturns === "boolean" &&
    typeof value.dailyLockEnabled === "boolean"
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
