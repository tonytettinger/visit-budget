import { formatResetTime } from "../core/date";
import {
  evaluateEntry,
  getRuleStatus,
  settleActiveTime,
  startOverrideSession,
  validateOverrideRequest,
} from "../core/engine";
import { findMatchingRule } from "../core/rules";
import { cancelPendingChange, deleteRule, saveRule } from "../core/state";
import type {
  EntryReceipt,
  EntryDecision,
  PersistedState,
  RuleStatus,
  SessionState,
  SiteRule,
} from "../core/types";
import { updateBadge } from "../platform/badge";
import { reconcileBlockingRules } from "../platform/blocking";
import {
  injectGuardIntoExistingTabs,
  reconcileContentScript,
} from "../platform/content-scripts";
import {
  MAINTENANCE_ALARM,
  scheduleMaintenance,
} from "../platform/maintenance";
import {
  hasRulePermission,
  permissionMap,
  removeUnusedHostPermissions,
} from "../platform/permissions";
import { runExclusive } from "../platform/serial";
import {
  clearSession,
  loadSession,
  loadState,
  saveSession,
  saveState,
} from "../platform/storage";
import type {
  BlockedContext,
  ClientRequest,
  ClientResponse,
  CurrentSiteView,
  GuardUpdate,
  PageContext,
  StateView,
} from "../shared/messages";
import { isClientRequest } from "../shared/messages";

const OVERRIDE_PAUSE_MS = 15_000;
const OVERRIDE_CONFIRMATION_TTL_MS = 5 * 60 * 1000;
const OVERRIDE_CODE_LENGTH = 5;
const OVERRIDE_CODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
let blockingFingerprint = "";

chrome.runtime.onInstalled.addListener(() => {
  void runExclusive(async () => {
    const state = await loadState();
    const session = await settleSessionTime(state, await loadSession());
    await saveSession(session);
    await reconcileAll(state, session, true);
  }).catch(reportError);
});

chrome.runtime.onStartup.addListener(() => {
  void runExclusive(async () => {
    await clearSession();
    const session: SessionState = { browserFocused: true };
    await saveSession(session);
    const state = await loadState();
    await reconcileAll(state, session, true);
    await processCurrentActiveTab();
  }).catch(reportError);
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void runExclusive(async () => {
    const window = await chrome.windows.get(windowId);
    if (!window.focused) {
      return;
    }
    const tab = await getTabIfAvailable(tabId);
    if (!tab) {
      return;
    }
    await processActiveUrl(
      tabId,
      windowId,
      tab.url ?? tab.pendingUrl ?? "about:blank",
    );
  }).catch(reportError);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void runExclusive(async () => {
    const state = await loadState();
    const session = await settleSessionTime(state, await loadSession());
    await saveSession(removeEntryReceipt(session, tabId));
    await processCurrentActiveTab();
  }).catch(reportError);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  void runExclusive(async () => {
    const state = await loadState();
    const session = await settleSessionTime(state, await loadSession());
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await saveSession({ ...session, browserFocused: false });
      await reconcileAll(state, session, false);
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, windowId });
    const tab = tabs[0];
    if (tab?.id === undefined) {
      return;
    }
    await processActiveUrl(
      tab.id,
      windowId,
      tab.url ?? tab.pendingUrl ?? "about:blank",
    );
  }).catch(reportError);
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }
  void runExclusive(() => processNavigation(details.tabId, details.url)).catch(
    reportError,
  );
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }
  void runExclusive(() => processNavigation(details.tabId, details.url)).catch(
    reportError,
  );
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== MAINTENANCE_ALARM) {
    return;
  }
  void runExclusive(async () => {
    const state = await loadState();
    let session = await settleSessionTime(state, await loadSession());
    if (session.activeAccess === "override-session") {
      const activeRule = state.rules.find(
        (rule) => rule.id === session.activeRuleId,
      );
      if (activeRule) {
        const status = getRuleStatus(
          activeRule,
          state.usageByRule[activeRule.id],
          new Date(),
        );
        if (status.kind !== "override-session") {
          session = {
            ...session,
            activeAccess: "blocked",
          };
          delete session.activeRemaining;
          await saveSession(session);
        }
      }
    }
    session = exhaustActiveTimeIfNeeded(state, session, new Date());
    await saveSession(session);
    await reconcileAll(state, session, false);
    await refreshActiveGuard();
  }).catch(reportError);
});

