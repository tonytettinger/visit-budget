import {
  EMERGENCY_PASS_DURATION_MS,
  evaluateEntry,
  getRuleStatus,
  startEmergencyPass,
} from "../../src/core/engine";
import type { DailyUsage, SiteRule } from "../../src/core/types";

const now = new Date(2026, 6, 5, 12, 0, 0);

function limitedRule(): SiteRule {
  return {
    id: "limited",
    hostname: "example.com",
    includeSubdomains: true,
    includePathPrefixes: ["/"],
    excludePathPrefixes: [],
    mode: "visit-limit",
    dailyLimit: 2,
    countTabReturns: false,
    dailyLockEnabled: false,
  };
}

function usage(overrides: Partial<DailyUsage> = {}): DailyUsage {
  return {
    ruleId: "limited",
    localDate: "2026-07-05",
    visitsUsed: 0,
    emergencyPassUsed: false,
    ...overrides,
  };
}

describe("visit decisions", () => {
  it("allows the first N entries and blocks N + 1", () => {
    const first = evaluateEntry(limitedRule(), undefined, now);
    expect(first.kind).toBe("allow");
    if (first.kind !== "allow") {
      throw new Error("Expected an allowed entry");
    }
    expect(first.remaining).toBe(1);

    const second = evaluateEntry(limitedRule(), first.usage, now);
    expect(second.kind).toBe("allow");
    if (second.kind !== "allow") {
      throw new Error("Expected an allowed entry");
    }
    expect(second.remaining).toBe(0);

    expect(evaluateEntry(limitedRule(), second.usage, now).kind).toBe(
      "limit-reached",
    );
  });

  it("never allows a permanent block", () => {
    const rule = {
      ...limitedRule(),
      mode: "permanent-block",
    } as SiteRule;
    delete rule.dailyLimit;
    expect(evaluateEntry(rule, undefined, now).kind).toBe(
      "permanently-blocked",
    );
  });

  it("resets stale usage on a new local date", () => {
    const decision = evaluateEntry(
      limitedRule(),
      usage({ localDate: "2026-07-04", visitsUsed: 2 }),
      now,
    );
    expect(decision.kind).toBe("allow");
    if (decision.kind === "allow") {
      expect(decision.usage.visitsUsed).toBe(1);
    }
  });
});

describe("emergency passes", () => {
  it("requires an intention and an exhausted budget", () => {
    expect(() =>
      startEmergencyPass(limitedRule(), usage({ visitsUsed: 2 }), " ", now),
    ).toThrow("Write a short intention");
    expect(() =>
      startEmergencyPass(limitedRule(), usage({ visitsUsed: 1 }), "Reply", now),
    ).toThrow("not exhausted");
  });

  it("grants one ten-minute pass and reports active access", () => {
    const granted = startEmergencyPass(
      limitedRule(),
      usage({ visitsUsed: 2 }),
      "Read one saved article",
      now,
    );
    expect(granted.emergencyPassExpiresAt).toBe(
      now.getTime() + EMERGENCY_PASS_DURATION_MS,
    );
    expect(getRuleStatus(limitedRule(), granted, now).kind).toBe(
      "emergency-access",
    );
    expect(evaluateEntry(limitedRule(), granted, now).kind).toBe(
      "emergency-access",
    );
  });

  it("does not restore a used pass after it expires", () => {
    const expired = usage({
      visitsUsed: 2,
      emergencyPassUsed: true,
      emergencyPassExpiresAt: now.getTime() - 1,
    });
    const status = getRuleStatus(limitedRule(), expired, now);
    expect(status.kind).toBe("limit-reached");
    if (status.kind === "limit-reached") {
      expect(status.emergencyPassAvailable).toBe(false);
    }
  });
});
