const { test, expect } = require("playwright/test");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..");
const profileKey = "trust_me_bro_campaign_profile_v1";
const view = process.env.TUR14_VIEW || "desktop";
const evidenceRoot = path.join(__dirname, "manager-preview", "tur14", view);
const testProfileRaw = ` {"schemaVersion":1,"profileRevision":7,"walletBalance":321,"runnerId":null,"ownedRunnerIds":["male","female"],"equippedOutfitByRunner":{"male":"default","female":"default","tall":"default","compact":"default","bruiser":"default","athlete":"default"},"ownedOutfitSetIds":["default"],"ownedChiefIds":["securityTall"],"equippedChief":"securityTall","ownedWorldIds":["dock31"],"selectedWorldId":"dock31","progressByRoute":{},"pendingRunsByRoute":{},"bestRunsByRouteVersion":{},"settings":{"language":"tr"},"migrationFlags":{"v36":true},"legacyProgress":null,"bankedRunIds":[],"rewardedRunIds":[],"sentinel":"byte-exact"} `;

let server;
let port;

test.beforeAll(async () => {
  server = http.createServer((request, response) => {
    const rel = decodeURIComponent(new URL(request.url, "http://local").pathname).replace(/^\/+/, "") || "index.html";
    const target = path.resolve(root, rel);
    if (!target.startsWith(path.resolve(root) + path.sep) && target !== path.join(root, "index.html")) {
      response.statusCode = 403;
      return response.end("forbidden");
    }
    fs.readFile(target, (error, body) => {
      if (error) {
        response.statusCode = 404;
        return response.end("missing");
      }
      response.setHeader("Content-Type", rel.endsWith(".js") ? "text/javascript; charset=utf-8" : rel.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream");
      response.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, resolve));
  port = server.address().port;
  fs.mkdirSync(evidenceRoot, { recursive: true });
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

const origin = host => `http://${host}:${port}/`;
const useTouch = () => view === "android";
async function activate(locator) {
  if (useTouch()) await locator.tap();
  else await locator.click();
}
async function waitForGame(page) {
  await page.waitForFunction(() => window.__TMB_A12__, null, { timeout: 30000 });
}
async function selectItem(page, list, id) {
  const button = page.locator(`[data-list="${list}"] [data-item="${id}"] [data-action]`);
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await activate(button);
  await expect(page.locator(`[data-list="${list}"] [data-item="${id}"] [data-action]`)).toHaveText("SEÇİLİ");
}
async function screenshot(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(evidenceRoot, `${name}.png`) });
}

test("all assets and routes are selectable without touching the real profile", async ({ page }) => {
  test.setTimeout(180000);
  await page.addInitScript(({ key, raw }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
  }, { key: profileKey, raw: testProfileRaw });

  await page.goto(`${origin("localhost")}?test=hepsi#debug`);
  await waitForGame(page);
  await expect(page.locator("#a12TestModeLabel")).toHaveText("TEST MODU");
  await expect(page.locator("#characterSelect.show")).toBeVisible();
  await activate(page.locator('.characterChoice[data-runner-id="male"]'));

  const initial = await page.evaluate(() => __TMB_A12__.getState());
  expect(initial.testMode).toBe(true);
  expect(initial.profile.ownedRunnerIds).toHaveLength(6);
  expect(initial.profile.ownedOutfitSetIds).toHaveLength(9);
  expect(initial.profile.ownedChiefIds).toHaveLength(4);
  expect(initial.profile.ownedWorldIds).toHaveLength(4);
  expect(initial.profile.walletBalance).toBe(321);

  const overlap = await page.evaluate(() => {
    const label = document.querySelector("#a12TestModeLabel").getBoundingClientRect();
    const selectors = ["#pauseBtn", "#muteBtn", "#characterChange", "#joystick", "#jumpWrap button"];
    return selectors.map(selector => {
      const element = document.querySelector(selector);
      if (!element || getComputedStyle(element).display === "none") return { selector, area: 0 };
      const box = element.getBoundingClientRect();
      const area = Math.max(0, Math.min(label.right, box.right) - Math.max(label.left, box.left)) * Math.max(0, Math.min(label.bottom, box.bottom) - Math.max(label.top, box.top));
      return { selector, area };
    });
  });
  expect(overlap.filter(row => row.area > 0)).toEqual([]);

  await page.evaluate(() => __TMB_A12__.openShop("outfits"));
  for (const runner of ["male", "female"]) {
    await activate(page.locator(`[data-preview-runner="${runner}"]`));
    for (const outfit of ["dockCrew", "nightShift", "hazardRunner", "ronin", "shadowNinja", "orbitAstronaut", "northRaider", "mechaPilot", "default"]) {
      const button = page.locator(`[data-list="outfits"] [data-item="${outfit}"] [data-action]`);
      await expect(button).toHaveText(/^(SEÇ|SEÇİLİ)$/);
      if (await button.isEnabled()) await activate(button);
      await expect(page.locator(`[data-list="outfits"] [data-item="${outfit}"] [data-action]`)).toHaveText("SEÇİLİ");
    }
  }
  await screenshot(page, "tab-outfits");
  console.log(`TUR14_MATRIX outfits ${view} PASS count=9 runners=male,female`);

  await activate(page.locator('[data-tab="characters"]'));
  for (const runner of ["female", "tall", "compact", "bruiser", "athlete", "male"]) await selectItem(page, "characters", runner);
  await screenshot(page, "tab-characters");
  console.log(`TUR14_MATRIX characters ${view} PASS count=6`);

  await activate(page.locator('[data-tab="chiefs"]'));
  for (const chief of ["classicChief", "robotGuard", "bouncer", "securityTall"]) await selectItem(page, "chiefs", chief);
  await screenshot(page, "tab-chiefs");
  console.log(`TUR14_MATRIX chiefs ${view} PASS count=4`);

  await activate(page.locator('[data-tab="worlds"]'));
  await screenshot(page, "tab-worlds");
  const worlds = [
    ["frozen", "F01", "F06"],
    ["magma", "M01", "M06"],
    ["aftermath", "A01", "A06"],
    ["dock31", "D01", "D18"],
  ];
  for (const [world, first, last] of worlds) {
    await activate(page.locator(`[data-list="worlds"] [data-item="${world}"] h3`));
    await expect(page.locator("[data-shop-buy]")).toHaveText("SEÇ");
    await activate(page.locator("[data-shop-buy]"));
    await expect(page.locator(`[data-list="worlds"] [data-item="${world}"] [data-action]`)).toHaveText("SEÇİLİ");
    await expect(page.locator("#a12TestRoutes button")).toHaveCount(world === "dock31" ? 18 : 6);
    await screenshot(page, `world-${world}`);
    await activate(page.locator(`[data-test-route="${first}"]`));
    await page.waitForFunction(id => document.body.dataset.routeId === id, first);
    expect(await page.evaluate(() => __TMB_A12__.getState().route.id)).toBe(first);
    await page.evaluate(() => __TMB_A12__.openShop("worlds"));
    await activate(page.locator(`[data-list="worlds"] [data-item="${world}"] h3`));
    await activate(page.locator(`[data-test-route="${last}"]`));
    await page.waitForFunction(id => document.body.dataset.routeId === id, last);
    expect(await page.evaluate(() => __TMB_A12__.getState().route.id)).toBe(last);
    console.log(`TUR14_MATRIX world-${world} ${view} PASS routes=${first},${last}`);
    if (world !== "dock31") await page.evaluate(() => __TMB_A12__.openShop("worlds"));
  }

  const rawAfterTest = await page.evaluate(key => localStorage.getItem(key), profileKey);
  expect(rawAfterTest).toBe(testProfileRaw);
  expect((await page.evaluate(() => __TMB_A12__.getState())).profile.walletBalance).toBe(321);

  await page.goto(`${origin("localhost")}#debug`);
  await waitForGame(page);
  await expect(page.locator("#a12TestModeLabel")).toHaveCount(0);
  const normal = await page.evaluate(key => ({ raw: localStorage.getItem(key), state: __TMB_A12__.getState() }), profileKey);
  expect(normal.raw).toBe(testProfileRaw);
  expect(normal.state.testMode).toBe(false);
  expect(normal.state.profile.walletBalance).toBe(321);
  expect(normal.state.profile.ownedRunnerIds).toEqual(["male", "female"]);
  expect(normal.state.profile.ownedOutfitSetIds).toEqual(["default"]);
  expect(normal.state.profile.ownedChiefIds).toEqual(["securityTall"]);
  expect(normal.state.profile.ownedWorldIds).toEqual(["dock31"]);
  console.log(`TUR14_PROFILE ${view} PASS bytes=${Buffer.byteLength(testProfileRaw, "utf8")} wallet=321 unchanged=true`);
});

test("localhost, loopback, parameter, and native guards", async ({ browser }) => {
  const githubHost = ["silver", "arget.github.io"].join("");
  const playgamaHost = ["test.games.", "playgama.net"].join("");
  const context = await browser.newContext({ viewport: { width: 915, height: 412 } });
  const page = await context.newPage();
  for (const host of ["localhost", "127.0.0.1"]) {
    await page.goto(`${origin(host)}?test=hepsi#debug`);
    await waitForGame(page);
    await expect(page.locator("#a12TestModeLabel")).toBeVisible();
  }
  await page.goto(`${origin("localhost")}#debug`);
  await waitForGame(page);
  await expect(page.locator("#a12TestModeLabel")).toHaveCount(0);
  await context.close();

  const native = await browser.newContext({ viewport: { width: 915, height: 412 } });
  await native.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true };
  });
  const nativePage = await native.newPage();
  await nativePage.goto(`${origin("localhost")}?test=hepsi#debug`);
  await waitForGame(nativePage);
  await expect(nativePage.locator("#a12TestModeLabel")).toHaveCount(0);
  expect((await nativePage.evaluate(() => __TMB_A12__.getState())).testMode).toBe(false);
  await native.close();

  const virtual = await browser.newContext({ viewport: { width: 915, height: 412 } });
  await virtual.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (![githubHost, playgamaHost].includes(url.hostname)) return route.continue();
    url.protocol = "http:";
    url.hostname = "127.0.0.1";
    url.port = String(port);
    const response = await virtual.request.fetch(url.href);
    await route.fulfill({ response });
  });
  const virtualPage = await virtual.newPage();
  await virtualPage.goto(`http://${githubHost}:${port}/?test=hepsi#debug`);
  await waitForGame(virtualPage);
  await expect(virtualPage.locator("#a12TestModeLabel")).toBeVisible();
  await virtualPage.goto(`http://${playgamaHost}:${port}/?test=hepsi#debug`);
  await waitForGame(virtualPage);
  await expect(virtualPage.locator("#a12TestModeLabel")).toHaveCount(0);
  expect((await virtualPage.evaluate(() => __TMB_A12__.getState())).testMode).toBe(false);
  await virtual.close();
  console.log(`TUR14_HOSTS ${view} PASS github=true localhost=true 127.0.0.1=true paramless=false capacitor=false playgama=false`);
});
