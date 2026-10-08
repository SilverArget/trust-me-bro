const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel");
fs.mkdirSync(out, { recursive: true });

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  let file = path.join(root, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

const profileFor = (chief = "securityTall", language = "en") => ({
  schema: 1,
  runnerId: "male",
  walletBalance: 5000,
  ownedRunnerIds: ["male", "female", "tall", "compact", "bruiser", "athlete"],
  ownedOutfitSetIds: ["default", "dockCrew", "nightShift", "hazardRunner", "ronin", "shadowNinja", "orbitAstronaut", "northRaider", "mechaPilot"],
  equippedOutfitByRunner: { male: "default", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
  ownedChiefIds: ["securityTall", "classicChief", "robotGuard", "bouncer"],
  equippedChief: chief,
  ownedWorldIds: ["dock31", "frozen", "magma", "aftermath"],
  selectedWorldId: "dock31",
  settings: { language },
});

async function captureLogoEvidence(page, routeId, worldId, fileName) {
  const metrics = await page.evaluate(async ({ routeId, worldId }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const canvas = document.getElementById("game");
    const luma = (r, g, b) => r * 0.2126 + g * 0.7152 + b * 0.0722;
    const sample = (ctx, box, predicate) => {
      const x0 = Math.max(0, Math.floor(box.x));
      const y0 = Math.max(0, Math.floor(box.y));
      const x1 = Math.min(canvas.width, Math.ceil(box.x + box.w));
      const y1 = Math.min(canvas.height, Math.ceil(box.y + box.h));
      if (x1 <= x0 || y1 <= y0) return { avg: 0, count: 0 };
      const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let total = 0, count = 0;
      for (let i = 0; i < img.length; i += 4) {
        const r = img[i], g = img[i + 1], b = img[i + 2], a = img[i + 3];
        if (predicate && !predicate(r, g, b, a)) continue;
        total += luma(r, g, b);
        count++;
      }
      return { avg: count ? total / count : 0, count };
    };
    const countBackgroundPaint = (ctx, box, predicate, decals) => {
      const x0 = Math.max(0, Math.floor(box.x));
      const y0 = Math.max(0, Math.floor(box.y));
      const x1 = Math.min(canvas.width, Math.ceil(box.x + box.w));
      const y1 = Math.min(canvas.height, Math.ceil(box.y + box.h));
      if (x1 <= x0 || y1 <= y0) return 0;
      const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let count = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          if (decals.some((d) => d?.screen && xx >= d.screen.x - 3 && xx <= d.screen.x + d.screen.w + 3 && yy >= d.screen.y - 3 && yy <= d.screen.y + d.screen.h + 3)) continue;
          const i = ((yy - y0) * (x1 - x0) + (xx - x0)) * 4;
          if (predicate(img[i], img[i + 1], img[i + 2], img[i + 3])) count++;
        }
      }
      return count;
    };
    const route = __TMB_A12__.routeDefinition(routeId);
    __TMB_A12__.renderWorldOnRoute(worldId, routeId);
    let seed = (route.groundSegments || []).find((v) => v.w >= 200 && (v.h >= 120 || v.y < 390) && v.x >= 900) || (route.groundSegments || [])[0];
    let px = seed.x + seed.w * 0.5;
    let decal = null;
    for (let i = 0; i < 3; i++) {
      if (window.__tmbSegmentStart) window.__tmbSegmentStart(px);
      else __TMB_A12__.placePlayer(px, seed.y - 72);
      __tmbCampaignDraw();
      await sleep(80);
      const current = (window.__tmbWolfDecals || [])[0];
      if (!current?.screen) break;
      decal = current;
      px = decal.world.x + decal.world.w * 0.5 + (worldId === "magma" ? 1500 : 650);
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const box = decal?.screen;
    if (!box) return { routeId, worldId, ok: false, reason: "no decal bbox" };
    const inside = box.x >= 0 && box.y >= 0 && box.x + box.w <= innerWidth && box.y + box.h <= innerHeight;
    const isWolfPaint = (r, g, b) => r >= 165 && g >= 170 && b >= 175 && Math.abs(r - g) <= 22 && Math.abs(g - b) <= 26;
    const surround = sample(ctx, { x: box.x - 18, y: box.y - 18, w: box.w + 36, h: box.h + 36 }, (r, g, b) => !isWolfPaint(r, g, b));
    const wolf = sample(ctx, box, (r, g, b, a) => isWolfPaint(r, g, b) && luma(r, g, b) >= surround.avg + 45);
    const oldSkyBoxes = [
      { x: innerWidth * 0.30, y: innerHeight * 0.35, w: innerHeight * 0.24, h: innerHeight * 0.24 },
      { x: innerWidth * 0.54, y: innerHeight * 0.38, w: innerHeight * 0.24, h: innerHeight * 0.24 },
    ].filter((v) => v.y + v.h < box.faceTop);
    const backgroundWolfPixels = oldSkyBoxes.reduce((n, skyBox) => n + countBackgroundPaint(ctx, skyBox, isWolfPaint, window.__tmbWolfDecals || []), 0);
    return {
      routeId,
      worldId,
      ok: inside && wolf.count > 50 && wolf.avg - surround.avg >= 45 && backgroundWolfPixels === 0,
      bbox: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h), faceTop: Math.round(box.faceTop) },
      inside,
      wolfLuma: Number(wolf.avg.toFixed(1)),
      surroundLuma: Number(surround.avg.toFixed(1)),
      lumaDiff: Number((wolf.avg - surround.avg).toFixed(1)),
      backgroundWolfPixels,
      wolfPixels: wolf.count,
    };
  }, { routeId, worldId });
  await page.screenshot({ path: path.join(out, fileName) });
  return metrics;
}

