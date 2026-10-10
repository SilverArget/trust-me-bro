const { test, expect } = require("playwright/test");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const evidence = path.join(root, "03-test", "manager-preview", "tur20-giris");
let server;
let origin;

const mime = file => file.endsWith(".html") ? "text/html; charset=utf-8"
  : file.endsWith(".js") ? "text/javascript; charset=utf-8"
  : file.endsWith(".png") ? "image/png"
  : file.endsWith(".mp3") ? "audio/mpeg"
  : "application/octet-stream";

test.beforeAll(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://local").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (error, body) => {
      if (error) return res.writeHead(404).end("missing");
      res.writeHead(200, { "content-type": mime(file) });
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function cleanOpen(page, viewport, screenshot) {
  await page.setViewportSize(viewport);
  await page.goto(`${origin}/index.html#debug`);
  await page.waitForFunction(() => window.__TMB_A12__ && document.body.dataset.campaignPhase === "running");
  await page.waitForFunction(() => !document.getElementById("introOverlay"));
  await expect(page.locator("#characterSelect")).not.toHaveClass(/show/);
  await expect(page.locator("#bootOverlay")).toHaveClass(/hidden/);
  await page.screenshot({ path: path.join(evidence, screenshot) });
}

test("clean desktop opens playable D01 with male runner at zero clicks", async ({ page }) => {
  await cleanOpen(page, { width: 832, height: 424 }, "desktop-832x424-d01-zero-click.png");
  const opening = await page.evaluate(() => ({
    routeId: __TMB_A12__.getState().routeId,
    runnerId: __TMB_A12__.profile().runnerId,
    panelOpen: __tmb.characterSelectOpen,
    x: __tmb.player.x,
  }));
  expect(opening).toMatchObject({ routeId: "D01", runnerId: "male", panelOpen: false });
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(x => __tmb.player.x > x + 1, opening.x);
  await page.keyboard.up("ArrowRight");
  await expect.poll(() => page.evaluate(() => ({ unlocked:__tmbAudio.state().unlocked, context:__tmbAudio.state().context }))).toEqual({ unlocked:true, context:"running" });
});

test("ID panel changes runner and language without resetting route position", async ({ page }) => {
  await cleanOpen(page, { width: 832, height: 424 }, "desktop-832x424-before-id.png");
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => __tmb.player.x > 100);
  await page.keyboard.up("ArrowRight");
  const before = await page.evaluate(() => ({ routeId: __TMB_A12__.getState().routeId, x: __tmb.player.x }));
  await page.locator("#characterChange").click();
  await expect(page.locator("#characterSelect")).toHaveClass(/show/);
  await expect(page.locator("#a12Language option")).toHaveText(["English", "Türkçe", "Русский"]);
  await page.screenshot({ path: path.join(evidence, "desktop-832x424-id-panel.png") });
  await page.locator('.characterChoice[data-runner-id="female"]').click();
  await expect(page.locator("#characterSelect")).not.toHaveClass(/show/);
  const after = await page.evaluate(() => ({
    routeId: __TMB_A12__.getState().routeId,
    runnerId: __TMB_A12__.profile().runnerId,
    x: __tmb.player.x,
    panelOpen: __tmb.characterSelectOpen,
  }));
  expect(after.routeId).toBe(before.routeId);
  expect(after.runnerId).toBe("female");
  expect(after.panelOpen).toBe(false);
  expect(after.x).toBeGreaterThan(100);
  expect(Math.abs(after.x - before.x)).toBeLessThan(20);
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(x => __tmb.player.x > x + 1, after.x);
  await page.keyboard.up("ArrowRight");
  await page.screenshot({ path: path.join(evidence, "desktop-832x424-female-same-position.png") });
});

for (const [name, viewport] of [["portrait-390x844", { width:390, height:844 }], ["landscape-915x412", { width:915, height:412 }]]) {
  test(`${name} opens at zero clicks and first touch moves`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, hasTouch:true, isMobile:true });
    const page = await context.newPage();
    await cleanOpen(page, viewport, `${name}-d01-zero-click.png`);
    const before = await page.evaluate(() => ({ y:__tmb.player.y, vy:__tmb.player.vy }));
    const jump = page.locator('#jumpWrap button');
    await jump.dispatchEvent('pointerdown', { pointerType:'touch', pointerId:41, isPrimary:true, button:0 });
    await page.waitForFunction(before => __tmb.player.y < before.y || __tmb.player.vy < before.vy, before);
    await jump.dispatchEvent('pointerup', { pointerType:'touch', pointerId:41, isPrimary:true, button:0 });
    await context.close();
  });
}

test("platform language remains the clean-profile default", async ({ browser }) => {
  const context = await browser.newContext({ locale:"tr-TR", viewport:{ width:832, height:424 } });
  const page = await context.newPage();
  await cleanOpen(page, { width:832, height:424 }, "desktop-832x424-tr-default.png");
  expect(await page.evaluate(() => __TMB_A12__.profile().settings.language)).toBe("tr");
  await page.locator("#characterChange").click();
  await expect(page.locator("#a12Language")).toHaveValue("tr");
  await context.close();
});
