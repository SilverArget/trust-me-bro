const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'd09-ofissiz');
const transitions = JSON.parse(fs.readFileSync(path.join(__dirname, 'dock18-generated', 'transitions-D09.json'), 'utf8'));
let server, base;

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

async function bootOnce(page) {
  if (await page.evaluate(() => !!window.__TMB_A12__).catch(() => false)) return;
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
}

async function resetSegment(page, x) {
  await page.evaluate(startX => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D09');
    __TMB_A12__.startRoute('D09');
    __TMB_A12__.disableChief();
    if (startX > 70) window.__tmbSegmentStart(startX);
  }, x);
  await page.keyboard.down('ArrowRight');
}

async function tapJump(page) {
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(45);
  await page.keyboard.up('ArrowUp');
}

function triggerX(t) {
  return t.mech === 'dive' ? t.x1 : t.mech === 'normal' ? t.A.x1 - 25 : t.B.x0 - 58;
}

function checkpointFor(t) {
  const x = Math.min(t.A?.x0 ?? t.x1 ?? 70, t.B?.x0 ?? t.x1 ?? 70);
  return x >= 4842 ? 4842 : x >= 2176 ? 2176 : 70;
}

test('D09 missed jump variants do not trap the runner', async ({ page }) => {
  test.setTimeout(150000);
  const variants = [-250, -120, 120, 250, null];
  const focus = new Set([11, 13, 27, 28, 31, 39, 40, 42]);
  const jumps = transitions.filter(t => focus.has(t.i) && ['normal', 'dive', 'tutunma'].includes(t.mech));
  const rows = [];
  let stuckCount = 0;
  await bootOnce(page);
  const route = await page.evaluate(() => __TMB_A12__.routeDefinition('D09'));

  for (let pressNo = 0; pressNo < jumps.length; pressNo++) {
    const target = jumps[pressNo];
    for (const variant of variants) {
      const startX = checkpointFor(target);
      await resetSegment(page, startX);
      const fired = new Set();
      const pending = new Map();
      const lastPress = new Map();
      let lastProgress = null;
      let stuckSince = null;
      let lastInput = 'segment-start';
      const started = Date.now();
      let end, status = 'timeout';
      const targetKey = `${target.mech}-${target.i}`;

      while (Date.now() - started < 3500) {
        const s = await page.evaluate(() => __TMB_A12__.getState());
        end = s;
        const p = s.player, right = p.x + s.hitbox.w, center = p.x + s.hitbox.w / 2;
        const targetX = triggerX(target);
        if (s.result || right >= s.route.finishX) { status = 'finish'; break; }
        if (s.deaths) { status = 'death'; break; }
        if (s.chief?.catches) { status = 'chief'; break; }
        if (right > targetX + 420 && p.onGround) { status = 'cleared'; break; }

        for (const [key, q] of pending) {
          const happened = q.mech === 'dive' ? (!!s.diveRun || s.parkour.state === 'dive')
            : q.mech === 'tutunma' ? (s.parkour.state === 'catch' || s.parkour.state === 'climb')
            : q.mech === 'slide' ? s.parkour.state === 'slide'
            : q.wasOnGround && !p.onGround;
          if (happened) { fired.add(key); pending.delete(key); }
          else if (s.gameClock - q.at >= .6) pending.delete(key);
        }

        let selected = null;
        for (const t of jumps) {
          const key = `${t.mech}-${t.i}`;
          if (fired.has(key) || pending.has(key)) continue;
          const baseX = triggerX(t);
          const fireX = key === targetKey
            ? (variant === null ? Infinity : baseX + variant)
            : baseX;
          const window = key === targetKey ? 70 : 36;
          const rightBased = t.mech !== 'dive';
          const pos = rightBased ? right : center;
          const ready = t.mech === 'dive'
            ? pos >= fireX && pos <= fireX + window
            : pos >= fireX && pos <= fireX + window;
          if (variant === null && key === targetKey) continue;
          if (ready && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) {
            selected = [key, t];
            break;
          }
        }

        if (!selected) {
          for (const o of route.obstacles.filter(o => o.type === 'vault')) {
            const key = `vault-${o.id}`, gap = o.x - right;
            if (!fired.has(key) && !pending.has(key) && p.onGround && gap >= 18 && gap <= 55) {
              selected = [key, { ...o, mech: 'vault' }];
              break;
            }
          }
        }
        if (!selected) {
          for (const o of route.obstacles.filter(o => o.type === 'slide')) {
            const key = `slide-${o.id}`, gap = o.x - right;
            if (!fired.has(key) && !pending.has(key) && p.onGround && gap >= 2 && gap <= 36) {
              selected = [key, { ...o, mech: 'slide' }];
              break;
            }
          }
        }

        if (selected) {
          const [key, t] = selected;
          lastInput = `${key}@${s.gameClock.toFixed(3)} x=${p.x.toFixed(2)}`;
          pending.set(key, { mech: t.mech, at: s.gameClock, wasOnGround: p.onGround });
          lastPress.set(key, s.gameClock);
          await tapJump(page);
        }

        const inTargetWindow = p.x >= targetX - 120 && p.x <= targetX + 420;
        if (!lastProgress || p.x - lastProgress.x >= 24) {
          lastProgress = { x: p.x, t: s.gameClock };
          stuckSince = null;
        } else if (!s.dead && p.onGround && s.parkour.state === 'normal' && p.x > 100 && inTargetWindow && (Math.abs(p.vx) > 1 || s.gameClock > .8)) {
          stuckSince ??= s.gameClock;
          if (s.gameClock - stuckSince >= 1.5) {
            status = 'stuck';
            stuckCount++;
            break;
          }
        }
        await page.waitForTimeout(16);
      }

      end ||= await page.evaluate(() => __TMB_A12__.getState());
      rows.push({
        pressNo,
        transition: target.i,
        target: targetKey,
        variant: variant === null ? 'none' : variant,
        status,
        lastInput,
        x: +end.player.x.toFixed(2),
        y: +end.player.y.toFixed(2),
        state: end.parkour.state,
        deaths: end.deaths || 0,
        chief: end.chief?.catches || 0,
      });
      fs.writeFileSync(path.join(outDir, 'missed-jump.json'), JSON.stringify(rows, null, 2) + '\n', 'utf8');
      await page.keyboard.up('ArrowRight');
    }
  }

  fs.writeFileSync(path.join(outDir, 'missed-jump.json'), JSON.stringify(rows, null, 2) + '\n', 'utf8');
  expect(stuckCount).toBe(0);
});
