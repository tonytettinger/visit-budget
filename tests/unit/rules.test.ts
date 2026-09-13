import {
  findIndistinguishableRule,
  findMatchingRule,
  normalizeRule,
  normalizePathPrefix,
  parseRuleTarget,
  permissionOriginsForRule,
  safeBlockedTarget,
  urlMatchesRule,
} from "../../src/core/rules";
import type { SiteRule } from "../../src/core/types";

function rule(overrides: Partial<SiteRule> = {}): SiteRule {
  return {
    id: "rule-1",
    hostname: "example.com",
    includeSubdomains: true,
    includePathPrefixes: ["/"],
    excludePathPrefixes: [],
    mode: "visit-limit",
    dailyLimit: 3,
    countTabReturns: false,
    dailyLockEnabled: false,
    ...overrides,
  };
}

describe("rule parsing and normalization", () => {
  it("parses host-and-path input without a scheme", () => {
    expect(parseRuleTarget("BBC.com/news/")).toEqual({
      hostname: "bbc.com",
      pathPrefix: "/news",
    });
  });

  it("normalizes empty and repeated-slash paths", () => {
    expect(normalizePathPrefix("")).toBe("/");
    expect(normalizePathPrefix("//news///world/")).toBe("/news/world");
  });

  it("accepts 15-minute-step time budgets and removes visit-only settings", () => {
    const normalized = normalizeRule(
      rule({
        mode: "time-limit",
        dailyTimeLimitMinutes: 30,
        countTabReturns: true,
      }),
    );

    expect(normalized.dailyTimeLimitMinutes).toBe(30);
    expect(normalized.dailyLimit).toBeUndefined();
    expect(normalized.countTabReturns).toBe(false);
  });

  it.each([14, 31, 241])("rejects invalid daily time budget %i", (minutes) => {
    expect(() =>
      normalizeRule(
        rule({ mode: "time-limit", dailyTimeLimitMinutes: minutes }),
      ),
    ).toThrow("Daily time must be 15 minutes to 4 hours in 15-minute steps.");
  });
});

describe("rule matching", () => {
  it("matches configured subdomains but not sibling domains", () => {
    const candidate = rule();
    expect(urlMatchesRule("https://www.example.com/article", candidate)).toBe(
      true,
    );
    expect(urlMatchesRule("https://notexample.com/article", candidate)).toBe(
      false,
    );
  });

  it("applies path exclusions before includes", () => {
    const candidate = rule({
      includePathPrefixes: ["/news"],
      excludePathPrefixes: ["/news/live"],
    });
    expect(urlMatchesRule("https://example.com/news/world", candidate)).toBe(
      true,
    );
    expect(urlMatchesRule("https://example.com/news/live", candidate)).toBe(
      false,
    );
  });

  it("does not confuse a prefix with a partial path segment", () => {
    const candidate = rule({ includePathPrefixes: ["/news"] });
    expect(urlMatchesRule("https://example.com/newsletter", candidate)).toBe(
      false,
    );
  });

  it("prefers exact hosts, longer paths, and permanent blocks", () => {
    const broad = rule({ id: "broad" });
    const exact = rule({
      id: "exact",
      hostname: "www.example.com",
      includeSubdomains: false,
    });
    const path = rule({
      id: "path",
      hostname: "www.example.com",
      includeSubdomains: false,
      includePathPrefixes: ["/watch"],
    });
    const block = rule({
      id: "block",
      hostname: "www.example.com",
      includeSubdomains: false,
      includePathPrefixes: ["/watch"],
      mode: "permanent-block",
    });
    delete block.dailyLimit;

    expect(
      findMatchingRule("https://www.example.com/watch/1", [
        broad,
        exact,
        path,
        block,
      ])?.id,
    ).toBe("block");
  });

  it("detects matching duplicate scopes", () => {
    const candidate = rule({ id: "new", mode: "permanent-block" });
    delete candidate.dailyLimit;
    expect(findIndistinguishableRule(candidate, [rule()])?.id).toBe("rule-1");
  });

  it("requests only configured host origins", () => {
    expect(permissionOriginsForRule(rule())).toEqual([
      "http://example.com/*",
      "https://example.com/*",
      "http://*.example.com/*",
      "https://*.example.com/*",
    ]);
  });

  it("returns only a matching HTTP target from a blocked-page URL", () => {
    expect(
      safeBlockedTarget(
        "https://mail.example.com/inbox?message=1#reply",
        rule(),
      ),
    ).toBe("https://mail.example.com/inbox?message=1#reply");
    expect(safeBlockedTarget("https://attacker.test/", rule())).toBe(
      "https://example.com/",
    );
    expect(safeBlockedTarget("javascript:alert(1)", rule())).toBe(
      "https://example.com/",
    );
  });
});
