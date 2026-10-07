const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'd09-sarkan');
const transitions = JSON.parse(fs.readFileSync(path.join(__dirname, 'dock18-generated', 'transitions-D09.json'), 'utf8'));
const baseline = !!process.env.TMB_D09_SARKAN_BASELINE;
const phase = baseline ? 'once' : 'sonra';
let server, base;

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

async function boot(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute('dock31', 'D09');
    __TMB_A12__.startRoute('D09');
    __TMB_A12__.disableChief();
  });
  await page.waitForFunction(() => __TMB_A12__.getState().route.id === 'D09');
}

async function tapSlide(page) {
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(45);
  await page.keyboard.up('ArrowUp');
}

async function placeAt(page, x) {
  await page.evaluate((targetX) => {
    const r = __TMB_A12__.routeDefinition('D09');
    const x = targetX;
    const grounds = r.groundSegments.filter(s => s.kind === 'ground' && x >= s.x && x <= s.x + s.w);
    const y = Math.min(...grounds.map(s => s.y)) - 48;
    __TMB_A12__.placePlayer(x, y);
    __TMB_A12__.disableChief();
    for (let i = 0; i < 45; i++) __tmbCampaignStep(1 / 60);
  }, x);
}

async function capturePoint(page, viewport, fileName, x = 3450) {
  await boot(page, viewport);
  await placeAt(page, x);
  await page.screenshot({ path: path.join(outDir, fileName) });
}

