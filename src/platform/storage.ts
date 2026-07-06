import { createInitialState, refreshForCurrentDay } from "../core/state";
import type { PersistedState, SessionState } from "../core/types";

const LOCAL_STATE_KEY = "visitBudgetState";
const SESSION_STATE_KEY = "visitBudgetSession";

export async function loadState(now = new Date()): Promise<PersistedState> {
  const result = await chrome.storage.local.get(LOCAL_STATE_KEY);
  const raw = result[LOCAL_STATE_KEY];
  const state = migrateState(raw, now);
  const refreshed = refreshForCurrentDay(state, now);
  if (refreshed !== state) {
    await saveState(refreshed);
  }
  return refreshed;
}

export async function saveState(state: PersistedState): Promise<void> {
  await chrome.storage.local.set({ [LOCAL_STATE_KEY]: state });
}

export async function loadSession(): Promise<SessionState> {
  const result = await chrome.storage.session.get(SESSION_STATE_KEY);
  const raw = result[SESSION_STATE_KEY];
  if (!raw || typeof raw !== "object") {
    return { browserFocused: true };
  }
  return raw as SessionState;
}

export async function saveSession(state: SessionState): Promise<void> {
  await chrome.storage.session.set({ [SESSION_STATE_KEY]: state });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.session.remove(SESSION_STATE_KEY);
}

function migrateState(raw: unknown, now: Date): PersistedState {
  if (
    raw &&
    typeof raw === "object" &&
    "schemaVersion" in raw &&
    raw.schemaVersion === 1
  ) {
    return raw as PersistedState;
  }
  return createInitialState(now);
}
