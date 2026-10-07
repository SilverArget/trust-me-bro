const { test, expect } = require("playwright/test");
const fs = require("fs");
const path = require("path");

const root = process.env.TMB_ROOT || path.join(__dirname, "..");
const blockText = /resmi sitelerde oynanabilir\./;
const pagesHost = String.fromCharCode(
  115, 105, 108, 118, 101, 114, 97, 114, 103, 101, 116, 46,
  103, 105, 116, 104, 117, 98, 46, 105, 111
);

function typeFor(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".mp3")) return "audio/mpeg";
  if (file.endsWith(".mp4")) return "video/mp4";
  if (file.endsWith(".json") || file.endsWith(".webmanifest")) return "application/json";
  return "application/octet-stream";
}

async function installRoutes(page) {
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/frame") {
      const target = url.searchParams.get("target");
      return route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><iframe id="gameFrame" src="${target}" style="width:800px;height:500px"></iframe>`
      });
    }
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const file = path.join(root, rel);
    try {
      return route.fulfill({ contentType: typeFor(rel), body: fs.readFileSync(file) });
    } catch (_) {
      return route.fulfill({ status: 404, body: "missing" });
    }
  });
}

async function framed(page, target) {
  await installRoutes(page);
  await page.goto(`http://partner.example/frame?target=${encodeURIComponent(target)}`);
  return page.frameLocator("#gameFrame");
}

test("platform host can run inside an external partner iframe", async ({ page }) => {
  const frame = await framed(page, "http://app-1001.games.s3.yandex.net/index.html#debug");
  await expect(frame.locator("#game")).toBeVisible({ timeout: 10000 });
  await expect(frame.getByText(blockText)).toHaveCount(0);
});

test("CrazyGames app host is classified as a platform host", async ({ page }) => {
  await installRoutes(page);
  await page.goto("http://app.crazygames.com/index.html#debug");
  await expect(page.locator("#game")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(blockText)).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() =>
    window.TMB_ALLOWED_HOSTS.some(e => e.rule === "app.crazygames.com" && e.scope === "platform")
  )).toBe(true);
});

test("first-party Pages host is blocked inside an external iframe", async ({ page }) => {
  const frame = await framed(page, `http://${pagesHost}/index.html#debug`);
  await expect(frame.getByText(blockText)).toBeVisible({ timeout: 10000 });
});

test("unlisted copied host is always blocked", async ({ page }) => {
  await installRoutes(page);
  await page.goto("http://copy.example/index.html#debug", { waitUntil: "commit" }).catch(() => {});
  await expect(page.getByText(blockText)).toBeVisible({ timeout: 10000 });
});
