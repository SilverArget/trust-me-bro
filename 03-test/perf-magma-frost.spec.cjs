const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'manager-preview', 'perf-magma-frost');
const beforeJs = cp.execFileSync('git', ['show', 'HEAD:js/a12-campaign.js'], { cwd: root, encoding: 'utf8' });
const afterJs = fs.readFileSync(path.join(root, 'js/a12-campaign.js'), 'utf8');
let mode = 'after', server, base;

test.beforeAll(async () => {
  fs.mkdirSync(out, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    if (rel === 'js/a12-campaign.js') {
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(mode === 'before' ? beforeJs : afterJs);
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

async function boot(page, world, id, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto(base + `?v=${mode}-${world}-${id}-${Date.now()}#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(({ world, id }) => {
    __TMB_A12__.renderWorldOnRoute(world, id);
    __TMB_A12__.startRoute(id);
  }, { world, id });
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, id);
}

async function bench(page, world) {
  await boot(page, world, world === 'dock31' ? 'D01' : world === 'magma' ? 'M01' : 'F01');
  await page.evaluate(world => __TMB_A12__.benchmarkWorldDraw(world, 12), world);
  return await page.evaluate(world => __TMB_A12__.benchmarkWorldDraw(world, 180), world);
}

async function live(page, world, id) {
  await boot(page, world, id, { width: 390, height: 844 });
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.keyboard.down('ArrowRight');
  const rows = await page.evaluate(() => new Promise(resolve => {
    const deltas = [];
    let last = performance.now();
    const start = last;
    function tick(now) {
      deltas.push(now - last);
      last = now;
      if (now - start >= 20000) resolve(deltas.slice(1));
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
  await page.keyboard.up('ArrowRight');
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  rows.sort((a, b) => a - b);
  const pick = p => rows[Math.min(rows.length - 1, Math.floor(rows.length * p))];
  return { frames: rows.length, p50: pick(.50), p95: pick(.95) };
}

async function shotData(page, world, id, x, tag) {
  await boot(page, world, id);
  const data = await page.evaluate(({ x }) => {
    __TMB_A12__.disableChief();
    const s = __TMB_A12__.getState();
    const r = __TMB_A12__.routeDefinition(s.route.id);
    const g = r.groundSegments.find(v => v.x <= x && x <= v.x + v.w) || r.groundSegments[0];
    __TMB_A12__.placePlayer(x, g.y - s.hitbox.h);
    for (let i = 0; i < 45; i++) __tmbCampaignStep(1 / 60);
    __tmbCampaignDraw();
    const c = document.querySelector('#game'), ctx = c.getContext('2d');
    return { w: c.width, h: c.height, pixels: Array.from(ctx.getImageData(0, 0, c.width, c.height).data) };
  }, { x });
  await page.screenshot({ path: path.join(out, `${mode}-${id}-${tag}.png`) });
  return data;
}

function diffPixels(a, b) {
  expect(a.w).toBe(b.w); expect(a.h).toBe(b.h);
  let changed = 0, max = 0;
  for (let i = 0; i < a.pixels.length; i += 4) {
    const d = Math.max(Math.abs(a.pixels[i] - b.pixels[i]), Math.abs(a.pixels[i + 1] - b.pixels[i + 1]), Math.abs(a.pixels[i + 2] - b.pixels[i + 2]), Math.abs(a.pixels[i + 3] - b.pixels[i + 3]));
    if (d > 2) changed++;
    if (d > max) max = d;
  }
  return { changedPct: +(changed / (a.w * a.h) * 100).toFixed(5), max };
}

test('perf magma/frost before-after evidence', async ({ browser }) => {
  test.setTimeout(540000);
  const results = { benchmark: {}, live: {}, pixels: {}, chief: {} };
  for (const m of ['before', 'after']) {
    mode = m;
    const page = await browser.newPage();
    for (const world of ['dock31', 'magma', 'frozen']) results.benchmark[`${m}-${world}`] = +(await bench(page, world)).toFixed(3);
    for (const [world, id] of [['dock31', 'D01'], ['magma', 'M01'], ['frozen', 'F01']]) results.live[`${m}-${id}`] = await live(page, world, id);
    await page.close();
  }
  for (const [world, id, xs] of [['magma', 'M01', [220, 1250, 2500]], ['frozen', 'F01', [220, 1250, 2500]]]) {
    for (let i = 0; i < xs.length; i++) {
      mode = 'before'; const beforePage = await browser.newPage(); const before = await shotData(beforePage, world, id, xs[i], `cam${i + 1}`); await beforePage.close();
      mode = 'after'; const afterPage = await browser.newPage(); const after = await shotData(afterPage, world, id, xs[i], `cam${i + 1}`); await afterPage.close();
      results.pixels[`${id}-cam${i + 1}`] = diffPixels(before, after);
    }
  }
  mode = 'after';
  const page = await browser.newPage();
  await boot(page, 'dock31', 'D01');
  for (const id of [...Array.from({ length: 18 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`), 'F01', 'F02', 'F03', 'F04']) {
    results.chief[id] = await page.evaluate(id => __TMB_A12__.chiefPathStatus(id), id);
  }
  await page.close();
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log('PERF_MAGMA_FROST ' + JSON.stringify(results));
});
