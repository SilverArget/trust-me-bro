const { test, expect, devices } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'hermes-tum-oyun');
const allRouteIds = [
  'D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15','D16','D17','D18',
  'F01','F02','F03','F04',
];
const routeIds = process.env.TMB_HERMES_ROUTES ? process.env.TMB_HERMES_ROUTES.split(',').map(v => v.trim()).filter(Boolean) : allRouteIds;
const mobileIds = new Set(['D01','D09','D16','F04']);

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

async function runRoute(page, id, mode, options = {}) {
  await startRoute(page, id);
  const routeDef = await page.evaluate(() => __TMB_A12__.routeDefinition(__TMB_A12__.getState().route.id));
  const shoes = routeDef.hermesLaunchZones || [];
  const setup = await page.evaluate(() => __TMB_A12__.getState().economy.attemptId);
  let previous = await page.evaluate(() => __TMB_A12__.getState());
  let reset = 0, death = 0, captured = false, lastNormalJump = 0, maxX = previous.player.x, lastProgressAt = Date.now();
  const firstShoe = shoes[0];
  await page.keyboard.down('ArrowRight');
  const started = Date.now();
  while (Date.now() - started < (options.timeoutMs || 52000)) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    const center = s.player.x + s.hitbox.w / 2;
    if (options.captureName && firstShoe && !captured && center >= firstShoe.x1 - 90) {
      await page.screenshot({ path: path.join(outDir, options.captureName) });
      captured = true;
    }
    if (mode === 'normal' && s.player.onGround && Date.now() - lastNormalJump > 900) {
      const nearShoe = shoes.some(z => center >= z.x1 - 35 && center <= z.x2 + 70);
      if (!nearShoe) {
        lastNormalJump = Date.now();
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(35);
        await page.keyboard.up('ArrowUp');
      }
    }
    if (s.economy.attemptId !== setup || previous.player.x - s.player.x > 140) reset++;
    if ((s.deaths || 0) > (previous.deaths || 0)) death += (s.deaths || 0) - (previous.deaths || 0);
    if (s.player.x > maxX + 5) { maxX = s.player.x; lastProgressAt = Date.now(); }
    if (s.result || center >= s.route.finishX - 18) break;
    if (Date.now() - lastProgressAt > 4500) break;
    previous = s;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  const end = await page.evaluate(() => __TMB_A12__.getState());
  const finished = !!end.result || end.player.x + end.hitbox.w / 2 >= end.route.finishX - 18;
  return {
    route: id,
    mode,
    shoes: shoes.length,
    reset,
    death,
    finished,
    endX: +(end.player.x + end.hitbox.w / 2).toFixed(2),
    endY: +(end.player.y + end.hitbox.h).toFixed(2),
    finishX: +end.route.finishX.toFixed(2),
    state: end.parkour.state,
    dead: !!end.dead,
  };
}

test('Hermes shoes cover all requested routes', async ({ page, browser }) => {
  test.setTimeout(2700000);
  await boot(page);
  const rows = [];
  const contactImages = [];
  for (const id of routeIds) {
    const captureName = `${id}-desktop-approach.png`;
    rows.push(await runRoute(page, id, 'nojump', { captureName }));
    console.log(`HERMES-ROW ${JSON.stringify(rows.at(-1))}`);
    contactImages.push(captureName);
    rows.push(await runRoute(page, id, 'normal'));
    console.log(`HERMES-ROW ${JSON.stringify(rows.at(-1))}`);
    fs.writeFileSync(path.join(outDir, 'hermes-tum-oyun-report.partial.json'), JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2) + '\n');
  }
  const pixel = devices['Pixel 7'];
  const context = await browser.newContext({ ...pixel, deviceScaleFactor: 1 });
  const mobilePage = await context.newPage();
  const mobileRows = [];
  try {
    await boot(mobilePage, pixel.viewport);
    for (const id of mobileIds) {
      const captureName = `${id}-pixel7-approach.png`;
      mobileRows.push(await runRoute(mobilePage, id, 'pixel7-nojump', { captureName, timeoutMs: 62000 }));
      console.log(`HERMES-MOBILE ${JSON.stringify(mobileRows.at(-1))}`);
      contactImages.push(captureName);
    }
  } finally {
    await context.close();
  }
  await startRoute(page, 'D09');
  await page.evaluate(() => window.__tmbSegmentStart(900));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, 'D09-sandal-close-after.png') });
  contactImages.push('D09-sandal-close-after.png');
  await captureContactSheet(page, contactImages);
  const report = { generatedAt: new Date().toISOString(), rows, mobileRows };
  fs.writeFileSync(path.join(outDir, 'hermes-tum-oyun-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`HERMES-ALL-ROUTES ${JSON.stringify(report)}`);
  for (const row of [...rows, ...mobileRows]) {
    expect(row.reset, `${row.route} ${row.mode} reset`).toBe(0);
    expect(row.death, `${row.route} ${row.mode} death`).toBe(0);
    expect(row.finished, `${row.route} ${row.mode} finished`).toBe(true);
  }
});
