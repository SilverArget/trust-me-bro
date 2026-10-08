const fs = require("fs");
const http = require("http");
const path = require("path");
const childProcess = require("child_process");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel-cg2");
fs.mkdirSync(out, { recursive: true });

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".json": "application/json; charset=utf-8" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.join(root, rel);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end("not found");
    res.writeHead(200, { "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

const fullProfile = (language = "en") => ({
  schema: 1,
  runnerId: "male",
  walletBalance: 2000,
  ownedRunnerIds: ["male", "female", "tall", "compact", "bruiser", "athlete"],
  ownedOutfitSetIds: ["default"],
  equippedOutfitByRunner: { male: "default", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
  ownedChiefIds: ["securityTall", "classicChief", "robotGuard", "bouncer"],
  equippedChief: "classicChief",
  ownedWorldIds: ["dock31", "frozen", "magma", "aftermath"],
  selectedWorldId: "dock31",
  settings: { language },
});

function mojibakeReport() {
  const pattern = /Ã|â€|Å¸|ÄŸ/g;
  const files = [
    "index.html",
    ...fs.readdirSync(path.join(root, "js")).filter((f) => f.endsWith(".js")).map((f) => `js/${f}`),
  ];
  const matches = {};
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    matches[rel] = (text.match(pattern) || []).length;
  }
  const current = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const base = childProcess.execFileSync("git", ["show", "3152a03:index.html"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const charSet = (s) => Array.from(new Set([...s].filter((ch) => ch.codePointAt(0) > 127))).sort();
  const count = (s) => [...s].filter((ch) => ch.codePointAt(0) > 127).length;
  return {
    pattern: String(pattern),
    matches,
    totalMatches: Object.values(matches).reduce((a, b) => a + b, 0),
    indexNonAsciiCount: count(current),
    base3152a03NonAsciiCount: count(base),
    indexNonAsciiSet: charSet(current).join(""),
    base3152a03NonAsciiSet: charSet(base).join(""),
    indexNonAsciiSameAs3152a03: count(current) === count(base) && charSet(current).join("") === charSet(base).join(""),
  };
}

async function pageWith(browser, viewport = { width: 1280, height: 720 }, language = "en") {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript((p) => localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(p)), fullProfile(language));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  if (await page.locator("#characterSelect.show").count()) {
    await page.locator('.characterChoice[data-runner-id="male"]').click();
  }
  await page.waitForFunction(() => !document.getElementById("characterSelect")?.classList.contains("show"));
  return { page, errors };
}

async function topButtons(browser) {
  const shots = [];
  for (const [name, viewport] of [["1280x720", { width: 1280, height: 720 }], ["390x844", { width: 390, height: 844 }]]) {
    const { page, errors } = await pageWith(browser, viewport);
    await page.evaluate(() => { __TMB_A12__.startRoute("D04", true); __tmbSegmentStart(900); __tmbCampaignDraw(); });
    const file = `top-buttons-${name}.png`;
    await page.screenshot({ path: path.join(out, file) });
    const metrics = await page.evaluate(() => {
      const rect = (id) => {
        const e = document.getElementById(id);
        const r = e.getBoundingClientRect();
        return { text: e.textContent, x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      return { pause: rect("pauseBtn"), mute: rect("muteBtn"), change: rect("characterChange"), fullscreen: rect("fullscreenBtn") };
    });
    shots.push({ name, file, metrics, consoleErrors: errors.length });
    await page.close();
  }
  return shots;
}

async function chiefAndShop(browser) {
  const { page, errors } = await pageWith(browser);
  await page.evaluate(() => {
    __TMB_A12__.startRoute("D04", true);
    __TMB_A12__.placePlayerAtChiefTime(9);
    __TMB_A12__.forceChiefNear();
    const s = __TMB_A12__.getState();
    __tmbSegmentStart(Math.max(0, Math.min(s.player.x, s.chief?.x || s.player.x) - 250));
    __tmbCampaignDraw();
  });
  await page.screenshot({ path: path.join(out, "d04-classicChief-no-lantern-1280x720.png") });
  await page.evaluate(() => { __TMB_A12__.openShop(); __TMB_A12__.setShopTab("chiefs"); });
  await page.screenshot({ path: path.join(out, "shop-chiefs-classicChief-preview-1280x720.png") });
  await page.close();
  return { consoleErrors: errors.length };
}

async function characterPreserve(browser) {
  const { page, errors } = await pageWith(browser);
  await page.evaluate(() => { __TMB_A12__.startRoute("D04", true); __tmbSegmentStart(3000); __tmbCampaignDraw(); });
  await page.locator("#characterChange").click();
  await page.locator('.characterChoice[data-runner-id="male"]').click();
  await page.waitForFunction(() => !document.getElementById("characterSelect")?.classList.contains("show"));
  await page.evaluate(() => __tmbCampaignDraw());
  await page.screenshot({ path: path.join(out, "character-change-before-1280x720.png") });
  const before = await page.evaluate(() => {
    const s = __TMB_A12__.getState();
    return { routeId: s.routeId, x: +s.player.x.toFixed(2), y: +s.player.y.toFixed(2), runnerId: s.profile.runnerId, chiefT: s.chief ? +s.chief.chiefT.toFixed(2) : null };
  });
  await page.locator("#characterChange").click();
  await page.locator('.characterChoice[data-runner-id="female"]').click();
  await page.waitForFunction(() => !document.getElementById("characterSelect")?.classList.contains("show"));
  await page.evaluate(() => __tmbCampaignDraw());
  const after = await page.evaluate(() => {
    const s = __TMB_A12__.getState();
    return { routeId: s.routeId, x: +s.player.x.toFixed(2), y: +s.player.y.toFixed(2), runnerId: s.profile.runnerId, chiefT: s.chief ? +s.chief.chiefT.toFixed(2) : null };
  });
  await page.screenshot({ path: path.join(out, "character-change-after-female-1280x720.png") });
  await page.close();
  return { before, after, sameRoute: before.routeId === after.routeId, deltaX: +(after.x - before.x).toFixed(2), deltaY: +(after.y - before.y).toFixed(2), consoleErrors: errors.length };
}

async function doorD18(browser) {
  const { page, errors } = await pageWith(browser);
  await page.evaluate(() => {
    __TMB_A12__.startRoute("D18", true);
    const p = __TMB_A12__.finishDoorPlacement("D18");
    __tmbSegmentStart(Math.max(0, p.x - 220));
    __tmbCampaignDraw();
  });
  await page.screenshot({ path: path.join(out, "d18-finish-door-edge-1280x720.png") });
  const metrics = await page.evaluate(() => {
    const p = __TMB_A12__.finishDoorPlacement("D18");
    return { doorX1: +(p.x - 74).toFixed(2), doorX2: +(p.x + 38).toFixed(2), groundX2: +p.groundRight.toFixed(2), margin: +(p.groundRight - (p.x + 38)).toFixed(2), groundId: p.groundId };
  });
  await page.close();
  return { metrics, consoleErrors: errors.length };
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    fs.copyFileSync(path.join(root, "03-test", "manager-preview", "gorsel", "contact-classicChief.png"), path.join(out, "contact-classicChief-nofener.png"));
    const metrics = {
      mojibake: mojibakeReport(),
      topButtons: await topButtons(browser),
      chiefAndShop: await chiefAndShop(browser),
      characterChange: await characterPreserve(browser),
      d18Door: await doorD18(browser),
    };
    metrics.consoleErrors = metrics.topButtons.reduce((n, r) => n + r.consoleErrors, 0) + metrics.chiefAndShop.consoleErrors + metrics.characterChange.consoleErrors + metrics.d18Door.consoleErrors;
    fs.writeFileSync(path.join(out, "cg2-metrics.json"), JSON.stringify(metrics, null, 2));
    if (metrics.mojibake.totalMatches !== 0 || !metrics.mojibake.indexNonAsciiSameAs3152a03) throw new Error("mojibake scan failed");
    if (metrics.topButtons.some((r) => r.metrics.change.text !== "ID" || r.metrics.change.w < 44 || r.metrics.pause.w < 44 || r.metrics.mute.w < 44)) throw new Error("top buttons failed");
    if (!metrics.characterChange.sameRoute || Math.abs(metrics.characterChange.deltaX) > 1 || metrics.characterChange.after.runnerId !== "female") throw new Error("character change did not preserve route/x");
    if (metrics.d18Door.metrics.margin < 0) throw new Error("D18 door outside platform");
    if (metrics.consoleErrors) throw new Error(`console errors ${metrics.consoleErrors}`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
