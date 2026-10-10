const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');
const evidence = path.join(__dirname, 'manager-preview', 'tur16', 'realtime-d04');
let server, base;

test.beforeAll(async () => {
  fs.mkdirSync(evidence, { recursive:true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (error, body) => {
      if (error) { res.statusCode=404; return res.end('missing'); }
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base=`http://127.0.0.1:${server.address().port}/index.html#debug`;
});
test.afterAll(async () => new Promise(resolve => server.close(resolve)));

test('one short real-time D04 grab proof', async ({ page }) => {
  await page.setViewportSize({width:915,height:412});
  await page.goto(base);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice=page.locator('.characterChoice:visible').first();
  if(await choice.count())await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.unlockAllRoutes();
    __TMB_A12__.renderWorldOnRoute('dock31','D04');
    __TMB_A12__.startRoute('D04');
    __TMB_A12__.placePlayerAtChiefTime(14.2);
    __TMB_A12__.forceChiefNear(-60);
  });
  const rows=[];
  for(let i=0;i<10;i++){
    const state=await page.evaluate(() => { const s=__TMB_A12__.getState(); return {frame:s.chief.grabFrame,catches:s.chief.catches,caughtT:s.chief.caughtT}; });
    rows.push(state);
    await page.screenshot({path:path.join(evidence,`${String(i).padStart(2,'0')}-frame-${state.frame ?? 'run'}.png`)});
    await page.waitForTimeout(100);
  }
  expect(rows.some(q=>q.frame===3&&q.catches>0)).toBeTruthy();
  expect(rows.some(q=>q.frame>=4&&q.caughtT>0)).toBeTruthy();
  fs.writeFileSync(path.join(evidence,'timeline.json'),JSON.stringify(rows,null,2));
});
