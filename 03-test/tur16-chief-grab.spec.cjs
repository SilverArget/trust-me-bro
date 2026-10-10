const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
let server, base;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (error, body) => {
      if (error) { res.statusCode = 404; return res.end('missing'); }
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug`;
});
test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function bootD04(page) {
  await page.goto(base);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    window.__tmbXWriteLog = [];
    __TMB_A12__.unlockAllRoutes();
    __TMB_A12__.renderWorldOnRoute('dock31', 'D04');
    __TMB_A12__.startRoute('D04');
    __TMB_A12__.placePlayerAtChiefTime(14.2);
    __TMB_A12__.forceChiefNear(-60); // 28 px edge gap: 60 - chief width 32.
  });
}

test('four chief atlas contracts expose the grab row', async () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'sprites/chiefs/chief-contract.json'), 'utf8'));
  expect(contract.atlas).toEqual([640, 720]);
  expect(contract.rows).toBe(9);
  expect(contract.motions.grab).toEqual({ row:8, fps:8 });
  expect(contract.assets).toHaveLength(4);
  for (const asset of contract.assets) {
    const bytes = fs.readFileSync(path.join(root, asset.path));
    expect(asset.size).toEqual([640, 720]);
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([640, 720]);
    expect(bytes.length).toBe(asset.bytes);
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
  }
});

test('D04 step simulation maps lunge 1-4 to contact and hold 5-8', async ({ page }) => {
  await bootD04(page);
  const result = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 60; i++) {
      __tmbCampaignStep(1 / 60);
      const s = __TMB_A12__.getState();
      out.push({ gap:s.player.x-(s.chief.x+s.chief.w), frame:s.chief.grabFrame, catches:s.chief.catches, caughtT:s.chief.caughtT });
    }
    return { rows:out, catchLog:window.__tmbXWriteLog.find(row => row.source === 'chief-catch-reset') };
  });
  const rows = result.rows;
  const catchRow = rows.find(row => row.catches > 0);
  const before = rows.filter(row => !row.catches && row.frame !== null).map(row => row.frame);
  const hold = rows.filter(row => row.caughtT > 0).map(row => row.frame);
  expect(new Set(before)).toEqual(new Set([0, 1, 2]));
  expect(result.catchLog.beforeX-(result.catchLog.chiefX+32)).toBeLessThanOrEqual(4);
  expect(catchRow.frame).toBe(3);
  expect(new Set(hold)).toEqual(new Set([3, 4, 5, 6, 7]));
});

test('escaping the lunge returns the chief to run', async ({ page }) => {
  await bootD04(page);
  const opening = await page.evaluate(() => {
    const out=[];
    for(let i=0;i<6;i++) { __tmbCampaignStep(1/60); const s=__TMB_A12__.getState(); out.push({vx:s.player.vx,frame:s.chief.grabFrame,catches:s.chief.catches}); }
    return out;
  });
  await page.keyboard.down('ArrowRight');
  const frames = await page.evaluate(() => {
    const out=[];
    for(let i=0;i<24;i++) { __tmbCampaignStep(1/60); const s=__TMB_A12__.getState(); out.push({vx:s.player.vx,frame:s.chief.grabFrame,catches:s.chief.catches}); }
    return out;
  });
  await page.keyboard.up('ArrowRight');
  expect(opening.some(q => q.frame !== null)).toBeTruthy();
  expect(frames.some(q => q.vx >= 70 && q.frame === null)).toBeTruthy();
  expect(Math.max(...frames.map(q => q.catches))).toBe(0);
});
