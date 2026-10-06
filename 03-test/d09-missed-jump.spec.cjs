const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'd09-ofissiz');
const transitionPath = path.join(__dirname, 'dock18-generated', 'transitions-D09.json');
const transitions = JSON.parse(fs.readFileSync(transitionPath, 'utf8'));
let server;
let base;

test.beforeAll(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (err, body) => {
      if (err) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function boot(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D09');
    __TMB_A12__.startRoute('D09');
  });
  await page.keyboard.down('ArrowRight');
}

async function tapJump(page) {
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(45);
  await page.keyboard.up('ArrowUp');
}

test('D09 missed jump variants do not trap the runner', async ({ page }) => {
  test.setTimeout(120000);
  const jumps = transitions.filter(t => t.mech === 'normal' || t.mech === 'dive' || t.mech === 'tutunma');
  const variants = [-250, -120, 120, 250, null];
  const rows = [];
  let stuck = 0;

  for (let pressNo = 0; pressNo < Math.min(5, jumps.length); pressNo++) {
    for (const variant of variants) {
      await boot(page);
      const target = jumps[pressNo];
      let lastProgress = null;
      let stuckSince = null;
      const start = Date.now();
      while (Date.now() - start < 35000) {
        const s = await page.evaluate(() => __TMB_A12__.getState());
        const right = s.player.x + s.hitbox.w;
        if (s.result || right >= s.route.finishX || s.deaths || s.chief?.catches) break;
        const triggerX = target.mech === 'dive' ? target.x1 : target.A.x1 - 25;
        const lead = variant === null ? Infinity : Math.max(0, variant);
        if (variant !== null && right >= triggerX + lead && !target.fired) {
          target.fired = true;
          await tapJump(page);
        }
        if (!lastProgress || s.player.x - lastProgress.x >= 24) {
          lastProgress = { x: s.player.x, t: s.gameClock };
          stuckSince = null;
        } else if (!s.dead) {
          stuckSince ??= s.gameClock;
        }
        if (stuckSince !== null && s.gameClock - stuckSince >= 1.5) {
          stuck++;
          break;
        }
        await page.waitForTimeout(16);
      }
      const end = await page.evaluate(() => __TMB_A12__.getState());
      rows.push({ pressNo, variant, x: +end.player.x.toFixed(2), deaths: end.deaths, chief: end.chief?.catches || 0, stuck: stuckSince !== null });
      await page.keyboard.up('ArrowRight');
    }
  }
  fs.writeFileSync(path.join(outDir, 'missed-jump.json'), JSON.stringify(rows, null, 2) + '\n', 'utf8');
  expect(stuck).toBe(0);
});
