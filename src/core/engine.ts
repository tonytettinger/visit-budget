import { localDateKey } from "./date";
import type { DailyUsage, EntryDecision, RuleStatus, SiteRule } from "./types";

export const EMERGENCY_PASS_DURATION_MS = 10 * 60 * 1000;
export const EMERGENCY_PAUSE_SECONDS = 15;

export function createDailyUsage(ruleId: string, now: Date): DailyUsage {
  return {
    ruleId,
    localDate: localDateKey(now),
    visitsUsed: 0,
    emergencyPassUsed: false,
  };
}

export function currentUsage(
  ruleId: string,
  usage: DailyUsage | undefined,
  now: Date,
): DailyUsage {
  if (usage?.localDate === localDateKey(now)) {
    if (
      usage.emergencyPassExpiresAt !== undefined &&
      usage.emergencyPassExpiresAt <= now.getTime()
    ) {
      const expired = { ...usage };
      delete expired.emergencyPassExpiresAt;
      return expired;
    }
    return { ...usage };
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
    usage.emergencyPassExpiresAt !== undefined &&
    usage.emergencyPassExpiresAt > now.getTime()
  ) {
    return {
      kind: "emergency-access",
      ruleId: rule.id,
      expiresAt: usage.emergencyPassExpiresAt,
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
    emergencyPassAvailable: !usage.emergencyPassUsed,
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
    usage.emergencyPassExpiresAt !== undefined &&
    usage.emergencyPassExpiresAt > now.getTime()
  ) {
    return {
      kind: "emergency-access",
      rule,
      usage,
      expiresAt: usage.emergencyPassExpiresAt,
    };
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
    emergencyPassAvailable: !usage.emergencyPassUsed,
  };
}

export function startEmergencyPass(
  rule: SiteRule,
  existingUsage: DailyUsage | undefined,
  intention: string,
  now: Date,
): DailyUsage {
  if (!intention.trim()) {
    throw new Error("Write a short intention before continuing.");
  }
  if (rule.mode !== "visit-limit") {
    throw new Error("Permanent blocks do not have an emergency pass.");
  }

  const usage = currentUsage(rule.id, existingUsage, now);
  const limit = rule.dailyLimit ?? 1;
  if (usage.visitsUsed < limit) {
    throw new Error("The daily visit budget is not exhausted.");
  }
  if (usage.emergencyPassUsed) {
    throw new Error("Today's emergency pass has already been used.");
  }

  return {
    ...usage,
    emergencyPassUsed: true,
    emergencyPassExpiresAt: now.getTime() + EMERGENCY_PASS_DURATION_MS,
  };
}
