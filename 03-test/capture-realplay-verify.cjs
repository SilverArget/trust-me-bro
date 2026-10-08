const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'manager-preview', 'gorsel-realplay-verify');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.json':'application/json; charset=utf-8', '.webp':'image/webp' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('missing'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});
function listen() { return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port))); }
async function boot(page, routeId='D04') {
  await page.goto(`${base}/index.html#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count().catch(() => 0)) await choice.click({ timeout: 1200 }).catch(() => {});
  await page.evaluate(id => __TMB_A12__.startRoute(id), routeId);
  await page.waitForTimeout(120);
}
async function screenshot(page, name) { await page.screenshot({ path: path.join(out, name) }); }

let base;
(async () => {
  const port = await listen();
  base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await boot(page, 'D04');
  await page.evaluate(() => __tmbSegmentStart(5400));
  await page.keyboard.down('ArrowRight');
  const samples = [];
  let previous = null;
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(75);
    const s = await page.evaluate(() => {
      const st = __TMB_A12__.getState();
      return { t: st.gameClock, x: st.player.x, y: st.player.y, state: st.parkour.state, deaths: st.deaths, catches: st.chief?.catches || 0, routeId: st.routeId };
    });
    if (previous && s.x < previous.x - 60) samples.push({ type: 'back', from: previous.x, to: s.x, dx: s.x - previous.x, t: s.t, state: s.state });
    previous = s;
    if (i === 45) await screenshot(page, 'd04-right-only-mid-1280x720.png');
    if (s.x > 6200) break;
  }
  await page.keyboard.up('ArrowRight');
  const d04End = await page.evaluate(() => __TMB_A12__.getState());
  await screenshot(page, 'd04-right-only-after-1280x720.png');

  const finishShots = [];
  for (const routeId of ['D01','D04']) {
    await boot(page, routeId);
    await page.evaluate(() => { __TMB_A12__.finishResult(); __tmbCampaignDraw(); });
    await page.waitForTimeout(900);
    const metric = await page.evaluate(() => {
      const st = __TMB_A12__.getState();
      const chief = st.chief;
      const r = __TMB_A12__.routeDefinition(st.routeId);
      const surfaces = [...(r.groundSegments||[]), ...(r.obstacles||[]).filter(o => ['platform','pallet','crane','collapse'].includes(o.type)).map(o => ({ x:o.x, y:o.y ?? (o.baseY || 455) - (o.h || 0), w:o.w || 0 }))];
      const cx = chief.x + 16;
      const ground = surfaces.filter(s => cx >= s.x - 2 && cx <= s.x + s.w + 2).sort((a,b) => a.y - b.y).at(-1)?.y ?? null;
      return { routeId: st.routeId, resultAngry: !!chief.resultAngry, active: !!chief.active, pose: chief.pose, chiefX: chief.x, chiefY: chief.y, screenX: st.cameraX == null ? null : chief.x - st.cameraX + 16, cameraX: st.cameraX, feetY: chief.y + 48, screenFeet: chief.y + 48 + st.cameraWorldY, groundY: ground, feetDelta: ground == null ? null : +(chief.y + 48 - ground).toFixed(3), usesDebugCam: false };
    });
    finishShots.push(metric);
    await screenshot(page, `finish-chief-${routeId.toLowerCase()}-1280x720.png`);
  }

  const source = fs.readFileSync(path.join(root, 'js/a12-campaign.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const mojibakePattern = /Ã|â€|Å¸/g;
  const metrics = {
    d04RightOnly: {
      startX: 5400,
      endX: +d04End.player.x.toFixed(2),
      finishX: d04End.route.finishX,
      deaths: d04End.deaths,
      catches: d04End.chief?.catches || 0,
      backEvents: samples,
    },
    finishShots,
    debugGlobalReads: {
      windowTmbCam: (source.match(/window\.__tmb\?\.cam/g) || []).length,
      gameDebug: (source.match(/__GAME_DEBUG__/g) || []).length,
      tmbParkour: (source.match(/__tmbParkour/g) || []).length,
    },
    consoleErrors,
    mojibakeMatches: {
      index: (index.match(mojibakePattern) || []).length,
      a12: (source.match(mojibakePattern) || []).length,
    },
    hashes: {
      index: crypto.createHash('sha1').update(index).digest('hex'),
      a12: crypto.createHash('sha1').update(source).digest('hex'),
    },
  };
  fs.writeFileSync(path.join(out, 'realplay-verify-metrics.json'), JSON.stringify(metrics, null, 2));
  if (metrics.d04RightOnly.backEvents.length) throw new Error('D04 right-only back events remain');
  if (metrics.d04RightOnly.deaths || metrics.d04RightOnly.catches) throw new Error('D04 right-only died/caught');
  if (finishShots.some(m => !m.resultAngry || !m.active)) throw new Error('finish chief metric failed');
  if (metrics.debugGlobalReads.windowTmbCam) throw new Error('debug cam read remains');
  await browser.close();
  server.close();
})().catch(err => { console.error(err); server.close(); process.exit(1); });
