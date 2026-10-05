const { test, expect, devices } = require("playwright/test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let server, base;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, rel);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    fs.readFile(file, (error, body) => {
      if (error) return res.writeHead(404).end();
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

async function installBridge(page, adDurationMs = 120) {
  await page.addInitScript(adDurationMs => {
    const listeners = new Map();
    const on = (name, fn) => {
      const values = listeners.get(name) || [];
      values.push(fn);
      listeners.set(name, values);
    };
    const emit = (name, value) => (listeners.get(name) || []).slice().forEach(fn => fn(value));
    const events = { PAUSE_STATE_CHANGED: "pause", AUDIO_STATE_CHANGED: "audio", INTERSTITIAL_STATE_CHANGED: "interstitial", REWARDED_STATE_CHANGED: "rewarded" };
    window.__nextButtonAds = [];
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
          window.__nextButtonAds.push({ kind: "interstitial", placement, at: performance.now() });
          emit(events.INTERSTITIAL_STATE_CHANGED, "opened");
          setTimeout(() => emit(events.INTERSTITIAL_STATE_CHANGED, "closed"), adDurationMs);
        },
      },
    };
  }, adDurationMs);
}

async function waitForCampaign(page) {
  await page.goto(base);
  await page.waitForFunction(() => window.__TMB_A12__ && document.body.dataset.gameMode === "campaign");
}

async function tapNext(page, label, maxMs = 1000) {
  await page.evaluate(() => window.__TMB_A12__.finish());
  const before = await page.evaluate(() => window.__TMB_A12__.getState().routeId);
  const hit = await page.evaluate(() => {
    const button = document.querySelector('#a12Actions [data-act="next"]');
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const el = document.elementFromPoint(x, y);
    return {
      x,
      y,
      tag: el?.tagName || null,
      id: el?.id || null,
      act: el?.dataset?.act || null,
      text: el?.textContent || null,
      hidden: button.hidden,
      disabled: button.disabled,
    };
  });
  const t0 = Date.now();
  await page.touchscreen.tap(hit.x, hit.y);
  await page.waitForFunction(route => window.__TMB_A12__.getState().result === null && window.__TMB_A12__.getState().routeId !== route, before, { timeout: maxMs });
  const after = await page.evaluate(() => window.__TMB_A12__.getState().routeId);
  const elapsed = Date.now() - t0;
  console.log(`NEXT_TOUCH ${JSON.stringify({ label, before, after, elapsed, hit })}`);
  return { before, after, elapsed, hit };
}

async function runFlow(browser, deviceName) {
  const context = await browser.newContext({ ...devices[deviceName] });
  const page = await context.newPage();
  await installBridge(page);
  await waitForCampaign(page);

  await page.evaluate(() => window.__TMB_A12__.startRoute("D01"));
  const dock = [];
  for (let i = 0; i < 5; i++) dock.push(await tapNext(page, `${deviceName}:dock-${i + 1}`));
  expect(dock.map(value => value.after)).toEqual(["D02", "D03", "D04", "D05", "D06"]);

  await page.evaluate(() => window.__TMB_A12__.renderWorldOnRoute("magma", "M01"));
  const magma = await tapNext(page, `${deviceName}:magma`);
  expect(magma.after).toBe("M02");

  await page.evaluate(() => window.__TMB_A12__.renderWorldOnRoute("frozen", "F01"));
  const frozen = await tapNext(page, `${deviceName}:frozen`);
  expect(frozen.after).toBe("F02");

  const ads = await page.evaluate(() => window.__nextButtonAds);
  console.log(`NEXT_TOUCH_ADS ${deviceName} ${JSON.stringify(ads)}`);
  expect(ads.length).toBeGreaterThanOrEqual(3);
  await context.close();
}

test("NEXT works with real touch on Android Chrome landscape", async ({ browser }) => {
  await runFlow(browser, "Pixel 7 landscape");
});

test("NEXT works with real touch on iPhone WebKit landscape", async ({ browser }) => {
  await runFlow(browser, "iPhone 14 landscape");
});
