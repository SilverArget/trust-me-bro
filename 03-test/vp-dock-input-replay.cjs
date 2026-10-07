const fs = require('fs');
const http = require('http');
const path = require('path');
let chromium;
try {
  ({ chromium } = require('@playwright/test'));
} catch {
  ({ chromium } = require('C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright'));
}

const root = path.join(__dirname, '..');
const dataRoot = 'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d03d04';
const transitions = JSON.parse(fs.readFileSync(path.join(dataRoot, 'transitions-D03.json'), 'utf8'));

function serverForRoot() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (error, body) => {
      if (error) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function boot(page, base) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbCampaignStep);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D03');
    __TMB_A12__.startRoute('D03');
    __tmbParkour.manual();
    __tmbResetFixedStep();
  });
}

async function setKeys(page, keys) {
  await page.evaluate(({ right, jump }) => {
    const fire = (name, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key: name, code: name, bubbles: true, cancelable: true
    }));
    fire('ArrowRight', !!right);
    fire('ArrowUp', !!jump);
  }, keys);
}

function snapshot(s) {
  return {
    x: +s.player.x.toFixed(3),
    y: +s.player.y.toFixed(3),
    vx: +s.player.vx.toFixed(3),
    vy: +s.player.vy.toFixed(3),
    onGround: !!s.player.onGround,
    state: s.parkour.state,
    coins: [...s.economy.collectedCoinIds].sort()
  };
}

function sameSnapshot(a, b) {
  return Math.abs(a.x - b.x) <= 0.001
    && Math.abs(a.y - b.y) <= 0.001
    && Math.abs(a.vx - b.vx) <= 0.001
    && Math.abs(a.vy - b.vy) <= 0.001
    && a.onGround === b.onGround
    && a.state === b.state
    && a.coins.join(',') === b.coins.join(',');
}

async function record60(page) {
  const fired = new Set(), pending = new Map(), lastPress = new Map(), frames = [];
  let lastGroundAt = -Infinity, jumpFrames = 0, rightOffFrames = 0, previousX = 0;
  await setKeys(page, { right: true, jump: false });
  for (let step = 0; step < 2400; step++) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    const p = s.player, right = p.x + s.hitbox.w, center = p.x + s.hitbox.w / 2;
    if (p.onGround) lastGroundAt = s.gameClock;
    const coyote = p.onGround || s.gameClock - lastGroundAt <= .12;
    for (const [key, q] of pending) {
      const happened = q.mech === 'dive' ? (!!s.diveRun || s.parkour.state === 'dive')
        : q.mech === 'tutunma' ? (s.parkour.state === 'catch' || s.parkour.state === 'climb')
        : q.wasOnGround && !p.onGround;
      if (happened) { fired.add(key); pending.delete(key); }
      else if (s.gameClock - q.at >= .6) pending.delete(key);
    }
    let target = null;
    for (const t of transitions) {
      const key = `${t.mech}-${t.i}`;
      if (fired.has(key)) continue;
      if (t.mech === 'normal' && !pending.has(key) && coyote && right >= t.A.x1 - 25 && right <= t.A.x1 - 2) target = [key, t];
      if (t.mech === 'high' && !pending.has(key) && coyote && center >= t.x1 && center <= t.x2 && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) target = [key, t];
      if (t.mech === 'dive' && !pending.has(key) && !s.edgeClimb && center >= t.x1 + 4 && center <= t.x2 - 4 && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) target = [key, t];
      const lowStep = t.mech === 'tutunma' && t.B.id === 'd03-v-16';
      if (lowStep && !pending.has(key) && right >= t.B.x0 - 125 && right <= t.B.x0 - 105) target = [key, { ...t, mech: 'normal', neutralJump: true }];
      const catchWindow = right >= t.B.x0 - 58 && right <= t.B.x0 + 4;
      const braced = p.onGround && p.vx <= 1 && right >= t.B.x0 - 4 && right <= t.B.x0 + 4;
      if (t.mech === 'tutunma' && !lowStep && !pending.has(key) && (catchWindow || braced) && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) target = [key, t];
      if (target) break;
    }
    if (target) {
      pending.set(target[0], { mech: target[1].mech, at: s.gameClock, wasOnGround: p.onGround || !!target[1].neutralJump });
      lastPress.set(target[0], s.gameClock);
      jumpFrames = 3;
      if (target[1].neutralJump) rightOffFrames = 2;
    }
    const keys = { right: rightOffFrames <= 0, jump: jumpFrames > 0 };
    await setKeys(page, keys);
    await page.evaluate(() => __tmbCampaignStep(1 / 60));
    const after = await page.evaluate(() => __TMB_A12__.getState());
    frames.push({ step, keys, state: snapshot(after) });
    previousX = after.player.x;
    if (jumpFrames > 0) jumpFrames--;
    if (rightOffFrames > 0) rightOffFrames--;
    if (after.result || after.player.x + after.hitbox.w >= after.route.finishX) break;
    if (after.deaths || after.player.x < previousX - 150) break;
  }
  await setKeys(page, { right: false, jump: false });
  return frames;
}

async function replay144(page, frames) {
  let firstDiff = null;
  for (const frame of frames) {
    await setKeys(page, frame.keys);
    let advanced = 0, guard = 0, after = null;
    while (advanced <= 0 && guard++ < 8) {
      advanced = await page.evaluate(() => Number(__tmbCampaignStep(1 / 144)) || 0);
      after = await page.evaluate(() => __TMB_A12__.getState());
    }
    const got = snapshot(after);
    const expected = frame.state || { ...frame.player, state: frame.parkour, coins: frame.coins };
    if (!firstDiff && !sameSnapshot(expected, got)) {
      firstDiff = { step: frame.step ?? frames.indexOf(frame), expected, got };
    }
  }
  await setKeys(page, { right: false, jump: false });
  return firstDiff;
}

(async () => {
  const server = await serverForRoot();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch({ headless: true });
  try {
    const tracePath = process.argv[2];
    let frames, end60;
    if (tracePath) {
      const payload = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
      frames = payload.trace.map((entry, index) => ({ step: index, keys: entry.keys, state: { ...entry.player, state: entry.parkour, coins: entry.coins } }));
      const last = payload.trace.at(-1);
      end60 = { economy: { collectedCoinIds: last?.coins || [] }, route: { coins: new Array(13) }, result: !!last?.result, player: last?.player || { x: 0 } };
    } else {
      const page60 = await browser.newPage();
      await boot(page60, base);
      frames = await record60(page60);
      end60 = await page60.evaluate(() => __TMB_A12__.getState());
      await page60.close();
    }

    const page144 = await browser.newPage();
    await boot(page144, base);
    const firstDiff = await replay144(page144, frames);
    const end144 = await page144.evaluate(() => __TMB_A12__.getState());
    await page144.close();

    const summary = {
      route: 'D03',
      recordedSteps: frames.length,
      record60: { coins: end60.economy.collectedCoinIds.length, expected: end60.route.coins.length, result: !!end60.result, x: +end60.player.x.toFixed(2) },
      replay144: { coins: end144.economy.collectedCoinIds.length, expected: end144.route.coins.length, result: !!end144.result, x: +end144.player.x.toFixed(2) },
      firstDiff
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exit(firstDiff ? 1 : 0);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
