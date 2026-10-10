const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const evidenceDir = path.join(__dirname, 'manager-preview', 'tur15');
const routes = {
  D02: { start: 300, end: 565, prefixes: ['d02-roof1-', 'd02-roof2-'] },
  D04: { start: 5528, end: 6300, prefixes: ['d04-long-'] },
  F05: { start: 370, end: 635, prefixes: ['f05-p1-d02-roof1-', 'f05-p1-d02-roof2-'] },
  F06: { start: 6280, end: 6555, prefixes: ['f06-p3-d02-roof1-', 'f06-p3-d02-roof2-'] },
};
const views = [
  { name: 'landscape-915x412', viewport: { width: 915, height: 412 }, mobile: false },
  { name: 'android-412x915', viewport: { width: 412, height: 915 }, mobile: true },
];

let server;
let base;

test.beforeAll(async () => {
  fs.mkdirSync(evidenceDir, { recursive: true });
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

async function boot(page, id, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(id => {
    __TMB_A12__.unlockAllRoutes();
    const world = id[0] === 'F' ? 'frozen' : id[0] === 'A' ? 'aftermath' : 'dock31';
    __TMB_A12__.renderWorldOnRoute(world, id);
    __TMB_A12__.startRoute(id);
  }, id);
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, id);
}

async function runDescent(page, id, config, jumps, screenshot) {
  await page.evaluate(start => {
    __tmbSegmentStart(start);
    __TMB_A12__.disableChief();
  }, config.start);
  await page.keyboard.down('ArrowRight');
  const rows = [];
  let nextJump = 0.2;
  let captured = false;
  for (let frame = 0; frame < 600; frame++) {
    const before = await page.evaluate(() => __TMB_A12__.getState());
    const jumpNow = jumps && before.player.onGround && before.gameClock >= nextJump;
    if (jumpNow) {
      nextJump = before.gameClock + 0.42;
      await page.keyboard.down('ArrowUp');
    }
    const state = await page.evaluate(() => {
      __tmbCampaignStep(1 / 60);
      const s = __TMB_A12__.getState();
      return { t:s.gameClock, x:s.player.x, y:s.player.y, vx:s.player.vx, onGround:s.player.onGround, dead:s.dead, deaths:s.deaths };
    });
    if (jumpNow) await page.keyboard.up('ArrowUp');
    rows.push(state);
    if (!captured && state.x >= (config.start + config.end) / 2) {
      captured = true;
      await page.evaluate(() => __tmbCampaignDraw());
      await page.screenshot({ path: screenshot });
    }
    if (state.x >= config.end || state.dead || state.deaths) break;
  }
  await page.keyboard.up('ArrowRight');
  if (!captured) {
    await page.evaluate(() => __tmbCampaignDraw());
    await page.screenshot({ path: screenshot });
  }
  let maxBack = 0;
  let stuckFrames = 0;
  for (let i = 1; i < rows.length; i++) {
    maxBack = Math.max(maxBack, rows[i - 1].x - rows[i].x);
    if (rows[i].onGround && rows[i].vx <= 1) stuckFrames++;
  }
  return { end: rows.at(-1), maxBack, stuckFrames, frames: rows.length };
}

for (const view of views) {
  test(`solid stair descent matrix ${view.name}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: view.viewport, hasTouch: view.mobile, isMobile: view.mobile, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const results = [];
    try {
      for (const [id, config] of Object.entries(routes)) {
        await boot(page, id, view.viewport);
        const definition = await page.evaluate(id => __TMB_A12__.routeDefinition(id), id);
        const steps = definition.groundSegments.filter(s => config.prefixes.some(prefix => s.id.startsWith(prefix)));
        expect(steps.length, `${id} visible step count`).toBe(id === 'D04' ? 8 : 6);
        expect(steps.every(s => s.solid !== false), `${id} steps stay solid`).toBeTruthy();
        for (const mode of ['right-only', 'jumps']) {
          const screenshot = path.join(evidenceDir, `${id}-${view.name}-${mode}.png`);
          const result = await runDescent(page, id, config, mode === 'jumps', screenshot);
          results.push({ route:id, view:view.name, mode, ...result, endX:result.end?.x, deaths:result.end?.deaths });
          expect(result.end?.x, `${id} ${view.name} ${mode} end`).toBeGreaterThanOrEqual(config.end);
          expect(result.end?.deaths, `${id} ${view.name} ${mode} deaths`).toBe(0);
          expect(result.maxBack, `${id} ${view.name} ${mode} maxBack`).toBeLessThanOrEqual(2);
          expect(result.stuckFrames, `${id} ${view.name} ${mode} stuck`).toBe(0);
        }
      }
    } finally {
      await context.close();
    }
    console.log(`TUR15-STAIRS ${JSON.stringify(results)}`);
  });
}

test('D04 stopped chief keeps distance, then catches on first <=4px contact', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 915, height: 412 } });
  const page = await context.newPage();
  try {
    await boot(page, 'D04', { width: 915, height: 412 });
    await page.evaluate(() => {
      __TMB_A12__.placePlayerAtChiefTime(14.2);
      window.__tmbXWriteLog = [];
    });
    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 6; i++) await page.evaluate(() => __tmbCampaignStep(1 / 60));
    await page.keyboard.up('ArrowRight');
    for (let i = 0; i < 12; i++) {
      const vx = await page.evaluate(() => { __tmbCampaignStep(1 / 60); return __TMB_A12__.getState().player.vx; });
      if (Math.abs(vx) < 70) break;
    }
    await page.evaluate(() => __TMB_A12__.forceChiefNear(-160));
    const start = await page.evaluate(() => __TMB_A12__.getState());
    const frames = [];
    for (let i = 0; i < 240; i++) {
      const s = await page.evaluate(() => {
        __tmbCampaignStep(1 / 60);
        const q = __TMB_A12__.getState();
        return { t:q.gameClock, catches:q.chief.catches, caughtT:q.chief.caughtT, playerX:q.player.x, playerY:q.player.y, vx:q.player.vx, onGround:q.player.onGround, state:q.player.state, chiefX:q.chief.x, chiefY:q.chief.y, gap:q.player.x-(q.chief.x+q.chief.w) };
      });
      frames.push(s);
      if (s.catches > start.chief.catches) break;
    }
    const caught = frames.at(-1);
    const catchLog = await page.evaluate(() => window.__tmbXWriteLog.findLast(row => row.source === 'chief-catch-reset'));
    const uncaughtAdjacent = frames.filter(row => row.catches === start.chief.catches && row.gap <= 4).length;
    const catchSeconds = caught.t - start.gameClock;
    await page.evaluate(() => __tmbCampaignDraw());
    await page.screenshot({ path: path.join(evidenceDir, 'D04-chief-after-catch-915x412.png') });
    console.log(`TUR15-CHIEF ${JSON.stringify({catchSeconds,uncaughtAdjacent,catchLog,firstSecondCatches:frames.find(row=>row.t-start.gameClock>=1)?.catches-start.chief.catches,tail:frames.slice(-5)})}`);
    expect(frames.find(row => row.t - start.gameClock >= 1)?.catches).toBe(start.chief.catches);
    expect(caught.catches).toBe(start.chief.catches + 1);
    expect(catchSeconds).toBeGreaterThanOrEqual(1);
    expect(catchSeconds).toBeLessThanOrEqual(3);
    expect(uncaughtAdjacent).toBe(0);
    expect(catchLog.beforeX - (catchLog.chiefX + 32)).toBeLessThanOrEqual(4);
  } finally {
    await context.close();
  }
});

for (const id of ['D04', 'A02']) {
  test(`${id} retry starts chief a full delay behind`, async ({ page }) => {
    await boot(page, id, { width: 915, height: 412 });
    const result = await page.evaluate(id => {
      const route = __TMB_A12__.routeDefinition(id);
      const checkpoint = route.checkpoints[1];
      __tmbSegmentStart(checkpoint + 8);
      __tmbCampaignStep(1 / 60);
      __TMB_A12__.retry(false);
      const initial = __TMB_A12__.getState();
      const rows = [];
      for (let i = 0; i < 120; i++) {
        __tmbCampaignStep(1 / 60);
        const s = __TMB_A12__.getState();
        rows.push({t:s.gameClock,x:s.chief.x,gap:s.player.x-(s.chief.x+s.chief.w),delay:s.chief.delay,timeGap:s.chief.playerT-s.chief.chiefT,catches:s.chief.catches});
      }
      return {initial:{playerX:initial.player.x,chiefX:initial.chief.x,delay:initial.chief.delay,timeGap:initial.chief.playerT-initial.chief.chiefT,gap:initial.player.x-(initial.chief.x+initial.chief.w)},firstTwoSeconds:{minGap:Math.min(...rows.map(row=>row.gap)),catches:Math.max(...rows.map(row=>row.catches)),samples:rows.length}};
    }, id);
    console.log(`TUR15-RESPAWN-${id} ${JSON.stringify(result)}`);
    expect(result.initial.gap).toBeGreaterThan(4);
    expect(result.initial.timeGap).toBeGreaterThanOrEqual(result.initial.delay - 0.02);
    expect(result.firstTwoSeconds.catches).toBe(0);
  });
}
