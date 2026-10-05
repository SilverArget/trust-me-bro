const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'manager-preview', 'video-fixes');
const viewport = { width: 915, height: 412 };
const dpr = 2.625;
const beforeIndex = cp.execFileSync('git', ['show', 'HEAD~1:index.html'], { cwd: root, encoding: 'utf8' });
const beforeCampaign = cp.execFileSync('git', ['show', 'HEAD~1:js/a12-campaign.js'], { cwd: root, encoding: 'utf8' });
const afterIndex = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const afterCampaign = fs.readFileSync(path.join(root, 'js/a12-campaign.js'), 'utf8');
const dataRoots = {
  F01: path.join(__dirname, 'frozen-hard-generated'),
  M01: 'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m01m02',
};
const transitions = Object.fromEntries(Object.entries(dataRoots).map(([id, dir]) => [
  id,
  JSON.parse(fs.readFileSync(path.join(dir, `transitions-${id}.json`), 'utf8')),
]));

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

async function boot(page, id) {
  await page.goto(`${base}?mode=${mode}&t=${Date.now()}#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.locator('.characterChoice:visible').first().click();
  await page.evaluate(async id => {
    if (id[0] === 'F') {
      await __TMB_A12__.setWallet(500);
      await __TMB_A12__.purchaseWorld('frozen');
      __TMB_A12__.renderWorldOnRoute('frozen', 'F01');
    } else {
      await __TMB_A12__.setWallet(1000);
      await __TMB_A12__.purchaseWorld('magma');
      await __TMB_A12__.purchaseWorld('magma');
      __TMB_A12__.renderWorldOnRoute('magma', 'M01');
    }
    __TMB_A12__.startRoute(id);
    __TMB_A12__.disableChief();
  }, id);
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, id);
  await page.keyboard.down('ArrowRight');
}

async function jump(page) {
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(45);
  await page.keyboard.up('ArrowUp');
}

async function sample(page) {
  return page.evaluate(() => {
    __tmbCampaignDraw();
    return { s: __TMB_A12__.getState(), bg: window.__tmbBackgroundDraw || null, layout: window.__tmb.layout };
  });
}

function artifactMetric(id, m, row) {
  const { s, bg } = row;
  const h = s.viewport.h;
  const feetY = s.cameraWorldY + s.player.y + s.hitbox.h;
  const offset = bg?.offset || 0;
  if (id === 'M01') {
    const lavaY = offset + h * (m === 'before' ? .25 : .19);
    const score = lavaY - feetY;
    return { bad: score >= -30, score, feetY, artifactY: lavaY };
  }
  const shelfY = offset + h * (m === 'before' ? .76 : .85);
  const score = feetY - shelfY;
  return { bad: score >= -4, score, feetY, artifactY: shelfY };
}

async function maybeCapture(page, id, m, row, best, captureIndex) {
  const metric = artifactMetric(id, m, row);
  if (!metric.bad) return false;
  const entry = { ...metric, t: row.s.gameClock, x: row.s.player.x, y: row.s.player.y };
  const slot = best.findIndex(item => !item || entry.score > item.score);
  if (slot < 0) return true;
  best.splice(slot, 0, entry);
  best.length = 2;
  const file = `${id === 'M01' ? 'b' : 'c'}-${m}-raw-${captureIndex}.png`;
  await page.screenshot({ path: path.join(out, file) });
  entry.file = file;
  return true;
}

async function maybeCaptureTarget(page, id, m, row, targets, matches) {
  if (!targets?.length) return;
  for (let i = 0; i < targets.length; i++) {
    if (matches[i]) continue;
    const target = targets[i];
    if (row.s.player.x < target.x) continue;
    const metric = artifactMetric(id, m, row);
    const file = `${id === 'M01' ? 'b' : 'c'}-${m}-match-${i + 1}.png`;
    await page.screenshot({ path: path.join(out, file) });
    matches[i] = { ...metric, t: row.s.gameClock, x: row.s.player.x, y: row.s.player.y, file };
  }
}

async function drive(page, id, m, targets = []) {
  const fired = new Set(), pending = new Map(), lastPress = new Map(), tr = transitions[id], started = Date.now();
  const best = [null, null];
  const matches = [];
  let deaths = 0, retries = 0, end, previousSample = null, lastGroundAt = -Infinity, stuckSince = null, lastCaptureAt = -Infinity, conditionCount = 0, captureIndex = 0;
  let maxMetric = null, closestMetric = null;
  while (Date.now() - started < 115000) {
    const row = await sample(page);
    const s = row.s;
    end = s;
    deaths = Math.max(deaths, s.deaths || 0);
    const metric = artifactMetric(id, m, row);
    const metricRow = { ...metric, t: s.gameClock, x: s.player.x, y: s.player.y };
    if (!maxMetric || metricRow.score > maxMetric.score) maxMetric = metricRow;
    if (!closestMetric || Math.abs(metricRow.score) < Math.abs(closestMetric.score)) closestMetric = metricRow;
    await maybeCaptureTarget(page, id, m, row, targets, matches);
    if (s.gameClock - lastCaptureAt >= .25) {
      const metricBad = artifactMetric(id, m, row).bad;
      if (metricBad) captureIndex++;
      if (await maybeCapture(page, id, m, row, best, captureIndex)) {
        conditionCount++;
        lastCaptureAt = s.gameClock;
      }
    }
    const p = s.player, right = p.x + s.hitbox.w, center = p.x + s.hitbox.w / 2, centerY = p.y + s.hitbox.h / 2;
    if (p.onGround) lastGroundAt = s.gameClock;
    const coyote = p.onGround || s.gameClock - lastGroundAt <= .12;
    if (previousSample && previousSample.playerX - p.x > 150) {
      retries++;
      for (const key of [...fired]) {
        const ti = /^(?:normal|dive|tutunma)-(\d+)$/.exec(key);
        const oi = /^(?:vault|slide)-(.+)$/.exec(key);
        const x = ti ? (tr.find(t => t.i === Number(ti[1]))?.B.x0 ?? -Infinity)
          : oi ? (s.route.obstacles.find(o => o.id === oi[1])?.x ?? -Infinity) : -Infinity;
        if (x > p.x) fired.delete(key);
      }
      for (const [key] of [...pending]) {
        const ti = /^(?:normal|dive|tutunma)-(\d+)$/.exec(key);
        const oi = /^(?:vault|slide)-(.+)$/.exec(key);
        const x = ti ? (tr.find(t => t.i === Number(ti[1]))?.B.x0 ?? -Infinity)
          : oi ? (s.route.obstacles.find(o => o.id === oi[1])?.x ?? -Infinity) : -Infinity;
        if (x > p.x) { pending.delete(key); lastPress.delete(key); }
      }
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(60);
      await page.keyboard.down('ArrowRight');
    }
    previousSample = { playerX: p.x, x: center, y: centerY };
    for (const [key, q] of pending) {
      const happened = q.mech === 'dive' ? (!!s.diveRun || s.parkour.state === 'dive')
        : q.mech === 'tutunma' ? (s.parkour.state === 'catch' || s.parkour.state === 'climb')
        : q.mech === 'slide' ? s.parkour.state === 'slide'
        : q.mech === 'vault' ? (q.wasOnGround && !p.onGround)
        : q.wasOnGround && !p.onGround;
      if (happened) { fired.add(key); pending.delete(key); }
      else if (s.gameClock - q.at >= .6) pending.delete(key);
    }
    if (s.result || right >= s.route.finishX) break;
    if (deaths) throw new Error(`${id} death before finish`);
    let target = null;
    for (const t of tr) {
      const fallbackCatch = (id === 'F01' && -t.D > 52 && t.gap <= 96) || (id === 'M01' && -t.D > 0 && -t.D <= 100 && t.gap <= 96);
      if (t.mech !== 'tutunma' && !fallbackCatch) continue;
      const key = `${t.mech}-${t.i}`;
      const braced = p.onGround && !s.edgeClimb && s.parkour.state !== 'climb' && right >= t.B.x0 - 8 && right <= t.B.x0;
      if (braced && !pending.has(key) && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) { target = [key, { ...t, mech: 'tutunma' }]; break; }
    }
    if (!target) for (const t of tr) {
      const key = `${t.mech}-${t.i}`;
      if (fired.has(key)) continue;
      const normalLead = id === 'F01' ? 12 : 25;
      if (t.mech === 'normal' && !pending.has(key) && coyote && right >= t.A.x1 - normalLead && right <= t.A.x1 - 2) target = [key, t];
      if (t.mech === 'dive' && !s.edgeClimb && center >= t.x1 + 4 && center <= t.x2 - 4 && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) target = [key, t];
      const catchWindow = right >= t.B.x0 - 58 && right <= t.B.x0 + 4;
      const braced = p.onGround && !s.edgeClimb && s.parkour.state !== 'climb' && right >= t.B.x0 - 8 && right <= t.B.x0;
      if (t.mech === 'tutunma' && !pending.has(key) && (catchWindow || braced) && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) target = [key, t];
      if (target) break;
    }
    if (!target) {
      for (const o of s.route.obstacles.filter(o => o.type === 'vault')) {
        const key = `vault-${o.id}`, inWindow = right >= o.x - 55 && right <= o.x - 18, braced = p.onGround && p.vx <= 1 && right >= o.x - 4 && right <= o.x + 4;
        if (!fired.has(key) && p.onGround && (inWindow || braced) && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) { target = [key, { ...o, mech: 'vault' }]; break; }
      }
    }
    if (!target) {
      for (const o of s.route.obstacles.filter(o => o.type === 'slide')) {
        const key = `slide-${o.id}`, gap = o.x - right;
        if (!fired.has(key) && !pending.has(key) && p.onGround && gap >= 2 && gap <= 36) { target = [key, { ...o, mech: 'slide' }]; break; }
      }
    }
    if (target) {
      if (!pending.has(target[0])) pending.set(target[0], { mech: target[1].mech, at: s.gameClock, wasOnGround: p.onGround });
      lastPress.set(target[0], s.gameClock);
      await jump(page);
      if (target[1].mech === 'vault') fired.add(target[0]);
    }
    if (!target && p.onGround && p.vx <= 1) {
      stuckSince ??= s.gameClock;
      if (s.gameClock - stuckSince >= 1.5) throw new Error(`${id} stuck without target at x=${p.x.toFixed(2)}`);
    } else stuckSince = null;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  return { end, deaths, retries, best: best.filter(Boolean), matches, conditionCount, maxMetric, closestMetric };
}

async function runRoute(browser, id, m, targets = []) {
  mode = m;
  const context = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await boot(page, id);
  const result = await drive(page, id, m, targets);
  await context.close();
  return result;
}

async function combine(browser, prefix, index, beforeFile, afterFile) {
  const page = await browser.newPage({ viewport: { width: viewport.width * 2, height: viewport.height }, deviceScaleFactor: 1 });
  const src = name => `file:///${path.join(out, name).replace(/\\/g, '/')}`;
  await page.setContent(`<style>body{margin:0;display:flex;background:#111}img{width:${viewport.width}px;height:${viewport.height}px;object-fit:contain}</style><img src="${src(beforeFile)}"><img src="${src(afterFile)}">`);
  await page.screenshot({ path: path.join(out, `${prefix}-${index}-before-after.png`) });
  await page.close();
}

test('live bot reproduces and fixes magma/frost video artifacts', async ({ browser }) => {
  test.setTimeout(240000);
  const results = {};
  for (const id of ['M01', 'F01']) {
    results[`before-${id}`] = await runRoute(browser, id, 'before');
    results[`after-${id}`] = await runRoute(browser, id, 'after', results[`before-${id}`].best);
    const prefix = id === 'M01' ? 'b' : 'c';
    for (let i = 0; i < 2; i++) {
      const before = results[`before-${id}`].best[i];
      const after = results[`after-${id}`].matches[i] || results[`after-${id}`].best[i];
      if (before?.file && after?.file) await combine(browser, prefix, i + 1, before.file, after.file);
    }
  }
  const summary = Object.fromEntries(Object.entries(results).map(([key, value]) => [key, {
    conditionCount: value.conditionCount,
    deaths: value.deaths,
    retries: value.retries,
    best: value.best.map(({ file, t, x, score, feetY, artifactY }) => ({ file, t, x, score, feetY, artifactY })),
    matches: value.matches.map(({ file, t, x, score, feetY, artifactY }) => ({ file, t, x, score, feetY, artifactY })),
    maxMetric: value.maxMetric,
    closestMetric: value.closestMetric,
  }]));
  fs.writeFileSync(path.join(out, 'live-results.json'), JSON.stringify(summary, null, 2));
  console.log('VIDEO_FIXES_LIVE ' + JSON.stringify(summary));
  expect(summary['before-M01'].conditionCount).toBeGreaterThan(0);
  expect(summary['before-F01'].conditionCount).toBeGreaterThan(0);
  expect(summary['after-M01'].conditionCount).toBe(0);
  expect(summary['after-F01'].conditionCount).toBe(0);
});
