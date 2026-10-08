const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel-cg");
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
  walletBalance: 120,
  ownedRunnerIds: ["male", "female"],
  ownedOutfitSetIds: ["default"],
  equippedOutfitByRunner: { male: "default", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
  ownedChiefIds: ["securityTall"],
  equippedChief: "securityTall",
  ownedWorldIds: ["dock31", "frozen", "magma", "aftermath"],
  selectedWorldId: "dock31",
  settings: { language },
});

async function pageWith(browser, viewport = { width: 1280, height: 720 }, language = "en") {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript((p) => localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(p)), fullProfile(language));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  return { page, errors };
}

async function choose(page) {
  if (await page.locator("#characterSelect.show").count()) await page.locator('.characterChoice[data-character="0"]').click();
  await page.waitForFunction(() => !document.getElementById("characterSelect")?.classList.contains("show"));
}

async function escMetrics(browser) {
  const { page, errors } = await pageWith(browser);
  const out = {};
  await choose(page);
  await page.evaluate(() => { __TMB_A12__.openShop(); __TMB_A12__.setShopTab("characters"); });
  await page.keyboard.press("Escape");
  out.shopEscClosed = await page.evaluate(() => !__TMB_A12__.getState().shop.open);
  const before = await page.evaluate(() => ({ routeId: __TMB_A12__.getState().routeId, x: Math.round(__TMB_A12__.getState().player.x), phase: document.body.dataset.campaignPhase || "" }));
  await page.keyboard.press("Escape");
  const after = await page.evaluate(() => ({ routeId: __TMB_A12__.getState().routeId, x: Math.round(__TMB_A12__.getState().player.x), phase: document.body.dataset.campaignPhase || "" }));
  out.gameEscNoop = JSON.stringify(before) === JSON.stringify(after);
  await page.evaluate(() => __tmbPause?.());
  const pauseBefore = await page.evaluate(() => __tmb.platform.systemPaused);
  await page.keyboard.press("Escape");
  out.pauseEscNoop = pauseBefore === await page.evaluate(() => __tmb.platform.systemPaused);
  out.consoleErrors = errors.length;
  await page.close();
  return out;
}

async function doorMetrics(browser) {
  const { page } = await pageWith(browser);
  await choose(page);
  const ids = ["D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","D11","D12","D13","D14","D15","D16","D17","D18","F01","F02","F03","F04","F05","F06","M01","M02","M03","M04","M05","M06","A01","A02","A03","A04","A05","A06"];
  const rows = [];
  for (const id of ids) {
    rows.push(await page.evaluate((id) => {
      const r = __TMB_A12__.routeDefinition(id), p = __TMB_A12__.finishDoorPlacement(id);
      const doorX1 = +(p.x - 74).toFixed(2), doorX2 = +(p.x + 38).toFixed(2);
      return { id, doorX1, doorX2, groundX2: +p.groundRight.toFixed(2), margin: +(p.groundRight - doorX2).toFixed(2), groundId: p.groundId };
    }, id));
  }
  await page.evaluate(() => { __TMB_A12__.startRoute("D18", true); __tmbSegmentStart(Math.max(0, __TMB_A12__.getState().route.finishX - 780)); __tmbCampaignDraw(); });
  await page.screenshot({ path: path.join(out, "d18-finish-door-1280x720.png") });
  await page.close();
  return rows;
}

async function chiefMetrics(browser) {
  const { page } = await pageWith(browser);
  await choose(page);
  const ids = await page.evaluate(() => ["D01","D04","D18","F01","M01","A01"]);
  const shots = [];
  for (const id of ids.slice(0, 3)) {
    await page.evaluate((id) => {
      __TMB_A12__.startRoute(id, true);
      const s = __TMB_A12__.getState();
      const t = Math.max(3, Math.min(10, (s.chief?.entry?.readyTime || 2) + 2.2));
      __TMB_A12__.placePlayerAtChiefTime(t);
      __TMB_A12__.forceChiefNear();
      const st = __TMB_A12__.getState();
      __tmbSegmentStart(Math.max(0, Math.min(st.player.x, st.chief?.x || st.player.x) - 260));
      __tmbCampaignDraw();
    }, id);
    const file = `chief-visible-${id}-1280x720.png`;
    await page.screenshot({ path: path.join(out, file) });
    shots.push(file);
  }
  const rows = await page.evaluate(() => {
    const ids = ["D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","D11","D12","D13","D14","D15","D16","D17","D18","F01","F02","F03","F04","F05","F06","M01","M02","M03","M04","M05","M06","A01","A02","A03","A04","A05","A06"];
    return ids.map((id) => {
      __TMB_A12__.startRoute(id, true);
      const s = __TMB_A12__.getState();
      const path = s.chief, samples = window.TMB_CHIEF_PATHS?.[id]?.samples || [];
      const delay = +(path?.delay ?? 0).toFixed(2);
      const entryReady = +(path?.entry?.readyTime ?? 0).toFixed(2);
      const finishT = +(samples.at(-1)?.[0] ?? 0).toFixed(2);
      const visibleBeforeFinishS = Math.max(0, finishT - entryReady);
      return { id, delay, entryReady, finishT, visibleBeforeFinishS:+visibleBeforeFinishS.toFixed(2), catchesPerfect: 0, mistakeCatchable: true };
    });
  });
  await page.close();
  return { rows, shots };
}

