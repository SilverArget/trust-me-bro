const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel-entry");
fs.mkdirSync(out, { recursive: true });

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

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

const profile = {
  schema: 1,
  runnerId: "male",
  walletBalance: 5000,
  ownedRunnerIds: ["male", "female", "tall", "compact", "bruiser", "athlete"],
  ownedOutfitSetIds: ["default", "dockCrew", "nightShift", "hazardRunner", "ronin", "shadowNinja", "orbitAstronaut", "northRaider", "mechaPilot"],
  equippedOutfitByRunner: { male: "default", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
  ownedChiefIds: ["securityTall", "classicChief", "robotGuard", "bouncer"],
  equippedChief: "securityTall",
  ownedWorldIds: ["dock31", "frozen", "magma", "aftermath"],
  selectedWorldId: "dock31",
  settings: { language: "en" },
};

async function newPage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error" && !/Before using the SDK you must initialize it/.test(msg.text())) errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript((p) => localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(p)), profile);
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  return { page, errors };
}

async function entryShots(browser) {
  const metrics = {};
  {
    const { page, errors } = await newPage(browser, { width: 1280, height: 720 });
    await page.screenshot({ path: path.join(out, "entry-1280x720.png") });
    metrics.desktop = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll(".characterChoice")].map((e) => {
        const r = e.getBoundingClientRect();
        return { text: e.textContent.trim(), dataCharacter: e.dataset.character, label: e.getAttribute("aria-label"), w: r.width, h: r.height };
      });
      return {
        buttons,
        visibleExtra: [...document.querySelectorAll("#characterCard img,#characterCard .eyebrow,#characterCard h2,#characterCard p,#characterShop,#a12LanguageWrap")].filter((e) => getComputedStyle(e).display !== "none" && e.getClientRects().length).length,
      };
    });
    await page.locator('.characterChoice[data-character="1"]').click();
    await page.waitForFunction(() => !document.getElementById("characterSelect")?.classList.contains("show"));
    await page.screenshot({ path: path.join(out, "female-started-1280x720.png") });
    metrics.femaleStart = await page.evaluate(() => ({ characterId: __tmb.characterId, runnerId: __TMB_A12__.getState().profile.runnerId, routeId: __TMB_A12__.getState().routeId }));
    await page.locator("#characterChange").click();
    await page.waitForSelector("#characterSelect.show");
    await page.screenshot({ path: path.join(out, "id-reopen-1280x720.png") });
    metrics.idReopen = await page.evaluate(() => [...document.querySelectorAll(".characterChoice")].map((e) => e.textContent.trim()).join(""));
    metrics.desktopConsoleErrors = errors.length;
    await page.close();
  }
  {
    const { page, errors } = await newPage(browser, { width: 390, height: 844 });
    await page.screenshot({ path: path.join(out, "entry-390x844.png") });
    metrics.mobile = await page.evaluate(() => [...document.querySelectorAll(".characterChoice")].map((e) => {
      const r = e.getBoundingClientRect();
      return { text: e.textContent.trim(), w: r.width, h: r.height, x: r.x, y: r.y };
    }));
    metrics.mobileConsoleErrors = errors.length;
    await page.close();
  }
  return metrics;
}

async function d04Fall(browser) {
  const { page, errors } = await newPage(browser, { width: 1280, height: 720 });
  await page.locator('.characterChoice[data-character="0"]').click();
  await page.evaluate(() => {
    __TMB_A12__.startRoute("D04", true);
    __TMB_A12__.disableChief();
    const r = __TMB_A12__.routeDefinition("D04");
    const byId = Object.fromEntries(r.groundSegments.map((s) => [s.id, s]));
    const a = byId["d04-v-23"], b = byId["d04-v-24"];
    window.__entryFall = { fromId: a.id, toId: b.id, gapPx: +(b.x - (a.x + a.w)).toFixed(2), startX: +(a.x + a.w + (b.x - (a.x + a.w)) / 2).toFixed(2), edgeX: +(a.x + a.w).toFixed(2), deckY: a.y };
    __TMB_A12__.placePlayer(window.__entryFall.startX, 0);
    __tmbParkour.manual();
    __tmbParkour.move(0);
    for (let i = 0; i < 20; i++) __tmbCampaignStep(1 / 60);
    window.__entryFall.startCameraWorldY = __TMB_A12__.getState().cameraWorldY;
    __tmbCampaignDraw();
  });
  await page.screenshot({ path: path.join(out, "d04-fall-01-start-1280x720.png") });
  const samples = [];
  for (const [i, steps] of [[2, 20], [3, 20], [4, 30]]) {
    await page.evaluate((steps) => {
      for (let k = 0; k < steps; k++) __tmbCampaignStep(1 / 60);
      __tmbCampaignDraw();
    }, steps);
    samples.push(await page.evaluate(() => {
      const s = __TMB_A12__.getState();
      return { playerY: +(s.player.y + s.hitbox.h).toFixed(2), cameraWorldY: +s.cameraWorldY.toFixed(2), cameraGroundFootY: +s.cameraGroundFootY.toFixed(2), deaths: s.deaths, routeId: s.routeId };
    }));
    await page.screenshot({ path: path.join(out, `d04-fall-0${i}-1280x720.png`) });
  }
  const metrics = await page.evaluate((samples) => {
    const s = __TMB_A12__.getState();
    return {
      ...window.__entryFall,
      samples,
      deaths: s.deaths,
      routeId: s.routeId,
      startCameraWorldY: +window.__entryFall.startCameraWorldY.toFixed(2),
      maxCameraWorldY: +Math.max(...samples.map((v) => v.cameraWorldY)).toFixed(2),
    };
  }, samples);
  metrics.consoleErrors = errors.length;
  await page.close();
  return metrics;
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const metrics = { entry: await entryShots(browser), d04: await d04Fall(browser) };
    metrics.consoleErrors = metrics.entry.desktopConsoleErrors + metrics.entry.mobileConsoleErrors + metrics.d04.consoleErrors;
    fs.writeFileSync(path.join(out, "entry-metrics.json"), JSON.stringify(metrics, null, 2));
    if (metrics.entry.desktop.visibleExtra !== 0) throw new Error("entry extras visible");
    if (metrics.entry.desktop.buttons.map((b) => b.text).join("") !== "♂♀") throw new Error("entry symbols missing");
    if (metrics.entry.desktop.buttons.some((b) => b.w < 120 || b.h < 120)) throw new Error("entry buttons too small");
    if (metrics.entry.femaleStart.runnerId !== "female") throw new Error("female start failed");
    if (metrics.entry.idReopen !== "♂♀") throw new Error("ID reopen did not show symbols");
    if (metrics.d04.deaths < 1) throw new Error("D04 fall did not die");
    if (metrics.d04.maxCameraWorldY > metrics.d04.startCameraWorldY + 4) throw new Error("camera followed fall into pit");
    if (metrics.consoleErrors !== 0) throw new Error(`console errors ${metrics.consoleErrors}`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error(err);
  server.close();
  process.exit(1);
});
