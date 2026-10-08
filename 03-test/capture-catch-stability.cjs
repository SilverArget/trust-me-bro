const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'manager-preview', 'gorsel-catch-stability');
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
async function open(page, base) {
  await page.goto(`${base}/index.html#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count().catch(() => 0)) await choice.click({ timeout: 1000 }).catch(() => {});
}
async function routeAheadScan(page, routeId) {
  await page.evaluate(id => __TMB_A12__.startRoute(id), routeId);
  await page.keyboard.down('ArrowRight');
  let aheadFrames = 0, maxAhead = -Infinity, runningFrames = 0;
  const examples = [];
  for (let i = 0; i < 460; i++) {
    const s = await page.evaluate(() => {
      const st = __TMB_A12__.getState();
      return { t: st.gameClock, playerX: st.player.x, chiefX: st.chief?.x, active: !!st.chief?.active, phase: st.chief?.entryPhase, catches: st.chief?.catches, result: !!st.result };
    });
    if (s.active && s.phase === 'running') {
      runningFrames++;
      const ahead = s.chiefX - s.playerX;
      maxAhead = Math.max(maxAhead, ahead);
      if (ahead > 40) { aheadFrames++; if (examples.length < 8) examples.push(s); }
    }
    if (s.result || s.catches > 0) break;
    await page.waitForTimeout(50);
  }
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: path.join(out, `ahead-${routeId}-1280x720.png`) });
  return { routeId, aheadFrames, maxAhead: +maxAhead.toFixed(2), runningFrames, examples };
}
async function slowD04(page) {
  await page.evaluate(() => __TMB_A12__.startRoute('D04'));
  await page.evaluate(() => __tmbSegmentStart(4000));
  await page.keyboard.down('ArrowRight');
  let slowStarted = false, stopping = false, nextStopAt = 0, stopUntil = 0;
  const samples = [];
  for (let i = 0; i < 620; i++) {
    const st = await page.evaluate(() => {
      const s = __TMB_A12__.getState();
      return { t: s.gameClock, x: s.player.x, result: !!s.result, deaths: s.deaths, chief: { x: s.chief?.x, chiefT: s.chief?.chiefT, playerT: s.chief?.playerT, catches: s.chief?.catches } };
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
  return { caught: samples.some(s => (s.chief?.catches || 0) > 0), sampleCount: samples.length, firstCatch: samples.find(s => (s.chief?.catches || 0) > 0) || null, end: samples.at(-1) };
}
async function finishIcon(page, routeId, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(id => { __TMB_A12__.startRoute(id); __TMB_A12__.finishResult(); __tmbCampaignDraw(); }, routeId);
  await page.waitForTimeout(1300);
  const m = await page.evaluate(() => {
    const s = __TMB_A12__.getState();
    const titleY = 62;
    const iconY = s.chief ? s.chief.y + s.cameraWorldY - 18 : null;
    return { routeId: s.routeId, w: innerWidth, h: innerHeight, result: !!s.result, titleY, iconY, screenX: s.chief ? s.chief.x - s.cameraX + 16 : null, screenFeet: s.chief ? s.chief.y + 48 + s.cameraWorldY : null, resultAngry: !!s.chief?.resultAngry };
  });
  const shot = `finish-${routeId}-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: path.join(out, shot) });
  return { ...m, shot, noTitleOverlap: m.iconY === null ? false : Math.abs(m.iconY - m.titleY) > 46 };
}

(async () => {
  const port = await listen();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await open(page, base);
  const ahead = [];
  for (const id of ['D01', 'D04', 'D18']) ahead.push(await routeAheadScan(page, id));
  const slowCatch = await slowD04(page);
  const finish = [];
  for (const id of ['D04', 'D18']) {
    finish.push(await finishIcon(page, id, { width: 1280, height: 720 }));
    finish.push(await finishIcon(page, id, { width: 390, height: 844 }));
  }
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const a12 = fs.readFileSync(path.join(root, 'js/a12-campaign.js'), 'utf8');
  const metrics = {
    ahead,
    slowCatch,
    finish,
    consoleErrors,
    mojibake: { index: (index.match(/Ã|â€|Å¸/g) || []).length, a12: (a12.match(/Ã|â€|Å¸/g) || []).length },
    nonAsciiIndex: [...index].filter(ch => ch.charCodeAt(0) > 127).length
  };
  fs.writeFileSync(path.join(out, 'catch-stability-metrics.json'), JSON.stringify(metrics, null, 2));
  await browser.close();
  server.close();
  if (ahead.some(r => r.aheadFrames !== 0)) throw new Error('chief ahead running frames detected');
  if (!slowCatch.caught) throw new Error('slow D04 was not caught');
  if (finish.some(r => !r.resultAngry || !r.noTitleOverlap)) throw new Error('finish icon overlap/visibility failed');
  if (metrics.mojibake.index || metrics.mojibake.a12) throw new Error('mojibake found');
})().catch(err => { console.error(err); server.close(); process.exit(1); });