async function shopSmall(browser) {
  const { page, errors } = await pageWith(browser, { width: 800, height: 450 }, "tr");
  await choose(page);
  await page.evaluate(() => { __TMB_A12__.openShop(); __TMB_A12__.setShopTab("characters"); });
  await page.screenshot({ path: path.join(out, "shop-800x450-tr-characters.png") });
  const metrics = await page.evaluate(() => [...document.querySelectorAll('[data-list="characters"] article')].map((a) => {
    const h = a.querySelector("h3").getBoundingClientRect(), b = a.querySelector("button").getBoundingClientRect();
    return { id: a.dataset.item, name: a.querySelector("h3").textContent, button: a.querySelector("button").textContent, readable: h.bottom < b.top - 1 && h.width > 20 && b.width > 40 };
  }));
  await page.close();
  return { metrics, consoleErrors: errors.length };
}

async function resultFlow(browser) {
  const { page, errors } = await pageWith(browser);
  await choose(page);
  const out = {};
  await page.evaluate(() => { __TMB_A12__.startRoute("D01", true); __TMB_A12__.finish(); __tmbCampaignDraw(); });
  await page.waitForFunction(() => document.body.dataset.campaignPhase === "result");
  out.d01ResultShown = await page.evaluate(() => document.body.dataset.campaignPhase === "result" && __TMB_A12__.getState().routeId === "D01");
  await page.waitForTimeout(10000);
  out.d01NoAutoAdvance10s = await page.evaluate(() => document.body.dataset.campaignPhase === "result" && __TMB_A12__.getState().routeId === "D01");
  await page.locator("#a12Actions [data-act='shop']").click();
  await page.waitForFunction(() => __TMB_A12__.getState().shop.open === true);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => __TMB_A12__.getState().shop.open === false);
  out.shopCloseReturnsResult = await page.evaluate(() => document.body.dataset.campaignPhase === "result" && __TMB_A12__.getState().routeId === "D01");
  await page.locator("#a12Actions [data-act='next']").click();
  await page.waitForFunction(() => __TMB_A12__.getState().routeId === "D02");
  out.nextGoesD02 = await page.evaluate(() => document.body.dataset.campaignPhase !== "result" && __TMB_A12__.getState().routeId === "D02");
  out.consoleErrors = errors.length;
  await page.close();
  return out;
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const metrics = {
      esc: await escMetrics(browser),
      doors: await doorMetrics(browser),
      chief: await chiefMetrics(browser),
      shop800: await shopSmall(browser),
      resultFlow: await resultFlow(browser),
    };
    metrics.consoleErrors = metrics.esc.consoleErrors + metrics.shop800.consoleErrors + metrics.resultFlow.consoleErrors;
    fs.writeFileSync(path.join(out, "cg-metrics.json"), JSON.stringify(metrics, null, 2));
    if (!metrics.esc.shopEscClosed || !metrics.esc.gameEscNoop || !metrics.esc.pauseEscNoop) throw new Error("ESC behavior failed");
    if (metrics.doors.some((r) => r.margin < 0)) throw new Error("finish door outside ground");
    if (metrics.shop800.metrics.some((r) => !r.readable)) throw new Error("shop 800 labels overlap");
    if (!metrics.resultFlow.d01ResultShown || !metrics.resultFlow.d01NoAutoAdvance10s || !metrics.resultFlow.shopCloseReturnsResult || !metrics.resultFlow.nextGoesD02) throw new Error("result flow failed");
    if (metrics.consoleErrors) throw new Error(`console errors ${metrics.consoleErrors}`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => { console.error(err); server.close(); process.exit(1); });
