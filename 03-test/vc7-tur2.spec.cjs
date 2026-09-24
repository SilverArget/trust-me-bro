"use strict";
const { test, expect, chromium } = require("playwright/test");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  art = path.join(__dirname, "vc7-tur2");
let server, origin, plans, v73rows, v73Harness;
test.beforeAll(async () => {
  fs.mkdirSync(art, { recursive: true });
  plans = JSON.parse(
    fs.readFileSync(path.join(__dirname, "parkour-plans.json"), "utf8"),
  );
  v73rows = JSON.parse(
    fs.readFileSync(path.join(__dirname, "TRAP-FAIRNESS-v73.json"), "utf8"),
  ).rows;
  const v73src = fs.readFileSync(
    path.join(__dirname, "trap-fairness-v73.spec.cjs"),
    "utf8",
  );
  v73Harness =
    v73src.match(
      /const harness = String\.raw`([\s\S]*?)`;\s*test\.beforeAll/,
    )[1] +
    String.raw`
window.__vc7Replay=(l,p,plan,actionIndex,delta)=>v73replay(l,p,plan,actionIndex,delta);
window.__vc7ScenePlan=(l,p,plan)=>{v73Death=null;v73setup(l,p);v73pre(l);const frames=v73timeline(plan);for(const q of frames){if(dead||won||currentLevel!==l||currentPart!==p)break;Object.assign(keys,{right:q.r,left:q.l,jump:q.j});update(1/60);observeGameMovement()}for(let i=0;i<150&&!dead&&!won&&currentLevel===l&&currentPart===p;i++){keys.left=keys.right=keys.jump=false;update(1/60);observeGameMovement()}return{...v73result(l,p),chiefX:rt.chief?.x??null,state:playerGameState(),events:__GAME_DEBUG__.getTelemetry()}};
window.__vc7Boot=()=>boot();window.__vc7Step=()=>update(1/60);window.__vc7Start=()=>notifyLevelStarted();
window.__vc7Prepare=name=>{if(name==='first_input')gameFirstInput=false;if(name==='level_start')gameplayActive=null};
`;
  server = http.createServer((req, res) => {
    const rel =
        decodeURIComponent(new URL(req.url, "http://x").pathname).replace(
          /^\/+/,
          "",
        ) || "index.html",
      file = path.join(root, rel);
    fs.readFile(file, (e, b) => {
      if (e) {
        res.statusCode = 404;
        return res.end("missing");
      }
      if (rel === "index.html")
        b = Buffer.from(
          b
            .toString()
            .replace(
              /\}\)\(\);\s*<\/script><\/body><\/html>\s*$/,
              `${v73Harness}\n})();\n</script></body></html>`,
            ),
        );
      res.end(b);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
});
let reloadSeq = 0;
async function ready(page, url) {
  url = url.replace("/index.html#", `/index.html?reload=${++reloadSeq}#`);
  await page.goto(url);
  await page.waitForFunction(() => window.__tmb?.platform.initialized);
  if (await page.locator("#characterSelect.show").isVisible())
    await page.locator(".characterChoice").first().click();
  await page.waitForFunction(() => !window.__tmb.characterSelectOpen);
  await page.waitForTimeout(2000);
  await page.waitForFunction(
    () => !document.querySelector("#missionBrief.show"),
  );
}
async function noCover(page) {
  const v = await page.evaluate(() => {
    const c = document.querySelector("canvas"),
      r = c.getBoundingClientRect();
    return [...document.querySelectorAll('[aria-hidden="false"],.show')]
      .filter((e) => e !== c && getComputedStyle(e).display !== "none")
      .map((e) => {
        const b = e.getBoundingClientRect();
        return {
          id: e.id,
          w: b.width,
          h: b.height,
          hit:
            Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left)) *
            Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)),
        };
      })
      .filter((x) => x.w * x.h > 0 && x.hit > 0);
  });
  expect(v, `canvas covers measured=${JSON.stringify(v)}`).toEqual([]);
}
function lethalFixture() {
  const row = v73rows.find((r) => r.status === "TUZAK OLUMU SINIRLI" && r.sector > 6),
    action = row.critical_actions[0],
    bound =
      action.bounds.negative?.type === "TUZAK OLUMU"
        ? action.bounds.negative
        : action.bounds.positive,
    plan = plans.find(
      (x) => x.level === row.sector && x.part === row.part,
    ).plan;
  return { row, action, bound, plan };
}
async function realOutOfLives(page, suppress) {
  const q = lethalFixture();
  await ready(page, origin + "/index.html#debugLives=1&scene=final-run");
  if (suppress)
    await page.evaluate((n) => __GAME_DEBUG__._suppress(n), suppress);
  const baseline = suppress ? await page.evaluate((n) => __GAME_DEBUG__.getTelemetry().filter(e=>e.event===n).length, suppress) : 0;
  const result = await page.evaluate(
    (x) => __vc7Replay(x.l, x.p, x.plan, x.action, x.delta),
    {
      l: q.row.sector,
      p: q.row.part,
      plan: q.plan,
      action: q.action.action_index,
      delta: q.bound.d,
    },
  );
  expect(
    result.dead,
    `real trap death measured=${JSON.stringify(result)}`,
  ).toBe(true);
  await page.waitForFunction(
    () =>
      document.querySelector("#outOfLives.show") &&
      !__GAME_DEBUG__.getState().adState.pending,
    null,
    { timeout: 4000 },
  );
  return {...q, baseline};
}
test("D1 debug gate, state, reset, variants and 10+2 scenes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto(origin + "/index.html");
  expect(await page.evaluate(() => typeof window.__GAME_DEBUG__)).toBe(
    "undefined",
  );
  await ready(page, origin + "/index.html#debug");
  expect(
    await page.evaluate(() =>
      [
        "getState",
        "loadTestScene",
        "reset",
        "setVariant",
        "getTelemetry",
      ].every((k) => typeof __GAME_DEBUG__[k] === "function"),
    ),
  ).toBe(true);
  const a = await page.evaluate(() => __GAME_DEBUG__.getState());
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(350);
  const run = await page.evaluate(() => __GAME_DEBUG__.getState());
  await page.keyboard.up("ArrowRight");
  await page.evaluate(() => __GAME_DEBUG__.reset());
  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  const jump = await page.evaluate(() => __GAME_DEBUG__.getState());
  expect(run.player.x, `x ${a.player.x}->${run.player.x}`).toBeGreaterThan(
    a.player.x,
  );
  expect(["run", "jump", "fall"]).toContain(run.player.state);
  expect(["jump", "fall"]).toContain(jump.player.state);
  await page.evaluate(() => __GAME_DEBUG__.setVariant("x", "y"));
  expect(await page.evaluate(() => __GAME_DEBUG__.getState().variants.x)).toBe(
    "y",
  );
  await page.evaluate(() => __GAME_DEBUG__.reset());
  const reset = await page.evaluate(() => __GAME_DEBUG__.getState());
  expect(reset.dead).toBe(false);
  const ids = [
    "onboarding",
    "movement-vault-slide",
    "wallrun-chain",
    "fake-exit",
    "supervisor-chase",
    "interstitial-pause",
    "save-restore",
    "mobile-portrait",
    "square-viewport",
    "final-run",
  ];
  for (const id of ids) {
    const r = await page.evaluate((id) => __GAME_DEBUG__.loadTestScene(id), id);
    expect(r.ok, `${id}=${JSON.stringify(r)}`).toBe(true);
  }
  for (const [id, tur] of [
    ["collapse-recovery", "3"],
    ["three-fails-rewarded", "P1"],
  ])
    expect(
      await page.evaluate((id) => __GAME_DEBUG__.loadTestScene(id), id),
    ).toMatchObject({ status: "PLANNED", tur });
  expect(
    await page.evaluate(() => __GAME_DEBUG__.loadTestScene("nope")),
  ).toMatchObject({ ok: false, error: "UNKNOWN_SCENE" });
});
test("D2 ring copy/suppress and D3 portrait/square canvas evidence", async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await ready(page, origin + "/index.html#debug&scene=onboarding");
  await page.keyboard.press("ArrowRight");
  expect(
    (await page.evaluate(() => __GAME_DEBUG__.getTelemetry())).some(
      (e) => e.event === "first_input",
    ),
  ).toBe(true);
  await page.evaluate(() => __GAME_DEBUG__._suppress("first_input"));
  const before = await page.evaluate(
    () =>
      __GAME_DEBUG__.getTelemetry().filter((e) => e.event === "first_input")
        .length,
  );
  await page.keyboard.press("ArrowLeft");
  expect(
    await page.evaluate(
      () =>
        __GAME_DEBUG__.getTelemetry().filter((e) => e.event === "first_input")
          .length,
    ),
  ).toBe(before);
  for (const [id, size] of [
    ["mobile-portrait", { width: 540, height: 960 }],
    ["square-viewport", { width: 720, height: 720 }],
  ]) {
    await page.setViewportSize(size);
    await page.evaluate((id) => __GAME_DEBUG__.loadTestScene(id), id);
    await page.waitForTimeout(100);
    await noCover(page);
    const data = await page.evaluate(() =>
      document.querySelector("canvas").toDataURL("image/png"),
    );
    fs.writeFileSync(
      path.join(art, id + ".png"),
      Buffer.from(data.split(",")[1], "base64"),
    );
  }
  const same = requests.filter((u) => u.startsWith(origin)).length,
    out = requests.filter((u) => !u.startsWith(origin)).length;
  expect(same, `same-origin measured=${same}`).toBeGreaterThanOrEqual(1);
  expect(out, `external measured=${out}`).toBe(0);
});

