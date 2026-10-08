const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel-result-flow");
fs.mkdirSync(out, { recursive: true });

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
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
  runnerId: "tall",
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
  await page.addInitScript((p) => localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(p)), profile);
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  const choice = page.locator(".characterChoice:visible").first();
  if (await choice.count()) await choice.click();
  return page;
}

async function finishResultFlow(browser, viewport, tag) {
  const page = await newPage(browser, viewport);
  await page.evaluate(() => {
    __TMB_A12__.setLanguage("en");
    __TMB_A12__.renderWorldOnRoute("dock31", "D01");
    __TMB_A12__.finish();
    __tmbCampaignDraw();
  });
  await page.screenshot({ path: path.join(out, `d01-result-${tag}.png`) });
  const before = await page.evaluate(() => ({
    routeId: __TMB_A12__.getState().routeId,
    result: !!__TMB_A12__.getState().result,
    phase: document.body.dataset.campaignPhase,
    actions: [...document.querySelectorAll("#a12Actions button:not([hidden])")].map((b) => b.textContent),
  }));
  await page.waitForTimeout(10000);
  const afterWait = await page.evaluate(() => ({
    routeId: __TMB_A12__.getState().routeId,
    result: !!__TMB_A12__.getState().result,
    phase: document.body.dataset.campaignPhase,
  }));
  await page.locator('#a12Actions [data-act="shop"]').click();
  await page.waitForSelector("#a12Shop.show");
  await page.screenshot({ path: path.join(out, `d01-result-shop-${tag}.png`) });
  await page.locator("#a12Shop [data-close]").click();
  await page.waitForFunction(() => !document.getElementById("a12Shop").classList.contains("show"));
  const afterShopClose = await page.evaluate(() => ({
    routeId: __TMB_A12__.getState().routeId,
    result: !!__TMB_A12__.getState().result,
    actionsVisible: !document.getElementById("a12Actions").hidden,
  }));
  await page.screenshot({ path: path.join(out, `d01-result-return-${tag}.png`) });
  await page.locator('#a12Actions [data-act="next"]').click();
  await page.waitForFunction(() => __TMB_A12__.getState().routeId === "D02");
  const afterNext = await page.evaluate(() => ({
    routeId: __TMB_A12__.getState().routeId,
    result: !!__TMB_A12__.getState().result,
  }));
  await page.screenshot({ path: path.join(out, `d02-after-next-${tag}.png`) });
  await page.close();
  return { before, afterWait, afterShopClose, afterNext };
}

