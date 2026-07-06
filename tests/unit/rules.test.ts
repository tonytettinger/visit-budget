import {
  findIndistinguishableRule,
  findMatchingRule,
  normalizePathPrefix,
  parseRuleTarget,
  permissionOriginsForRule,
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
});
