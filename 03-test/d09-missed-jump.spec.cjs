const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'd09-bolge');
const outFile = path.join(outDir, 'missed-jump.json');
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

async function boot(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.locator('.characterChoice:visible').first().click();
}

async function resetAtCheckpoint(page, x) {
  await page.evaluate(startX => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D09');
    __TMB_A12__.startRoute('D09');
    if (startX > 70 && [2176, 4842].includes(startX)) {
      const samples = window.TMB_CHIEF_PATHS?.D09?.samples || [];
      const sample = samples.find(v => v[1] >= startX) || null;
      if (sample) __TMB_A12__.placePlayerAtChiefTime(sample[0]);
      else window.__tmbSegmentStart(startX);
    } else if (startX > 70) window.__tmbSegmentStart(startX);
    __TMB_A12__.disableChief();
  }, x);
  await page.keyboard.down('ArrowRight');
}

async function jump(page) {
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(45);
  await page.keyboard.up('ArrowUp');
}

function triggerX(t) {
  if (t.mech === 'dive' || t.mech === 'high') return t.x1;
  if (t.mech === 'normal') return t.A.x1 - 25;
  return t.B.x0 - 58;
}

function checkpointFor(t) {
  const trigger = triggerX(t);
  if (trigger >= 1600) return Math.max(70, trigger - 700);
  if (trigger >= 4800) return 4842;
  const x = Math.min(t.A?.x0 ?? t.x1 ?? 70, t.B?.x0 ?? t.x1 ?? 70);
  if (x >= 4842) return 4842;
  if (x >= 2176) return 2176;
  return 70;
}

function shiftedX(baseX, variantMs, vx) {
  if (variantMs === null) return Infinity;
  return baseX + Math.max(180, vx || 260) * (variantMs / 1000);
}

function inShiftedWindow(t, s, fireX, isTarget) {
  const p = s.player;
  const right = p.x + s.hitbox.w;
  const center = p.x + s.hitbox.w / 2;
  const coyote = p.onGround || s.gameClock - s.__lastGroundAt <= .12;
  const wide = isTarget ? 34 : 0;
  if (t.mech === 'normal') return coyote && right >= fireX && right <= fireX + 23 + wide;
  if (t.mech === 'dive' || t.mech === 'high') return center >= fireX + (isTarget ? 0 : 4) && center <= fireX + (isTarget ? 66 : Math.max(0, (t.x2 ?? fireX + 32) - t.x1 - 4));
  const catchWindow = right >= fireX && right <= fireX + 62 + wide;
  const braced = p.onGround && !s.edgeClimb && s.parkour.state !== 'climb' && right >= t.B.x0 - 8 && right <= t.B.x0;
  return catchWindow || braced;
}

function chooseInput({ s, tr, route, fired, pending, lastPress, target, variant, targetDone, lastGroundAt }) {
  const p = s.player;
  const right = p.x + s.hitbox.w;
  const center = p.x + s.hitbox.w / 2;
  const coyote = p.onGround || s.gameClock - lastGroundAt <= .12;
  const targetKey = `${target.mech}-${target.i}`;

  for (const t of tr) {
    const fallbackCatch = -t.D > 52 && t.gap <= 96;
    if (t.mech !== 'tutunma' && !fallbackCatch) continue;
    const key = `${t.mech}-${t.i}`;
    if (key === targetKey && (targetDone || variant === null)) continue;
    const braced = p.onGround && !s.edgeClimb && s.parkour.state !== 'climb' && right >= t.B.x0 - 8 && right <= t.B.x0;
    if (braced && !pending.has(key) && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) return [key, { ...t, mech: 'tutunma' }];
  }

  for (const t of tr) {
    const key = `${t.mech}-${t.i}`;
    if (fired.has(key) || pending.has(key)) continue;
    const isTarget = key === targetKey;
    if (isTarget && (targetDone || variant === null)) continue;
    const baseX = triggerX(t);
    const fireX = isTarget ? shiftedX(baseX, variant, p.vx) : baseX;
    if (inShiftedWindow(t, { ...s, __lastGroundAt: lastGroundAt }, fireX, isTarget) && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) return [key, t];
  }

  for (const z of (route.diveZones || []).filter(z => /-assist$/.test(z.id))) {
    const key = `dive-${z.id}`;
    if (!fired.has(key) && !pending.has(key) && coyote && center >= z.x1 && center <= z.x2 && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) return [key, { mech: 'dive' }];
  }

  for (const o of route.obstacles.filter(o => o.type === 'vault')) {
    const key = `vault-${o.id}`;
    const inWindow = right >= o.x - 55 && right <= o.x - 18;
    const braced = p.onGround && p.vx <= 1 && right >= o.x - 4 && right <= o.x + 4;
    if (!fired.has(key) && p.onGround && (inWindow || braced) && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) return [key, { ...o, mech: 'vault' }];
  }

  for (const o of route.obstacles.filter(o => o.type === 'slide')) {
    const key = `slide-${o.id}`;
    const gap = o.x - right;
    if (!fired.has(key) && !pending.has(key) && p.onGround && gap >= 2 && gap <= 36) return [key, { ...o, mech: 'slide' }];
  }

  return null;
}

