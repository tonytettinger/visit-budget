import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const artifacts = path.join(root, "artifacts");
const manifest = JSON.parse(
  await readFile(path.join(dist, "manifest.json"), "utf8"),
);
const archive = path.join(artifacts, `visit-budget-v${manifest.version}.zip`);

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(
        ...(await listFiles(path.join(directory, entry.name), relative)),
      );
    } else {
      files.push(relative);
    }
  }
  return files;
}

await mkdir(artifacts, { recursive: true });
await rm(archive, { force: true });

const files = await listFiles(dist);
const result = spawnSync("zip", ["-X", "-q", archive, "-@"], {
  cwd: dist,
  encoding: "utf8",
  input: `${files.join("\n")}\n`,
});

if (result.status !== 0) {
  throw new Error(result.stderr || "Failed to create extension archive");
}

console.log(`Created ${archive}`);
