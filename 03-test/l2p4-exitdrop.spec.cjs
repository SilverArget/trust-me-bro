const { test, expect } = require('playwright/test');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
let server, base;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(root, rel);
    fs.readFile(file, (err, body) => { res.statusCode = err ? 404 : 200; res.setHeader('Content-Type', rel.endsWith('.html') ? 'text/html' : 'application/octet-stream'); res.end(err ? 'missing' : body); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug`;
});
test.afterAll(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

async function boot(page) {
  await page.goto(base); await page.waitForFunction(() => window.__tmb?.platform.initialized);
  if (await page.locator('#characterSelect.show').count()) await page.locator('.characterChoice').first().click();
}

async function prepare(page, mode) {
  await page.evaluate(mode => {
    __tmbSetProgress(2, 4, 10, 32);
    __tmbExitTestSetup(mode);
  }, mode);
  if (mode === 'crumble') {
    await page.waitForFunction(() => __tmbExitTestRuntime().trapDone, null, { timeout: 3000 });
    await page.evaluate(()=>__tmbExitTestAfterCrumble());
    await page.keyboard.down('ArrowRight');
  } else await page.keyboard.down('ArrowRight');
  if(mode!=='landing')await page.keyboard.press('Space');
}

async function measuredRun(page, mode, keepRunning=false) {
  await prepare(page, mode);
  let released=false;const until=Date.now()+12000;while(Date.now()<until){const s=await page.evaluate(()=>({done:__exitProbe.done,clear:__exitProbe.clearAt,dead:__tmb.dead,part:__tmb.currentPart,onGround:__tmb.player.onGround}));if((s.done&&!keepRunning)||s.dead||s.part===5)break;if(!keepRunning&&s.clear!==null&&!released){await page.keyboard.up('ArrowRight');await page.evaluate(()=>__tmbExitTestStabilize());released=true}if(s.onGround&&!released)await page.keyboard.press('Space');await page.waitForTimeout(16)}
  await page.keyboard.up('ArrowRight');
  return page.evaluate(() => ({...__exitProbe, part:__tmb.currentPart, dead:__tmb.dead, deaths:__tmb.deaths, x:__tmb.player.x}));
}

test('L2 P4 exitDrop real windows and outcomes', async ({ page }) => {
  test.setTimeout(180000); await boot(page); await page.evaluate(()=>__tmbSetProgress(2,4,10,32));console.log('EXITDROP_CONFIG '+JSON.stringify(await page.evaluate(()=>({anchors:__tmb.debugScene.geometry.anchors,surfaces:__tmb.debugScene.geometry.surfaces})))); const rows=[];
  for (const mode of ['full','landing','crumble']) for (let run=1;run<=5;run++) rows.push({mode,run,...await measuredRun(page,mode)});
  console.log('EXITDROP_WINDOWS '+JSON.stringify(rows.map(({samples,...r})=>({...r,lastSamples:samples.slice(-4)}))));
  expect(rows.every(r => Number.isFinite(r.windowMs))).toBe(true);

  const passes=[];
  for(let run=1;run<=5;run++){const d0=32;const r=await measuredRun(page,'full',true);passes.push({run,part:r.part,extraDeaths:r.deaths-d0,windowMs:r.windowMs});}
  console.log('EXITDROP_PASS5 '+JSON.stringify(passes));
  expect(passes.every(r=>r.part===5&&r.extraDeaths===0&&r.windowMs>=300)).toBe(true);

  await page.evaluate(()=>{__tmbSetProgress(2,4,10,32);__tmbExitTestStopped()});
  await page.waitForFunction(()=>__tmb.dead,null,{timeout:5000});
  const stopped=await page.evaluate(()=>({dead:__tmb.dead,deaths:__tmb.deaths,msg:__tmb.debugDeath?.msg}));
  console.log('EXITDROP_STOPPED '+JSON.stringify(stopped));expect(stopped.dead).toBe(true);expect(stopped.deaths).toBe(33);expect(stopped.msg).toContain('head clearance');
});