chrome.permissions.onAdded.addListener(() => {
  void runExclusive(async () => {
    const state = await loadState();
    const session = await settleSessionTime(state, await loadSession());
    await saveSession(session);
    await reconcileAll(state, session, true);
  }).catch(reportError);
});

chrome.permissions.onRemoved.addListener(() => {
  void runExclusive(async () => {
    const state = await loadState();
    const session = await settleSessionTime(state, await loadSession());
    await saveSession(session);
    await reconcileAll(state, session, false);
  }).catch(reportError);
});

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ClientResponse) => void,
  ) => {
    if (!isClientRequest(message)) {
      return false;
    }

    void runExclusive(() => handleRequest(message, sender))
      .then((payload) => {
        sendResponse({ ok: true, payload });
      })
      .catch((error: unknown) => {
        sendResponse({ ok: false, error: errorMessage(error) });
      });
    return true;
  },
);

async function handleRequest(
  request: ClientRequest,
  sender: chrome.runtime.MessageSender,
): Promise<
  | BlockedContext
  | CurrentSiteView
  | PageContext
  | StateView
  | PersistedState
  | RuleStatus
  | EntryDecision
  | { scheduled: boolean; state: PersistedState }
  | { cancelled: true }
  | { opened: true }
  | { code: string }
  | { expiresAt: number }
> {
  switch (request.type) {
    case "GET_STATE": {
      const state = await loadState();
      return {
        state,
        permissionByRule: await permissionMap(state.rules),
      };
    }
    case "GET_CURRENT_SITE":
      return getCurrentSiteView(request.tabId);
    case "GET_PAGE_CONTEXT":
      return getPageContext(request.url, sender);
    case "OPEN_FRESH_TAB":
      await chrome.tabs.create({ active: true });
      return { opened: true };
    case "GET_BLOCKED_CONTEXT":
      return getBlockedContext(request.ruleId);
    case "SAVE_RULE": {
      const state = await loadState();
      const result = saveRule(state, request.rule);
      await saveState(result.state);
      const session = await loadSession();
      await reconcileAll(result.state, session, true);
      await processCurrentActiveTab();
      return result;
    }
    case "DELETE_RULE": {
      const state = await loadState();
      const result = deleteRule(state, request.ruleId);
      await saveState(result.state);
      const session = await loadSession();
      await refreshAllAccessibleGuards(result.state, session);
      await reconcileAll(result.state, session, false);
      await removeUnusedHostPermissions(result.state.rules);
      return result;
    }
    case "CANCEL_PENDING_CHANGE": {
      const state = cancelPendingChange(await loadState(), request.ruleId);
      await saveState(state);
      return { cancelled: true };
    }
    case "START_OVERRIDE_CONFIRMATION":
      return await startOverrideConfirmation(
        request.ruleId,
        request.durationMinutes,
      );
    case "CANCEL_OVERRIDE_CONFIRMATION":
      await cancelOverrideConfirmation(request.ruleId);
      return { cancelled: true };
    case "CONFIRM_OVERRIDE":
      return await confirmOverride(
        request.ruleId,
        request.durationMinutes,
        request.code,
      );
  }
}

async function getPageContext(
  url: string,
  sender: chrome.runtime.MessageSender,
): Promise<PageContext> {
  const tabId = sender.tab?.id;
  const status =
    tabId !== undefined && sender.tab?.active
      ? await processActiveUrl(
          tabId,
          sender.tab.windowId,
          sender.tab.url ?? url,
        )
      : await statusForUrl(url);

  if (tabId === undefined) {
    return { status };
  }

  const session = await loadSession();
  const receipt = session.entryReceiptByTab?.[String(tabId)];
  if (!receipt) {
    return { status };
  }

  await saveSession(removeEntryReceipt(session, tabId));
  if (status.kind !== "available" || status.rule.id !== receipt.ruleId) {
    return { status };
  }
  return { status, entryReceipt: receipt };
}

async function processNavigation(tabId: number, url: string): Promise<void> {
  const tab = await getTabIfAvailable(tabId);
  if (!tab) {
    return;
  }
  if (!tab.active) {
    return;
  }
  const window = await chrome.windows.get(tab.windowId);
  if (!window.focused) {
    return;
  }
  await processActiveUrl(tabId, tab.windowId, url);
}

