const { test, expect } = require("playwright/test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const profileKey = "trust_me_bro_campaign_profile_v1";
const ghostKey = "trust_me_bro_personal_ghost_v1";
const ghostSettingKey = "trust_me_bro_personal_ghost_enabled_v1";
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

async function installBridge(page, { initial = {}, delayMs = 0, interstitial = false, rewarded = false, adDurationMs = 0 } = {}) {
  await page.addInitScript(({ initial, delayMs, interstitial, rewarded, adDurationMs }) => {
    if (!window.name) window.name = JSON.stringify(initial);
    const readStore = () => JSON.parse(window.name || "{}");
    const writeStore = value => { window.name = JSON.stringify(value); };
    window.__campaignStorageCalls = [];
    window.__campaignAdCalls = [];
    const listeners = new Map();
    const on = (name, fn) => { const values = listeners.get(name) || []; values.push(fn); listeners.set(name, values); };
    const off = (name, fn) => listeners.set(name, (listeners.get(name) || []).filter(value => value !== fn));
    const emit = (name, value) => (listeners.get(name) || []).slice().forEach(fn => fn(value));
    const events = { PAUSE_STATE_CHANGED: "pause", AUDIO_STATE_CHANGED: "audio", INTERSTITIAL_STATE_CHANGED: "interstitial", REWARDED_STATE_CHANGED: "rewarded" };
    window.bridge = {
      EVENT_NAME: events,
      async initialize() {},
      storage: {
        async get(keys) {
          window.__campaignStorageCalls.push({ op: "get", keys: [...keys] });
          if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
          const store = readStore();
          return keys.map(key => store[key] ?? null);
        },
        async set(keys, values) {
          window.__campaignStorageCalls.push({ op: "set", keys: [...keys] });
          const store = readStore();
          keys.forEach((key, index) => { store[key] = values[index]; });
          writeStore(store);
        },
        async delete(keys) {
          window.__campaignStorageCalls.push({ op: "delete", keys: [...keys] });
          const store = readStore();
          keys.forEach(key => delete store[key]);
          writeStore(store);
        },
      },
      platform: { language: "en", isAudioEnabled: true, on() {}, sendMessage() {} },
      advertisement: {
        isInterstitialSupported: interstitial,
        isRewardedSupported: rewarded,
        on,
        off,
        showInterstitial(placement) {
          window.__campaignAdCalls.push({ kind: "interstitial", placement });
          emit(events.INTERSTITIAL_STATE_CHANGED, "opened");
          setTimeout(() => emit(events.INTERSTITIAL_STATE_CHANGED, "closed"), adDurationMs);
        },
        showRewarded(placement) {
          window.__campaignAdCalls.push({ kind: "rewarded", placement });
          emit(events.REWARDED_STATE_CHANGED, "opened");
          setTimeout(() => { emit(events.REWARDED_STATE_CHANGED, "rewarded"); emit(events.REWARDED_STATE_CHANGED, "closed"); }, adDurationMs);
        },
      },
    };
  }, { initial, delayMs, interstitial, rewarded, adDurationMs });
}

async function finishAndClick(page, action) {
  await page.evaluate(() => window.__TMB_A12__.finish());
  await page.evaluate(action => document.querySelector(`#a12Actions [data-act="${action}"]`).click(), action);
  await page.waitForFunction(() => window.__TMB_A12__.getState().result === null);
}

async function waitForCampaign(page) {
  await page.goto(base);
  await page.waitForFunction(() => window.__TMB_A12__ && document.body.dataset.gameMode === "campaign");
}

test("A2a campaign storage roundtrip uses Bridge only", async ({ page }) => {
  await installBridge(page);
  await waitForCampaign(page);
  await page.evaluate(() => window.__TMB_A12__.setWallet(321));
  await page.reload();
  await page.waitForFunction(() => window.__TMB_A12__?.profile().walletBalance === 321);
  const raw = await page.evaluate(({ profileKey, ghostKey, ghostSettingKey }) => ({
    storedKeys: Object.keys(JSON.parse(window.name || "{}")).sort(),
    wallet: window.__TMB_A12__.profile().walletBalance,
    localValues: [profileKey, ghostKey, ghostSettingKey].map(key => localStorage.getItem(key)),
  }), { profileKey, ghostKey, ghostSettingKey });
  console.log(`A2A_RAW ${JSON.stringify(raw)}`);
  expect(raw.wallet).toBe(321);
  expect(raw.storedKeys).toContain(profileKey);
  expect(raw.localValues).toEqual([null, null, null]);
});

for (const delayMs of [800, 0]) {
  test(`A2b load-before-persist delay ${delayMs}ms`, async ({ page }) => {
    await installBridge(page, { initial: { [profileKey]: JSON.stringify({ walletBalance: 777 }) }, delayMs });
    await waitForCampaign(page);
    const raw = await page.evaluate(({ profileKey, delayMs }) => {
      const store = JSON.parse(window.name || "{}");
      return {
        delayMs,
        storedWallet: JSON.parse(store[profileKey]).walletBalance,
        loadedWallet: window.__TMB_A12__.profile().walletBalance,
        calls: window.__campaignStorageCalls,
      };
    }, { profileKey, delayMs });
    console.log(`A2B_RAW ${JSON.stringify(raw)}`);
    expect(raw.storedWallet).toBe(777);
    expect(raw.loadedWallet).toBe(777);
  });
}

test("A2c campaign interstitial gate is every two completed routes and next-only", async ({ page }) => {
  await installBridge(page, { interstitial: true });
  await waitForCampaign(page);
  await finishAndClick(page, "next");
  const afterFirst = await page.evaluate(() => [...window.__campaignAdCalls]);
  await finishAndClick(page, "retry");
  const afterRetry = await page.evaluate(() => [...window.__campaignAdCalls]);
  await page.evaluate(() => window.__TMB_A12__.finish());
  await page.evaluate(() => document.querySelector('#a12Actions [data-act="next"]').click());
  await page.waitForFunction(() => window.__TMB_A12__.getState().result === null);
  const raw = await page.evaluate(() => ({ afterFirst: window.__a2cFirst, calls: [...window.__campaignAdCalls], routeId: window.__TMB_A12__.getState().routeId }));
  raw.afterFirst = afterFirst;
  raw.afterRetry = afterRetry;
  console.log(`A2C_RAW ${JSON.stringify(raw)}`);
  expect(afterFirst).toEqual([]);
  expect(afterRetry).toEqual([]);
  expect(raw.calls).toEqual([{ kind: "interstitial", placement: "route_completed" }]);
});

async function samplePause(page, elapsedMs) {
  await page.waitForTimeout(elapsedMs);
  return page.evaluate(() => ({
    at: performance.now(),
    gameClock: window.__TMB_A12__.getState().gameClock,
    lifecycle: window.__tmbLifecycle.state(),
    audio: window.__tmbAudio.state(),
  }));
}

test("A2d interstitial pauses campaign clock and both audio buses until closed", async ({ page }) => {
  await installBridge(page, { interstitial: true, adDurationMs: 3000 });
  await waitForCampaign(page);
  await page.evaluate(() => window.__tmbAudio.unlock());
  await page.waitForTimeout(1000);
  await finishAndClick(page, "next");
  await finishAndClick(page, "retry");
  await page.evaluate(() => window.__TMB_A12__.finish());
  const pending = page.evaluate(() => document.querySelector('#a12Actions [data-act="next"]').click());
  const samples = [await samplePause(page, 500), await samplePause(page, 1000), await samplePause(page, 1000)];
  await pending;
  await page.waitForFunction(() => window.__TMB_A12__.getState().result === null);
  const resumedStart = await page.evaluate(() => window.__TMB_A12__.getState().gameClock);
  await page.waitForTimeout(500);
  const resumedEnd = await page.evaluate(() => window.__TMB_A12__.getState().gameClock);
  const raw = { samples, resumedStart, resumedEnd, calls: await page.evaluate(() => [...window.__campaignAdCalls]) };
  console.log(`A2D_INTERSTITIAL_RAW ${JSON.stringify(raw)}`);
  expect(new Set(samples.map(value => value.gameClock)).size).toBe(1);
  for (const sample of samples) {
    expect(sample.lifecycle.systemPaused).toBe(true);
    expect(sample.lifecycle.loopRunning).toBe(false);
    expect(sample.audio.paused).toBe(true);
    expect(sample.audio.platform).toBe(false);
    expect(sample.audio.musicBusGain).toBe(0);
    expect(sample.audio.sfxBusGain).toBe(0);
  }
  expect(resumedEnd).toBeGreaterThan(resumedStart);
});

test("A2d rewarded pauses audio and RAF clock; no-ad control advances", async ({ page }) => {
  await installBridge(page, { rewarded: true, adDurationMs: 3000 });
  await waitForCampaign(page);
  await page.evaluate(() => window.__TMB_A12__.startRoute("D01"));
  await page.evaluate(() => window.__tmbAudio.unlock());
  await page.waitForTimeout(1000);
  const controlStart = await page.evaluate(() => window.__TMB_A12__.getState().gameClock);
  await page.waitForTimeout(500);
  const controlEnd = await page.evaluate(() => window.__TMB_A12__.getState().gameClock);
  await page.evaluate(() => window.__TMB_A12__.finish());
  const pending = page.evaluate(() => window.__TMB_A12__.claimRewardedResult());
  const samples = [await samplePause(page, 500), await samplePause(page, 1000), await samplePause(page, 1000)];
  const granted = await pending;
  const resultClock = await page.evaluate(() => window.__TMB_A12__.getState().gameClock);
  await page.evaluate(() => document.querySelector('#a12Actions [data-act="next"]').click());
  await page.waitForFunction(() => window.__TMB_A12__.getState().result === null);
  const afterNextStart = await page.evaluate(() => window.__TMB_A12__.getState().gameClock);
  await page.waitForTimeout(500);
  const afterNextClock = await page.evaluate(() => window.__TMB_A12__.getState().gameClock);
  const raw = { controlStart, controlEnd, samples, granted, resultClock, afterNextStart, afterNextClock, calls: await page.evaluate(() => [...window.__campaignAdCalls]) };
  console.log(`A2D_REWARDED_RAW ${JSON.stringify(raw)}`);
  expect(controlEnd).toBeGreaterThan(controlStart);
  expect(new Set(samples.map(value => value.gameClock)).size).toBe(1);
  for (const sample of samples) {
    expect(sample.lifecycle.systemPaused).toBe(true);
    expect(sample.lifecycle.loopRunning).toBe(false);
    expect(sample.audio.paused).toBe(true);
    expect(sample.audio.platform).toBe(false);
    expect(sample.audio.musicBusGain).toBe(0);
    expect(sample.audio.sfxBusGain).toBe(0);
  }
  expect(granted).toBe(true);
  expect(afterNextClock).toBeGreaterThan(afterNextStart);
});
