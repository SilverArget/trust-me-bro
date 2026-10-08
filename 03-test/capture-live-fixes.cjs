const fs = require("fs");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel-live-fixes");
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

const profile = (locked = false) => ({
  schema: 1,
  runnerId: "male",
  walletBalance: locked ? 120 : 5000,
  ownedRunnerIds: locked ? ["male", "female"] : ["male", "female", "tall", "compact", "bruiser", "athlete"],
  ownedOutfitSetIds: ["default", "dockCrew", "nightShift", "hazardRunner", "ronin", "shadowNinja", "orbitAstronaut", "northRaider", "mechaPilot"],
  equippedOutfitByRunner: { male: "default", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
  ownedChiefIds: ["securityTall", "classicChief", "robotGuard", "bouncer"],
  equippedChief: "securityTall",
  ownedWorldIds: ["dock31", "frozen", "magma", "aftermath"],
  selectedWorldId: "dock31",
  settings: { language: "en" },
});

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

async function newPage(browser, options = {}) {
  const page = await browser.newPage({ viewport: options.viewport || { width: 1280, height: 720 } });
  await page.addInitScript((p) => localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(p)), profile(!!options.locked));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  await page.waitForSelector(".characterChoice:visible");
  return page;
}

async function openShop(page, tab) {
  await page.locator(".characterChoice:visible").first().click();
  await page.evaluate((tab) => {
    __TMB_A12__.finish();
    __TMB_A12__.openShop();
    __TMB_A12__.setShopTab(tab);
  }, tab);
  await page.waitForSelector("#a12Shop.show");
}

async function previewMotionMetrics(page, tab) {
  await page.evaluate((tab) => __TMB_A12__.setShopTab(tab), tab);
  const result = { tab };
  const grab = async (motion, delay = 190) => {
    await page.locator(`[data-preview-motion="${motion}"]`).click();
    await page.waitForTimeout(delay);
    const a = await page.locator("#a12Preview canvas").evaluate((c) => c.toDataURL());
    await page.waitForTimeout(delay);
    const b = await page.locator("#a12Preview canvas").evaluate((c) => c.toDataURL());
    return { first: sha(a), second: sha(b), frameChanged: a !== b };
  };
  result.idle = await grab("idle", 170);
  result.run = await grab("run", 170);
  result.flip = await grab("frontFlip", 170);
  result.idleVsRun = result.idle.second !== result.run.first;
  result.runVsFlip = result.run.second !== result.flip.first;
  result.ok = result.idleVsRun && result.run.frameChanged && result.runVsFlip && result.flip.frameChanged;
  return result;
}

async function captureSuspend(page) {
  await page.locator(".characterChoice:visible").first().click();
  await page.evaluate(() => {
    __TMB_A12__.startRoute("D01", true);
    __tmbSegmentStart(720);
    __TMB_A12__.setSuspendGapFilter(false);
    __tmbCampaignDraw();
  });
  await page.screenshot({ path: path.join(out, "d01-suspend-before-1280x720.png") });
  await page.evaluate(() => {
    __TMB_A12__.setSuspendGapFilter(true);
    __tmbCampaignDraw();
  });
  await page.screenshot({ path: path.join(out, "d01-suspend-after-1280x720.png") });
  return await page.evaluate(() => __TMB_A12__.auditSuspendCounts());
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const metrics = { preview: [], suspendCounts: null };
    {
      const page = await newPage(browser);
      await openShop(page, "outfits");
      metrics.preview.push(await previewMotionMetrics(page, "outfits"));
      metrics.preview.push(await previewMotionMetrics(page, "characters"));
      metrics.preview.push(await previewMotionMetrics(page, "chiefs"));
      await page.screenshot({ path: path.join(out, "shop-preview-motion-1280x720.png") });
      await page.close();
    }
    {
      const page = await newPage(browser);
      metrics.suspendCounts = await captureSuspend(page);
      await page.close();
    }
    {
      const page = await newPage(browser, { locked: true, viewport: { width: 1280, height: 720 } });
      await page.screenshot({ path: path.join(out, "character-select-locked-1280x720.png") });
      const lockedClick = await page.locator('.characterChoice[data-character="tall"]').click().then(async () => page.evaluate(() => ({
        selectOpen: document.getElementById("characterSelect")?.classList.contains("show"),
        shopOpen: document.getElementById("a12Shop")?.classList.contains("show"),
        runnerId: __TMB_A12__.getState().profile.runnerId,
        shop: __TMB_A12__.getState().shop,
      })));
      metrics.lockedClick = lockedClick;
      await page.close();
    }
    {
      const page = await newPage(browser, { locked: true, viewport: { width: 390, height: 844 } });
      await page.screenshot({ path: path.join(out, "character-select-locked-390x844.png") });
      await page.close();
    }
    fs.writeFileSync(path.join(out, "live-fix-metrics.json"), JSON.stringify(metrics, null, 2));
    const badPreview = metrics.preview.filter((v) => !v.ok);
    if (badPreview.length) throw new Error(`preview motion failed ${JSON.stringify(badPreview)}`);
    if (!metrics.lockedClick.shopOpen || metrics.lockedClick.runnerId !== "male" || metrics.lockedClick.shop.tab !== "characters") {
      throw new Error(`locked click failed ${JSON.stringify(metrics.lockedClick)}`);
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
