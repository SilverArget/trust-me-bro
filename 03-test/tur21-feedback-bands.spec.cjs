const { test, expect } = require("playwright/test");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const evidence = path.join(root, "03-test", "manager-preview", "tur21-bant");
let server;
let origin;

const mime = file => file.endsWith(".html") ? "text/html; charset=utf-8"
  : file.endsWith(".js") ? "text/javascript; charset=utf-8"
  : file.endsWith(".json") ? "application/json; charset=utf-8"
  : file.endsWith(".png") ? "image/png"
  : file.endsWith(".mp3") ? "audio/mpeg"
  : "application/octet-stream";

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

async function open(page, viewport={width:800,height:450}) {
  await page.setViewportSize(viewport);
  await page.goto(`${origin}/index.html#debug`);
  await page.waitForFunction(() => window.__TMB_A12__ && document.body.dataset.campaignPhase === "running");
  await page.waitForFunction(() => !document.getElementById("introOverlay"));
}

async function firstCoinWithKeyboard(page) {
  await page.evaluate(() => {
    __tmbParkour.manual();
    __TMB_A12__.startRoute("D01",true);
    const coin=__TMB_A12__.getState().route.coins[0];
    __TMB_A12__.placePlayer(coin.x-52,coin.y-24);
  });
  await page.keyboard.down("ArrowRight");
  const collected=await page.evaluate(() => {
    for(let i=0;i<60;i++){
      __tmbCampaignStep(1/60);
      if(__TMB_A12__.getState().feedback.coins.length){__tmbCampaignDraw();return true;}
    }
    return false;
  });
  await page.keyboard.up("ArrowRight");
  expect(collected).toBe(true);
}

async function checkpointWithKeyboard(page, language, filename) {
  await page.evaluate(async language => {
    await __TMB_A12__.setLanguage(language);
    __tmbParkour.manual();
    const cp=__TMB_A12__.getState().route.checkpoints[1];
    __tmbSegmentStart(cp+8);
  }, language);
  const before = await page.evaluate(() => __TMB_A12__.getState().player.x);
  await page.keyboard.down("ArrowRight");
  const triggered = await page.evaluate(() => {
    for(let i=0;i<240;i++){
      __tmbCampaignStep(1/60);
      if(__TMB_A12__.getState().feedback.band?.key === "checkpoint"){
        for(let j=0;j<4;j++)__tmbCampaignStep(1/60);
        __tmbCampaignDraw();
        return {band:true,state:__TMB_A12__.getState(),keys:__tmb.keys,platform:__tmb.platform};
      }
    }
    return {band:false,state:__TMB_A12__.getState(),keys:__tmb.keys,platform:__tmb.platform};
  });
  await page.keyboard.up("ArrowRight");
  expect(triggered.band,JSON.stringify(triggered)).toBe(true);
  const state = await page.evaluate(() => __TMB_A12__.getState());
  expect(state.player.x).toBeGreaterThan(before);
  expect(state.feedback.band.duration).toBe(1.2);
  await page.screenshot({path:path.join(evidence, filename)});
  expect(await page.evaluate(() => {for(let i=0;i<73;i++)__tmbCampaignStep(1/60);return __TMB_A12__.getState().feedback.band;})).toBeNull();
  return state;
}

