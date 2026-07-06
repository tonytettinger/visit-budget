import type { BlockedContext, EmergencyPassResult } from "../shared/messages";
import { errorMessage, requiredElement, sendRequest } from "./client";

const params = new URLSearchParams(location.search);
const ruleId = params.get("rule");
const originalTarget = location.hash.slice(1);
let countdownTimer: number | undefined;

requiredElement<HTMLButtonElement>("#go-back").addEventListener(
  "click",
  goBack,
);
requiredElement<HTMLTextAreaElement>("#intention").addEventListener(
  "input",
  updatePassButton,
);
requiredElement<HTMLButtonElement>("#use-pass").addEventListener(
  "click",
  () => void usePass(),
);

let context: BlockedContext | undefined;
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
    if (context.status.kind === "emergency-access" && originalTarget) {
      location.replace(originalTarget);
      return;
    }
    render(context);
  } catch (error) {
    renderError(errorMessage(error));
  }
}

function render(value: BlockedContext): void {
  const isPermanent = value.status.kind === "permanently-blocked";
  requiredElement<HTMLElement>("#blocked-title").textContent = isPermanent
    ? "This website is blocked"
    : "Your visit budget is used for today";
  requiredElement<HTMLElement>("#blocked-site").textContent =
    value.rule.hostname;
  requiredElement<HTMLElement>("#blocked-reset").textContent =
    `Resets at ${value.resetLabel}`;

  const passSection = requiredElement<HTMLElement>("#pass-section");
  const canUsePass =
    value.status.kind === "limit-reached" &&
    value.status.emergencyPassAvailable;
  passSection.hidden = !canUsePass;
  if (canUsePass) {
    countdownTimer = window.setInterval(updatePassButton, 250);
    updatePassButton();
  }
}

function updatePassButton(): void {
  const button = requiredElement<HTMLButtonElement>("#use-pass");
  const input = requiredElement<HTMLTextAreaElement>("#intention");
  if (!context) {
    button.disabled = true;
    return;
  }
  const seconds = Math.max(
    0,
    Math.ceil((context.challengeReadyAt - Date.now()) / 1000),
  );
  button.textContent =
    seconds > 0 ? `Use emergency pass (${seconds}s)` : "Use emergency pass";
  button.disabled = seconds > 0 || input.value.trim().length === 0;
  if (seconds === 0 && countdownTimer !== undefined) {
    window.clearInterval(countdownTimer);
    countdownTimer = undefined;
  }
}

async function usePass(): Promise<void> {
  if (!context) {
    return;
  }
  const button = requiredElement<HTMLButtonElement>("#use-pass");
  const input = requiredElement<HTMLTextAreaElement>("#intention");
  button.disabled = true;
  renderError("");
  try {
    await sendRequest<EmergencyPassResult>({
      type: "START_EMERGENCY_PASS",
      ruleId: context.rule.id,
      intention: input.value,
    });
    location.replace(originalTarget || `https://${context.rule.hostname}/`);
  } catch (error) {
    renderError(errorMessage(error));
    updatePassButton();
  }
}

function goBack(): void {
  if (history.length > 1) {
    history.back();
  } else {
    location.replace("about:blank");
  }
}

function renderError(message: string): void {
  requiredElement<HTMLElement>("#blocked-error").textContent = message;
}
