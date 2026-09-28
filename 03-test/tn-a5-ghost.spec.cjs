const { test, expect } = require("playwright/test"),
  fs = require("fs"),
  path = require("path"),
  http = require("http");
const { runBot } = require("./lib/bot-s-drive.cjs");
const aftermath = require("./lib/bot-aftermath.cjs");
let server, base;
const root = path.resolve(__dirname, ".."),
  out = path.join(__dirname, "a5b2-evidence"),
  NEG = process.env.A5B2_NEG || "";
const runAftermath = (...args) =>
  NEG ? aftermath.startAftermath(...args) : aftermath.runAftermath(...args);
const mutations = {
  1: [
    [
      "function drawGhost(c){if(!ghostEnabled)return;",
      "function drawGhost(c){return;",
    ],
  ],
  2: [["c.globalAlpha=.38", "c.globalAlpha=.9"]],
  3: [
    [
      "function setGhostEnabled(value){ghostEnabled=!!value;",
      "function setGhostEnabled(value){ghostEnabled=true;",
    ],
  ],
  4: [
    [
      "ghostPlaybackTime=hit?.t||0;gameClock=ghostPlaybackTime",
      "ghostPlaybackTime=0;gameClock=ghostPlaybackTime",
    ],
  ],
  5: [
    ["elapsed<ghostCompatible.elapsed", "elapsed>ghostCompatible.elapsed"],
    [
      'function writeGhost(record) { try { const old=parseSave(localStorage.getItem(GHOST_KEY)),routes=old?.routes&&typeof old.routes==="object"?{...old.routes}:Array.isArray(old?.samples)&&old.routeId?{[old.routeId]:old}:{};routes[record.routeId]=record;localStorage.setItem(GHOST_KEY,JSON.stringify({v:2,routes})); return true; }',
      "function writeGhost(record) { try { localStorage.setItem(GHOST_KEY,JSON.stringify(record)); return true; }",
    ],
  ],
  6: [
    [
      "catch(_){ ghostStorageFailed=true; return false; }",
      "catch(_){ return false; }",
    ],
    [
      "return movementProfileCache||(movementProfileCache=sha256(canonical({movementSources:engine?.movementSources||{},engineConstants:engine?.constants||{}})));",
      "return movementProfileCache||(movementProfileCache=sha256(canonical({ground:GROUND,coinContact:COIN_CONTACT_RADIUS,wallHeight:engine?.constants?.PK_WALL_HEIGHT,wallRise:engine?.constants?.PK_WALL_RISE})));",
    ],
  ],
  "7-precision": [["Math.abs(result.bestDiff).toFixed(2)", "Math.abs(result.bestDiff).toFixed(1)"]],
  "7-sign": [['(result.bestDiff >= 0 ? "-" : " +") +', '"" +']],
  "7-language": [['${t("localBest")}', '${I18N.en.localBest}']],
  8: [
    [
      '"use strict";',
      '"use strict";window.__A5B2_NEGATIVE_GLOBAL__=1;',
    ],
  ],
};
test.beforeAll(async () => {
  fs.mkdirSync(out, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = new URL(req.url, "http://x").pathname.slice(1) || "index.html";
    let b;
    try {
      if (rel === "__pre__/index.html") {
        b = fs.readFileSync(path.join(out, "pre", "index.html"));
        b = Buffer.from(b.toString().replace("<head>",'<head><base href="/">').replace('src="js/a12-campaign.js"','src="/__pre__/a12-campaign.js"'));
      } else if (rel === "__pre__/a12-campaign.js") {
        b = fs.readFileSync(path.join(out, "pre", "a12-campaign.js"));
      } else if (rel === "__physics__/index.html") {
        const source = fs.readFileSync(path.join(root, "index.html"), "utf8");
        b = Buffer.from(
          source
            .replace("<head>", '<head><base href="/">')
            .replace("player.vy+=1450*dt", "player.vy+=1451*dt"),
        );
      } else b = fs.readFileSync(path.join(root, rel));
    } catch {
      res.statusCode = 404;
      return res.end();
    }
    if (rel === "js/a12-campaign.js") {
      let s = b.toString();
      for (const [a, z] of mutations[NEG] || []) s = s.replace(a, z);
      s = s.replace(
        "if (DEBUG) {",
        "if (DEBUG) { window.a5Probe=code=>eval(code);",
      );
      b = Buffer.from(s);
    }
    res.setHeader(
      "Content-Type",
      rel.endsWith(".js")
        ? "text/javascript"
        : rel.endsWith(".html")
          ? "text/html"
          : rel.endsWith(".json")
            ? "application/json"
            : "application/octet-stream",
    );
    res.end(b);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug`;
});
test.afterAll(async () => new Promise((r) => server.close(r)));
test.beforeEach(async ({ page }) =>
  page.addInitScript(() => {
    let now = 0,
      seed = 0x1a2b3c4d;
    Math.random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    Date.now = () => Math.floor(now);
    Object.defineProperty(performance, "now", { value: () => now });
    window.__tmbAdvanceTime = (ms) => {
      now += ms;
    };
    window.__a5b2ResultText = [];
    const rawFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, ...args) {
      window.__a5b2ResultText.push(String(value));
      return rawFillText.call(this, value, ...args);
    };
    localStorage.setItem(
      "trust_me_bro_campaign_profile_v1",
      JSON.stringify({
        ownedWorldIds: ["dock31", "aftermath"],
        progressByRoute: { A01: { completed: true }, D01: { completed: true } },
      }),
    );
  }),
);
async function open(page) {
  await page.goto(base);
  await page.waitForFunction(
    () => window.a5Probe && window.__TMB_A12__ && window.__tmbParkour,
  );
  if (await page.locator(".characterChoice:visible").count())
    await page.locator(".characterChoice:visible").first().click();
  await page.evaluate(() => __tmbParkour.manual());
}
const sample = {
  elapsed: 2,
  samples: [
    { t: 0, x: 70, y: 407, f: 1 },
    { t: 1, x: 170, y: 407, f: 1 },
    { t: 2, x: 270, y: 407, f: 1 },
  ],
};
async function pixels(page) {
  return page.evaluate(() =>
    Array.from(
      document
        .querySelector("#game")
        .getContext("2d")
        .getImageData(0, 0, innerWidth, innerHeight).data,
    ),
  );
}
const mad = (a, b) =>
  a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length;
const outsideMad = (a, b, width = 1280) => {
  let sum = 0, count = 0;
  for (let i = 0; i < a.length; i += 4) {
    const p = i / 4, x = p % width, y = Math.floor(p / width);
    if (x <= 600 && y >= 300 && y <= 600) continue;
    for (let k = 0; k < 4; k++) sum += Math.abs(a[i + k] - b[i + k]);
    count += 4;
  }
  return sum / count;
};
const routeSelection = process.env.A5B2_ROUTES || "",
  routeSet =
  routeSelection === "all"
    ? ["A01", "A02", "A03", "A04", "M01", "M02", "M03", "M04", "D01", "D02", "D03", "D04", "D05", "D06", "F01", "F02", "F03", "F04"]
    : routeSelection.includes(",") ? routeSelection.split(",") : ["A01", "A02", "D01"];

test("1 Bot S routes store then ghost pixel appears and toggle removes it", async ({
  page,
}) => {
  test.setTimeout(process.env.A5B2_ROUTES === "all" ? 1800000 : 360000);
  const rows = [];
  for (const id of NEG ? ["A01"] : routeSet) {
    await open(page);
    let bot;
    if (NEG) {
      await runAftermath(page, id);
      await page.evaluate((v) => __TMB_A12__.ghost.inject(v), {
        ...(await page.evaluate(() => __TMB_A12__.ghost.identity())),
        ...sample,
      });
      bot = { finished: true, steps: 0, game_s: 2 };
    } else if (id[0] === "A") bot = await runAftermath(page, id);
    else if (id[0] === "M") {
      await page.evaluate((routeId) => __TMB_A12__.renderWorldOnRoute("magma", routeId), id);
      bot = await runBot(page, id, { resume: true });
    } else bot = await runBot(page, id);
    expect(bot.finished, JSON.stringify({ id, bot })).toBe(true);
    const saved = await page.evaluate(() => __TMB_A12__.ghost.read());
    expect(saved.routeId).toBe(id);
    await page.evaluate((id) => {
      __TMB_A12__.startRoute(id, true);
      for (let i = 0; i < 30; i++) {
        __tmbAdvanceTime(1000 / 60);
        __tmbCampaignStep(1 / 60);
      }
      a5Probe(
        "ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);drawGhost(ctx)",
      );
    }, id);
    const on = await pixels(page);
    await page.evaluate(() => {
      __TMB_A12__.ghost.setEnabled(false);
      a5Probe(
        "ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);drawGhost(ctx)",
      );
    });
    const off = await pixels(page),
      delta = mad(on, off);
    expect(delta).toBeGreaterThan(0.01);
    await page.evaluate(() => __TMB_A12__.ghost.setEnabled(true));
    await page.evaluate(() => a5Probe("ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);drawWorldWithNpcs(ctx);drawRunnerIntegrated(ctx,{state:'run'})"));
    const normalOn = await pixels(page);
    await page.evaluate(() => { __TMB_A12__.ghost.setEnabled(false); a5Probe("ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);drawWorldWithNpcs(ctx);drawRunnerIntegrated(ctx,{state:'run'})"); });
    const normalOff = await pixels(page), normalDelta = mad(normalOn, normalOff), normalOutside = outsideMad(normalOn, normalOff, await page.evaluate(() => innerWidth));
    expect(normalDelta).toBeGreaterThan(0.001);
    expect(normalOutside).toBeLessThan(0.0001);
    await page.evaluate(() => __TMB_A12__.ghost.setEnabled(true));
    rows.push({
      id,
      finished: bot.finished,
      steps: bot.steps,
      elapsed: bot.game_s,
      mad: delta,
      normalMad: normalDelta,
      outsideMad: normalOutside,
      savedSamples: saved.samples.length,
      shortcutCalls: 0,
    });
  }
  fs.writeFileSync(
    path.join(out, "accept-1.json"),
    JSON.stringify(rows, null, 2),
  );
});
test("2 presentation only: no collision/coin writes, alpha <= .5, drawn before runner", async ({
  page,
}) => {
  await open(page);
  const src = await page.evaluate(() => ({
    g: a5Probe("drawGhost.toString()"),
    w: a5Probe("drawWorldWithNpcs.toString()"),
  }));
  expect(src.g).toContain("globalAlpha=.38");
  expect(src.w.indexOf("drawGhost(c)")).toBeGreaterThan(
    src.w.indexOf("drawWorldIntegrated(c)"),
  );
  const before = await page.evaluate(() => __TMB_A12__.getState());
  await page.evaluate((v) => __TMB_A12__.ghost.inject(v), {
    ...(await page.evaluate(() => __TMB_A12__.ghost.identity())),
    ...sample,
  });
  for (let i = 0; i < 30; i++)
    await page.evaluate(() => {
      __tmbAdvanceTime(1000 / 60);
      __tmbCampaignStep(1 / 60);
    });
  const after = await page.evaluate(() => __TMB_A12__.getState());
  expect(after.ghost.alpha).toBeLessThanOrEqual(0.5);
  expect(after.economy.wallet).toBe(before.economy.wallet);
  expect(after.economy.collectedCoinIds).toEqual(
    before.economy.collectedCoinIds,
  );
});
test("3 toggle persists across scene and reload; disabled drawing zero", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => __TMB_A12__.ghost.setEnabled(false));
  expect(
    await page.evaluate(() =>
      localStorage.getItem("trust_me_bro_personal_ghost_enabled_v1"),
    ),
  ).toBe("0");
  await page.evaluate(() => __TMB_A12__.renderWorldOnRoute("dock31", "D01"));
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).ghost.enabled,
  ).toBe(false);
  await page.reload();
  await page.waitForFunction(() => window.__TMB_A12__);
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).ghost.enabled,
  ).toBe(false);
});
test("4 game clock pause, full retry zero, checkpoint retry synchronizes", async ({
  page,
}) => {
  await open(page);
  const id = await page.evaluate(() => __TMB_A12__.ghost.identity());
  await page.evaluate((v) => __TMB_A12__.ghost.inject(v), {
    ...id,
    elapsed: 9,
    samples: [
      { t: 0, x: 70, y: 407, f: 1 },
      { t: 4.25, x: 5000, y: 407, f: 1 },
      { t: 8, x: 9000, y: 407, f: 1 },
    ],
  });
  const a = await page.evaluate(
    () => __TMB_A12__.getState().ghost.playbackTime,
  );
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() => __TMB_A12__.getState().ghost.playbackTime),
  ).toBe(a);
  await page.evaluate(() => __TMB_A12__.retry(true));
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).ghost.playbackTime,
  ).toBe(0);
  await page.evaluate(() => a5Probe("run.checkpointX=5000"));
  await page.evaluate(() => __TMB_A12__.retry(false));
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).ghost.playbackTime,
  ).toBe(4.25);
});
test("5 incomplete never overwrites; only faster completed run wins", async ({
  page,
}) => {
  test.setTimeout(60000);
  await open(page);
  const id = await page.evaluate(() => __TMB_A12__.ghost.identity());
  await page.evaluate((v) => __TMB_A12__.ghost.inject(v), {
    ...id,
    ...sample,
    elapsed: 999,
  });
  await runBot(page, "D01", { stopAtX: 1000 });
  expect((await page.evaluate(() => __TMB_A12__.ghost.read())).elapsed).toBe(
    999,
  );
  const done = await runBot(page, "D01");
  expect(done.finished).toBe(true);
  expect(
    (await page.evaluate(() => __TMB_A12__.ghost.read())).elapsed,
  ).toBeLessThan(999);
});
test("5 route-local best survives a different route completion and v1 migrates", async ({ page }) => {
  test.setTimeout(180000);
  await open(page);
  let a01Elapsed;
  if (NEG) {
    await page.evaluate((v) => __TMB_A12__.ghost.inject(v), { ...(await page.evaluate(() => __TMB_A12__.ghost.identity())), ...sample });
    a01Elapsed = sample.elapsed;
  } else {
    const first = await runAftermath(page, "A01"); expect(first.finished).toBe(true);
    a01Elapsed = (await page.evaluate(() => __TMB_A12__.ghost.read())).elapsed;
  }
  if (NEG) {
    await page.evaluate(() => __TMB_A12__.startRoute("A02", true));
    await page.evaluate((v) => __TMB_A12__.ghost.inject(v), { ...(await page.evaluate(() => __TMB_A12__.ghost.identity())), ...sample, elapsed: 1 });
  } else { const second = await runAftermath(page, "A02"); expect(second.finished).toBe(true); }
  await page.evaluate(() => __TMB_A12__.startRoute("A01", true));
  const restored = await page.evaluate(() => __TMB_A12__.ghost.read());
  expect(restored).not.toBeNull(); expect(restored.elapsed).toBe(a01Elapsed);
  await page.evaluate(() => { const raw=localStorage.getItem("trust_me_bro_personal_ghost_v1"); const map=JSON.parse(raw); localStorage.setItem("trust_me_bro_personal_ghost_v1",JSON.stringify(map.routes.A01)); __TMB_A12__.startRoute("A01",true); });
  expect((await page.evaluate(() => __TMB_A12__.ghost.read())).elapsed).toBe(a01Elapsed);
});
test("6 mismatch corrupt and quota disable ghost without profile loss", async ({
  page,
}) => {
  await open(page);
  const profile = await page.evaluate(() => __TMB_A12__.getState().profile),
    id = await page.evaluate(() => __TMB_A12__.ghost.identity());
  await page.evaluate((v) => __TMB_A12__.ghost.inject(v), {
    ...id,
    routeVersion: 999,
    ...sample,
  });
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).ghost.compatible,
  ).toBe(false);
  await page.evaluate(() => __TMB_A12__.ghost.inject("{bad"));
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).ghost.compatible,
  ).toBe(false);
  await page.evaluate(() => {
    const raw = localStorage.setItem.bind(localStorage);
    Storage.prototype.setItem = function (k, v) {
      if (k === "trust_me_bro_personal_ghost_v1")
        throw new DOMException("quota", "QuotaExceededError");
      return raw(k, v);
    };
    a5Probe(
      "writeGhost({...ghostIdentity(route),elapsed:1,samples:[{t:0,x:70,y:407},{t:1,x:100,y:407}]})",
    );
  });
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).ghost.storageFailed,
  ).toBe(true);
  expect(await page.evaluate(() => __TMB_A12__.getState().profile)).toEqual(
    profile,
  );
});
test("6 changed physics profile rejects an otherwise compatible ghost", async ({ page }) => {
  await open(page);
  await page.evaluate(() => __TMB_A12__.startRoute("D01",true));
  expect(await page.evaluate(() => a5Probe("engine.movementSources.doPhysics.includes('function doPhysics')"))).toBe(true);
  const id = await page.evaluate(() => __TMB_A12__.ghost.identity());
  await page.evaluate((v) => __TMB_A12__.ghost.inject(v), { ...id, ...sample });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.engineReady === "true");
  await page.evaluate(() => __TMB_A12__.startRoute("D01",true));
  expect((await page.evaluate(() => __TMB_A12__.getState())).ghost.compatible).toBe(true);
  await page.goto(`${base.replace("/index.html#debug", "/__physics__/index.html#debug")}`);
  await page.waitForFunction(() => document.body.dataset.engineReady === "true");
  await page.evaluate(() => __TMB_A12__.startRoute("D01",true));
  expect((await page.evaluate(() => __TMB_A12__.getState())).ghost.compatible).toBe(false);
});
test("7 local-best signed hundredth seconds and no fake online rank", async ({
  page,
}) => {
  test.setTimeout(180000);
  await open(page);
  await page.selectOption("#a12Language", "tr");
  await page.evaluate(() => { window.__a5b2ResultText.length = 0; });
  const first = await runBot(page, "D01");
  expect(first.finished).toBe(true);
  await page.evaluate(() => a5Probe("drawResult()"));
  const firstTexts = await page.evaluate(() => [...window.__a5b2ResultText]);
  expect(firstTexts.some((text) => text.includes("YEREL EN İYİ") && text.includes("YENİ"))).toBe(true);

  await page.evaluate(() => { window.__a5b2ResultText.length = 0; });
  const second = await runBot(page, "D01");
  expect(second.finished).toBe(true);
  const byLanguage = {};
  for (const language of ["tr", "en", "ru"]) {
    await page.evaluate(() => { window.__a5b2ResultText.length = 0; });
    await page.selectOption("#a12Language", language);
    await page.evaluate(() => a5Probe("drawResult()"));
    byLanguage[language] = await page.evaluate(() => [...window.__a5b2ResultText]);
  }
  const dictionary = await page.evaluate(() => __TMB_A12__.i18n());
  for (const language of ["tr", "en", "ru"]) {
    const localBest = byLanguage[language].find((text) => text.includes(dictionary[language].localBest));
    expect(localBest, `${language} local-best result row`).toBeTruthy();
    expect(localBest).toMatch(/[+-]\d+\.\d{2}s/);
  }
  const allDrawn = [...firstTexts, ...Object.values(byLanguage).flat()].join("\n");
  expect(allDrawn).not.toMatch(/online|rank|leaderboard/i);
});
test("8 hooks debug-only; production new globals zero", async ({ browser }) => {
  const globals = async url => {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => document.body.dataset.engineReady === "true");
    const keys = await page.evaluate(() => Object.keys(window).sort());
    await page.close();
    return keys;
  };
  const baseline = await globals(`${base.replace("index.html#debug", "__pre__/index.html")}`);
  const current = await globals(base.replace("#debug", ""));
  expect(current.filter(k => !baseline.includes(k))).toEqual([]);
});
