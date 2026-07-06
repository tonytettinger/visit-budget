import { permissionOriginsForRule } from "../core/rules";
import type { SiteRule } from "../core/types";
import { hasRulePermission } from "./permissions";

const CONTENT_SCRIPT_ID = "visit-budget-guard";

export async function reconcileContentScript(
  rules: readonly SiteRule[],
): Promise<void> {
  const registered = await chrome.scripting.getRegisteredContentScripts({
    ids: [CONTENT_SCRIPT_ID],
  });
  if (registered.length > 0) {
    await chrome.scripting.unregisterContentScripts({
      ids: [CONTENT_SCRIPT_ID],
    });
  }

  const permittedRules = (
    await Promise.all(
      rules.map(async (rule) => ({
        permitted: await hasRulePermission(rule),
        rule,
      })),
    )
  ).filter(({ permitted }) => permitted);
  const matches = [
    ...new Set(
      permittedRules.flatMap(({ rule }) => permissionOriginsForRule(rule)),
    ),
  ];

  if (matches.length === 0) {
    return;
  }

  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: ["content-guard.js"],
      matches,
      persistAcrossSessions: true,
      runAt: "document_start",
    },
  ]);
}

export async function injectGuardIntoExistingTabs(
  rules: readonly SiteRule[],
): Promise<void> {
  const patterns = [
    ...new Set(
      (
        await Promise.all(
          rules.map(async (rule) =>
            (await hasRulePermission(rule))
              ? permissionOriginsForRule(rule)
              : [],
          ),
        )
      ).flat(),
    ),
  ];

  if (patterns.length === 0) {
    return;
  }

  const tabs = await chrome.tabs.query({ url: patterns });
  await Promise.allSettled(
    tabs
      .filter(
        (tab): tab is chrome.tabs.Tab & { id: number } => tab.id !== undefined,
      )
      .map((tab) =>
        chrome.scripting.executeScript({
          files: ["content-guard.js"],
          target: { tabId: tab.id },
        }),
      ),
  );
}
