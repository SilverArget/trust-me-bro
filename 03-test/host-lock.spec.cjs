const { test, expect } = require("playwright/test");
const fs = require("fs");
const path = require("path");

const root = process.env.TMB_ROOT || path.join(__dirname, "..");
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

test("platform host runs inside an external partner iframe", async ({ page }) => {
  const frame = await framed(page, "http://app-1001.games.s3.yandex.net/index.html#debug");
  await expect(frame.locator("#game")).toBeVisible({ timeout: 10000 });
});

test("known platform host runs without host-lock metadata", async ({ page }) => {
  await installRoutes(page);
  await page.goto("http://app.crazygames.com/index.html#debug");
  await expect(page.locator("#game")).toBeVisible({ timeout: 10000 });
  await expect.poll(async () => page.evaluate(() => typeof window.TMB_ALLOWED_HOSTS)).toBe("undefined");
});

test("any host runs inside an external partner iframe", async ({ page }) => {
  const frame = await framed(page, "http://copy.example/index.html#debug");
  await expect(frame.locator("#game")).toBeVisible({ timeout: 10000 });
});

test("unlisted copied host runs directly", async ({ page }) => {
  await installRoutes(page);
  await page.goto("http://copy.example/index.html#debug");
  await expect(page.locator("#game")).toBeVisible({ timeout: 10000 });
});

test("browser translation is disabled without changing language menu options", async ({ page }) => {
  await installRoutes(page);
  await page.goto("http://localhost/index.html#debug");
  await expect(page.locator("#characterCard")).toBeAttached({ timeout: 10000 });
  await expect(page.locator("html")).toHaveAttribute("translate", "no");
  await expect(page.locator("html")).toHaveClass(/notranslate/);
  await expect(page.locator('meta[name="google"]')).toHaveAttribute("content", "notranslate");
  await expect(page.locator("#a12Language option")).toHaveText(["English", "Türkçe", "Русский"]);
  await expect.poll(() => page.locator("#a12Language option").evaluateAll(list => list.map(option => option.value))).toEqual(["en", "tr", "ru"]);
});
