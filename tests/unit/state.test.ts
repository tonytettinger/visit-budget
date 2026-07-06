import {
  cancelPendingChange,
  createInitialState,
  deleteRule,
  refreshForCurrentDay,
  saveRule,
} from "../../src/core/state";
import type { SiteRule } from "../../src/core/types";

const today = new Date(2026, 6, 5, 12, 0, 0);
const tomorrow = new Date(2026, 6, 6, 8, 0, 0);

function rule(overrides: Partial<SiteRule> = {}): SiteRule {
  return {
    id: "rule-1",
    hostname: "example.com",
    includeSubdomains: true,
    includePathPrefixes: ["/"],
    excludePathPrefixes: [],
    mode: "visit-limit",
    dailyLimit: 3,
    dailyLockEnabled: false,
    ...overrides,
  };
}

describe("rule state", () => {
  it("saves unlocked rules immediately", () => {
    const result = saveRule(createInitialState(today), rule(), today);
    expect(result.scheduled).toBe(false);
    expect(result.state.rules).toHaveLength(1);
  });

  it("queues edits and deletion for locked rules", () => {
    const initial = saveRule(
      createInitialState(today),
      rule({ dailyLockEnabled: true }),
      today,
    ).state;
    const edited = saveRule(initial, rule({ dailyLimit: 9 }), today);
    expect(edited.scheduled).toBe(true);
    expect(edited.state.rules[0]?.dailyLimit).toBe(3);
    expect(edited.state.pendingChanges[0]?.replacement?.dailyLimit).toBe(9);

    const deleted = deleteRule(edited.state, "rule-1", today);
    expect(deleted.scheduled).toBe(true);
    expect(deleted.state.rules).toHaveLength(1);
    expect(deleted.state.pendingChanges[0]?.kind).toBe("delete");
  });

  it("applies pending changes and clears usage on the next day", () => {
    const initial = saveRule(
      createInitialState(today),
      rule({ dailyLockEnabled: true }),
      today,
    ).state;
    const edited = saveRule(initial, rule({ dailyLimit: 5 }), today).state;
    edited.usageByRule["rule-1"] = {
      ruleId: "rule-1",
      localDate: "2026-07-05",
      visitsUsed: 3,
      emergencyPassUsed: false,
    };

    const refreshed = refreshForCurrentDay(edited, tomorrow);
    expect(refreshed.rules[0]?.dailyLimit).toBe(5);
    expect(refreshed.pendingChanges).toHaveLength(0);
    expect(refreshed.usageByRule).toEqual({});
  });

  it("cancels a pending change without weakening the active rule", () => {
    const initial = saveRule(
      createInitialState(today),
      rule({ dailyLockEnabled: true }),
      today,
    ).state;
    const edited = saveRule(initial, rule({ dailyLimit: 5 }), today).state;
    const cancelled = cancelPendingChange(edited, "rule-1");
    expect(cancelled.pendingChanges).toHaveLength(0);
    expect(cancelled.rules[0]?.dailyLimit).toBe(3);
  });
});