async function processCurrentActiveTab(): Promise<void> {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const tab = tabs[0];
  if (tab?.id === undefined) {
    return;
  }
  await processActiveUrl(
    tab.id,
    tab.windowId,
    tab.url ?? tab.pendingUrl ?? "about:blank",
  );
}

async function processActiveUrl(
  tabId: number,
  windowId: number,
  url: string,
): Promise<RuleStatus> {
  const now = new Date();
  const state = await loadState(now);
  const rule = findMatchingRule(url, state.rules);
  const session = await settleSessionTime(state, await loadSession(), now);

  const sameRule = rule?.id === session.activeRuleId;
  const countsTabReturn =
    sameRule &&
    rule?.countTabReturns === true &&
    session.browserFocused &&
    session.activeTabId !== undefined &&
    session.activeTabId !== tabId;

  if (rule && sameRule && !countsTabReturn) {
    let nextSession: SessionState = {
      ...session,
      browserFocused: true,
      focusedWindowId: windowId,
      activeTabId: tabId,
      activeUrl: url,
    };
    const status = activeStatus(rule, state, nextSession, now);
    nextSession = startSessionTime(nextSession, rule, status, now);
    await saveSession(nextSession);
    await reconcileBlockingIfNeeded(state, nextSession, now);
    await updateBadge(status);
    await notifyGuard(tabId, status, undefined, nextSession);
    return status;
  }

  if (!rule) {
    const nextSession = clearActiveContext(session, tabId, windowId, url);
    await saveSession(nextSession);
    await updateBadge({ kind: "untracked" });
    await reconcileBlockingIfNeeded(state, nextSession, now);
    return { kind: "untracked" };
  }

  const decision = evaluateEntry(rule, state.usageByRule[rule.id], now);
  applyDecisionUsage(state, decision);
  await saveState(state);

  const receipt =
    rule.mode === "visit-limit" && decision.kind === "allow"
      ? createEntryReceipt(rule, decision, now)
      : undefined;
  let nextSession = sessionFromDecision(
    session,
    decision,
    tabId,
    windowId,
    url,
  );
  const status = activeStatus(rule, state, nextSession, now);
  nextSession = startSessionTime(nextSession, rule, status, now);
  if (receipt) {
    nextSession = addEntryReceipt(nextSession, tabId, receipt);
  }
  await saveSession(nextSession);
  await reconcileBlockingIfNeeded(state, nextSession, now);

  await updateBadge(status);
  const delivered = await notifyGuard(tabId, status, receipt, nextSession);
  if (receipt && delivered) {
    nextSession = removeEntryReceipt(nextSession, tabId);
    await saveSession(nextSession);
  }
  return status;
}

function createEntryReceipt(
  rule: SiteRule,
  decision: Extract<EntryDecision, { kind: "allow" }>,
  now: Date,
): EntryReceipt {
  return {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    hostname: rule.hostname,
    visitsUsed: decision.usage.visitsUsed,
    dailyLimit: rule.dailyLimit ?? 1,
    remaining: decision.remaining,
    createdAt: now.getTime(),
  };
}

function applyDecisionUsage(
  state: PersistedState,
  decision: EntryDecision,
): void {
  if ("usage" in decision) {
    state.usageByRule[decision.ruleId] = decision.usage;
  }
}

function sessionFromDecision(
  session: SessionState,
  decision: EntryDecision,
  tabId: number,
  windowId: number,
  url: string,
): SessionState {
  const next: SessionState = {
    ...session,
    browserFocused: true,
    focusedWindowId: windowId,
    activeTabId: tabId,
    activeRuleId: decision.ruleId,
    activeUrl: url,
    activeAccess:
      decision.kind === "allow"
        ? "allowed"
        : decision.kind === "override-session"
          ? "override-session"
          : "blocked",
  };
  if (decision.kind === "allow") {
    next.activeRemaining = decision.remaining;
  } else {
    delete next.activeRemaining;
  }
  return next;
}

function clearActiveContext(
  session: SessionState,
  tabId: number,
  windowId: number,
  url: string,
): SessionState {
  const next: SessionState = {
    ...session,
    browserFocused: true,
    focusedWindowId: windowId,
    activeTabId: tabId,
    activeUrl: url,
  };
  delete next.activeRuleId;
  delete next.activeAccess;
  delete next.activeRemaining;
  delete next.activeTimeStartedAt;
  return removeEntryReceipt(next, tabId);
}

