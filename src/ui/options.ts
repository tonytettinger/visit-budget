import { getRuleStatus } from "../core/engine";
import { normalizePathPrefixes, parseRuleTarget } from "../core/rules";
import type { SiteRule } from "../core/types";
import { requestRulePermission } from "../platform/permissions";
import type {
  DeleteRuleResult,
  SaveRuleResult,
  StateView,
} from "../shared/messages";
import { errorMessage, requiredElement, sendRequest } from "./client";

let view: StateView = {
  state: {
    schemaVersion: 1,
    localDate: "",
    rules: [],
    usageByRule: {},
    pendingChanges: [],
  },
  permissionByRule: {},
};
let selectedRuleId: string | undefined =
  new URLSearchParams(location.search).get("rule") ?? undefined;
let toastTimer: number | undefined;

const form = requiredElement<HTMLFormElement>("#rule-form");
const mode = requiredElement<HTMLSelectElement>("#mode");
const website = requiredElement<HTMLInputElement>("#website");
const dailyLimit = requiredElement<HTMLInputElement>("#daily-limit");
const includeSubdomains = requiredElement<HTMLInputElement>(
  "#include-subdomains",
);
const includedPaths = requiredElement<HTMLTextAreaElement>("#included-paths");
const excludedPaths = requiredElement<HTMLTextAreaElement>("#excluded-paths");
const dailyLock = requiredElement<HTMLInputElement>("#daily-lock");
const formError = requiredElement<HTMLElement>("#form-error");

requiredElement<HTMLButtonElement>("#add-rule").addEventListener("click", () =>
  selectRule(undefined),
);
requiredElement<HTMLButtonElement>("#cancel-edit").addEventListener(
  "click",
  () => selectRule(view.state.rules[0]?.id),
);
requiredElement<HTMLButtonElement>("#delete-rule").addEventListener(
  "click",
  () => void removeSelectedRule(),
);
requiredElement<HTMLButtonElement>("#cancel-pending").addEventListener(
  "click",
  () => void cancelPending(),
);
requiredElement<HTMLButtonElement>("#grant-permission").addEventListener(
  "click",
  () => void grantSelectedPermission(),
);
mode.addEventListener("change", updateModeVisibility);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  void submitRule();
});

void reload();

async function reload(preferredRuleId = selectedRuleId): Promise<void> {
  try {
    view = await sendRequest<StateView>({ type: "GET_STATE" });
    selectedRuleId =
      preferredRuleId &&
      view.state.rules.some((rule) => rule.id === preferredRuleId)
        ? preferredRuleId
        : view.state.rules[0]?.id;
    renderRules();
    renderEditor();
  } catch (error) {
    showFormError(errorMessage(error));
  }
}

function renderRules(): void {
  const list = requiredElement<HTMLElement>("#rule-list");
  const empty = requiredElement<HTMLElement>("#empty-state");
  const count = requiredElement<HTMLElement>("#rule-count");
  list.replaceChildren();
  count.textContent = `${view.state.rules.length} ${
    view.state.rules.length === 1 ? "website" : "websites"
  }`;
  empty.hidden = view.state.rules.length !== 0;

  for (const rule of view.state.rules) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "rule-row";
    row.classList.toggle("selected", rule.id === selectedRuleId);
    row.addEventListener("click", () => selectRule(rule.id));

    const initial = element("span", "rule-initial", rule.hostname[0] ?? "?");
    const copy = element("span", "rule-copy");
    copy.append(
      element("strong", "", displayScope(rule)),
      element("span", "", statusLabel(rule)),
    );

    const meta = element("span", "rule-meta");
    const permission = view.permissionByRule[rule.id] ?? false;
    meta.append(
      element(
        "span",
        permission ? "" : "needs-permission",
        permission ? ruleMeta(rule) : "Access needed",
      ),
    );
    row.append(initial, copy, meta);
    list.append(row);
  }
}

function renderEditor(): void {
  const rule = selectedRule();
  const heading = requiredElement<HTMLElement>("#editor-heading");
  const subtitle = requiredElement<HTMLElement>("#editor-subtitle");
  const deleteButton = requiredElement<HTMLButtonElement>("#delete-rule");
  const pending = requiredElement<HTMLElement>("#pending-notice");
  const permission = requiredElement<HTMLElement>("#permission-notice");

  form.reset();
  includeSubdomains.checked = true;
  dailyLimit.value = "3";
  includedPaths.value = "/";
  mode.value = "visit-limit";
  heading.textContent = rule ? "Edit rule" : "Add website";
  subtitle.textContent = rule
    ? "Changes apply immediately unless this rule is locked."
    : "Choose how this website should behave.";
  deleteButton.hidden = !rule;
  pending.hidden =
    !rule ||
    !view.state.pendingChanges.some((change) => change.ruleId === rule.id);
  permission.hidden = !rule || (view.permissionByRule[rule.id] ?? false);
  formError.textContent = "";

  if (rule) {
    website.value = rule.hostname;
    mode.value = rule.mode;
    dailyLimit.value = String(rule.dailyLimit ?? 3);
    includeSubdomains.checked = rule.includeSubdomains;
    includedPaths.value = rule.includePathPrefixes.join("\n");
    excludedPaths.value = rule.excludePathPrefixes.join("\n");
    dailyLock.checked = rule.dailyLockEnabled;
  }
  updateModeVisibility();
}

