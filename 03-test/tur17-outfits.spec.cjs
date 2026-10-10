const { test, expect } = require("playwright/test");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const evidence = path.join(__dirname, "manager-preview", "tur17");
let server;
let origin;

test.beforeAll(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  server = http.createServer((request, response) => {
    const rel = decodeURIComponent(new URL(request.url, "http://local").pathname).replace(/^\/+/, "") || "index.html";
    const target = path.resolve(root, rel);
    if (!target.startsWith(root + path.sep) && target !== path.join(root, "index.html")) {
      response.statusCode = 403;
      return response.end("forbidden");
    }
    fs.readFile(target, (error, body) => {
      if (error) {
        response.statusCode = 404;
        return response.end("missing");
      }
      response.setHeader("Content-Type", rel.endsWith(".js") ? "text/javascript; charset=utf-8" : rel.endsWith(".json") ? "application/json" : rel.endsWith(".png") ? "image/png" : "text/html; charset=utf-8");
      response.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}/`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function ready(page, suffix = "#debug") {
  await page.goto(origin + suffix);
  await page.waitForFunction(() => window.__TMB_A12__, null, { timeout: 30000 });
}

test("test mode exposes 6 runners x 9 appearances", async ({ page }) => {
  await ready(page, "?test=hepsi#debug");
  await page.locator('.characterChoice[data-runner-id="male"]').click();
  await page.evaluate(() => __TMB_A12__.openShop("outfits"));
  const runners = ["male", "female", "tall", "compact", "bruiser", "athlete"];
  const outfits = ["default", "dockCrew", "nightShift", "hazardRunner", "ronin", "shadowNinja", "orbitAstronaut", "northRaider", "mechaPilot"];
  for (const runner of runners) {
    await page.locator(`[data-preview-runner="${runner}"]`).click();
    for (const outfit of outfits) {
      const button = page.locator(`[data-list="outfits"] [data-item="${outfit}"] [data-action]`);
      await expect(button).toHaveText(/^(SEÇ|SEÇİLİ|SELECT|SELECTED)$/);
      if (await button.isEnabled()) await button.click();
      await expect.poll(() => page.evaluate(id => __TMB_A12__.getState().profile.equippedOutfitByRunner[id], runner)).toBe(outfit);
    }
  }
  await page.screenshot({ path: path.join(evidence, "test-mode-6x9.png") });
});

test("bruiser outfit is bought, worn and rendered during real keyboard play", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__tur17Draws = [];
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image?.src?.includes("/sprites/a5/")) window.__tur17Draws.push(image.src);
      return original.call(this, image, ...args);
    };
  });
  await ready(page);
  await page.locator('.characterChoice[data-runner-id="male"]').click();
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(2500);
    __TMB_A12__.openShop("characters");
  });
  await page.locator('[data-list="characters"] [data-item="bruiser"] [data-action]').click();
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().profile.runnerId)).toBe("bruiser");
  await page.locator('[data-tab="outfits"]').click();
  await page.locator('[data-list="outfits"] [data-item="shadowNinja"] [data-action]').click();
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().profile.equippedOutfitByRunner.bruiser)).toBe("shadowNinja");
  const purchased = await page.evaluate(() => __TMB_A12__.getState().profile);
  expect(purchased.walletBalance).toBe(1350);
  expect(purchased.ownedOutfitSetIds).toContain("shadowNinja");
  await page.locator("#a12Shop [data-close]").click();
  await page.evaluate(() => __TMB_A12__.startRoute("D01", true));
  const startX = await page.evaluate(() => __TMB_A12__.getState().player.x);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(2200);
  await page.keyboard.up("ArrowRight");
  const finish = await page.evaluate(() => ({ state: __TMB_A12__.getState(), draws: __tur17Draws }));
  expect(finish.state.player.x).toBeGreaterThan(startX + 50);
  expect(finish.draws.some(src => /bruiser-shadowNinja-full\.png\?v=[a-f0-9]{16}$/.test(src))).toBe(true);
  await page.screenshot({ path: path.join(evidence, "bruiser-shadowNinja-d01-keyboard.png") });
});
