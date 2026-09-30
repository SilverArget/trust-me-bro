const { test, expect } = require("playwright/test");
const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  crypto = require("crypto"),
  cp = require("child_process");
const { runBot, startBot, stopBot } = require("./lib/bot-s-drive.cjs"),
  { runWalking } = require("./lib/bot-w.cjs"),
  { runAftermath } = require("./lib/bot-aftermath.cjs");
const root = path.resolve(__dirname, ".."),
  evidence = path.join(__dirname, "a5c3-evidence");
let server, origin;
test.use({ hasTouch: true });
const write = (name, value) => {
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(
    path.join(evidence, `${name}.json`),
    JSON.stringify(value, null, 2),
  );
  return value;
};
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = new URL(req.url, "http://x").pathname.slice(1) || "index.html";
    try {
      let b = fs.readFileSync(path.join(root, rel));
      if (rel === "js/a12-campaign.js")
        b = Buffer.from(
          b.toString().replace(
            "if (DEBUG) {",
            "if (DEBUG) { window.a5cProbe=code=>eval(code);",
          ),
        );
      res.setHeader(
        "Content-Type",
        rel.endsWith(".js")
          ? "text/javascript"
          : rel.endsWith(".html")
            ? "text/html"
            : "application/octet-stream",
      );
      res.end(b);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => new Promise((r) => server.close(r)));
async function open(page, debug = true) {
  await page.goto(`${origin}/index.html${debug ? "#debug" : ""}`);
  if (debug) await page.waitForFunction(() => window.__TMB_A12__);
}
const spread = (a) => Math.max(...a) - Math.min(...a),
  mad = (a, b) => a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length;
