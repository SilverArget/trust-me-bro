const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'manager-preview', 'gorsel-catch-rule');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const file = path.normalize(path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('missing'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});
function listen() { return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port))); }
async function boot(page, base, routeId = 'D04') {
  await page.goto(`${base}/index.html#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count().catch(() => 0)) await choice.click({ timeout: 1200 }).catch(() => {});
  await page.evaluate(id => __TMB_A12__.startRoute(id), routeId);
  await page.waitForTimeout(150);
}

(async () => {
  const port = await listen();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await boot(page, base, 'D04');
  await page.evaluate(() => __tmbSegmentStart(4000));
  await page.keyboard.down('ArrowRight');
  let slowStarted = false, nextStopAt = 0, stopping = false, stopUntil = 0;
  const samples = [];
  for (let i = 0; i < 520; i++) {
    const st = await page.evaluate(() => {
      const s = __TMB_A12__.getState();
      return { t: s.gameClock, x: s.player.x, y: s.player.y, state: s.parkour.state, result: !!s.result, deaths: s.deaths, chief: { x: s.chief?.x, y: s.chief?.y, chiefT: s.chief?.chiefT, playerT: s.chief?.playerT, catches: s.chief?.catches, pose: s.chief?.pose } };
    });
    samples.push(st);
    if (st.chief.catches > 0 || st.deaths > 0 || st.result) break;
    if (!slowStarted && st.x > 4000) { slowStarted = true; nextStopAt = st.t + 2; }
    if (slowStarted && !stopping && st.t >= nextStopAt) { await page.keyboard.up('ArrowRight'); stopping = true; stopUntil = st.t + 1.1; nextStopAt = st.t + 3.1; }
    if (stopping && st.t >= stopUntil) { await page.keyboard.down('ArrowRight'); stopping = false; }
    await page.waitForTimeout(50);
  }
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: path.join(out, 'd04-slow-caught-1280x720.png') });
  const slowEnd = samples.at(-1);

  await boot(page, base, 'D04');
  await page.evaluate(() => { __TMB_A12__.finishResult(); __tmbCampaignDraw(); });
  await page.waitForTimeout(1200);
  const finishMetric = await page.evaluate(() => {
    const s = __TMB_A12__.getState();
    return { routeId: s.routeId, result: !!s.result, titleY: innerHeight / 2, chiefX: s.chief?.x, chiefY: s.chief?.y, screenX: s.chief ? s.chief.x - s.cameraX + 16 : null, screenFeet: s.chief ? s.chief.y + 48 + s.cameraWorldY : null, iconY: s.chief ? Math.max(76, Math.min(s.chief.y + 48 + s.cameraWorldY - 66, innerHeight * .5 - 64)) : null, resultAngry: !!s.chief?.resultAngry };
  });
  await page.screenshot({ path: path.join(out, 'd04-finish-icon-no-overlap-1280x720.png') });

  const source = fs.readFileSync(path.join(root, 'js/a12-campaign.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const metrics = {
    slowCatch: { caught: (slowEnd.chief?.catches || 0) > 0, end: slowEnd, sampleCount: samples.length, firstCatch: samples.find(s => (s.chief?.catches || 0) > 0) || null },
    finishMetric,
    consoleErrors,
    mojibake: { index: (index.match(/Ã|â€|Å¸/g) || []).length, a12: (source.match(/Ã|â€|Å¸/g) || []).length }
  };
  fs.writeFileSync(path.join(out, 'catch-rule-metrics.json'), JSON.stringify(metrics, null, 2));
  await browser.close();
  server.close();
  if (!metrics.slowCatch.caught) throw new Error('slow player was not caught');
  if (!(finishMetric.iconY < finishMetric.titleY - 44)) throw new Error('anger icon overlaps title band');
})().catch(err => { console.error(err); server.close(); process.exit(1); });