function addEntryReceipt(
  session: SessionState,
  tabId: number,
  receipt: EntryReceipt,
): SessionState {
  return {
    ...session,
    entryReceiptByTab: {
      ...session.entryReceiptByTab,
      [String(tabId)]: receipt,
    },
  };
}

function removeEntryReceipt(
  session: SessionState,
  tabId: number,
): SessionState {
  if (!session.entryReceiptByTab?.[String(tabId)]) {
    return session;
  }
  const entryReceiptByTab = Object.fromEntries(
    Object.entries(session.entryReceiptByTab).filter(
      ([candidateTabId]) => candidateTabId !== String(tabId),
    ),
  );
  const next = { ...session };
  if (Object.keys(entryReceiptByTab).length === 0) {
    delete next.entryReceiptByTab;
  } else {
    next.entryReceiptByTab = entryReceiptByTab;
  }
  return next;
}

function activeStatus(
  rule: SiteRule,
  state: PersistedState,
  session: SessionState,
  now: Date,
): RuleStatus {
  const usage = state.usageByRule[rule.id];
  if (
    session.activeRuleId === rule.id &&
    session.activeAccess === "allowed" &&
    rule.mode !== "time-limit" &&
    usage
  ) {
    return {
      kind: "available",
      rule,
      usage,
      remaining: session.activeRemaining ?? 0,
    };
  }
  return getRuleStatus(rule, usage, now);
}

async function settleSessionTime(
  state: PersistedState,
  session: SessionState,
  now = new Date(),
): Promise<SessionState> {
  if (
    session.activeTimeStartedAt === undefined ||
    session.activeRuleId === undefined ||
    session.activeAccess !== "allowed"
  ) {
    return session;
  }

  const rule = state.rules.find(
    (candidate) => candidate.id === session.activeRuleId,
  );
  const next = { ...session };
  delete next.activeTimeStartedAt;
  if (rule?.mode === "time-limit") {
    state.usageByRule[rule.id] = settleActiveTime(
      rule,
      state.usageByRule[rule.id],
      session.activeTimeStartedAt,
      now,
    );
    await saveState(state);
  }
  return exhaustActiveTimeIfNeeded(state, next, now);
}

function exhaustActiveTimeIfNeeded(
  state: PersistedState,
  session: SessionState,
  now: Date,
): SessionState {
  if (
    session.activeRuleId === undefined ||
    session.activeAccess !== "allowed"
  ) {
    return session;
  }
  const rule = state.rules.find(
    (candidate) => candidate.id === session.activeRuleId,
  );
  if (!rule || rule.mode !== "time-limit") {
    return session;
  }
  const status = getRuleStatus(rule, state.usageByRule[rule.id], now);
  if (status.kind !== "limit-reached") {
    return session;
  }
  const next = { ...session, activeAccess: "blocked" };
  delete next.activeRemaining;
  delete next.activeTimeStartedAt;
  return next;
}

function startSessionTime(
  session: SessionState,
  rule: SiteRule,
  status: RuleStatus,
  now: Date,
): SessionState {
  const next = { ...session };
  if (rule.mode === "time-limit" && status.kind === "available") {
    next.activeRemaining = status.remaining;
    next.activeTimeStartedAt = now.getTime();
  } else {
    delete next.activeTimeStartedAt;
  }
  return next;
}

async function statusForUrl(url: string): Promise<RuleStatus> {
  const state = await loadState();
  const rule = findMatchingRule(url, state.rules);
  if (!rule) {
    return { kind: "untracked" };
  }
  const session = await loadSession();
  return activeStatus(rule, state, session, new Date());
}

async function getCurrentSiteView(tabId?: number): Promise<CurrentSiteView> {
  const tab =
    tabId === undefined
      ? (
          await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          })
        )[0]
      : await getTabIfAvailable(tabId);
  const url = tab?.url ?? tab?.pendingUrl;
  if (!url) {
    return {
      status: { kind: "untracked" },
      permissionGranted: false,
    };
  }

  let hostname: string | undefined;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = undefined;
  }

  const state = await loadState();
  const rule = findMatchingRule(url, state.rules);
  const response: CurrentSiteView = {
    ...(tab?.id === undefined ? {} : { tabId: tab.id }),
    url,
    status: rule
      ? activeStatus(rule, state, await loadSession(), new Date())
      : { kind: "untracked" },
    permissionGranted: rule ? await hasRulePermission(rule) : false,
  };
  if (hostname) {
    response.hostname = hostname;
  }
  return response;
}

