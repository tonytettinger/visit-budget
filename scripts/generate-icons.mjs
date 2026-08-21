import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "docs/design/visit-budget-icon.svg");
const publicIcons = path.join(root, "public/icons");
const outputs = [
  [16, path.join(publicIcons, "icon-16.png")],
  [32, path.join(publicIcons, "icon-32.png")],
  [48, path.join(publicIcons, "icon-48.png")],
  [128, path.join(publicIcons, "icon-128.png")],
  [1024, path.join(root, "docs/design/visit-budget-icon-master.png")],
];

await mkdir(publicIcons, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const [size, output] of outputs) {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: size, width: size },
    });
    await page.goto(pathToFileURL(source).href);
    await page.screenshot({ omitBackground: true, path: output });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(
  "Generated Visit Budget icons from docs/design/visit-budget-icon.svg",
);
