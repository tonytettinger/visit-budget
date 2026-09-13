import { isClientRequest } from "../../src/shared/messages";

describe("extension message validation", () => {
  it("accepts valid requests and rejects malformed or unknown messages", () => {
    expect(isClientRequest({ type: "GET_STATE" })).toBe(true);
    expect(
      isClientRequest({
        type: "CONFIRM_OVERRIDE",
        ruleId: "rule-1",
        durationMinutes: 25,
        code: "XyZ91",
      }),
    ).toBe(true);
    expect(isClientRequest({ type: "UNKNOWN" })).toBe(false);
    expect(isClientRequest({ type: "DELETE_RULE", ruleId: 12 })).toBe(false);
    expect(
      isClientRequest({
        type: "CONFIRM_OVERRIDE",
        ruleId: "rule-1",
        durationMinutes: 25,
        code: "1234",
      }),
    ).toBe(false);
    expect(
      isClientRequest({
        type: "START_OVERRIDE_CONFIRMATION",
        ruleId: "rule-1",
        durationMinutes: 25.5,
      }),
    ).toBe(false);
    expect(
      isClientRequest({
        type: "SAVE_RULE",
        rule: {
          id: "rule-1",
          hostname: "example.com",
          includeSubdomains: true,
          includePathPrefixes: ["/"],
          excludePathPrefixes: [],
          mode: "time-limit",
          dailyTimeLimitMinutes: 30,
          countTabReturns: false,
          dailyLockEnabled: false,
        },
      }),
    ).toBe(true);
    expect(
      isClientRequest({
        type: "SAVE_RULE",
        rule: { id: "rule-1", hostname: "example.com" },
      }),
    ).toBe(false);
  });
});
