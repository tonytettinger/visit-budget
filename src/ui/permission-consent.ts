import {
  hasRulePermission,
  requestRulePermission,
} from "../platform/permissions";
import { permissionOriginsForRule } from "../core/rules";
import type { SiteRule } from "../core/types";

interface PermissionContextOptions {
  alwaysExplain?: boolean;
}

export async function requestRulePermissionWithContext(
  rule: SiteRule,
  options: PermissionContextOptions = {},
): Promise<boolean> {
  if (!options.alwaysExplain && (await hasRulePermission(rule))) {
    return true;
  }

  return new Promise<boolean>((resolve, reject) => {
    const dialog = document.createElement("dialog");
    dialog.className = "permission-dialog";

    const titleId = `permission-title-${crypto.randomUUID()}`;
    const descriptionId = `permission-description-${crypto.randomUUID()}`;
    dialog.setAttribute("aria-labelledby", titleId);
    dialog.setAttribute("aria-describedby", descriptionId);

    const panel = element("div", "permission-dialog-panel");
    const heading = element("div", "permission-dialog-heading");
    const mark = element("span", "permission-dialog-mark", "VB");
    mark.setAttribute("aria-hidden", "true");
    const headingCopy = element("div", "");
    headingCopy.append(
      element("p", "permission-dialog-eyebrow", "Website access"),
      element("h2", "", `Allow protection for ${rule.hostname}?`, titleId),
    );
    heading.append(mark, headingCopy);

    const introduction = element(
      "p",
      "permission-dialog-intro",
      "Chrome will next show its standard “read and change” message. That broad wording describes the technical access required to enforce this rule.",
      descriptionId,
    );

    const scope = element("div", "permission-dialog-scope");
    scope.append(
      element("span", "", "Access requested"),
      element("strong", "", permissionScope(rule)),
    );

    const useHeading = element(
      "p",
      "permission-dialog-list-heading",
      "Visit Budget uses this access only to:",
    );
    const uses = document.createElement("ul");
    uses.className = "permission-dialog-list";
    for (const text of [
      "Count re-entries to pages matched by this rule.",
      "Protect tabs that are already open without replacing their content.",
      "Redirect blocked visits before the destination page appears.",
    ]) {
      uses.append(element("li", "", text));
    }

    const privacy = element("div", "permission-dialog-privacy");
    privacy.append(
      element("strong", "", "Local by design"),
      element(
        "p",
        "",
        "Visit Budget does not collect or transmit page content, browsing history, rules, or visit counts. They remain in Chrome on this device.",
      ),
    );

    const releaseNote = element(
      "p",
      "permission-dialog-release",
      "Access is released when no remaining rule needs this website.",
    );

    const actions = element("div", "permission-dialog-actions");
    const cancel = button("Not now", "secondary");
    const continueButton = button("Continue to Chrome", "primary");
    actions.append(cancel, continueButton);
    panel.append(
      heading,
      introduction,
      scope,
      useHeading,
      uses,
      privacy,
      releaseNote,
      actions,
    );
    dialog.append(panel);
    document.body.append(dialog);

    let requesting = false;

    const dismiss = (): void => {
      if (dialog.open) {
        dialog.close();
      }
      dialog.remove();
    };

    cancel.addEventListener("click", () => {
      if (requesting) {
        return;
      }
      dismiss();
      resolve(false);
    });

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (requesting) {
        return;
      }
      dismiss();
      resolve(false);
    });

    continueButton.addEventListener("click", () => {
      if (requesting) {
        return;
      }
      requesting = true;
      cancel.disabled = true;
      continueButton.disabled = true;
      dismiss();
      void requestRulePermission(rule).then(resolve, reject);
    });

    dialog.showModal();
  });
}

function permissionScope(rule: SiteRule): string {
  const includesSubdomains = permissionOriginsForRule(rule).some((origin) =>
    origin.includes("*."),
  );
  return includesSubdomains
    ? `${rule.hostname} and its subdomains`
    : `${rule.hostname} only`;
}

function button(
  text: string,
  variant: "primary" | "secondary",
): HTMLButtonElement {
  const result = document.createElement("button");
  result.className = `button ${variant}`;
  result.type = "button";
  result.textContent = text;
  return result;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
  id?: string,
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  result.className = className;
  if (text !== undefined) {
    result.textContent = text;
  }
  if (id !== undefined) {
    result.id = id;
  }
  return result;
}