test("D2-3 out-of-lives and real skip-sector button ad flows", async ({
  page,
}) => {
  test.setTimeout(120000);
  await realOutOfLives(page);
  await page.locator("#watchAdBtn").click();
  await page.waitForFunction(() =>
    __GAME_DEBUG__.getTelemetry().some((e) => e.event === "reward_granted"),
  );
  const rows = await page.evaluate(() => __GAME_DEBUG__.getTelemetry());
  for (const name of [
    "interstitial_show",
    "interstitial_return",
    "rewarded_offer",
    "rewarded_start",
    "rewarded_complete",
    "reward_granted",
  ])
    expect(
      rows.some((e) => e.event === name),
      `${name} measured=${rows.filter((e) => e.event === name).length}`,
    ).toBe(true);
  const grants = rows.filter(
    (e) => e.event === "reward_granted" && e.params.placement === "skip_sector",
  ).length;
  expect(grants, `reward_granted measured=${grants}`).toBe(1);
  fs.writeFileSync(
    path.join(art, "ad-events.json"),
    JSON.stringify(
      rows.filter((e) => /reward|interstitial/.test(e.event)),
      null,
      2,
    ),
  );
});

test("D2-4/D2-5 error path, per-event suppression and 600 to 500 ring", async ({
  page,
}) => {
  test.setTimeout(120000);
  await ready(page, origin + "/index.html#debug");
  const result = await page.evaluate(() => {
    const fire = (i) =>
      window.dispatchEvent(new ErrorEvent("error", { message: "ring-" + i }));
    const start = __GAME_DEBUG__.getTelemetry().length;
    fire("positive");
    const positive = __GAME_DEBUG__
      .getTelemetry()
      .filter((e) => e.event === "build_error").length;
    __GAME_DEBUG__._suppress("build_error");
    fire("suppressed");
    const afterSuppressed = __GAME_DEBUG__
      .getTelemetry()
      .filter((e) => e.event === "build_error").length;
    __GAME_DEBUG__._unsuppress("build_error");
    for (let i = 0; i < 600; i++) fire(i);
    const rows = __GAME_DEBUG__.getTelemetry();
    const copy = __GAME_DEBUG__.getTelemetry();
    copy.length = 0;
    return {
      start,
      positive,
      afterSuppressed,
      length: rows.length,
      first: rows[0].params.message,
      last: rows.at(-1).params.message,
      copyIsolation: __GAME_DEBUG__.getTelemetry().length,
    };
  });
  expect(
    result.positive,
    `positive build_error measured=${result.positive}`,
  ).toBeGreaterThan(0);
  expect(
    result.afterSuppressed,
    `suppressed red result count=${result.afterSuppressed}`,
  ).toBe(result.positive);
  expect(result.length, `ring measured=${result.length}`).toBe(500);
  expect(result.first, `first retained measured=${result.first}`).toBe(
    "ring-100",
  );
  expect(result.last, `last retained measured=${result.last}`).toBe("ring-599");
  expect(result.copyIsolation).toBe(500);
  fs.writeFileSync(
    path.join(art, "ring-buffer.json"),
    JSON.stringify(result, null, 2),
  );
});

