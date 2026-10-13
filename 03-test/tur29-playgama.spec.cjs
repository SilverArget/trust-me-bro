const { test, expect } = require("playwright/test");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const keys = {
  save: "trust_me_bro_last_delivery_v2_save",
  profile: "trust_me_bro_campaign_profile_v1",
  audio: "trust_me_bro_audio_v1",
};
let server, origin;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://local").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end("missing");
    const type = file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".js") ? "text/javascript; charset=utf-8" : file.endsWith(".json") ? "application/json" : file.endsWith(".png") ? "image/png" : "application/octet-stream";
    const body = fs.readFileSync(file);
    res.writeHead(200, { "content-type": type, "content-length": body.length, "cache-control": "public, max-age=3600" });
    res.end(body);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function installBridge(page, initial = {}) {
  await page.addInitScript(({ initial, keys }) => {
    if (!window.name) window.name = JSON.stringify(initial);
    const read = () => JSON.parse(window.name || "{}");
    const write = value => { window.name = JSON.stringify(value); };
    const listeners = new Map();
    const events = { PAUSE_STATE_CHANGED:"pause", AUDIO_STATE_CHANGED:"audio", INTERSTITIAL_STATE_CHANGED:"interstitial", REWARDED_STATE_CHANGED:"rewarded" };
    window.__tur29 = { storage:[], local:[], ad:[], drawn:[], readyMs:null };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(source, ...args) {
      const src = source?.currentSrc || source?.src || "";
      if (src) window.__tur29.drawn.push(decodeURIComponent(new URL(src, location.href).pathname).replace(/^\/+/, ""));
      return drawImage.call(this, source, ...args);
    };
    for (const method of ["getItem", "setItem", "removeItem"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function(...args) { window.__tur29.local.push({ method, key:args[0] }); return original.apply(this,args); };
    }
    const emit = (name, value) => (listeners.get(name) || []).slice().forEach(fn => fn(value));
    window.bridge = {
      EVENT_NAME: events,
      async initialize() {},
      storage: {
        async get(requested) { window.__tur29.storage.push({ op:"get", keys:[...requested] }); const store=read(); return requested.map(key => store[key] ?? null); },
        async set(requested, values) { window.__tur29.storage.push({ op:"set", keys:[...requested] }); const store=read(); requested.forEach((key,i)=>store[key]=values[i]); write(store); },
        async delete(requested) { window.__tur29.storage.push({ op:"delete", keys:[...requested] }); const store=read(); requested.forEach(key=>delete store[key]); write(store); },
      },
      platform: { language:"en", isAudioEnabled:true, on(){}, sendMessage(name) { if(name==="game_ready") window.__tur29.readyMs=performance.now(); } },
      advertisement: {
        isInterstitialSupported:true, isRewardedSupported:true,
        on(name, fn) { const list=listeners.get(name)||[]; list.push(fn); listeners.set(name,list); },
        off(name, fn) { listeners.set(name,(listeners.get(name)||[]).filter(value=>value!==fn)); },
        showInterstitial(placement) { window.__tur29.ad.push({ placement, state:"loading" }); emit(events.INTERSTITIAL_STATE_CHANGED,"loading"); window.__tur29.ad.push({ placement, state:"opened" }); emit(events.INTERSTITIAL_STATE_CHANGED,"opened"); setTimeout(()=>{window.__tur29.ad.push({ placement, state:"closed" });emit(events.INTERSTITIAL_STATE_CHANGED,"closed");},600); },
        showRewarded() {},
      },
    };
  }, { initial, keys });
}

async function finishAndClick(page) {
  await page.evaluate(() => window.__TMB_A12__.finish());
  await page.locator('#a12Actions [data-act="next"]').click();
  await page.waitForFunction(() => window.__TMB_A12__.getState().result === null);
}

test("Bridge storage is one startup get; audio roundtrip and route interstitial preserve lifecycle", async ({ page }) => {
  await installBridge(page, { [keys.profile]: JSON.stringify({ walletBalance:7 }), [keys.audio]: JSON.stringify({ music:.31, sfx:.62 }) });
  await page.goto(`${origin}/index.html#debug&bridgeAds`);
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tur29.readyMs !== null);
  await page.evaluate(() => window.__tmbAudio.ready());
  await page.evaluate(() => addEventListener("keydown", event => { if(event.key==="v") window.__tmbAudio.setLevel("music",.27); }, { once:true }));
  await page.keyboard.press("v");
  await page.waitForFunction(key => JSON.parse(window.name)[key] !== undefined, keys.audio);
  await page.reload();
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tur29.readyMs !== null);
  await page.evaluate(() => window.__tmbAudio.ready());
  await finishAndClick(page);
  await page.evaluate(() => window.__TMB_A12__.finish());
  const click = page.locator('#a12Actions [data-act="next"]').click();
  await page.waitForFunction(() => window.__tur29.ad.some(row => row.state === "opened"));
  const paused = await page.evaluate(() => ({ lifecycle:window.__tmbLifecycle.state(), audio:window.__tmbAudio.state() }));
  await click;
  await page.waitForFunction(() => window.__tur29.ad.some(row => row.state === "closed"));
  await page.waitForFunction(() => window.__TMB_A12__.getState().result === null);
  const measured = await page.evaluate(keys => ({
    startupGets:__tur29.storage.filter(row=>row.op==="get"),
    localCalls:__tur29.local,
    levels:__tmbAudio.state().levels,
    ad:__tur29.ad,
    resumed:__tmbLifecycle.state(),
    routeId:__TMB_A12__.getState().routeId,
  }), keys);
  const actual = {
    initialDelay:JSON.parse(fs.readFileSync(path.join(root,"playgama-bridge-config.json"),"utf8")).advertisement.initialInterstitialDelay,
    getCount:measured.startupGets.length,
    getKeys:measured.startupGets[0]?.keys,
    localCount:measured.localCalls.length,
    music:measured.levels.music,
    states:measured.ad.map(row=>row.state),
    placement:measured.ad[0]?.placement,
    paused:paused.lifecycle.systemPaused && paused.audio.paused && paused.audio.platform===false,
    resumed:!measured.resumed.systemPaused && measured.resumed.loopRunning,
    routeId:measured.routeId,
  };
  console.log(`TUR29_BRIDGE=${JSON.stringify(actual)}`);
  const expected = process.env.TUR29_NEGATIVE === "1" ? { ...actual, getCount:0 } : { initialDelay:0, getCount:1, getKeys:[keys.save,keys.profile,keys.audio], localCount:0, music:.27, states:["loading","opened","closed"], placement:"route_completed", paused:true, resumed:true, routeId:"D03" };
  expect(actual).toEqual(expected);
});

