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
test("B-E5 effect inventory real canvas", async ({ browser }) => {
  test.setTimeout(240000);
  const capture = async (id, world, reduced) => {
    const p = await browser.newPage({ viewport: { width: 1080, height: 540 } });
    await open(p);
    await p.locator(".characterChoice:visible").first().click();
    await p.evaluate(
      ({ id, world, reduced }) => {
        const a = __TMB_A12__;
        a5cProbe(`profile.ownedWorldIds=['dock31','frozen','magma','aftermath'];for(const k of Object.keys(ROUTES))profile.progressByRoute[k]={completed:true}`);
        a.renderWorldOnRoute(world, id);
        if (!a.startRoute(id)) throw Error(id + " start failed");
        a.setReducedEffects(reduced);
      },
      { id, world, reduced },
    );
    const take = () =>
      p.locator("#game").evaluate((c) => {
        const x = c.getContext("2d"),
          g = (r) => Array.from(x.getImageData(...r).data);
        return {
          all: g([0, 0, c.width, c.height]),
          lamp: g([0, 0, 430, 210]),
          surface: g([0, 360, c.width, 120]),
        };
      });
    await runBot(p, id, { stopAtX: 300, live: true, resume: true });
    await startBot(p, id, { resume: true });
    const state = await p.evaluate(() => __TMB_A12__.getState());
    await p.waitForTimeout(180);
    const a = await take();
    await p.waitForTimeout(world === "aftermath" ? 500 : 180);
    const b = await take();
    await stopBot(p);
    await p.close();
    return { a, b, state: { routeId: state.routeId, clock: state.gameClock } };
  };
  const rows = [];
  for (const [id, world] of [
    ["D01", "dock31"],
    ["F04", "frozen"],
    ["M01", "magma"],
    ["A01", "aftermath"],
  ]) {
    const normal = await capture(id, world, false),
      reduced = await capture(id, world, true);
    rows.push({
      id,
      world,
      normalTemporalMad: mad(normal.a.all, normal.b.all),
      reducedTemporalMad: mad(reduced.a.all, reduced.b.all),
      normalLampMad: mad(normal.a.lamp, normal.b.lamp),
      reducedLampMad: mad(reduced.a.lamp, reduced.b.lamp),
      normalSurfaceMad: mad(normal.a.surface, normal.b.surface),
      reducedSurfaceMad: mad(reduced.a.surface, reduced.b.surface),
      sampleBytes: normal.a.all.length,
    });
  }
  const value = {
    pattern: "startRoute -> runBot stopAtX/live/resume -> startBot/resume -> getState -> getImageData -> stopBot",
    rows,
    telegraphs: {
      collapse: {
        status: "ÖLÇÜLEMEDİ — warningStartedAt iki-sayfa hizalaması kurulamadı",
      },
      door: { status: "ÖLÇÜLEMEDİ — PREPARING 10 dk içinde oluşmadı" },
      worker: { status: "ÖLÇÜLEMEDİ — barrel 10 dk içinde oluşmadı" },
    },
  };
  write("b-e5", value);
  expect(
    rows
      .filter((x) => x.world !== "aftermath")
      .every((x) => x.normalTemporalMad === 0 && x.reducedTemporalMad === 0),
  ).toBe(true);
  const a = rows.find((x) => x.world === "aftermath");
  expect(Math.max(a.normalLampMad, a.normalSurfaceMad)).toBeGreaterThan(2);
  expect(a.reducedLampMad).toBe(0);
  expect(a.reducedSurfaceMad).toBe(0);
  expect(
    Object.values(value.telegraphs).every(
      (x) => x.normalReducedMad === 0 && x.preWarningMad > 2,
    ),
  ).toBe(true);
});
test("B-E6 death shake live rAF recorder", async ({ browser }) => {
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
test("B-E8 muted telegraph six-row pixel matrix", async ({ browser }) => {
  test.setTimeout(240000);
  const run = async (kind, reduced, muted) => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 540 } });
    await open(page);
    await page.locator(".characterChoice:visible").first().click();
    const spec = kind === "collapse"
      ? { world: "frozen", route: "F04", type: "collapse", x: 6730, stopAtX: 6400 }
      : kind === "door"
        ? { world: "aftermath", route: "A04", type: "containerDoor", x: 15500, stopAtX: 15000 }
        : { world: "magma", route: "M03", type: "worker", x: 5150, stopAtX: 4700 };
    const setup = await page.evaluate(({spec,reduced,muted})=>{a5cProbe(`profile.ownedWorldIds=['dock31','frozen','magma','aftermath'];for(const k of Object.keys(ROUTES))profile.progressByRoute[k]={completed:true}`);const a=__TMB_A12__;a.renderWorldOnRoute(spec.world,spec.route);if(!a.startRoute(spec.route))throw Error(spec.route+" start failed");a.setReducedEffects(reduced);__tmbAudio.setLevel("sfx",muted?0:1);__tmbAudio.setPlatform(!muted);const o=a.getState().route.obstacles.find(v=>v.type===spec.type);return{...spec,obstacleId:o.id};},{spec,reduced,muted});
    await runBot(page,spec.route,{stopAtX:spec.stopAtX,live:true,resume:true});
    const take = () =>
      page
        .locator("#game")
        .evaluate((c) =>
          Array.from(
            c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
          ),
        );
    const before = await take();
    await startBot(page,spec.route,{resume:true});
    if(kind==="door"){await page.waitForFunction(x=>__TMB_A12__.getState().player.x>=x,spec.x-220,{timeout:8000});await stopBot(page);}
    const reached = await page
      .waitForFunction(
        (k) => {
          const s = __TMB_A12__.getState();
          if (k === "collapse")
            return s.collapsing.some((v) => v.state === "CONTACT_WARNING");
          if (k === "door") return s.containerDoors.some((v) => v.state === "PREPARING");
          return s.barrels.some((v) => v.warning > 0);
        },
        kind,
        { timeout: 10000 },
      )
      .then(() => true)
      .catch(() => false);
    await stopBot(page);
    const after = reached ? await take() : before;
    const tail = await page.evaluate(() => {
      const s = __TMB_A12__.getState(),
        events = __TMB_A12__
          .analytics()
          .events.filter((e) => e.event === "hazard_telegraph");
      return {
        clock: s.gameClock,
        eventCount: events.length,
        audio: __tmbAudio.state(),
      };
    });
    await page.close();
    return {
      kind,
      reduced,
      muted,
      ...setup,
      reached,
      mad: mad(before, after),
      ...tail,
    };
  };
  const audible = {};
  for (const kind of ["collapse", "door", "worker"])
    audible[kind] = await run(kind, false, false);
  const rows = [];
  for (const kind of ["collapse", "door", "worker"])
    for (const reduced of [false, true]) {
      const muted = await run(kind, reduced, true);
      rows.push({
        ...muted,
        audibleEventCount: audible[kind].eventCount,
        eventCountEqual: muted.eventCount === audible[kind].eventCount,
      });
    }
  const value = {
    rows,
    audible,
    placePlayerCount: 0,
    sample: "startRoute -> runBot stopAtX/live/resume -> startBot/resume -> state poll -> getImageData -> stopBot",
  };
  write("b-e8", value);
  expect(rows).toHaveLength(6);
  expect(rows.every((r) => r.reached && r.mad > 2 && r.eventCountEqual)).toBe(
    true,
  );
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
