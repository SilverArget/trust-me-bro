const { test, expect } = require('playwright/test');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const reportPath = path.join(__dirname, '2026-09-20-top-block-window.md');
const sampleTimes = [200, 500, 800, 1100, 1400];
const warningMin = Number(process.env.TOP_BLOCK_WARNING_OVERRIDE || .8);
let server, base;
const inClosureHarness = `
window.topBlockTestRun=(level,part,moving,sampleTimes)=>{if(!systemPaused)pauseGame('top-block-test');__tmbSetProgress(level,part,0,0);upgradePending=false;upgradeEl.classList.remove('show');spawnGrace=0;lives=10;partDeaths=0;rt.enemies=[];rt.fish=[];rt.fans=[];rt.launchPads=[];rt.rage.patterns=[];const g=buildScene(level,part),trigger=sceneStart()+g.anchors.trap.trigger,hazard=sceneStart()+g.anchors.hazard,solids=solidSurfaces(g.surfaces),probeX=g.anchors.trap.trigger,candidates=solids.filter(s=>probeX+player.w>s.x&&probeX<s.x+s.w),support=candidates.sort((a,b)=>a.y-b.y)[0]||solids.filter(s=>s.x<=probeX).sort((a,b)=>b.x-a.x)[0],setup={trap:scene().trap,trigger,hazard,playerY:moving?(support?.y??GROUND)-player.h:GROUND-player.h};player.x=moving?trigger+.01:hazard+(104-player.w)/2;player.y=setup.playerY;player.vx=moving?255:0;player.vy=0;player.onGround=true;const targetY=setup.playerY+4,samples=[],startDeaths=deaths,step=1000/60;let triggerAt=null,clearAt=null,reachAt=null,next=0,now=0;keys.right=moving;keys.jump=moving;for(let frame=0;frame<180;frame++){update(1/60);now+=step;if(triggerAt===null&&rt.armed)triggerAt=now;const elapsed=triggerAt===null?0:now-triggerAt,hb=hurtbox();if(triggerAt!==null&&clearAt===null&&hb.x>=hazard+104){clearAt=now;keys.right=false;keys.jump=false;player.x=sceneStart()+66;player.y=GROUND-player.h;player.vx=0;player.vy=0;player.onGround=true}if(triggerAt!==null&&reachAt===null&&rt.block.y+rt.block.h>=targetY)reachAt=now;while(triggerAt!==null&&next<sampleTimes.length&&elapsed+1e-6>=sampleTimes[next])samples.push({t:sampleTimes[next++],dead,deaths,x:player.x,blockY:rt.block.y,armed:rt.armed,done:rt.done})}keys.right=false;keys.left=false;keys.jump=false;return{...setup,triggerAt,clearAt,reachAt,windowMs:clearAt!==null&&reachAt!==null?reachAt-clearAt:null,dead,extraDeaths:deaths-startDeaths,samples}};
`;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(root, rel);
    fs.readFile(file, (err, body) => {
      res.statusCode = err ? 404 : 200;
      res.setHeader('Content-Type', rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      if(err)return res.end('missing');
      if(rel==='index.html')body=Buffer.from(body.toString().replace(/TOP_BLOCK_WARNING_MIN=[\d.]+/,`TOP_BLOCK_WARNING_MIN=${warningMin}`).replace(/\}\)\(\);\s*<\/script><\/body><\/html>\s*$/,`${inClosureHarness}\n})();\n</script></body></html>`));
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug`;
});
test.afterAll(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

async function boot(page) {
  await page.goto(base);
  await page.waitForFunction(() => window.__tmb?.platform.initialized);
  if (await page.locator('#characterSelect.show').count()) await page.locator('.characterChoice').first().click();
  await page.waitForFunction(()=>!__tmb.characterSelectOpen);
}

async function run(page, level, part, moving) {
  return page.evaluate(({level,part,moving,sampleTimes})=>window.topBlockTestRun(level,part,moving,sampleTimes),{level,part,moving,sampleTimes});
}

function model(row, minimum = 0) {
  const warning = Math.max(minimum, row.trap === 'signDrop' ? .28 : row.trap === 'finale' ? .34 : .4);
  const acc = row.trap === 'signDrop' ? 1350 : row.trap === 'finale' ? 1100 : 1420;
  const fall = Math.sqrt(2 * Math.max(0, (row.playerY + 4) - (72 + 70)) / acc);
  const clear = (row.hazard + 104 - row.trigger) / 255;
  return Math.round((warning + fall - clear) * 1000);
}

test('top-block family: 36 real windows, informed 5/5, stopped dies', async ({ browser }) => {
  test.setTimeout(360000);
  const levels = [1, 3, 8, 14, 30, 31];
  const grouped = await Promise.all(levels.map(async level => {
    const page = await browser.newPage(), levelRows = [];
    await boot(page);
    for (let part = 1; part <= 6; part++) {
      const informed = [];
      for (let runNo = 1; runNo <= 5; runNo++) informed.push({ run: runNo, ...await run(page, level, part, true) });
      const stopped = await run(page, level, part, false), measured = informed.find(r => Number.isFinite(r.windowMs));
      levelRows.push({ level, part, trap: informed[0].trap, oldModelMs: model(informed[0]), newModelMs: model(informed[0], warningMin), windowMs: Math.round(measured?.windowMs ?? NaN), informed, stopped });
    }
    await page.close();
    return levelRows;
  }));
  const rows = grouped.flat().sort((a,b)=>a.level-b.level||a.part-b.part);
  console.log('TOP_BLOCK_ROWS ' + JSON.stringify(rows.map(r=>({level:r.level,part:r.part,trap:r.trap,oldModelMs:r.oldModelMs,newModelMs:r.newModelMs,windowMs:r.windowMs,escapes:r.informed.filter(x=>!x.dead&&x.extraDeaths===0&&x.clearAt!==null).length,stoppedDead:r.stopped.dead,clearAt:r.informed[0].clearAt,reachAt:r.informed[0].reachAt}))));
  expect(rows).toHaveLength(36);
  for (const row of rows) {
    expect(Number.isFinite(row.windowMs), `L${row.level} P${row.part} measured window`).toBe(true);
    expect(row.informed.every(r => !r.dead && r.extraDeaths === 0 && r.clearAt !== null), `L${row.level} P${row.part} informed 5/5`).toBe(true);
    expect(row.stopped.dead && row.stopped.extraDeaths === 1, `L${row.level} P${row.part} stopped dies`).toBe(true);
    for (const attempt of [...row.informed, row.stopped]) expect(attempt.samples.map(s => s.t), `L${row.level} P${row.part} serial samples`).toEqual(sampleTimes);
  }
  const values = rows.map(r => r.windowMs).sort((a, b) => a - b), median = (values[17] + values[18]) / 2;
  const lines = [
    '# Tepeden blok kaçış penceresi — 2026-09-20', '',
    `Alt sınır: ${warningMin.toFixed(1)} sn. Gerçek pencere, bloğun tetik anındaki hurtbox yüksekliğine erişmesi ile botun bloğu temizlemesi arasındaki süredir.`, '',
    '| Part | Tuzak | Eski model (ms) | Yeni model (ms) | Gerçek (ms) | Kaçış | Duran |',
    '|---|---|---:|---:|---:|---:|---|',
    ...rows.map(r => `| L${r.level} P${r.part} | ${r.trap} | ${r.oldModelMs} | ${r.newModelMs} | ${r.windowMs} | ${r.informed.filter(x => !x.dead && x.extraDeaths === 0).length}/5 | ${r.stopped.dead ? 'öldü' : 'yaşadı'} |`),
    '', `Özet: min/med/max ${values[0]}/${median}/${values.at(-1)} ms; kaçış ${rows.filter(r => r.informed.every(x => !x.dead && x.extraDeaths === 0)).length}/36; duran ölüm ${rows.filter(r => r.stopped.dead).length}/36.`,
    'Karşı ölçüm: .50/.55/.56 başarısız, .57 başarılı.',
    `Örnekleme: her koşuda tetikten sonra ${sampleTimes.join('/')} ms; son örnek 1600 ms respawn sınırından öncedir.`
  ];
  fs.writeFileSync(reportPath, lines.join('\n') + '\n');
});
