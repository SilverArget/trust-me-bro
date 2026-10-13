const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = path.resolve(__dirname, "..");
const output = path.resolve(root, "..", "crazygames", "build-dd4ec2e");
const expectedHead = "dd4ec2e";

function fail(message) {
  throw new Error(message);
}

function normalize(relative) {
  return relative.replaceAll("\\", "/").replace(/^\.\//, "");
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function copy(relative) {
  const source = path.join(root, relative);
  const target = path.join(output, relative);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`missing source: ${relative}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, files);
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

const head = cp.execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
if (head !== expectedHead) fail(`expected HEAD ${expectedHead}, got ${head}`);

const expectedParent = path.resolve(root, "..", "crazygames");
if (path.dirname(output) !== expectedParent || path.basename(output) !== `build-${expectedHead}`) {
  fail(`refusing unsafe output path: ${output}`);
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const required = new Set([
  "index.html",
  "manifest.webmanifest",
  "game-icon.png",
  "playgama-bridge.js",
  "playgama-bridge-config.json",
  "ASSET-MANIFEST.md",
  "soundtrack.mp3",
  "js/a5-audio.js",
  "js/chief-paths.js",
  "js/a12-campaign.js",
  "sprites/chief.png",
  "sprites/brand/borugaming-wolf.png",
  "sprites/brand/trust-me-bro-logo.png",
  "sprites/a5/brand/trust-me-bro-icon-48.png",
  "sprites/a5/brand/trust-me-bro-logo.png",
  "sprites/a5/atlas-contract.json",
  "sprites/a5/npc-contract.json",
  "sprites/chiefs/chief-contract.json",
]);

const bridgeConfig = JSON.parse(read("playgama-bridge-config.json"));
for (const name of bridgeConfig.optionalSprites || []) required.add(`sprites/${name}.png`);
for (const name of ["courier", "forklift", "picker", "guard"]) required.add(`sprites/${name}.png`);

for (const contractPath of [
  "sprites/a5/atlas-contract.json",
  "sprites/a5/npc-contract.json",
  "sprites/chiefs/chief-contract.json",
]) {
  const contract = JSON.parse(read(contractPath));
  for (const asset of contract.assets || []) required.add(normalize(asset.path));
}

const audioSource = read("js/a5-audio.js");
const sfxNames = audioSource.match(/const names\s*=\s*\[([^\]]+)\]/)?.[1]
  .match(/["']([^"']+)["']/g)?.map(value => value.slice(1, -1)) || [];
if (!sfxNames.length) fail("could not resolve SFX graph");
for (const name of sfxNames) required.add(`audio/sfx/${name}.ogg`);
for (const match of audioSource.matchAll(/["'](audio\/music\/[^"']+\.ogg)["']/g)) required.add(match[1]);

for (const relative of [...required].sort()) copy(relative);

const outputBridgeConfigPath = path.join(output, "playgama-bridge-config.json");
const outputBridgeConfig = JSON.parse(fs.readFileSync(outputBridgeConfigPath, "utf8"));
outputBridgeConfig.advertisement ||= {};
outputBridgeConfig.advertisement.interstitial ||= {};
outputBridgeConfig.advertisement.rewarded ||= {};
outputBridgeConfig.advertisement.interstitial.disable = true;
outputBridgeConfig.advertisement.rewarded.disable = true;
fs.writeFileSync(outputBridgeConfigPath, `${JSON.stringify(outputBridgeConfig, null, 2)}\n`, "utf8");

const indexPath = path.join(output, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const transforms = [
  [
    '<script src="js/ads-config.js"></script>',
    "",
    "remove external-ad configuration",
  ],
  [
    "let inPlayablesEnv=false,systemPaused=false,rafId=0,loopRunning=false,firstFrameSent=false,gameReadySent=false,platformInitComplete=false,platformLanguage='en',gameplayActive=null;",
    "const CRAZYGAMES_BASIC_BUILD=true;document.documentElement.dataset.tmbCrazyGamesBasic='true';\nlet inPlayablesEnv=false,systemPaused=false,rafId=0,loopRunning=false,firstFrameSent=false,gameReadySent=false,platformInitComplete=false,platformLanguage='en',gameplayActive=null;",
    "add CrazyGames Basic build flag",
  ],
  [
    "return fullscreenSurfaceAllowed()&&!native&&!playables&&(allowDebug||!/debug/i.test(location.hash))",
    "return !CRAZYGAMES_BASIC_BUILD&&fullscreenSurfaceAllowed()&&!native&&!playables&&(allowDebug||!/debug/i.test(location.hash))",
    "hide fullscreen and iOS helper on CrazyGames",
  ],
  [
    "document.addEventListener('tmb:rewarded-capability',e=>{e.detail.available=!!activeAdAdapter().hasRewarded});",
    "document.addEventListener('tmb:rewarded-capability',e=>{e.detail.available=!CRAZYGAMES_BASIC_BUILD&&!!activeAdAdapter().hasRewarded});",
    "disable rewarded capability",
  ],
  [
    "document.addEventListener('tmb:interstitial-capability',e=>{e.detail.available=!!activeAdAdapter().hasInterstitial});",
    "document.addEventListener('tmb:interstitial-capability',e=>{e.detail.available=!CRAZYGAMES_BASIC_BUILD&&!!activeAdAdapter().hasInterstitial});",
    "disable interstitial capability",
  ],
  [
    "document.addEventListener('tmb:rewarded-request',e=>{const adapter=activeAdAdapter();e.detail.promise=adapter.isBridge?showFullscreenAd('rewarded',e.detail.placement):adapter.showRewarded(e.detail.placement)});",
    "document.addEventListener('tmb:rewarded-request',e=>{if(CRAZYGAMES_BASIC_BUILD){e.detail.promise=Promise.resolve(false);return}const adapter=activeAdAdapter();e.detail.promise=adapter.isBridge?showFullscreenAd('rewarded',e.detail.placement):adapter.showRewarded(e.detail.placement)});",
    "block rewarded requests",
  ],
  [
    "document.addEventListener('tmb:interstitial-request',e=>{e.detail.promise=showFullscreenAd('interstitial',e.detail.placement)});",
    "document.addEventListener('tmb:interstitial-request',e=>{e.detail.promise=CRAZYGAMES_BASIC_BUILD?Promise.resolve(false):showFullscreenAd('interstitial',e.detail.placement)});",
    "block interstitial requests",
  ],
  [
    "async function showFullscreenAd(kind,placement){if(fullscreenAdPromise)return false;",
    "async function showFullscreenAd(kind,placement){if(CRAZYGAMES_BASIC_BUILD)return false;if(fullscreenAdPromise)return false;",
    "block direct fullscreen-ad requests",
  ],
  [
    "const url='https://play.google.com/store/apps/details?id=com.borugaming.trustmebro';",
    "const url='';",
    "remove native store URL",
  ],
];
for (const [before, after, label] of transforms) {
  const count = html.split(before).length - 1;
  if (count !== 1) fail(`${label}: expected one match, got ${count}`);
  html = html.replace(before, after);
}
fs.writeFileSync(indexPath, html, "utf8");

const campaignPath = path.join(output, "js", "a12-campaign.js");
let campaign = fs.readFileSync(campaignPath, "utf8");
const testModeBlock = /  const TEST_MODE_LOCAL_HOSTS = new Set\(\["localhost", "127\.0\.0\.1"\]\),[\s\S]*?  const TEST_MODE =\r?\n[\s\S]*?    !isNativeRuntime\(\);/;
const testModeMatches = campaign.match(new RegExp(testModeBlock.source, "g")) || [];
if (testModeMatches.length !== 1) fail(`disable local test mode: expected one match, got ${testModeMatches.length}`);
campaign = campaign.replace(testModeBlock, "  const TEST_MODE = false;");
fs.writeFileSync(campaignPath, campaign, "utf8");

const files = walk(output).sort();
const relativeFiles = files.map(file => normalize(path.relative(output, file)));
const missing = [...required].filter(relative => !fs.existsSync(path.join(output, relative))).sort();
const unexpected = relativeFiles.filter(relative => !required.has(relative)).sort();
if (missing.length || unexpected.length) fail(`graph mismatch: missing=${missing} unexpected=${unexpected}`);
if (relativeFiles.some(relative => relative.startsWith("sprites/raw/"))) fail("sprites/raw entered build");

const relativeReferencePatterns = [
  /(?:src|href)=["']([^"'#?]+)["']/g,
  /(?:new Audio|fetch)\(["']([^"'?]+)["']/g,
];
const checkedReferences = new Set();
for (const relative of ["index.html", "js/a5-audio.js", "js/a12-campaign.js", "manifest.webmanifest"]) {
  const text = fs.readFileSync(path.join(output, relative), "utf8");
  for (const pattern of relativeReferencePatterns) {
    for (const match of text.matchAll(pattern)) {
      const reference = normalize(match[1]);
      if (/^(?:https?:|data:|javascript:)/i.test(reference)) continue;
      checkedReferences.add(reference);
    }
  }
}
const missingReferences = [...checkedReferences].filter(reference => !fs.existsSync(path.join(output, reference))).sort();
if (missingReferences.length) fail(`missing relative references: ${missingReferences.join(", ")}`);

const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largest = files
  .map(file => ({ file: normalize(path.relative(output, file)), bytes: fs.statSync(file).size }))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 5);
const result = {
  output: normalize(output),
  sourceHead: head,
  detection: "build flag: CRAZYGAMES_BASIC_BUILD=true",
  files: files.length,
  bytes,
  mib: Number((bytes / 1024 / 1024).toFixed(3)),
  missingReferences,
  unexpected,
  largest,
};
if (files.length > 1500) fail(`file count exceeds limit: ${files.length}`);
if (bytes > 50 * 1024 * 1024) fail(`build exceeds 50 MiB: ${result.mib}`);
console.log(JSON.stringify(result, null, 2));
