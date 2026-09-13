import { nextLocalMidnight } from "../core/date";
import { remainingActiveTimeMs } from "../core/engine";
import type { PersistedState, SessionState } from "../core/types";

export const MAINTENANCE_ALARM = "visit-budget-maintenance";

export async function scheduleMaintenance(
  state: PersistedState,
  session: SessionState,
  now = new Date(),
): Promise<void> {
  const overrideExpirations = Object.values(state.usageByRule)
    .map((usage) => usage.overrideSessionExpiresAt)
    .filter(
      (value): value is number => value !== undefined && value > now.getTime(),
    );
  const activeRule = state.rules.find(
    (rule) => rule.id === session.activeRuleId,
  );
  const activeTimeExpiry =
    activeRule?.mode === "time-limit" &&
    session.activeAccess === "allowed" &&
    session.activeTimeStartedAt !== undefined
      ? now.getTime() +
        remainingActiveTimeMs(
          activeRule,
          state.usageByRule[activeRule.id] ?? {
            ruleId: activeRule.id,
            localDate: state.localDate,
            visitsUsed: 0,
            activeTimeUsedMs: 0,
          },
        )
      : undefined;
  const when = Math.min(
    nextLocalMidnight(now),
    ...overrideExpirations,
    ...(activeTimeExpiry === undefined ? [] : [activeTimeExpiry]),
  );
  await chrome.alarms.create(MAINTENANCE_ALARM, { when });
}
