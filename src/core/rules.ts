import type { SiteRule } from "./types";

type RuleInput = Omit<SiteRule, "countTabReturns"> & {
  countTabReturns?: boolean;
};

export interface ParsedRuleTarget {
  hostname: string;
  pathPrefix: string;
}

export function parseRuleTarget(value: string): ParsedRuleTarget {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Enter a website.");
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid website.");
  }

  if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
    throw new Error("Only HTTP and HTTPS websites are supported.");
  }

  return {
    hostname: normalizeHostname(url.hostname),
    pathPrefix: normalizePathPrefix(url.pathname),
  };
}

export function normalizeHostname(hostname: string): string {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized.includes("/") || normalized.includes(" ")) {
    throw new Error("Enter a valid hostname.");
  }
  return normalized;
}

export function normalizePathPrefix(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const pathname = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/$/, "") : collapsed;
}

export function normalizePathPrefixes(paths: readonly string[]): string[] {
  return [...new Set(paths.map(normalizePathPrefix))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function normalizeRule(rule: RuleInput): SiteRule {
  const normalized: SiteRule = {
    ...rule,
    hostname: normalizeHostname(rule.hostname),
    includePathPrefixes: normalizePathPrefixes(rule.includePathPrefixes),
    excludePathPrefixes: normalizePathPrefixes(rule.excludePathPrefixes),
    countTabReturns: rule.countTabReturns ?? false,
  };

  if (normalized.includePathPrefixes.length === 0) {
    normalized.includePathPrefixes = ["/"];
  }

  if (normalized.mode === "visit-limit") {
    if (
      normalized.dailyLimit === undefined ||
      !Number.isInteger(normalized.dailyLimit) ||
      normalized.dailyLimit < 1 ||
      normalized.dailyLimit > 999
    ) {
      throw new Error("Daily visits must be a whole number from 1 to 999.");
    }
  } else {
    delete normalized.dailyLimit;
    normalized.countTabReturns = false;
  }

  return normalized;
}

export function urlMatchesRule(urlValue: string, rule: SiteRule): boolean {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return false;
  }

  const hostname = normalizeHostname(url.hostname);
  const hostMatches =
    hostname === rule.hostname ||
    (rule.includeSubdomains && hostname.endsWith(`.${rule.hostname}`));
  if (!hostMatches) {
    return false;
  }

  const path = normalizePathPrefix(url.pathname);
  const included = rule.includePathPrefixes.some((prefix) =>
    pathMatchesPrefix(path, prefix),
  );
  if (!included) {
    return false;
  }

  return !rule.excludePathPrefixes.some((prefix) =>
    pathMatchesPrefix(path, prefix),
  );
}

export function findMatchingRule(
  urlValue: string,
  rules: readonly SiteRule[],
): SiteRule | undefined {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return undefined;
  }

  if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
    return undefined;
  }

  const hostname = normalizeHostname(url.hostname);
  const pathname = normalizePathPrefix(url.pathname);
  const matches = rules.filter((rule) => urlMatchesRule(urlValue, rule));

  matches.sort((left, right) => {
    const leftExact = left.hostname === hostname ? 1 : 0;
    const rightExact = right.hostname === hostname ? 1 : 0;
    if (leftExact !== rightExact) {
      return rightExact - leftExact;
    }

    if (left.hostname.length !== right.hostname.length) {
      return right.hostname.length - left.hostname.length;
    }

    const leftPath = longestMatchingPrefix(pathname, left.includePathPrefixes);
    const rightPath = longestMatchingPrefix(
      pathname,
      right.includePathPrefixes,
    );
    if (leftPath !== rightPath) {
      return rightPath - leftPath;
    }

    if (left.mode !== right.mode) {
      return left.mode === "permanent-block" ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });

  return matches[0];
}

export function findIndistinguishableRule(
  candidate: SiteRule,
  rules: readonly SiteRule[],
): SiteRule | undefined {
  const normalized = normalizeRule(candidate);
  return rules.find((rule) => {
    if (rule.id === normalized.id) {
      return false;
    }
    const existing = normalizeRule(rule);
    return (
      existing.hostname === normalized.hostname &&
      existing.includeSubdomains === normalized.includeSubdomains &&
      arraysEqual(
        existing.includePathPrefixes,
        normalized.includePathPrefixes,
      ) &&
      arraysEqual(existing.excludePathPrefixes, normalized.excludePathPrefixes)
    );
  });
}

export function permissionOriginsForRule(rule: SiteRule): string[] {
  const hosts =
    rule.includeSubdomains && supportsSubdomains(rule.hostname)
      ? [rule.hostname, `*.${rule.hostname}`]
      : [rule.hostname];
  return hosts.flatMap((host) => [`http://${host}/*`, `https://${host}/*`]);
}

function supportsSubdomains(hostname: string): boolean {
  return (
    hostname !== "localhost" &&
    !hostname.includes(":") &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

function pathMatchesPrefix(path: string, prefix: string): boolean {
  return prefix === "/" || path === prefix || path.startsWith(`${prefix}/`);
}

function longestMatchingPrefix(
  pathname: string,
  prefixes: readonly string[],
): number {
  return prefixes.reduce(
    (longest, prefix) =>
      pathMatchesPrefix(pathname, prefix)
        ? Math.max(longest, prefix.length)
        : longest,
    0,
  );
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
