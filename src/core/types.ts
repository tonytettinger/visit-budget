export type RuleMode = "visit-limit" | "time-limit" | "permanent-block";

export interface SiteRule {
  id: string;
  hostname: string;
  includeSubdomains: boolean;
  includePathPrefixes: string[];
  excludePathPrefixes: string[];
  mode: RuleMode;
  dailyLimit?: number;
  dailyTimeLimitMinutes?: number;
  countTabReturns: boolean;
  dailyLockEnabled: boolean;
}

export interface DailyUsage {
  ruleId: string;
  localDate: string;
  visitsUsed: number;
  activeTimeUsedMs?: number;
  overrideSessionExpiresAt?: number;
}

export interface PendingRuleChange {
  ruleId: string;
  effectiveDate: string;
  kind: "replace" | "delete";
  replacement?: SiteRule;
}

export interface EntryReceipt {
  id: string;
  ruleId: string;
  hostname: string;
  visitsUsed: number;
  dailyLimit: number;
  remaining: number;
  createdAt: number;
}

export interface OverrideChallenge {
  issuedAt: number;
  durationMinutes?: number;
  code?: string;
  codeIssuedAt?: number;
  previousCode?: string;
}

export interface PersistedState {
  schemaVersion: 4;
  localDate: string;
  rules: SiteRule[];
  usageByRule: Record<string, DailyUsage>;
  pendingChanges: PendingRuleChange[];
}

export interface SessionState {
  browserFocused: boolean;
  focusedWindowId?: number;
  activeTabId?: number;
  activeRuleId?: string;
  activeUrl?: string;
  activeAccess?: "allowed" | "override-session" | "blocked";
  activeRemaining?: number;
  activeTimeStartedAt?: number;
  overrideChallengeByRule?: Record<string, OverrideChallenge>;
  entryReceiptByTab?: Record<string, EntryReceipt>;
}

export type EntryDecision =
  | {
      kind: "allow";
      ruleId: string;
      remaining: number;
      usage: DailyUsage;
    }
  | {
      kind: "override-session";
      ruleId: string;
      expiresAt: number;
      usage: DailyUsage;
    }
  | {
      kind: "limit-reached";
      ruleId: string;
      usage: DailyUsage;
    }
  | {
      kind: "permanently-blocked";
      ruleId: string;
    };

export type RuleStatus =
  | {
      kind: "untracked";
    }
  | {
      kind: "available";
      rule: SiteRule;
      usage: DailyUsage;
      remaining: number;
    }
  | {
      kind: "override-session";
      rule: SiteRule;
      usage: DailyUsage;
      expiresAt: number;
    }
  | {
      kind: "limit-reached";
      rule: SiteRule;
      usage: DailyUsage;
    }
  | {
      kind: "permanently-blocked";
      rule: SiteRule;
    };

export interface RuleMutationResult {
  state: PersistedState;
  scheduled: boolean;
}
