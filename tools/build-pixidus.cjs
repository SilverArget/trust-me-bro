const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const pixidusRoot = path.resolve(root, "..", "pixidus");
const output = path.join(pixidusRoot, "build-pixidus-v1");
const zipPath = path.join(pixidusRoot, "trust-me-bro-pixidus-v1.zip");
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

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(normalize(path.relative(output, file)), "utf8");
    const source = fs.readFileSync(file);
    const compressed = zlib.deflateRawSync(source, { level: 9 });
    const crc = crc32(source);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    localParts.push(local, name, compressed);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  fs.writeFileSync(zipPath, Buffer.concat([...localParts, ...centralParts, end]));
}

const head = cp.execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
if (head !== expectedHead) fail(`expected HEAD ${expectedHead}, got ${head}`);

if (path.dirname(output) !== pixidusRoot || path.basename(output) !== "build-pixidus-v1") {
  fail(`refusing unsafe output path: ${output}`);
}
if (path.dirname(zipPath) !== pixidusRoot || path.basename(zipPath) !== "trust-me-bro-pixidus-v1.zip") {
  fail(`refusing unsafe zip path: ${zipPath}`);
}
fs.rmSync(output, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });
fs.mkdirSync(output, { recursive: true });

const required = new Set([
  "index.html",
  "privacy.html",
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

const pixidusAdapter = String.raw`let pixidusReady=false,pixidusContext=null,pixidusRewardedAvailable=false,pixidusInterstitialAvailable=false,pixidusAdBusy=false,pixidusLocale='';
function pixidusSdkAd(){return window.Pixidus&&Pixidus.SDK&&Pixidus.SDK.ad}
function normalizePixidusLocale(value){const locale=String(value||'').toLowerCase().split(/[-_]/)[0];return ['en','tr','ru'].includes(locale)?locale:''}
function refreshPixidusAds(){const ad=pixidusSdkAd();if(!pixidusReady||!ad)return Promise.resolve();return Promise.all([Promise.resolve(ad.checkRewardedAdAvailable(undefined,2500)).then(r=>{pixidusRewardedAvailable=!!(r&&r.available)},()=>{pixidusRewardedAvailable=false}),Promise.resolve(ad.checkInterstitialAdAvailable(undefined,2500)).then(r=>{pixidusInterstitialAvailable=!!(r&&r.available)},()=>{pixidusInterstitialAvailable=false})]).then(()=>{})}
function applyPixidusLocale(attempt=0){if(!pixidusLocale)return;const campaign=window.__TMB_A12__;if(campaign&&typeof campaign.setLanguage==='function'){Promise.resolve(campaign.setLanguage(pixidusLocale)).catch(()=>{});return}if(attempt<120)setTimeout(()=>applyPixidusLocale(attempt+1),100)}
async function pixidusRewarded(){const ad=pixidusSdkAd();if(!pixidusReady||!ad||pixidusAdBusy)return false;const ownPause=!systemPaused,oldAudio=audioAllowed,enforcePause=()=>{if(!systemPaused)pauseGame('pixidus-rewarded');if(audioAllowed)setAudioAllowed(false)};enforcePause();const pauseGuard=setInterval(enforcePause,50);pixidusAdBusy=true;let rewarded=false;const onRewarded=()=>{rewarded=true};try{ad.addEventListener('adRewarded',onRewarded);const result=await ad.showRewardedAd();return rewarded||!!(result&&result.success&&result.completed===true)}catch(_){return false}finally{clearInterval(pauseGuard);try{ad.removeEventListener('adRewarded',onRewarded)}catch(_){}pixidusAdBusy=false;void refreshPixidusAds();if(ownPause){setAudioAllowed(oldAudio);resumeGame('pixidus-rewarded')}}}
async function pixidusInterstitial(){const ad=pixidusSdkAd();if(!pixidusReady||!ad||pixidusAdBusy)return false;pixidusAdBusy=true;try{const result=await ad.showInterstitialAd();return!!(result&&result.success!==false)}catch(_){return false}finally{pixidusAdBusy=false;void refreshPixidusAds()}}
const pixidusAdapter={...localTransport,isPixidus:true,init:async()=>{},language:()=>pixidusLocale||navigator.language||'en',showRewarded:pixidusRewarded,showInterstitial:pixidusInterstitial,get hasRewarded(){return pixidusReady&&pixidusRewardedAvailable&&!pixidusAdBusy},get hasInterstitial(){return pixidusReady&&pixidusInterstitialAvailable&&!pixidusAdBusy}};
if(window.Pixidus&&typeof Pixidus.onReady==='function')Pixidus.onReady(context=>{pixidusContext=context||{};pixidusReady=true;pixidusLocale=normalizePixidusLocale(pixidusContext.locale);void refreshPixidusAds();applyPixidusLocale()});
document.addEventListener('tmb:analytics-emit',event=>{if(!pixidusReady||!window.Pixidus||!Pixidus.SDK||!Pixidus.SDK.analytics)return;const detail=event.detail||{};Promise.resolve(Pixidus.SDK.analytics.logEvent(detail.event,detail.params||{})).catch(()=>{})});
`;

const indexPath = path.join(output, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const transforms = [
  [
    "</head>",
    '<script src="https://pixidus.com/sdk/v1/pixidus-html-sdk.js"></script>\n</head>',
    "add Pixidus SDK in head",
  ],
  [
    '<script src="playgama-bridge.js"></script>',
    "",
    "disable Playgama Bridge",
  ],
  [
    '<script src="js/ads-config.js"></script>',
    "",
    "remove external-ad configuration",
  ],
  [
    "let inPlayablesEnv=false,systemPaused=false,rafId=0,loopRunning=false,firstFrameSent=false,gameReadySent=false,platformInitComplete=false,platformLanguage='en',gameplayActive=null;",
    "const PIXIDUS_BUILD=true;document.documentElement.dataset.tmbPixidus='true';\nlet inPlayablesEnv=false,systemPaused=false,rafId=0,loopRunning=false,firstFrameSent=false,gameReadySent=false,platformInitComplete=false,platformLanguage='en',gameplayActive=null;",
    "add Pixidus build flag",
  ],
  [
    "const platformAdapter=typeof window.bridge!=='undefined'?bridgeAdapter:ytReady()&&ytgame.IN_PLAYABLES_ENV?ytAdapter:window.Capacitor?.Plugins?.AdMob?capacitorAdMob:localTransport;",
    `${pixidusAdapter}const platformAdapter=PIXIDUS_BUILD?pixidusAdapter:typeof window.bridge!=='undefined'?bridgeAdapter:ytReady()&&ytgame.IN_PLAYABLES_ENV?ytAdapter:window.Capacitor?.Plugins?.AdMob?capacitorAdMob:localTransport;`,
    "install Pixidus adapter",
  ],
  [
    "document.addEventListener('tmb:rewarded-request',e=>{const adapter=activeAdAdapter();e.detail.promise=adapter.isBridge?showFullscreenAd('rewarded',e.detail.placement):adapter.showRewarded(e.detail.placement)});",
    "document.addEventListener('tmb:rewarded-request',e=>{const adapter=activeAdAdapter();if(adapter.isPixidus){e.detail.promise=showFullscreenAd('rewarded',e.detail.placement);return}e.detail.promise=adapter.isBridge?showFullscreenAd('rewarded',e.detail.placement):adapter.showRewarded(e.detail.placement)});",
    "route Pixidus rewarded through pause flow",
  ],
  [
    "const adTimeoutMs=adAdapter.isBridge?3500:1500,value=await Promise.race([request,new Promise(resolve=>setTimeout(()=>resolve(false),adTimeoutMs))]),ok=kind==='rewarded'?!!value:true;",
    "const adTimeoutMs=adAdapter.isPixidus?0:adAdapter.isBridge?3500:1500,value=adTimeoutMs?await Promise.race([request,new Promise(resolve=>setTimeout(()=>resolve(false),adTimeoutMs))]):await request,ok=kind==='rewarded'?!!value:true;",
    "allow Pixidus ads to complete",
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
for (const relative of ["index.html", "privacy.html", "js/a5-audio.js", "js/a12-campaign.js", "manifest.webmanifest"]) {
  const text = fs.readFileSync(path.join(output, relative), "utf8");
  for (const pattern of relativeReferencePatterns) {
    for (const match of text.matchAll(pattern)) {
      const reference = normalize(match[1]);
      if (/^(?:https?:|mailto:|data:|javascript:)/i.test(reference)) continue;
      checkedReferences.add(reference);
    }
  }
}
const missingReferences = [...checkedReferences].filter(reference => !fs.existsSync(path.join(output, reference))).sort();
if (missingReferences.length) fail(`missing relative references: ${missingReferences.join(", ")}`);

createZip(files);

const zipEntries = relativeFiles;
if (!zipEntries.includes("index.html") || zipEntries[0].startsWith("./")) fail("invalid zip root");
if (zipEntries.some(relative => relative.includes("\\") || relative.endsWith("/"))) fail("invalid zip entry");
const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const zipBytes = fs.statSync(zipPath).size;
const sha256 = cp.execFileSync("certutil", ["-hashfile", zipPath, "SHA256"], { encoding: "utf8" })
  .split(/\r?\n/).map(line => line.trim()).find(line => /^[0-9a-f]{64}$/i.test(line));
if (!sha256) fail("could not compute zip sha256");
const result = {
  output: normalize(output),
  zip: normalize(zipPath),
  sourceHead: head,
  detection: "build flag: PIXIDUS_BUILD=true",
  files: files.length,
  bytes,
  mib: Number((bytes / 1024 / 1024).toFixed(3)),
  zipBytes,
  zipMiB: Number((zipBytes / 1024 / 1024).toFixed(3)),
  sha256: sha256.toLowerCase(),
  zipRootIndex: zipEntries.includes("index.html"),
  zipDirectoryEntries: 0,
  missingReferences,
  unexpected,
};
if (files.length > 1500) fail(`file count exceeds limit: ${files.length}`);
if (bytes > 50 * 1024 * 1024) fail(`build exceeds 50 MiB: ${result.mib}`);
console.log(JSON.stringify(result, null, 2));
