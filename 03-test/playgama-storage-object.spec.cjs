const { test, expect } = require("playwright/test");
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
      res.setHeader("Content-Type", file.endsWith(".html") ? "text/html" : "application/octet-stream");
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

const collected = Array.from({ length: 31 }, (_, i) => i === 3 ? 21 : i === 8 ? 34 : 0);
const envelope = {
  v36: {
    v: 36, partCount: 6, currentLevel: 9, currentPart: 4, deaths: 7,
    jumpLevel: 1, speedLevel: 0, totalTime: 123.5, won: false,
    collected, character: 2, bgmMuted: true,
  },
  legacyV35: "",
};

for (const mode of ["object", "string"]) {
  test(`Playgama storage.get ${mode} save restores progress`, async ({ page }) => {
    await page.addInitScript(({ envelope, mode }) => {
      const value = mode === "object" ? envelope : JSON.stringify(envelope);
      window.bridge = {
        EVENT_NAME: { PAUSE_STATE_CHANGED: "pause", AUDIO_STATE_CHANGED: "audio" },
        async initialize() {},
        storage: { async get() { return [value]; }, async set() {} },
        platform: { language: "en", isAudioEnabled: true, on() {}, sendMessage() {} },
        advertisement: { isInterstitialSupported: false, isRewardedSupported: false, on() {} },
      };
    }, { envelope, mode });
    await page.goto(base);
    await page.waitForFunction(() => window.__tmb?.platform.initialized);
    const state = await page.evaluate(() => ({
      characterChosen: __tmb.characterChosen,
      characterSelectOpen: __tmb.characterSelectOpen,
      currentLevel: __tmb.currentLevel,
      currentPart: __tmb.currentPart,
      collected: [...__tmb.collected],
    }));
    console.log(`PLAYGAMA_${mode.toUpperCase()} ${JSON.stringify(state)}`);
    expect(state).toEqual({
      characterChosen: true,
      characterSelectOpen: false,
      currentLevel: envelope.v36.currentLevel,
      currentPart: envelope.v36.currentPart,
      collected,
    });
  });
}
