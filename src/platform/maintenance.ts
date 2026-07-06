import { nextLocalMidnight } from "../core/date";
import type { PersistedState } from "../core/types";

export const MAINTENANCE_ALARM = "visit-budget-maintenance";

export async function scheduleMaintenance(
  state: PersistedState,
  now = new Date(),
): Promise<void> {
  const passExpirations = Object.values(state.usageByRule)
    .map((usage) => usage.emergencyPassExpiresAt)
    .filter(
      (value): value is number => value !== undefined && value > now.getTime(),
    );
  const when = Math.min(nextLocalMidnight(now), ...passExpirations);
  await chrome.alarms.create(MAINTENANCE_ALARM, { when });
}
