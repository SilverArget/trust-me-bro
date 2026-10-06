const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const evidence = path.join(__dirname, 'manager-preview', 'd16-walljump');
let server, base;

test.beforeAll(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  const ref = 'E:/assets/referans/vector/bonus/w2w-dev.jpg';
  if (fs.existsSync(ref)) fs.copyFileSync(ref, path.join(evidence, 'vector-reference-w2w-dev.jpg'));
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

async function boot(page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.locator('.characterChoice:visible').first().click();
  await page.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D16');
    __TMB_A12__.startRoute('D16');
    __TMB_A12__.disableChief();
  });
  await page.waitForFunction(() => __TMB_A12__.getState().route.id === 'D16');
}

async function placeInPit(page) {
  return page.evaluate(() => {
    const r = __TMB_A12__.routeDefinition('D16');
    const z = r.wallJumpZones[0];
    __TMB_A12__.placePlayer((z.x1 + z.x2) / 2 - 16, z.yBottom - 48);
    return z;
  });
}

async function pressJump(page, touch) {
  if (touch) {
    const button = page.locator('#jumpWrap button');
    await button.dispatchEvent('pointerdown', { pointerType:'touch', isPrimary:true, button:0, buttons:1 });
    await page.waitForTimeout(45);
    await button.dispatchEvent('pointerup', { pointerType:'touch', isPrimary:true, button:0, buttons:0 });
  } else {
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(45);
    await page.keyboard.up('ArrowUp');
  }
}

async function runAttempt(page, { touch = false, pressDelay = 0, label = 'run', shoot = false } = {}) {
  const z = await placeInPit(page);
  await page.waitForTimeout(Math.max(0, pressDelay));
  if (pressDelay !== null) await pressJump(page, touch);
  const samples = [], started = Date.now();
  let frame = 0;
  while (Date.now() - started < 4200) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    const row = { t:+s.gameClock.toFixed(3), x:+s.player.x.toFixed(2), y:+s.player.y.toFixed(2), feet:+(s.player.y+s.hitbox.h).toFixed(2), state:s.parkour.state, dead:s.dead, run:s.wallJumpRun };
    samples.push(row);
    if (shoot && row.state === 'wallJump' && frame < 10 && samples.length % 6 === 0) {
      await page.screenshot({ path: path.join(evidence, `${label}-frame-${String(frame++).padStart(2, '0')}.png`) });
    }
    if (row.feet <= z.exitY + 2 && row.x >= z.exitX - 44 && row.state !== 'wallJump') break;
    await page.waitForTimeout(16);
  }
  const end = await page.evaluate(() => __TMB_A12__.getState());
  const wall = samples.filter(s => s.state === 'wallJump');
  const minFeet = Math.min(...samples.map(s => s.feet));
  const maxFeet = Math.max(...samples.map(s => s.feet));
  return {
    label, touch, pressDelay, top: end.player.y + end.hitbox.h <= z.exitY + 2 && end.player.x >= z.exitX - 44,
    stuck: false, dead: end.dead, deaths: end.deaths, x:+end.player.x.toFixed(2), feet:+(end.player.y+end.hitbox.h).toFixed(2),
    wallFrames: wall.length, rise:+(maxFeet - minFeet).toFixed(2),
    contacts: wall.flatMap(s => s.run?.contacts || []).filter((v, i, a) => a.indexOf(v) === i),
    duration: wall.length ? +(wall.at(-1).t - wall[0].t).toFixed(3) : 0,
  };
}

test('D16 wall jump keyboard/touch sweep and trajectory', async ({ browser }) => {
  test.setTimeout(60000);
  const rows = [];
  const keyboard = await browser.newPage();
  try {
    await boot(keyboard);
    rows.push(await runAttempt(keyboard, { label:'keyboard', shoot:true }));
    await keyboard.screenshot({ path: path.join(evidence, 'our-d16-walljump.png') });
  } finally { await keyboard.close(); }

  const context = await browser.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true, deviceScaleFactor:1 });
  const touchPage = await context.newPage();
  try {
    await boot(touchPage, { width:390, height:844 });
    rows.push(await runAttempt(touchPage, { touch:true, label:'touch-390x844' }));
  } finally { await context.close(); }

  for (const offset of [-150, -80, 0, 80, 150]) {
    const page = await browser.newPage();
    try {
      await boot(page);
      rows.push(await runAttempt(page, { label:`sweep-${offset}`, pressDelay:Math.max(0, 180 + offset) }));
    } finally { await page.close(); }
  }
  const none = await browser.newPage();
  try {
    await boot(none);
    rows.push(await runAttempt(none, { label:'no-press', pressDelay:null }));
  } finally { await none.close(); }

  fs.writeFileSync(path.join(evidence, 'sweep.json'), JSON.stringify(rows, null, 2) + '\n', 'utf8');
  for (const r of rows) console.log(`WALLJUMP-${r.label} | top=${r.top}, stuck=${r.stuck}, dead=${r.dead}, rise=${r.rise}, duration=${r.duration}, contacts=${r.contacts.join('/') || '-'} | ${r.label === 'no-press' ? 'no top, no death' : 'top, stuck=0'}`);
  for (const r of rows.filter(r => r.label !== 'no-press')) {
    expect(r.top).toBeTruthy();
    expect(r.stuck).toBeFalsy();
    expect(r.dead).toBeFalsy();
    expect(r.rise).toBeGreaterThanOrEqual(73);
    expect(r.rise).toBeLessThanOrEqual(99);
    expect(r.duration).toBeGreaterThanOrEqual(1.89);
    expect(r.duration).toBeLessThanOrEqual(2.57);
  }
  expect(rows.find(r => r.label === 'no-press').dead).toBeFalsy();
  expect(rows.find(r => r.label === 'no-press').top).toBeFalsy();
});
