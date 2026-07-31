import {
  expect,
  test,
  chromium,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

let server: Server;
let port: number;

test.beforeAll(async () => {
  server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
      <html>
        <head><title>Visit Budget test site</title></head>
        <body>
          <h1>Test destination</h1>
          <label>Draft <input id="draft" value="unsaved work"></label>
        </body>
      </html>`);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "0.0.0.0", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not provide a TCP port.");
  }
  port = address.port;
});

test.afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("limits re-entry and grants one emergency pass", async () => {
  await withExtension(async ({ context, extensionId }) => {
    const options = await context.newPage();
    await addRule(options, extensionId, {
      website: "127.0.0.1",
      mode: "visit-limit",
      limit: 1,
    });
    if (process.env.CAPTURE_QA) {
      await options.reload();
      await expect(options.getByText("127.0.0.1")).toBeVisible();
      await options.setViewportSize({ width: 1280, height: 800 });
      await options.screenshot({
        path: "/tmp/visit-budget-options.png",
        fullPage: false,
      });
      await options.setViewportSize({ width: 390, height: 844 });
      await options.screenshot({
        path: "/tmp/visit-budget-options-mobile.png",
        fullPage: true,
      });
    }

    const page = await context.newPage();
    await page.goto(primaryUrl());
    await expect(
      page.getByRole("heading", { name: "Test destination" }),
    ).toBeVisible();

    await page.goto(awayUrl());
    await waitForDynamicBlock(options, extensionId);
    await page.goto(primaryUrl());

    await expect(page).toHaveURL(
      new RegExp(`chrome-extension://${extensionId}/blocked\\.html`),
    );
    await expect(
      page.getByRole("heading", {
        name: "Your visit budget is used for today",
      }),
    ).toBeVisible();

    await makeEmergencyPauseReady(page);
    await page.reload();
    const intention = page.getByLabel("What do you intend to do?");
    await expect(intention).toBeFocused();
    await expect(intention).toHaveAttribute("inputmode", "text");
    await intention.pressSequentially("Check my email, then leave");
    await expect(intention).toHaveValue("Check my email, then leave");
    await page.getByRole("button", { name: "Use emergency pass" }).click();

    await expect(page).toHaveURL(primaryUrl());
    await expect(
      page.getByRole("heading", { name: "Test destination" }),
    ).toBeVisible();
  });
});

test("guards already-open tabs and preserves page state", async () => {
  await withExtension(async ({ context, extensionId }) => {
    const existingTabs: Page[] = [];
    for (let index = 0; index < 20; index += 1) {
      const page = await context.newPage();
      await page.goto(primaryUrl());
      await page.locator("#draft").fill(`draft ${index}`);
      existingTabs.push(page);
    }

    const options = await context.newPage();
    await addRule(options, extensionId, {
      website: "127.0.0.1",
      mode: "visit-limit",
      limit: 1,
    });

    await existingTabs[0]!.bringToFront();
    await expect(
      existingTabs[0]!.getByRole("heading", { name: "Test destination" }),
    ).toBeVisible();

    const away = await context.newPage();
    await away.goto(awayUrl());
    await waitForDynamicBlock(options, extensionId);

    await existingTabs[1]!.bringToFront();
    await expect(
      existingTabs[1]!.locator("#visit-budget-guard-root"),
    ).toBeAttached();
    await expect(existingTabs[1]!.locator("body")).toHaveCSS(
      "visibility",
      "hidden",
    );
    await expect(existingTabs[1]!.locator("#draft")).toHaveValue("draft 1");
  });
});

test("counts tab re-entry without counting refreshes or same-site tabs", async () => {
  await withExtension(async ({ context, extensionId }) => {
    const firstSiteTab = await context.newPage();
    await firstSiteTab.goto(primaryUrl());
    const secondSiteTab = await context.newPage();
    await secondSiteTab.goto(primaryUrl());

    const options = await context.newPage();
    await addRule(options, extensionId, {
      website: "127.0.0.1",
      mode: "visit-limit",
      limit: 2,
    });

    await firstSiteTab.bringToFront();
    await expect(
      firstSiteTab.locator("#visit-budget-guard-root-toast"),
    ).toHaveAttribute(
      "aria-label",
      "Visit 1 of 2 for 127.0.0.1. 1 visit remaining today.",
    );

    await firstSiteTab.reload();
    await expect(
      firstSiteTab.locator("#visit-budget-guard-root-toast"),
    ).toHaveCount(0);

    await secondSiteTab.bringToFront();
    await expect(
      secondSiteTab.getByRole("heading", { name: "Test destination" }),
    ).toBeVisible();
    await expect(
      secondSiteTab.locator("#visit-budget-guard-root-toast"),
    ).toHaveCount(0);

    const away = await context.newPage();
    await away.goto(awayUrl());
    await firstSiteTab.bringToFront();
    await expect(
      firstSiteTab.locator("#visit-budget-guard-root-toast"),
    ).toHaveAttribute(
      "aria-label",
      "Visit 2 of 2 for 127.0.0.1. Next re-entry will be blocked.",
    );

    await away.bringToFront();
    await waitForDynamicBlock(options, extensionId);
    await secondSiteTab.bringToFront();
    await expect(
      secondSiteTab.locator("#visit-budget-guard-root"),
    ).toBeAttached();
    await expect(secondSiteTab.locator("body")).toHaveCSS(
      "visibility",
      "hidden",
    );
  });
});

