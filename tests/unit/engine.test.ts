import {
  MAXIMUM_OVERRIDE_DURATION_MINUTES,
  MINIMUM_OVERRIDE_DURATION_MINUTES,
  evaluateEntry,
  getRuleStatus,
  settleActiveTime,
  startOverrideSession,
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
    ...overrides,
  };
}

function timeLimitedRule(): SiteRule {
  return {
    ...limitedRule(),
    id: "timed",
    mode: "time-limit",
    dailyTimeLimitMinutes: 30,
    countTabReturns: false,
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

describe("emergency overrides", () => {
  it("requires a valid duration and an exhausted budget", () => {
    expect(() =>
      startOverrideSession(
        limitedRule(),
        usage({ visitsUsed: 2 }),
        MINIMUM_OVERRIDE_DURATION_MINUTES - 1,
        now,
      ),
    ).toThrow("Choose an override");
    expect(() =>
      startOverrideSession(limitedRule(), usage({ visitsUsed: 1 }), 10, now),
    ).toThrow("not exhausted");
  });

  it("never grants an override for a permanent block", () => {
    const permanentRule = {
      ...limitedRule(),
      mode: "permanent-block",
    } as SiteRule;
    delete permanentRule.dailyLimit;
    expect(() =>
      startOverrideSession(permanentRule, usage({ visitsUsed: 2 }), 10, now),
    ).toThrow("Permanent blocks do not have an emergency override");
  });

  it("grants the selected override duration and reports active access", () => {
    const granted = startOverrideSession(
      limitedRule(),
      usage({ visitsUsed: 2 }),
      25,
      now,
    );
    expect(granted.overrideSessionExpiresAt).toBe(now.getTime() + 25 * 60_000);
    expect(getRuleStatus(limitedRule(), granted, now).kind).toBe(
      "override-session",
    );
    expect(evaluateEntry(limitedRule(), granted, now).kind).toBe(
      "override-session",
    );
  });

  it("allows another full override after the previous session expires", () => {
    const expired = usage({
      visitsUsed: 2,
      overrideSessionExpiresAt: now.getTime() - 1,
    });
    const status = getRuleStatus(limitedRule(), expired, now);
    expect(status.kind).toBe("limit-reached");
    const repeated = startOverrideSession(
      limitedRule(),
      expired,
      MAXIMUM_OVERRIDE_DURATION_MINUTES,
      now,
    );
    expect(repeated.overrideSessionExpiresAt).toBe(
      now.getTime() + MAXIMUM_OVERRIDE_DURATION_MINUTES * 60_000,
    );
  });

  it("allows a time-budget override only after its allowance is used", () => {
    const rule = timeLimitedRule();
    expect(() =>
      startOverrideSession(
        rule,
        {
          ruleId: rule.id,
          localDate: "2026-07-05",
          visitsUsed: 0,
          activeTimeUsedMs: 29 * 60_000,
        },
        5,
        now,
      ),
    ).toThrow("time budget is not exhausted");

    const granted = startOverrideSession(
      rule,
      {
        ruleId: rule.id,
        localDate: "2026-07-05",
        visitsUsed: 0,
        activeTimeUsedMs: 30 * 60_000,
      },
      5,
      now,
    );
    expect(granted.overrideSessionExpiresAt).toBe(now.getTime() + 5 * 60_000);
  });
});

describe("time budgets", () => {
  it("uses only the elapsed focused-tab segment", () => {
    const rule = timeLimitedRule();
    const startedAt = now.getTime();
    const settled = settleActiveTime(
      rule,
      {
        ruleId: rule.id,
        localDate: "2026-07-05",
        visitsUsed: 0,
        activeTimeUsedMs: 20 * 60_000,
      },
      startedAt,
      new Date(startedAt + 5 * 60_000),
    );

    expect(settled.activeTimeUsedMs).toBe(25 * 60_000);
    const status = getRuleStatus(rule, settled, now);
    expect(status.kind).toBe("available");
    if (status.kind === "available") {
      expect(status.remaining).toBe(5 * 60_000);
    }
  });

  it("blocks once the time budget is exhausted", () => {
    const rule = timeLimitedRule();
    const settled = settleActiveTime(
      rule,
      {
        ruleId: rule.id,
        localDate: "2026-07-05",
        visitsUsed: 0,
        activeTimeUsedMs: 29 * 60_000,
      },
      now.getTime(),
      new Date(now.getTime() + 2 * 60_000),
    );

    expect(settled.activeTimeUsedMs).toBe(30 * 60_000);
    expect(getRuleStatus(rule, settled, now).kind).toBe("limit-reached");
    expect(evaluateEntry(rule, settled, now).kind).toBe("limit-reached");
  });

  it("does not add time when the recorded start is in the future", () => {
    const rule = timeLimitedRule();
    const settled = settleActiveTime(
      rule,
      {
        ruleId: rule.id,
        localDate: "2026-07-05",
        visitsUsed: 0,
        activeTimeUsedMs: 10 * 60_000,
      },
      now.getTime() + 60_000,
      now,
    );
    expect(settled.activeTimeUsedMs).toBe(10 * 60_000);
  });

  it("starts a fresh daily total at local midnight", () => {
    const rule = timeLimitedRule();
    const afterMidnight = new Date(2026, 6, 6, 0, 5, 0);
    const settled = settleActiveTime(
      rule,
      {
        ruleId: rule.id,
        localDate: "2026-07-05",
        visitsUsed: 0,
        activeTimeUsedMs: 25 * 60_000,
      },
      new Date(2026, 6, 5, 23, 55, 0).getTime(),
      afterMidnight,
    );

    expect(settled.localDate).toBe("2026-07-06");
    expect(settled.activeTimeUsedMs).toBe(5 * 60_000);
  });
});
