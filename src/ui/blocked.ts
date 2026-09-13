import { safeBlockedTarget } from "../core/rules";
import type { SiteRule } from "../core/types";
import type {
  BlockedContext,
  OverrideConfirmationResult,
  OverrideSessionResult,
} from "../shared/messages";
import { errorMessage, requiredElement, sendRequest } from "./client";

const params = new URLSearchParams(location.search);
const ruleId = params.get("rule");
const originalTarget = location.hash.slice(1);
let countdownTimer: number | undefined;

requiredElement<HTMLButtonElement>("#go-back").addEventListener(
  "click",
  () => void leaveForNow(),
);
requiredElement<HTMLSelectElement>("#override-tens").addEventListener(
  "change",
  updateOverrideButton,
);
requiredElement<HTMLSelectElement>("#override-ones").addEventListener(
  "change",
  updateOverrideButton,
);
requiredElement<HTMLButtonElement>("#continue-override").addEventListener(
  "click",
  () => void beginConfirmation(),
);
requiredElement<HTMLButtonElement>("#cancel-confirmation").addEventListener(
  "click",
  () => void cancelConfirmation(),
);
requiredElement<HTMLButtonElement>("#confirm-override").addEventListener(
  "click",
  () => void confirmOverride(),
);
requiredElement<HTMLDialogElement>("#override-confirmation").addEventListener(
  "cancel",
  (event) => {
    event.preventDefault();
    void cancelConfirmation();
  },
);

let context: BlockedContext | undefined;
let previousPauseSeconds: number | undefined;
void load();

async function load(): Promise<void> {
  if (!ruleId) {
    renderError("This blocked link is missing its rule.");
    return;
  }
  try {
    context = await sendRequest<BlockedContext>({
      type: "GET_BLOCKED_CONTEXT",
      ruleId,
    });
    if (context.kind === "stale-rule") {
      renderStaleRule();
      return;
    }
    if (context.status.kind === "override-session") {
      location.replace(targetForRule(context.rule));
      return;
    }
    render(context);
  } catch (error) {
    renderError(errorMessage(error));
  }
}

function render(
  value: Extract<BlockedContext, { kind: "active-block" }>,
): void {
  const isPermanent = value.status.kind === "permanently-blocked";
  requiredElement<HTMLElement>("#blocked-title").textContent = isPermanent
    ? "This website is blocked"
    : value.rule.mode === "time-limit"
      ? "You've used today's time budget"
      : "You've used today's visit budget";
  requiredElement<HTMLElement>("#blocked-site").textContent =
    value.rule.hostname;
  requiredElement<HTMLElement>("#blocked-reset").textContent =
    `Resets at ${value.resetLabel}`;

  const overrideSection = requiredElement<HTMLElement>("#override-section");
  const canOverride = value.status.kind === "limit-reached";
  overrideSection.hidden = !canOverride;
  if (canOverride) {
    countdownTimer = window.setInterval(updateOverrideButton, 250);
    updateOverrideButton();
    requiredElement<HTMLSelectElement>("#override-tens").focus();
  }
}

function renderStaleRule(): void {
  requiredElement<HTMLElement>("#blocked-title").textContent =
    "This block is no longer active";
  requiredElement<HTMLElement>("#blocked-site").textContent =
    "The rule was changed or removed.";
  requiredElement<HTMLElement>("#blocked-reset").textContent = "";
  requiredElement<HTMLElement>("#override-section").hidden = true;
  renderError("Use Leave for now, then open the website again if needed.");
}

function updateOverrideButton(): void {
  const button = requiredElement<HTMLButtonElement>("#continue-override");
  if (!context || context.kind === "stale-rule") {
    button.disabled = true;
    return;
  }
  const seconds = Math.max(
    0,
    Math.ceil((context.challengeReadyAt - Date.now()) / 1000),
  );
  const durationMinutes = selectedDurationMinutes();
  button.textContent =
    seconds > 0
      ? `Override (${seconds}s)`
      : `Override for ${durationMinutes} minutes`;
  const pauseCountdown = requiredElement<HTMLElement>("#pause-countdown");
  if (seconds !== previousPauseSeconds) {
    pauseCountdown.textContent =
      seconds > 0
        ? `You can continue in ${seconds} seconds.`
        : "The pause is complete. You can continue when ready.";
    previousPauseSeconds = seconds;
  }
  button.disabled = seconds > 0 || !isValidDuration(durationMinutes);
  if (seconds === 0 && countdownTimer !== undefined) {
    window.clearInterval(countdownTimer);
    countdownTimer = undefined;
  }
}

