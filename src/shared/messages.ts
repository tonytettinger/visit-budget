import type {
  EntryDecision,
  PendingRuleChange,
  PersistedState,
  RuleStatus,
  SiteRule,
} from "../core/types";

export type ClientRequest =
  | { type: "GET_STATE" }
  | { type: "GET_CURRENT_SITE"; tabId?: number }
  | { type: "GET_PAGE_STATUS"; url: string }
  | { type: "GET_BLOCKED_CONTEXT"; ruleId: string }
  | { type: "SAVE_RULE"; rule: SiteRule }
  | { type: "DELETE_RULE"; ruleId: string }
  | { type: "CANCEL_PENDING_CHANGE"; ruleId: string }
  | {
      type: "START_EMERGENCY_PASS";
      ruleId: string;
      intention: string;
    };

export interface CurrentSiteView {
  url?: string;
  hostname?: string;
  status: RuleStatus;
  permissionGranted: boolean;
}

export interface BlockedContext {
  rule: SiteRule;
  status: RuleStatus;
  challengeReadyAt: number;
  resetLabel: string;
}

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

export interface EmergencyPassResult {
  expiresAt: number;
}

export type ClientPayload =
  | BlockedContext
  | CurrentSiteView
  | DeleteRuleResult
  | EmergencyPassResult
  | EntryDecision
  | SaveRuleResult
  | StateView
  | PendingRuleChange
  | RuleStatus
  | PersistedState
  | { cancelled: true };

export type ClientResponse =
  { ok: true; payload: ClientPayload } | { ok: false; error: string };

export interface GuardUpdate {
  type: "GUARD_UPDATE";
  status: RuleStatus;
  showToast: boolean;
  challengeReadyAt?: number;
}

export function isClientRequest(value: unknown): value is ClientRequest {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  return typeof value.type === "string";
}