async function newPage(browser, chief = "securityTall", language = "en") {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript((profile) => {
    localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(profile));
  }, profileFor(chief, language));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  await page.waitForSelector(".characterChoice:visible");
  return page;
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const logoMetrics = [];
    {
      const page = await newPage(browser);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, "menu-trust-me-bro-logo-1280x720.png") });
      await page.locator(".characterChoice:visible").first().click();
      logoMetrics.push(await captureLogoEvidence(page, "D01", "dock31", "logo-container-1280x720.png"));
      logoMetrics.push(await captureLogoEvidence(page, "M01", "magma", "m01-logo-block-1280x720.png"));
      await page.evaluate(() => {
        __TMB_A12__.finish();
        __TMB_A12__.openShop();
        __TMB_A12__.setShopTab("characters");
      });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, "shop-characters-thumbs-1280x720.png") });
      await page.evaluate(() => __TMB_A12__.setShopTab("chiefs"));
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, "shop-chiefs-thumbs-1280x720.png") });
      await page.close();
    }
    for (const language of ["tr", "ru"]) {
      const page = await newPage(browser, "securityTall", language);
      await page.locator(".characterChoice:visible").first().click();
      await page.evaluate(() => {
        __TMB_A12__.finish();
        __TMB_A12__.openShop();
        __TMB_A12__.setShopTab("characters");
      });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, `shop-${language}-characters-1280x720.png`) });
      await page.evaluate(() => __TMB_A12__.setShopTab("chiefs"));
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, `shop-${language}-chiefs-1280x720.png`) });
      await page.close();
    }
    for (const chief of ["securityTall", "classicChief", "robotGuard", "bouncer"]) {
      const page = await newPage(browser, chief);
      await page.locator(".characterChoice:visible").first().click();
      await page.evaluate(() => {
        __TMB_A12__.startRoute("D01", true);
        __TMB_A12__.placePlayerAtChiefTime(6);
        __TMB_A12__.forceChiefNear();
        __tmbCampaignDraw();
      });
      await page.screenshot({ path: path.join(out, `d01-${chief}-chase-1280x720.png`) });
      await page.close();
    }
    fs.writeFileSync(path.join(out, "logo-metrics.json"), JSON.stringify(logoMetrics, null, 2));
    if (logoMetrics.some((v) => !v.ok)) {
      throw new Error(`logo evidence failed: ${JSON.stringify(logoMetrics)}`);
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