test("cached reload stays under 3 MB through game_ready plus three seconds", async ({ page }) => {
  await installBridge(page, { [keys.profile]: JSON.stringify({ runnerId:"male", equippedOutfitByRunner:{ male:"default" }, equippedChief:"securityTall" }) });
  await page.goto(`${origin}/index.html#debug&bridgeAds`);
  await page.waitForFunction(() => window.__tur29.readyMs !== null && window.__TMB_A12__);
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForFunction(() => window.__tur29.readyMs !== null && window.__TMB_A12__);
  await page.waitForFunction(() => performance.now() >= window.__tur29.readyMs + 3100);
  const timing = await page.evaluate(() => ({ readyMs:__tur29.readyMs, resources:performance.getEntriesByType("resource").map(row=>({ name:row.name, responseEnd:row.responseEnd, decodedBodySize:row.decodedBodySize, transferSize:row.transferSize })) }));
  const rel = value => decodeURIComponent(new URL(value).pathname).replace(/^\/+/, "");
  const windowResources=timing.resources.filter(row=>row.responseEnd>0&&row.responseEnd<=timing.readyMs+3000);
  const bytes=windowResources.reduce((sum,row)=>sum+row.decodedBodySize,0);
  const atlas=file=>/^sprites\/a5\/(?:.+-full|npc-.+)\.png$/.test(file)||/^sprites\/chiefs\/.+-full\.png$/.test(file);
  const atlases=[...new Set(windowResources.map(row=>rel(row.name)).filter(atlas))].sort();
  const expectedAtlases=["sprites/a5/male-default-full.png","sprites/a5/npc-decor.png","sprites/chiefs/securityTall-full.png"].sort();
  const actual = { bytes, under3MiB:bytes<=3*1024*1024, atlases, selectedOnly:JSON.stringify(atlases)===JSON.stringify(expectedAtlases), cachedAtlasTransfers:windowResources.filter(row=>atlas(rel(row.name))).every(row=>row.transferSize===0), routeId:await page.evaluate(()=>__TMB_A12__.getState().routeId) };
  console.log(`TUR29_READY=${JSON.stringify({ ...actual, readyMs:timing.readyMs, resourceCount:windowResources.length })}`);
  const expected = process.env.TUR29_NEGATIVE === "1" ? { ...actual, under3MiB:false } : { bytes:actual.bytes, under3MiB:true, atlases:expectedAtlases, selectedOnly:true, cachedAtlasTransfers:true, routeId:"D01" };
  expect(actual).toEqual(expected);
});