test("shows one durable progress receipt for each consumed entry", async () => {
  await withExtension(async ({ context, extensionId }) => {
    const options = await context.newPage();
    await addRule(options, extensionId, {
      website: "127.0.0.1",
      mode: "visit-limit",
      limit: 3,
    });

    const page = await context.newPage();
    await page.goto(primaryUrl());
    const receipt = page.locator("#visit-budget-guard-root-toast");
    await expect(receipt).toHaveAttribute(
      "aria-label",
      "Visit 1 of 3 for 127.0.0.1. 2 visits remaining today.",
    );
    if (process.env.CAPTURE_QA) {
      await page.setViewportSize({ width: 1000, height: 700 });
      await page.screenshot({
        path: "/tmp/visit-budget-entry-receipt.png",
        fullPage: false,
      });
    }

    await page.reload();
    await expect(receipt).toHaveCount(0);

    await page.goto(`${primaryUrl()}?internal=1`);
    await expect(receipt).toHaveCount(0);

    await page.goto(awayUrl());
    await page.goto(primaryUrl());
    await expect(receipt).toHaveAttribute(
      "aria-label",
      "Visit 2 of 3 for 127.0.0.1. 1 visit remaining today.",
    );

    await page.goto(awayUrl());
    await page.goto(primaryUrl());
    await expect(receipt).toHaveAttribute(
      "aria-label",
      "Visit 3 of 3 for 127.0.0.1. Next re-entry will be blocked.",
    );

    await page.goto(awayUrl());
    await waitForDynamicBlock(options, extensionId);
    await page.goto(primaryUrl());
    await expect(page).toHaveURL(
      new RegExp(`chrome-extension://${extensionId}/blocked\\.html`),
    );
    await expect(
      page.getByRole("heading", {
        name: "Your visit budget is used for today",
      }),
    ).toBeVisible();
  });
});

test("popup opens a durable prefilled setup flow", async () => {
  await withExtension(async ({ context, extensionId }) => {
    const target = await context.newPage();
    await target.goto(primaryUrl());
    const inspector = await context.newPage();
    await inspector.goto(`chrome-extension://${extensionId}/options.html`);
    const targetTabId = await inspector.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ url });
      return tabs[0]?.id;
    }, primaryUrl());
    expect(targetTabId).toBeDefined();

    const popup = await context.newPage();
    await popup.goto(
      `chrome-extension://${extensionId}/popup.html?tab=${String(targetTabId)}`,
    );

    await expect(
      popup.getByRole("heading", { name: "127.0.0.1" }),
    ).toBeVisible();
    const setupPagePromise = context.waitForEvent("page");
    await popup.getByRole("button", { name: "Set visit budget…" }).click();
    const setup = await setupPagePromise;
    await setup.waitForLoadState();
    await expect(
      setup.getByRole("heading", {
        name: "Set visit budget",
      }),
    ).toBeVisible();
    await expect(setup.locator("#website")).toHaveValue("127.0.0.1");
    await expect(
      setup.getByRole("button", { name: "Show advanced options" }),
    ).toBeVisible();
    await expect(
      setup.getByRole("button", { name: "Save rule" }),
    ).toBeInViewport();
    if (process.env.CAPTURE_QA) {
      await setup.setViewportSize({ width: 1000, height: 720 });
      await setup.screenshot({
        path: "/tmp/visit-budget-quick-add-prefilled.png",
        fullPage: false,
      });
    }
    await setup.getByRole("button", { name: "Save rule" }).click();
    await expect(
      setup.getByRole("heading", {
        name: "Allow protection for 127.0.0.1?",
      }),
    ).toBeVisible();
    await expect(setup.getByText("Local by design")).toBeVisible();
    if (process.env.CAPTURE_QA) {
      await setup.setViewportSize({ width: 900, height: 720 });
      await setup.screenshot({
        path: "/tmp/visit-budget-quick-add-permission.png",
        fullPage: false,
      });
    }
    const setupClosed = setup.waitForEvent("close");
    await setup.getByRole("button", { name: "Continue to Chrome" }).click();
    await setupClosed;

    await inspector.reload();
    await expect(inspector.getByText("127.0.0.1")).toBeVisible();
    await expect(
      target.locator("#visit-budget-guard-root-toast"),
    ).toHaveAttribute(
      "aria-label",
      "Visit 1 of 3 for 127.0.0.1. 2 visits remaining today.",
    );
  });
});

