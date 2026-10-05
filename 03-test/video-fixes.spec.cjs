const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'manager-preview', 'video-fixes');
const beforeIndex = cp.execFileSync('git', ['show', 'HEAD:index.html'], { cwd: root, encoding: 'utf8' });
const beforeCampaign = cp.execFileSync('git', ['show', 'HEAD:js/a12-campaign.js'], { cwd: root, encoding: 'utf8' });
const afterIndex = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const afterCampaign = fs.readFileSync(path.join(root, 'js/a12-campaign.js'), 'utf8');
let mode = 'after';
let server;
let base;

test.beforeAll(async () => {
  fs.mkdirSync(out, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    if (rel === 'index.html') {
      res.setHeader('Content-Type', 'text/html');
      return res.end(mode === 'before' ? beforeIndex : afterIndex);
    }
    if (rel === 'js/a12-campaign.js') {
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(mode === 'before' ? beforeCampaign : afterCampaign);
    }
    fs.readFile(path.join(root, rel), (error, body) => {
      if (error) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function boot(page, hash = '#debug') {
  await page.goto(`${base}?mode=${mode}&t=${Date.now()}${hash}`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
}

async function scenarioShot(page, file, world, routeId, x, y) {
  await boot(page);
  const state = await page.evaluate(({ world, routeId, x, y }) => {
    __TMB_A12__.renderWorldOnRoute(world, routeId);
    __TMB_A12__.startRoute(routeId);
    __TMB_A12__.disableChief();
    __TMB_A12__.placePlayer(x, y);
    for (let i = 0; i < 30; i++) __tmbCampaignStep(1 / 60);
    __tmbCampaignDraw();
    const s = __TMB_A12__.getState();
    return { background: window.__tmbBackgroundDraw, player: s.player, cameraWorldY: s.cameraWorldY };
  }, { world, routeId, x, y });
  await page.screenshot({ path: path.join(out, file) });
  return state;
}

function readControls() {
  const read = selector => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return { display: style.display, visible: style.display !== 'none' && box.width > 0 && box.height > 0, width: box.width, height: box.height };
  };
  return { phase: document.body.dataset.campaignPhase || '', joystick: read('#joystick'), jump: read('#jumpWrap') };
}

const fullscreenStub = () => {
  window.fullscreenLog = [];
  Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get: () => true });
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
    configurable: true,
    value: () => { window.fullscreenLog.push({ t: performance.now(), target: 'documentElement' }); return Promise.resolve(); },
  });
};

test('manager video fixes evidence', async ({ browser }) => {
  test.setTimeout(180000);
  const results = {};

  for (const m of ['before', 'after']) {
    mode = m;
    {
      const page = await browser.newPage({ viewport: { width: 2400, height: 1080 }, deviceScaleFactor: 1 });
      results[`${m}-b-magma`] = await scenarioShot(page, `${m}-b-M01-high.png`, 'magma', 'M01', 1320, 150);
      await page.close();
    }
    {
      const page = await browser.newPage({ viewport: { width: 2400, height: 1080 }, deviceScaleFactor: 1 });
      results[`${m}-c-frozen`] = await scenarioShot(page, `${m}-c-F01-low.png`, 'frozen', 'F01', 1460, 585);
      await page.close();
    }
    {
      const context = await browser.newContext({ viewport: { width: 2400, height: 1080 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await boot(page);
      await page.evaluate(() => { __TMB_A12__.startRoute('D13'); __TMB_A12__.finish(); __tmbCampaignDraw(); });
      await page.screenshot({ path: path.join(out, `${m}-e-result-controls.png`) });
      results[`${m}-e-controls`] = await page.evaluate(readControls);
      await context.close();
    }
  }

  for (const m of ['before', 'after']) {
    mode = m;
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.addInitScript(fullscreenStub);
    await page.goto(`${base}?mode=${m}&t=${Date.now()}#mobileV70`);
    await page.locator('#characterSelect.show').waitFor();
    await page.locator('.characterChoice').first().tap();
    await page.waitForFunction(() => !document.querySelector('#characterSelect')?.classList.contains('show'));
    await page.waitForTimeout(120);
    const afterChoice = await page.evaluate(() => window.fullscreenLog.length);
    await page.touchscreen.tap(420, 190);
    await page.waitForTimeout(120);
    const afterBodyTap = await page.evaluate(() => window.fullscreenLog.length);
    await page.waitForFunction(() => document.querySelector('#fullscreenBtn')?.classList.contains('show'));
    await page.locator('#fullscreenBtn').dispatchEvent('click');
    await page.waitForTimeout(120);
    results[`${m}-d-fullscreen`] = { afterChoice, afterBodyTap, afterButton: await page.evaluate(() => window.fullscreenLog.length) };
    await context.close();
  }

  mode = 'after';
  {
    const page = await browser.newPage();
    await boot(page);
    const ids = [...Array.from({ length: 18 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`), 'F01', 'F02', 'F03', 'F04'];
    results.chief = await page.evaluate(ids => Object.fromEntries(ids.map(id => [id, __TMB_A12__.chiefPathStatus(id)])), ids);
    await page.close();
  }

  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log('VIDEO_FIXES ' + JSON.stringify(results));

  expect(results['after-b-magma'].background.offset).toBe(0);
  expect(results['after-c-frozen'].background.offset).toBe(0);
  expect(results['after-d-fullscreen']).toEqual({ afterChoice: 0, afterBodyTap: 0, afterButton: 1 });
  expect(results['after-e-controls'].phase).toBe('result');
  expect(results['after-e-controls'].joystick.visible).toBe(false);
  expect(results['after-e-controls'].jump.visible).toBe(false);
  expect(Object.values(results.chief).filter(row => row.valid)).toHaveLength(22);
});
