import type { RuleStatus } from "../core/types";
import type {
  BlockedContext,
  ClientRequest,
  ClientResponse,
  EmergencyPassResult,
  GuardUpdate,
} from "../shared/messages";

declare global {
  interface Window {
    __visitBudgetGuardInstalled?: boolean;
  }
}

const ROOT_ID = "visit-budget-guard-root";
const CURTAIN_ID = "visit-budget-curtain";

if (!window.__visitBudgetGuardInstalled) {
  window.__visitBudgetGuardInstalled = true;
  installCurtain();
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (isGuardUpdate(message)) {
      void applyStatus(message.status, message.showToast);
    }
  });
  void initialCheck();
}

async function initialCheck(): Promise<void> {
  try {
    const status = await sendRequest<RuleStatus>({
      type: "GET_PAGE_STATUS",
      url: location.href,
    });
    await applyStatus(status, false);
  } catch {
    removeCurtain();
  }
}

async function applyStatus(
  status: RuleStatus,
  showToast: boolean,
): Promise<void> {
  switch (status.kind) {
    case "untracked":
      removeGate();
      removeCurtain();
      return;
    case "available":
      removeGate();
      removeCurtain();
      if (showToast) {
        showRemainingToast(status.rule.hostname, status.remaining);
      }
      return;
    case "emergency-access":
      removeGate();
      removeCurtain();
      if (showToast) {
        showRemainingToast(status.rule.hostname, undefined, true);
      }
      return;
    case "limit-reached":
    case "permanently-blocked": {
      installCurtain();
      const context = await sendRequest<BlockedContext>({
        type: "GET_BLOCKED_CONTEXT",
        ruleId: status.rule.id,
      });
      renderGate(context);
    }
  }
}

