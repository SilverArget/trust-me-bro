const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = process.env.TMB_ROOT || path.join(__dirname, '..');
const cases = [
  { routeId: 'A01', world: 'aftermath', checkpointX: 746.16 },
  { routeId: 'A03', world: 'aftermath', checkpointX: 4020.04 },
  { routeId: 'M06', world: 'magma', checkpointX: 4185.04 },
  { routeId: 'F06', world: 'frozen', checkpointX: 4640.23 },
];
let server, base;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (err, body) => {
      if (err) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function boot(page) {
  await page.setViewportSize({ width: 2400, height: 1080 });
  await page.goto(base);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => __TMB_A12__.unlockAllRoutes());
}

async function exerciseCheckpoint(page, scenario) {
  await page.evaluate(({ routeId, world, checkpointX }) => {
    __TMB_A12__.renderWorldOnRoute(world, routeId);
    __TMB_A12__.startRoute(routeId);
    __TMB_A12__.disableChief();
    __tmbSegmentStart(checkpointX);
    __TMB_A12__.disableChief();
  }, scenario);
  await page.waitForFunction(({ routeId, checkpointX }) => {
    const state = __TMB_A12__.getState();
    return state.route.id === routeId && state.checkpointX === checkpointX;
  }, scenario);
  const setup = await page.evaluate(() => {
    const deaths = __TMB_A12__.getState().deaths;
    __TMB_A12__.placePlayer(1000, 10000);
    return { deaths };
  });
  await page.waitForFunction(({ deaths }) => __TMB_A12__.getState().deaths > deaths, setup);
  const respawn = await page.evaluate(() => __TMB_A12__.getState());

  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  const outcomeHandle = await page.waitForFunction(({ deaths, respawnX }) => {
    const state = __TMB_A12__.getState();
    const escaped = state.player.x - respawnX >= 80;
    const respawned = state.deaths > deaths;
    return escaped || respawned ? { escaped, respawned, state } : false;
  }, { deaths: respawn.deaths, respawnX: respawn.player.x }, { timeout: 5000 }).catch(() => null);
  const outcome = outcomeHandle ? await outcomeHandle.jsonValue() : null;
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  const end = outcome?.state || await page.evaluate(() => __TMB_A12__.getState());
  const row = {
    routeId: scenario.routeId,
    escaped: !!outcome?.escaped,
    respawned: !!outcome?.respawned,
    checkpointX: end.checkpointX,
    respawnX: +respawn.player.x.toFixed(2),
    respawnY: +respawn.player.y.toFixed(2),
    endX: +end.player.x.toFixed(2),
    deaths: end.deaths,
    safeRespawn: Math.abs(respawn.player.x - scenario.safeX) < 0.01,
  };
  console.log(`CHECKPOINT-POCKET ${JSON.stringify(row)}`);
  return row;
}

test('engel içindeki checkpoint doğumları 5 saniyede kurtulur', async ({ page }) => {
  test.setTimeout(45000);
  await boot(page);
  const audit = await page.evaluate(() => __TMB_A12__.checkpointRespawnAudit());
  const intersections = audit.filter(row => row.blockerId || row.missingGround);
  console.log(`CHECKPOINT-AUDIT ${JSON.stringify({ checkpoints:audit.length, intersections:intersections.length, adjusted:audit.filter(row => row.movedPast?.length).map(row => ({ routeId:row.routeId, checkpointX:row.checkpointX, movedPast:row.movedPast })) })}`);
  expect(intersections, 'güvenli doğum çözümünden sonra engelle kesişen checkpointler').toEqual([]);
  const safeXByCheckpoint = new Map(audit.map(row => [`${row.routeId}@${row.checkpointX}`, row.x]));
  const rows = [];
  for (const scenario of cases) rows.push(await exerciseCheckpoint(page, {
    ...scenario,
    safeX: safeXByCheckpoint.get(`${scenario.routeId}@${scenario.checkpointX}`),
  }));
  expect(rows.filter(row => !row.safeRespawn || (!row.escaped && !row.respawned)).map(row => row.routeId),
    'güvenli noktada doğmayan veya 5 saniye içinde cepten çıkamayan rotalar').toEqual([]);
});
