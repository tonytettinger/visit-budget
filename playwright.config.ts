import { defineConfig } from "@playwright/test";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",
  retries: process.env.CI ? 2 : 0,
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    trace: "retain-on-failure",
  },
});