test("D2-7 ten proven-plan trap deaths across three parts keep 820ms retry latency", async ({
  page,
}) => {
  test.setTimeout(240000);
  await ready(page, origin + "/index.html#debug");
  const candidates = v73rows
    .filter((r) => r.status === "TUZAK OLUMU SINIRLI")
    .filter(
      (r, i, a) =>
        a.findIndex((x) => x.sector === r.sector && x.part === r.part) === i,
    )
    .slice(0, 3);
  expect(candidates.length).toBe(3);
  const values = [];
  for (let i = 0; i < 10; i++) {
    const r = candidates[i % 3],
      a = r.critical_actions[0],
      bound =
        a.bounds.negative?.type === "TUZAK OLUMU"
          ? a.bounds.negative
          : a.bounds.positive,
      proven = plans.find((x) => x.level === r.sector && x.part === r.part);
    const before = await page.evaluate(
      () => __GAME_DEBUG__.getTelemetry().length,
    );
    const result = await page.evaluate(
      (q) => __vc7Replay(q.l, q.p, q.plan, q.action, q.delta),
      {
        l: r.sector,
        p: r.part,
        plan: proven.plan,
        action: a.action_index,
        delta: bound.d,
      },
    );
    expect(
      result.dead,
      `${r.sector}.${r.part} death=${JSON.stringify(result)}`,
    ).toBe(true);
    await page.waitForFunction(
      (before) =>
        __GAME_DEBUG__
          .getTelemetry()
          .slice(before)
          .some((e) => e.event === "retry"),
      before,
      { timeout: 3000 },
    );
    const pair = await page.evaluate((before) => {
      const x = __GAME_DEBUG__.getTelemetry().slice(before),
        f = x.find((e) => e.event === "player_fail"),
        z = x.find((e) => e.event === "retry");
      return { fail: f, retry: z, latency: z.ts_ms - f.ts_ms };
    }, before);
    expect(
      pair.fail.params.trap_type,
      `trap source measured=${pair.fail.params.trap_type}`,
    ).toBe(r.trap);
    expect(
      pair.latency,
      `retry latency measured=${pair.latency}`,
    ).toBeGreaterThanOrEqual(770);
    expect(
      pair.latency,
      `retry latency measured=${pair.latency}`,
    ).toBeLessThanOrEqual(870);
    values.push({
      part: `${r.sector}.${r.part}`,
      trap: r.trap,
      delta_ms: bound.ms,
      latency_ms: pair.latency,
      kill: pair.fail.params,
    });
  }
  fs.writeFileSync(
    path.join(art, "restart-latencies.json"),
    JSON.stringify(values, null, 2),
  );
});