test('D09 missed jump variants do not trap the runner', async ({ page }) => {
  test.setTimeout(900000);
  const variants = [-250, -120, 120, 250, null];
  const focus = new Set([11, 13, 14, 15, 16, 17, 27, 28, 31, 39, 40, 41, 42]);
  const targets = transitions.filter(t => focus.has(t.i) && ['normal', 'dive', 'high', 'tutunma'].includes(t.mech));
  const rows = [];
  await boot(page);
  const route = await page.evaluate(() => __TMB_A12__.routeDefinition('D09'));

  for (let pressNo = 0; pressNo < targets.length; pressNo++) {
    const target = targets[pressNo];
    for (const variant of variants) {
      const startX = checkpointFor(target);
      await resetAtCheckpoint(page, startX);
      const fired = new Set();
      const pending = new Map();
      const lastPress = new Map();
      const started = await page.evaluate(() => __TMB_A12__.getState().gameClock);
      const baseX = triggerX(target);
      const targetKey = `${target.mech}-${target.i}`;
      let status = 'timeout';
      let end = null;
      let targetDone = false;
      let targetMissedAt = null;
      let lastInput = 'segment-start';
      let lastGroundAt = started;
      let progressAnchor = null;
      let noProgressSince = null;
      let lastPanicJumpAt = -Infinity;
      let previousX = null;

      while (true) {
        const s = await page.evaluate(() => __TMB_A12__.getState());
        end = s;
        const p = s.player;
        const right = p.x + s.hitbox.w;
        const center = p.x + s.hitbox.w / 2;
        if (previousX !== null && previousX - p.x > 150) {
          if (targetMissedAt !== null) { status = 'death'; break; }
          fired.clear();
          pending.clear();
          lastPress.clear();
          progressAnchor = null;
          noProgressSince = null;
          await page.keyboard.up('ArrowRight');
          await page.waitForTimeout(60);
          await page.keyboard.down('ArrowRight');
          previousX = p.x;
          await page.waitForTimeout(16);
          continue;
        }
        previousX = p.x;
        if (p.onGround) lastGroundAt = s.gameClock;
        if (s.chief?.catches) { status = 'chief'; break; }
        if (s.result || right >= s.route.finishX) { status = 'finish'; break; }
        if (s.deaths) { status = 'death'; break; }
        if (right >= baseX + 600 && p.onGround) { status = 'cleared'; break; }
        if (s.gameClock - started >= 25) { status = 'timeout'; break; }

        for (const [key, q] of pending) {
          const happened = q.mech === 'dive' ? (!!s.diveRun || s.parkour.state === 'dive')
            : q.mech === 'high' ? q.wasOnGround && !p.onGround
            : q.mech === 'tutunma' ? (s.parkour.state === 'catch' || s.parkour.state === 'climb')
            : q.mech === 'slide' ? s.parkour.state === 'slide'
            : q.mech === 'vault' ? (q.wasOnGround && !p.onGround)
            : q.wasOnGround && !p.onGround;
          if (happened) { fired.add(key); pending.delete(key); if (key === targetKey) targetDone = true; }
          else if (s.gameClock - q.at >= .6) pending.delete(key);
        }

        if (!targetDone && variant === null && ((target.mech === 'dive' || target.mech === 'high' ? center : right) >= baseX)) {
          targetDone = true;
          targetMissedAt = s.gameClock;
          fired.add(targetKey);
          lastInput = `omit-${targetKey}@${s.gameClock.toFixed(3)} x=${p.x.toFixed(2)}`;
        }
        if (!targetDone && variant !== null) {
          const fireX = shiftedX(baseX, variant, p.vx);
          if ((target.mech === 'dive' || target.mech === 'high' ? center : right) > fireX + 110) {
            targetDone = true;
            targetMissedAt = s.gameClock;
            fired.add(targetKey);
            lastInput = `missed-${targetKey}@${s.gameClock.toFixed(3)} x=${p.x.toFixed(2)}`;
          }
        }

        const selected = chooseInput({ s, tr: transitions, route, fired, pending, lastPress, target, variant, targetDone, lastGroundAt });
        if (selected) {
          const [key, item] = selected;
          lastInput = `${key}@${s.gameClock.toFixed(3)} x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} state=${s.parkour.state}`;
          pending.set(key, { mech: item.mech, at: s.gameClock, wasOnGround: p.onGround });
          lastPress.set(key, s.gameClock);
          await jump(page);
          if (key !== targetKey) fired.add(key);
          if (key === targetKey) targetDone = true;
        }

        if (targetDone && targetMissedAt === null) targetMissedAt = s.gameClock;
        if (targetMissedAt !== null) {
          if (!progressAnchor || p.x - progressAnchor.x >= 24) {
            progressAnchor = { x: p.x, t: s.gameClock };
            noProgressSince = null;
          } else {
            noProgressSince ??= s.gameClock;
            if (!s.dead && s.gameClock - noProgressSince >= 3) { status = 'trap'; break; }
            if (s.gameClock - noProgressSince >= .6 && s.gameClock - lastPanicJumpAt >= .35) {
              lastInput = `panic-jump@${s.gameClock.toFixed(3)} x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} state=${s.parkour.state}`;
              await jump(page);
              lastPanicJumpAt = s.gameClock;
            }
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
        startX,
        targetX: +baseX.toFixed(2),
        lastInput,
        x: +end.player.x.toFixed(2),
        y: +end.player.y.toFixed(2),
        state: end.parkour.state,
        deaths: end.deaths || 0,
        chief: end.chief?.catches || 0,
        gameClock: +end.gameClock.toFixed(3),
      });
      fs.writeFileSync(outFile, JSON.stringify(rows, null, 2) + '\n', 'utf8');
      await page.keyboard.up('ArrowRight');
    }
  }

  const counts = rows.reduce((acc, row) => (acc[row.status] = (acc[row.status] || 0) + 1, acc), {});
  console.log(`D09-MISSED-JUMP statuses ${JSON.stringify(counts)}`);
  for (const row of rows.filter(r => r.status === 'trap')) {
    console.log(`TRAP ${row.target} ${row.variant} x=${row.x} y=${row.y} state=${row.state} last=${row.lastInput}`);
  }
  fs.writeFileSync(outFile, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  expect(counts.trap || 0).toBe(0);
  expect(counts.timeout || 0).toBe(0);
});
