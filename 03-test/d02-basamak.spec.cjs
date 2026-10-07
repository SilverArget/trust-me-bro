const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'd02-basamak');

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

async function bootD02(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D02');
    __TMB_A12__.startRoute('D02');
    __TMB_A12__.disableChief();
  });
  await page.waitForFunction(() => __TMB_A12__.getState().route.id === 'D02');
}

async function runOpeningSteps(page, { jumps = true, screenshotName = null } = {}) {
  await page.evaluate(() => {
    __TMB_A12__.placePlayer(70, -224.2 - 48);
    __TMB_A12__.disableChief();
    window.__d02StepSamples = [];
  });
  await page.keyboard.down('ArrowRight');
  let lastJumpAt = 0;
  let lastX = -Infinity;
  let noProgressMs = 0;
  let captured = false;
  const started = Date.now();
  while (Date.now() - started < 7000) {
    const s = await page.evaluate(() => {
      __tmbCampaignStep(1 / 60);
      const q = __TMB_A12__.getState();
      window.__d02StepSamples.push({
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
    if (screenshotName && !captured && s.player.x >= 430 && s.player.x <= 560) {
      captured = true;
      await page.evaluate(() => __tmbCampaignDraw());
      await page.screenshot({ path: path.join(outDir, screenshotName) });
    }
    if (s.player.x >= 1160 || s.dead || s.deaths) break;
    const now = Date.now();
    if (s.player.x > lastX + 0.25) {
      lastX = s.player.x;
      noProgressMs = 0;
    } else {
      noProgressMs += 16;
    }
    if (jumps && s.player.onGround && noProgressMs > 250 && now - lastJumpAt > 420) {
      lastJumpAt = now;
      noProgressMs = 0;
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(45);
      await page.keyboard.up('ArrowUp');
    }
  }
  await page.keyboard.up('ArrowRight');
  if (screenshotName && !captured) {
    await page.evaluate(() => __tmbCampaignDraw());
    await page.screenshot({ path: path.join(outDir, screenshotName) });
  }
  return page.evaluate(() => {
    const rows = window.__d02StepSamples || [];
    let maxBack = 0;
    let minVx = Infinity;
    let stuckFrames = 0;
    let firstBack = null;
    let firstStuck = null;
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1], row = rows[i];
      if (row.x >= 40 && row.x <= 1120) {
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

test('D02 opening roof steps are passable with right held and ordinary jumps', async ({ page }) => {
  test.setTimeout(20000);
  await bootD02(page);
  const r = await runOpeningSteps(page, { jumps: true, screenshotName: 'sonra.png' });
  console.log(`D02-STEP-PASS ${JSON.stringify({ end: r.end, maxBack: r.maxBack, minVx: r.minVx, stuckFrames: r.stuckFrames, firstBack: r.firstBack, firstStuck: r.firstStuck })}`);
  expect(r.end.x).toBeGreaterThanOrEqual(1160);
  expect(r.end.deaths).toBe(0);
  expect(r.end.dead).toBeFalsy();
  expect(r.end.chiefCaught).toBeFalsy();
  expect(r.maxBack).toBeLessThanOrEqual(2);
});

test('D02 opening right-only probe records blocker class', async ({ page }) => {
  test.setTimeout(20000);
  await bootD02(page);
  await runOpeningSteps(page, { jumps: true, screenshotName: 'once.png' });
  await bootD02(page);
  const r = await runOpeningSteps(page, { jumps: false });
  console.log(`D02-STEP-PROBE ${JSON.stringify({ end: r.end, maxBack: r.maxBack, minVx: r.minVx, stuckFrames: r.stuckFrames, firstBack: r.firstBack, firstStuck: r.firstStuck })}`);
  expect(r.end.deaths).toBe(0);
  expect(r.end.chiefCaught).toBeFalsy();
});
