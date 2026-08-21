import type { EntryReceipt, RuleStatus } from "../core/types";
import type {
  BlockedContext,
  ClientRequest,
  ClientResponse,
  GuardUpdate,
  OverrideConfirmationResult,
  OverrideSessionResult,
  PageContext,
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
      void applyStatus(message.status, message.entryReceipt);
    }
  });
  void initialCheck();
}

async function initialCheck(): Promise<void> {
  try {
    const context = await sendRequest<PageContext>({
      type: "GET_PAGE_CONTEXT",
      url: location.href,
    });
    await applyStatus(context.status, context.entryReceipt);
  } catch {
    removeCurtain();
  }
}

async function applyStatus(
  status: RuleStatus,
  entryReceipt?: EntryReceipt,
): Promise<void> {
  switch (status.kind) {
    case "untracked":
      removeGate();
      removeCurtain();
      return;
    case "available":
      removeGate();
      removeCurtain();
      if (entryReceipt) {
        showEntryReceiptToast(entryReceipt);
      }
      return;
    case "override-session":
      removeGate();
      removeCurtain();
      return;
    case "limit-reached":
    case "permanently-blocked": {
      installCurtain();
      const context = await sendRequest<BlockedContext>({
        type: "GET_BLOCKED_CONTEXT",
        ruleId: status.rule.id,
      });
      if (context.kind === "stale-rule") {
        removeGate();
        removeCurtain();
      } else {
        renderGate(context);
      }
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

function renderGate(
  context: Extract<BlockedContext, { kind: "active-block" }>,
): void {
  removeGate();
  const host = document.createElement("div");
  host.id = ROOT_ID;
  const shadow = host.attachShadow({ mode: "closed" });
  const isPermanent = context.status.kind === "permanently-blocked";
  const overrideAvailable = context.status.kind === "limit-reached";

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
        display: inline-block;
        height: 48px;
        margin-bottom: 28px;
        width: 48px;
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
      input {
        border: 1px solid #c9ced9;
        border-radius: 10px;
        box-sizing: border-box;
        color: #17191f;
        font: inherit;
        min-height: 44px;
        padding: 10px 12px;
        width: 100%;
      }
      input:focus { border-color: #155de0; box-shadow: 0 0 0 3px #eaf1ff; outline: none; }
      .intention-meta { color: #5f6673; display: flex; font-size: 11px; justify-content: space-between; }
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
      dialog { background: transparent; border: 0; max-width: 430px; padding: 0; width: calc(100% - 32px); }
      dialog::backdrop { background: rgba(23, 25, 31, 0.42); }
      .confirmation-panel { background: #fff; border: 1px solid #d8dce5; border-radius: 10px; box-shadow: 0 14px 40px rgba(22, 28, 45, 0.1); padding: 26px; text-align: left; }
      .confirmation-panel h2 { font-size: 22px; letter-spacing: -0.025em; margin: 0 0 8px; }
      .confirmation-panel > p { color: #5f6673; line-height: 1.5; margin: 0 0 18px; }
      .confirmation-panel > .error { color: #9a2f20; margin: 0; min-height: 20px; }
      .confirmation-code { background: #eaf1ff; border-radius: 10px; color: #155de0; display: block; font: 700 28px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.18em; padding: 14px 16px; text-align: center; }
      .confirmation-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
      @media (prefers-reduced-motion: no-preference) {
        .panel { animation: enter 160ms ease-out; }
        @keyframes enter { from { opacity: 0; transform: translateY(5px); } }
      }
    </style>
    <main class="backdrop" role="dialog" aria-modal="true" aria-labelledby="visit-budget-title">
      <section class="panel">
        <img class="mark" src="${chrome.runtime.getURL("icons/icon-48.png")}" alt="" aria-hidden="true">
        <h1 id="visit-budget-title"></h1>
        <p class="site"></p>
        <p class="reset"></p>
        <hr class="divider">
        <div class="actions">
          <button class="primary leave" type="button">Leave for now</button>
        </div>
        <div class="override-area"></div>
        <p class="error gate-error" role="alert"></p>
      </section>
    </main>
  `;

  const title = requiredElement<HTMLElement>(shadow, "h1");
  title.textContent = isPermanent
    ? "This website is blocked"
    : "You've used today's visit budget";
  requiredElement<HTMLElement>(shadow, ".site").textContent =
    context.rule.hostname;
  requiredElement<HTMLElement>(shadow, ".reset").textContent =
    `Resets at ${context.resetLabel}`;
  requiredElement<HTMLButtonElement>(shadow, ".leave").addEventListener(
    "click",
    () => void leaveForNow(shadow),
  );

  const overrideArea = requiredElement<HTMLElement>(shadow, ".override-area");
  if (!isPermanent && overrideAvailable) {
    renderOverrideForm(shadow, overrideArea, context);
  }

  document.documentElement.append(host);
  requiredElement<HTMLButtonElement>(shadow, ".leave").focus();
}

function renderOverrideForm(
  shadow: ShadowRoot,
  area: HTMLElement,
  context: Extract<BlockedContext, { kind: "active-block" }>,
): void {
  area.innerHTML = `
    <p class="pass-note">Need access anyway? Pause for 15 seconds, then describe what you intend to do in at least 50 characters. A confirmed override lasts 10 minutes.</p>
    <label for="visit-budget-intention">What do you intend to do?</label>
    <textarea id="visit-budget-intention" maxlength="240" inputmode="text" autocomplete="off" autocapitalize="sentences" spellcheck="true" placeholder="For example: reply to one email, then leave"></textarea>
    <div class="intention-meta"><span>Your intention is not saved.</span><span class="intention-count">0 / 50</span></div>
    <div class="actions" style="margin-top: 10px">
      <button class="secondary override" type="button" disabled></button>
    </div>
    <dialog aria-labelledby="visit-budget-confirmation-title" aria-describedby="visit-budget-confirmation-description">
      <div class="confirmation-panel">
        <h2 id="visit-budget-confirmation-title">Are you sure?</h2>
        <p id="visit-budget-confirmation-description">Type this code exactly to start 10 minutes of access.</p>
        <output class="confirmation-code"></output>
        <label for="visit-budget-confirmation-code">Confirmation code</label>
        <input id="visit-budget-confirmation-code" type="text" maxlength="5" autocomplete="off" autocapitalize="off" spellcheck="false">
        <p class="confirmation-error error" role="alert"></p>
        <div class="confirmation-actions">
          <button class="secondary cancel-confirmation" type="button">Cancel</button>
          <button class="primary confirm-override" type="button">Confirm override</button>
        </div>
      </div>
    </dialog>
  `;
  const input = requiredElement<HTMLTextAreaElement>(shadow, "textarea");
  const button = requiredElement<HTMLButtonElement>(shadow, ".override");
  const error = requiredElement<HTMLElement>(shadow, ".gate-error");
  const count = requiredElement<HTMLElement>(shadow, ".intention-count");
  const dialog = requiredElement<HTMLDialogElement>(shadow, "dialog");
  const codeOutput = requiredElement<HTMLElement>(shadow, ".confirmation-code");
  const codeInput = requiredElement<HTMLInputElement>(
    shadow,
    "#visit-budget-confirmation-code",
  );
  const confirmationError = requiredElement<HTMLElement>(
    shadow,
    ".confirmation-error",
  );
  const confirmButton = requiredElement<HTMLButtonElement>(
    shadow,
    ".confirm-override",
  );

  const update = (): void => {
    const seconds = Math.max(
      0,
      Math.ceil((context.challengeReadyAt - Date.now()) / 1000),
    );
    button.textContent = seconds > 0 ? `Continue (${seconds}s)` : "Continue";
    const intentionLength = input.value.trim().length;
    count.textContent = `${intentionLength} / 50`;
    button.disabled = seconds > 0 || intentionLength < 50;
    if (seconds === 0) {
      clearInterval(timer);
    }
  };
  const timer = window.setInterval(update, 250);
  input.addEventListener("input", update);
  input.focus();
  button.addEventListener("click", () => {
    button.disabled = true;
    error.textContent = "";
    void sendRequest<OverrideConfirmationResult>({
      type: "START_OVERRIDE_CONFIRMATION",
      ruleId: context.rule.id,
      intention: input.value,
    })
      .then((result) => {
        codeOutput.textContent = result.code;
        codeInput.value = "";
        confirmationError.textContent = "";
        dialog.showModal();
        codeInput.focus();
      })
      .catch((caught: unknown) => {
        error.textContent = errorMessage(caught);
        update();
      });
  });

  const cancel = (): void => {
    void sendRequest({
      type: "CANCEL_OVERRIDE_CONFIRMATION",
      ruleId: context.rule.id,
    })
      .catch(() => undefined)
      .finally(() => {
        dialog.close();
        update();
        button.focus();
      });
  };
  requiredElement<HTMLButtonElement>(
    shadow,
    ".cancel-confirmation",
  ).addEventListener("click", cancel);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    cancel();
  });
  confirmButton.addEventListener("click", () => {
    confirmButton.disabled = true;
    confirmationError.textContent = "";
    void sendRequest<OverrideSessionResult>({
      type: "CONFIRM_OVERRIDE",
      ruleId: context.rule.id,
      intention: input.value,
      code: codeInput.value,
    })
      .then(() => {
        clearInterval(timer);
        dialog.close();
        removeGate();
        removeCurtain();
        showOverrideToast(context.rule.hostname);
      })
      .catch((caught: unknown) => {
        confirmationError.textContent = errorMessage(caught);
        confirmButton.disabled = false;
        codeInput.focus();
      });
  });
  update();
}

function showEntryReceiptToast(receipt: EntryReceipt): void {
  const detail =
    receipt.remaining === 0
      ? "Next re-entry will be blocked"
      : `${receipt.remaining} ${
          receipt.remaining === 1 ? "visit" : "visits"
        } remaining today`;
  showToast({
    ariaLabel: `Visit ${receipt.visitsUsed} of ${receipt.dailyLimit} for ${receipt.hostname}. ${detail}.`,
    detail,
    headline: `Visit ${receipt.visitsUsed} of ${receipt.dailyLimit}`,
    hostname: receipt.hostname,
    progress: Math.min(100, (receipt.visitsUsed / receipt.dailyLimit) * 100),
    ringLabel: `${receipt.visitsUsed}/${receipt.dailyLimit}`,
  });
}

function showOverrideToast(hostname: string): void {
  showToast({
    ariaLabel: `${hostname}: an override session is active for 10 minutes.`,
    detail: "Override access is active for 10 minutes",
    headline: "Override active",
    hostname,
    progress: 100,
    ringLabel: "10m",
  });
}

interface ToastContent {
  ariaLabel: string;
  detail: string;
  headline: string;
  hostname: string;
  progress: number;
  ringLabel: string;
}

function showToast(content: ToastContent): void {
  const existing = document.getElementById(`${ROOT_ID}-toast`);
  existing?.remove();
  const host = document.createElement("div");
  host.id = `${ROOT_ID}-toast`;
  host.setAttribute("aria-label", content.ariaLabel);
  host.setAttribute("aria-live", "polite");
  host.setAttribute("role", "status");
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .toast {
        align-items: center;
        background: #fff;
        border: 1px solid #d8dce5;
        border-radius: 12px;
        box-shadow: 0 12px 34px rgba(20, 26, 38, 0.16);
        color: #17191f;
        display: grid;
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        gap: 12px;
        grid-template-columns: 48px minmax(0, 1fr);
        max-width: min(320px, calc(100vw - 36px));
        padding: 12px 14px 12px 12px;
        pointer-events: none;
        position: fixed;
        right: 18px;
        top: 18px;
        width: max-content;
        z-index: 2147483647;
      }
      .ring {
        height: 48px;
        position: relative;
        width: 48px;
      }
      svg {
        height: 48px;
        overflow: visible;
        transform: rotate(-90deg);
        width: 48px;
      }
      circle {
        fill: none;
        stroke-width: 3.5;
      }
      .track { stroke: #dfe7f7; }
      .meter {
        stroke: #155de0;
        stroke-linecap: round;
        transition: stroke-dasharray 180ms ease-out;
      }
      .ring-label {
        align-items: center;
        display: flex;
        font-size: 11px;
        font-weight: 750;
        inset: 0;
        justify-content: center;
        letter-spacing: -0.02em;
        position: absolute;
      }
      .hostname {
        color: #5f6673;
        font-size: 10px;
        font-weight: 650;
        letter-spacing: 0.03em;
        margin: 0 0 2px;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      strong {
        display: block;
        font-size: 14px;
        line-height: 1.25;
      }
      .detail {
        color: #5f6673;
        font-size: 11px;
        line-height: 1.35;
        margin: 3px 0 0;
      }
      @media (max-width: 480px) {
        .toast {
          max-width: calc(100vw - 24px);
          right: 12px;
          top: 12px;
        }
      }
      @media (prefers-reduced-motion: no-preference) {
        .toast { animation: enter 160ms ease-out; }
        @keyframes enter {
          from { opacity: 0; transform: translateY(-4px); }
        }
      }
    </style>
    <div class="toast">
      <div class="ring" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <circle class="track" cx="24" cy="24" r="20" pathLength="100"></circle>
          <circle class="meter" cx="24" cy="24" r="20" pathLength="100"></circle>
        </svg>
        <span class="ring-label"></span>
      </div>
      <div>
        <p class="hostname"></p>
        <strong></strong>
        <p class="detail"></p>
      </div>
    </div>
  `;
  requiredElement<SVGCircleElement>(shadow, ".meter").style.strokeDasharray =
    `${content.progress} 100`;
  requiredElement<HTMLElement>(shadow, ".ring-label").textContent =
    content.ringLabel;
  requiredElement<HTMLElement>(shadow, ".hostname").textContent =
    content.hostname;
  requiredElement<HTMLElement>(shadow, "strong").textContent = content.headline;
  requiredElement<HTMLElement>(shadow, ".detail").textContent = content.detail;
  document.documentElement.append(host);
  window.setTimeout(() => host.remove(), 4_000);
}

function removeGate(): void {
  document.getElementById(ROOT_ID)?.remove();
}

async function leaveForNow(shadow: ShadowRoot): Promise<void> {
  const button = requiredElement<HTMLButtonElement>(shadow, ".leave");
  const error = requiredElement<HTMLElement>(shadow, ".error");
  button.disabled = true;
  error.textContent = "";
  try {
    await sendRequest({ type: "OPEN_FRESH_TAB" });
  } catch (caught) {
    error.textContent = errorMessage(caught);
    button.disabled = false;
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
