const { test, expect, devices } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = process.env.TMB_TEST_ROOT || path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'hermes-ayakkabi');
const baseline = !!process.env.TMB_HERMES_BASELINE;
const phase = baseline ? 'before' : 'after';
const zones = [
  { id: 'd09-hermes-opening-gap', x1: 280, x2: 324, landX: 403.44, landY: 151.875 },
  { id: 'd09-hermes-highjump500-06', x1: 950.64, x2: 1010.64, landX: 1281.84, landY: 233.5 },
];

let server, base;

test.beforeAll(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (err, body) => {
      if (err) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function boot(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D09');
    __TMB_A12__.startRoute('D09');
    __TMB_A12__.disableChief();
  });
  await page.waitForFunction(() => __TMB_A12__.getState().route.id === 'D09');
  await page.mouse.click(20, 20);
}

async function frame(page, name) {
  await page.screenshot({ path: path.join(outDir, name) });
}

async function runTrial(page, label, viewport, jumpPlan) {
  await boot(page, viewport);
  await page.keyboard.down('ArrowRight');
  const setup = await page.evaluate(() => __TMB_A12__.getState().economy.attemptId);
  const captures = [];
  const landings = [];
  let previous = await page.evaluate(() => __TMB_A12__.getState());
  let resetCount = 0, deathCount = 0, jumpedAt = new Set();
  const started = Date.now();
  while (Date.now() - started < 9000) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    const center = s.player.x + s.hitbox.w / 2;
    if (jumpPlan && s.player.onGround && !jumpedAt.has(jumpPlan) && center >= jumpPlan) {
      jumpedAt.add(jumpPlan);
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(40);
      await page.keyboard.up('ArrowUp');
    }
    for (const z of zones) {
      const prefix = `${phase}-${label}-${z.id}`;
      if (!captures.includes(`${z.id}:approach`) && center >= z.x1 - 70) {
        await frame(page, `${prefix}-01-approach.png`);
        captures.push(`${z.id}:approach`);
      }
      if (!captures.includes(`${z.id}:launch`) && center >= z.x1 && center <= z.x2 + 42) {
        await frame(page, `${prefix}-02-launch.png`);
        captures.push(`${z.id}:launch`);
      }
      if (!captures.includes(`${z.id}:land`) && s.player.onGround && Math.abs(center - z.landX) <= 36 && Math.abs(s.player.y + s.hitbox.h - z.landY) <= 5) {
        await frame(page, `${prefix}-03-land.png`);
        captures.push(`${z.id}:land`);
        landings.push({ id: z.id, center: +center.toFixed(2), feetY: +(s.player.y + s.hitbox.h).toFixed(2), targetX: z.landX, targetY: z.landY });
      }
    }
    if (s.economy.attemptId !== setup || previous.player.x - s.player.x > 140) resetCount++;
    if ((s.deaths || 0) > (previous.deaths || 0)) deathCount += (s.deaths || 0) - (previous.deaths || 0);
    if (center >= 1400) break;
    previous = s;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  const end = await page.evaluate(() => __TMB_A12__.getState());
  const result = {
    label, viewport,
    resetCount, deathCount,
    endX: +(end.player.x + end.hitbox.w / 2).toFixed(2),
    landings,
    captures,
    hermesZones: end.routeDefinitionHermes || null,
  };
  console.log(`D09-HERMES-${label.toUpperCase()} ${JSON.stringify(result)}`);
  if (!baseline) {
    expect(resetCount).toBe(0);
    expect(deathCount).toBe(0);
    expect(result.endX).toBeGreaterThanOrEqual(1400);
    expect(landings.map(v => v.id)).toEqual(zones.map(v => v.id));
  }
  return result;
}

async function baselineZoneFrames(page, viewport) {
  await boot(page, viewport);
  for (const z of zones) {
    await page.evaluate(startX => {
      __tmbSegmentStart(startX);
      __TMB_A12__.disableChief();
    }, Math.max(70, z.x1 - 90));
    await page.keyboard.down('ArrowRight');
    let launched = false;
    const started = Date.now();
    while (Date.now() - started < 3600) {
      const s = await page.evaluate(() => __TMB_A12__.getState());
      const center = s.player.x + s.hitbox.w / 2;
      if (center >= z.x1 - 55 && !launched) {
        await frame(page, `${phase}-desktop-${z.id}-00-compare-09e358e.png`);
        if (z.id === 'd09-hermes-highjump500-06') {
          await page.keyboard.down('ArrowUp');
          await page.waitForTimeout(45);
          await page.keyboard.up('ArrowUp');
        }
        launched = true;
      }
      if (center >= z.landX - 12 || center > z.x2 + 180) break;
      await page.waitForTimeout(16);
    }
    await page.keyboard.up('ArrowRight');
  }
}

test('D09 Hermes shoes launch desktop and Pixel 7 runs to x1400', async ({ page, browser }) => {
  test.setTimeout(120000);
  if (baseline) await baselineZoneFrames(page, { width: 1280, height: 720 });
  const desktopNoJump = await runTrial(page, 'desktop-nojump', { width: 1280, height: 720 }, null);
  const desktopNormal = await runTrial(page, 'desktop-normal', { width: 1280, height: 720 }, 720);
  const pixel = devices['Pixel 7'];
  const context = await browser.newContext({ ...pixel, deviceScaleFactor: 1 });
  const mobilePage = await context.newPage();
  let mobile;
  try {
    mobile = await runTrial(mobilePage, 'pixel7-nojump', pixel.viewport, null);
  } finally {
    await context.close();
  }
  const report = { phase, generatedAt: new Date().toISOString(), desktopNoJump, desktopNormal, mobile };
  fs.writeFileSync(path.join(outDir, `${phase}-run-report.json`), JSON.stringify(report, null, 2) + '\n');
});
