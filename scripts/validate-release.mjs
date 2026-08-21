import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const artifacts = path.join(root, "artifacts");
const packageJson = await readJson(path.join(root, "package.json"));
const manifest = await readJson(path.join(dist, "manifest.json"));

assert(
  manifest.version === packageJson.version,
  "Package and manifest versions differ",
);
assert(manifest.manifest_version === 3, "Release must use Manifest V3");
assert(
  manifest.host_permissions === undefined,
  "Required host access is not allowed",
);
assert(
  manifest.content_security_policy?.extension_pages ===
    "script-src 'self'; object-src 'self'",
  "Extension page CSP changed unexpectedly",
);

const files = await listFiles(dist);
assert(files.includes("manifest.json"), "Release is missing manifest.json");
assert(
  files.every((file) => !file.endsWith(".map")),
  "Production release contains source maps",
);

const executableFiles = files.filter(
  (file) => file.endsWith(".js") || file.endsWith(".html"),
);
const forbiddenPatterns = [
  ["eval", /\beval\s*\(/],
  ["Function constructor", /new\s+Function\s*\(/],
  ["fetch", /\bfetch\s*\(/],
  ["XMLHttpRequest", /\bXMLHttpRequest\b/],
  ["WebSocket", /\bWebSocket\b/],
  ["remote script", /<script[^>]+src=["']https?:/i],
];

for (const file of executableFiles) {
  const source = await readFile(path.join(dist, file), "utf8");
  for (const [name, pattern] of forbiddenPatterns) {
    assert(!pattern.test(source), `${file} contains forbidden ${name} usage`);
  }
}

const archiveName = `visit-budget-v${manifest.version}.zip`;
const archive = path.join(artifacts, archiveName);
const listing = spawnSync("unzip", ["-Z1", archive], { encoding: "utf8" });
assert(listing.status === 0, listing.stderr || "Unable to inspect release ZIP");
const archiveFiles = listing.stdout.trim().split("\n").filter(Boolean);
assert(
  archiveFiles.includes("manifest.json"),
  "Release ZIP is missing manifest.json",
);
assert(
  archiveFiles.every(
    (file) =>
      !file.endsWith(".map") &&
      !path.posix.isAbsolute(file) &&
      !file.split("/").includes(".."),
  ),
  "Release ZIP contains an unsafe or development-only path",
);

const archiveContents = await readFile(archive);
const digest = createHash("sha256").update(archiveContents).digest("hex");
await writeFile(`${archive}.sha256`, `${digest}  ${archiveName}\n`, "utf8");

console.log(`Validated ${archiveName}`);
console.log(`SHA-256 ${digest}`);

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