function selectRule(ruleId: string | undefined): void {
  selectedRuleId = ruleId;
  renderRules();
  renderEditor();
  website.focus();
}

async function submitRule(): Promise<void> {
  showFormError("");
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!submit) {
    return;
  }
  submit.disabled = true;

  try {
    const target = parseRuleTarget(website.value);
    const rule: SiteRule = {
      id: selectedRuleId ?? crypto.randomUUID(),
      hostname: target.hostname,
      includeSubdomains: includeSubdomains.checked,
      includePathPrefixes: parsePaths(includedPaths.value, target.pathPrefix),
      excludePathPrefixes: parsePaths(excludedPaths.value),
      mode:
        mode.value === "permanent-block" ? "permanent-block" : "visit-limit",
      dailyLockEnabled: dailyLock.checked,
    };
    if (rule.mode === "visit-limit") {
      rule.dailyLimit = Number(dailyLimit.value);
    }

    if (!(await requestRulePermission(rule))) {
      throw new Error("Chrome access is required to enforce this rule.");
    }
    const result = await sendRequest<SaveRuleResult>({
      type: "SAVE_RULE",
      rule,
    });
    await reload(rule.id);
    showToast(
      result.scheduled ? "Change scheduled for tomorrow." : "Rule saved.",
    );
  } catch (error) {
    showFormError(errorMessage(error));
  } finally {
    submit.disabled = false;
  }
}

async function removeSelectedRule(): Promise<void> {
  const rule = selectedRule();
  if (!rule) {
    return;
  }
  if (!window.confirm(`Remove the rule for ${rule.hostname}?`)) {
    return;
  }
  try {
    const result = await sendRequest<DeleteRuleResult>({
      type: "DELETE_RULE",
      ruleId: rule.id,
    });
    await reload(result.scheduled ? rule.id : undefined);
    showToast(
      result.scheduled ? "Removal scheduled for tomorrow." : "Rule removed.",
    );
  } catch (error) {
    showFormError(errorMessage(error));
  }
}

async function cancelPending(): Promise<void> {
  const rule = selectedRule();
  if (!rule) {
    return;
  }
  try {
    await sendRequest({ type: "CANCEL_PENDING_CHANGE", ruleId: rule.id });
    await reload(rule.id);
    showToast("Scheduled change cancelled.");
  } catch (error) {
    showFormError(errorMessage(error));
  }
}

async function grantSelectedPermission(): Promise<void> {
  const rule = selectedRule();
  if (!rule) {
    return;
  }
  try {
    if (!(await requestRulePermission(rule))) {
      throw new Error("Website access was not granted.");
    }
    await reload(rule.id);
    showToast("Website access granted.");
  } catch (error) {
    showFormError(errorMessage(error));
  }
}

function selectedRule(): SiteRule | undefined {
  return view.state.rules.find((rule) => rule.id === selectedRuleId);
}

function statusLabel(rule: SiteRule): string {
  const status = getRuleStatus(
    rule,
    view.state.usageByRule[rule.id],
    new Date(),
  );
  switch (status.kind) {
    case "available":
      return `${status.remaining} ${
        status.remaining === 1 ? "visit" : "visits"
      } left today`;
    case "emergency-access":
      return "Emergency access active";
    case "limit-reached":
      return "Budget used for today";
    case "permanently-blocked":
      return "Permanently blocked";
    case "untracked":
      return "Not active";
  }
}

function ruleMeta(rule: SiteRule): string {
  return rule.mode === "permanent-block"
    ? "Blocked"
    : `${rule.dailyLimit ?? 1} / day`;
}

function displayScope(rule: SiteRule): string {
  const path =
    rule.includePathPrefixes.length === 1 && rule.includePathPrefixes[0] !== "/"
      ? rule.includePathPrefixes[0]
      : "";
  return `${rule.hostname}${path ?? ""}`;
}

function parsePaths(value: string, fallback?: string): string[] {
  const paths = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (paths.length === 0 && fallback) {
    paths.push(fallback);
  }
  return normalizePathPrefixes(paths);
}

function updateModeVisibility(): void {
  const limitField = requiredElement<HTMLElement>("#limit-field");
  const isLimit = mode.value === "visit-limit";
  limitField.hidden = !isLimit;
  dailyLimit.required = isLimit;
}

function showFormError(message: string): void {
  formError.textContent = message;
}

function showToast(message: string): void {
  const toast = requiredElement<HTMLElement>("#app-toast");
  toast.textContent = message;
  toast.hidden = false;
  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3_000);
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}
