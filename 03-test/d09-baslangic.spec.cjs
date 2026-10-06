const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'd09-baslangic');
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

async function boot(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
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

async function pressJump(page) {
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(45);
  await page.keyboard.up('ArrowUp');
}

async function openingTrial(page, delayMs, name) {
  await boot(page);
  const setup = await page.evaluate(() => {
    const r = __TMB_A12__.routeDefinition('D09');
    const deepest = x => {
      const grounds = r.groundSegments.filter(s => s.kind === 'ground');
      const covering = grounds.filter(s => s.x <= x && x <= s.x + s.w);
      if (covering.length) return Math.max(...covering.map(s => s.y));
      const nearby = grounds.filter(s => s.x - 400 <= x && x <= s.x + s.w + 400);
      return nearby.length ? Math.max(...nearby.map(s => s.y)) : 455;
    };
    const s = __TMB_A12__.getState();
    return { attemptId: s.economy.attemptId, checkpointX: s.checkpointX, deepestAt420: deepest(420), retryYAt420: deepest(420) + 120 };
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(Math.max(0, delayMs));
  await pressJump(page);

  let previous = await page.evaluate(() => __TMB_A12__.getState());
  let reset = false, resetFrom = null, crossedLow = false, maxY = previous.player.y, end = previous;
  const started = Date.now();
  while (Date.now() - started < 5000) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    maxY = Math.max(maxY, s.player.y);
    if (previous.player.x - s.player.x > 150 || s.economy.attemptId !== setup.attemptId) {
      reset = true;
      resetFrom = {
        x: +previous.player.x.toFixed(2),
        y: +previous.player.y.toFixed(2),
        center: +(previous.player.x + previous.hitbox.w / 2).toFixed(2),
        checkpointX: previous.checkpointX,
        deaths: previous.deaths || 0,
      };
      end = s;
      break;
    }
    if (s.player.x + s.hitbox.w >= 560 && s.player.y + s.hitbox.h <= 335) crossedLow = true;
    if (s.player.x >= 900 || crossedLow) { end = s; break; }
    previous = s;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  if (name) await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  return {
    delayMs,
    status: reset ? 'route-start-reset' : crossedLow ? 'opening-cleared' : 'continued',
    reset,
    resetFrom,
    x: +end.player.x.toFixed(2),
    y: +end.player.y.toFixed(2),
    maxY: +maxY.toFixed(2),
    deaths: end.deaths || 0,
    checkpointX: end.checkpointX,
    setup,
  };
}

const deterministicJitter = Array.from({ length: 30 }, (_, i) => {
  const spread = i % 2 ? 150 : 80;
  const seed = (i * 73 + 41) % (spread * 2 + 1);
  return 180 + seed - spread;
});

test('D09 opening jitter does not reset to route start', async ({ page }) => {
  test.setTimeout(180000);
  const rows = [];
  for (let i = 0; i < deterministicJitter.length; i++) {
    rows.push(await openingTrial(page, deterministicJitter[i], i === 0 ? `${process.env.TMB_D09_PHASE || 'after'}-opening` : null));
  }
  const counts = rows.reduce((acc, r) => (acc[r.status] = (acc[r.status] || 0) + 1, acc), {});
  const evidence = { phase: process.env.TMB_D09_PHASE || 'after', delays: deterministicJitter, counts, rows };
  fs.writeFileSync(path.join(outDir, `${evidence.phase}-opening.json`), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`D09-OPENING-JITTER ${evidence.phase} ${JSON.stringify(counts)}`);
  console.log(`D09-OPENING-CAUSE deepestAt420=${rows[0].setup.deepestAt420} retryYAt420=${rows[0].setup.retryYAt420} firstReset=${JSON.stringify(rows.find(r => r.reset)?.resetFrom || null)}`);
  if (!process.env.TMB_D09_BASELINE) expect(counts['route-start-reset'] || 0).toBe(0);
});

test('D09 spawn has no visible jump pad zone', async ({ page }) => {
  await boot(page);
  await page.screenshot({ path: path.join(outDir, `${process.env.TMB_D09_PHASE || 'after'}-spawn.png`) });
  const zones = await page.evaluate(() => {
    const r = __TMB_A12__.routeDefinition('D09');
    const spawnX = __TMB_A12__.getState().player.x + __TMB_A12__.getState().hitbox.w / 2;
    return [...(r.highJumpZones || []), ...(r.diveZones || [])]
      .filter(z => z.x1 <= spawnX && spawnX <= z.x2)
      .map(z => ({ id: z.id, x1: z.x1, x2: z.x2 }));
  });
  console.log(`D09-SPAWN-ZONES ${JSON.stringify(zones)}`);
  if (!process.env.TMB_D09_BASELINE) expect(zones).toHaveLength(0);
});