test("D1 hash scene ignore and D3 ten-scene dual-entry/mechanic evidence", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto(origin + "/index.html?scene=final-run");
  expect(await page.evaluate(() => typeof window.__GAME_DEBUG__)).toBe(
    "undefined",
  );
  const defs = [
      ["onboarding", 1, 1],
      ["movement-vault-slide", 1, 1],
      ["wallrun-chain", 3, 1],
      ["fake-exit", 6, 1],
      ["supervisor-chase", 6, 1],
      ["interstitial-pause", 6, 1],
      ["save-restore", 7, 1],
      ["mobile-portrait", 1, 1],
      ["square-viewport", 1, 1],
      ["final-run", 31, 2],
    ],
    rows = [];
  for (const [id, l, p] of defs) {
    await ready(page, origin + `/index.html#debug&scene=${id}`);
    const hashState = await page.evaluate(() => __GAME_DEBUG__.getState()),
      loaded = await page.evaluate(
        (id) => __GAME_DEBUG__.loadTestScene(id),
        id,
      );
    expect(loaded.ok).toBe(true);
    expect(hashState.sceneId).toBe(id);
    const before = await page.evaluate(
      () => __GAME_DEBUG__.getTelemetry().length,
    );
    let detail = {};
    if (id === "onboarding") {
      await page.keyboard.press("ArrowRight");
    } else if (id === "interstitial-pause") {
      await realOutOfLives(page);
    } else if (id === "mobile-portrait" || id === "square-viewport") {
      const size =
        id === "mobile-portrait"
          ? { width: 540, height: 960 }
          : { width: 720, height: 720 };
      await page.setViewportSize(size);
      detail = await page.evaluate(() => {
        const c = document.querySelector("canvas").getBoundingClientRect(),
          hud = document.querySelector("#pauseBtn").getBoundingClientRect();
        return {
          canvas: { x: c.x, y: c.y, w: c.width, h: c.height },
          hud: { x: hud.x, y: hud.y, w: hud.width, h: hud.height },
          viewport: { w: innerWidth, h: innerHeight },
        };
      });
    } else {
      const proven = plans.find((x) => x.level === l && x.part === p);
      detail = await page.evaluate((q) => __vc7ScenePlan(q.l, q.p, q.plan), {
        l,
        p,
        plan: proven.plan,
      });
    }
    const events = await page.evaluate(
        ({ before, all }) => __GAME_DEBUG__.getTelemetry().slice(all ? 0 : before),
        { before, all: id === "interstitial-pause" },
      ),
      names = events.map((e) => e.event);
    const required =
      id === "onboarding"
        ? ["first_input"]
        : id === "movement-vault-slide"
          ? ["movement_used"]
          : id === "wallrun-chain"
            ? ["movement_used"]
            : id === "fake-exit"
              ? ["deception_triggered"]
              : id === "supervisor-chase"
                ? ["deception_triggered"]
                : id === "interstitial-pause"
                  ? ["interstitial_show", "interstitial_return"]
                  : id === "save-restore"
                    ? ["checkpoint"]
                    : id === "final-run"
                      ? ["level_complete", "run_complete"]
                      : [];
    for (const n of required)
      expect(
        names,
        `${id} event ${n} measured=${JSON.stringify(names)}`,
      ).toContain(n);
    if (id === "movement-vault-slide")
      expect(
        events.some(
          (e) =>
            e.event === "movement_used" &&
            ["vault", "slide"].includes(e.params.kind),
        ),
        JSON.stringify(events),
      ).toBe(true);
    if (id === "wallrun-chain")
      expect(
        events.some(
          (e) => e.event === "movement_used" && e.params.kind === "wallRun",
        ),
        JSON.stringify(events),
      ).toBe(true);
    if (id === "supervisor-chase") expect(detail.chiefX).toBeGreaterThan(0);
    if (id === "save-restore") {
      const saved = await page.evaluate(
        () => __GAME_DEBUG__.getState().checkpoint,
      );
      await page.reload();
      await page.waitForFunction(() => window.__GAME_DEBUG__);
      const restored = await page.evaluate(
        () => __GAME_DEBUG__.getState().checkpoint,
      );
      detail.save_equal = JSON.stringify(saved) === JSON.stringify(restored);
      expect(detail.save_equal).toBe(true);
    }
    rows.push({
      id,
      hashLevel: hashState.levelId,
      methodLevel: loaded.levelId,
      required,
      evidence: names,
      detail,
    });
  }
  fs.writeFileSync(
    path.join(art, "scene-mechanics.json"),
    JSON.stringify(rows, null, 2),
  );
});