test("permanent blocks redirect before destination content is shown", async () => {
  await withExtension(async ({ context, extensionId }) => {
    const options = await context.newPage();
    await addRule(options, extensionId, {
      website: "127.0.0.1",
      mode: "permanent-block",
    });
    await waitForDynamicBlock(options, extensionId);

    const page = await context.newPage();
    await page.goto(primaryUrl());
    await expect(page).toHaveURL(
      new RegExp(`chrome-extension://${extensionId}/blocked\\.html`),
    );
    await expect(
      page.getByRole("heading", { name: "This website is blocked" }),
    ).toBeVisible();
    await expect(page.getByText("Test destination")).toHaveCount(0);
    if (process.env.CAPTURE_QA) {
      await page.setViewportSize({ width: 900, height: 620 });
      await page.screenshot({
        path: "/tmp/visit-budget-blocked.png",
        fullPage: true,
      });
    }

    const freshPagePromise = context.waitForEvent("page");
    const blockedPageClosed = page.waitForEvent("close");
    await page.getByRole("button", { name: "Leave for now" }).click();
    const freshPage = await freshPagePromise;
    await blockedPageClosed;
    expect(freshPage.url()).not.toContain(
      `chrome-extension://${extensionId}/blocked.html`,
    );
  });
});

interface ExtensionHarness {
  context: BrowserContext;
  extensionId: string;
}

async function withExtension(
  run: (harness: ExtensionHarness) => Promise<void>,
): Promise<void> {
  const working = await mkdtemp(path.join(tmpdir(), "visit-budget-e2e-"));
  const extensionPath = path.join(working, "extension");
  const profilePath = path.join(working, "profile");
  await cp(path.resolve("dist"), extensionPath, { recursive: true });
  await addTestHostPermissions(extensionPath);

  const context = await chromium.launchPersistentContext(profilePath, {
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--host-resolver-rules=MAP away.test 127.0.0.1",
      "--no-proxy-server",
    ],
    channel: "chromium",
    headless: true,
    reducedMotion: "reduce",
  });
  const runtimeErrors: string[] = [];
  context.on("page", (page) => {
    page.on("console", (message) => {
      if (message.type() === "error") {
        runtimeErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      runtimeErrors.push(error.message);
    });
  });

  try {
    const workers = context.serviceWorkers();
    const worker = workers[0] ?? (await context.waitForEvent("serviceworker"));
    worker.on("console", (message) => {
      if (message.type() === "error") {
        runtimeErrors.push(message.text());
      }
    });
    const extensionId = new URL(worker.url()).hostname;
    await run({ context, extensionId });
    expect(runtimeErrors).toEqual([]);
  } finally {
    await context.close();
    await rm(working, { force: true, recursive: true });
  }
}

async function addTestHostPermissions(extensionPath: string): Promise<void> {
  const manifestPath = path.join(extensionPath, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    host_permissions?: string[];
  };
  manifest.host_permissions = [
    "http://127.0.0.1/*",
    "https://127.0.0.1/*",
    "http://127.0.0.2/*",
    "https://127.0.0.2/*",
  ];
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function addRule(
  page: Page,
  extensionId: string,
  input: {
    website: string;
    mode: "visit-limit" | "permanent-block";
    limit?: number;
  },
): Promise<void> {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator("#website").fill(input.website);
  await page.locator("#mode").selectOption(input.mode);
  if (input.mode === "visit-limit") {
    await page.locator("#daily-limit").fill(String(input.limit ?? 1));
  }
  await page.getByRole("button", { name: "Save rule" }).click();
  await expect(
    page.getByRole("heading", {
      name: `Allow protection for ${input.website}?`,
    }),
  ).toBeVisible();
  await expect(page.getByText("Local by design")).toBeVisible();
  if (process.env.CAPTURE_QA) {
    await page.setViewportSize({ width: 900, height: 720 });
    await page.screenshot({
      path: "/tmp/visit-budget-permission-context.png",
      fullPage: false,
    });
  }
  await page.getByRole("button", { name: "Continue to Chrome" }).click();
  await expect(page.getByRole("status")).toHaveText("Rule saved.");
}

async function waitForDynamicBlock(
  page: Page,
  extensionId: string,
): Promise<void> {
  if (!page.url().startsWith(`chrome-extension://${extensionId}/`)) {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
  }
  await expect
    .poll(() =>
      page.evaluate(async () => {
        return (await chrome.declarativeNetRequest.getDynamicRules()).length;
      }),
    )
    .toBeGreaterThan(0);
}

async function makeEmergencyPauseReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const key = "visitBudgetSession";
    const stored = await chrome.storage.session.get(key);
    const session = (stored[key] ?? {}) as {
      emergencyChallengeByRule?: Record<string, number>;
    };
    const challenges = session.emergencyChallengeByRule ?? {};
    for (const ruleId of Object.keys(challenges)) {
      challenges[ruleId] = Date.now() - 20_000;
    }
    await chrome.storage.session.set({
      [key]: { ...session, emergencyChallengeByRule: challenges },
    });
  });
}

function primaryUrl(): string {
  return `http://127.0.0.1:${port}/article`;
}

function awayUrl(): string {
  return `http://away.test:${port}/other`;
}
