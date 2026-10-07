const { test, expect, devices } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = process.env.TMB_ROOT || path.resolve(__dirname, '..');
const outDir = process.env.TMB_OUT || path.join(__dirname, 'manager-preview', 'ios-tamekran');
let server;
let base;

test.beforeAll(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://local').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (error, body) => {
      if (error) {
        res.statusCode = 404;
        res.end('missing');
        return;
      }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : rel.endsWith('.png') ? 'image/png' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

async function noFullscreenApi(page) {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: false });
    delete Element.prototype.requestFullscreen;
    delete Element.prototype.webkitRequestFullscreen;
  });
}

function contentTypeFor(rel) {
  if (rel.endsWith('.html')) return 'text/html';
  if (rel.endsWith('.js')) return 'text/javascript';
  if (rel.endsWith('.png')) return 'image/png';
  if (rel.endsWith('.json') || rel.endsWith('.webmanifest')) return 'application/json';
  if (rel.endsWith('.mp3')) return 'audio/mpeg';
  return 'application/octet-stream';
}

async function installVirtualHostRoutes(page) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/frame') {
      const target = url.searchParams.get('target');
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><body style="margin:0"><iframe id="gameFrame" src="${target}" style="width:100vw;height:100vh;border:0"></iframe></body></html>`
      });
    }
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    if (rel === 'playgama-bridge.js') {
      return route.fulfill({ contentType: 'text/javascript', body: '' });
    }
    try {
      return route.fulfill({ contentType: contentTypeFor(rel), body: fs.readFileSync(path.join(root, rel)) });
    } catch (_) {
      return route.fulfill({ status: 404, body: 'missing' });
    }
  });
}

async function boot(page) {
  await page.goto(`${base}#debug`);
  await page.waitForFunction(() => window.__tmb && window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.tap();
  await expect(page.locator('#missionBrief.show')).toHaveCount(0, { timeout: 3000 });
  await page.waitForTimeout(80);
}

async function setTr(page) {
  await page.evaluate(() => window.__TMB_A12__.setLanguage('tr'));
  await page.waitForFunction(() => document.querySelector('#fullscreenBtn')?.title === 'Tam ekran');
}

test.describe('iOS fullscreen help button', () => {
  test('WebKit iPhone API yokken dugme ve TR kart; kart pause/resume yapar', async ({ browserName, browser }) => {
    test.skip(browserName !== 'webkit', 'WebKit iPhone fallback');
    const iphone = devices['iPhone 14 Pro'] || devices['iPhone 13'];
    const context = await browser.newContext({ ...iphone, viewport: { width: 852, height: 393 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await noFullscreenApi(page);
    await boot(page);
    await setTr(page);

    await expect(page.locator('#fullscreenBtn.show')).toBeVisible();
    await page.screenshot({ path: path.join(outDir, 'iphone-dugme.png'), fullPage: true });

    await page.locator('#fullscreenBtn').tap();
    await expect(page.locator('#iosFullscreenHelp.show')).toBeVisible();
    await expect(page.locator('#iosFullscreenCard')).toHaveText("Tam ekran için: Safari'de Paylaş ↑ → Ana Ekrana Ekle, sonra oyunu ana ekrandaki simgeden aç.");
    await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getState().paused)).toBe(true);
    await page.screenshot({ path: path.join(outDir, 'iphone-kart.png'), fullPage: true });

    await page.locator('#iosFullscreenCard').tap();
    await expect(page.locator('#iosFullscreenHelp.show')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getState().paused)).toBe(false);
    await context.close();
  });

  test('standalone iPhone acilisinda dugme gizli', async ({ browserName, browser }) => {
    test.skip(browserName !== 'webkit', 'WebKit standalone fallback');
    const iphone = devices['iPhone 14 Pro'] || devices['iPhone 13'];
    const context = await browser.newContext({ ...iphone, viewport: { width: 852, height: 393 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await noFullscreenApi(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    });
    await boot(page);
    await expect(page.locator('#fullscreenBtn.show')).toHaveCount(0);
    await page.screenshot({ path: path.join(outDir, 'iphone-standalone.png'), fullPage: true });
    await context.close();
  });

  test('Chromium Pixel 7 eski requestFullscreen yolunu kullanir', async ({ browserName, browser }) => {
    test.skip(browserName !== 'chromium', 'Chromium Android path');
    const pixel = devices['Pixel 7'] || devices['Pixel 5'];
    const context = await browser.newContext({ ...pixel, viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__requestFullscreenCalls = 0;
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
      Element.prototype.requestFullscreen = function requestFullscreen() {
        window.__requestFullscreenCalls += 1;
        return Promise.resolve();
      };
    });
    await boot(page);
    await expect(page.locator('#fullscreenBtn.show')).toBeVisible();
    await page.screenshot({ path: path.join(outDir, 'pixel7.png'), fullPage: true });
    await page.locator('#fullscreenBtn').tap();
    await expect.poll(() => page.evaluate(() => window.__requestFullscreenCalls)).toBe(1);
    await expect(page.locator('#iosFullscreenHelp.show')).toHaveCount(0);
    await context.close();
  });

  test('platform iframe dugme ve iOS karti gostermez, dokunusta fullscreen istemez', async ({ browser }) => {
    const iphone = devices['iPhone 14 Pro'] || devices['iPhone 13'];
    const context = await browser.newContext({ ...iphone, viewport: { width: 852, height: 393 }, isMobile: true, hasTouch: true });
    await context.addInitScript(() => {
      window.__requestFullscreenCalls = 0;
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
      Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: true });
      Element.prototype.requestFullscreen = function requestFullscreen() {
        window.__requestFullscreenCalls += 1;
        return Promise.resolve();
      };
      Element.prototype.webkitRequestFullscreen = Element.prototype.requestFullscreen;
    });
    const page = await context.newPage();
    await installVirtualHostRoutes(page);
    await page.goto(`http://partner.example/frame?target=${encodeURIComponent('http://app-1001.games.s3.yandex.net/index.html#debug')}`);
    const gameFrame = page.frameLocator('#gameFrame');
    await expect(gameFrame.locator('#game')).toBeVisible({ timeout: 10000 });
    await expect(gameFrame.locator('#fullscreenBtn.show')).toHaveCount(0);
    await expect(gameFrame.locator('#iosFullscreenHelp.show')).toHaveCount(0);
    await gameFrame.locator('.characterChoice:visible').first().tap();
    await expect.poll(() => page.frame({ url: /app-1001\.games\.s3\.yandex\.net/ }).evaluate(() => window.__requestFullscreenCalls)).toBe(0);
    await expect(gameFrame.locator('#missionBrief.show')).toHaveCount(0, { timeout: 3000 });
    await gameFrame.locator('#game').tap({ position: { x: 120, y: 120 }, force: true });
    await expect.poll(() => page.frame({ url: /app-1001\.games\.s3\.yandex\.net/ }).evaluate(() => window.__requestFullscreenCalls)).toBe(0);
    await context.close();
  });
});
