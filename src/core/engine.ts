import { localDateKey } from "./date";
import type { DailyUsage, EntryDecision, RuleStatus, SiteRule } from "./types";

export const OVERRIDE_SESSION_DURATION_MS = 10 * 60 * 1000;
export const OVERRIDE_PAUSE_SECONDS = 15;
export const MINIMUM_INTENTION_LENGTH = 50;

export function createDailyUsage(ruleId: string, now: Date): DailyUsage {
  return {
    ruleId,
    localDate: localDateKey(now),
    visitsUsed: 0,
    activeTimeUsedMs: 0,
  };
}

export function currentUsage(
  ruleId: string,
  usage: DailyUsage | undefined,
  now: Date,
): DailyUsage {
  if (usage?.localDate === localDateKey(now)) {
    if (
      usage.overrideSessionExpiresAt !== undefined &&
      usage.overrideSessionExpiresAt <= now.getTime()
    ) {
      const expired = { ...usage };
      delete expired.overrideSessionExpiresAt;
      return expired;
    }
    return { ...usage, activeTimeUsedMs: usage.activeTimeUsedMs ?? 0 };
  }
  return createDailyUsage(ruleId, now);
}

export function evaluateEntry(
  rule: SiteRule,
  existingUsage: DailyUsage | undefined,
  now: Date,
): EntryDecision {
  if (rule.mode === "permanent-block") {
    return { kind: "permanently-blocked", ruleId: rule.id };
  }

  const usage = currentUsage(rule.id, existingUsage, now);
  if (
    usage.overrideSessionExpiresAt !== undefined &&
    usage.overrideSessionExpiresAt > now.getTime()
  ) {
    return {
      kind: "override-session",
      ruleId: rule.id,
      expiresAt: usage.overrideSessionExpiresAt,
      usage,
    };
  }

  if (rule.mode === "time-limit") {
    const remaining = remainingActiveTimeMs(rule, usage);
    if (remaining === 0) {
      return {
        kind: "limit-reached",
        ruleId: rule.id,
        usage,
      };
    }
    return {
      kind: "allow",
      ruleId: rule.id,
      remaining,
      usage,
    };
  }

  const limit = rule.dailyLimit ?? 1;
  if (usage.visitsUsed < limit) {
    const nextUsage = { ...usage, visitsUsed: usage.visitsUsed + 1 };
    return {
      kind: "allow",
      ruleId: rule.id,
      remaining: Math.max(0, limit - nextUsage.visitsUsed),
      usage: nextUsage,
    };
  }

  return {
    kind: "limit-reached",
    ruleId: rule.id,
    usage,
  };
}

export function getRuleStatus(
  rule: SiteRule,
  existingUsage: DailyUsage | undefined,
  now: Date,
): RuleStatus {
  if (rule.mode === "permanent-block") {
    return { kind: "permanently-blocked", rule };
  }

  const usage = currentUsage(rule.id, existingUsage, now);
  if (
    usage.overrideSessionExpiresAt !== undefined &&
    usage.overrideSessionExpiresAt > now.getTime()
  ) {
    return {
      kind: "override-session",
      rule,
      usage,
      expiresAt: usage.overrideSessionExpiresAt,
    };
  }

  if (rule.mode === "time-limit") {
    if (remainingActiveTimeMs(rule, usage) > 0) {
      return {
        kind: "available",
        rule,
        usage,
        remaining: remainingActiveTimeMs(rule, usage),
      };
    }
    return { kind: "limit-reached", rule, usage };
  }

  const limit = rule.dailyLimit ?? 1;
  if (usage.visitsUsed < limit) {
    return {
      kind: "available",
      rule,
      usage,
      remaining: limit - usage.visitsUsed,
    };
  }

  return {
    kind: "limit-reached",
    rule,
    usage,
  };
}

export function remainingActiveTimeMs(
  rule: SiteRule,
  usage: DailyUsage,
): number {
  return Math.max(
    0,
    (rule.dailyTimeLimitMinutes ?? 0) * 60_000 - (usage.activeTimeUsedMs ?? 0),
  );
}

export function settleActiveTime(
  rule: SiteRule,
  existingUsage: DailyUsage | undefined,
  startedAt: number,
  now: Date,
): DailyUsage {
  const usage = currentUsage(rule.id, existingUsage, now);
  if (rule.mode !== "time-limit") {
    return usage;
  }

  const localMidnight = new Date(now);
  localMidnight.setHours(0, 0, 0, 0);
  const elapsed = Math.max(
    0,
    now.getTime() - Math.max(startedAt, localMidnight.getTime()),
  );
  return {
    ...usage,
    activeTimeUsedMs: Math.min(
      (usage.activeTimeUsedMs ?? 0) + elapsed,
      (rule.dailyTimeLimitMinutes ?? 0) * 60_000,
    ),
  };
}

export function startOverrideSession(
  rule: SiteRule,
  existingUsage: DailyUsage | undefined,
  intention: string,
  now: Date,
): DailyUsage {
  const usage = validateOverrideRequest(rule, existingUsage, intention, now);
  return {
    ...usage,
    overrideSessionExpiresAt: now.getTime() + OVERRIDE_SESSION_DURATION_MS,
  };
}

export function validateOverrideRequest(
  rule: SiteRule,
  existingUsage: DailyUsage | undefined,
  intention: string,
  now: Date,
): DailyUsage {
  if (intention.trim().length < MINIMUM_INTENTION_LENGTH) {
    throw new Error(
      `Write at least ${MINIMUM_INTENTION_LENGTH} characters before continuing.`,
    );
  }
  if (rule.mode !== "visit-limit") {
    throw new Error("Permanent blocks do not have an emergency override.");
  }

  const usage = currentUsage(rule.id, existingUsage, now);
  const limit = rule.dailyLimit ?? 1;
  if (usage.visitsUsed < limit) {
    throw new Error("The daily visit budget is not exhausted.");
  }
  return usage;
}