async function getTabIfAvailable(
  tabId: number,
): Promise<chrome.tabs.Tab | undefined> {
  try {
    return await chrome.tabs.get(tabId);
  } catch (error) {
    if (isMissingTabError(error)) {
      return undefined;
    }
    throw error;
  }
}

async function getBlockedContext(ruleId: string): Promise<BlockedContext> {
  const state = await loadState();
  const session = await loadSession();
  const rule = state.rules.find((candidate) => candidate.id === ruleId);
  if (!rule) {
    await reconcileAll(state, session, false);
    return { kind: "stale-rule" };
  }

  const now = new Date();
  const status = getRuleStatus(rule, state.usageByRule[rule.id], now);
  if (status.kind === "untracked") {
    return { kind: "stale-rule" };
  }

  let challengeReadyAt = now.getTime();
  if (status.kind === "limit-reached") {
    const challenges = { ...(session.overrideChallengeByRule ?? {}) };
    const existing = challenges[ruleId];
    const issuedAt = existing?.issuedAt ?? now.getTime();
    const previousCode = existing?.code ?? existing?.previousCode;
    challenges[ruleId] = {
      issuedAt,
      ...(previousCode ? { previousCode } : {}),
    };
    challengeReadyAt = issuedAt + OVERRIDE_PAUSE_MS;
    await saveSession({
      ...session,
      overrideChallengeByRule: challenges,
    });
  }

  return {
    kind: "active-block",
    rule,
    status,
    challengeReadyAt,
    resetLabel: formatResetTime(now),
  };
}

async function startOverrideConfirmation(
  ruleId: string,
  durationMinutes: number,
): Promise<{ code: string }> {
  const now = new Date();
  const state = await loadState(now);
  const rule = requireRule(state, ruleId);
  const session = await loadSession();
  const challenge = session.overrideChallengeByRule?.[ruleId];
  if (
    challenge === undefined ||
    challenge.issuedAt + OVERRIDE_PAUSE_MS > now.getTime()
  ) {
    throw new Error("The 15-second pause is still in progress.");
  }

  validateOverrideRequest(
    rule,
    state.usageByRule[rule.id],
    durationMinutes,
    now,
  );
  const previousCode = challenge.code ?? challenge.previousCode;
  const code = generateOverrideCode(previousCode);
  const challenges = {
    ...(session.overrideChallengeByRule ?? {}),
    [ruleId]: {
      issuedAt: challenge.issuedAt,
      durationMinutes,
      code,
      codeIssuedAt: now.getTime(),
      ...(previousCode ? { previousCode } : {}),
    },
  };
  await saveSession({ ...session, overrideChallengeByRule: challenges });
  return { code };
}

async function cancelOverrideConfirmation(ruleId: string): Promise<void> {
  const session = await loadSession();
  const challenge = session.overrideChallengeByRule?.[ruleId];
  if (!challenge) {
    return;
  }
  const challenges = {
    ...(session.overrideChallengeByRule ?? {}),
    [ruleId]: {
      issuedAt: challenge.issuedAt,
      ...(challenge.code || challenge.previousCode
        ? { previousCode: challenge.code ?? challenge.previousCode }
        : {}),
    },
  };
  await saveSession({ ...session, overrideChallengeByRule: challenges });
}

async function confirmOverride(
  ruleId: string,
  durationMinutes: number,
  code: string,
): Promise<{ expiresAt: number }> {
  const now = new Date();
  const state = await loadState(now);
  const rule = requireRule(state, ruleId);
  const session = await loadSession();
  const challenge = session.overrideChallengeByRule?.[ruleId];
  if (!challenge?.code || challenge.codeIssuedAt === undefined) {
    throw new Error("Start a new confirmation before continuing.");
  }
  if (challenge.codeIssuedAt + OVERRIDE_CONFIRMATION_TTL_MS <= now.getTime()) {
    await cancelOverrideConfirmation(ruleId);
    throw new Error("This confirmation expired. Generate a new code.");
  }
  if (code !== challenge.code) {
    throw new Error("The confirmation code does not match.");
  }
  if (challenge.durationMinutes !== durationMinutes) {
    throw new Error("Choose a duration and start a new confirmation.");
  }

  const usage = startOverrideSession(
    rule,
    state.usageByRule[rule.id],
    durationMinutes,
    now,
  );
  state.usageByRule[rule.id] = usage;
  await saveState(state);

  const nextSession = { ...session };
  if (nextSession.activeRuleId === ruleId) {
    nextSession.activeAccess = "override-session";
  }
  const challenges = Object.fromEntries(
    Object.entries(nextSession.overrideChallengeByRule ?? {}).filter(
      ([id]) => id !== ruleId,
    ),
  );
  nextSession.overrideChallengeByRule = challenges;
  await saveSession(nextSession);

  await reconcileAll(state, nextSession, false);
  await refreshAllAccessibleGuards(state, nextSession);
  return { expiresAt: usage.overrideSessionExpiresAt ?? now.getTime() };
}