async function caughtWithKeyboardSession(page, language, filename) {
  const observed = await page.evaluate(async language => {
    await __TMB_A12__.setLanguage(language);
    __tmbParkour.manual();
    __TMB_A12__.unlockAllRoutes();
    __TMB_A12__.startRoute("D01", true);
    __tmbSegmentStart(1540);
    __tmbCampaignStep(1/60);
    __TMB_A12__.placePlayerAtChiefTime(14.2);
    __TMB_A12__.forceChiefNear(-60);
    let contact=null;
    for(let i=0;i<120;i++){
      __tmbCampaignStep(1/60);
      const state=__TMB_A12__.getState();
      if(!contact&&state.chief.catches>0)contact=state;
      if(state.feedback.band?.key==="caughtCheckpoint"){__tmbCampaignDraw();return {contact,respawn:state};}
    }
    return {contact,respawn:__TMB_A12__.getState()};
  }, language);
  const {contact,respawn}=observed;
  expect(contact).not.toBeNull();
  expect(contact.feedback.chiefCatchBandPending).toBe(true);
  expect(contact.feedback.band?.key || null).not.toBe("caughtCheckpoint");
  expect(respawn.feedback.band?.key).toBe("caughtCheckpoint");
  expect(respawn.chief.caughtT).toBe(0);
  expect(respawn.player.x).toBeCloseTo(respawn.checkpointX, 0);
  expect(respawn.feedback.band.duration).toBe(1.5);
  await page.keyboard.down("ArrowRight");
  const moved = await page.evaluate(x => {
    for(let i=0;i<30;i++)__tmbCampaignStep(1/60);
    __tmbCampaignDraw();
    return __TMB_A12__.getState().player.x>x+1;
  }, respawn.player.x);
  await page.keyboard.up("ArrowRight");
  expect(moved).toBe(true);
  await page.screenshot({path:path.join(evidence, filename)});
  expect(await page.evaluate(() => {for(let i=0;i<91;i++)__tmbCampaignStep(1/60);return __TMB_A12__.getState().feedback.band;})).toBeNull();
  return respawn;
}

test("D01 real keyboard pickup shows +1 sparkle for at most 0.6s without changing wallet", async ({page}) => {
  await open(page);
  const before = await page.evaluate(() => __TMB_A12__.getState().economy);
  await firstCoinWithKeyboard(page);
  const during = await page.evaluate(() => __TMB_A12__.getState());
  expect(during.economy.runCoins).toBe(before.runCoins+1);
  expect(during.economy.walletBalance).toBe(before.walletBalance);
  expect(during.feedback.coins[0].duration).toBeLessThanOrEqual(.6);
  await page.screenshot({path:path.join(evidence,"d01-keyboard-coin-plus1-sparkle-en.png")});
  expect(await page.evaluate(() => {for(let i=0;i<37;i++)__tmbCampaignStep(1/60);return __TMB_A12__.getState().feedback.coins.length;})).toBe(0);
});

test("checkpoint and caught bands are exact in EN/TR/RU and input remains live", async ({page}) => {
  test.setTimeout(30000);
  await open(page);
  const expected = {
    en:["CHECKPOINT","Caught! Back to checkpoint"],
    tr:["KONTROL NOKTASI","Yakalandın! Kontrol noktasına dönüş"],
    ru:["КОНТРОЛЬНАЯ ТОЧКА","Пойман! Назад к контрольной точке"],
  };
  for (const [language, labels] of Object.entries(expected)) {
    const checkpoint = await checkpointWithKeyboard(page, language, `d01-keyboard-checkpoint-${language}.png`);
    expect(checkpoint.feedback.band.label).toBe(labels[0]);
    const caught = await caughtWithKeyboardSession(page, language, `d01-keyboard-caught-${language}.png`);
    expect(caught.feedback.band.label).toBe(labels[1]);
  }
});

test("non-chief checkpoint retry does not show the chief-caught band", async ({page}) => {
  await open(page);
  await page.evaluate(() => {
    __tmbParkour.manual();
    __TMB_A12__.startRoute("D01", true);
    __TMB_A12__.retry(false);
    for(let i=0;i<8;i++)__tmbCampaignStep(1/60);
  });
  expect(await page.evaluate(() => __TMB_A12__.getState().feedback.band?.key || null)).not.toBe("caughtCheckpoint");
});

test("390x844 portrait band stays above touch controls", async ({browser}) => {
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page = await context.newPage();
  await open(page,{width:390,height:844});
  const state = await checkpointWithKeyboard(page,"tr","portrait-390x844-checkpoint-tr.png");
  expect(state.feedback.band.label).toBe("KONTROL NOKTASI");
  const placement = await page.evaluate(() => {
    const game=document.getElementById("game").getBoundingClientRect(),logical=__TMB_A12__.getState().viewport;
    const scale=game.width/logical.w,bandBottom=180*scale+game.top;
    const controls=[document.getElementById("joystick"),document.querySelector("#jumpWrap button")].map(e=>e.getBoundingClientRect());
    return {bandBottom,controlTop:Math.min(...controls.map(r=>r.top))};
  });
  expect(placement.bandBottom).toBeLessThan(placement.controlTop);
  await context.close();
});
