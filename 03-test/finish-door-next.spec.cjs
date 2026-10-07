const { test, expect, devices, webkit } = require("playwright/test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const previewDir = path.join(root, "03-test", "manager-preview", "finis-kapi");
let server, base;

test.beforeAll(async () => {
  fs.mkdirSync(previewDir, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, rel);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    fs.readFile(file, (error, body) => {
      if (error) return res.writeHead(404).end("missing");
      res.setHeader("Content-Type", file.endsWith(".html") ? "text/html" : file.endsWith(".js") ? "text/javascript" : "application/octet-stream");
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug&bridgeAds`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

async function installBridge(page, adDurationMs = 180) {
  await page.addInitScript(adDurationMs => {
    const listeners = new Map();
    const on = (name, fn) => listeners.set(name, [...(listeners.get(name) || []), fn]);
    const emit = (name, value) => (listeners.get(name) || []).slice().forEach(fn => fn(value));
    const events = { PAUSE_STATE_CHANGED: "pause", AUDIO_STATE_CHANGED: "audio", INTERSTITIAL_STATE_CHANGED: "interstitial", REWARDED_STATE_CHANGED: "rewarded" };
    window.__finishDoorNextAds = [];
    window.bridge = {
      EVENT_NAME: events,
      async initialize() {},
      storage: { async get(keys) { return keys.map(() => null); }, async set() {}, async delete() {} },
      platform: { language: "tr", isAudioEnabled: true, on() {}, sendMessage() {} },
      advertisement: {
        isInterstitialSupported: true,
        isRewardedSupported: false,
        on,
        off(name, fn) { listeners.set(name, (listeners.get(name) || []).filter(value => value !== fn)); },
        showInterstitial(placement) {
          window.__finishDoorNextAds.push({ placement, at: performance.now() });
          emit(events.INTERSTITIAL_STATE_CHANGED, "opened");
          setTimeout(() => emit(events.INTERSTITIAL_STATE_CHANGED, "closed"), adDurationMs);
        },
      },
    };
  }, adDurationMs);
}

async function boot(page, routeId = "D01") {
  await installBridge(page);
  await page.goto(base);
  await page.waitForFunction(() => window.__TMB_A12__ && document.body.dataset.gameMode === "campaign");
  await page.locator(".characterChoice:visible").nth(1).click();
  await page.evaluate(id => {
    __tmbParkour.manual();
    const world = id[0] === "F" ? "frozen" : id[0] === "M" ? "magma" : id[0] === "A" ? "aftermath" : "dock31";
    __TMB_A12__.renderWorldOnRoute(world, id);
    __TMB_A12__.startRoute(id);
  }, routeId);
}

async function placeNearFinish(page, routeId, dx) {
  await page.evaluate(({ routeId, dx }) => {
    const r = __TMB_A12__.routeDefinition(routeId);
    const x = r.finishX + dx;
    const surfaces = (r.groundSegments || []).filter(s => s.kind === "ground" && x >= s.x && x <= s.x + s.w);
    const y = (surfaces.length ? Math.min(...surfaces.map(s => s.y)) : 455) - 48;
    __TMB_A12__.placePlayer(x, y);
    __tmbCampaignDraw();
  }, { routeId, dx });
}

async function step(page, seconds) {
  const n = Math.ceil(seconds / (1 / 60));
  await page.evaluate(n => { for (let i = 0; i < n; i++) __tmbCampaignStep(1 / 60); __tmbCampaignDraw(); }, n);
}

async function shotDoorSequence(page, routeId, prefix) {
  await placeNearFinish(page, routeId, -150);
  await step(page, .85);
  await page.screenshot({ path: path.join(previewDir, `${prefix}-kapi-acik.png`) });
  if (prefix === "desktop") await page.screenshot({ path: path.join(previewDir, "kapi-acik.png") });

  await placeNearFinish(page, routeId, 2);
  await step(page, .22);
  await page.screenshot({ path: path.join(previewDir, `${prefix}-kapi-giris.png`) });

  await step(page, .34);
  const closed = await page.evaluate(() => __TMB_A12__.getState());
  expect(closed.finishGate.phase).toBe("closed");
  expect(closed.result).toBeNull();
  expect(closed.finishAdvance).toBeNull();
  await page.screenshot({ path: path.join(previewDir, `${prefix}-kapi-kapandi.png`) });
  if (prefix === "desktop") await page.screenshot({ path: path.join(previewDir, "kapi-kapandi.png") });
}

async function nextHit(page) {
  return page.evaluate(() => {
    const button = document.querySelector('#a12Actions [data-act="next"]');
    const r = button.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: button.textContent, hidden: button.hidden };
  });
}

test("finish door closes, shows transition banner, then auto-starts next route", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 720 });
  await boot(page, "D01");
  await shotDoorSequence(page, "D01", "desktop");
  await step(page, .35);
  let s = await page.evaluate(() => __TMB_A12__.getState());
  expect(s.result).not.toBeNull();
  expect(s.finishAdvance).toMatchObject({ routeId: "D01", nextId: "D02" });
  expect(await page.locator('#a12Actions [data-act="next"]').isVisible()).toBeFalsy();
  await page.screenshot({ path: path.join(previewDir, "desktop-tamamlandi-banner.png") });
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().route.id), { timeout: 2500 }).toBe("D02");

  await placeNearFinish(page, "D02", 2);
  await step(page, .9);
  s = await page.evaluate(() => __TMB_A12__.getState());
  expect(s.finishAdvance).toMatchObject({ routeId: "D02", nextId: "D03" });
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().route.id), { timeout: 3500 }).toBe("D03");
  expect(await page.evaluate(() => window.__finishDoorNextAds.length)).toBe(1);

  await page.evaluate(() => __TMB_A12__.renderWorldOnRoute("magma", "M01"));
  await placeNearFinish(page, "M01", -150);
  await step(page, .85);
  await page.screenshot({ path: path.join(previewDir, "magma-kapi-acik.png") });
  s = await page.evaluate(() => __TMB_A12__.getState());
  expect(s.route.id).toBe("M01");
});

test("finish door preview frames are clear on iPhone landscape", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["iPhone 14 landscape"] });
  const page = await context.newPage();
  await boot(page, "D01");
  await shotDoorSequence(page, "D01", "iphone-landscape");
  await context.close();
});

test("NEXT works by click, touch, and fast double tap without skipping", async ({ browser }) => {
  const chromium = await browser.newContext({ ...devices["Pixel 7 landscape"] });
  const page = await chromium.newPage();
  await boot(page, "D01");
  await page.evaluate(() => __TMB_A12__.finish());
  await page.screenshot({ path: path.join(previewDir, "sonraki-click-once.png") });
  await page.locator('#a12Actions [data-act="next"]').click();
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().route.id)).toBe("D02");
  await page.screenshot({ path: path.join(previewDir, "sonraki-click-after.png") });

  await page.evaluate(() => { __TMB_A12__.finish(); });
  const hit = await nextHit(page);
  await page.touchscreen.tap(hit.x, hit.y);
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().route.id)).toBe("D03");

  await page.evaluate(() => { __TMB_A12__.finish(); });
  await page.locator('#a12Actions [data-act="next"]').click();
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().route.id)).toBe("D04");
  await page.evaluate(() => { __TMB_A12__.finish(); });
  const hit2 = await nextHit(page);
  await Promise.all([page.touchscreen.tap(hit2.x, hit2.y), page.touchscreen.tap(hit2.x, hit2.y)]);
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().route.id)).toBe("D05");
  await page.waitForTimeout(260);
  expect(await page.evaluate(() => __TMB_A12__.getState().route.id)).toBe("D05");
  await chromium.close();

  const safari = await webkit.launch();
  const safariContext = await safari.newContext({ ...devices["iPhone 14 landscape"] });
  const safariPage = await safariContext.newPage();
  await boot(safariPage, "F01");
  await safariPage.evaluate(() => __TMB_A12__.finish());
  const safariHit = await nextHit(safariPage);
  await safariPage.touchscreen.tap(safariHit.x, safariHit.y);
  await expect.poll(() => safariPage.evaluate(() => __TMB_A12__.getState().route.id)).toBe("F02");
  await safariContext.close();
  await safari.close();
});