function intervalOverlap(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

test('D09 hanging slide geometry is on flat ground, not the step transition', async ({ page }) => {
  await boot(page, { width: 390, height: 844 });
  const report = await page.evaluate(() => {
    const r = __TMB_A12__.routeDefinition('D09');
    const ids = ['d09-ir-slide-01', 'd09-ir-slide-02', 'd09-ir-slide-03'];
    const grounds = r.groundSegments.filter(s => s.kind === 'ground');
    const obstacles = r.obstacles.filter(o => ids.includes(o.id));
    const rows = obstacles.map(o => {
      const bar = { x0: o.x - 16, x1: o.x + o.w + 16 };
      const under = grounds
        .filter(g => Math.abs(g.y - o.baseY) <= 1)
        .map(g => ({ id: g.id, x0: g.x, x1: g.x + g.w, y: g.y, overlap: Math.max(0, Math.min(bar.x1, g.x + g.w) - Math.max(bar.x0, g.x)) }))
        .filter(g => g.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap);
      const best = under[0] || null;
      return { id: o.id, x: o.x, bar, baseY: o.baseY, support: best };
    });
    const transitionBands = [
      { id: 'old-drop', x0: 3019.44, x1: 3163.44 },
      { id: 'old-rise', x0: 3163.44, x1: 3300 },
    ];
    return {
      rows,
      transitionOverlap: rows.map(row => ({
        id: row.id,
        overlap: transitionBands.reduce((sum, band) => sum + Math.max(0, Math.min(row.bar.x1, band.x1) - Math.max(row.bar.x0, band.x0)), 0),
      })),
    };
  });
  console.log(`D09-SARKAN-GEOMETRY ${phase} ${JSON.stringify(report)}`);
  if (!baseline) {
    for (const row of report.rows) {
      expect(row.support?.id).toBe('d09-ir-26');
      expect(row.support.overlap).toBeGreaterThanOrEqual(row.bar.x1 - row.bar.x0 - 1);
    }
    for (const row of report.transitionOverlap) expect(row.overlap).toBe(0);
  }
});

test('D09 catchable step is a grounded column, not a floating block', async ({ page }) => {
  await boot(page, { width: 844, height: 390 });
  const report = await page.evaluate(() => {
    const r = __TMB_A12__.routeDefinition('D09');
    const step = r.groundSegments.find(s => s.id === 'd09-ir-23');
    const solids = r.groundSegments.filter(s => s.kind === 'ground');
    const bottom = step.y + step.h;
    const touches = solids
      .filter(s => s.id !== step.id)
      .filter(s => Math.abs(s.y - bottom) <= 1.5)
      .filter(s => step.x + step.w > s.x + 4 && step.x < s.x + s.w - 4)
      .map(s => s.id);
    return { step, bottom, touches, reachesGround: bottom >= 455 - 1 };
  });
  console.log(`D09-SARKAN-STEP ${phase} ${JSON.stringify(report)}`);
  if (!baseline) {
    expect(report.reachesGround || report.touches.length > 0).toBe(true);
    expect(report.step.h).toBeGreaterThan(250);
  }
});

test('D09 player clears the hanging slides with normal right plus slide input', async ({ page }) => {
  test.setTimeout(30000);
  await boot(page, { width: 1280, height: 720 });
  await page.evaluate(() => {
    __tmbSegmentStart(3780);
    __TMB_A12__.disableChief();
  });
  await page.keyboard.down('ArrowRight');
  const fired = new Set();
  const pending = new Map();
  const lastPress = new Map();
  let end;
  const started = Date.now();
  while (Date.now() - started < 9000) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    end = s;
    const p = s.player;
    const right = p.x + s.hitbox.w;
    let target = null;
    for (const [key, q] of pending) {
      const happened = q.mech === 'slide' ? s.parkour.state === 'slide'
        : q.mech === 'tutunma' ? (s.parkour.state === 'catch' || s.parkour.state === 'climb')
        : q.wasOnGround && !p.onGround;
      if (happened) { fired.add(key); pending.delete(key); }
      else if (s.gameClock - q.at >= .6) pending.delete(key);
    }
    for (const t of transitions) {
      if (t.A.x1 < 2800 || t.A.x1 > 4200) continue;
      const key = `${t.mech}-${t.i}`;
      if (fired.has(key) || pending.has(key)) continue;
      const catchWindow = right >= t.B.x0 - 58 && right <= t.B.x0 + 4;
      const braced = p.onGround && !s.edgeClimb && s.parkour.state !== 'climb' && right >= t.B.x0 - 8 && right <= t.B.x0;
      const normalLead = t.i === 23 ? 55 : 25;
      if (t.mech === 'normal' && p.onGround && right >= t.A.x1 - normalLead && right <= t.A.x1 - 2) { target = [key, { mech: 'normal' }]; break; }
      if (t.mech === 'tutunma' && (catchWindow || braced) && (!lastPress.has(key) || s.gameClock - lastPress.get(key) >= .1)) { target = [key, { mech: 'tutunma' }]; break; }
    }
    if (!target) for (const o of s.route.obstacles.filter(o => /^d09-ir-slide-0[123]$/.test(o.id))) {
      const gap = o.x - right;
      const key = `slide-${o.id}`;
      if (!fired.has(key) && !pending.has(key) && p.onGround && gap >= 2 && gap <= 36) {
        target = [key, { mech: 'slide' }];
        break;
      }
    }
    if (target) {
      pending.set(target[0], { mech: target[1].mech, at: s.gameClock, wasOnGround: p.onGround });
      lastPress.set(target[0], s.gameClock);
      await tapSlide(page);
    }
    if (s.player.x >= 4140 || s.deaths > 0) break;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  const slideKeys = [...fired].filter(key => key.startsWith('slide-')).sort();
  const movementKeys = [...fired].filter(key => !key.startsWith('slide-')).sort();
  const pass = end.player.x >= 4140 && (end.deaths || 0) === 0 && slideKeys.length === 3;
  console.log(`D09-SARKAN-RUN | x=${end.player.x.toFixed(2)}, deaths=${end.deaths || 0}, moves=${movementKeys.join(',')}, slides=${slideKeys.join(',')} | right+jump+slide through cluster | ${pass ? 'PASS' : 'FAIL'}`);
  if (!baseline) {
    expect(end.player.x).toBeGreaterThanOrEqual(4140);
    expect(end.deaths || 0).toBe(0);
    expect(slideKeys).toEqual(['slide-d09-ir-slide-01', 'slide-d09-ir-slide-02', 'slide-d09-ir-slide-03']);
  }
});

test('D09 manager screenshots for hanging slide point', async ({ page }) => {
  await capturePoint(page, { width: 390, height: 844 }, `${phase}.png`);
  if (!baseline) await capturePoint(page, { width: 844, height: 390 }, 'sonra-yatay.png');
  if (!baseline) await capturePoint(page, { width: 844, height: 390 }, 'sonra-sarkan-yeni-yer.png', 3950);
});
