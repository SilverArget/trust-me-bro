const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const outFile = process.argv[3] ? path.resolve(process.argv[3]) : null;
const routeIds = Array.from({ length: 18 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`);

function serve(rootDir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(rootDir, rel), (error, body) => {
      if (error) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function boot(page, base, id) {
  await page.goto(`${base}#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(async id => {
    __TMB_A12__.renderWorldOnRoute('dock31', id);
    __TMB_A12__.startRoute(id);
  }, id);
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, id);
}

async function measure(page, id) {
  return await page.evaluate(async id => {
    const api = __TMB_A12__;
    const tick = (frames = 1) => { for (let i = 0; i < frames; i++) __tmbCampaignStep(1 / 60); };
    const groundYAt = (route, x) => {
      const hits = (route.groundSegments || []).filter(g => x >= g.x && x <= g.x + g.w);
      if (!hits.length) return 455;
      return Math.min(...hits.map(g => g.y));
    };
    const waitForCatch = (startCatches, limitFrames = 900) => {
      for (let i = 0; i < limitFrames; i++) {
        tick();
        const s = api.getState();
        if ((s.chief?.catches || 0) > startCatches) return s;
      }
      return null;
    };

    api.renderWorldOnRoute('dock31', id);
    api.startRoute(id);
    const route = api.routeDefinition(id);
    const cps = route.checkpoints || [];
    const cp = cps.find(x => x > (route.chief?.startX || 70)) || cps.find(x => x > 70);
    if (!cp) return { id, ok: false, reason: 'no cp>70' };

    const h = api.getState().hitbox.h;
    api.placePlayer(cp + 8, groundYAt(route, cp + 8) - h);
    tick(4);

    const samples = window.TMB_CHIEF_PATHS?.[id]?.samples || [];
    const activeX = Math.max(cp + 120, (route.chief?.startX || cp) + 120);
    const lateTime = Math.min((samples.at(-1)?.[0] || 12) - 1, 12);
    const sample = samples.find(row => row[0] >= lateTime && row[1] >= activeX) || samples.find(row => row[1] >= activeX) || samples.find(row => row[1] >= cp + 20);
    if (!sample) return { id, ok: false, cp, reason: 'no chief sample after cp' };
    if (!api.placePlayerAtChiefTime(sample[0])) return { id, ok: false, cp, reason: 'placePlayerAtChiefTime failed' };

    const firstStart = api.getState().chief?.catches || 0;
    const first = waitForCatch(firstStart, 3000);
    if (!first) return { id, ok: false, cp, reason: 'first catch timeout' };
    const caughtAt = first.gameClock;
    tick(2);
    const afterReset = api.getState();
    const secondStart = afterReset.chief?.catches || 0;
    const second = waitForCatch(secondStart, 3000);
    if (!second) return { id, ok: false, cp, reason: 'second catch timeout', caughtAt, resetX: afterReset.player.x };
    return {
      id,
      ok: true,
      cp,
      resetX: +afterReset.player.x.toFixed(2),
      caughtAt: +caughtAt.toFixed(3),
      recaughtAt: +second.gameClock.toFixed(3),
      wait: +(second.gameClock - afterReset.gameClock).toFixed(3),
      delay: +(afterReset.chief?.delay ?? NaN).toFixed(3),
    };
  }, id);
}

(async () => {
  const server = await serve(root);
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const rows = [];
  try {
    for (const id of routeIds) {
      await boot(page, base, id);
      const row = await measure(page, id);
      rows.push(row);
      console.log(`${id} ${row.ok ? `${row.wait.toFixed(3)}s delay=${row.delay.toFixed(3)} cp=${row.cp}` : `FAIL ${row.reason}`}`);
    }
  } finally {
    await page.close();
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  }
})();
