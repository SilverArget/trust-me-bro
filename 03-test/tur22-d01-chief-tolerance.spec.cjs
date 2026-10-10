const { test, expect } = require("playwright/test");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(process.env.TMB_APP_ROOT || path.join(__dirname, ".."));
const evidence = path.join(path.resolve(__dirname, ".."), "03-test", "manager-preview", "tur22-d01-sef");
const FIRST_RISE = Object.freeze({ id:"d01-v-07", x1:1536, x2:1680, y:-256.45 });
let server;
let origin;

const mime = file => file.endsWith(".html") ? "text/html; charset=utf-8"
  : file.endsWith(".js") ? "text/javascript; charset=utf-8"
  : file.endsWith(".json") ? "application/json; charset=utf-8"
  : file.endsWith(".png") ? "image/png"
  : file.endsWith(".mp3") ? "audio/mpeg"
  : "application/octet-stream";

test.describe.configure({ mode:"serial" });

test.beforeAll(async () => {
  fs.mkdirSync(evidence, { recursive:true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://local").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (error, body) => {
      if (error) return res.writeHead(404).end("missing");
      res.writeHead(200, { "content-type":mime(file) });
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function open(page, routeId="D01", viewport={width:832,height:424}) {
  await page.setViewportSize(viewport);
  await page.goto(`${origin}/index.html#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const chooser = page.locator(".characterChoice:visible").first();
  if (await chooser.count()) await chooser.click();
  await page.waitForFunction(() => document.body.dataset.campaignPhase === "running");
  await page.evaluate(async id => {
    __TMB_A12__.unlockAllRoutes();
    if (id[0] === "F") {
      await __TMB_A12__.setWallet(1000);
      await __TMB_A12__.purchaseWorld("frozen");
      __TMB_A12__.renderWorldOnRoute("frozen", id);
    } else {
      __TMB_A12__.renderWorldOnRoute("dock31", id);
    }
    __TMB_A12__.startRoute(id, true);
    window.__tur22Events = [];
    addEventListener("tmb:game-event", event => window.__tur22Events.push({type:event.detail?.type, detail:event.detail, wall:performance.now()}));
  }, routeId);
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, routeId);
}

function screenSample(s, layout) {
  const scale = layout.viewScale || 1;
  const offsetX = layout.viewOffsetX || 0;
  return {
    t:+s.gameClock.toFixed(3),
    playerX:+s.player.x.toFixed(2),
    chiefX:+s.chief.x.toFixed(2),
    playerScreenX:+(offsetX + (s.player.x - s.cameraX + s.hitbox.w / 2) * scale).toFixed(2),
    chiefScreenX:+(offsetX + (s.chief.x - s.cameraX + s.chief.w / 2) * scale).toFixed(2),
    gap:+(s.player.x - (s.chief.x + s.chief.w)).toFixed(2),
    catches:s.chief.catches,
    phase:s.chief.entryPhase,
    tolerance:s.chiefTolerance || null,
  };
}

async function sampleState(page) {
  return page.evaluate(() => ({s:__TMB_A12__.getState(), layout:window.__tmb.layout}));
}

async function waitForFirstRise(page) {
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(x1 => {
    const s=__TMB_A12__.getState();
    return s.player.x >= x1 - s.hitbox.w - 8 && Math.abs(s.player.vx) < 8;
  }, FIRST_RISE.x1, {timeout:20000});
  return (await sampleState(page)).s;
}

test("D01 geometry identifies the first solid rise from the manager frame", async ({page}) => {
  await open(page);
  const segment = await page.evaluate(id => __TMB_A12__.routeDefinition("D01").groundSegments.find(s => s.id === id), FIRST_RISE.id);
  expect(segment).toMatchObject({id:FIRST_RISE.id,x:FIRST_RISE.x1,w:FIRST_RISE.x2-FIRST_RISE.x1,y:FIRST_RISE.y,kind:"ground"});
});

test("D01 real keyboard: 15s at first rise is safe and visible, then landing enables catch", async ({page}) => {
  test.setTimeout(45000);
  await open(page);
  const stalled = await waitForFirstRise(page);
  const startCatch = stalled.chief.catches;
  const samples=[];
  const startWall=Date.now();
  for(let second=0;second<=15;second++) {
    if (second) await page.waitForTimeout(1000);
    const {s,layout}=await sampleState(page);
    if(s.chief?.entryPhase === "running") samples.push(screenSample(s,layout));
  }
  const heldSeconds=(Date.now()-startWall)/1000;
  const beforeJump=(await sampleState(page)).s;
  await page.screenshot({path:path.join(evidence,"d01-first-rise-15s-safe-chief-behind.png")});
  console.log(`TUR22_D01_WAIT ${JSON.stringify({heldSeconds:+heldSeconds.toFixed(3),startCatch,endCatch:beforeJump.chief.catches,samples})}`);
  expect(beforeJump.chief.catches-startCatch).toBe(0);
  expect(samples.length).toBeGreaterThanOrEqual(10);
  expect(samples.every(row => row.chiefScreenX < row.playerScreenX && row.gap > 0)).toBe(true);

  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  await page.keyboard.up("Space");
  await page.waitForFunction(id => __TMB_A12__.getState().chiefTolerance?.completedOnSurfaceId === id, FIRST_RISE.id, {timeout:5000});
  await page.keyboard.up("ArrowRight");
  const landed=(await sampleState(page)).s;
  await page.screenshot({path:path.join(evidence,"d01-first-rise-landed-tolerance-ended.png")});
  const catchStart=landed.gameClock;
  await page.waitForFunction(base => __TMB_A12__.getState().chief.catches > base, landed.chief.catches, {timeout:10000});
  const caught=(await sampleState(page)).s;
  const catchSeconds=caught.gameClock-catchStart;
  console.log(`TUR22_D01_CATCH ${JSON.stringify({landedX:+landed.player.x.toFixed(2),catchX:+caught.chief.lastReturnX?.toFixed?.(2),catchSeconds:+catchSeconds.toFixed(3),checkpointX:caught.checkpointX})}`);
  expect(catchSeconds).toBeGreaterThan(1);
  expect(catchSeconds).toBeLessThanOrEqual(10);
  await page.waitForFunction(() => __TMB_A12__.getState().chief.caughtT <= 0);
  await page.waitForTimeout(150);
  await page.screenshot({path:path.join(evidence,"d01-after-rise-caught-respawn.png")});
});

test("D01 retries reopen only before the rise; checkpoint 4214 stays complete", async ({page}) => {
  await open(page);
  const result=await page.evaluate(() => {
    __tmbParkour.manual();
    __TMB_A12__.retry(true);
    const start=__TMB_A12__.getState().chiefTolerance;
    __tmbSegmentStart(4215);
    for(let i=0;i<3;i++)__tmbCampaignStep(1/60);
    const checkpoint=__TMB_A12__.getState();
    __TMB_A12__.placePlayer(4300, 2000);
    __tmbCampaignStep(1/60);
    const retry=__TMB_A12__.getState();
    __TMB_A12__.placePlayer(retry.route.finishX+2);
    __tmbCampaignStep(1/60);
    for(let i=0;i<100;i++)__tmbCampaignStep(1/60);
    const finish=__TMB_A12__.getState();
    return {start,checkpointX:checkpoint.checkpointX,checkpointTolerance:checkpoint.chiefTolerance,retryX:retry.player.x,retryTolerance:retry.chiefTolerance,finishResult:!!finish.result};
  });
  console.log(`TUR22_RETRY ${JSON.stringify(result)}`);
  expect(result.start.active).toBe(true);
  expect(result.checkpointX).toBe(4214);
  expect(result.retryX).toBe(4214);
  expect(result.retryTolerance.active).toBe(false);
  expect(result.finishResult).toBe(true);
});

test("D01 tolerance is position-bound for 60 game seconds", async ({page}) => {
  await open(page);
  await page.keyboard.down("ArrowRight");
  const measured=await page.evaluate(() => {
    __tmbParkour.manual();
    __tmbSegmentStart(1504);
    const base=__TMB_A12__.getState().chief.catches;
    for(let i=0;i<3600;i++)__tmbCampaignStep(1/60);
    const s=__TMB_A12__.getState();
    return {seconds:60,catches:s.chief.catches-base,playerX:+s.player.x.toFixed(2),chiefX:+s.chief.x.toFixed(2),gap:+(s.player.x-(s.chief.x+s.chief.w)).toFixed(2),tolerance:s.chiefTolerance};
  });
  await page.keyboard.up("ArrowRight");
  console.log(`TUR22_D01_60S ${JSON.stringify(measured)}`);
  expect(measured.catches).toBe(0);
  expect(measured.gap).toBeGreaterThan(0);
  expect(measured.tolerance.active).toBe(true);
});

for (const routeId of ["D02","F01"]) test(`${routeId} unchanged chief stop measurement`, async ({page}) => {
  await open(page,routeId);
  const measured=await page.evaluate(() => {
    __tmbParkour.manual();
    window.__tmbXWriteLog=[];
    __TMB_A12__.placePlayerAtChiefTime(14.2);
    const start=__TMB_A12__.getState();
    const base=start.chief.catches;
    for(let i=0;i<3600;i++){
      __tmbCampaignStep(1/60);
      const s=__TMB_A12__.getState();
      if(s.chief.catches>base){const log=window.__tmbXWriteLog.find(row=>row.source==="chief-catch-reset");return {routeId:s.route.id,seconds:+(s.gameClock-start.gameClock).toFixed(3),catchPlayerX:+log.beforeX.toFixed(2),catchChiefX:+log.chiefX.toFixed(2),returnX:s.chief.lastReturnX,hash:s.chiefRouteHash};}
    }
    const end=__TMB_A12__.getState();
    return {routeId:start.route.id,seconds:null,playerX:end.player.x,chiefX:end.chief.x,hash:start.chiefRouteHash,phase:end.chief.entryPhase,entry:end.chief.entry,playerT:end.chief.playerT,chiefT:end.chief.chiefT,delay:end.chief.delay};
  });
  console.log(`TUR22_PARITY ${JSON.stringify(measured)}`);
  expect(measured.seconds).not.toBeNull();
});