function installCurtain(): void {
  if (document.getElementById(CURTAIN_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = CURTAIN_ID;
  style.textContent = `
    html > body {
      visibility: hidden !important;
    }
    html > #${ROOT_ID} {
      visibility: visible !important;
    }
  `;
  document.documentElement.append(style);
}

function removeCurtain(): void {
  document.getElementById(CURTAIN_ID)?.remove();
  document.body.style.removeProperty("visibility");
}

function renderGate(context: BlockedContext): void {
  removeGate();
  const host = document.createElement("div");
  host.id = ROOT_ID;
  const shadow = host.attachShadow({ mode: "closed" });
  const isPermanent = context.status.kind === "permanently-blocked";
  const passAvailable =
    context.status.kind === "limit-reached" &&
    context.status.emergencyPassAvailable;

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .backdrop {
        align-items: center;
        background: #ffffff;
        color: #17191f;
        display: flex;
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        inset: 0;
        justify-content: center;
        padding: 24px;
        position: fixed;
        visibility: visible;
        z-index: 2147483647;
      }
      .panel { max-width: 440px; text-align: center; width: 100%; }
      .mark {
        align-items: center;
        border: 1px solid #155de0;
        border-radius: 50%;
        color: #155de0;
        display: inline-flex;
        font-size: 16px;
        font-weight: 700;
        height: 52px;
        justify-content: center;
        margin-bottom: 28px;
        width: 52px;
      }
      h1 { font-size: 26px; letter-spacing: -0.025em; line-height: 1.2; margin: 0 0 10px; }
      .site { color: #5f6673; font-size: 15px; margin: 0 0 8px; }
      .reset { color: #5f6673; font-size: 14px; margin: 0 0 28px; }
      .divider { border: 0; border-top: 1px solid #d8dce5; margin: 0 0 24px; }
      label { display: block; font-size: 13px; font-weight: 650; margin: 22px 0 8px; text-align: left; }
      textarea {
        border: 1px solid #c9ced9;
        border-radius: 10px;
        box-sizing: border-box;
        color: #17191f;
        font: inherit;
        min-height: 76px;
        padding: 11px 12px;
        resize: vertical;
        width: 100%;
      }
      textarea:focus { border-color: #155de0; box-shadow: 0 0 0 3px #eaf1ff; outline: none; }
      .actions { display: grid; gap: 10px; }
      button {
        border: 1px solid #155de0;
        border-radius: 10px;
        cursor: pointer;
        font: 650 14px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        min-height: 46px;
        padding: 0 16px;
      }
      .primary { background: #155de0; color: #fff; }
      .secondary { background: #fff; color: #155de0; }
      button:disabled { cursor: not-allowed; opacity: 0.45; }
      button:focus-visible { box-shadow: 0 0 0 3px #cddfff; outline: none; }
      .pass-note, .error { color: #5f6673; font-size: 13px; line-height: 1.5; margin: 16px 0 0; }
      .error { color: #9a2f20; min-height: 20px; }
      @media (prefers-reduced-motion: no-preference) {
        .panel { animation: enter 160ms ease-out; }
        @keyframes enter { from { opacity: 0; transform: translateY(5px); } }
      }
    </style>
    <main class="backdrop" role="dialog" aria-modal="true" aria-labelledby="visit-budget-title">
      <section class="panel">
        <div class="mark" aria-hidden="true">VB</div>
        <h1 id="visit-budget-title"></h1>
        <p class="site"></p>
        <p class="reset"></p>
        <hr class="divider">
        <div class="actions">
          <button class="primary back" type="button">Go back</button>
        </div>
        <div class="pass-area"></div>
        <p class="error" role="alert"></p>
      </section>
    </main>
  `;

  const title = requiredElement<HTMLElement>(shadow, "h1");
  title.textContent = isPermanent
    ? "This website is blocked"
    : "Your visit budget is used for today";
  requiredElement<HTMLElement>(shadow, ".site").textContent =
    context.rule.hostname;
  requiredElement<HTMLElement>(shadow, ".reset").textContent =
    `Resets at ${context.resetLabel}`;
  requiredElement<HTMLButtonElement>(shadow, ".back").addEventListener(
    "click",
    goBack,
  );

  const passArea = requiredElement<HTMLElement>(shadow, ".pass-area");
  if (!isPermanent && passAvailable) {
    renderPassForm(shadow, passArea, context);
  } else if (!isPermanent) {
    const note = document.createElement("p");
    note.className = "pass-note";
    note.textContent = "Today's emergency pass has already been used.";
    passArea.append(note);
  }

  document.documentElement.append(host);
  requiredElement<HTMLButtonElement>(shadow, ".back").focus();
}

function renderPassForm(
  shadow: ShadowRoot,
  area: HTMLElement,
  context: BlockedContext,
): void {
  area.innerHTML = `
    <p class="pass-note">One 10-minute pass remains. It starts after a 15-second pause.</p>
    <label for="visit-budget-intention">What do you intend to do?</label>
    <textarea id="visit-budget-intention" maxlength="240"></textarea>
    <div class="actions" style="margin-top: 10px">
      <button class="secondary pass" type="button" disabled></button>
    </div>
  `;
  const input = requiredElement<HTMLTextAreaElement>(shadow, "textarea");
  const button = requiredElement<HTMLButtonElement>(shadow, ".pass");
  const error = requiredElement<HTMLElement>(shadow, ".error");

  const update = (): void => {
    const seconds = Math.max(
      0,
      Math.ceil((context.challengeReadyAt - Date.now()) / 1000),
    );
    button.textContent =
      seconds > 0 ? `Use emergency pass (${seconds}s)` : "Use emergency pass";
    button.disabled = seconds > 0 || input.value.trim().length === 0;
    if (seconds === 0) {
      clearInterval(timer);
    }
  };
  const timer = window.setInterval(update, 250);
  input.addEventListener("input", update);
  button.addEventListener("click", () => {
    button.disabled = true;
    error.textContent = "";
    void sendRequest<EmergencyPassResult>({
      type: "START_EMERGENCY_PASS",
      ruleId: context.rule.id,
      intention: input.value,
    })
      .then(() => {
        clearInterval(timer);
        removeGate();
        removeCurtain();
        showRemainingToast(context.rule.hostname, undefined, true);
      })
      .catch((caught: unknown) => {
        error.textContent = errorMessage(caught);
        update();
      });
  });
  update();
}

function showRemainingToast(
  hostname: string,
  remaining?: number,
  emergency = false,
): void {
  const existing = document.getElementById(`${ROOT_ID}-toast`);
  existing?.remove();
  const host = document.createElement("div");
  host.id = `${ROOT_ID}-toast`;
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      .toast {
        background: #17191f;
        border-radius: 9px;
        box-shadow: 0 10px 30px rgba(20, 26, 38, 0.18);
        color: #fff;
        font: 600 13px/1.35 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        max-width: 300px;
        padding: 11px 14px;
        position: fixed;
        right: 18px;
        top: 18px;
        z-index: 2147483647;
      }
    </style>
    <div class="toast" role="status"></div>
  `;
  const text = emergency
    ? `${hostname}: emergency access is active for 10 minutes`
    : `${hostname}: ${remaining ?? 0} ${
        remaining === 1 ? "visit" : "visits"
      } remaining today`;
  requiredElement<HTMLElement>(shadow, ".toast").textContent = text;
  document.documentElement.append(host);
  window.setTimeout(() => host.remove(), 4_000);
}

function removeGate(): void {
  document.getElementById(ROOT_ID)?.remove();
}

function goBack(): void {
  if (history.length > 1) {
    history.back();
  } else {
    location.replace("about:blank");
  }
}

async function sendRequest<T>(request: ClientRequest): Promise<T> {
  const response: ClientResponse = await chrome.runtime.sendMessage(request);
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.payload as T;
}

function isGuardUpdate(value: unknown): value is GuardUpdate {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    value.type === "GUARD_UPDATE"
  );
}

function requiredElement<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing guard element: ${selector}`);
  }
  return element;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to continue.";
}