function generateOverrideCode(previousCode?: string): string {
  for (;;) {
    const values = crypto.getRandomValues(
      new Uint32Array(OVERRIDE_CODE_LENGTH),
    );
    const code = Array.from(values, (value) => {
      return OVERRIDE_CODE_ALPHABET[value % OVERRIDE_CODE_ALPHABET.length];
    }).join("");
    if (code !== previousCode) {
      return code;
    }
  }
}

async function reconcileAll(
  state: PersistedState,
  session: SessionState,
  injectExisting: boolean,
): Promise<void> {
  await reconcileContentScript(state.rules);
  await reconcileBlockingIfNeeded(state, session, new Date(), true);
  await scheduleMaintenance(state, session);
  if (injectExisting) {
    await injectGuardIntoExistingTabs(state.rules);
  }
}

async function reconcileBlockingIfNeeded(
  state: PersistedState,
  session: SessionState,
  now: Date,
  force = false,
): Promise<void> {
  const fingerprint = JSON.stringify({
    date: state.localDate,
    rules: state.rules,
    usage: state.usageByRule,
    activeRuleId: session.activeRuleId,
    activeAccess: session.activeAccess,
    activeTimeStartedAt: session.activeTimeStartedAt,
  });
  if (!force && fingerprint === blockingFingerprint) {
    return;
  }
  await reconcileBlockingRules(state, session, now);
  blockingFingerprint = fingerprint;
}

async function refreshActiveGuard(): Promise<void> {
  const session = await loadSession();
  if (session.activeTabId === undefined || !session.activeUrl) {
    return;
  }
  const status = await statusForUrl(session.activeUrl);
  await updateBadge(status);
  await notifyGuard(session.activeTabId, status, undefined, session);
}

async function refreshAllAccessibleGuards(
  state: PersistedState,
  session: SessionState,
): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(
    tabs.map(async (tab) => {
      if (tab.id === undefined || !tab.url) {
        return;
      }
      const rule = findMatchingRule(tab.url, state.rules);
      const status = rule
        ? activeStatus(rule, state, session, new Date())
        : ({ kind: "untracked" } as const);
      await notifyGuard(tab.id, status, undefined, session);
    }),
  );
}

async function notifyGuard(
  tabId: number,
  status: RuleStatus,
  entryReceipt: EntryReceipt | undefined,
  session: SessionState,
): Promise<boolean> {
  const update: GuardUpdate = {
    type: "GUARD_UPDATE",
    status,
    ...(entryReceipt ? { entryReceipt } : {}),
  };
  const challengeIssuedAt =
    status.kind === "limit-reached" || status.kind === "permanently-blocked"
      ? session.overrideChallengeByRule?.[status.rule.id]?.issuedAt
      : undefined;
  if (
    (status.kind === "limit-reached" ||
      status.kind === "permanently-blocked") &&
    challengeIssuedAt !== undefined
  ) {
    update.challengeReadyAt = challengeIssuedAt + OVERRIDE_PAUSE_MS;
  }
  try {
    await chrome.tabs.sendMessage(tabId, update);
    return true;
  } catch {
    return false;
  }
}

function requireRule(state: PersistedState, ruleId: string): SiteRule {
  const rule = state.rules.find((candidate) => candidate.id === ruleId);
  if (!rule) {
    throw new Error("This rule no longer exists.");
  }
  return rule;
}

function reportError(error: unknown): void {
  console.error("[Visit Budget]", errorMessage(error));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected extension error.";
}

function isMissingTabError(error: unknown): boolean {
  return (
    error instanceof Error && /^No tab with id: \d+\.$/.test(error.message)
  );
}