test("runner, outfit, chief and D01 NPC atlases load and draw only on demand", async ({ page }, testInfo) => {
  await installBridge(page, { [keys.profile]: JSON.stringify({
    runnerId:"male", ownedRunnerIds:["male","female"], equippedOutfitByRunner:{ male:"default", female:"default" },
    ownedOutfitSetIds:["default","dockCrew"], ownedChiefIds:["securityTall","classicChief"], equippedChief:"securityTall",
  }) });
  await page.goto(`${origin}/index.html#debug&bridgeAds`);
  await page.waitForFunction(() => window.__tur29.readyMs !== null && window.__TMB_A12__ && window.__tur29.drawn.includes("sprites/a5/npc-decor.png"));
  await page.locator("#game").screenshot({ path:testInfo.outputPath("id-male-before.png") });
  await page.evaluate(() => { const c=document.querySelector("#game"); window.__tur29.beforePixels=Array.from(c.getContext("2d").getImageData(0,0,c.width,c.height).data); });
  await page.locator("#characterChange").click();
  await page.locator('.characterChoice[data-runner-id="female"]').click();
  await page.waitForFunction(() => window.__TMB_A12__.profile().runnerId==="female" && performance.getEntriesByType("resource").some(row=>row.name.includes("female-default-full.png")) && window.__tur29.drawn.includes("sprites/a5/female-default-full.png"));
  await page.locator("#game").screenshot({ path:testInfo.outputPath("id-female-after.png") });
  const idPixelDiff=await page.evaluate(() => { const c=document.querySelector("#game"),after=c.getContext("2d").getImageData(0,0,c.width,c.height).data,before=window.__tur29.beforePixels;let changed=0;for(let i=0;i<after.length;i+=4)if(after[i]!==before[i]||after[i+1]!==before[i+1]||after[i+2]!==before[i+2]||after[i+3]!==before[i+3])changed++;return changed; });

  await page.evaluate(() => window.__TMB_A12__.finish());
  await page.locator('#a12Actions [data-act="shop"]').click();
  await page.waitForFunction(() => document.querySelector("#a12Shop")?.classList.contains("show"));
  await page.evaluate(() => { const c=document.querySelector("#a12Preview canvas"); window.__tur29.previewPixels=Array.from(c.getContext("2d").getImageData(0,0,c.width,c.height).data); });
  await page.locator('[data-list="outfits"] article[data-item="dockCrew"] h3').click();
  await page.waitForFunction(() => performance.getEntriesByType("resource").some(row=>row.name.includes("female-dockCrew-full.png")) && window.__tur29.drawn.includes("sprites/a5/female-dockCrew-full.png"));
  await page.locator("#a12Preview canvas").screenshot({ path:testInfo.outputPath("shop-female-dockCrew.png") });
  const outfitPixelDiff=await page.evaluate(() => { const c=document.querySelector("#a12Preview canvas"),after=c.getContext("2d").getImageData(0,0,c.width,c.height).data,before=window.__tur29.previewPixels;let changed=0;for(let i=0;i<after.length;i+=4)if(after[i]!==before[i]||after[i+1]!==before[i+1]||after[i+2]!==before[i+2]||after[i+3]!==before[i+3])changed++;return changed; });

  await page.locator('[data-tab="chiefs"]').click();
  await page.locator('[data-list="chiefs"] article[data-item="classicChief"] [data-action]').click();
  await page.waitForFunction(() => window.__TMB_A12__.profile().equippedChief==="classicChief" && window.__tur29.drawn.includes("sprites/chiefs/classicChief-full.png"));
  await page.locator("#a12Preview canvas").screenshot({ path:testInfo.outputPath("shop-classicChief.png") });
  const actual=await page.evaluate(({idPixelDiff,outfitPixelDiff})=>({
    idPixelDiff,outfitPixelDiff,idPixelsChanged:idPixelDiff>0,outfitPixelsChanged:outfitPixelDiff>0,runner:__TMB_A12__.profile().runnerId,chief:__TMB_A12__.profile().equippedChief,
    femaleDrawn:__tur29.drawn.includes("sprites/a5/female-default-full.png"),outfitDrawn:__tur29.drawn.includes("sprites/a5/female-dockCrew-full.png"),
    chiefDrawn:__tur29.drawn.includes("sprites/chiefs/classicChief-full.png"),d01NpcDrawn:__tur29.drawn.includes("sprites/a5/npc-decor.png"),
  }),{idPixelDiff,outfitPixelDiff});
  console.log(`TUR29_ON_DEMAND=${JSON.stringify(actual)}`);
  const expected=process.env.TUR29_NEGATIVE==="1"?{...actual,femaleDrawn:false}:{idPixelDiff:actual.idPixelDiff,outfitPixelDiff:actual.outfitPixelDiff,idPixelsChanged:true,outfitPixelsChanged:true,runner:"female",chief:"classicChief",femaleDrawn:true,outfitDrawn:true,chiefDrawn:true,d01NpcDrawn:true};
  expect(actual).toEqual(expected);
});

