const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'd04-geri-atma');

let server;
let base;

test.beforeAll(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
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

async function bootD04(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D04');
    __TMB_A12__.startRoute('D04');
    __TMB_A12__.disableChief();
  });
  await page.waitForFunction(() => __TMB_A12__.getState().route.id === 'D04');
}

async function runStairs(page, { jumps = false, screenshotName = null } = {}) {
  await page.evaluate(() => {
    __tmbSegmentStart(5528);
    __TMB_A12__.disableChief();
    window.__d04StairSamples = [];
  });
  await page.keyboard.down('ArrowRight');
  let lastJumpAt = 0;
  const started = Date.now();
  while (Date.now() - started < 6000) {
    const s = await page.evaluate(() => {
      __tmbCampaignStep(1 / 60);
      const q = __TMB_A12__.getState();
      window.__d04StairSamples.push({
        t: +q.gameClock.toFixed(3),
        x: +q.player.x.toFixed(3),
        y: +q.player.y.toFixed(3),
        vx: +q.player.vx.toFixed(3),
        vy: +q.player.vy.toFixed(3),
        onGround: q.player.onGround,
        state: q.player.state,
        dead: q.dead,
        deaths: q.deaths,
        chiefCaught: !!q.chief?.caughtT,
        edgeClimb: q.edgeClimb?.wallId || null,
        checkpointX: q.checkpointX,
      });
      return q;
    });
    if (s.player.x >= 6300 || s.dead || s.deaths) break;
    if (jumps && s.player.onGround && s.player.x >= 5560 && s.player.x <= 6230 && Date.now() - lastJumpAt > 360) {
      lastJumpAt = Date.now();
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(45);
      await page.keyboard.up('ArrowUp');
    }
  }
  await page.keyboard.up('ArrowRight');
  if (screenshotName) {
    await page.evaluate(() => __tmbCampaignDraw());
    await page.screenshot({ path: path.join(outDir, screenshotName) });
  }
  return page.evaluate(() => {
    const rows = window.__d04StairSamples || [];
    let maxBack = 0;
    let minVx = Infinity;
    let stuckFrames = 0;
    let firstBack = null;
    let firstStuck = null;
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1], row = rows[i];
      if (row.x >= 5530 && row.x <= 6290) {
        minVx = Math.min(minVx, row.vx);
        if (row.onGround && row.vx <= 1) {
          stuckFrames++;
          firstStuck ||= row;
        }
      }
      const back = prev.x - row.x;
      if (back > maxBack) {
        maxBack = back;
        firstBack = { prev, row, back };
      }
    }
    return { rows, end: rows.at(-1), maxBack, minVx, stuckFrames, firstBack, firstStuck };
  });
}

test('D04 long staircase is passable with right held and ordinary jumps', async ({ page }) => {
  test.setTimeout(20000);
  await bootD04(page);
  const r = await runStairs(page, { jumps: true, screenshotName: 'sonra.png' });
  console.log(`D04-STAIR-PASS ${JSON.stringify({ end: r.end, maxBack: r.maxBack, minVx: r.minVx, stuckFrames: r.stuckFrames, firstStuck: r.firstStuck })}`);
  expect(r.end.x).toBeGreaterThanOrEqual(6300);
  expect(r.end.deaths).toBe(0);
  expect(r.end.dead).toBeFalsy();
  expect(r.end.chiefCaught).toBeFalsy();
  expect(r.maxBack).toBeLessThanOrEqual(2);
  expect(r.stuckFrames).toBeLessThanOrEqual(6);
});

test('D04 long staircase right-only probe records no reset or chief catch', async ({ page }) => {
  test.setTimeout(20000);
  await bootD04(page);
  const r = await runStairs(page, { jumps: false, screenshotName: 'once.png' });
  console.log(`D04-STAIR-PROBE ${JSON.stringify({ end: r.end, maxBack: r.maxBack, minVx: r.minVx, stuckFrames: r.stuckFrames, firstBack: r.firstBack, firstStuck: r.firstStuck })}`);
  expect(r.end.deaths).toBe(0);
  expect(r.end.chiefCaught).toBeFalsy();
});
