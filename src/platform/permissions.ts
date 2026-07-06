import { permissionOriginsForRule } from "../core/rules";
import type { SiteRule } from "../core/types";

export async function requestRulePermission(rule: SiteRule): Promise<boolean> {
  return chrome.permissions.request({
    origins: permissionOriginsForRule(rule),
  });
}

export async function hasRulePermission(rule: SiteRule): Promise<boolean> {
  return chrome.permissions.contains({
    origins: permissionOriginsForRule(rule),
  });
}

export async function permissionMap(
  rules: readonly SiteRule[],
): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    rules.map(
      async (rule) => [rule.id, await hasRulePermission(rule)] as const,
    ),
  );
  return Object.fromEntries(entries);
}

export async function removeUnusedHostPermissions(
  rules: readonly SiteRule[],
): Promise<void> {
  const granted = await chrome.permissions.getAll();
  const grantedOrigins = granted.origins ?? [];
  const required = new Set(rules.flatMap(permissionOriginsForRule));
  const removable = grantedOrigins.filter(
    (origin) =>
      (origin.startsWith("http://") || origin.startsWith("https://")) &&
      !required.has(origin),
  );
  if (removable.length > 0) {
    await chrome.permissions.remove({ origins: removable });
  }
}
