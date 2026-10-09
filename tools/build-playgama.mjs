import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.resolve(process.argv[2] || path.join(root, "03-test", "manager-preview", "video-1008-tur5"));
const zipPath = path.join(evidenceDir, "trust-me-bro-playgama.zip");
const extractedDir = path.join(evidenceDir, "playgama-extracted");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}

fs.mkdirSync(evidenceDir, { recursive: true });
run(process.execPath, [path.join(root, "tools", "build-protected.cjs")]);
fs.rmSync(zipPath, { force: true });
run(process.platform === "win32" ? "tar.exe" : "zip", process.platform === "win32"
  ? ["-a", "-c", "-f", zipPath, "-C", path.join(root, "dist"), "."]
  : ["-qr", zipPath, "."]
);
fs.rmSync(extractedDir, { recursive: true, force: true });
fs.mkdirSync(extractedDir, { recursive: true });
run(process.platform === "win32" ? "tar.exe" : "unzip", process.platform === "win32"
  ? ["-x", "-f", zipPath, "-C", extractedDir]
  : ["-q", zipPath, "-d", extractedDir]
);

const bytes = fs.readFileSync(zipPath);
const result = {
  zip: path.relative(root, zipPath).replaceAll("\\", "/"),
  bytes: bytes.length,
  sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  extracted: path.relative(root, extractedDir).replaceAll("\\", "/"),
};
fs.writeFileSync(path.join(evidenceDir, "playgama-zip.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