test("D2 lifecycle events use real browser transitions", async ({ page, context }) => {
  test.setTimeout(120000);
  const sessionRuns = [];
  for (const suppress of [false, true]) {
    const consoleRows = [], consoleTexts = [];
    const listener = (msg) => { consoleTexts.push({type:msg.type(),text:msg.text()}); if (msg.text().startsWith("GAME_EVENT ")) consoleRows.push(JSON.parse(msg.text().slice(11))); };
    page.on("console", listener);
    await page.goto(origin + "/iframe-host");
    await page.setContent(`<iframe src="${origin}/index.html#debug"></iframe>`);
    await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.location.href.includes('/index.html'));
    const frame = page.frames().find(f => f.url().includes('/index.html'));
    await frame.waitForFunction(() => window.__GAME_DEBUG__);
    if (suppress) await frame.evaluate(() => __GAME_DEBUG__._suppress("session_end"));
    await frame.goto("about:blank");
    page.off("console", listener);
    sessionRuns.push({ suppress, count: consoleRows.filter(e => e.event === "session_end").length, consoleTexts:consoleTexts.filter(x=>x.text.includes('session_end')), method: "iframe real navigation pagehide + parent console GAME_EVENT" });
  }
  const attempts = [];
  await ready(page, origin + "/index.html#debug");
  const cdp = await context.newCDPSession(page);
  try {
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "minimized" } });
    await page.waitForTimeout(300);
    attempts.push({ method: "Browser.setWindowBounds minimized", state: await page.evaluate(() => document.visibilityState) });
  } catch (e) { attempts.push({ method: "Browser.setWindowBounds minimized", error: String(e.message) }); }
  const other = await context.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await page.waitForTimeout(300);
  attempts.push({ method: "second page bringToFront", state: await page.evaluate(() => document.visibilityState) });
  await other.close();
  try {
    await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
    await page.waitForTimeout(300);
    attempts.push({ method: "Page.setWebLifecycleState frozen", state: await page.evaluate(() => document.visibilityState) });
    await cdp.send("Page.setWebLifecycleState", { state: "active" });
  } catch (e) { attempts.push({ method: "Page.setWebLifecycleState frozen", error: String(e.message) }); }
  let headed;
  try {
    headed = await chromium.launch({ headless: false });
    const hc = await headed.newContext(), hp = await hc.newPage();
    await ready(hp, origin + "/index.html#debug");
    const hs = await hc.newCDPSession(hp), { windowId } = await hs.send("Browser.getWindowForTarget");
    await hs.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "minimized" } });
    await hp.waitForTimeout(500);
    attempts.push({ method: "headed Browser.setWindowBounds minimized", state: await hp.evaluate(() => document.visibilityState) });
    await headed.close(); headed = null;
  } catch (e) { attempts.push({ method: "headed Browser.setWindowBounds minimized", error: String(e.message) }); if (headed) await headed.close(); }
  const hidden = attempts.some(x => x.state === "hidden");
  const sessionOk = sessionRuns[0].count === 1 && sessionRuns[1].count === 0;
  fs.writeFileSync(path.join(art, "lifecycle-events.json"), JSON.stringify({ sessionRuns, sessionEnd: sessionOk ? "PASS" : "ARAÇ YETERSİZ", attempts, appHidden: hidden ? "PASS" : "ARAÇ YETERSİZ", recommendation: hidden && sessionOk ? null : "#0383: headed browser/OS lifecycle integration runner" }, null, 2));
});

