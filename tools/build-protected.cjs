const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const terserArgs = ["--yes", "terser"];

const copyNames = [
  "audio",
  "js",
  "sprites",
  ".nojekyll",
  "game-icon.png",
  "manifest.webmanifest",
  "playgama-bridge-config.json",
  "playgama-bridge.js",
  "privacy.html",
  "README-PLAY.txt",
  "soundtrack.mp3",
];

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copy(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) copy(path.join(src, name), path.join(dest, name));
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function runTerser(input, output) {
  const args = [
    ...terserArgs,
    input,
    "--compress",
    "passes=2,drop_console=false",
    "--mangle",
    "--format",
    "comments=false",
    "--output",
    output,
  ];
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd", ...args] : args;
  const result = cp.spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.error) process.stderr.write(`${result.error.message}\n`);
    throw new Error(`terser failed for ${path.relative(root, input)}`);
  }
}

function minifyJsFile(file) {
  const tmp = `${file}.tmp`;
  runTerser(file, tmp);
  fs.renameSync(tmp, file);
}

function minifyInlineScripts(htmlPath) {
  let html = fs.readFileSync(htmlPath, "utf8");
  let index = 0;
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (match, code) => {
    const inFile = path.join(dist, `.inline-${index}.js`);
    const outFile = path.join(dist, `.inline-${index}.min.js`);
    index += 1;
    fs.writeFileSync(inFile, code, "utf8");
    runTerser(inFile, outFile);
    const minified = fs.readFileSync(outFile, "utf8");
    rm(inFile);
    rm(outFile);
    return `<script>${minified}</script>`;
  });
  fs.writeFileSync(htmlPath, html, "utf8");
}

function walk(dir, visit) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file, visit);
    else visit(file);
  }
}

function dirSize(dir) {
  let total = 0;
  walk(dir, file => {
    total += fs.statSync(file).size;
  });
  return total;
}

rm(dist);
fs.mkdirSync(dist, { recursive: true });
for (const name of copyNames) {
  const src = path.join(root, name);
  if (fs.existsSync(src)) copy(src, path.join(dist, name));
}
// AI source renders are production inputs, not runtime assets referenced by the game.
rm(path.join(dist, "sprites", "raw"));
copy(path.join(root, "index.html"), path.join(dist, "index.html"));
walk(path.join(dist, "js"), file => {
  if (file.endsWith(".js")) minifyJsFile(file);
});
minifyJsFile(path.join(dist, "playgama-bridge.js"));
minifyInlineScripts(path.join(dist, "index.html"));

const bytes = dirSize(dist);
const mib = bytes / 1024 / 1024;
console.log(JSON.stringify({ dist, bytes, mib: Number(mib.toFixed(2)) }, null, 2));