async function beginConfirmation(): Promise<void> {
  if (!context || context.kind === "stale-rule") {
    return;
  }
  const button = requiredElement<HTMLButtonElement>("#continue-override");
  button.disabled = true;
  renderError("");
  try {
    const result = await sendRequest<OverrideConfirmationResult>({
      type: "START_OVERRIDE_CONFIRMATION",
      ruleId: context.rule.id,
      durationMinutes: selectedDurationMinutes(),
    });
    showConfirmation(result.code);
  } catch (error) {
    renderError(errorMessage(error));
    updateOverrideButton();
  }
}

function showConfirmation(code: string): void {
  requiredElement<HTMLElement>("#override-code").textContent = code;
  requiredElement<HTMLElement>("#confirmation-description").textContent =
    `Type this code exactly to start ${selectedDurationMinutes()} minutes of temporary access.`;
  requiredElement<HTMLInputElement>("#confirmation-code").value = "";
  renderConfirmationError("");
  const dialog = requiredElement<HTMLDialogElement>("#override-confirmation");
  dialog.showModal();
  requiredElement<HTMLInputElement>("#confirmation-code").focus();
}

async function cancelConfirmation(): Promise<void> {
  const dialog = requiredElement<HTMLDialogElement>("#override-confirmation");
  if (context?.kind === "active-block") {
    await sendRequest({
      type: "CANCEL_OVERRIDE_CONFIRMATION",
      ruleId: context.rule.id,
    }).catch(() => undefined);
  }
  dialog.close();
  updateOverrideButton();
  requiredElement<HTMLButtonElement>("#continue-override").focus();
}

async function confirmOverride(): Promise<void> {
  if (!context || context.kind === "stale-rule") {
    return;
  }
  const button = requiredElement<HTMLButtonElement>("#confirm-override");
  button.disabled = true;
  renderConfirmationError("");
  try {
    await sendRequest<OverrideSessionResult>({
      type: "CONFIRM_OVERRIDE",
      ruleId: context.rule.id,
      durationMinutes: selectedDurationMinutes(),
      code: requiredElement<HTMLInputElement>("#confirmation-code").value,
    });
    location.replace(targetForRule(context.rule));
  } catch (error) {
    renderConfirmationError(errorMessage(error));
    button.disabled = false;
    requiredElement<HTMLInputElement>("#confirmation-code").focus();
  }
}

async function leaveForNow(): Promise<void> {
  const button = requiredElement<HTMLButtonElement>("#go-back");
  button.disabled = true;
  renderError("");
  try {
    await sendRequest({ type: "OPEN_FRESH_TAB" });
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id !== undefined) {
      await chrome.tabs.remove(tab.id);
    }
  } catch (error) {
    renderError(errorMessage(error));
    button.disabled = false;
  }
}

function renderError(message: string): void {
  requiredElement<HTMLElement>("#blocked-error").textContent = message;
}

function renderConfirmationError(message: string): void {
  requiredElement<HTMLElement>("#confirmation-error").textContent = message;
}

function selectedDurationMinutes(): number {
  const tens = Number(
    requiredElement<HTMLSelectElement>("#override-tens").value,
  );
  const ones = Number(
    requiredElement<HTMLSelectElement>("#override-ones").value,
  );
  return tens * 10 + ones;
}

function isValidDuration(durationMinutes: number): boolean {
  return (
    durationMinutes >= 5 && durationMinutes <= 60 && durationMinutes % 5 === 0
  );
}

function targetForRule(rule: SiteRule): string {
  return safeBlockedTarget(originalTarget, rule);
}
