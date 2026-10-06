const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'isaret');
const outFile = path.join(outDir, 'jump-hint-audit.json');
const routeIds = [
  'D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15','D16','D17','D18',
  'F01','F02','F03','F04',
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

async function boot(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(2000);
    await __TMB_A12__.purchaseWorld('frozen');
    await __TMB_A12__.purchaseWorld('magma');
    await __TMB_A12__.purchaseWorld('aftermath');
    for (const id of ['F01','F02','F03','M01','M02','M03','A01','A02','A03']) {
      const world = id[0] === 'F' ? 'frozen' : id[0] === 'M' ? 'magma' : 'aftermath';
      __TMB_A12__.renderWorldOnRoute(world, id);
      __TMB_A12__.finish();
    }
  });
}

async function startRoute(page, id) {
  const world = id[0] === 'F' ? 'frozen' : id[0] === 'M' ? 'magma' : id[0] === 'A' ? 'aftermath' : 'dock31';
  await page.evaluate(({ world, id }) => {
    __TMB_A12__.renderWorldOnRoute(world, id);
    __TMB_A12__.startRoute(id);
    __TMB_A12__.disableChief();
  }, { world, id });
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, id);
}

async function straightRunZone(page, routeId, z) {
  await startRoute(page, routeId);
  const startX = Math.max(70, z.x1 - 90);
  const setup = await page.evaluate(startX => {
    const s = window.__tmbSegmentStart(startX);
    __TMB_A12__.disableChief();
    return { attemptId: s.economy.attemptId, x: s.player.x, y: s.player.y };
  }, startX);
  await page.keyboard.down('ArrowRight');
  let prev = await page.evaluate(() => __TMB_A12__.getState());
  let maxX = prev.player.x;
  let lastProgressAt = prev.gameClock;
  let reason = 'timeout';
  const targetX = Math.max(z.x2 + 160, (z.landX || z.x2) + 48);
  const started = Date.now();
  while (Date.now() - started < 3800) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    const center = s.player.x + s.hitbox.w / 2;
    if (s.player.x > maxX + 6) { maxX = s.player.x; lastProgressAt = s.gameClock; }
    if (s.economy.attemptId !== setup.attemptId || prev.player.x - s.player.x > 120 || s.deaths > prev.deaths) { reason = 'reset-or-death'; break; }
    if (s.player.onGround && center >= targetX) { reason = 'straight-run-passed'; break; }
    if (s.gameClock - lastProgressAt > 1.2 && center < targetX) { reason = 'stuck-before-next-surface'; break; }
    prev = s;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  const end = await page.evaluate(() => __TMB_A12__.getState());
  return {
    id: z.id,
    type: z.__type,
    x1: +z.x1.toFixed(2),
    x2: +z.x2.toFixed(2),
    landX: Number.isFinite(z.landX) ? +z.landX.toFixed(2) : null,
    startX: +startX.toFixed(2),
    targetX: +targetX.toFixed(2),
    reason,
    marked: z.x1 >= 370 && reason !== 'straight-run-passed',
    endX: +end.player.x.toFixed(2),
    endY: +end.player.y.toFixed(2),
    state: end.parkour.state,
  };
}

test('measure straight-run jump hint necessity', async ({ page }) => {
  test.setTimeout(600000);
  await boot(page);
  const report = fs.existsSync(outFile)
    ? JSON.parse(fs.readFileSync(outFile, 'utf8'))
    : { generatedAt: new Date().toISOString(), routes: {}, counts: {} };
  report.generatedAt = new Date().toISOString();
  for (const id of routeIds) {
    if (report.counts[id]) continue;
    await startRoute(page, id);
    const zones = await page.evaluate(() => {
      const r = __TMB_A12__.routeDefinition(__TMB_A12__.getState().route.id);
      return [
        ...(r.diveZones || []).map(z => ({ ...z, __type: 'dive' })),
        ...(r.highJumpZones || []).map(z => ({ ...z, __type: 'high' })),
      ].sort((a, b) => a.x1 - b.x1);
    });
    const rows = [];
    for (const z of zones) rows.push(await straightRunZone(page, id, z));
    report.routes[id] = rows;
    report.counts[id] = { before: zones.length, after: rows.filter(r => r.marked).length };
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf8');
  }
  console.log(`JUMP-HINT-COUNTS ${JSON.stringify(report.counts)}`);
  console.log(`JUMP-HINT-D09-1500 ${JSON.stringify((report.routes.D09 || []).filter(r => r.x1 < 1500))}`);
  expect(Object.keys(report.counts)).toHaveLength(routeIds.length);
});