test("standalone web keeps localStorage fallback", async ({ page }) => {
  await page.route("**/playgama-bridge.js", route => route.fulfill({ status:200, contentType:"text/javascript", body:"/* standalone */" }));
  await page.addInitScript(key => { if(localStorage.getItem(key)===null)localStorage.setItem(key, JSON.stringify({ music:.44, sfx:.66 })); }, keys.audio);
  await page.goto(`${origin}/index.html#debug`);
  await page.waitForFunction(() => window.__tmbAudio);
  await page.evaluate(() => addEventListener("keydown",event=>{if(event.key==="v")__tmbAudio.setLevel("sfx",.25)},{once:true}));
  await page.keyboard.press("v");
  await page.reload();
  await page.waitForFunction(() => window.__tmbAudio);
  const actual = await page.evaluate(key => ({ levels:__tmbAudio.state().levels, stored:JSON.parse(localStorage.getItem(key)) }), keys.audio);
  console.log(`TUR29_WEB=${JSON.stringify(actual)}`);
  const expected = process.env.TUR29_NEGATIVE === "1" ? { ...actual, levels:{ music:0, sfx:0 } } : { levels:{ music:.44, sfx:.25 }, stored:{ music:.44, sfx:.25 } };
  expect(actual).toEqual(expected);
});