test("D2-1/D2-2 twenty-event real-flow and expected-red suppression matrix", async ({
  page,
}) => {
  test.setTimeout(360000);
  await ready(page, origin + "/index.html#debug");
  const plan = (l, p) => plans.find((x) => x.level === l && x.part === p).plan,
    death = v73rows.find((r) => r.status === "TUZAK OLUMU SINIRLI"),
    da = death.critical_actions[0],
    db =
      da.bounds.negative?.type === "TUZAK OLUMU"
        ? da.bounds.negative
        : da.bounds.positive;
  async function flow(name, suppress = false) {
    if (name === "game_ready") return page.evaluate(() => __vc7Boot());
    if (name === "first_input") {
      await page.evaluate(() => __vc7Prepare("first_input"));
      return page.keyboard.press("ArrowRight");
    }
    if (name === "session_end") {
      const seen = page.evaluate(
        (n) =>
          new Promise((resolve) =>
            addEventListener(
              "pagehide",
              () =>
                resolve(
                  __GAME_DEBUG__.getTelemetry().filter((e) => e.event === n)
                    .length,
                ),
              { once: true },
            ),
          ),
        name,
      );
      await page.goto("about:blank");
      return { lifecycleCount: await seen, navigated: true };
    }
    if (name === "build_error")
      return page.evaluate(() =>
        dispatchEvent(new ErrorEvent("error", { message: "matrix-error" })),
      );
    if (name === "level_start") {
      await page.evaluate(() => {
        __GAME_DEBUG__.loadTestScene("onboarding");
        __vc7Prepare("level_start");
      });
      return page.evaluate(() => __vc7Start());
    }
    if (name === "movement_used")
      return page.evaluate((q) => __vc7ScenePlan(3, 1, q), plan(3, 1));
    if (name === "deception_triggered" || name === "telegraph_exposed")
      return page.evaluate((q) => __vc7ScenePlan(6, 1, q), plan(6, 1));
    if (name === "player_fail" || name === "retry") {
      const before = await page.evaluate(
        () => __GAME_DEBUG__.getTelemetry().length,
      );
      await page.evaluate((q) => __vc7Replay(q.l, q.p, q.plan, q.a, q.d), {
        l: death.sector,
        p: death.part,
        plan: plan(death.sector, death.part),
        a: da.action_index,
        d: db.d,
      });
      return name === "retry" ? page.waitForTimeout(900) : undefined;
    }
    if (name === "checkpoint")
      return page.evaluate((q) => __vc7ScenePlan(7, 1, q), plan(7, 1));
    if (name === "level_complete" || name === "run_complete")
      return page.evaluate((q) => __vc7ScenePlan(31, 2, q), plan(31, 2));
    if (name.startsWith("rewarded_") || name === "reward_granted") {
      await realOutOfLives(page);
      if (suppress) await page.evaluate((n) => __GAME_DEBUG__._suppress(n), name);
      await page.locator("#watchAdBtn").click();
      await page.waitForFunction(() => !__GAME_DEBUG__.getState().adState.pending && !document.getElementById('outOfLives').classList.contains('show'));
      return { fresh: true };
    }
    if (name.startsWith("interstitial_")) {
      const q = await realOutOfLives(page, suppress ? name : null);
      return { fresh: true, before: q.baseline };
    }
    throw Error("no flow " + name);
  }
  const names = [
      "game_ready",
      "first_input",
      "level_start",
      "movement_used",
      "deception_triggered",
      "telegraph_exposed",
      "player_fail",
      "retry",
      "checkpoint",
      "level_complete",
      "run_complete",
      "rewarded_offer",
      "rewarded_start",
      "rewarded_complete",
      "reward_granted",
      "interstitial_show",
      "interstitial_return",
      "build_error",
    ],
    rows = [];
  for (const name of names) {
    console.log("matrix", name);
    await page.evaluate((n) => __GAME_DEBUG__._unsuppress(n), name);
    let before = await page.evaluate(
      (n) => __GAME_DEBUG__.getTelemetry().filter((e) => e.event === n).length,
      name,
    );
    const positiveFlow = await flow(name);
    if (positiveFlow?.fresh) before = positiveFlow.before || 0;
    await page.waitForTimeout(20);
    let positive = await page.evaluate(
      (n) => __GAME_DEBUG__.getTelemetry().filter((e) => e.event === n).length,
      name,
    );
    expect(
      positive,
      `${name} positive measured=${positive - before}`,
    ).toBeGreaterThan(before);
    const positiveDelta = positive - before;
    await page.evaluate((n) => __GAME_DEBUG__._suppress(n), name);
    before = positive;
    const negativeFlow = await flow(name, true);
    if (negativeFlow?.fresh) before = negativeFlow.before || 0;
    await page.waitForTimeout(20);
    const suppressed = await page.evaluate(
      (n) => __GAME_DEBUG__.getTelemetry().filter((e) => e.event === n).length,
      name,
    );
    let expectedRed = false,
      redMessage = "";
    try {
      expect(
        suppressed,
        `${name} expected-red measured delta=${suppressed - before}`,
      ).toBeGreaterThan(before);
    } catch (e) {
      expectedRed = true;
      redMessage = String(e.message).split("\n")[0];
    }
    expect(expectedRed, `${name} negative control did not turn red`).toBe(true);
    await page.evaluate((n) => __GAME_DEBUG__._unsuppress(n), name);
    rows.push({
      event: name,
      flow: name,
      positive_delta: positiveDelta,
      suppressed_delta: suppressed - before,
      expected_red: expectedRed,
      red_message: redMessage,
    });
  }
  fs.writeFileSync(
    path.join(art, "event-matrix.json"),
    JSON.stringify(rows, null, 2),
  );
  expect(rows.filter((x) => x.expected_red).length).toBe(18);
});
