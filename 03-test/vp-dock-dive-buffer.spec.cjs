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
  await page.keyboard.down('ArrowRight');
}

async function jump(page) {
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
  let pressed, landedAt = null, diveSeen = false, badNormalLaunch = false;
  pressed = await sampleUntil(page, s => {
    const p=s.player, center=p.x+s.hitbox.w/2, feet=p.y+s.hitbox.h;
    return center>1669.8&&!p.onGround&&p.vy>0&&(65-feet)/p.vy<=.10;
  });
  await jump(page);
  const started=Date.now();
  while(Date.now()-started<2000){
    const s=await page.evaluate(()=>__TMB_A12__.getState()),p=s.player;
    if(landedAt===null&&p.onGround)landedAt=Date.now();
    if(landedAt!==null){
      diveSeen ||= !!s.diveRun||s.parkour.state==='dive';
      badNormalLaunch ||= p.vy<=-500&&s.parkour.state==='normal';
      if(Date.now()-landedAt>=300)break;
    }
    await page.waitForTimeout(6);
  }
  await page.keyboard.up('ArrowRight');
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
  const pressed=await sampleUntil(page,s=>{const p=s.player,center=p.x+s.hitbox.w/2,feet=p.y+s.hitbox.h;return p.onGround&&center>=1690&&center<=1787.6&&Math.abs(feet-65)<2;});
  await jump(page);
  let diveSeen=false;
  const started=Date.now();
  while(Date.now()-started<300){const s=await page.evaluate(()=>__TMB_A12__.getState());diveSeen||=!!s.diveRun||s.parkour.state==='dive';await page.waitForTimeout(6)}
  await page.keyboard.up('ArrowRight');
  console.log(`P1 | pressCenter=${(pressed.player.x+pressed.hitbox.w/2).toFixed(2)}, feet=${(pressed.player.y+pressed.hitbox.h).toFixed(2)}, dive=${diveSeen} | 6ms samples + ArrowRight/ArrowUp(45ms) | D02 grounded | R1 timing predicate`);
  expect(diveSeen).toBeTruthy();
});

test('N1 D03 buffered normal jump', async ({page}) => {
  test.setTimeout(30000);
  await boot(page, 'D03');
  const ground=await sampleUntil(page,s=>s.player.onGround);
  const groundFeet=ground.player.y+ground.hitbox.h;
  await jump(page);
  const pressed=await sampleUntil(page,s=>{const p=s.player,feet=p.y+s.hitbox.h;return !p.onGround&&p.vy>0&&(groundFeet-feet)/p.vy<=.10;});
  await jump(page);
  let landedAt=null, normalLaunch=false, diveSeen=false;
  const started=Date.now();
  while(Date.now()-started<2000){
    const s=await page.evaluate(()=>__TMB_A12__.getState()),p=s.player;
    diveSeen||=!!s.diveRun||s.parkour.state==='dive';
    if(landedAt===null&&p.onGround)landedAt=Date.now();
    if(landedAt!==null&&Date.now()-landedAt<=200&&p.vy<0)normalLaunch=true;
    if(landedAt!==null&&Date.now()-landedAt>=200)break;
    await page.waitForTimeout(6);
  }
  await page.keyboard.up('ArrowRight');
  const pp=pressed.player,tti=(groundFeet-(pp.y+pressed.hitbox.h))/pp.vy;
  console.log(`N1 | tti=${tti.toFixed(4)}s, landed=${landedAt!==null}, normalLaunch=${normalLaunch}, dive=${diveSeen} | 6ms samples + running D03 + two ArrowUp(45ms) | non-vector-v1 | first normal jump`);
  expect(landedAt).not.toBeNull();
  expect(normalLaunch).toBeTruthy();
  expect(diveSeen).toBeFalsy();
});
