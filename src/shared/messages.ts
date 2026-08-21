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
      intention: string;
    }
  | { type: "CANCEL_OVERRIDE_CONFIRMATION"; ruleId: string }
  | {
      type: "CONFIRM_OVERRIDE";
      ruleId: string;
      intention: string;
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

export interface GuardUpdate {
  type: "GUARD_UPDATE";
  status: RuleStatus;
  entryReceipt?: EntryReceipt;
  challengeReadyAt?: number;
}

export function isClientRequest(value: unknown): value is ClientRequest {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  return typeof value.type === "string";
}
