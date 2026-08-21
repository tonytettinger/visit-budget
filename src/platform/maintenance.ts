import { nextLocalMidnight } from "../core/date";
import type { PersistedState } from "../core/types";

export const MAINTENANCE_ALARM = "visit-budget-maintenance";

export async function scheduleMaintenance(
  state: PersistedState,
  now = new Date(),
): Promise<void> {
  const overrideExpirations = Object.values(state.usageByRule)
    .map((usage) => usage.overrideSessionExpiresAt)
    .filter(
      (value): value is number => value !== undefined && value > now.getTime(),
    );
  const when = Math.min(nextLocalMidnight(now), ...overrideExpirations);
  await chrome.alarms.create(MAINTENANCE_ALARM, { when });
}
