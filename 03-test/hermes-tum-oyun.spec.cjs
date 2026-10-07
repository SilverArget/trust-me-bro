const { test, expect, devices } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = process.env.TMB_ROOT || path.join(__dirname, '..');
const outDir = process.env.TMB_OUT || path.join(__dirname, 'manager-preview', 'hermes-tum-oyun');
const routeIds = [
  'D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15','D16','D17','D18',
  'F01','F02','F03','F04',
];
const mobileIds = ['D01','D09','D16','F04'];

let server, base;

test.beforeAll(async () => {
  fs.rmSync(outDir, { recursive: true, force: true });
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

function worldFor(id) {
  return id[0] === 'F' ? 'frozen' : 'dock31';
}

async function boot(page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(2000);
    await __TMB_A12__.purchaseWorld('frozen');
    const p = __TMB_A12__.getState().profile;
    p.selectedWorldId = 'frozen';
    p.ownedWorldIds = Array.from(new Set([...(p.ownedWorldIds || []), 'frozen']));
    for (const id of ['F01', 'F02', 'F03']) {
      p.progressByRoute[id] = { ...(p.progressByRoute[id] || {}), completed: true, stars: 3 };
    }
    localStorage.setItem('trust_me_bro_campaign_profile_v1', JSON.stringify(p));
  });
  await page.reload();
  await page.waitForFunction(() => window.__TMB_A12__);
  const choiceAfterReload = page.locator('.characterChoice:visible').first();
  if (await choiceAfterReload.count()) await choiceAfterReload.click();
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

test('Hermes shoes replace jump hints locally', async ({ page, browser }) => {
  test.setTimeout(900000);
  await boot(page);
  const shoeRows = [];
  const counts = {};
  const contactImages = [];
  for (const id of routeIds) {
    const shoes = await routeShoes(page, id);
    counts[id] = shoes.length;
    if (shoes[0]) {
      const name = `${id}-desktop-approach.png`;
      await captureApproach(page, id, shoes[0], name);
      contactImages.push(name);
    }
    for (const z of shoes) {
      const row = await testShoe(page, id, z);
      shoeRows.push(row);
      fs.writeFileSync(path.join(outDir, 'hermes-tum-oyun-report.partial.json'), JSON.stringify({ generatedAt: new Date().toISOString(), counts, shoeRows }, null, 2) + '\n');
    }
  }

  await startRoute(page, 'D09');
  await page.evaluate(() => {
    __tmbSegmentStart(900);
    __TMB_A12__.disableChief();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(outDir, 'D09-sandal-close-after.png') });
  contactImages.push('D09-sandal-close-after.png');

  const pixel = devices['Pixel 7'];
  const context = await browser.newContext({ ...pixel, deviceScaleFactor: 1 });
  const mobilePage = await context.newPage();
  try {
    await boot(mobilePage, pixel.viewport);
    for (const id of mobileIds) {
      const shoes = await routeShoes(mobilePage, id);
      if (!shoes[0]) continue;
      const name = `${id}-pixel7-approach.png`;
      await captureApproach(mobilePage, id, shoes[0], name);
      contactImages.push(name);
    }
  } finally {
    await context.close();
  }

  await captureContactSheet(page, contactImages);
  const report = { generatedAt: new Date().toISOString(), counts, shoeRows };
  fs.writeFileSync(path.join(outDir, 'hermes-tum-oyun-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`HERMES-COUNTS ${JSON.stringify(counts)}`);
  for (const row of shoeRows) {
    expect(row.reset, `${row.route} ${row.id} reset`).toBe(0);
    expect(row.death, `${row.route} ${row.id} death`).toBe(0);
    expect(row.landed, `${row.route} ${row.id} landed`).toBe(true);
  }
});