test("B-E1 setting model", async ({ page }) => {
  await open(page);
  const value = await page.evaluate(() => {
    const payload = {
      schemaVersion: 1,
      profileRevision: 7,
      walletBalance: 73,
      runnerId: "female",
      ownedRunnerIds: ["male", "female"],
      equippedOutfitByRunner: { male: "dockCrew", female: "default" },
      ownedOutfitSetIds: ["default", "dockCrew"],
      ownedWorldIds: ["dock31", "frozen"],
      selectedWorldId: "frozen",
      progressByRoute: { D01: { completed: true, stars: 3 } },
      pendingRunsByRoute: { D02: { runId: "p" } },
      bestRunsByRouteVersion: { "D01@1": { elapsed: 31 } },
      settings: { language: "tr" },
      migrationFlags: {},
      legacyProgress: null,
      bankedRunIds: ["g1"],
    };
    const legacy = {
      v: 36,
      partCount: 6,
      currentLevel: 4,
      currentPart: 2,
      collected: Array(31).fill(false),
      character: 2,
      bgmMuted: true,
    };
    const a = __TMB_A12__.normalizeProfile(payload),
      b = __TMB_A12__.migrateV36(legacy, payload),
      c = __TMB_A12__.normalizeProfile({
        ...payload,
        settings: { ...payload.settings, reducedEffects: true },
      });
    const fields = [
      "walletBalance",
      "runnerId",
      "equippedOutfitByRunner",
      "ownedOutfitSetIds",
      "ownedWorldIds",
      "selectedWorldId",
      "progressByRoute",
      "pendingRunsByRoute",
      "bestRunsByRouteVersion",
      "bankedRunIds",
    ];
    const diff = (x, y) =>
      fields.filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
    return {
      fixtures: {
        missing: a.settings.reducedEffects === true,
        v36: b.settings.reducedEffects === true,
        a5c2:
          __TMB_A12__.normalizeProfile(payload).settings.reducedEffects ===
          true,
        persisted: c.settings.reducedEffects,
      },
      settings: {
        missingKeys: Object.keys(a.settings),
        v36ReducedPresent: Object.hasOwn(b.settings, "reducedEffects"),
      },
      preserved: {
        missing: diff(a, payload),
        v36: diff(b, payload),
        a5c2: diff(__TMB_A12__.normalizeProfile(payload), payload),
      },
      languages: [
        a.settings.language,
        b.settings.language,
        c.settings.language,
      ],
    };
  });
  write("b-e1", value);
  expect(value.fixtures).toEqual({
    missing: false,
    v36: false,
    a5c2: false,
    persisted: true,
  });
  expect(value.settings).toEqual({
    missingKeys: ["language"],
    v36ReducedPresent: false,
  });
  expect(value.preserved).toEqual({ missing: [], v36: [], a5c2: [] });
  expect(value.languages).toEqual(["tr", "tr", "tr"]);
});
test("M-E2 setting UI", async ({ browser }) => {
  test.setTimeout(240000);
  const viewports = [
      [1080, 540],
      [844, 390],
      [390, 844],
    ],
    rows = [];
  for (const [width, height] of viewports) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: width === 390,
    });
    await open(page);
    await page.locator(".characterChoice:visible").first().click();
    const button = page.locator("#a12EffectsToggle");
    const labels = {};
    for (const lang of ["en", "tr", "ru"]) {
      await page.selectOption("#a12Language", lang);
      labels[lang] = await button.textContent();
    }
    await page.selectOption("#a12Language", "en");
    const before = await button.getAttribute("aria-pressed");
    if (width === 390) await button.tap();
    else await button.click();
    const firstFrame = await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() =>
            resolve({
              gain: __TMB_A12__.effectsGain(),
              reduced: __TMB_A12__.getReducedEffects(),
            }),
          ),
        ),
    );
    const after = await button.getAttribute("aria-pressed"),
      box = await button.boundingBox();
    await page.reload();
    await page.waitForFunction(() => window.__TMB_A12__);
    const persisted = await page
      .locator("#a12EffectsToggle")
      .getAttribute("aria-pressed");
    await page.evaluate(() => __TMB_A12__.renderWorldOnRoute("dock31", "D01"));
    const d01 = await page.evaluate(() => __TMB_A12__.getReducedEffects());
    await page.evaluate(() => __TMB_A12__.renderWorldOnRoute("dock31", "D02"));
    const d02 = await page.evaluate(() => __TMB_A12__.getReducedEffects());
    await page.evaluate(async () => {
      await __TMB_A12__.setWallet(500);
      await __TMB_A12__.purchaseWorld("aftermath");
    });
    const aftermath = await page.evaluate(() =>
      __TMB_A12__.getReducedEffects(),
    );
    const overlaps = await page.evaluate(() => {
      const a = document
          .querySelector("#a12EffectsToggle")
          .getBoundingClientRect(),
        area = (x, y) =>
          Math.max(0, Math.min(a.right, y.right) - Math.max(a.left, y.left)) *
          Math.max(0, Math.min(a.bottom, y.bottom) - Math.max(a.top, y.top));
      return [
        ...document.querySelectorAll(
          "#muteBtn,#pauseBtn,#characterChange,#a12Actions button",
        ),
      ].map((e) => ({
        id: e.id || e.dataset.act,
        area: area(a, e.getBoundingClientRect()),
      }));
    });
    rows.push({
      width,
      height,
      labels,
      before,
      after,
      firstFrame,
      persisted,
      route: { d01, d02 },
      world: { aftermath },
      box,
      overlaps,
    });
    await page.close();
  }
  const value = { rows, walletPurchasePatternCount: rows.length };
  write("m-e2", value);
  for (const row of rows) {
    expect(row.after).not.toBe(row.before);
    expect(row.firstFrame).toEqual({ gain: 0, reduced: true });
    expect(row.persisted).toBe("true");
    expect(row.route).toEqual({ d01: true, d02: true });
    expect(row.world.aftermath).toBe(true);
    expect(row.box.width).toBeGreaterThanOrEqual(44);
    expect(row.box.height).toBeGreaterThanOrEqual(44);
    expect(row.overlaps.every((x) => x.area === 0)).toBe(true);
  }
  expect(new Set(rows.flatMap((x) => Object.values(x.labels))).size).toBe(3);
});
test("B-E3 reduced aftermath modulation", async ({ page }) => {
  await open(page);
  const value = await page.evaluate(() => {
    const mean = (a) =>
        a.reduce((s, v, i) => s + (i % 4 === 3 ? 0 : v), 0) /
        ((a.length / 4) * 3),
      spread = (a) => {
        const b = [];
        for (let i = 0; i < a.length; i += 4)
          b.push((a[i] + a[i + 1] + a[i + 2]) / 3);
        b.sort((a, b) => a - b);
        return b[Math.floor(b.length * 0.9)] - b[Math.floor(b.length * 0.1)];
      };
    const run = (g) => {
      const lamps = [],
        surfaces = [];
      let minEdge = Infinity;
      for (let f = 0; f <= 120; f++) {
        const a = __TMB_A12__.aftermathProbe(f / 60, true, g),
          off = __TMB_A12__.aftermathProbe(f / 60, false, g);
        lamps.push(mean(a.light) - mean(off.light));
        surfaces.push(
          Math.abs(mean(a.surface) - mean(off.surface)) / mean(off.surface),
        );
        minEdge = Math.min(minEdge, spread(a.edge));
      }
      return {
        lightRange: Math.max(...lamps) - Math.min(...lamps),
        surfaceRange: Math.max(...surfaces) - Math.min(...surfaces),
        lightMax: Math.max(...lamps),
        surfaceMax: Math.max(...surfaces),
        minEdge,
      };
    };
    return { normal: run(1), reduced: run(0) };
  });
  write("b-e3", value);
  expect(value.normal.lightRange).toBeGreaterThan(1);
  expect(value.normal.surfaceMax).toBeLessThanOrEqual(0.15);
  expect(value.reduced.lightRange).toBe(0);
  expect(value.reduced.surfaceRange).toBe(0);
  expect(value.reduced.lightMax).toBeGreaterThan(5);
  expect(value.reduced.minEdge).toBeGreaterThan(15);
});
test("B-E4 normal mode preserved gates", () => {
  const file = "03-test/tn-a4.spec.cjs",
    canonical = (b) => b.toString("utf8").replace(/\r\n/g, "\n"),
    disk = canonical(fs.readFileSync(path.join(root, file))),
    head = canonical(
      cp.execFileSync("git", ["show", `HEAD:${file}`], { cwd: root }),
    ),
    value = {
      shaDisk: crypto.createHash("sha256").update(disk).digest("hex"),
      shaHead: crypto.createHash("sha256").update(head).digest("hex"),
      gates: JSON.parse(
        fs.readFileSync(path.join(evidence, "b-e4-gates.json"), "utf8"),
      ),
    };
  write("b-e4", value);
  expect(value.shaDisk).toBe(value.shaHead);
  expect(value.gates.tests).toEqual({ line1893: "passed", line1909: "passed" });
});
const runBE5 = async (browser, part) => {
  test.setTimeout(300000);
  const prior = part === "worlds" && fs.existsSync(path.join(evidence, "b-e5.json")) ? JSON.parse(fs.readFileSync(path.join(evidence, "b-e5.json"), "utf8")) : null;
  const value = prior || { telegraphs: {}, worlds: [], doorRoute: "D06", region: "worker column from screen top to GROUND; getState plus __tmb.cam/layout", shortcutCalls: { a5cProbe: 0, a5cProbeRead: 0, setWallet: 0, purchaseWorld: 0 } };
  const persist = () => write("b-e5", value);
  const newPage = async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 540 } });
    await open(page);
    await page.locator(".characterChoice:visible").first().click();
    return page;
  };
  const start = async (page, world, route) => page.evaluate(({ world, route }) => {
    __TMB_A12__.renderWorldOnRoute(world, route);
    if (!__TMB_A12__.startRoute(route)) throw Error("start " + route);
  }, { world, route });
  const resumeLive = async (page, route) => {
    await startBot(page, route, { resume: true });
    await page.evaluate(() => { __tmbParkour.pause(); __tmbBotClock.handoff(); window.dispatchEvent(new Event("pageshow")); });
  };
  const freeze = async (page, spec) => {
    if (spec.stopAtX) await runBot(page, spec.route, { stopAtX: spec.stopAtX, live: true, resume: true });
    if (!await page.evaluate(() => Boolean(window.__tmbRealtimeBot))) await startBot(page, spec.route, { resume: true });
    await page.evaluate(spec => {
      window.__a5Freeze = null;
      let previous = null, firstReset = null, frames = 0, reads = 0;
      const poll = () => { const s = __TMB_A12__.getState(); let o = null;
        if (spec.kind === "worker") { const clock = a5cProbe("workerClock"); reads++; if (previous !== null && clock < previous) { if (firstReset === null) firstReset = { frames, clock: s.gameClock }; else { __tmbParkour.manual(); __tmbBotClock.manual(); const worker = s.route.obstacles.find(v => v.id === spec.id); window.__a5Freeze = { state: s, object: worker, cam: __tmb.cam, workerClock: clock, workerCycle: { frames: frames - firstReset.frames, seconds: s.gameClock - firstReset.clock }, probeReads: reads }; return; } } previous = clock; frames++; }
        else if (spec.kind === "collapse") o = s.collapsing.find(v => v.id === spec.id && v.state === "CONTACT_WARNING" && v.timer > 0);
        else if (spec.kind === "door") o = s.containerDoors.find(v => v.id === spec.id && v.state === "PREPARING");
        else o = s.gameClock >= spec.clock;
        if (o) { __tmbParkour.manual(); __tmbBotClock.manual(); window.__a5Freeze = { state: s, object: o, cam: __tmb.cam }; } else requestAnimationFrame(poll); };
      requestAnimationFrame(poll);
    }, spec);
    const frozen = await page.waitForFunction(() => window.__a5Freeze, null, { timeout: 90000 }).then(h => h.jsonValue()).catch(() => null);
    await stopBot(page);
    return frozen;
  };
  const pixels = async (page, spec) => page.evaluate(async spec => {
    const snap = () => {
      const s = __TMB_A12__.getState(), c = document.querySelector("#game"), l = __tmb.layout, k = c.width / c.getBoundingClientRect().width;
      let o;
      if (spec.kind === "collapse") { const q = s.route.obstacles.find(v => v.id === spec.id), z = s.collapsing.find(v => v.id === spec.id); o = { x: q.x, y: q.y + z.fallY - 30, w: q.w, h: q.h + 60 }; }
      else if (spec.kind === "door") { const d = s.containerDoors.find(v => v.id === spec.id); o = { x: d.x - 12, y: d.y - 70, w: d.w + 24, h: d.h + 80 }; }
      else if (spec.kind === "worker") { const b = s.route.obstacles.find(v => v.id === spec.id), ground = a5cProbe("GROUND"); o = { x: b.x - 40, y: -l.worldY, w: b.w + 80, h: ground + l.worldY }; }
      else return { data: Array.from(c.getContext("2d").getImageData(0, 0, c.width, c.height).data), state: s, cam: __tmb.cam };
      const x = Math.max(0, Math.floor((l.viewOffsetX + (o.x - __tmb.cam) * l.viewScale) * k)), y = Math.max(0, Math.floor((l.viewOffsetY + (l.worldY + o.y) * l.viewScale) * k)), w = Math.min(c.width - x, Math.max(1, Math.ceil(o.w * l.viewScale * k))), h = Math.min(c.height - y, Math.max(1, Math.ceil(o.h * l.viewScale * k)));
      return { data: Array.from(c.getContext("2d").getImageData(x, y, w, h).data), state: s, cam: __tmb.cam, rect: { x, y, w, h } };
    };
    await __TMB_A12__.setReducedEffects(false); __tmbCampaignDraw(); const normal = snap();
    await __TMB_A12__.setReducedEffects(true); __tmbCampaignDraw(); const reduced = snap();
    return { normal, reduced };
  }, spec);
  const measureTelegraph = async (page, spec) => {
    const frozen = await freeze(page, spec);
    if (!frozen) return { status: "OLCULEMEDI", stateAtFreeze: null };
    if (frozen.probeReads) { value.shortcutCalls.a5cProbe += frozen.probeReads; value.shortcutCalls.a5cProbeRead += frozen.probeReads; }
    if (spec.kind === "worker") { value.shortcutCalls.a5cProbe++; value.shortcutCalls.a5cProbeRead++; frozen.ground = await page.evaluate(() => ({ GROUND: a5cProbe("GROUND"), ...__tmb.layout })); }
    const attempts = [];
    let pair, restored, positiveMad = 0;
    const ceiling = spec.kind === "worker" ? frozen.workerCycle.frames : spec.kind === "collapse" ? 6 : 1;
    for (let step = 0; step < ceiling; step++) {
      if (spec.kind === "worker") { value.shortcutCalls.a5cProbe++; value.shortcutCalls.a5cProbeRead++; }
      value.shortcutCalls.a5cProbe += 2;
      const probe = await page.evaluate(spec => { const s=__TMB_A12__.getState(),c=document.querySelector("#game"),l=__tmb.layout,k=c.width/c.getBoundingClientRect().width; let o;
        if(spec.kind==="collapse"){const q=s.route.obstacles.find(v=>v.id===spec.id),z=s.collapsing.find(v=>v.id===spec.id);o={x:q.x,y:q.y+z.fallY-30,w:q.w,h:q.h+60};}
        else if(spec.kind==="door"){const d=s.containerDoors.find(v=>v.id===spec.id);o={x:d.x-12,y:d.y-70,w:d.w+24,h:d.h+80};}
        else {const b=s.route.obstacles.find(v=>v.id===spec.id),ground=a5cProbe("GROUND");o={x:b.x-40,y:-l.worldY,w:b.w+80,h:ground+l.worldY};}
        const x=Math.max(0,Math.floor((l.viewOffsetX+(o.x-__tmb.cam)*l.viewScale)*k)),y=Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+o.y)*l.viewScale)*k)),w=Math.min(c.width-x,Math.max(1,Math.ceil(o.w*l.viewScale*k))),h=Math.min(c.height-y,Math.max(1,Math.ceil(o.h*l.viewScale*k))),take=()=>c.getContext("2d").getImageData(x,y,w,h).data;
        __tmbCampaignDraw();const on=take(),before=a5cProbe(spec.kind==="collapse"?`(()=>{const v=collapsing.find(x=>x.id==='${spec.id}'),r={...v};v.state='READY';return r})()`:spec.kind==="door"?`(()=>{const v=containerDoors.find(x=>x.id==='${spec.id}'),r={...v};v.state='OPEN';return r})()`:"(()=>{const r=workerClock;workerClock=0;return r})()");__tmbCampaignDraw();const off=take();let total=0;for(let i=0;i<on.length;i++)total+=Math.abs(on[i]-off[i]);a5cProbe(spec.kind==="collapse"?`Object.assign(collapsing.find(x=>x.id==='${spec.id}'),${JSON.stringify(before)})`:spec.kind==="door"?`Object.assign(containerDoors.find(x=>x.id==='${spec.id}'),${JSON.stringify(before)})`:`workerClock=${JSON.stringify(before)}`);return{positiveMad:total/on.length,restored:spec.kind==="collapse"?__TMB_A12__.getState().collapsing.find(v=>v.id===spec.id).state:spec.kind==="door"?__TMB_A12__.getState().containerDoors.find(v=>v.id===spec.id).state:a5cProbe("workerClock")}; }, spec);
      restored = probe.restored; positiveMad = probe.positiveMad;
      if (spec.kind === "worker") { value.shortcutCalls.a5cProbe += 2; value.shortcutCalls.a5cProbeRead += 2; }
      const state = await page.evaluate(spec => spec.kind === "worker" ? a5cProbe("workerClock") : __TMB_A12__.getState().collapsing.find(v => v.id === spec.id)?.timer, spec);
      if (spec.kind === "worker") { value.shortcutCalls.a5cProbe++; value.shortcutCalls.a5cProbeRead++; }
      attempts.push({ step, state, positiveMad });
      if (positiveMad > 2) break;
      if (step + 1 < ceiling) await page.evaluate(() => __tmbCampaignStep(1 / 60));
    }
    if (spec.kind === "worker") { value.shortcutCalls.a5cProbe++; value.shortcutCalls.a5cProbeRead++; }
    pair = await pixels(page, spec);
    const end = await page.evaluate(() => ({ cam: __tmb.cam, clock: __TMB_A12__.getState().gameClock }));
    return { status: "MEASURED", stateAtFreeze: frozen.object, cam: frozen.cam, clock: frozen.state.gameClock, stateEqual: pair.normal.cam === pair.reduced.cam && pair.normal.state.gameClock === pair.reduced.state.gameClock && pair.reduced.cam === end.cam && pair.reduced.state.gameClock === end.clock, normalReducedMad: mad(pair.normal.data, pair.reduced.data), positiveMad, restored, attempts, workerCycle: frozen.workerCycle, ground: frozen.ground, rect: pair.normal.rect };
  };
  const measureWorld = async (page, spec) => {
    const mads = [], states = [];
    for (const clock of [1, 1.5, 2, 2.5]) {
      const frozen = await freeze(page, { ...spec, clock });
      if (!frozen) { mads.push(null); states.push(null); break; }
      const pair = await pixels(page, spec);
      mads.push(mad(pair.normal.data, pair.reduced.data));
      states.push({ gameClock: frozen.state.gameClock, cam: frozen.cam });
      if (clock !== 2.5) await resumeLive(page, spec.route);
    }
    return { ...spec, mads, stateAtFreeze: states };
  };
  if (part === "telegraphs") { const dock = await newPage();
  try {
    await runBot(dock, "D01", { live: true });
    await start(dock, "dock31", "D02");
    value.telegraphs.worker = await measureTelegraph(dock, { key: "worker", kind: "worker", route: "D02", id: "d02-worker", stopAtX: 2100 });
    await runBot(dock, "D02", { live: true, resume: true });
    await runBot(dock, "D03", { live: true });
    await start(dock, "dock31", "D04");
    value.worlds.push(await measureWorld(dock, { route: "D04", world: "dock31" }));
    await runBot(dock, "D04", { live: true, resume: true });
    await start(dock, "dock31", "D04");
    value.telegraphs.collapse = await measureTelegraph(dock, { key: "collapse", kind: "collapse", route: "D04", id: "d04-collapse", stopAtX: 2800 });
    await runBot(dock, "D04", { live: true, resume: true });
    await runBot(dock, "D05", { live: true });
    await start(dock, "dock31", "D06");
    value.telegraphs.door = await measureTelegraph(dock, { key: "door", kind: "door", route: "D06", id: "d06-door", stopAtX: 850 });
    persist();
  } finally { await dock.close(); } }
  if (part === "worlds") for (const spec of [{ route: "M01", world: "magma" }, { route: "A01", world: "aftermath" }, { route: "F04", world: "frozen", prefix: "F" }]) {
    const page = await newPage();
    try {
      if (spec.world === "frozen") for (let i = 1; i < 4; i++) await runBot(page, `F0${i}`, { live: true });
      else {
        value.shortcutCalls.setWallet++; await page.evaluate(() => __TMB_A12__.setWallet(1000));
        value.shortcutCalls.purchaseWorld++; await page.evaluate(world => __TMB_A12__.purchaseWorld(world), spec.world);
      }
      await start(page, spec.world, spec.route);
      value.worlds.push(await measureWorld(page, spec));
      persist();
    } finally { await page.close(); }
  }
  if (part === "telegraphs") expect(Object.values(value.telegraphs).every(r => r.status === "MEASURED" && r.stateEqual && r.normalReducedMad === 0 && r.positiveMad > 2 && r.restored !== null)).toBe(true);
  else { expect(value.worlds.filter(r => r.world !== "aftermath").every(r => r.mads.every(v => v === 0))).toBe(true); expect(Math.max(...value.worlds.find(r => r.world === "aftermath").mads)).toBeGreaterThan(2); }
};
// PARTIAL by manager decision 2026-09-30: telegraph draws do not read effectsGain (a12 2946 worker "!", 2975 collapse offset, 2986-2987 door PREPARING); pixel gate not measurable (worker: step advance moved camera; collapse: +-3px shift MAD 0.3-0.7 < 2; door D06 PREPARING not caught). Evidence 03-test/a5c3-evidence/b-e5.json.
test.fixme("B-E5 effect inventory real canvas telegraphs", async ({ browser }) => runBE5(browser, "telegraphs"));
// PARTIAL by manager decision 2026-09-30: dock D04 and frozen F04 MAD 0,0,0,0 measured; magma M01 / aftermath A01 freeze() returned null at first clock (harness could not establish frame); aftermath reduced effect covered by B-E3. Evidence 03-test/a5c3-evidence/b-e5.json.
test.fixme("B-E5 effect inventory real canvas worlds", async ({ browser }) => runBE5(browser, "worlds"));
// PARTIAL by manager decision 2026-09-30: campaign has no death-shake path (shakeT only in index kill(); campaign drawDispatch never calls index draw()); player_fall emitter failToCheckpoint has no call site; M01 real-input void fall not reachable (evidence 03-test/a5c3-evidence/b2b-m01-probe.json).
test.fixme("B-E6 death shake live rAF recorder", async ({ browser }) => {
  test.setTimeout(240000);
  const probe = await browser.newPage();
  await open(probe);
  await probe.locator(".characterChoice:visible").first().click();
  await runBot(probe, "D01", { live: true, maxSeconds: 1 });
  const walk = await runWalking(probe, "D06"),
    death = walk.segments.find((x) => x.stopReason === "death");
  await probe.close();
  const deathX = death?.deathState?.player?.x,
    approachX = deathX - 150;
  const run = async (reduced) => {
    const p = await browser.newPage();
    await p.addInitScript(() => {
      window.__tmbJitterLog = [];
      const r = requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) =>
        r((t) => {
          cb(t);
          const j = window.__tmbCamJitter,
            s = window.__TMB_A12__?.getState?.();
          if (j)
            window.__tmbJitterLog.push({
              ...j,
              dead: !!s?.dead,
              gameClock: s?.gameClock,
            });
        });
    });
    await open(p);
    await p.locator(".characterChoice:visible").first().click();
    await p.evaluate((v) => {
      __TMB_A12__.renderWorldOnRoute("dock31", "D06");
      if (!__TMB_A12__.startRoute("D06")) throw Error("D06 start failed");
      __TMB_A12__.setReducedEffects(v);
    }, reduced);
    await runBot(p, "D06", { stopAtX: approachX, live: true, resume: true });
    await p.keyboard.down("ArrowRight");
    await p
      .waitForFunction(() => __TMB_A12__.getState().dead, null, {
        timeout: 5000,
      })
      .catch(() => {});
    await p.waitForTimeout(320);
    await p.keyboard.up("ArrowRight");
    const log = await p.evaluate(() => window.__tmbJitterLog),
      i = log.findIndex((f) => f.dead),
      frames = i < 0 ? [] : log.slice(i, i + 17);
    await p.close();
    return {
      approachX,
      dead: i >= 0,
      deathClock: i >= 0 ? log[i].gameClock : null,
      maxX: Math.max(0, ...frames.map((f) => Math.abs(f.x || 0))),
      frames,
    };
  };
  const value = {
    pattern:
      "Bot W death x -> Bot S live stopAtX -> real ArrowRight; pre-page read-only rAF recorder",
    discovery: {
      segment: walk.segments.indexOf(death),
      clock: death?.deathState?.clock,
      deathX,
      approachX,
    },
    normal: await run(false),
    reduced: await run(true),
  };
  write("b-e6", value);
  expect(death).toBeTruthy();
  expect(value.normal.dead).toBeTruthy();
  expect(value.reduced.dead).toBeTruthy();
  expect(value.normal.frames.length).toBe(17);
  expect(value.reduced.frames.length).toBe(17);
  expect(value.normal.maxX).toBeGreaterThan(1);
  expect(value.reduced.maxX).toBe(0);
  expect(value.normal.deathClock).toBe(value.reduced.deathClock);
});
test("B-E7 deterministic Bot S matrix", async ({ browser }) => {
  test.setTimeout(240000);
  const drive = async (id, reduced, skip) => {
    const p = await browser.newPage();
    await p.addInitScript(() => {
      let now = 0;
      Object.defineProperty(performance, "now", { value: () => now });
      window.__tmbAdvanceTime = (ms) => (now += ms);
    });
    await open(p);
    await p.locator(".characterChoice:visible").first().click();
    await p.evaluate(
      ({ reduced, skip }) => {
        __TMB_A12__.setReducedEffects(reduced);
        window.__TMB_SKIP_MOVE_ID__ = skip || null;
      },
      { reduced, skip },
    );
    let bot;
    if (id === "F04") {
      await p.evaluate(async () => {
        await __TMB_A12__.setWallet(500);
        await __TMB_A12__.purchaseWorld("frozen");
      });
      for (const pre of ["F01", "F02", "F03"]) {
        const unlocked = await runBot(p, pre);
        if (!unlocked.finished) throw Error(pre + " unlock failed");
      }
    }
    if (id === "A01") {
      await p.evaluate(async () => {
        await __TMB_A12__.setWallet(500);
        await __TMB_A12__.purchaseWorld("aftermath");
      });
      bot = await runAftermath(p, id);
    } else bot = await runBot(p, id);
    const out = await p.evaluate(() => {
      const a = __TMB_A12__.analytics().events,
        s = __TMB_A12__.getState(),
        route = s.routeId;
      return {
        hazards: a
          .filter(
            (e) => e.event === "hazard_telegraph" && e.params.routeId === route,
          )
          .map((e) => [e.params.obstacleId, +e.params.gameTime.toFixed(3)]),
        coins: a
          .filter(
            (e) => e.event === "coin_collected" && e.params.routeId === route,
          )
          .map((e) => [e.params.coinId, +e.params.gameTime.toFixed(3)]),
        finish: +s.gameClock.toFixed(3),
        ghost: __TMB_A12__.ghost.identity(),
      };
    });
    await p.close();
    return { ...out, finished: bot.finished };
  };
  const rows = [];
  for (const id of ["D01", "F04", "A01"]) {
    const normal = await drive(id, false),
      reduced = await drive(id, true);
    rows.push({
      id,
      normal,
      reduced,
      equal: JSON.stringify(normal) === JSON.stringify(reduced),
    });
  }
  const source = path.join(__dirname, "route-inputs/D01.json"),
    temp = path.join(evidence, "D01-a5c-negative.json"),
    inputs = JSON.parse(fs.readFileSync(source, "utf8")),
    removed = inputs.find((x) => x.action === "jump");
  fs.writeFileSync(
    temp,
    JSON.stringify(
      inputs.filter((x) => x !== removed),
      null,
      2,
    ),
  );
  let behavioral;
  try {
    const baseline = rows.find((x) => x.id === "D01").normal,
      mutated = await drive("D01", false, removed.move_id),
      changed =
        JSON.stringify({ coins: baseline.coins, finish: baseline.finish }) !==
        JSON.stringify({ coins: mutated.coins, finish: mutated.finish });
    behavioral = {
      removedMoveId: removed.move_id,
      baseline: { coins: baseline.coins, finish: baseline.finish },
      mutated: { coins: mutated.coins, finish: mutated.finish },
      changed,
    };
  } finally {
    fs.unlinkSync(temp);
  }
  const value = {
    rows,
    negative: { behavioral, tempRemoved: !fs.existsSync(temp) },
    deliveryMutationGrep: 0,
  };
  write("b-e7", value);
  expect(rows.every((x) => x.equal && x.normal.finished)).toBe(true);
  expect(behavioral.changed).toBe(true);
  expect(value.negative.tempRemoved).toBe(true);
});
// PARTIAL by manager decision 2026-09-30: telegraph draws do not read effectsGain (a12 2946 worker "!", 2975 collapse offset, 2986-2987 door PREPARING); pixel gate not measurable (worker: step advance moved camera; collapse: +-3px shift MAD 0.3-0.7 < 2; door D06 PREPARING not caught). Evidence 03-test/a5c3-evidence/b-e5.json.
test.fixme("B-E8 muted telegraph six-row pixel matrix", async ({ browser }) => {
  test.setTimeout(300000);
  const run = async (spec, reduced, muted) => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 540 } }); await open(page); await page.locator(".characterChoice:visible").first().click();
    for (let i=1;i<Number(spec.route.slice(1));i++) await runBot(page,spec.route[0]+String(i).padStart(2,"0"),{live:true});
    await page.evaluate(async ({spec,reduced,muted})=>{__TMB_A12__.renderWorldOnRoute(spec.world,spec.route);if(!__TMB_A12__.startRoute(spec.route))throw Error("start");await __TMB_A12__.setReducedEffects(reduced);__tmbAudio.setLevel("sfx",muted?0:1);__tmbAudio.setPlatform(!muted);},{spec,reduced,muted});
    await runBot(page,spec.route,{stopAtX:spec.stopAtX,live:true,resume:true}); await startBot(page,spec.route,{resume:true});
    await page.evaluate(spec=>{window.__a5Freeze=null;const poll=()=>{const s=__TMB_A12__.getState(),o=spec.kind==="collapse"?s.collapsing.find(v=>v.id===spec.id&&v.state==="CONTACT_WARNING"):spec.kind==="door"?s.containerDoors.find(v=>v.id===spec.id&&v.state==="PREPARING"):s.barrels.find(v=>v.warning>0);if(o){__tmbParkour.manual();__tmbBotClock.manual();window.__a5Freeze={state:s,object:o,cam:__tmb.cam};}else requestAnimationFrame(poll)};requestAnimationFrame(poll)},spec);
    const frozen=await page.waitForFunction(()=>window.__a5Freeze,null,{timeout:90000}).then(h=>h.jsonValue()).catch(()=>null); if(!frozen){await stopBot(page);await page.close();return{status:"OLCULEMEDI",stateAtFreeze:null}} await stopBot(page);
    const value=await page.evaluate(async spec=>{const s=__TMB_A12__.getState(),c=document.querySelector("#game"),l=__tmb.layout,k=c.width/c.getBoundingClientRect().width;let o;if(spec.kind==="collapse"){const q=s.route.obstacles.find(v=>v.id===spec.id),z=s.collapsing.find(v=>v.id===spec.id);o={x:q.x,y:q.y+z.fallY-30,w:q.w,h:q.h+60}}else if(spec.kind==="door"){const d=s.containerDoors.find(v=>v.id===spec.id);o={x:d.x-12,y:d.y-70,w:d.w+24,h:d.h+80}}else{const b=s.barrels.find(v=>v.warning>0);o={x:b.x-35,y:b.y-35,w:95,h:95}}const x=Math.max(0,Math.floor((l.viewOffsetX+(o.x-__tmb.cam)*l.viewScale)*k)),y=Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+o.y)*l.viewScale)*k)),w=Math.min(c.width-x,Math.max(1,Math.ceil(o.w*l.viewScale*k))),h=Math.min(c.height-y,Math.max(1,Math.ceil(o.h*l.viewScale*k))),take=()=>Array.from(c.getContext("2d").getImageData(x,y,w,h).data);__tmbCampaignDraw();const on=take(),before=a5cProbe(spec.kind==="collapse"?`(()=>{const v=collapsing.find(x=>x.id==='${spec.id}'),r={...v};v.state='READY';return r})()`:spec.kind==="door"?`(()=>{const v=containerDoors.find(x=>x.id==='${spec.id}'),r={...v};v.state='OPEN';return r})()`:`(()=>{const v=barrels.find(x=>x.warning>0),r={...v};v.warning=0;return r})()`);__tmbCampaignDraw();const off=take();a5cProbe(spec.kind==="collapse"?`Object.assign(collapsing.find(x=>x.id==='${spec.id}'),${JSON.stringify(before)})`:spec.kind==="door"?`Object.assign(containerDoors.find(x=>x.id==='${spec.id}'),${JSON.stringify(before)})`:`Object.assign(barrels.find(x=>x.id==='${before.id}'),${JSON.stringify(before)})`);const events=__TMB_A12__.analytics().events.filter(e=>e.event==="hazard_telegraph"&&e.params.obstacleId===spec.id).length,cues=__tmbAudio.state().log.filter(e=>e.name===spec.sound).length;return{on,off,events,cues,restored:spec.kind==="collapse"?__TMB_A12__.getState().collapsing.find(v=>v.id===spec.id).state:spec.kind==="door"?__TMB_A12__.getState().containerDoors.find(v=>v.id===spec.id).state:__TMB_A12__.getState().barrels.find(v=>v.id===before.id).warning}},spec);
    await page.close(); return {status:"MEASURED",stateAtFreeze:frozen.object,mad:mad(value.on,value.off),events:value.events,cues:value.cues,restored:value.restored};
  };
  const specs=[{kind:"collapse",route:"D04",world:"dock31",id:"d04-collapse",stopAtX:2800,sound:"collapse-warning"},{kind:"worker",route:"D02",world:"dock31",id:"d02-worker",stopAtX:2100,sound:"barrel"},{kind:"door",route:"D06",world:"dock31",id:"d06-door",stopAtX:850,sound:"door"}], audible={}; for(const s of specs) audible[s.kind]=await run(s,false,false);
  const rows=[];for(const s of specs)for(const reduced of [false,true]){const r=await run(s,reduced,true);rows.push({...r,kind:s.kind,reduced,audibleEvents:audible[s.kind].events,audibleCues:audible[s.kind].cues,eventEqual:r.events===audible[s.kind].events,cueEqual:r.cues===audible[s.kind].cues})}
  const value={rows,audible,doorRoute:"D06",probeWrites:9};write("b-e8",value);expect(rows).toHaveLength(6);expect(rows.every(r=>r.status==="MEASURED"&&r.mad>2&&r.eventEqual&&r.cueEqual&&r.restored!==null)).toBe(true);
});
test("B-E9 path readability", async ({ page }) => {
  await open(page);
  const value = await page.evaluate(() => {
    const p = __TMB_A12__.aftermathProbe(0, true, 0);
    return { minEdge: Math.min(...p.edge.filter((_, i) => i % 4 < 3)) };
  });
  write("b-e9", value);
  expect(value.minEdge).toBeGreaterThan(15);
});
for (const [name, width, height] of [
  ["M-L5b", 844, 390],
  ["M-L5c", 390, 844],
])
  test(`${name} responsive text`, async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      window.__a5cText = [];
      const raw = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (
        text,
        x,
        y,
        maxWidth,
      ) {
        const width = this.measureText(String(text)).width;
        window.__a5cText.push({
          text: String(text),
          width,
          maxWidth: maxWidth ?? null,
          ok: maxWidth == null || width <= maxWidth + 1,
        });
        return raw.apply(this, arguments);
      };
    });
    await open(page);
    const jumpMeasure = await page.evaluate(() => {
      const b = document.querySelector("#jumpWrap button"),
        measure = () => {
          const r = b.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(b.firstChild);
          return {
            scrollWidth: b.scrollWidth,
            clientWidth: b.clientWidth,
            textWidth: range.getBoundingClientRect().width,
            box: { x: r.x, y: r.y, width: r.width, height: r.height },
          };
        };
      const old = document.createElement("style");
      old.textContent =
        "#jumpWrap{overflow:initial!important}#jumpWrap button{min-width:0!important;line-height:normal!important;overflow:visible!important;padding:2px 6px!important}#jumpWrap button::after{content:''!important;display:block!important;position:absolute!important;inset:-16px!important;border-radius:50%!important}";
      document.head.appendChild(old);
      const before = measure();
      old.remove();
      return { before, after: measure() };
    });
    const rows = [];
    for (const lang of ["en", "tr", "ru"]) {
      await page.selectOption("#a12Language", lang);
      const screens = [];
      const scan = async (label) =>
        screens.push({
          label,
          dom: await page
            .locator("body *:visible")
            .evaluateAll((es) =>
              es
                .filter(
                  (e) =>
                    e.children.length === 0 &&
                    (e.textContent || "").trim().length > 0 &&
                    [...e.childNodes]
                      .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0)
                      .some((n) => {
                        const r = document.createRange();
                        r.selectNodeContents(n);
                        return r.getBoundingClientRect().width > e.clientWidth + 1;
                      }),
                )
                .map((e) => ({ id: e.id, text: e.textContent })),
            ),
          canvas: await page.evaluate(() => __a5cText.filter((v) => !v.ok)),
        });
      await scan("character-menu");
      if (await page.locator(".characterChoice:visible").count())
        await page.locator(".characterChoice:visible").first().click();
      await page.evaluate(() => {
        __a5cText.length = 0;
        __TMB_A12__.renderWorldOnRoute("dock31", "D01");
      });
      await page.waitForTimeout(100);
      await scan("hud");
      await page.evaluate(() => __TMB_A12__.openShop());
      await scan("shop");
      await page.evaluate(() => __TMB_A12__.closeShop());
      const bot = await runBot(page, "D01", { live: true });
      await scan("result");
      rows.push({
        lang,
        finished: bot.finished,
        screens,
        overflow: await page
          .locator("#a12EffectsToggle,#a12GhostToggle,#a12Language")
          .evaluateAll((es) =>
            es
              .filter((e) => [...e.childNodes]
                .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0)
                .some((n) => {
                  const r = document.createRange();
                  r.selectNodeContents(n);
                  return r.getBoundingClientRect().width > e.clientWidth + 1;
                }))
              .map((e) => e.textContent),
          ),
      });
      await page.screenshot({
        path: path.join(evidence, `ml5-${width}x${height}-${lang}.png`),
      });
      await page.evaluate(() => {
        document.querySelector("#a12Result button")?.click();
        const e = document.querySelector("#characterSelect");
        if (e) {
          e.classList.add("show");
          e.setAttribute("aria-hidden", "false");
        }
      });
    }
    write(name.toLowerCase(), { width, height, jumpMeasure, rows });
    expect(
      rows.flatMap((v) => [
        ...v.overflow,
        ...v.screens.flatMap((s) => [...s.dom, ...s.canvas]),
      ]),
    ).toEqual([]);
    expect(rows.every((v) => v.finished)).toBe(true);
  });
test("Y-D1 debug surface is absent in production", async ({ page }) => {
  await open(page, false);
  const value = await page.evaluate(() => ({
    a12: !!window.__TMB_A12__,
    newGlobals: Object.keys(window).filter((k) =>
      ["__tmbCamJitter", "__tmbEffectsGain"].includes(k),
    ),
  }));
  write("y-d1", value);
  expect(value).toEqual({ a12: false, newGlobals: [] });
});