async function d04Probe(browser) {
  const page = await newPage(browser, { width: 1280, height: 720 });
  const humanMetrics = await page.evaluate(async () => {
    __TMB_A12__.renderWorldOnRoute("dock31", "D04");
    __TMB_A12__.disableChief();
    const r = __TMB_A12__.routeDefinition("D04");
    const byId = Object.fromEntries(r.groundSegments.map((s) => [s.id, s]));
    const a = byId["d04-v-21"], b = byId["d04-v-22"];
    const gapPx = +(b.x - (a.x + a.w)).toFixed(2);
    const dropPx = +(b.y - a.y).toFixed(2);
    const v22Catchable = r.catchableSurfaces.some((s) => s.id === "d04-v-22");

    __TMB_A12__.placePlayer(a.x + a.w - 74, a.y - 48);
    const samples = [];
    const press = (type) => document.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    __tmbParkour.manual();
    __tmbParkour.move(1);
    let jumped = false;
    for (let i = 0; i < 420; i++) {
      const s = __TMB_A12__.getState();
      if (!jumped && s.player.x + s.hitbox.w >= a.x + a.w - 2) {
        press("keydown");
        jumped = true;
      }
      if (jumped && i % 8 === 0) press("keyup");
      __tmbCampaignStep(1 / 60);
      const q = __TMB_A12__.getState();
      samples.push({
        t: +q.gameClock.toFixed(3),
        x: +q.player.x.toFixed(2),
        feet: +(q.player.y + q.hitbox.h).toFixed(2),
        state: q.parkour.state,
        onGround: q.player.onGround,
        deaths: q.deaths,
        cameraWorldY: +q.cameraWorldY.toFixed(2),
      });
      if (q.player.onGround && q.player.x > b.x + 12) break;
    }
    press("keyup");
    const end = __TMB_A12__.getState();
    __tmbCampaignDraw();
    const human = {
      landedOrCaught: end.deaths === 0 && end.player.x > b.x - 32,
      endX: +end.player.x.toFixed(2),
      state: end.parkour.state,
      deaths: end.deaths,
      maxCameraSpread: +(Math.max(...samples.map((s) => s.cameraWorldY)) - Math.min(...samples.map((s) => s.cameraWorldY))).toFixed(2),
    };

    return {
      found: { id: "d04-v-21 -> d04-v-22", x: a.x + a.w, gapPx, dropPx, v22Catchable },
      human,
    };
  });
  await page.screenshot({ path: path.join(out, "d04-v22-catch-1280x720.png") });
  const fallMetrics = await page.evaluate(async () => {
    const r = __TMB_A12__.routeDefinition("D04");
    const b = r.groundSegments.find((s) => s.id === "d04-v-22");
    __TMB_A12__.startRoute("D04", true);
    __TMB_A12__.disableChief();
    __TMB_A12__.placePlayer(b.x + 42, b.y - 48);
    for (let i = 0; i < 90; i++) __tmbCampaignStep(1 / 60);
    const stable = __TMB_A12__.getState();
    __TMB_A12__.placePlayer(b.x + 126, b.y + 360);
    const fall = [];
    __tmbParkour.manual();
    __tmbParkour.move(1);
    for (let i = 0; i < 240; i++) {
      __tmbCampaignStep(1 / 60);
      const s = __TMB_A12__.getState();
      fall.push({ y: +(s.player.y + s.hitbox.h).toFixed(2), cameraWorldY: +s.cameraWorldY.toFixed(2), deaths: s.deaths });
      if (s.deaths > 0) break;
    }
    __tmbCampaignDraw();
    return {
      fallCamera: {
        samples: fall.length,
        deaths: fall.at(-1)?.deaths || 0,
        cameraWorldYStart: stable.cameraWorldY,
        cameraWorldYEnd: fall.at(-1)?.cameraWorldY,
        maxCameraWorldY: Math.max(...fall.map((s) => s.cameraWorldY)),
      },
    };
  });
  await page.screenshot({ path: path.join(out, "d04-fall-camera-1280x720.png") });
  await page.close();
  return { ...humanMetrics, ...fallMetrics };
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const metrics = {
      desktop: await finishResultFlow(browser, { width: 1280, height: 720 }, "1280x720"),
      mobile: await finishResultFlow(browser, { width: 390, height: 844 }, "390x844"),
      d04: await d04Probe(browser),
    };
    fs.writeFileSync(path.join(out, "result-flow-metrics.json"), JSON.stringify(metrics, null, 2));
    for (const row of [metrics.desktop, metrics.mobile]) {
      if (row.before.routeId !== "D01" || !row.before.result) throw new Error("D01 result missing");
      if (row.afterWait.routeId !== "D01" || !row.afterWait.result) throw new Error("auto-advanced from result");
      if (row.afterShopClose.routeId !== "D01" || !row.afterShopClose.result || !row.afterShopClose.actionsVisible) throw new Error("shop close did not return to result");
      if (row.afterNext.routeId !== "D02" || row.afterNext.result) throw new Error("next did not enter D02");
    }
    if (!metrics.d04.found.v22Catchable || metrics.d04.found.gapPx !== 72 || !metrics.d04.human.landedOrCaught) {
      throw new Error(`D04 catch probe failed ${JSON.stringify(metrics.d04)}`);
    }
    if (metrics.d04.fallCamera.cameraWorldYEnd > metrics.d04.fallCamera.cameraWorldYStart + 4) {
      throw new Error(`camera followed fall ${JSON.stringify(metrics.d04.fallCamera)}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error(err);
  server.close();
  process.exit(1);
});
