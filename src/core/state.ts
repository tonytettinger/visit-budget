import { localDateKey, nextLocalDateKey } from "./date";
import { findIndistinguishableRule, normalizeRule } from "./rules";
import type {
  DailyUsage,
  PendingRuleChange,
  PersistedState,
  RuleMutationResult,
  SiteRule,
} from "./types";

export function createInitialState(now = new Date()): PersistedState {
  return {
    schemaVersion: 3,
    localDate: localDateKey(now),
    rules: [],
    usageByRule: {},
    pendingChanges: [],
  };
}

interface LegacyDailyUsage extends DailyUsage {
  emergencyPassExpiresAt?: number;
  emergencyPassUsed?: boolean;
}

type StoredState = Omit<PersistedState, "schemaVersion" | "usageByRule"> & {
  schemaVersion: 1 | 2 | 3;
  usageByRule: Record<string, DailyUsage | LegacyDailyUsage>;
};

export function migrateState(raw: unknown, now = new Date()): PersistedState {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("schemaVersion" in raw) ||
    (raw.schemaVersion !== 1 &&
      raw.schemaVersion !== 2 &&
      raw.schemaVersion !== 3)
  ) {
    return createInitialState(now);
  }

  const stored = raw as StoredState;
  return {
    ...stored,
    schemaVersion: 3,
    rules: stored.rules.map(normalizeRule),
    usageByRule: Object.fromEntries(
      Object.entries(stored.usageByRule).map(([ruleId, usage]) => [
        ruleId,
        migrateUsage(usage),
      ]),
    ),
    pendingChanges: stored.pendingChanges.map((change) =>
      change.replacement
        ? { ...change, replacement: normalizeRule(change.replacement) }
        : change,
    ),
  };
}

function migrateUsage(usage: DailyUsage | LegacyDailyUsage): DailyUsage {
  const legacy = usage as LegacyDailyUsage;
  const overrideSessionExpiresAt =
    usage.overrideSessionExpiresAt ?? legacy.emergencyPassExpiresAt;
  return {
    ruleId: usage.ruleId,
    localDate: usage.localDate,
    visitsUsed: usage.visitsUsed,
    ...(overrideSessionExpiresAt === undefined
      ? {}
      : { overrideSessionExpiresAt }),
  };
}

export function refreshForCurrentDay(
  state: PersistedState,
  now = new Date(),
): PersistedState {
  const today = localDateKey(now);
  if (state.localDate === today) {
    return state;
  }

  let rules = [...state.rules];
  const pendingChanges = [...state.pendingChanges].sort((a, b) =>
    a.effectiveDate.localeCompare(b.effectiveDate),
  );
  const futureChanges: PendingRuleChange[] = [];

  for (const change of pendingChanges) {
    if (change.effectiveDate > today) {
      futureChanges.push(change);
      continue;
    }

    if (change.kind === "delete") {
      rules = rules.filter((rule) => rule.id !== change.ruleId);
      continue;
    }

    if (change.replacement) {
      const replacement = normalizeRule(change.replacement);
      const index = rules.findIndex((rule) => rule.id === change.ruleId);
      if (index === -1) {
        rules.push(replacement);
      } else {
        rules[index] = replacement;
      }
    }
  }

  return {
    ...state,
    localDate: today,
    rules,
    usageByRule: {},
    pendingChanges: futureChanges,
  };
}

export function saveRule(
  rawState: PersistedState,
  rawRule: SiteRule,
  now = new Date(),
): RuleMutationResult {
  const state = refreshForCurrentDay(rawState, now);
  const rule = normalizeRule(rawRule);
  const duplicate = findIndistinguishableRule(rule, state.rules);
  if (duplicate) {
    throw new Error(
      `A matching rule already exists for ${duplicate.hostname}.`,
    );
  }

  const existing = state.rules.find((item) => item.id === rule.id);
  if (existing?.dailyLockEnabled) {
    return {
      state: withPendingChange(state, {
        ruleId: rule.id,
        effectiveDate: nextLocalDateKey(now),
        kind: "replace",
        replacement: rule,
      }),
      scheduled: true,
    };
  }

  const rules = existing
    ? state.rules.map((item) => (item.id === rule.id ? rule : item))
    : [...state.rules, rule];

  return {
    state: {
      ...state,
      rules,
      pendingChanges: state.pendingChanges.filter(
        (change) => change.ruleId !== rule.id,
      ),
    },
    scheduled: false,
  };
}

export function deleteRule(
  rawState: PersistedState,
  ruleId: string,
  now = new Date(),
): RuleMutationResult {
  const state = refreshForCurrentDay(rawState, now);
  const existing = state.rules.find((rule) => rule.id === ruleId);
  if (!existing) {
    return { state, scheduled: false };
  }

  if (existing.dailyLockEnabled) {
    return {
      state: withPendingChange(state, {
        ruleId,
        effectiveDate: nextLocalDateKey(now),
        kind: "delete",
      }),
      scheduled: true,
    };
  }

  const usageByRule = Object.fromEntries(
    Object.entries(state.usageByRule).filter(([id]) => id !== ruleId),
  );
  return {
    state: {
      ...state,
      rules: state.rules.filter((rule) => rule.id !== ruleId),
      usageByRule,
      pendingChanges: state.pendingChanges.filter(
        (change) => change.ruleId !== ruleId,
      ),
    },
    scheduled: false,
  };
}

export function cancelPendingChange(
  state: PersistedState,
  ruleId: string,
): PersistedState {
  return {
    ...state,
    pendingChanges: state.pendingChanges.filter(
      (change) => change.ruleId !== ruleId,
    ),
  };
}

function withPendingChange(
  state: PersistedState,
  pending: PendingRuleChange,
): PersistedState {
  return {
    ...state,
    pendingChanges: [
      ...state.pendingChanges.filter(
        (change) => change.ruleId !== pending.ruleId,
      ),
      pending,
    ],
  };
}
