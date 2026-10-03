const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
let server, base;

test.beforeAll(async () => {
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

async function boot(page, id) {
  await page.setViewportSize({width:1280,height:720});
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.locator('.characterChoice:visible').first().click();
  await page.evaluate(id => { __TMB_A12__.renderWorldOnRoute('dock31', id); __TMB_A12__.startRoute(id); }, id);
  let previousClock = null, stableFrames = 0;
  await sampleUntil(page, s => {
    if (previousClock !== null) {
      const dt = s.gameClock - previousClock;
      stableFrames = dt >= .01 && dt < .03 ? stableFrames + 1 : 0;
    }
    previousClock = s.gameClock;
    return s.gameClock >= .3 && stableFrames >= 5;
  });
  await page.evaluate(() => {
    window.__diveRec = [];
    const record = () => {
      const s = __TMB_A12__.getState(), p = s.player;
      window.__diveRec.push({
        gameClock: s.gameClock,
        x: p.x + s.hitbox.w / 2,
        feet: p.y + s.hitbox.h,
        vy: p.vy,
        onGround: p.onGround,
        state: s.parkour.state,
        diveRun: !!s.diveRun,
        flow: s.flow
      });
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
}

async function recordMark(page) {
  return page.evaluate(() => window.__diveRec.length);
}

async function recordedSince(page, mark) {
  return page.evaluate(mark => window.__diveRec.slice(mark), mark);
}

async function jump(page) {
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(45);
  await page.keyboard.up('ArrowUp');
}

async function sampleUntil(page, predicate, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    if (predicate(s)) return s;
    await page.waitForTimeout(6);
  }
  throw new Error(`sample timeout after ${timeout}ms`);
}

async function placeD02(page) {
  await page.evaluate(() => {
    const h = __TMB_A12__.getState().hitbox.h;
    __TMB_A12__.placePlayer(1590, 21.5 - h);
  });
}

test('R1 D02 buffered dive', async ({page}) => {
  test.setTimeout(30000);
  await boot(page, 'D02');
  await placeD02(page);
  await page.keyboard.down('ArrowRight');
  const pressed = await sampleUntil(page, s => {
    const p=s.player, center=p.x+s.hitbox.w/2, feet=p.y+s.hitbox.h;
    return center>1669.8&&!p.onGround&&p.vy>0&&(65-feet)/p.vy<=.10;
  });
  const mark = await recordMark(page);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(45);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  const rec = await recordedSince(page, mark);
  const landedIndex = rec.findIndex(r => r.onGround);
  const landedAt = landedIndex < 0 ? null : rec[landedIndex].gameClock;
  const landingWindow = landedIndex < 0 ? [] : rec.filter((r, i) => i >= landedIndex && r.gameClock - landedAt <= .30);
  const diveSeen = landingWindow.some(r => r.diveRun || r.state === 'dive');
  const badNormalLaunch = landingWindow.some(r => r.vy <= -500 && r.state === 'normal');
  const pp=pressed.player, tti=(65-(pp.y+pressed.hitbox.h))/pp.vy;
  console.log(`R1 | pressCenter=${(pp.x+pressed.hitbox.w/2).toFixed(2)}, tti=${tti.toFixed(4)}s, landed=${landedAt!==null}, dive=${diveSeen}, badNormalLaunch=${badNormalLaunch} | 6ms samples + ArrowRight/ArrowUp(45ms) | D02 buffered landing | ground-dive P1`);
  expect(landedAt).not.toBeNull();
  expect(diveSeen).toBeTruthy();
  expect(badNormalLaunch).toBeFalsy();
});

test('P1 D02 grounded dive', async ({page}) => {
  test.setTimeout(30000);
  await boot(page, 'D02');
  await placeD02(page);
  await page.keyboard.down('ArrowRight');
  const pressed=await sampleUntil(page,s=>{const p=s.player,center=p.x+s.hitbox.w/2,feet=p.y+s.hitbox.h;return p.onGround&&center>=1690&&center<=1787.6&&Math.abs(feet-65)<2;});
  const mark = await recordMark(page);
  await jump(page);
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  const rec = await recordedSince(page, mark);
  const startClock = rec[0]?.gameClock;
  const diveSeen = rec.some(r => r.gameClock - startClock <= .30 && (r.diveRun || r.state === 'dive'));
  console.log(`P1 | pressCenter=${(pressed.player.x+pressed.hitbox.w/2).toFixed(2)}, feet=${(pressed.player.y+pressed.hitbox.h).toFixed(2)}, dive=${diveSeen} | 6ms samples + ArrowRight/ArrowUp(45ms) | D02 grounded | R1 timing predicate`);
  expect(diveSeen).toBeTruthy();
});

test('N1 D03 buffered normal jump', async ({page}) => {
  test.setTimeout(30000);
  await boot(page, 'D03');
  await page.keyboard.down('ArrowRight');
  const ground=await sampleUntil(page,s=>s.player.onGround);
  const groundFeet=ground.player.y+ground.hitbox.h;
  await jump(page);
  const pressed=await sampleUntil(page,s=>{const p=s.player,feet=p.y+s.hitbox.h;return !p.onGround&&p.vy>0&&(groundFeet-feet)/p.vy<=.10;});
  const mark = await recordMark(page);
  await jump(page);
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  const rec = await recordedSince(page, mark);
  let landedIndex = rec.findIndex(r => r.onGround);
  if (landedIndex < 0) landedIndex = rec.findIndex((r, i) => i > 0 && rec[i - 1].vy > 0 && r.vy < 0);
  const landedAt = landedIndex < 0 ? null : rec[landedIndex].gameClock;
  const landingWindow = landedIndex < 0 ? [] : rec.filter((r, i) => i >= landedIndex && r.gameClock - landedAt <= .20);
  const normalLaunch = landingWindow.some(r => r.vy < 0);
  const diveSeen = rec.some(r => r.diveRun || r.state === 'dive');
  const pp=pressed.player,tti=(groundFeet-(pp.y+pressed.hitbox.h))/pp.vy;
  console.log(`N1 | tti=${tti.toFixed(4)}s, landed=${landedAt!==null}, normalLaunch=${normalLaunch}, dive=${diveSeen} | 6ms samples + running D03 + two ArrowUp(45ms) | non-vector-v1 | first normal jump`);
  expect(landedAt).not.toBeNull();
  expect(normalLaunch).toBeTruthy();
  expect(diveSeen).toBeFalsy();
});

test('R2 D01 slide flow credit', async ({page}) => {
  test.setTimeout(30000);
  await boot(page, 'D01');
  const initial = await page.evaluate(() => __TMB_A12__.getState().flow);
  await page.evaluate(() => {
    const s = __TMB_A12__.getState(), definition = __TMB_A12__.routeDefinition('D01');
    const slide = s.route.obstacles.find(o => o.type === 'slide');
    const x = slide.x - 100;
    const ground = definition.groundSegments.find(g => x + s.hitbox.w / 2 >= g.x && x + s.hitbox.w / 2 <= g.x + g.w);
    __TMB_A12__.placePlayer(x, ground.y - s.hitbox.h);
  });
  await page.keyboard.down('ArrowRight');
  await sampleUntil(page, s => {
    const slide = s.route.obstacles.find(o => o.type === 'slide');
    const gap = slide.x - (s.player.x + s.hitbox.w);
    return s.player.onGround && gap >= 2 && gap <= 36;
  });
  const mark = await recordMark(page);
  await jump(page);
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  const rec = await recordedSince(page, mark);
  const slideIndex = rec.findIndex(r => r.state === 'slide');
  const slideSeen = slideIndex >= 0;
  const slideAt = slideSeen ? rec[slideIndex].gameClock : null;
  const flowAfter = slideSeen
    ? Math.max(...rec.filter((r, i) => i >= slideIndex && r.gameClock - slideAt <= .5).map(r => r.flow))
    : initial;
  const observedSlide = slideSeen;
  console.log(`R2 | initialFlow=${initial}, flow=${flowAfter}, slide=${slideSeen}, observedSlide=${observedSlide} | stable warmup + ArrowRight/ArrowUp(45ms), gap [2,36] | D01 slide flow | parkour slide state`);
  expect(slideSeen).toBeTruthy();
  expect(flowAfter).toBeGreaterThan(initial);
  expect(observedSlide).toBeTruthy();
});
