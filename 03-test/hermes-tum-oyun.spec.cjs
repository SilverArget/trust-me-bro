const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = process.env.TMB_ROOT || path.join(__dirname, '..');
const routeIds = [
  'D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15','D16','D17','D18',
  'F01','F02','F03','F04','F05','F06',
  'M01','M02','M03','M04','M05','M06',
  'A01','A02','A03','A04','A05','A06',
];

let server, base;

test.beforeAll(async () => {
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

function worldFor(id) {
  if (id[0] === 'F') return 'frozen';
  if (id[0] === 'M') return 'magma';
  if (id[0] === 'A') return 'aftermath';
  return 'dock31';
}

async function boot(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.unlockAllRoutes();
    const ellipse = CanvasRenderingContext2D.prototype.ellipse;
    window.__hermesShoeDraws = [];
    window.__hermesLaunches = [];
    document.addEventListener('tmb:analytics-emit', event => {
      if (event.detail?.event === 'movement_started' && event.detail.params?.kind === 'hermesLaunch') {
        window.__hermesLaunches.push(event.detail.params);
      }
    });
    CanvasRenderingContext2D.prototype.ellipse = function(x, y, rx, ry, ...rest) {
      if (rx === 35 && ry === 8 && String(this.fillStyle).toLowerCase() === '#ffd86a') {
        window.__hermesShoeDraws.push({ routeId: __TMB_A12__.getState().route.id, x, y });
      }
      return ellipse.call(this, x, y, rx, ry, ...rest);
    };
  });
}

async function startRoute(page, id) {
  await page.evaluate(({ id, world }) => {
    __TMB_A12__.renderWorldOnRoute(world, id);
    __TMB_A12__.startRoute(id);
    __TMB_A12__.disableChief();
  }, { id, world: worldFor(id) });
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, id);
  await page.mouse.click(20, 20);
}

async function routeShoes(page, id) {
  await startRoute(page, id);
  return await page.evaluate(() => {
    const r = __TMB_A12__.routeDefinition(__TMB_A12__.getState().route.id);
    return (r.hermesLaunchZones || []).map(z => ({
      id: z.id, sourceId: z.sourceId, kind: z.kind,
      x1: z.x1, x2: z.x2, landX: z.landX, landY: z.landY,
    }));
  });
}

async function captureApproach(page, id, z, name) {
  await startRoute(page, id);
  await page.evaluate(x => {
    __tmbSegmentStart(Math.max(70, x));
    __TMB_A12__.disableChief();
  }, z.x1 - 95);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(outDir, name) });
}

async function testShoe(page, id, z) {
  await startRoute(page, id);
  const setup = await page.evaluate(z => {
    const x = Math.max(70, z.x2 - 20);
    const s = __tmbSegmentStart(x);
    __TMB_A12__.disableChief();
    try {
      player.x = x;
      player.y = z.landY - player.h;
      player.vx = player.vy = 0;
      player.onGround = true;
      dead = false;
      invulnerableT = Math.max(invulnerableT || 0, 2);
    } catch (_) {}
    return { attemptId: s.economy.attemptId };
  }, z);
  await page.keyboard.down('ArrowRight');
  let previous = await page.evaluate(() => __TMB_A12__.getState());
  let reset = 0, death = 0, launched = false, landed = false, reason = 'timeout';
  const started = Date.now();
  while (Date.now() - started < 3600) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    const center = s.player.x + s.hitbox.w / 2;
    const feet = s.player.y + s.hitbox.h;
    if (s.economy.attemptId !== setup.attemptId || previous.player.x - s.player.x > 140) { reset++; reason = 'reset'; break; }
    if ((s.deaths || 0) > (previous.deaths || 0)) { death += (s.deaths || 0) - (previous.deaths || 0); reason = 'death'; break; }
    launched ||= !!s.jumpRun?.hermes || (!s.player.onGround && center >= z.x1 - 8 && center <= z.landX + 70);
    if (launched && s.player.onGround && Math.abs(center - z.landX) <= 48 && Math.abs(feet - z.landY) <= 8) {
      landed = true;
      reason = 'landed';
      break;
    }
    if (launched && center >= z.landX - 12 && Math.abs(feet - z.landY) <= 90) {
      landed = true;
      reason = 'crossed-land-x';
      break;
    }
    if (center > z.landX + 120 && s.player.onGround) { reason = 'overshot'; break; }
    previous = s;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  const end = await page.evaluate(() => __TMB_A12__.getState());
  const endCenter = end.player.x + end.hitbox.w / 2;
  const endFeet = end.player.y + end.hitbox.h;
  if (!landed && reset === 0 && death === 0 && endCenter >= z.landX - 12 && Math.abs(endFeet - z.landY) <= 90) {
    launched = true;
    landed = true;
    reason = 'ended-past-land-x';
  }
  const row = {
    route: id,
    id: z.id,
    sourceId: z.sourceId || null,
    kind: z.kind || null,
    landX: +z.landX.toFixed(2),
    landY: +z.landY.toFixed(2),
    endX: +endCenter.toFixed(2),
    endY: +endFeet.toFixed(2),
    reset,
    death,
    launched,
    landed,
    reason,
  };
  console.log(`HERMES-SHOE ${JSON.stringify(row)}`);
  return row;
}

async function captureContactSheet(page, imageNames) {
  await page.setViewportSize({ width: 1800, height: 1400 });
  await page.setContent(`<!doctype html><style>
    body{margin:0;background:#15181d;color:#eef2f6;font:16px system-ui}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px}
    figure{margin:0;background:#20252b;border:1px solid #3a424c}
    img{display:block;width:100%;height:180px;object-fit:cover;object-position:center}
    figcaption{padding:5px 8px;font-weight:800}
  </style><div class="grid">${imageNames.map(name => `<figure><img src="${base.replace('/index.html','')}/03-test/manager-preview/hermes-tum-oyun/${name}"><figcaption>${name.replace('.png','')}</figcaption></figure>`).join('')}</div>`);
  await page.screenshot({ path: path.join(outDir, 'contact-sheet.png'), fullPage: true });
}

test('Hermes shoes exist, render and trigger on every route', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page);

  const zonesByRoute = {};
  for (const id of routeIds) {
    await startRoute(page, id);
    zonesByRoute[id] = await page.evaluate(routeId =>
      __TMB_A12__.routeDefinition(routeId).hermesLaunchZones || [], id);
  }

  const missing = routeIds.filter(id => zonesByRoute[id].length < 1);
  console.log(`HERMES-COUNTS ${JSON.stringify(Object.fromEntries(routeIds.map(id => [id, zonesByRoute[id].length])))}`);
  expect(missing, 'routes without a Hermes launch zone').toEqual([]);

  for (const id of routeIds) {
    const zone = zonesByRoute[id][0];
    console.log(`HERMES-CHECK ${id} ${zone.id}`);
    await startRoute(page, id);
    await page.evaluate(z => {
      const x = z.x2 - 20;
      __tmbSegmentStart(x);
      __TMB_A12__.disableChief();
    }, zone);
    await page.waitForFunction(routeId =>
      window.__hermesShoeDraws.some(draw => draw.routeId === routeId), id, { timeout: 2000 });
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(({ routeId, zoneId }) =>
      window.__hermesLaunches.some(launch => launch.routeId === routeId && launch.obstacleId === zoneId),
      { routeId: id, zoneId: zone.id }, { timeout: 2000 });
    await page.keyboard.up('ArrowRight');
  }
});
