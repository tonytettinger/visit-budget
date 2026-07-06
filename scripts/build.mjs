import { cp, mkdir, readdir, rm, stat, utimes } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const outputDirectory = path.join(root, "dist");
const fixedTime = new Date("2000-01-01T00:00:00.000Z");

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });
await cp(path.join(root, "public"), outputDirectory, { recursive: true });

await build({
  bundle: true,
  entryNames: "[name]",
  entryPoints: {
    blocked: path.join(root, "src/ui/blocked.ts"),
    "content-guard": path.join(root, "src/content/guard.ts"),
    options: path.join(root, "src/ui/options.ts"),
    popup: path.join(root, "src/ui/popup.ts"),
    "service-worker": path.join(root, "src/background/service-worker.ts"),
  },
  format: "iife",
  legalComments: "none",
  minify: false,
  outdir: outputDirectory,
  platform: "browser",
  sourcemap: true,
  target: "chrome120",
});

async function normalizeTimes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await normalizeTimes(target);
    }
    await utimes(target, fixedTime, fixedTime);
  }
}

await normalizeTimes(outputDirectory);

const manifestPath = path.join(outputDirectory, "manifest.json");
if (!(await stat(manifestPath)).isFile()) {
  throw new Error("Build did not produce dist/manifest.json");
}

console.log(`Built unpacked extension at ${outputDirectory}`);
