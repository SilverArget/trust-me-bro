const { test, expect } = require("playwright/test");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const playgamaRoot = path.resolve(root, "../04-yayin/playgama/dist");
let server, base;
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel =
      decodeURIComponent(new URL(req.url, "http://x").pathname).replace(
        /^\/+/,
        "",
      ) || "index.html";
    const isPlaygama = rel.startsWith("playgama/");
    const file = path.resolve(isPlaygama ? playgamaRoot : root, isPlaygama ? rel.slice(9) : rel);
    if (!file.startsWith(isPlaygama ? playgamaRoot : root)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (e, b) => {
      if (e) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".html")
          ? "text/html"
          : file.endsWith(".mp3")
            ? "audio/mpeg"
            : file.endsWith(".png")
              ? "image/png"
              : "application/octet-stream",
      );
      res.end(b);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});
test.afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
});
const mobile = {
  viewport: { width: 2400, height: 1080 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1.5,
};
async function state(page, expr) {
  return page.evaluate((e) => eval(e), expr);
}
async function ready(page) {
  await page.waitForFunction(() =>
    document.querySelector("#bootOverlay")?.classList.contains("hidden"),
  );
}
async function boot(page, hash = "#debug", settle = 1000) {
  await page.goto(base + hash);
  await ready(page);
  if (await page.locator("#characterSelect.show").count()) {
    const choice=page.locator(".characterChoice").first();
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await choice.tap(); else await choice.click();
  }
  await page.waitForTimeout(settle);
}
async function visual(page) {
  return page.evaluate(() => {
    const s = window.__tmb,
      p = s.player,
      r = s.courierRect,
      c = document.querySelector("#game"),
      g = c.getContext("2d"),
      d = c.width / parseFloat(c.style.width),
      x = Math.max(0, Math.min(c.width - 1, Math.round((r.x + r.w / 2) * d))),
      y = Math.max(0, Math.min(c.height - 1, Math.round((r.y + r.h / 2) * d))),
      pix = (a, b) => Array.from(g.getImageData(a, b, 1, 1).data),
      a = pix(x, y),
      b = pix(Math.max(0, x - 40), y);
    return {
      player: p,
      dead: s.dead,
      spawnGrace: s.spawnGrace,
      characterChosen: s.characterChosen,
      characterId: s.characterId,
      png: s.pngState[s.characterId],
      courierDrawn: s.courierDrawn,
      courierPath: s.courierPath,
      courierRect: r,
      sample: {
        x,
        y,
        rgba: a,
        background: b,
        different: JSON.stringify(a) !== JSON.stringify(b),
      },
    };
  });
}
const touchSessions = new WeakMap();
async function checkedPage(browser, options) {
  const page = await browser.newPage(options), errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console.error: ${m.text()}`); });
  page.__errors = errors;
  return page;
}
async function closeChecked(page) { expect(page.__errors, "JavaScript console errors").toEqual([]); await page.close(); }
async function touch(page, type, points) {
  let cdp = touchSessions.get(page);
  if (!cdp) {
    cdp = await page.context().newCDPSession(page);
    touchSessions.set(page, cdp);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points.map((p, i) => ({
      x: p.x,
      y: p.y,
      id: p.id ?? i + 1,
      radiusX: 2,
      radiusY: 2,
      force: 1,
    })),
  });
}

test("S1 gerçek canvas: başlangıç, restart, ölüm", async ({ browser }) => {
  const page = await checkedPage(browser, mobile);
  await boot(page);
  const initial = await visual(page);
  await page.keyboard.press("r");
  await page.waitForTimeout(1000);
  const restart = await visual(page);
  await page.keyboard.press("k");
  await page.waitForTimeout(1800);
  const afterDeath = await visual(page);
  console.log("S1", JSON.stringify({ initial, restart, afterDeath }));
  expect(
    initial.courierDrawn && restart.courierDrawn && afterDeath.courierDrawn,
  ).toBeTruthy();
  for (const [name, sample] of Object.entries({ initial, restart, afterDeath })) {
    expect(sample.courierRect, `${name}: courier bbox missing`).toBeTruthy();
    expect(sample.courierRect.x, `${name}: courier left of viewport`).toBeGreaterThanOrEqual(0);
    expect(sample.courierRect.x + sample.courierRect.w, `${name}: courier right of viewport`).toBeLessThanOrEqual(mobile.viewport.width);
  }
  await closeChecked(page);
});

test("S2 gerçek media/audio ve event yayılımı", async ({ browser }) => {
  const page = await checkedPage(browser, mobile);
  await page.addInitScript(() => {
    const A = window.Audio;
    window.__audios = [];
    window.Audio = function (...a) {
      const x = new A(...a);
      window.__audios.push(x);
      return x;
    };
    window.Audio.prototype = A.prototype;
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) {
      const P = new Proxy(C, {
        construct(t, a) {
          const x = Reflect.construct(t, a);
          window.__ac = x;
          return x;
        },
      });
      window.AudioContext = P;
      window.webkitAudioContext = P;
    }
  });
  await page.goto(base + "#debugAudio");
  await ready(page);
  await page.locator(".characterChoice").first().tap();
  await page.evaluate(() => {
    window.__audioSeen = { pointerdown: 0, touchstart: 0 };
    for (const n of Object.keys(__audioSeen))
      window.addEventListener(n, () => __audioSeen[n]++);
  });
  const joy = await page.locator("#joystick").boundingBox();
  await page.touchscreen.tap(joy.x + joy.width / 2, joy.y + joy.height / 2);
  await page.waitForTimeout(500);
  const audio = await page.evaluate(() => {
    const b = __audios[0],
      dbg = [...document.querySelectorAll("div")].find((x) =>
        x.innerText.startsWith("AC:"),
      );
    return {
      paused: b.paused,
      readyState: b.readyState,
      muted: b.muted,
      volume: b.volume,
      acState: __ac && __ac.state,
      seen: __audioSeen,
      src: b.currentSrc,
      networkState: b.networkState,
      debug: dbg && dbg.innerText,
    };
  });
  console.log("S2", JSON.stringify(audio));
  expect(audio.seen.pointerdown + audio.seen.touchstart).toBeGreaterThan(0);
  await closeChecked(page);
});

test("S3 joystick tek ve çoklu dokunma", async ({ browser }) => {
  const page = await checkedPage(browser, mobile);
  await boot(page);
  await page.keyboard.press("r");
  await page.waitForTimeout(100);
  const joy = await page.locator("#joystick").boundingBox(),
    jump = await page.locator("#jumpWrap button").boundingBox(),
    cx = joy.x + joy.width / 2,
    cy = joy.y + joy.height / 2;
  const snap = () =>
    page.evaluate(() => {
      const j = document.querySelector("#joystick"),
        k = document.querySelector("#joystickKnob"),
        r = j.getBoundingClientRect(),
        e = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2,
        ),
        m = new DOMMatrix(getComputedStyle(k).transform);
      return {
        axisFromKnob: m.e / (r.width * 0.3),
        transform: k.style.transform,
        top: e && e.id,
        hint: {
          pointerEvents: getComputedStyle(
            document.querySelector("#controlHint"),
          ).pointerEvents,
          z: getComputedStyle(document.querySelector("#controlHint")).zIndex,
        },
      };
    });
  const steps = { start: null, move: null, multi: null, end: null };
  await touch(page, "touchStart", [{ id: 1, x: cx, y: cy }]);
  steps.start = await snap();
  await touch(page, "touchMove", [{ id: 1, x: cx + 60, y: cy }]);
  steps.move = await snap();
  await touch(page, "touchStart", [
    { id: 1, x: cx + 60, y: cy },
    { id: 2, x: jump.x + jump.width / 2, y: jump.y + jump.height / 2 },
  ]);
  steps.multi = await snap();
  await touch(page, "touchEnd", []);
  steps.end = await snap();
  console.log("S3", JSON.stringify(steps));
  expect(Math.abs(steps.move.axisFromKnob)).toBeGreaterThan(0.1);
  expect(steps.multi.axisFromKnob).toBe(steps.move.axisFromKnob);
  expect(steps.end.axisFromKnob).toBe(0);
  expect(steps.end.transform).toContain("0px");
  await closeChecked(page);
});

test("S4 sahne 08 part 4 gerçek fizik tekrarları", async ({ browser }) => {
  test.setTimeout(60000);
  const page = await checkedPage(browser, mobile);
  await boot(page, "#s8p4debugAudio");
  const attempts = [];
  for (let a = 1; a <= 2; a++) {
    const started = Date.now();
    let jumps = 0;
    await page.keyboard.down("ArrowRight");
    while (Date.now() - started < 20000) {
      const s = await page.evaluate(() => ({
        dead: __tmb.dead,
        currentLevel: __tmb.currentLevel,
        currentPart: __tmb.currentPart,
        x: __tmb.player.x,
        y: __tmb.player.y,
        deaths: __tmb.deaths,
      }));
      if (s.dead || s.currentPart !== 4) {
        attempts.push({ ...s, attempt: a, jumps, ms: Date.now() - started });
        break;
      }
      if ((Date.now() - started) % 900 < 80) {
        await page.keyboard.press("Space");
        jumps++;
      }
      await page.waitForTimeout(50);
    }
    await page.keyboard.up("ArrowRight");
    if (await page.evaluate(() => __tmb.dead)) await page.waitForTimeout(1800);
    else if ((await page.evaluate(() => __tmb.currentPart)) === 4)
      attempts.push({
        ...(await page.evaluate(() => ({
          dead: __tmb.dead,
          currentLevel: __tmb.currentLevel,
          currentPart: __tmb.currentPart,
          x: __tmb.player.x,
          y: __tmb.player.y,
          deaths: __tmb.deaths,
        }))),
        attempt: a,
        jumps,
        ms: Date.now() - started,
      });
  }
  console.log("S4", JSON.stringify(attempts));
  expect(attempts.length).toBe(2);
  await closeChecked(page);
});

test("S5 character-select touch does not leak into gameplay", async ({ browser }) => {
  const page = await checkedPage(browser, mobile);
  await page.goto(base + "#debug");
  await ready(page);
  await page.locator(".characterChoice").first().tap();
  const series = [];
  let elapsed = 0;
  for (const ms of [200, 500, 800, 1100, 1400]) {
    await page.waitForTimeout(ms - elapsed);
    elapsed = ms;
    series.push(await page.evaluate((t) => ({
      t, ...__tmb.player, dead: __tmb.dead, deaths: __tmb.deaths,
      joystick: __tmb.joystick, keys: __tmb.keys,
      spawnGrace: __tmb.spawnGrace,
      characterChosen: __tmb.characterChosen,
    }), ms));
  }
  console.log("S5", JSON.stringify(series));
  for (const sample of series) {
    expect(sample.deaths, `death by ${sample.t}ms`).toBe(0);
    expect(sample.dead, `dead at ${sample.t}ms`).toBe(false);
    expect(sample.characterChosen).toBe(true);
  }
  await closeChecked(page);
});

test("S6 joystick capture edge, knob, rapid taps, and hint overlay", async ({ browser }) => {
  const page = await checkedPage(browser, mobile);
  await boot(page);
  const box = await page.locator("#joystick").boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const readJoy = (label) => page.evaluate((label) => ({
    label, ...__tmb.joystick,
    knobX: new DOMMatrix(getComputedStyle(document.querySelector("#joystickKnob")).transform).e,
  }), label);
  const cases = {};

  await touch(page, "touchStart", [{ id: 61, x: box.x - 16, y: cy }]);
  await touch(page, "touchMove", [{ id: 61, x: cx + 45, y: cy }]);
  cases.outsideIn = await readJoy("outside-in");
  await touch(page, "touchEnd", []);

  await touch(page, "touchStart", [{ id: 62, x: cx, y: cy }]);
  await touch(page, "touchMove", [{ id: 62, x: cx + 45, y: cy }]);
  cases.knob = await readJoy("knob");
  await touch(page, "touchEnd", []);

  await touch(page, "touchStart", [{ id: 63, x: cx - 30, y: cy }]);
  await touch(page, "touchEnd", []);
  await page.waitForTimeout(60);
  await touch(page, "touchStart", [{ id: 64, x: cx + 45, y: cy }]);
  cases.rapid = await readJoy("rapid-second-down");
  await touch(page, "touchEnd", []);

  await page.evaluate(() => document.querySelector("#controlHint").classList.add("show"));
  await touch(page, "touchStart", [{ id: 65, x: cx, y: cy }]);
  await touch(page, "touchMove", [{ id: 65, x: cx - 45, y: cy }]);
  cases.hint = await readJoy("hint-visible");
  cases.hint.tree = await page.evaluate(() => [...document.querySelectorAll("#controlHint, #controlHint *")].map(el => ({
    tag: el.tagName, className: el.className, pointerEvents: getComputedStyle(el).pointerEvents,
  })));
  await touch(page, "touchEnd", []);
  console.log("S6", JSON.stringify(cases));

  for (const [name, sample] of Object.entries(cases)) {
    expect(sample.active, `${name}: joystick inactive`).toBe(true);
    expect(Math.abs(sample.axis), `${name}: axis did not follow`).toBeGreaterThan(.2);
  }
  expect(cases.hint.tree.every(x => x.pointerEvents === "none")).toBe(true);
  await closeChecked(page);
});

test("S7 Playgama Bridge init, ready, storage, pause/resume", async ({ browser }) => {
  const page = await checkedPage(browser, mobile);
  await page.addInitScript(() => {
    window.__bridgeSpy = { initResolved: false, firstFrameAfterInit: false, messages: [], localGameSets: 0, events: {} };
    const data = new Map();
    const nativeSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) { if (String(new Error().stack).includes("index.html")) __bridgeSpy.localGameSets++; return nativeSet.call(this, k, v); };
    window.bridge = {
      EVENT_NAME: { PAUSE_STATE_CHANGED: "pause", AUDIO_STATE_CHANGED: "audio", INTERSTITIAL_STATE_CHANGED: "interstitial", REWARDED_STATE_CHANGED: "rewarded" },
      async initialize(){ await new Promise(r => setTimeout(r, 20)); __bridgeSpy.initResolved = true; },
      storage: { async get(keys){ return keys.map(k => data.get(k) ?? null); }, async set(keys, values){ keys.forEach((k, i) => data.set(k, values[i])); } },
      platform: { language: "en", isAudioEnabled: true, on(name, cb){ (__bridgeSpy.events[name] ||= []).push(cb); }, sendMessage(m){ __bridgeSpy.messages.push(m); __bridgeSpy.firstFrameAfterInit = __bridgeSpy.initResolved; } },
      advertisement: { isInterstitialSupported: false, isRewardedSupported: false, on(){}, showInterstitial(){}, showRewarded(){} }
    };
  });
  await page.goto(base.replace("/index.html", "/playgama/index.html") + "#debug");
  await ready(page);
  if (await page.locator("#characterSelect.show").count()) await page.locator(".characterChoice").first().tap();
  await page.waitForTimeout(200);
  const before = await page.evaluate(async () => ({ spy: __bridgeSpy, platform: __tmb.platform, saved: (await bridge.storage.get(["trust_me_bro_full31_v36_rage_save"]))[0] }));
  await page.evaluate(() => __bridgeSpy.events[bridge.EVENT_NAME.PAUSE_STATE_CHANGED].forEach(cb => cb(true)));
  await page.waitForTimeout(50);
  const paused = await page.evaluate(() => ({ platform: __tmb.platform, audio: __tmb.audio }));
  await page.evaluate(() => __bridgeSpy.events[bridge.EVENT_NAME.PAUSE_STATE_CHANGED].forEach(cb => cb(false)));
  await page.waitForTimeout(50);
  const resumed = await page.evaluate(() => __tmb.platform);
  console.log("S7", JSON.stringify({ before, paused, resumed }));
  expect(before.spy.initResolved && before.spy.firstFrameAfterInit).toBe(true);
  expect(before.spy.messages.filter(x => x === "game_ready")).toHaveLength(1);
  expect(before.spy.localGameSets).toBe(0); expect(JSON.parse(before.saved).v36.v).toBe(36);
  expect(paused.platform.systemPaused && !paused.platform.loopRunning && paused.audio.paused).toBe(true);
  expect(!resumed.systemPaused && resumed.loopRunning).toBe(true);
  await closeChecked(page);
});

test("S8 B2 free continue and optional skip copy", async ({ browser }) => {
  const page = await checkedPage(browser, mobile); await boot(page);
  await page.evaluate(() => __tmbOutOfLives());
  await expect(page.locator("#outOfLives")).toHaveClass(/show/);
  await expect(page.locator("#continueBtn")).toHaveText("CONTINUE");
  await expect(page.locator("#watchAdBtn")).toHaveText("SKIP THIS PART (WATCH AD)");
  expect(await page.locator("body").innerText()).not.toContain("+10 LIVES");
  console.log("S8", JSON.stringify({ continue: await page.locator("#continueBtn").innerText(), skip: await page.locator("#watchAdBtn").innerText() }));
  await closeChecked(page);
});

test("S9 orientation matrix", async ({ browser }) => {
  test.setTimeout(90000);
  const viewports = [[360,800,1],[390,844,1],[412,915,1],[768,1024,1],[800,800,1],[1000,1000,1],[800,360,1],[844,390,1],[915,412,1],[1024,768,0],[1280,720,0],[1920,1080,0],[2560,1080,0]], table = [];
  for (const [width,height,touchMode] of viewports) {
    const page = await checkedPage(browser, { viewport:{width,height}, hasTouch:!!touchMode, isMobile:!!touchMode, deviceScaleFactor:1 });
    await boot(page,"#debug",100); await page.evaluate(()=>{__tmbPause();__tmbSetProgress(1,1,0,0)}); await page.waitForFunction(()=>__tmb.courierRect,{timeout:1000});
    const row = await page.evaluate(() => {
      const v={w:innerWidth,h:innerHeight}, c=document.querySelector("#game").getBoundingClientRect(), l=__tmb.layout, p=__tmb.courierRect;
      const css=r=>({x:l.viewOffsetX+r.x*l.viewScale,y:l.viewOffsetY+r.y*l.viewScale,w:r.w*l.viewScale,h:r.h*l.viewScale});
      const inside=r=>r&&r.x>=-.5&&r.y>=-.5&&r.x+r.w<=v.w+.5&&r.y+r.h<=v.h+.5;
      const overlap=(a,b)=>!!a&&!!b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
      const box=id=>{const e=document.querySelector(id);if(!e||getComputedStyle(e).display==="none")return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
      const hud=css(l.hud),timer=css(l.timer),toast=css(l.toast),joy=box("#joystick"),jump=box("#jumpWrap button"),sprite=p,ps=__tmb.player,player=css({x:ps.x-__tmb.cam,y:l.worldY+ps.y,w:ps.w,h:ps.h});
      const gameVisible=inside(l.gameRect),spriteAspect=sprite&&sprite.w/sprite.h;
      return { viewport:`${v.w}x${v.h}`,branch:l.isPortrait?'portrait':'landscape',W:+l.W.toFixed(1),H:+l.H.toFixed(1),worldY:+l.worldY.toFixed(1),groundY:+(l.viewOffsetY+l.groundY*l.viewScale).toFixed(1),joyTop:joy&&+joy.y.toFixed(1),jumpTop:jump&&+jump.y.toFixed(1),joyW:+parseFloat(getComputedStyle(document.querySelector('#joystick')).width).toFixed(1),canvas:Math.abs(c.x)<.5&&Math.abs(c.y)<.5&&Math.abs(c.width-v.w)<.5&&Math.abs(c.height-v.h)<.5,scroll:document.documentElement.scrollWidth<=v.w&&document.documentElement.scrollHeight<=v.h,ui:[hud,timer,toast,joy,jump].filter(Boolean).every(inside),controls:!overlap(joy,jump)&&!overlap(joy,hud)&&!overlap(jump,hud),player:inside(player),aspect:l.W/l.H<=2.0001,gameVisible,spriteAspect,hasGutter:l.viewOffsetX>.5||l.viewOffsetY>.5,gameBox:l.gameRect,playerBox:player,spriteBox:sprite,dead:__tmb.dead,joy,jump,hud,edge:null};
    });
    if (row.hasGutter) {
      row.edge = await page.evaluate(() => { const c=document.querySelector("#game"),g=c.getContext("2d"),x=1,ys=[.2,.5,.8].map(y=>Math.floor(c.height*y)),rgb=x=>ys.map(y=>Array.from(g.getImageData(x,y,1,1).data.slice(0,3)));return{left:rgb(x),right:rgb(c.width-1-x)}; });
    }
    if (row.hasGutter || width === height) await page.screenshot({path:path.resolve(root,`test-results/orientation/${width}x${height}.png`)});
    row.texturedGutter=!row.hasGutter||[...row.edge.left,...row.edge.right].every(rgb=>rgb.some(channel=>channel!==0));
    table.push(row); await closeChecked(page);
  }
  console.table(table.map(({joy,jump,hud,edge,playerBox,...r})=>r)); console.log("S9_DETAILS",JSON.stringify(table.map(x=>({viewport:x.viewport,playerBox:x.playerBox,dead:x.dead,edge:x.edge}))));
  for(const r of table) {
    for(const k of ["canvas","scroll","ui","controls","player","aspect"]) expect(r[k],`${r.viewport} ${k}`).toBe(true);
    if(r.branch==='portrait') {
      expect(r.groundY,`${r.viewport} ground above control band`).toBeLessThanOrEqual(Math.min(r.joyTop,r.jumpTop)-8+.1);
      expect(r.playerBox.y+r.playerBox.h<=r.joy.y||r.playerBox.x+r.playerBox.w<=r.joy.x||r.playerBox.x>=r.joy.x+r.joy.w,`${r.viewport} player avoids joystick`).toBe(true);
      expect(r.playerBox.y+r.playerBox.h<=r.jump.y||r.playerBox.x+r.playerBox.w<=r.jump.x||r.playerBox.x>=r.jump.x+r.jump.w,`${r.viewport} player avoids jump`).toBe(true);
      expect(r.joyW,`${r.viewport} portrait joystick width`).toBeCloseTo(parseInt(r.viewport)<=700?74:62,0);
    } else expect(r.joyW,`${r.viewport} landscape joystick width`).toBeCloseTo(124,0);
    expect(r.gameVisible,`${r.viewport} game area fully visible`).toBe(true);
    expect(r.spriteAspect,`${r.viewport} sprite aspect preserved`).toBeCloseTo(.552,2);
    expect(r.texturedGutter,`${r.viewport} backdrop gutter non-black`).toBe(true);
  }
});

test("S10 orientation change preserves progress", async ({ browser }) => {
  const page = await checkedPage(browser,{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  await boot(page,"#debug",100); await page.evaluate(()=>{__tmbPause();__tmbSetProgress(1,2,1,3)}); await page.waitForTimeout(50);
  const snap=()=>page.evaluate(()=>({level:__tmb.currentLevel,part:__tmb.currentPart,coins:__tmb.coins,deaths:__tmb.deaths,dead:__tmb.dead,canvas:[game.getBoundingClientRect().width,game.getBoundingClientRect().height],layout:__tmb.layout}));
  const series=[await snap()]; for(const viewport of [{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(viewport);await page.evaluate(()=>{dispatchEvent(new Event("orientationchange"));dispatchEvent(new Event("resize"))});await page.waitForTimeout(250);series.push(await snap())}
  console.log("S10",JSON.stringify(series)); for(const s of series){expect([s.level,s.part,s.coins,s.deaths]).toEqual([1,2,1,3]);expect(s.dead).toBe(false);expect(s.canvas).toEqual([s.layout.isPortrait?390:844,s.layout.isPortrait?844:390])} await closeChecked(page);
});
