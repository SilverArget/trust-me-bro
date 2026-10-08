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
    {
      const page = await newPage(browser);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, "menu-trust-me-bro-logo-1280x720.png") });
      await page.locator(".characterChoice:visible").first().click();
      await page.evaluate(() => {
        __TMB_A12__.startRoute("D01", true);
        const r = __TMB_A12__.routeDefinition("D01");
        const g = r.groundSegments.find((v) => v.w >= 200 && v.h >= 120 && v.x >= 900);
        __TMB_A12__.placePlayer(g.x + g.w * 0.5, g.y - 72);
        __tmbCampaignDraw();
      });
      await page.waitForTimeout(50);
      await page.screenshot({ path: path.join(out, "logo-container-1280x720.png") });
      await page.evaluate(() => {
        __TMB_A12__.renderWorldOnRoute("magma", "M01");
        const r = __TMB_A12__.routeDefinition("M01");
        const g = r.groundSegments.find((v) => v.w >= 200 && v.h >= 120 && v.x >= 900);
        __TMB_A12__.placePlayer(g.x + g.w * 0.5, g.y - 72);
        __tmbCampaignDraw();
      });
      await page.waitForTimeout(50);
      await page.screenshot({ path: path.join(out, "m01-logo-block-1280x720.png") });
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
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error(err);
  server.close();
  process.exit(1);
});
